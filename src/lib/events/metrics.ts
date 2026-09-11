/**
 * The metric registry (audit ch.8 "Metric catalogue"): every metric Keja AI
 * reports has an owner, a formula, a grain, its source events, exclusions,
 * a privacy class and known limitations. Dashboard SQL must never be the
 * only definition of a business metric — this registry is the source of
 * truth, and `computeMetrics()` computes the locally-computable subset
 * from the governed event log so the definitions stay executable.
 */

export interface MetricDefinition {
  name: string;
  /** The product/operational question it answers. */
  question: string;
  formula: string;
  grain: 'session' | 'event' | 'day' | 'listing';
  sources: string[];
  exclusions: string;
  privacyClass: 'public' | 'pseudonymous' | 'confidential';
  limitations: string;
  /** `computable` = derivable today from the local event log. */
  status: 'computable' | 'awaiting-server-events';
  owner: 'product' | 'operations' | 'trust';
}

export const METRIC_REGISTRY: readonly MetricDefinition[] = [
  {
    name: 'search_success_rate',
    question: 'Do users find listings that match their intent?',
    formula: 'count(search.performed.v1 where results > 0) / count(search.performed.v1)',
    grain: 'session',
    sources: ['search.performed.v1'],
    exclusions: 'queries whose redacted form is empty',
    privacyClass: 'pseudonymous',
    limitations: 'result count ≠ relevance; verify against save/view rates',
    status: 'computable',
    owner: 'product',
  },
  {
    name: 'listing_engagement_rate',
    question: 'Do searches lead to listing interaction?',
    formula: 'count(listing.viewed.v1) / count(search.performed.v1)',
    grain: 'session',
    sources: ['search.performed.v1', 'listing.viewed.v1'],
    exclusions: 'views from deep links without a preceding search',
    privacyClass: 'pseudonymous',
    limitations: 'attribution window is the session only',
    status: 'computable',
    owner: 'product',
  },
  {
    name: 'evidence_review_rate',
    question: 'Do users verify before engaging (the trust differentiator)?',
    formula: 'count(listing.evidence_reviewed.v1) / count(listing.viewed.v1)',
    grain: 'event',
    sources: ['listing.viewed.v1', 'listing.evidence_reviewed.v1'],
    exclusions: 'none',
    privacyClass: 'pseudonymous',
    limitations: 'panel expansion is a proxy for reading the evidence',
    status: 'computable',
    owner: 'trust',
  },
  {
    name: 'ai_grounded_answer_rate',
    question: 'How often does the assistant answer with citations vs abstain?',
    formula: 'count(ai.answer.generated.v1 where outcome=answered and citations>0) / count(ai.answer.generated.v1)',
    grain: 'event',
    sources: ['ai.answer.generated.v1'],
    exclusions: 'escalations are counted in ai_escalation_rate instead',
    privacyClass: 'pseudonymous',
    limitations: 'citation presence ≠ citation quality; see golden-set evals',
    status: 'computable',
    owner: 'product',
  },
  {
    name: 'ai_escalation_rate',
    question: 'How often is the assistant escalated by policy?',
    formula: 'count(ai.answer.escalated.v1) / (count(ai.answer.generated.v1) + count(ai.answer.escalated.v1))',
    grain: 'event',
    sources: ['ai.answer.generated.v1', 'ai.answer.escalated.v1'],
    exclusions: 'none — escalation is the designed behaviour for regulated asks',
    privacyClass: 'pseudonymous',
    limitations: 'high rate may mean over-conservative policy, not safety',
    status: 'computable',
    owner: 'trust',
  },
  {
    name: 'human_handoff_rate',
    question: 'After AI contact, how often do users need a human?',
    formula: 'count(support.human_requested.v1) / count(ai.answer.generated.v1)',
    grain: 'session',
    sources: ['ai.answer.generated.v1', 'support.human_requested.v1'],
    exclusions: 'handoffs from listing pages without AI contact',
    privacyClass: 'pseudonymous',
    limitations: 'sessions, not users — no cross-session identity',
    status: 'computable',
    owner: 'operations',
  },
  {
    name: 'listing_issue_rate',
    question: 'How often do users report listing problems?',
    formula: 'count(listing.issue_reported.v1) / count(listing.viewed.v1)',
    grain: 'listing',
    sources: ['listing.viewed.v1', 'listing.issue_reported.v1'],
    exclusions: 'none',
    privacyClass: 'pseudonymous',
    limitations: 'self-selected reporters; not a fraud measure alone',
    status: 'computable',
    owner: 'trust',
  },
  {
    name: 'time_to_first_contact',
    question: 'How long between first listing view and first viewing request?',
    formula: 'median(session first listing.viewed.v1 → first listing.viewing_requested.v1)',
    grain: 'session',
    sources: ['listing.viewed.v1', 'listing.viewing_requested.v1'],
    exclusions: 'sessions without either event',
    privacyClass: 'pseudonymous',
    limitations: 'client clocks; WhatsApp channel loses the submit event',
    status: 'computable',
    owner: 'operations',
  },
  {
    name: 'verification_completion',
    question: 'How many started verifications complete?',
    formula: 'verification.completed / verification.started',
    grain: 'listing',
    sources: ['verification.started.v1', 'verification.completed.v1'],
    exclusions: 'bot-authored listings (verified by pipeline)',
    privacyClass: 'confidential',
    limitations: 'server events — activates with the API service',
    status: 'awaiting-server-events',
    owner: 'trust',
  },
  {
    name: 'moderation_turnaround',
    question: 'How fast do operator reviews close?',
    formula: 'median(moderation.reviewed.v1 ts − listing.submitted ts)',
    grain: 'listing',
    sources: ['moderation.reviewed.v1'],
    exclusions: 'auto-approved listings',
    privacyClass: 'confidential',
    limitations: 'requires server-side submission timestamps',
    status: 'awaiting-server-events',
    owner: 'operations',
  },
];

