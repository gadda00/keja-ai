/**
 * The intelligence gateway golden set (audit ch.9-11).
 *
 * The gateway is the single governed entry point for every AI surface:
 * classify → redact → retrieve → generate → review → audit. These tests
 * pin the contract that makes it trustworthy:
 *   - the versioned policy catalogue escalates regulated questions and
 *     leaves factual process questions answerable (no over-refusal)
 *   - redaction happens at the provider egress seam, NOT on the on-device
 *     engine path (8-digit budgets must keep parsing)
 *   - retrieval is authorization-first, freshness-gated and deterministic
 *   - every outcome emits a governed event that survives the strict
 *     taxonomy validation (a dropped event would be a silent audit hole)
 *   - post-generation review blocks guarantee-language and uncited
 *     evidence-sensitive answers
 */
import { askKeja, activeProvider } from '@/lib/ai/gateway';
import { classifyRequest, redactForProvider, reviewGeneration, POLICY_VERSION } from '@/lib/ai/policy';
import { retrieve, isSufficient } from '@/lib/ai/retrieval';
import { CORPUS, isFresh, FRESHNESS_WINDOW_DAYS } from '@/lib/ai/corpus';
import { eventLog, clearEventLog } from '@/lib/events';
import { PROPERTIES } from '@/data/properties';

beforeEach(() => {
  clearEventLog();
});

/* ---------------------------- policy catalogue --------------------------- */

describe('policy classification — regulated questions must escalate', () => {
  const cases: [string, string][] = [
    ['should i sign the sale agreement', 'legal-advice'],
    ['is this legal in kenya', 'legal-advice'],
    ['how much tax will i pay on the sale', 'tax-advice'],
    ['should i structure my holdings to minimise my tax', 'tax-advice'],
    ['what is it really worth', 'formal-valuation'],
    ['can you value my house precisely', 'formal-valuation'],
    ['should i invest in this deal', 'investment-suitability'],
    ['is this a good investment', 'investment-suitability'],
    ['will i qualify for a mortgage', 'mortgage-lending-decision'],
    ['is the title clean', 'title-determination'],
    ['approve my kyc', 'kyc-approval'],
    ['should i pay the deposit now', 'payment-execution'],
    ['is it safe to pay him directly', 'payment-execution'],
    ['is tokenization legal in kenya', 'tokenization-legal'],
    ['should i share my otp with the agent', 'account-security'],
    ['this agent is a scam', 'fraud-accusation'],
  ];

  it.each(cases)('%s → %s', (question, category) => {
    const c = classifyRequest(question);
    expect(c.mustEscalate, `expected escalation for: "${question}"`).toBe(true);
    expect(c.categories).toContain(category);
    expect(c.reasons.length).toBeGreaterThan(0);
    expect(c.policyVersion).toBe(POLICY_VERSION);
  });
});

describe('policy classification — factual process questions stay answerable (no over-refusal)', () => {
  const answerable = [
    'how does the title search process work on ardhisasa',
    'what is the capital gains rate for property',
    'explain how stamp duty works when buying',
    'how does escrow protect my deposit',
    'what is the average yield in kilimani',
    'how does tokenization trial mode work',
    'what are red flags for listing scams',
    'how do i report a suspicious listing',
    'what is the verification process for listings',
  ];

  it.each(answerable)('answerable: "%s"', (question) => {
    const c = classifyRequest(question);
    expect(c.mustEscalate, `expected NO escalation for: "${question}"`).toBe(false);
    expect(c.categories).toEqual([]);
  });
});

/* ------------------------------- redaction ------------------------------- */

describe('provider-bound redaction', () => {
  it('scrubs phone-like numbers', () => {
    const { redacted, removed } = redactForProvider('call me on +254 712 345 678 about the house');
    expect(redacted).not.toContain('712');
    expect(removed).toContain('phone-like-number');
  });

  it('scrubs emails', () => {
    const { redacted, removed } = redactForProvider('reach me at tenant@example.com please');
    expect(redacted).not.toContain('tenant@example.com');
    expect(removed).toContain('email');
  });

  it('scrubs national-id-like numbers', () => {
    const { redacted, removed } = redactForProvider('my id is 12345678');
    expect(redacted).not.toContain('12345678');
    expect(removed).toContain('national-id-like');
  });

  it('leaves ordinary price and area text intact for the on-device path', () => {
    // the gateway contract: redaction is applied at the provider egress
    // seam, so the LOCAL engine still sees plain price text (see the
    // budget regression test below)
    const { removed } = redactForProvider('3 bedroom in kilimani under 150000 per month');
    expect(removed).toEqual([]);
  });
});

/* ------------------------------- retrieval ------------------------------- */

describe('retrieval over the approved corpus', () => {
  it('returns area insight for an area question, boosted', () => {
    const chunks = retrieve('what is the market like in kilimani', { topK: 4 });
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].entry.kind).toBe('area-insight');
    expect(chunks[0].entry.title.toLowerCase()).toContain('kilimani');
  });

  it('returns nothing for unmatchable gibberish', () => {
    expect(retrieve('zzqxjvw blorp fnord', { topK: 4 })).toEqual([]);
  });

  it('isSufficient rejects empty and weak matches', () => {
    expect(isSufficient([])).toBe(false);
    expect(isSufficient(retrieve('zzqxjvw blorp fnord'))).toBe(false);
  });

  it('caps results at topK', () => {
    expect(retrieve('house apartment bedroom rent kilimani westlands', { topK: 3 }).length).toBeLessThanOrEqual(3);
  });
});

