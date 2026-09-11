/**
 * The approved knowledge corpus (audit ch.10 "Corpus pipeline").
 *
 * Ingestion rule: every entry comes from an approved in-repo source — the
 * authored property inventory, the area insights table, or a policy
 * document (how verification works, what Keja does and does not do). Each
 * entry records its source, kind, access class and as-of date, so every
 * generated answer can cite exactly what it was grounded in, and stale
 * facts can be detected mechanically (retrieval.ts refuses entries older
 * than their freshness window).
 *
 * Access control note (audit "authorization before retrieval"): every entry
 * here is `public` by construction — the corpus is the public knowledge
 * surface. Anything private (KYC evidence, user drafts, audit metadata)
 * never enters this module at all, so the retrieval layer cannot leak it.
 */
import { areaInsights, PROPERTIES } from '@/data/properties';

export type CorpusKind = 'property' | 'area-insight' | 'policy';

export interface CorpusEntry {
  id: string;
  kind: CorpusKind;
  title: string;
  /** The retrievable text — facts only, no contact details. */
  text: string;
  source: { type: 'authored-inventory' | 'area-insights' | 'policy-document'; ref: string };
  accessClass: 'public';
  /** When the fact was last checked (ISO date). */
  asOf: string;
}

/** Policy documents — the "what Keja is" knowledge, written once, cited forever. */
const POLICY_DOCS: { id: string; title: string; text: string; ref: string }[] = [
  {
    id: 'policy-verification',
    title: 'How Keja verifies listings',
    ref: 'src/components/trust/AboutView.tsx (Trust Center)',
    text:
      'Keja runs a multi-signal verification on every listing: title-deed status check, Ardhisasa land-registry cross-match where available, photo verification against the listing, duplicate detection across the market, and listing-velocity review for suspicious reposting. Verification results are labelled pass, warn or fail and shown per listing — never hidden. Verification checks on demo data are simulated evidence on seeded listings; live external checks activate with partner integrations.',
  },
  {
    id: 'policy-estimate-labels',
    title: 'Fact vs estimate vs assumption labels',
    ref: 'src/lib/ai/engine.ts (trust differentiator)',
    text:
      'Keja AI labels every statement it makes as FACT (directly from verified listing data), ESTIMATE (computed from models and comparables, e.g. rental yield bands), ASSUMPTION (stated explicitly so the user can correct it) or REPORTED (vendor claims not yet independently verified). Formal valuations always escalate to a licensed valuer.',
  },
  {
    id: 'policy-valuation-desk',
    title: 'The Valuation Desk — indicative bands, not valuations',
    ref: 'src/lib/valuationStore.ts',
    text:
      'The Valuation Desk computes an indicative band (low, median, high) from live comparables in Keja inventory, blended with price-per-sqm when sizes are known, adjusted for condition, and labelled with a confidence level based on how many comparables exist. It is an ESTIMATE for screening and negotiation prep. A licensed valuer physically inspecting the property is the only number to transact on.',
  },
  {
    id: 'policy-tokenization-trial',
    title: 'Tokenization is a trial sandbox',
    ref: 'src/lib/tokenizeStore.tsx (trial mode)',
    text:
      'Property tokenization on Keja runs in a clearly-labelled trial mode with simulated money, a virtual wallet and demo investments. No real securities are offered, no real payments are processed, and nothing in the trial constitutes an offer of financial instruments. Regulatory status of tokenized real estate in Kenya is not settled; Keja escalates all tokenization legality questions.',
  },
  {
    id: 'policy-contact',
    title: 'Human contact and escalation',
    ref: 'src/components/ai/AskKejaView.tsx',
    text:
      'Keja AI escalates professional-advice questions (legal, tax, formal valuation, investment suitability, lending decisions, title determination, payments, fraud allegations) to a human instead of improvising answers. Users can reach a human via WhatsApp or the contact form at any time.',
  },
];

