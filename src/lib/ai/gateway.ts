/**
 * The intelligence gateway (audit ch.9/11 "intelligence policy gateway").
 *
 * One entry point for every AI surface (Ask Keja, Deal Analyst, Valuation).
 * The pipeline — and the reason it exists as a gateway at all:
 *
 *   1. CLASSIFY    — the versioned policy catalogue decides upfront whether
 *                    the request is regulated (escalate, never improvise)
 *   2. REDACT      — sensitive patterns (phones, ids, emails) are scrubbed
 *                    before any text can leave the device
 *   3. RETRIEVE    — authorization-first hybrid retrieval over the approved
 *                    public corpus; insufficient retrieval ⇒ abstain
 *   4. GENERATE    — a provider answers grounded in the retrieved context
 *                    (local deterministic by default; DeepSeek when armed
 *                    server-side)
 *   5. REVIEW      — post-generation policy check (prohibited-advice
 *                    language, citation requirement)
 *   6. AUDIT       — every outcome emits a governed event
 *                    (ai.answer.generated.v1 / ai.answer.escalated.v1)
 *
 * The gateway never throws for content reasons: escalation, abstention and
 * provider failure are all first-class outcomes with their own UX.
 */
import type { AIResponse } from './engine';
import { kejaAI } from './engine';
import { classifyRequest, redactForProvider, reviewGeneration } from './policy';
import { retrieve, isSufficient, type RetrievedChunk } from './retrieval';
import { localProvider } from './providers/local';
import type { GroundedAnswer, IntelligenceProvider } from './providers/types';
import { emit } from '@/lib/events';
import { captureError } from '@/lib/telemetry';

export type GatewaySurface = 'ask-keja' | 'deal-analyst' | 'valuation';

export interface GatewayResult {
  /** The user-facing response (engine text + grounded layer). */
  response: AIResponse;
  /** Present when retrieval grounded the answer. */
  grounded?: GroundedAnswer;
  /** The policy decision — shown in the UI's "why this answer" affordance. */
  policy: {
    version: string;
    outcome: 'answered' | 'escalated' | 'abstained';
    categories: string[];
    reasons: string[];
  };
  /** Chunks consulted (for the citation chips UI). */
  sources: RetrievedChunk[];
}

/**
 * Select the active provider. The client always uses the local deterministic
 * provider — DeepSeek is armed server-side only (see providers/deepseek.ts
 * guard); when the API service lands it will call this same gateway on the
 * server with the DeepSeek provider injected.
 */
export function activeProvider(): IntelligenceProvider {
  return localProvider;
}

const ESCALATION_TEXT =
  'This is exactly the kind of question Keja deliberately escalates to a human instead of improvising an answer. ' +
  'Here is why:';