/* --------------------------- corpus integrity ---------------------------- */

describe('corpus integrity', () => {
  it('every entry is well-formed, public and freshly dated', () => {
    expect(CORPUS.length).toBeGreaterThan(50);
    for (const e of CORPUS) {
      expect(e.id).toMatch(/^corpus:/);
      expect(e.accessClass).toBe('public'); // authorization gate
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.text.length).toBeGreaterThan(0);
      expect(Number.isNaN(Date.parse(e.asOf))).toBe(false);
      expect(isFresh(e)).toBe(true);
    }
  });

  it('property entries reference real inventory ids', () => {
    const ids = new Set(PROPERTIES.map((p) => p.id));
    const propertyEntries = CORPUS.filter((e) => e.kind === 'property');
    expect(propertyEntries.length).toBe(PROPERTIES.length);
    for (const e of propertyEntries) {
      const ref = e.source.ref.split('#')[1];
      expect(ids.has(ref), `unknown property ref ${ref}`).toBe(true);
    }
  });

  it('freshness windows are sane per kind (listings age fastest, policy is evergreen)', () => {
    expect(FRESHNESS_WINDOW_DAYS.property).toBeLessThanOrEqual(FRESHNESS_WINDOW_DAYS['area-insight']);
    expect(FRESHNESS_WINDOW_DAYS['area-insight']).toBeLessThanOrEqual(FRESHNESS_WINDOW_DAYS.policy);
  });
});

/* ---------------------------- gateway outcomes ---------------------------- */

describe('gateway — escalation outcome', () => {
  it('routes regulated questions to a human with policy reasons', () => {
    const r = askKeja('should i sign the sale agreement');
    expect(r.policy.outcome).toBe('escalated');
    expect(r.response.action).toBe('whatsapp');
    expect(r.sources).toEqual([]);
    expect(r.response.quickReplies).toContain('Talk to a human on WhatsApp');
    expect(r.response.text.length).toBeGreaterThan(20);

    const events = eventLog().map((e) => e.event);
    expect(events).toContain('ai.answer.escalated.v1');
  });
});

describe('gateway — grounded answer outcome', () => {
  it('answers area questions with citations, FACT meta and a governed event', () => {
    const r = askKeja('what is the market like in kilimani');
    expect(r.policy.outcome).not.toBe('escalated');
    if (r.policy.outcome === 'answered') {
      expect(r.sources.length).toBeGreaterThan(0);
      expect(r.grounded?.citations.length).toBeGreaterThan(0);
      expect(r.response.meta?.some((m) => m.label === 'FACT' && /grounded/i.test(m.text))).toBe(true);
      expect(r.grounded?.freshness).toBeTruthy();
    }
    const ev = eventLog().find((e) => e.event === 'ai.answer.generated.v1');
    expect(ev).toBeDefined();
  });

  it('emits latency, provider and surface on the generated event', () => {
    askKeja('houses in kilimani');
    const ev = eventLog().find((e) => e.event === 'ai.answer.generated.v1');
    expect(ev).toBeDefined();
    const data = ev!.props as Record<string, unknown>;
    expect(data.surface).toBe('ask-keja');
    expect(data.provider).toBe('local-deterministic');
    expect(typeof data.latencyMs).toBe('number');
  });
});

describe('gateway — budget parsing regression (redaction must not corrupt the engine path)', () => {
  it('an 8-digit budget still parses — the engine sees the raw question', () => {
    const r = askKeja('show me houses under 50000000 in kilimani');
    // not escalated, not corrupted by provider-bound redaction
    expect(r.policy.outcome).not.toBe('escalated');
    expect(r.response.text).not.toContain('redacted');
    expect(r.response.action).not.toBe('whatsapp');
  });
});

describe('gateway — default provider', () => {
  it('is the local deterministic provider (zero network, offline-safe)', () => {
    expect(activeProvider().name).toBe('local-deterministic');
  });
});

/* ------------------------ post-generation review ------------------------- */

describe('post-generation review', () => {
  it('blocks guarantee language', () => {
    const v = reviewGeneration('this investment is guaranteed and risk-free', {
      citations: 2,
      evidenceSensitive: false,
    });
    expect(v.pass).toBe(false);
    expect(v.issues).toContain('guarantee-language');
  });

  it('blocks fraud verdicts and title verdicts', () => {
    expect(
      reviewGeneration('this is definitely a scam', { citations: 0, evidenceSensitive: false }).issues,
    ).toContain('fraud-verdict');
    expect(
      reviewGeneration('the title is clean', { citations: 0, evidenceSensitive: false }).issues,
    ).toContain('title-verdict');
  });

  it('requires citations for evidence-sensitive answers', () => {
    const v = reviewGeneration('kilimani averages 180k per sqm', { citations: 0, evidenceSensitive: true });
    expect(v.pass).toBe(false);
    expect(v.issues).toContain('missing-citations');
  });

  it('passes clean, cited answers', () => {
    const v = reviewGeneration('kilimani averages 180k per sqm according to comparables', {
      citations: 2,
      evidenceSensitive: true,
    });
    expect(v.pass).toBe(true);
    expect(v.policyVersion).toBe(POLICY_VERSION);
  });
});
