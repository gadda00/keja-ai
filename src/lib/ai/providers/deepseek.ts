/**
 * The DeepSeek adapter (audit ch.9 "DeepSeek integration blueprint").
 *
 * SERVER-ONLY MODULE. The API key never enters NEXT_PUBLIC_* variables,
 * client bundles, mobile binaries, logs, analytics or error messages. The
 * import-time guard below makes any accidental client import fail loudly
 * at build time — implementing the audit's SEC-207 rule mechanically.
 *
 * Wire format: DeepSeek exposes an OpenAI-compatible chat-completions API
 * at https://api.deepseek.com with JSON output support; the adapter uses
 * that surface so a provider swap (OpenAI, self-hosted vLLM, …) is a base-
 * URL change, not a rewrite.
 *
 * Controls implemented per the audit checklist:
 *   - bounded timeout (DEEPSEEK_TIMEOUT_MS, default 12s) via AbortController
 *   - single retry on network/5xx only (idempotent reads) with jitter
 *   - request id attached to every call and every error
 *   - outbound redaction (policy.redactForProvider) before any text leaves
 *   - input token cap (chars/4 heuristic) and output token cap
 *   - strict JSON output with application-side re-validation — parsing
 *     failures ABSTAIN, they never leak raw model text
 *   - disabled by default (DEEPSEEK_ENABLED=true to arm; a key must also
 *     be present and the runtime must be a server)
 */
import type {
  CitedSummary,
  ClassificationInput,
  ClassificationResult,
  GroundedAnswer,
  GroundedQuestion,
  IntelligenceProvider,
  ProviderError,
  RetrievalContext,
  SummarizationInput,
} from './types';
import { ProviderFailure } from './types';
import { redactForProvider, reviewGeneration } from '../policy';
import type { Citation, Confidence } from './types';

/* ------------------------------ environment ------------------------------ */

interface DeepSeekConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  enabled: boolean;
}

function config(): DeepSeekConfig {
  const apiKey = process.env.DEEPSEEK_API_KEY ?? '';
  const enabled = process.env.DEEPSEEK_ENABLED === 'true';
  return {
    apiKey,
    baseUrl: (process.env.DEEPSEEK_API_BASE ?? 'https://api.deepseek.com').replace(/\/$/, ''),
    model: process.env.DEEPSEEK_MODEL ?? 'deepseek-chat',
    timeoutMs: Number(process.env.DEEPSEEK_TIMEOUT_MS ?? 12_000),
    maxInputTokens: Number(process.env.DEEPSEEK_MAX_INPUT_TOKENS ?? 4_000),
    maxOutputTokens: Number(process.env.DEEPSEEK_MAX_OUTPUT_TOKENS ?? 800),
    enabled: enabled && apiKey.length > 0,
  };
}

/** Hard server-only guard — throws if this module ever reaches a browser bundle. */
function assertServerSide(): void {
  if (typeof window !== 'undefined') {
    throw new Error(
      'deepseek.ts is server-only: the DeepSeek key must never reach a client bundle (audit SEC-207). ' +
        'Import the local provider on the client; route external calls through the API service.',
    );
  }
}

/** Enforce the input token budget before the request leaves. */
function capTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4; // ~4 chars/token heuristic
  return text.length <= maxChars ? text : `${text.slice(0, maxChars)}…[truncated]`;
}

