/**
 * Pricing Intelligence (wave 20) — honest fair-price screening for buyers.
 *
 * The portal promise for Buyers & Sellers says "fair-price screening", but
 * until now the only band on a listing was ±8% around the asking price —
 * arithmetic that brackets whatever the seller asks, so it can never warn
 * "this is 30% over the market". The Valuation Desk had the honest
 * comparables engine; the listing page never used it.
 *
 * This module screens every priced sale listing against LIVE inventory
 * comparables (same area + type, sale-priced, not sold, excluding the
 * subject itself) and states where the asking price sits — clearly
 * labelled ESTIMATE, comp-count-backed, never a valuation.
 */
import type { Property } from '@/data/properties';
import { isRentalPrice } from '@/lib/finance';

export interface PricingIntel {
  /** Comparables behind the screen (excludes the subject + sold stock). */
  compCount: number;
  /** Indicative market band from comps (condition-unadjusted). */
  lowKes: number;
  medianKes: number;
  highKes: number;
  /** Where the asking price sits relative to the band. */
  position: 'below' | 'within' | 'above';
  /** Asking vs band median, signed percent (negative = below market). */
  vsMedianPct: number;
  /** Subject price per sqm vs the comps' median, when both sizes exist. */
  psqmKes?: number;
  psqmMedianKes?: number;
  psqmDeltaPct?: number;
  /** Confidence scales with comp count, same thresholds as the Valuation Desk. */
  confidence: 'low' | 'medium' | 'high';
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Band width by comp count — mirrors the Valuation Desk thresholds so the
 *  two surfaces can never disagree about confidence. */
export function bandFor(compCount: number): { bandPct: number; confidence: 'low' | 'medium' | 'high' } {
  if (compCount < 4) return { bandPct: 0.18, confidence: 'low' };
  if (compCount <= 8) return { bandPct: 0.13, confidence: 'medium' };
  return { bandPct: 0.1, confidence: 'high' };
}

/** Comparables for a listing: same area + type, sale-priced, not sold,
 *  never the subject itself. POA listings (price 0) drop out via price > 0. */
export function compsFor(p: Property, inventory: Property[]): Property[] {
  return inventory.filter(
    (x) =>
      x.id !== p.id &&
      x.area === p.area &&
      x.type === p.type &&
      x.price > 0 &&
      !isRentalPrice(x.price) &&
      x.availability !== 'sold',
  );
}

/**
 * Screen a priced sale listing against its comparables.
 * Returns null when there is nothing honest to say (rental, POA, or no
 * comps) — the UI then simply shows nothing instead of inventing a band.
 */
export function pricingIntelligence(p: Property, inventory: Property[]): PricingIntel | null {
  if (p.price <= 0 || p.priceOnApplication || isRentalPrice(p.price)) return null;

  const comps = compsFor(p, inventory);
  if (comps.length === 0) return null;

  const { bandPct, confidence } = bandFor(comps.length);
  const medianKes = median(comps.map((c) => c.price));
  const lowKes = Math.round(medianKes * (1 - bandPct));
  const highKes = Math.round(medianKes * (1 + bandPct));

  const position: PricingIntel['position'] =
    p.price < lowKes ? 'below' : p.price > highKes ? 'above' : 'within';
  const vsMedianPct = medianKes > 0 ? ((p.price - medianKes) / medianKes) * 100 : 0;

  const intel: PricingIntel = {
    compCount: comps.length,
    lowKes,
    medianKes: Math.round(medianKes),
    highKes,
    position,
    vsMedianPct,
    confidence,
  };

  const sizedComps = comps.filter((c) => c.sizeSqm > 0);
  if (p.sizeSqm > 0 && sizedComps.length > 0) {
    const psqm = p.price / p.sizeSqm;
    const psqmMedian = median(sizedComps.map((c) => c.price / c.sizeSqm));
    if (psqmMedian > 0) {
      intel.psqmKes = Math.round(psqm);
      intel.psqmMedianKes = Math.round(psqmMedian);
      intel.psqmDeltaPct = ((psqm - psqmMedian) / psqmMedian) * 100;
    }
  }

  return intel;
}

/** Human verdict line for a position + delta. */
export function priceVerdict(intel: PricingIntel): string {
  const pct = Math.abs(Math.round(intel.vsMedianPct));
  switch (intel.position) {
    case 'below':
      return `Asking sits ${pct}% below the comps median${intel.compCount < 4 ? ' — thin data, verify why' : ' — potentially good value, verify condition and title'}`;
    case 'within':
      return `Asking sits within the comps band (median ±${Math.round((intel.highKes - intel.medianKes) / intel.medianKes * 100)}%)`;
    case 'above':
      return `Asking sits ${pct}% above the comps median — negotiate with evidence or verify what the premium buys`;
  }
}
