/**
 * KEJA AI Deal Analyst — preliminary document & deal screening (proposal §5).
 *
 * Users describe the deal (price, area, size, rent) and attach or declare
 * their documents (title, sale agreement, valuation, lease, budget…).
 * The engine produces an honest, labelled pre-screening:
 *
 *   Investment Score /10 · Risk Level · Estimated Market Value vs Asking ·
 *   Price Difference · Gross & Net Yield · Red Flags · Recommendation
 *
 * Design principles (trust-by-design):
 *  - market-value estimate is an ESTIMATE from area price bands — labelled as such
 *  - missing critical documents surface as red flags, never silently ignored
 *  - the recommendation is decision support; it never replaces professional
 *    legal, valuation, financial or regulatory advice
 *  - everything runs client-side — documents never leave the device
 */
import { areaInsights } from '@/data/properties';

export type DocKind =
  | 'title'
  | 'sale-agreement'
  | 'valuation'
  | 'lease'
  | 'development-proposal'
  | 'brochure'
  | 'financials'
  | 'rental-schedule'
  | 'budget'
  | 'other';

export interface DocEntry {
  kind: DocKind;
  fileName?: string;
  /** extracted text, when the file is text-readable */
  text?: string;
  sizeKb?: number;
}

export interface DealInput {
  title: string;
  area: string;
  propertyType: 'apartment' | 'villa' | 'townhouse' | 'bungalow' | 'land' | 'commercial';
  sizeSqm: number;
  askingPrice: number;
  monthlyRentEstimate: number;
  annualExpenses?: number;
  docs: DocEntry[];
}

export type RiskLevel = 'Low' | 'Medium' | 'High';
export type Recommendation = 'Proceed' | 'Negotiate' | 'Investigate Further' | 'High Risk';

export interface RedFlag {
  severity: 'high' | 'medium' | 'low';
  text: string;
}

export interface DealAnalysis {
  investmentScore: number; // 0–10
  riskLevel: RiskLevel;
  estimatedMarketValue: number;
  priceDifferencePct: number; // +ve = asking above estimate
  grossYieldPct: number;
  netYieldPct: number;
  redFlags: RedFlag[];
  recommendation: Recommendation;
  recommendationNote: string;
  scoreFactors: { label: string; score: number; basis: 'FACT' | 'ESTIMATE' | 'ASSUMPTION'; note: string }[];
  documentCoverage: { kind: DocKind; present: boolean; critical: boolean }[];
}

/** Critical documents whose absence is a material red flag. */
const CRITICAL_DOCS: DocKind[] = ['title', 'sale-agreement'];

const DOC_LABELS: Record<DocKind, string> = {
  title: 'Title documents',
  'sale-agreement': 'Sale agreement',
  valuation: 'Valuation report',
  lease: 'Lease agreement',
  'development-proposal': 'Development proposal',
  brochure: 'Property brochure',
  financials: 'Financial statements',
  'rental-schedule': 'Rental schedule',
  budget: 'Development budget',
  other: 'Other documents',
};

export const DOC_OPTIONS: { kind: DocKind; label: string; critical: boolean }[] = (
  Object.keys(DOC_LABELS) as DocKind[]
).map((kind) => ({ kind, label: DOC_LABELS[kind], critical: CRITICAL_DOCS.includes(kind) }));

/** Parse an area price band like "KES 45k–65k" into a mid price per sqm. */
function areaPricePerSqm(area: string): { mid: number; band: string } | null {
  const insight = areaInsights[area];
  if (!insight) return null;
  const m = insight.avgPricePerSqm.match(/([\d.]+)\s*k\s*[–-]\s*([\d.]+)\s*k/i);
  if (!m) return null;
  const low = parseFloat(m[1]) * 1_000;
  const high = parseFloat(m[2]) * 1_000;
  return { mid: (low + high) / 2, band: insight.avgPricePerSqm };
}

