/**
 * Valuation Desk — unit tests for the comparables engine the claims
 * register's 'valuation-desk' claim cites. The register previously said
 * "covered by unit tests" while no test file imported this module.
 */
import { describe, expect, it } from 'vitest';

import type { Property } from '@/data/properties';
import {
  computeIndicativeValuation,
  CONDITION_ADJUSTMENTS,
  SQM_PER_ACRE,
  type ValuationInputs,
} from '@/lib/valuationStore';

const prop = (id: string, overrides: Partial<Property> = {}): Property => ({
  id,
  title: `Listing ${id}`,
  type: 'apartment',
  purpose: ['buy'],
  area: 'Kilimani',
  county: 'Nairobi',
  price: 10_000_000,
  sizeSqm: 100,
  amenities: [],
  images: [],
  description: '',
  agency: 'Test Agency',
  agent: { name: 'Agent', phone: '' },
  trustScore: 80,
  verification: {
    titleCheck: 'verified',
    ardhisasaMatch: true,
    photosVerified: true,
    duplicateCheck: 'clean',
    listingVelocity: 'normal',
    lastChecked: '2026-09-01',
  },
  trustSignals: [],
  availability: 'available',
  listedAt: '2026-08-01',
  views: 0,
  highlights: [],
  ...overrides,
});

const inputs = (overrides: Partial<ValuationInputs> = {}): ValuationInputs => ({
  area: 'Kilimani',
  type: 'apartment',
  condition: 'good',
  ...overrides,
});

describe('computeIndicativeValuation — honesty gates', () => {
  it('returns null with zero comps (never invents a number)', () => {
    expect(computeIndicativeValuation(inputs(), [prop('x', { area: 'Karen' })])).toBeNull();
    expect(computeIndicativeValuation(inputs(), [])).toBeNull();
  });

  it('never uses rentals or price-on-application listings as comps', () => {
    const inventory = [
      prop('rental', { purpose: ['rent'], price: 120_000 }),
      prop('poa', { priceOnApplication: true, price: 0 }),
    ];
    expect(computeIndicativeValuation(inputs(), inventory)).toBeNull();
  });

  it('land valuation requires positive acreage', () => {
    const land = [prop('l1', { type: 'land', price: 40_000_000, sizeSqm: SQM_PER_ACRE * 2 })];
    expect(computeIndicativeValuation(inputs({ type: 'land', acres: 0 }), land)).toBeNull();
    const result = computeIndicativeValuation(inputs({ type: 'land', acres: 1 }), land);
    expect(result).not.toBeNull();
    expect(result!.basis).toBe('acreage');
    // 40M over 2 acres → 20M per acre
    expect(result!.perAcreMedianKes).toBe(20_000_000);
    expect(result!.medianKes).toBe(20_000_000);
  });
});

describe('computeIndicativeValuation — bases', () => {
  it('blends 60/40 price median with per-sqm when subject size exists', () => {
    const inventory = [
      prop('a', { price: 10_000_000, sizeSqm: 100 }), // 100k/m²
      prop('b', { price: 12_000_000, sizeSqm: 100 }), // 120k/m²
      prop('c', { price: 14_000_000, sizeSqm: 100 }), // 140k/m² → psqm median 120k
    ];
    // price median 12M; psqm basis 120k × 120m² = 14.4M
    const result = computeIndicativeValuation(
      inputs({ sizeSqM: 120 }),
      inventory
    )!;
    expect(result.basis).toBe('blend');
    expect(result.psqmMedianKes).toBe(120_000);
    expect(result.unadjustedKes).toBe(0.6 * 12_000_000 + 0.4 * 14_400_000);
  });

  it('falls back to the raw price median without a subject size', () => {
    const inventory = [prop('a', { price: 9_000_000 }), prop('b', { price: 10_000_000, sizeSqm: 0 })];
    const result = computeIndicativeValuation(inputs(), inventory)!;
    expect(result.basis).toBe('price');
    expect(result.medianKes).toBe(9_500_000);
  });
});

describe('computeIndicativeValuation — condition adjustments', () => {
  const inventory = [
    prop('a', { price: 10_000_000, sizeSqm: 0 }),
    prop('b', { price: 10_000_000, sizeSqm: 0 }),
  ];

  it('applies +5% for new, 0% for good, −12% for needs-work', () => {
    const base = computeIndicativeValuation(inputs({ condition: 'good' }), inventory)!;
    const asNew = computeIndicativeValuation(inputs({ condition: 'new' }), inventory)!;
    const needsWork = computeIndicativeValuation(inputs({ condition: 'needs-work' }), inventory)!;
    expect(asNew.conditionAdjustmentPct).toBe(CONDITION_ADJUSTMENTS.new);
    expect(base.medianKes).toBe(10_000_000); // good = baseline, already rounded to 10k
    expect(asNew.medianKes).toBe(10_500_000); // +5% on the 10M comp median
    expect(base.conditionAdjustmentPct).toBe(0);
    expect(needsWork.conditionAdjustmentPct).toBe(CONDITION_ADJUSTMENTS['needs-work']);
    expect(needsWork.medianKes).toBe(8_800_000); // −12% on the 10M comp median
  });
});

describe('computeIndicativeValuation — confidence scales with comp count', () => {
  it('low < 4 comps, medium ≤ 8, high beyond', () => {
    const mk = (n: number) =>
      Array.from({ length: n }, (_, i) => prop(`c${i}`, { price: 10_000_000, sizeSqm: 0 }));
    expect(computeIndicativeValuation(inputs(), mk(3))!.confidence).toBe('low');
    expect(computeIndicativeValuation(inputs(), mk(3))!.bandPct).toBe(0.18);
    expect(computeIndicativeValuation(inputs(), mk(6))!.confidence).toBe('medium');
    expect(computeIndicativeValuation(inputs(), mk(6))!.bandPct).toBe(0.13);
    expect(computeIndicativeValuation(inputs(), mk(10))!.confidence).toBe('high');
    expect(computeIndicativeValuation(inputs(), mk(10))!.bandPct).toBe(0.10);
  });

  it('bands bracket the median symmetrically', () => {
    const inventory = Array.from({ length: 6 }, (_, i) =>
      prop(`c${i}`, { price: 10_000_000, sizeSqm: 0 })
    );
    const r = computeIndicativeValuation(inputs(), inventory)!;
    expect(r.lowKes).toBeLessThan(r.medianKes);
    expect(r.highKes).toBeGreaterThan(r.medianKes);
    expect(r.compCount).toBe(6);
  });
});
