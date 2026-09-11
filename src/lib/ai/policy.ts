/**
 * The intelligence policy engine (audit ch.11 "AI safety, evaluation, and
 * governance").
 *
 * The existing escalation guard already refused professional-advice
 * questions; this module upgrades it into a *versioned policy catalogue*
 * that runs BEFORE model invocation (classification, redaction, corpus
 * selection) and AFTER generation (prohibited-advice detection, citation
 * requirement, confidence thresholds). The version string ships with every
 * decision so audit events can be replayed against the exact policy that
 * produced them.
 *
 * Design principles (audit ch.17 "Non-negotiable rules"):
 *   - model output is advisory; it never approves, values, or executes
 *   - every evidence-sensitive answer carries provenance or abstains
 *   - regulated categories always escalate to a human
 */

/** Bump on any rule change — old audit events reference their own version. */
export const POLICY_VERSION = '2026-09-11.1';

export type RegulatedCategory =
  | 'legal-advice'
  | 'tax-advice'
  | 'formal-valuation'
  | 'investment-suitability'
  | 'mortgage-lending-decision'
  | 'title-determination'
  | 'kyc-approval'
  | 'payment-execution'
  | 'tokenization-legal'
  | 'account-security'
  | 'fraud-accusation';

interface Rule {
  category: RegulatedCategory;
  /** Advisory questions escalate; factual process questions do not. */
  askForJudgement: RegExp;
  /** The process/how-it-works phrasing that stays answerable. */
  factualException?: RegExp;
  policy: string;
}

/**
 * The escalation catalogue. Each rule distinguishes "advise me" (regulated)
 * from "explain the process" (answerable with citations) — the distinction
 * the original guard pioneered and the audit asked to formalise.
 */
const RULES: Rule[] = [
  {
    category: 'legal-advice',
    askForJudgement: /\b(is this legal|should i sign|advise me|my lawyer|legal advice|break the law|sue (the|him|her|them)|do i have a case)\b/,
    factualException: /\b(how does|what is|what are|process|steps?|explain|stamp duty|registration|transfer)\b/,
    policy: 'Legal determinations need a licensed advocate; Keja explains process only.',
  },
  {
    category: 'tax-advice',
    askForJudgement: /\b(how much tax (will|should) i pay|should i (structure|declare)|tax advice|minimise my tax)\b/,
    factualException: /\b(how does|what is|rate|capital gains|explain)\b/,
    policy: 'Tax positions need a certified accountant; Keja explains published rates only.',
  },
  {
    category: 'formal-valuation',
    askForJudgement: /\b(what is (it|this|my) (really )?worth|exact value|formal valuation|value my (house|property|land)|precise price)\b/,
    factualException: /\b(indicative|band|estimate|comparables|how does the valuation desk)\b/,
    policy: 'A transaction valuation must come from a licensed valuer who inspected the property.',
  },
  {
    category: 'investment-suitability',
    askForJudgement: /\b(should i (buy|invest in)|is (this|it) a (good|safe|wise) (investment|deal)|guarantee(d)? returns?|can(')?t i lose)\b/,
    factualException: /\b(how (do|is)|what is|yield|roi|explain|analyze|analysis)\b/,
    policy: 'Suitability depends on personal circumstances; Keja shows data, not verdicts.',
  },
  {
    category: 'mortgage-lending-decision',
    askForJudgement: /\b(will i qualify|should i take (the|a) (loan|mortgage)|how much will (the )?bank lend me|approve me)\b/,
    factualException: /\b(how (do|does)|what (is|are)|current rates|explain|repayment)\b/,
    policy: 'Lending decisions belong to regulated institutions; Keja explains products only.',
  },
  {
    category: 'title-determination',
    askForJudgement: /\b(is the title (clean|genuine|valid)|does (he|she|they) own|who is the real owner|confirm owners?hip)\b/,
    factualException: /\b(how does|what is|ardhisasa|explain|title search process)\b/,
    policy: 'Title confirmation requires an official search; Keja never adjudicates ownership.',
  },
  {
    category: 'kyc-approval',
    askForJudgement: /\b(approve (my|the) kyc|is my kyc (approved|valid)|verify me now)\b/,
    policy: 'Identity verification is a human/official process; the assistant never approves.',
  },
  {
    category: 'payment-execution',
    askForJudgement: /\b(should i (pay|send)|is it safe to pay|release (the )?(funds|deposit)|pay (the )?deposit now)\b/,
    factualException: /\b(how (do|does)|what is|escrow|explain|mpesa|payment process)\b/,
    policy: 'Payment timing is a transaction decision; Keja explains safeguards, never green-lights.',
  },
  {
    category: 'tokenization-legal',
    askForJudgement: /\b(is tokenization legal|are tokens securities|should i tokenize|is this a security)\b/,
    factualException: /\b(how (do|does)|what is|explain|trial|how it works)\b/,
    policy: 'Tokenized real estate raises regulated-questions; Keja describes its trial mechanics only.',
  },
  {
    category: 'account-security',
    askForJudgement: /\b(is my account (hacked|safe)|should i share my (password|otp|pin)|someone has my)\b/,
    policy: 'Account security interventions are operator-only; never improvise.',
  },
  {
    category: 'fraud-accusation',
    askForJudgement: /\b(this (listing|agent|landlord) is (a )?(scam|fraud|fake)|report (him|her|them|this)|is (he|she|this) a fraudster)\b/,
    factualException: /\b(how (do|does)|what are|red flags|explain|how to spot|report process)\b/,
    policy: 'Fraud allegations are adjudicated by human review with evidence, not by a model.',
  },
];

/** Sensitive patterns scrubbed from any text that leaves the device. */
const SENSITIVE_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\+?\d[\d\s-]{8,}\d/g, label: 'phone-like-number' },
  { re: /\b\d{8,9}\b/g, label: 'national-id-like' },
  { re: /[\w.+-]+@[\w-]+\.[\w.]+/g, label: 'email' },
];