/** Signals scanned in supplied document text (transparent, rule-based). */
function scanText(texts: string[]): string[] {
  const found: string[] = [];
  const hay = texts.join(' \n ').toLowerCase();
  const signals: [RegExp, string][] = [
    [/caveat emptor|encumbrance|caution|restriction/, 'encumbrance language'],
    [/irrevocable|power of attorney/, 'power-of-attorney language'],
    [/lease\s*(period|term)|years?[, ]+commencing/, 'lease-term language'],
    [/default|penalt(y|ies)|forfeit/, 'default & penalty clauses'],
    [/valuation|market value|open market/, 'valuation figures'],
    [/service charge|management fee|rates/, 'recurring cost clauses'],
  ];
  for (const [re, label] of signals) if (re.test(hay)) found.push(label);
  return found;
}

export function analyzeDeal(input: DealInput): DealAnalysis {
  const { area, sizeSqm, askingPrice, monthlyRentEstimate, docs } = input;
  const band = areaPricePerSqm(area);
  const annualExpenses = input.annualExpenses ?? Math.round(monthlyRentEstimate * 12 * 0.28);

  // 1 — Market value estimate (ESTIMATE label).
  const estimatedMarketValue = band ? Math.round(band.mid * sizeSqm) : Math.round(askingPrice * 0.97);
  const priceDifferencePct =
    askingPrice > 0 ? ((askingPrice - estimatedMarketValue) / estimatedMarketValue) * 100 : 0;

  // 2 — Yields.
  const annualGross = monthlyRentEstimate * 12;
  const annualNet = annualGross - annualExpenses;
  const grossYieldPct = askingPrice > 0 ? (annualGross / askingPrice) * 100 : 0;
  const netYieldPct = askingPrice > 0 ? (annualNet / askingPrice) * 100 : 0;

  // 3 — Document coverage.
  const present = new Set(docs.map((d) => d.kind));
  const documentCoverage = DOC_OPTIONS.map((o) => ({
    kind: o.kind,
    present: present.has(o.kind),
    critical: o.critical,
  }));

  // 4 — Red flags.
  const redFlags: RedFlag[] = [];
  for (const d of documentCoverage) {
    if (d.critical && !d.present) {
      redFlags.push({
        severity: 'high',
        text: `${DOC_LABELS[d.kind]} not supplied — ownership and terms cannot be pre-screened.`,
      });
    }
  }
  if (!present.has('valuation')) {
    redFlags.push({ severity: 'medium', text: 'No independent valuation report — market value here is a band estimate only.' });
  }
  if (priceDifferencePct > 10) {
    redFlags.push({ severity: 'medium', text: `Asking price sits ${priceDifferencePct.toFixed(0)}% above the area band estimate — room to negotiate.` });
  }
  if (monthlyRentEstimate > 0 && !present.has('rental-schedule') && !present.has('lease')) {
    redFlags.push({ severity: 'low', text: 'Rental figures are estimates without a lease or rental schedule to confirm them.' });
  }
  if (!present.has('financials') && input.propertyType === 'commercial') {
    redFlags.push({ severity: 'medium', text: 'Commercial asset without financial statements — income history unverified.' });
  }
  const textSignals = scanText(docs.map((d) => d.text ?? '').filter(Boolean));
  if (textSignals.includes('encumbrance language')) {
    redFlags.push({ severity: 'high', text: 'Document scan found encumbrance / caveat language — legal review is essential.' });
  }
  if (textSignals.includes('power-of-attorney language')) {
    redFlags.push({ severity: 'medium', text: 'Power-of-attorney language detected — verify the attorney\u2019s authority.' });
  }

  // 5 — Score factors (0–10 each).
  const priceScore = Math.max(0, Math.min(10, 8.5 - Math.abs(priceDifferencePct) / 4 + (priceDifferencePct < -5 ? 1 : 0)));
  const yieldScore = Math.max(0, Math.min(10, (grossYieldPct / 9) * 9));
  const docScore = Math.max(0, Math.min(10, 4 + documentCoverage.filter((d) => d.present).length * 1.2 - documentCoverage.filter((d) => d.critical && !d.present).length * 3));
  const areaScore = band ? 7.5 : 5.5;
  const rentScore = monthlyRentEstimate > 0 ? 7.5 : 4;

  const factors = [
    { label: 'Price vs market band', score: round1(priceScore), basis: 'ESTIMATE' as const, note: band ? `Area band ${band.band}/m² × ${sizeSqm.toLocaleString('en-KE')} m².` : 'No area band on file — value proxied from asking price.' },
    { label: 'Income yield', score: round1(yieldScore), basis: 'ESTIMATE' as const, note: `Gross ${grossYieldPct.toFixed(1)}% · net ${netYieldPct.toFixed(1)}% on asking price.` },
    { label: 'Documentation completeness', score: round1(docScore), basis: 'FACT' as const, note: `${documentCoverage.filter((d) => d.present).length} of ${documentCoverage.length} document types supplied.` },
    { label: 'Location data depth', score: round1(areaScore), basis: 'ESTIMATE' as const, note: band ? 'Area intelligence available for this location.' : 'Limited area data — treat location score as an assumption.' },
    { label: 'Income evidence', score: round1(rentScore), basis: monthlyRentEstimate > 0 ? ('ESTIMATE' as const) : ('ASSUMPTION' as const), note: monthlyRentEstimate > 0 ? 'Rent estimate supplied by you or your broker.' : 'No rent input — yield unknown.' },
  ];
  const investmentScore = round1(factors.reduce((s, f) => s + f.score, 0) / factors.length);

  // 6 — Risk level & recommendation.
  const highFlags = redFlags.filter((f) => f.severity === 'high').length;
  const mediumFlags = redFlags.filter((f) => f.severity === 'medium').length;
  const riskLevel: RiskLevel = highFlags >= 2 ? 'High' : highFlags === 1 || mediumFlags >= 3 ? 'Medium' : 'Low';

  let recommendation: Recommendation = 'Proceed';
  let recommendationNote = '';
  if (riskLevel === 'High' || investmentScore < 4.5) {
    recommendation = 'High Risk';
    recommendationNote = 'Material gaps or over-pricing make this deal unsafe to progress without professional due diligence.';
  } else if (highFlags === 1 || mediumFlags >= 1 || priceDifferencePct > 6) {
    recommendation = 'Investigate Further';
    recommendationNote = 'Promising, but resolve the flagged items — commission the valuation, confirm the title, then re-run this analysis.';
  } else if (priceDifferencePct > 2 || investmentScore < 7) {
    recommendation = 'Negotiate';
    recommendationNote = 'The deal is broadly sound — use the price-band gap and flagged items to negotiate better terms.';
  } else {
    recommendationNote = 'Documentation is complete, pricing sits inside the area band and the yield clears the market hurdle — subject to your own legal and valuation checks.';
  }

  return {
    investmentScore,
    riskLevel,
    estimatedMarketValue,
    priceDifferencePct,
    grossYieldPct,
    netYieldPct,
    redFlags,
    recommendation,
    recommendationNote,
    scoreFactors: factors,
    documentCoverage,
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** The proposal §5 sample deal, for instant demonstration. */
export const SAMPLE_DEAL: DealInput = {
  title: '4BR Townhouse — Runda',
  area: 'Runda',
  propertyType: 'townhouse',
  sizeSqm: 320,
  askingPrice: 34_500_000,
  monthlyRentEstimate: 220_000,
  annualExpenses: 740_000,
  docs: [
    { kind: 'sale-agreement', fileName: 'sale-agreement-draft.pdf' },
    { kind: 'brochure', fileName: 'runda-townhouse-brochure.pdf' },
  ],
};
