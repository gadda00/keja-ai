import { describe, expect, it } from 'vitest';

import type { Property } from '@/data/properties';
import type { ValuationInputs } from '@/lib/valuationStore';
import { computeIndicativeValuation } from '@/lib/valuationStore';

const mkProp = (over: Partial<Property>): Property => ({
  id: 'T-000',
  title: 'Test Listing',
  type: 'apartment',
  purpose: ['buy'],
  area: 'Testville',
  county: 'Nairobi',
  price: 10_000_000,
  sizeSqm: 100,
  amenities: [],
  images: [],
  description: 'test listing',
  agency: 'Test Agency',
  agent: { name: 'Agent', phone: '+254 700 000 000' },
  trustScore: 80,
  verification: {
    titleCheck: 'verified',
    ardhisasaMatch: true,
    photosVerified: true,
    duplicateCheck: 'clean',
    listingVelocity: 'normal',
    lastChecked: '2026-01-01',
  },
  trustSignals: [],
  availability: 'available',
  listedAt: '2026-01-01',
  views: 0,
  highlights: [],
  ...over,
});

const subject = (over: Partial<ValuationInputs> = {}): ValuationInputs => ({
  area: 'Testville',
  type: 'apartment',
  sizeSqM: 100,
  condition: 'good',
  ...over,
});

describe('computeIndicativeValuation — band scaling by comp count', () => {
  const comps = (n: number): Property[] =>
    Array.from({ length: n }, (_, i) => mkProp({ id: `C${i}`, price: 10_000_000, sizeSqm: 100 }));

  it('under 4 comps: ±18% band, low confidence', () => {
    const r = computeIndicativeValuation(subject(), comps(3));
    if (!r) throw new Error('expected a result for 3 comps');
    expect(r.compCount).toBe(3);
    expect(r.confidence).toBe('low');
    expect(r.bandPct).toBe(0.18);
    expect(r.medianKes).toBe(10_000_000);
    expect(r.lowKes).toBe(8_200_000);
    expect(r.highKes).toBe(11_800_000);
  });

  it('4–8 comps: ±13% band, medium confidence', () => {
    const r = computeIndicativeValuation(subject(), comps(5));
    if (!r) throw new Error('expected a result for 5 comps');
    expect(r.confidence).toBe('medium');
    expect(r.bandPct).toBe(0.13);
    expect(r.lowKes).toBe(8_700_000);
    expect(r.highKes).toBe(11_300_000);
  });

  it('more than 8 comps: ±10% band, high confidence', () => {
    const r = computeIndicativeValuation(subject(), comps(9));
    if (!r) throw new Error('expected a result for 9 comps');
    expect(r.confidence).toBe('high');
    expect(r.bandPct).toBe(0.1);
    expect(r.lowKes).toBe(9_000_000);
    expect(r.highKes).toBe(11_000_000);
  });
});

describe('computeIndicativeValuation — condition adjustments', () => {
  const comps = (n: number): Property[] =>
    Array.from({ length: n }, (_, i) => mkProp({ id: `C${i}`, price: 10_000_000, sizeSqm: 100 }));

  it('applies +5% for new and −12% for needs-work around the same base', () => {
    const good = computeIndicativeValuation(subject({ condition: 'good' }), comps(5));
    const fresh = computeIndicativeValuation(subject({ condition: 'new' }), comps(5));
    const worn = computeIndicativeValuation(subject({ condition: 'needs-work' }), comps(5));
    if (!good || !fresh || !worn) throw new Error('expected results for all conditions');
    expect(good.medianKes).toBe(10_000_000);
    expect(good.conditionDeltaKes).toBe(0);
    expect(fresh.conditionAdjustmentPct).toBe(5);
    expect(fresh.conditionDeltaKes).toBe(500_000);
    expect(fresh.medianKes).toBe(10_500_000);
    expect(worn.conditionAdjustmentPct).toBe(-12);
    expect(worn.conditionDeltaKes).toBe(-1_200_000);
    expect(worn.medianKes).toBe(8_800_000);
  });
});