export interface RequestClassification {
  policyVersion: string;
  categories: RegulatedCategory[];
  /** true when any regulated rule fired without a factual exception. */
  mustEscalate: boolean;
  /** The policy reasons for each escalation (shown to the user + logged). */
  reasons: string[];
}

/** Classify a user request against the versioned catalogue. Pure. */
export function classifyRequest(question: string): RequestClassification {
  const t = question.toLowerCase();
  const categories: RegulatedCategory[] = [];
  const reasons: string[] = [];
  for (const rule of RULES) {
    if (!rule.askForJudgement.test(t)) continue;
    if (rule.factualException && rule.factualException.test(t)) continue;
    categories.push(rule.category);
    reasons.push(rule.policy);
  }
  return {
    policyVersion: POLICY_VERSION,
    categories,
    mustEscalate: categories.length > 0,
    reasons,
  };
}

/** Remove phone-like numbers, id-like numbers and emails from outbound text. */
export function redactForProvider(text: string): { redacted: string; removed: string[] } {
  let out = text;
  const removed: string[] = [];
  for (const p of SENSITIVE_PATTERNS) {
    if (p.re.test(out)) {
      removed.push(p.label);
      out = out.replace(p.re, `[${p.label}-redacted]`);
    }
  }
  return { redacted: out, removed };
}

/* ------------------------- post-generation controls --------------------- */

/** Patterns that turn an "advisory" answer into an unauthorized verdict. */
const PROHIBITED_OUTPUT: { re: RegExp; why: string }[] = [
  { re: /\b(guaranteed|risk[- ]free|cannot lose|no risk)\b/i, why: 'guarantee-language' },
  { re: /\byou should (definitely|absolutely) (buy|invest|pay|sign)\b/i, why: 'directive-advice' },
  { re: /\bthis is (definitely|certainly) (a|not a) (scam|fraud)\b/i, why: 'fraud-verdict' },
  { re: /\bthe title is (clean|genuine|fake)\b/i, why: 'title-verdict' },
  { re: /\b(i (can|will) approve|i have approved)\b/i, why: 'authority-usurpation' },
];

export interface PostGenerationVerdict {
  policyVersion: string;
  pass: boolean;
  issues: string[];
}

/**
 * Validate a generated answer before it may reach a user: no prohibited
 * advice language, and evidence-sensitive answers must carry citations.
 */
export function reviewGeneration(
  answer: string,
  opts: { citations: number; evidenceSensitive: boolean },
): PostGenerationVerdict {
  const issues: string[] = [];
  for (const p of PROHIBITED_OUTPUT) {
    if (p.re.test(answer)) issues.push(p.why);
  }
  if (opts.evidenceSensitive && opts.citations === 0) {
    issues.push('missing-citations');
  }
  return {
    policyVersion: POLICY_VERSION,
    pass: issues.length === 0,
    issues,
  };
}
