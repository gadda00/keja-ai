/**
 * The local deterministic provider (audit ch.9's "low-cost model" tier,
 * taken to its conclusion: zero-cost, zero-network, fully deterministic).
 *
 * This is Keja AI's default intelligence tier: the rule-based engine answers
 * from verified inventory data and finance math, and the gateway attaches
 * corpus citations + policy metadata around it. It runs offline inside the
 * PWA, never sees a key, and produces byte-identical output for identical
 * inputs — which is exactly what makes the golden evaluation set meaningful.
 *
 * The answer it returns for evidence-sensitive questions is assembled from
 * the retrieval context only: if the context cannot support the question,
 * it abstains (the audit's "state when the corpus does not support an
 * answer").
 */
import type {
  CitedSummary,
  Citation,
  ClassificationInput,
  ClassificationResult,
  Confidence,
  GroundedAnswer,
  GroundedQuestion,
  IntelligenceProvider,
  RetrievalContext,
  SummarizationInput,
} from './types';

function citationsFrom(context: RetrievalContext): Citation[] {
  return context.chunks.map((c) => ({
    ref: c.ref,
    title: c.title,
    kind: c.kind,
    asOf: '',
  }));
}

function coverageToConfidence(context: RetrievalContext): Confidence {
  if (context.chunks.length >= 3) return 'high';
  if (context.chunks.length === 2) return 'medium';
  return 'low';
}

/** Deterministic grounded answer from retrieval context alone. */
function answerFromContext(question: GroundedQuestion): GroundedAnswer {
  const { context, surface } = question;
  const citations = citationsFrom(context);

  if (context.chunks.length === 0) {
    return {
      answer:
        "I don't have enough verified information in my approved sources to answer that yet. " +
        'I can show you comparable verified listings, or route you to a human who can help.',
      citations: [],
      confidence: 'low',
      uncertainties: ['no approved source matched the question'],
      freshness: new Date(0).toISOString(),
      recommendedNextAction: surface === 'valuation' ? 'Open the Valuation Desk for an indicative band' : 'Browse verified listings or ask a human',
      needsHumanReview: false,
      abstained: true,
    };
  }

  const lines = context.chunks.map((c) => {
    const labelled = c.kind === 'property' ? 'REPORTED LISTING DATA' : c.kind === 'area-insight' ? 'ESTIMATE (market comparables)' : 'KEJA POLICY';
    return `• ${c.title} — ${c.text.slice(0, 320)}${c.text.length > 320 ? '…' : ''} [${labelled}]`;
  });

  const kinds = new Set(context.chunks.map((c) => c.kind));
  const uncertainties: string[] = [];
  if (kinds.has('area-insight')) {
    uncertainties.push('area figures are ESTIMATES from comparables, not survey data');
  }
  if (context.chunks.every((c) => c.kind === 'property')) {
    uncertainties.push('listing facts are REPORTED by vendors and verified where labels say so');
  }

  return {
    answer:
      `Here is what my approved sources say${context.chunks.length > 1 ? '' : ' on that'}:\n\n${lines.join('\n')}\n\n` +
      'Labels: REPORTED = vendor-stated, verified where shown; ESTIMATE = computed from comparables.',
    citations,
    confidence: coverageToConfidence(context),
    uncertainties,
    freshness: '',
    recommendedNextAction: 'Open a listing to review its full evidence panel',
    needsHumanReview: false,
    abstained: false,
  };
}

/** Simple keyword classification — deterministic label bucketing. */
function classifyLocally(input: ClassificationInput): ClassificationResult {
  const t = input.text.toLowerCase();
  let best: { label: string; hits: number } = { label: input.labels[0], hits: 0 };
  for (const label of input.labels) {
    const hits = t.split(label.toLowerCase()).length - 1;
    if (hits > best.hits) best = { label, hits };
  }
  return {
    label: best.label,
    confidence: best.hits >= 2 ? 'high' : best.hits === 1 ? 'medium' : 'low',
  };
}

export const localProvider: IntelligenceProvider = {
  name: 'local-deterministic',

  async classify(input: ClassificationInput): Promise<ClassificationResult> {
    return classifyLocally(input);
  },

  async summarize(input: SummarizationInput): Promise<CitedSummary> {
    return answerFromContext({ context: input.context, surface: 'ask-keja' });
  },

  async answer(input: GroundedQuestion): Promise<GroundedAnswer> {
    return answerFromContext(input);
  },
};
