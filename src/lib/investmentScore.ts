/**
 * KEJA Investment Score™ — the transparent multi-factor framework from the
 * blueprint (Ch.7): rental potential, capital appreciation, location, demand,
 * price/value, liquidity and risk. Scores are decision-support tools, never
 * guarantees — the engine separates verified inputs from estimates and
 * communicates how much data stands behind each score.
 */
import type { Property } from '@/data/properties';
import { areaInsights } from '@/data/areaInsights';
import { isRentalPrice } from '@/lib/finance';

/**
 * Version of this scoring engine. Bump on ANY change to factors, weights or
 * banding — the value ships in every trust-anchor manifest (see
 * src/lib/trustAnchor.ts), so a published score can always be traced to the
 * exact algorithm that produced it.
 */
export const INVESTMENT_ALGORITHM_VERSION = '2026-09-13.1';

export interface ScoreFactor {
  key: string;
  label: string;
  score: number; // 0–10
  basis: 'FACT' | 'ESTIMATE' | 'ASSUMPTION';
  note: string;
}

export interface InvestmentScore {
  overall: number; // 0–10, one decimal
  band: 'Exceptional' | 'Strong' | 'Solid' | 'Moderate' | 'Speculative';
  factors: ScoreFactor[];
  /** How much live data stands behind this score — drives presentation honesty. */
  confidence: DataConfidence;
}

/* ------------------------------ data confidence ---------------------------- */

export interface DataConfidence {
  /** thin (<5 comparables) · growing (5–14) · robust (≥15) */
  grade: 'thin' | 'growing' | 'robust';
  /** live same-area, same-market listings the area-level factors draw on */
  comparables: number;
  /** all live listings in the area, any type or market */
  areaListings: number;
  /** the presentation precision the data actually supports */
  precision: 'band' | 'integer' | 'decimal';
  /** one honest sentence for the UI chip */
  note: string;
}

/** Count same-area, same-market listings (excluding the subject) as comparables. */
export function comparableCount(p: Property, all: Property[]): number {
  const subjectIsRental = isRentalPrice(p.price);
  return all.filter(
    (q) =>
      q.id !== p.id &&
      q.area === p.area &&
      !q.priceOnApplication &&
      isRentalPrice(q.price) === subjectIsRental,
  ).length;
}

/** Compute the data-confidence layer for a listing against an inventory. */
export function dataConfidence(p: Property, all: Property[]): DataConfidence {
  const comparables = comparableCount(p, all);
  const areaListings = all.filter((q) => q.area === p.area).length;
  if (comparables < 5) {
    return {
      grade: 'thin',
      comparables,
      areaListings,
      precision: 'band',
      note: `Thin data — ${comparables} comparable listing${comparables === 1 ? '' : 's'} in ${p.area}. Directional only; the decimal would be false precision.`,
    };
  }
  if (comparables < 15) {
    return {
      grade: 'growing',
      comparables,
      areaListings,
      precision: 'integer',
      note: `Based on ${comparables} comparable listings in ${p.area}.`,
    };
  }
  return {
    grade: 'robust',
    comparables,
    areaListings,
    precision: 'decimal',
    note: `Backed by ${comparables} comparable listings in ${p.area}.`,
  };
}

/** Presentation helper — what the UI may honestly show for the overall score. */
export function displayOverall(score: InvestmentScore): string {
  if (score.confidence.precision === 'band') return score.band;
  if (score.confidence.precision === 'integer') return String(Math.round(score.overall));
  return score.overall.toFixed(1);
}

/** Presentation helper — factor precision follows the same confidence rule. */
export function displayFactor(score: number, precision: DataConfidence['precision']): string {
  return precision === 'decimal' ? score.toFixed(1) : String(Math.round(score));
}

/** Location demand bands (illustrative, Nairobi-centric, upgradeable to data). */
const LOCATION_SCORE: Record<string, number> = {
  Kilimani: 9.4,
  Westlands: 9.2,
  Lavington: 8.9,
  Riverside: 8.8,
  Karen: 8.4,
  'Upper Hill': 8.6,
  Kileleshwa: 8.7,
  Nyali: 8.3,
  Diani: 8.1,
  Runda: 8.5,
  default: 7.2,
};

export function investmentScore(
  p: Property,
  opts: {
    /** Inventory the confidence layer counts comparables against.
     *
     * REQUIRED since the wave-15 inventory data-split: this module must not
     * import the 87-listing catalogue (that dragged the whole inventory into
     * the boot-critical chunk via PropertyCard). Callers pass the inventory
     * they render within — views have `useAllProperties()`, the build-side
     * anchor passes the catalogue it is scoring. */
    inventory: Property[];
  },
): InvestmentScore {
  const core = investmentFactors(p);
  return { ...core, confidence: dataConfidence(p, opts.inventory) };
}

/** Pure factor engine — overall / band / the seven factors, NO inventory
 *  dependency. Safe for the boot-critical card surface (PropertyCard), which
 *  renders only the chip; confidence comparables need a real inventory and
 *  are computed by `investmentScore` in the views that have one. */
