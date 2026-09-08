import { describe, expect, it } from 'vitest';

import type { Property } from '@/data/properties';
import type { Viewing } from '@/lib/proStore';
import { buildCma, findCmaComps, generateListingCopy, upcomingViewings } from '@/lib/proStore';

const mkProp = (over: Partial<Property>): Property => ({
  id: 'T-000',
  title: 'Test Listing',
  type: 'apartment',
  purpose: ['buy'],
  area: 'Testville',
  county: 'Nairobi',
  price: 10_000_000,
  bedrooms: 3,
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

describe('buildCma', () => {
  it('computes the median band at ±15% and per-sqm from sized comps', () => {
    const comps = [
      mkProp({ id: 'A', price: 10_000_000, sizeSqm: 100 }),
      mkProp({ id: 'B', price: 12_000_000, sizeSqm: 120 }),
      mkProp({ id: 'C', price: 14_000_000, sizeSqm: 140 }),
    ];
    const r = buildCma(comps, { area: 'Testville', type: 'apartment', beds: 3, sizeSqM: 120 });
    expect(r.compCount).toBe(3);
    expect(r.compIds).toEqual(['A', 'B', 'C']);
    expect(r.medianKes).toBe(12_000_000);
    expect(r.lowKes).toBe(10_200_000);
    expect(r.highKes).toBe(13_800_000);
    expect(r.pricePerSqMKes).toBe(100_000);
  });

  it('returns zeros on the empty-comps guard', () => {
    const r = buildCma([], { area: 'Nowhere', type: 'villa' });
    expect(r.compCount).toBe(0);
    expect(r.compIds).toEqual([]);
    expect(r.lowKes).toBe(0);
    expect(r.medianKes).toBe(0);
    expect(r.highKes).toBe(0);
    expect(r.pricePerSqMKes).toBeUndefined();
  });

  it('keeps comps within ±1 bedroom of the subject', () => {
    const comps = [
      mkProp({ id: 'B2', bedrooms: 2, price: 8_000_000 }),
      mkProp({ id: 'B3', bedrooms: 3, price: 10_000_000 }),
      mkProp({ id: 'B4', bedrooms: 4, price: 12_000_000 }),
      mkProp({ id: 'B6', bedrooms: 6, price: 20_000_000 }),
    ];
    const r = buildCma(comps, { area: 'Testville', type: 'apartment', beds: 3 });
    expect(r.compIds).toEqual(['B2', 'B3', 'B4']);
    expect(r.medianKes).toBe(10_000_000);
    expect(r.highKes).toBe(11_500_000);
  });

  it('never drops bedroom-less comps (land/commercial) even when beds are given', () => {
    const comps = [
      mkProp({ id: 'L1', type: 'land', bedrooms: undefined, price: 4_000_000, sizeSqm: 4046 }),
    ];
    const r = buildCma(comps, { area: 'Testville', type: 'land', beds: 3 });
    expect(r.compCount).toBe(1);
    expect(r.medianKes).toBe(4_000_000);
  });

  it('excludes rental-priced and price-on-application comps from the band', () => {
    const comps = [
      mkProp({ id: 'R', price: 120_000 }), // monthly rental pricing
      mkProp({ id: 'P', price: 0, priceOnApplication: true }),
      mkProp({ id: 'S', price: 10_000_000 }),
    ];
    const r = buildCma(comps, { area: 'Testville', type: 'apartment' });
    expect(r.compIds).toEqual(['S']);
    expect(r.medianKes).toBe(10_000_000);
  });
});

describe('findCmaComps', () => {
  it('matches area + type, sale-priced only, most trusted first', () => {
    const inventory = [
      mkProp({ id: 'GOOD', trustScore: 70 }),
      mkProp({ id: 'BEST', trustScore: 90 }),
      mkProp({ id: 'WRONG-AREA', area: 'Elsewhere' }),
      mkProp({ id: 'WRONG-TYPE', type: 'villa' }),
      mkProp({ id: 'RENTAL', price: 90_000 }),
    ];
    const comps = findCmaComps(inventory, { area: 'Testville', type: 'apartment' });
    expect(comps.map((p) => p.id)).toEqual(['BEST', 'GOOD']);
  });
});

describe('generateListingCopy', () => {
  const baseInputs = {
    type: 'apartment',
    area: 'Kilimani',
    beds: 3,
    features: ['parking', 'gated', 'borehole'],
    tone: 'professional' as const,
  };

  it('is deterministic — identical inputs produce identical output', () => {
    const a = generateListingCopy(baseInputs);
    const b = generateListingCopy(baseInputs);
    expect(a).toEqual(b);
    expect(a.title).toBe('Move-In-Ready 3-Bedroom Apartment in Kilimani');
  });

  it('varies opening, closing and title by tone', () => {
    const tones = ['professional', 'warm', 'luxury', 'diaspora'] as const;
    const copies = tones.map((tone) => generateListingCopy({ ...baseInputs, tone }));
    const paragraphs = copies.map((c) => c.description.split('\n\n'));
    // openings and closings differ across all four tones
    expect(new Set(paragraphs.map((p) => p[0])).size).toBe(4);
    expect(new Set(paragraphs.map((p) => p[2])).size).toBe(4);
    expect(new Set(copies.map((c) => c.title)).size).toBe(4);
    // tone-specific CTA lands in the closing paragraph
    expect(paragraphs[0][2]).toContain('Viewings are by appointment');
    expect(paragraphs[3][2]).toContain('video viewing');
  });

  it('covers every selected feature in the body', () => {
    const copy = generateListingCopy({
      ...baseInputs,
      features: [
        'backup power',
        'borehole',
        'gym',
        'pool',
        'garden',
        'DSQ',
        'solar',
        'gated',
        'parking',
      ],
    });
    const body = copy.description.split('\n\n')[1] ?? '';
    for (const marker of [
      'Backup power',
      'borehole',
      'gym',
      'swimming pool',
      'garden',
      '(DSQ)',
      'Solar',
      'Gated',
      'parking',
    ]) {
      expect(body).toContain(marker);
    }
  });

  it('handles unknown features with a neutral deterministic phrase', () => {
    const copy = generateListingCopy({ ...baseInputs, features: ['helipad'] });
    expect(copy.description).toContain('Helipad included as declared by the seller');
  });

  it('always returns exactly four highlights, beds first', () => {
    const withFeatures = generateListingCopy(baseInputs);
    expect(withFeatures.highlights).toHaveLength(4);
    expect(withFeatures.highlights[0]).toBe('3 bedrooms');

    const bare = generateListingCopy({ ...baseInputs, features: [] });
    expect(bare.highlights).toHaveLength(4);
    expect(bare.highlights).toContain('Apartment in Kilimani');
    expect(bare.highlights).toContain('Viewings by appointment');
  });
});

describe('upcomingViewings', () => {
  const now = new Date('2026-09-01T12:00:00Z');
  const mk = (id: string, iso: string, status: Viewing['status'] = 'scheduled'): Viewing => ({
    id,
    propertyId: 'KJA-001',
    leadName: 'Test Lead',
    scheduledFor: iso,
    status,
  });

  it('keeps only future scheduled viewings, soonest first', () => {
    const viewings = [
      mk('past', '2026-08-31T09:00:00Z'),
      mk('cancelled', '2026-09-05T09:00:00Z', 'cancelled'),
      mk('done', '2026-09-04T09:00:00Z', 'completed'),
      mk('week', '2026-09-08T09:00:00Z'),
      mk('tomorrow', '2026-09-02T09:00:00Z'),
    ];
    expect(upcomingViewings(viewings, now).map((v) => v.id)).toEqual(['tomorrow', 'week']);
  });

  it('includes a viewing scheduled exactly now, and handles empty input', () => {
    const viewings = [mk('now', '2026-09-01T12:00:00Z')];
    expect(upcomingViewings(viewings, now).map((v) => v.id)).toEqual(['now']);
    expect(upcomingViewings([], now)).toEqual([]);
  });
});
