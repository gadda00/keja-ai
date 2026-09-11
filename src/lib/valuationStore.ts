/**
 * Valuation Desk — indicative, self-serve ESTIMATE engine.
 *
 * The chat engine deliberately escalates formal valuations to licensed humans;
 * this desk gives buyers and sellers an honest comparables band instead,
 * keeping that boundary visible. Every figure it produces is an ESTIMATE
 * derived from live Keja inventory asking prices — never presented as a
 * valuation.
 *
 * Pure engine (computeIndicativeValuation) + saved-report store
 * (localStorage 'keja:valuations', 'keja-store-change' event).
 */
import type { Property } from '@/data/properties';
import { isRentalPrice } from '@/lib/finance';
import { useStore } from '@/lib/store';
import { newId } from '@/lib/uuid';

export type ValuationType =
  'apartment' | 'villa' | 'townhouse' | 'bungalow' | 'land' | 'commercial';

export type ValuationCondition = 'new' | 'good' | 'needs-work';

export interface ValuationInputs {
  area: string;
  type: ValuationType;
  beds?: number;
  sizeSqM?: number;
  /** Land only — required for the price-per-acre basis. */
  acres?: number;
  condition: ValuationCondition;
}

export interface SavedValuation {
  id: string;
  createdAt: string;
  inputs: ValuationInputs;
  lowKes: number;
  medianKes: number;
  highKes: number;
  confidence: 'low' | 'medium' | 'high';
  compCount: number;
}

/** Storage suffix — persisted as localStorage 'keja:valuations'. */
export const VALUATION_KEY = 'valuations';

export function useSavedValuations(): [
  SavedValuation[],
  (v: SavedValuation[] | ((prev: SavedValuation[]) => SavedValuation[])) => void,
] {
  return useStore<SavedValuation[]>(VALUATION_KEY, []);
}

/** Collision-safe id for valuations saved on this device. */
export function newValuationId(): string {
  return newId('val');
}

/** 1 acre = 4046.8564224 m² (international surveying convention). Keja land
 *  comps store sizeSqm, so acreage is always derived through this constant. */
export const SQM_PER_ACRE = 4046.8564224;

/** ESTIMATE assumptions, surfaced in the UI as adjustment chips. */
export const CONDITION_ADJUSTMENTS: Record<ValuationCondition, number> = {
  new: 5, // +5%
  good: 0, // baseline
  'needs-work': -12, // −12%
};

/** Blend weight of the raw price median vs the price-per-sqm estimate when
 *  both bases exist (60% price / 40% per-sqm). */
export const BLEND_PRICE_WEIGHT = 0.6;

export interface ValuationResult {
  /** Condition-adjusted, rounded indicative median. */
  medianKes: number;
  lowKes: number;
  highKes: number;
  /** Band half-width as a fraction of the median (0.10 / 0.13 / 0.18). */
  bandPct: number;
  confidence: 'low' | 'medium' | 'high';
  compCount: number;
  comps: Property[];
  basis: 'price' | 'blend' | 'acreage';
  /** Raw median of comp asking prices. */
  priceMedianKes: number;
  /** Median price per sqm across comps that declare a size. */
  psqmMedianKes?: number;
  /** Land only — median price per acre across sized comps. */
  perAcreMedianKes?: number;
  /** Base value before the condition adjustment. */
  unadjustedKes: number;
  conditionAdjustmentPct: number;
  conditionDeltaKes: number;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Round to KES 10,000 — indicative figures never carry false precision. */
function roundKes(value: number): number {
  return Math.round(value / 10_000) * 10_000;
}

/** Band width and confidence scale with how many comparables back the number. */
function bandFor(compCount: number): { bandPct: number; confidence: 'low' | 'medium' | 'high' } {
  if (compCount < 4) return { bandPct: 0.18, confidence: 'low' };
  if (compCount <= 8) return { bandPct: 0.13, confidence: 'medium' };
  return { bandPct: 0.1, confidence: 'high' };
}

/**
 * Indicative valuation from live inventory comparables.
 *
 * - comps: same area + type, sale-priced (rentals and price-on-application
 *   listings never enter the math)
 * - land: price-per-acre basis (subject acres required)
 * - otherwise: price median, blended 60/40 with the per-sqm median × subject
 *   size when both exist
 * - condition adjustment applied after the base (+5 / 0 / −12%)
 * - band: ±13% baseline, widened to ±18% under 4 comps, tightened to ±10%
 *   above 8 comps
 *
 * Returns null when no usable comps exist (or land acreage is missing) — the
 * honest answer is "not enough comparables, request a human valuation".
 */
export function computeIndicativeValuation(
  inputs: ValuationInputs,
  inventory: Property[]
): ValuationResult | null {
  const comps = inventory.filter(
    (p) =>
      p.area === inputs.area && p.type === inputs.type && p.price > 0 && !isRentalPrice(p.price)
  );
  if (comps.length === 0) return null;

  if (inputs.type === 'land') {
    const sizedComps = comps.filter((p) => p.sizeSqm > 0);
    if (sizedComps.length === 0) return null;
    const acres = inputs.acres ?? 0;
    if (acres <= 0) return null;

    const perAcreValues = sizedComps.map((p) => p.price / (p.sizeSqm / SQM_PER_ACRE));
    const perAcreMedian = median(perAcreValues);
    return finalise(comps, perAcreMedian * acres, inputs, 'acreage', {
      priceMedianKes: median(comps.map((p) => p.price)),
      perAcreMedianKes: roundKes(perAcreMedian),
    });
  }

  const priceMedian = median(comps.map((p) => p.price));
  const sizedComps = comps.filter((p) => p.sizeSqm > 0);
  const subjectSize = inputs.sizeSqM ?? 0;

  if (sizedComps.length > 0 && subjectSize > 0) {
    const psqmMedian = median(sizedComps.map((p) => p.price / p.sizeSqm));
    const psqmBasis = psqmMedian * subjectSize;
    const unadjusted = BLEND_PRICE_WEIGHT * priceMedian + (1 - BLEND_PRICE_WEIGHT) * psqmBasis;
    return finalise(comps, unadjusted, inputs, 'blend', {
      priceMedianKes: priceMedian,
      psqmMedianKes: roundKes(psqmMedian),
    });
  }

  return finalise(comps, priceMedian, inputs, 'price', {
    priceMedianKes: priceMedian,
  });
}

function finalise(
  comps: Property[],
  unadjusted: number,
  inputs: ValuationInputs,
  basis: ValuationResult['basis'],
  bases: { priceMedianKes: number; psqmMedianKes?: number; perAcreMedianKes?: number }
): ValuationResult {
  const { bandPct, confidence } = bandFor(comps.length);
  const conditionAdjustmentPct = CONDITION_ADJUSTMENTS[inputs.condition];
  const conditionDeltaKes = (unadjusted * conditionAdjustmentPct) / 100;
  const medianKes = roundKes(unadjusted + conditionDeltaKes);

  return {
    medianKes,
    lowKes: roundKes(medianKes * (1 - bandPct)),
    highKes: roundKes(medianKes * (1 + bandPct)),
    bandPct,
    confidence,
    compCount: comps.length,
    comps: [...comps].sort((a, b) => b.trustScore - a.trustScore),
    basis,
    priceMedianKes: bases.priceMedianKes,
    psqmMedianKes: bases.psqmMedianKes,
    perAcreMedianKes: bases.perAcreMedianKes,
    unadjustedKes: roundKes(unadjusted),
    conditionAdjustmentPct,
    conditionDeltaKes: roundKes(conditionDeltaKes),
  };
}