describe('computeIndicativeValuation — price / per-sqm blend', () => {
  it('blends 60% price median with 40% per-sqm estimate when both exist', () => {
    const comps = [
      mkProp({ id: 'A', price: 10_000_000, sizeSqm: 200 }),
      mkProp({ id: 'B', price: 10_000_000, sizeSqm: 100 }),
      mkProp({ id: 'C', price: 10_000_000, sizeSqm: 100 }),
    ];
    // price median 10M · per-sqm median 100k → subject 150 sqm ⇒ 15M psqm basis
    const r = computeIndicativeValuation(subject({ sizeSqM: 150 }), comps);
    if (!r) throw new Error('expected a blended result');
    expect(r.basis).toBe('blend');
    expect(r.priceMedianKes).toBe(10_000_000);
    expect(r.psqmMedianKes).toBe(100_000);
    expect(r.unadjustedKes).toBe(12_000_000); // 0.6 × 10M + 0.4 × 15M
    expect(r.medianKes).toBe(12_000_000);
    expect(r.lowKes).toBe(9_840_000); // 3 comps ⇒ ±18%
    expect(r.highKes).toBe(14_160_000);
  });

  it('falls back to the price median when the subject has no size', () => {
    const comps = [mkProp({ id: 'A' }), mkProp({ id: 'B' }), mkProp({ id: 'C' })];
    const r = computeIndicativeValuation(subject({ sizeSqM: undefined }), comps);
    if (!r) throw new Error('expected a price-basis result');
    expect(r.basis).toBe('price');
    expect(r.medianKes).toBe(10_000_000);
    expect(r.psqmMedianKes).toBeUndefined();
  });
});

describe('computeIndicativeValuation — empty comps guard', () => {
  it('returns null when no comps match the area', () => {
    const r = computeIndicativeValuation(subject({ area: 'Elsewhere' }), [
      mkProp({ area: 'Testville' }),
    ]);
    expect(r).toBeNull();
  });

  it('returns null when the only comps are rentals or price-on-application', () => {
    const inventory = [
      mkProp({ id: 'R', price: 85_000 }),
      mkProp({ id: 'P', price: 0, priceOnApplication: true }),
    ];
    expect(computeIndicativeValuation(subject(), inventory)).toBeNull();
  });

  it('rental and POA listings never pollute an otherwise valid comp pool', () => {
    const inventory = [mkProp({ id: 'R', price: 85_000 }), mkProp({ id: 'S', price: 10_000_000 })];
    const r = computeIndicativeValuation(subject(), inventory);
    if (!r) throw new Error('expected a result from the single sale comp');
    expect(r.compCount).toBe(1);
    expect(r.priceMedianKes).toBe(10_000_000);
  });
});

describe('computeIndicativeValuation — land price-per-acre path', () => {
  const landComps = (): Property[] => [
    mkProp({ id: 'L1', type: 'land', price: 4_000_000, sizeSqm: 4046 }),
    mkProp({ id: 'L2', type: 'land', price: 8_000_000, sizeSqm: 8094 }),
  ];

  it('values land on a per-acre basis with acres required', () => {
    const r = computeIndicativeValuation(
      subject({ type: 'land', sizeSqM: undefined, acres: 3 }),
      landComps()
    );
    if (!r) throw new Error('expected a land result');
    expect(r.basis).toBe('acreage');
    expect(r.compCount).toBe(2);
    expect(r.confidence).toBe('low');
    expect(r.perAcreMedianKes).toBeCloseTo(4_000_000, -4);
    expect(r.unadjustedKes).toBe(12_000_000); // ~4.0M/acre × 3 acres
    expect(r.medianKes).toBe(12_000_000);
    expect(r.lowKes).toBe(9_840_000);
    expect(r.highKes).toBe(14_160_000);
  });

  it('applies condition adjustments on the acreage basis too', () => {
    const r = computeIndicativeValuation(
      subject({ type: 'land', sizeSqM: undefined, acres: 3, condition: 'new' }),
      landComps()
    );
    if (!r) throw new Error('expected a land result');
    expect(r.medianKes).toBe(12_600_000); // 12M × 1.05
  });

  it('returns null for land without acreage or without sized comps', () => {
    expect(
      computeIndicativeValuation(
        subject({ type: 'land', sizeSqM: undefined, acres: undefined }),
        landComps()
      )
    ).toBeNull();
    expect(
      computeIndicativeValuation(
        subject({ type: 'land', sizeSqM: undefined, acres: 0 }),
        landComps()
      )
    ).toBeNull();
    const unsized = [mkProp({ id: 'L0', type: 'land', price: 4_000_000, sizeSqm: 0 })];
    expect(
      computeIndicativeValuation(subject({ type: 'land', sizeSqM: undefined, acres: 2 }), unsized)
    ).toBeNull();
  });
});