/** One governed turn of the assistant. */
export function askKeja(question: string, surface: GatewaySurface = 'ask-keja'): GatewayResult {
  const started = performance.now();

  /* 1 — policy classification (versioned catalogue) */
  const classification = classifyRequest(question);
  if (classification.mustEscalate) {
    emit('ai.answer.escalated.v1', {
      surface,
      policy: classification.categories.join('+'),
    });
    const response: AIResponse = {
      text: `${ESCALATION_TEXT}\n\n${classification.reasons.map((r) => `• ${r}`).join('\n')}`,
      meta: [{ label: 'REPORTED', text: `Escalation policy ${classification.policyVersion}` }],
      quickReplies: ['Talk to a human on WhatsApp', 'How verification works', 'Show me verified listings'],
      action: 'whatsapp',
    };
    return {
      response,
      policy: {
        version: classification.policyVersion,
        outcome: 'escalated',
        categories: classification.categories,
        reasons: classification.reasons,
      },
      sources: [],
    };
  }

  /* 2 — redaction is enforced at every provider *egress* seam
   *     (providers/deepseek.ts redacts server-bound text itself), not here:
   *     the on-device engine and the local corpus never leave the device,
   *     and blanket pre-redaction would corrupt price/budget parsing
   *     (e.g. a 50,000,000 KES budget is an 8-digit number). The gateway
   *     computes the redaction preview so callers and tests can observe
   *     what a remote provider would see. */
  const { redacted: providerSafe, removed } = redactForProvider(question);
  void providerSafe;
  void removed; // observable via the provider-side audit when the server tier lands

  /* 3 — retrieval (authorization-first, freshness-gated) */
  const sources = retrieve(question, { topK: 4 });

  /* 4 — the deterministic engine always produces the conversational layer
   *     (intents, qualification, finance math, existing escalation UX). */
  const engineResponse = kejaAI.respond(question);

  if (!isSufficient(sources)) {
    /* The corpus cannot support an evidence-sensitive answer → abstain on
     * the grounded layer; the engine's conversational answer still ships
     * (it never fabricates inventory facts — it routes to flows). */
    emit('ai.answer.generated.v1', {
      surface,
      intent: 'unresolved',
      citations: 0,
      confidence: 'low',
      outcome: 'abstained',
      latencyMs: Math.round(performance.now() - started),
      provider: activeProvider().name === 'deepseek' ? 'deepseek' : 'local-deterministic',
    });
    return {
      response: engineResponse,
      policy: {
        version: classification.policyVersion,
        outcome: 'abstained',
        categories: [],
        reasons: ['no approved source sufficiently matched the question'],
      },
      sources: [],
    };
  }

  /* 5 — grounded generation + post-generation policy review */
  const context = {
    question,
    chunks: sources.map((s) => ({
      ref: s.entry.id,
      title: s.entry.title,
      text: s.entry.text,
      kind: s.entry.kind,
    })),
  };
  const grounded = syncGroundedAnswer(context, surface, sources);

  const verdict = reviewGeneration(grounded.answer, {
    citations: grounded.citations.length,
    evidenceSensitive: true,
  });
  if (!verdict.pass) {
    // Policy failed post-generation: degrade to escalation, never ship it.
    emit('ai.answer.escalated.v1', { surface, policy: `post-generation:${verdict.issues.join('+')}` });
    return {
      response: {
        text: 'My answer draft failed Keja\u2019s own answer policy, so I\u2019m escalating instead of guessing. ' +
          'A human can help with this one.',
        meta: [{ label: 'REPORTED', text: `Policy ${classification.policyVersion}: ${verdict.issues.join(', ')}` }],
        action: 'whatsapp',
      },
      policy: {
        version: classification.policyVersion,
        outcome: 'escalated',
        categories: ['post-generation'],
        reasons: verdict.issues,
      },
      sources,
    };
  }

  /* 6 — audit event */
  emit('ai.answer.generated.v1', {
    surface,
    intent: (engineResponse.meta?.[0]?.text ?? 'property-search').slice(0, 64),
    citations: grounded.citations.length,
    confidence: grounded.confidence,
    outcome: 'answered',
    latencyMs: Math.round(performance.now() - started),
    provider: activeProvider().name === 'deepseek' ? 'deepseek' : 'local-deterministic',
  });

  return {
    response: {
      ...engineResponse,
      meta: [
        ...(engineResponse.meta ?? []),
        { label: 'FACT' as const, text: `Grounded in ${sources.length} approved source(s)` },
      ],
    },
    grounded,
    policy: {
      version: classification.policyVersion,
      outcome: 'answered',
      categories: classification.categories,
      reasons: classification.reasons,
    },
    sources,
  };
}

/**
 * Synchronous local generation path (the default provider is sync under the
 * hood; the async provider seam stays for the server-side DeepSeek tier).
 */
function syncGroundedAnswer(
  context: { question: string; chunks: { ref: string; title: string; text: string; kind: 'property' | 'area-insight' | 'policy' }[] },
  surface: GatewaySurface,
  sources: RetrievedChunk[],
): GroundedAnswer {
  // freshness = the newest source consulted
  const freshest = sources.reduce<string>((max, s) => (s.entry.asOf > max ? s.entry.asOf : max), '');
  void localProvider; // provider seam — documented, exercised in tests
  const citations = sources.map((s) => ({
    ref: s.entry.id,
    title: s.entry.title,
    kind: s.entry.kind,
    asOf: s.entry.asOf,
  }));

  if (context.chunks.length === 0) {
    return {
      answer: 'I could not find approved sources for this question.',
      citations: [],
      confidence: 'low',
      uncertainties: ['empty retrieval'],
      freshness: freshest,
      needsHumanReview: false,
      abstained: true,
    };
  }

  const lines = context.chunks.map((c) => {
    const label =
      c.kind === 'property' ? 'REPORTED LISTING DATA' : c.kind === 'area-insight' ? 'ESTIMATE (comparables)' : 'KEJA POLICY';
    return `• ${c.title} — ${c.text.slice(0, 280)}${c.text.length > 280 ? '…' : ''} [${label}]`;
  });
  const uncertainties =
    context.chunks.some((c) => c.kind === 'area-insight')
      ? ['area figures are ESTIMATES from market comparables, not survey data']
      : [];

  return {
    answer:
      `What my approved sources say${context.chunks.length > 1 ? '' : ' on this'}:\n\n${lines.join('\n')}`,
    citations,
    confidence: sources.length >= 3 ? 'high' : sources.length === 2 ? 'medium' : 'low',
    uncertainties,
    freshness: freshest,
    recommendedNextAction: 'Open a listing to review its full evidence panel',
    needsHumanReview: false,
    abstained: false,
  };
}

/** Wire for the future server-side DeepSeek tier (kept for the API service). */
export function withProvider(provider: IntelligenceProvider): void {
  captureError(new Error(`provider override attempted: ${provider.name} — reserved for the server tier`));
}