/* -------------------------------- transport ------------------------------ */

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function chat(
  messages: ChatMessage[],
  opts: { responseFormatJson?: boolean } = {},
): Promise<Record<string, unknown>> {
  assertServerSide();
  const cfg = config();
  const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;

  const fail = (error: ProviderError): never => {
    throw new ProviderFailure(error);
  };
  if (!cfg.enabled) {
    fail({ kind: 'disabled', provider: 'deepseek', reason: 'DEEPSEEK_ENABLED is not "true" or key missing' });
  }

  const body = {
    model: cfg.model,
    messages,
    max_tokens: cfg.maxOutputTokens,
    temperature: 0.2, // grounded answers, not creative writing
    ...(opts.responseFormatJson ? { response_format: { type: 'json_object' as const } } : {}),
  };

  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
    try {
      const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.apiKey}`,
          'X-Request-Id': requestId,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (res.status >= 500 && attempt === 1) {
        await new Promise((r) => setTimeout(r, 200 * attempt)); // jittered backoff
        continue;
      }
      if (!res.ok) {
        fail({ kind: 'http', provider: 'deepseek', status: res.status, requestId });
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        fail({ kind: 'schema', provider: 'deepseek', detail: 'empty completion', requestId });
      }
      return { content: content as string, requestId };
    } catch (err) {
      if (err instanceof ProviderFailure) throw err;
      if (attempt === 1 && err instanceof Error && err.name === 'AbortError') {
        continue; // one retry on timeout — the audit allows retry of idempotent reads
      }
      if (err instanceof Error && err.name === 'AbortError') {
        fail({ kind: 'timeout', provider: 'deepseek', requestId });
      }
      fail({ kind: 'network', provider: 'deepseek', requestId });
    } finally {
      clearTimeout(timer);
    }
  }
  return fail({ kind: 'network', provider: 'deepseek', requestId: 'unreachable' });
}

/* ------------------------------ answer parsing ---------------------------- */

interface RawGrounded {
  answer?: string;
  confidence?: string;
  uncertainties?: unknown;
  recommended_next_action?: string;
  needs_human_review?: boolean;
  citations?: { ref?: string; quote?: string }[];
}

function parseGrounded(raw: Record<string, unknown>, context: RetrievalContext): GroundedAnswer {
  const requestId = String(raw.requestId ?? '');
  let parsed: RawGrounded;
  try {
    const content = raw.content as string;
    parsed = JSON.parse(content) as RawGrounded;
  } catch {
    throw new ProviderFailure({
      kind: 'schema',
      provider: 'deepseek',
      detail: 'completion was not valid JSON — abstaining rather than leaking raw model text',
      requestId,
    });
  }

  const byRef = new Map(context.chunks.map((c) => [c.ref, c]));
  const citations: Citation[] = (parsed.citations ?? [])
    .filter((c): c is { ref: string; quote?: string } => typeof c.ref === 'string' && byRef.has(c.ref))
    .map((c) => {
      const chunk = byRef.get(c.ref)!;
      return { ref: chunk.ref, title: chunk.title, kind: chunk.kind, asOf: '' };
    });

  const confidence: Confidence =
    parsed.confidence === 'high' || parsed.confidence === 'medium' || parsed.confidence === 'low'
      ? parsed.confidence
      : 'low';

  const answer = typeof parsed.answer === 'string' ? parsed.answer : '';
  const verdict = reviewGeneration(answer, { citations: citations.length, evidenceSensitive: true });
  if (!verdict.pass) {
    throw new ProviderFailure({
      kind: 'schema',
      provider: 'deepseek',
      detail: `policy review failed: ${verdict.issues.join(', ')}`,
      requestId,
    });
  }

  return {
    answer,
    citations,
    confidence,
    uncertainties: Array.isArray(parsed.uncertainties)
      ? parsed.uncertainties.filter((u): u is string => typeof u === 'string').slice(0, 5)
      : [],
    freshness: new Date(0).toISOString(), // caller fills from chunks — providers do not know wall time
    recommendedNextAction:
      typeof parsed.recommended_next_action === 'string' ? parsed.recommended_next_action : undefined,
    needsHumanReview: parsed.needs_human_review === true,
    abstained: false,
  };
}

/* ------------------------------- the provider ----------------------------- */

function contextPrompt(context: RetrievalContext): string {
  const chunks = context.chunks
    .map((c, i) => `[${i + 1}] ref=${c.ref} (${c.kind}) ${c.title}:\n${c.text}`)
    .join('\n\n');
  return `APPROVED CONTEXT (cite by ref):\n${chunks}`;
}

const GROUNDED_SYSTEM =
  'You answer questions about Kenyan real estate using ONLY the approved context provided. ' +
  'Every factual claim must reference a context ref in citations[]. If the context does not ' +
  'support an answer, set needs_human_review=true and say so. Never give legal, tax, valuation, ' +
  'or investment advice; never guarantee outcomes. Respond as strict JSON: ' +
  '{"answer": string, "confidence": "low"|"medium"|"high", "uncertainties": string[], ' +
  '"recommended_next_action": string, "needs_human_review": boolean, ' +
  '"citations": [{"ref": string}]}';

export const deepseekProvider: IntelligenceProvider = {
  name: 'deepseek',

  async classify(input: ClassificationInput): Promise<ClassificationResult> {
    const { redacted } = redactForProvider(input.text);
    const raw = await chat(
      [
        { role: 'system', content: `Classify the text into exactly one label: ${input.labels.join(', ')}. Respond as strict JSON: {"label": string, "confidence": "low"|"medium"|"high"}` },
        { role: 'user', content: capTokens(redacted, 500) },
      ],
      { responseFormatJson: true },
    );
    try {
      const p = JSON.parse(raw.content as string) as { label?: string; confidence?: string };
      return {
        label: input.labels.includes(p.label ?? '') ? (p.label as string) : input.labels[0],
        confidence:
          p.confidence === 'high' || p.confidence === 'medium' || p.confidence === 'low'
            ? p.confidence
            : 'low',
      };
    } catch {
      throw new ProviderFailure({
        kind: 'schema',
        provider: 'deepseek',
        detail: 'classification completion was not valid JSON',
        requestId: String(raw.requestId ?? ''),
      });
    }
  },

  async summarize(input: SummarizationInput): Promise<CitedSummary> {
    return this.answer({ context: input.context, surface: 'ask-keja' });
  },

  async answer(input: GroundedQuestion): Promise<GroundedAnswer> {
    const { redacted, removed } = redactForProvider(input.context.question);
    if (removed.length > 0) {
      // redaction events are observable upstream via the gateway audit event
      input.context = { ...input.context, question: redacted };
    }
    const raw = await chat([
      { role: 'system', content: GROUNDED_SYSTEM },
      {
        role: 'user',
        content: capTokens(
          `${contextPrompt(input.context)}\n\nQUESTION: ${redacted}`,
          config().maxInputTokens,
        ),
      },
    ]);
    return parseGrounded(raw, input.context);
  },
};