export function investmentFactors(
  p: Property,
): Pick<InvestmentScore, 'overall' | 'band' | 'factors'> {
  // Rental listings are not sale assets — price/value per-sqm norm comparison
  // is skipped for them (monthly rent vs sale price per sqm is meaningless).
  // 1 — Rental potential. For rental listings (price = monthly rent) the
  // rentEstimate/price ratio is meaningless — use the listing's own yield
  // estimate or the area's typical yield band instead.
  const isRental = isRentalPrice(p.price);
  const areaYield = parseFloat(areaInsights[p.area]?.yield ?? '') || 0;
  const grossYield = isRental
    ? (p.grossYieldEstimate ?? areaYield)
    : p.rentEstimate && p.price
      ? ((p.rentEstimate * 12) / p.price) * 100
      : 0;
  const rental = grossYield > 0 ? Math.max(3, Math.min(10, (grossYield / 8) * 8.5)) : 5.5;

  // 2 — Capital appreciation forecast (data-provided or 6% baseline)
  const appreciation = p.appreciationForecast ?? 6;
  const growth = Math.max(3, Math.min(10, (appreciation / 9) * 9));

  // 3 — Location score from band table
  const location = LOCATION_SCORE[p.area] ?? LOCATION_SCORE.default;

  // 4 — Demand proxy: views + trust score blend
  const demand = Math.max(3, Math.min(10, 4 + p.views / 120 + (p.trustScore - 80) / 10));

  // 5 — Price/value: price per sqm vs type norms (sale listings only)
  const perSqm = !isRental && p.sizeSqm > 0 ? p.price / p.sizeSqm : 0;
  const typeNorm: Record<string, number> = {
    apartment: 120000,
    villa: 85000,
    townhouse: 95000,
    bungalow: 80000,
    land: 8000,
    commercial: 160000,
  };
  const norm = typeNorm[p.type] ?? 100000;
  const value = perSqm > 0 ? Math.max(3, Math.min(10, 10 - Math.abs(perSqm / norm - 1) * 9)) : 6;

  // 6 — Liquidity: apartments & hot areas turn over faster
  const liquidity =
    (p.type === 'apartment' ? 8.2 : p.type === 'villa' ? 6.8 : p.type === 'land' ? 5.2 : 7) *
    (LOCATION_SCORE[p.area] ? 1.02 : 0.94);

  // 7 — Risk: verification status & listing signals
  let risk = 8.5;
  if (p.verification.titleCheck !== 'verified') risk -= 2;
  if (p.verification.duplicateCheck !== 'clean') risk -= 1.5;
  if (p.verification.listingVelocity === 'suspicious') risk -= 2;
  if (p.offPlan) risk -= 1;
  risk = Math.max(2, Math.min(10, risk));

  const factors: ScoreFactor[] = [
    {
      key: 'rental',
      label: 'Rental Potential',
      score: round1(rental),
      basis: grossYield > 0 ? 'ESTIMATE' : 'ASSUMPTION',
      note: isRental
        ? `Area typical gross yield ~${grossYield.toFixed(1)}% (rental listing — income yield context)`
        : grossYield > 0
          ? `Gross yield ${grossYield.toFixed(1)}% (authored rent estimate ÷ asking price)`
          : 'No rent data — benchmark assumption applied',
    },
    {
      key: 'growth',
      label: 'Capital Appreciation',
      score: round1(growth),
      basis: p.appreciationForecast ? 'ESTIMATE' : 'ASSUMPTION',
      note: `Forecast ${appreciation}% p.a. ${p.appreciationForecast ? '(model estimate)' : '(market baseline)'}`,
    },
    {
      key: 'location',
      label: 'Location',
      score: round1(location),
      basis: 'ESTIMATE',
      note: `${p.area}, ${p.county} — location intelligence band (editorial research, upgraded as data grows)`,
    },
    {
      key: 'demand',
      label: 'Demand',
      score: round1(demand),
      basis: 'ESTIMATE',
      note: `${p.views} platform views blended with the trust score — a model proxy, not verified transaction demand`,
    },
    {
      key: 'value',
      label: 'Price / Value',
      score: round1(value),
      basis: 'ESTIMATE',
      note:
        perSqm > 0
          ? `KES ${Math.round(perSqm / 1000)}k/sqm vs ${p.type} norm`
          : 'Size data unavailable',
    },
    {
      key: 'liquidity',
      label: 'Liquidity',
      score: round1(Math.min(10, liquidity)),
      basis: 'ESTIMATE',
      note: `${p.type} resale depth in ${p.area}`,
    },
    {
      key: 'risk',
      label: 'Risk',
      score: round1(risk),
      basis: 'FACT',
      note: `Title ${p.verification.titleCheck}, duplicate check ${p.verification.duplicateCheck}`,
    },
  ];

  const weights: Record<string, number> = {
    rental: 0.22,
    growth: 0.18,
    location: 0.16,
    demand: 0.12,
    value: 0.14,
    liquidity: 0.08,
    risk: 0.1,
  };
  const overall = round1(factors.reduce((acc, f) => acc + f.score * weights[f.key], 0));

  const band: InvestmentScore['band'] =
    overall >= 8.5
      ? 'Exceptional'
      : overall >= 7.5
        ? 'Strong'
        : overall >= 6.5
          ? 'Solid'
          : overall >= 5.5
            ? 'Moderate'
            : 'Speculative';

  return { overall, band, factors };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export const scoreTone = (score: number) =>
  score >= 8.5
    ? { chip: 'bg-green-600 text-white', bar: 'bg-green-500' }
    : score >= 7.5
      ? { chip: 'bg-gold-gradient text-white', bar: 'bg-gold-500' }
      : score >= 6.5
        ? { chip: 'bg-gold-100 text-gold-800', bar: 'bg-gold-400' }
        : score >= 5.5
          ? { chip: 'bg-amber-100 text-amber-800', bar: 'bg-amber-500' }
          : { chip: 'bg-red-100 text-red-700', bar: 'bg-red-500' };