function propertyToEntry(p: (typeof PROPERTIES)[number]): CorpusEntry {
  const facts: string[] = [
    `${p.title} — a ${p.type} in ${p.area}, ${p.county}.`,
    p.priceOnApplication
      ? 'Price on application from the vendor.'
      : p.purpose.includes('rent')
        ? `Asking rent ${Intl.NumberFormat('en-KE').format(p.price)} KES per month.`
        : `Asking price ${Intl.NumberFormat('en-KE').format(p.price)} KES.`,
  ];
  if (p.bedrooms) facts.push(`${p.bedrooms} bedroom${p.bedrooms > 1 ? 's' : ''}, ${p.bathrooms ?? 1} bathroom(s).`);
  if (p.sizeSqm) facts.push(`${p.sizeSqm} sqm.`);
  if (p.rentEstimate) facts.push(`Rent estimate ${Intl.NumberFormat('en-KE').format(p.rentEstimate)} KES per month (ESTIMATE).`);
  if (p.grossYieldEstimate) facts.push(`Gross yield estimate ${(p.grossYieldEstimate * 100).toFixed(1)}% (ESTIMATE from comparables).`);
  if (p.completionDate) facts.push(`Completion ${p.completionDate}.`);
  if (p.paymentPlan) facts.push(`Payment plan: ${p.paymentPlan}.`);
  facts.push(
    `Trust score ${p.trustScore}/100. Verification: title ${p.verification.titleCheck}, photos ${p.verification.photosVerified ? 'verified' : 'pending'}, duplicate check ${p.verification.duplicateCheck}.`,
  );
  facts.push(p.description);
  return {
    id: `corpus:property:${p.id}`,
    kind: 'property',
    title: p.title,
    text: facts.join(' '),
    source: { type: 'authored-inventory', ref: `src/data/properties.ts#${p.id}` },
    accessClass: 'public',
    asOf: p.verification.lastChecked,
  };
}

function insightsToEntries(): CorpusEntry[] {
  return Object.entries(areaInsights).map(([area, i]) => ({
    id: `corpus:area:${area.toLowerCase().replace(/\s+/g, '-')}`,
    kind: 'area-insight' as const,
    title: `${area} market insight`,
    text: `${area}: average price per sqm ${i.avgPricePerSqm}, indicative rental yield ${i.yield} (ESTIMATE from market comparables). ${i.note}`,
    source: { type: 'area-insights', ref: `src/data/properties.ts#areaInsights['${area}']` },
    accessClass: 'public' as const,
    asOf: '2026-09-11',
  }));
}

/** The approved public corpus — built once, deterministically, at load. */
export const CORPUS: readonly CorpusEntry[] = [
  ...PROPERTIES.map(propertyToEntry),
  ...insightsToEntries(),
  ...POLICY_DOCS.map((d) => ({
    id: `corpus:${d.id}`,
    kind: 'policy' as const,
    title: d.title,
    text: d.text,
    source: { type: 'policy-document' as const, ref: d.ref },
    accessClass: 'public' as const,
    asOf: '2026-09-11',
  })),
];

/** Corpus fingerprint — changes whenever any source of truth changes. */
export function corpusVersion(): string {
  const n = CORPUS.length;
  const h = CORPUS.reduce((acc, e) => (acc * 31 + e.text.length) | 0, 7);
  return `corpus-${n}-${(h >>> 0).toString(16)}`;
}

/** Freshness policy per kind (audit: "a trust factor should not be treated
 *  as current if evidence freshness exceeds its policy window"). */
export const FRESHNESS_WINDOW_DAYS: Record<CorpusKind, number> = {
  property: 90,
  'area-insight': 180,
  policy: 365,
};

export function isFresh(entry: CorpusEntry, now = new Date()): boolean {
  const age = (now.getTime() - Date.parse(entry.asOf)) / 86_400_000;
  return age <= FRESHNESS_WINDOW_DAYS[entry.kind];
}