export interface ComputedMetric {
  name: string;
  value: number | null;
  /** true when the denominator is zero — reported, never defaulted. */
  insufficientData: boolean;
  sampleSize: number;
}

interface LogLike {
  event: string;
  ts: string;
  sid: string;
  props: Record<string, unknown>;
}

/**
 * Compute the locally-computable metrics from the governed event log.
 * Pure: takes the log as data, so tests and the admin console share one
 * implementation.
 */
export function computeMetrics(log: readonly LogLike[]): ComputedMetric[] {
  const count = (name: string, pred?: (e: LogLike) => boolean) =>
    log.filter((e) => e.event === name && (!pred || pred(e))).length;

  const ratio = (num: number, den: number): ComputedMetric['value'] | null =>
    den === 0 ? null : num / den;

  const firstTsPerSession = (name: string): Map<string, number> => {
    const m = new Map<string, number>();
    for (const e of log) {
      if (e.event !== name) continue;
      const t = Date.parse(e.ts);
      const prev = m.get(e.sid);
      if (prev === undefined || t < prev) m.set(e.sid, t);
    }
    return m;
  };

  const out: ComputedMetric[] = [];
  const searches = count('search.performed.v1');
  out.push({
    name: 'search_success_rate',
    value: ratio(count('search.performed.v1', (e) => (e.props.results as number) > 0), searches),
    insufficientData: searches === 0,
    sampleSize: searches,
  });
  const views = count('listing.viewed.v1');
  out.push({
    name: 'listing_engagement_rate',
    value: ratio(views, searches),
    insufficientData: searches === 0,
    sampleSize: searches,
  });
  out.push({
    name: 'evidence_review_rate',
    value: ratio(count('listing.evidence_reviewed.v1'), views),
    insufficientData: views === 0,
    sampleSize: views,
  });
  const aiAnswers = count('ai.answer.generated.v1');
  const aiEscalations = count('ai.answer.escalated.v1');
  out.push({
    name: 'ai_grounded_answer_rate',
    value: ratio(
      count('ai.answer.generated.v1', (e) => e.props.outcome === 'answered' && (e.props.citations as number) > 0),
      aiAnswers,
    ),
    insufficientData: aiAnswers === 0,
    sampleSize: aiAnswers,
  });
  out.push({
    name: 'ai_escalation_rate',
    value: ratio(aiEscalations, aiAnswers + aiEscalations),
    insufficientData: aiAnswers + aiEscalations === 0,
    sampleSize: aiAnswers + aiEscalations,
  });
  out.push({
    name: 'human_handoff_rate',
    value: ratio(count('support.human_requested.v1'), aiAnswers),
    insufficientData: aiAnswers === 0,
    sampleSize: aiAnswers,
  });
  out.push({
    name: 'listing_issue_rate',
    value: ratio(count('listing.issue_reported.v1'), views),
    insufficientData: views === 0,
    sampleSize: views,
  });
  {
    const firstView = firstTsPerSession('listing.viewed.v1');
    const firstRequest = firstTsPerSession('listing.viewing_requested.v1');
    const deltas: number[] = [];
    for (const [sid, t0] of firstView) {
      const t1 = firstRequest.get(sid);
      if (t1 !== undefined && t1 >= t0) deltas.push(t1 - t0);
    }
    deltas.sort((a, b) => a - b);
    const median = deltas.length
      ? deltas[Math.floor((deltas.length - 1) / 2)] / 60_000
      : null;
    out.push({
      name: 'time_to_first_contact',
      value: median,
      insufficientData: deltas.length === 0,
      sampleSize: deltas.length,
    });
  }
  return out;
}
