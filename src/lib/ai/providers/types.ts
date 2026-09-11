/**
 * The provider-neutral intelligence interface (audit ch.9 "Provider-neutral
 * adapter").
 *
 * Keja AI talks to intelligence through this seam ONLY. Today it has two
 * implementations:
 *   - local.ts     — the deterministic engine, wrapped (default; offline-safe)
 *   - deepseek.ts  — the DeepSeek OpenAI-compatible adapter (server-side only)
 *
 * The contract for every provider:
 *   - inputs are already policy-checked and redacted (gateway's job)
 *   - outputs are schema-validated, typed and citation-carrying
 *   - errors are typed ProviderErrors, never raw fetch rejects
 *   - the provider never sees secrets, identity data or raw documents
 *     beyond the retrieval context it is handed
 */

export interface Citation {
  /** Stable reference into the approved corpus — `corpus:<entryId>`. */
  ref: string;
  title: string;
  kind: 'property' | 'area-insight' | 'policy' | 'calculation';
  /** Provenance label the UI must render next to the claim. */
  asOf: string;
}

export type Confidence = 'low' | 'medium' | 'high';

/** The retrieval context handed to a provider — never raw user history. */
export interface RetrievalContext {
  question: string;
  chunks: { ref: string; title: string; text: string; kind: Citation['kind'] }[];
}

export interface GroundedAnswer {
  answer: string;
  citations: Citation[];
  confidence: Confidence;
  uncertainties: string[];
  /** ISO date of the freshest source consulted. */
  freshness: string;
  recommendedNextAction?: string;
  needsHumanReview: boolean;
  abstained: boolean;
}

export interface ClassificationInput {
  /** Free text to bucket into a known intent label. */
  text: string;
  /** The allowed label set — the provider must answer within it. */
  labels: string[];
}

export interface ClassificationResult {
  label: string;
  confidence: Confidence;
}

export interface SummarizationInput {
  context: RetrievalContext;
  /** Short purpose line, kept in the audit record. */
  purpose: string;
}

export type CitedSummary = GroundedAnswer;

export interface GroundedQuestion {
  context: RetrievalContext;
  surface: 'ask-keja' | 'deal-analyst' | 'valuation';
}

export interface IntelligenceProvider {
  readonly name: 'local-deterministic' | 'deepseek';
  classify(input: ClassificationInput): Promise<ClassificationResult>;
  summarize(input: SummarizationInput): Promise<CitedSummary>;
  answer(input: GroundedQuestion): Promise<GroundedAnswer>;
}

/** Typed provider failure — callers decide to abstain/escalate, not throw. */
export type ProviderError =
  | { kind: 'timeout'; provider: string; requestId: string }
  | { kind: 'http'; provider: string; status: number; requestId: string }
  | { kind: 'network'; provider: string; requestId: string }
  | { kind: 'schema'; provider: string; detail: string; requestId: string }
  | { kind: 'disabled'; provider: string; reason: string };

export class ProviderFailure extends Error {
  constructor(public readonly error: ProviderError) {
    super(`[${error.kind}] ${error.provider}${'requestId' in error ? ` (${error.requestId})` : ''}`);
    this.name = 'ProviderFailure';
  }
}
