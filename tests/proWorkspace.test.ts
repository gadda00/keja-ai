/**
 * KEJA PRO — unit tests for the pure math the claims register's 'keja-pro'
 * claim cites (CMA band math, deterministic listing copy, viewing filters).
 * The register previously said "covered by unit tests" while no test file
 * imported this module.
 */
import { describe, expect, it } from 'vitest';

import type { Property } from '@/data/properties';
import { buildCma, findCmaComps, generateListingCopy, upcomingViewings, type Viewing } from '@/lib/proStore';

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

describe('findCmaComps', () => {
  it('matches area + type and ranks by trust first', () => {
    const inventory = [
      prop('low-trust', { trustScore: 70 }),
      prop('high-trust', { trustScore: 92 }),
      prop('other-area', { area: 'Westlands' }),
      prop('other-type', { type: 'villa' }),
    ];
    const comps = findCmaComps(inventory, { area: 'Kilimani', type: 'apartment' });
    expect(comps.map((c) => c.id)).toEqual(['high-trust', 'low-trust']);
  });

  it('never admits rentals or price-on-application stock', () => {
    const inventory = [
      prop('rental', { purpose: ['rent'], price: 85_000 }), // monthly rent = rental price band
      prop('poa', { priceOnApplication: true, price: 0 }),
      prop('sale', { price: 12_000_000 }),
    ];
    const comps = findCmaComps(inventory, { area: 'Kilimani', type: 'apartment' });
    expect(comps.map((c) => c.id)).toEqual(['sale']);
  });
});

describe('buildCma', () => {
  it('returns an empty computation with zero comps', () => {
    const cma = buildCma([], { area: 'Kilimani', type: 'apartment' });
    expect(cma).toEqual({ compCount: 0, compIds: [], lowKes: 0, medianKes: 0, highKes: 0 });
  });

  it('bands the comp price median at ±15%, rounded to KES 1,000', () => {
    const comps = [
      prop('a', { price: 9_000_000 }),
      prop('b', { price: 10_000_000 }),
      prop('c', { price: 11_000_000 }),
    ];
    const cma = buildCma(comps, { area: 'Kilimani', type: 'apartment' });
    expect(cma.compCount).toBe(3);
    expect(cma.medianKes).toBe(10_000_000);
    expect(cma.lowKes).toBe(8_500_000);
    expect(cma.highKes).toBe(11_500_000);
  });

  it('keeps comps within ±1 bedroom of the subject', () => {
    const comps = [
      prop('same', { price: 10_000_000, bedrooms: 3 }),
      prop('close', { price: 12_000_000, bedrooms: 4 }),
      prop('far', { price: 20_000_000, bedrooms: 6 }),
    ];
    const cma = buildCma(comps, { area: 'Kilimani', type: 'apartment', beds: 3 });
    expect(cma.compCount).toBe(2);
    expect(cma.compIds).not.toContain('far');
  });

  it('never drops land/commercial comps for lacking bedrooms', () => {
    const comps = [prop('land', { type: 'land', price: 20_000_000, bedrooms: undefined })];
    const cma = buildCma(comps, { area: 'Kilimani', type: 'land', beds: 3 });
    expect(cma.compCount).toBe(1);
  });

  it('computes a per-sqm median from sized comps only', () => {
    const comps = [
      prop('a', { price: 10_000_000, sizeSqm: 100 }), // 100k/m²
      prop('b', { price: 12_000_000, sizeSqm: 100 }), // 120k/m²
      prop('c', { price: 8_000_000, sizeSqm: 0 }), // no size — excluded from psqm
    ];
    const cma = buildCma(comps, { area: 'Kilimani', type: 'apartment' });
    expect(cma.pricePerSqMKes).toBe(110_000);
  });
});

describe('generateListingCopy', () => {
  it('is deterministic — same inputs, identical copy', () => {
    const inputs = {
      type: 'apartment',
      area: 'Kilimani',
      beds: 3,
      features: ['backup power', 'garden'],
      tone: 'professional' as const,
    };
    const a = generateListingCopy(inputs);
    const b = generateListingCopy(inputs);
    expect(a).toEqual(b);
  });

  it('builds the title from the tone prefix and subject', () => {
    const copy = generateListingCopy({
      type: 'apartment',
      area: 'Kilimani',
      beds: 3,
      features: [],
      tone: 'warm',
    });
    expect(copy.title).toBe('Family-Ready 3-Bedroom Apartment in Kilimani');
  });

  it('returns exactly four highlights', () => {
    const copy = generateListingCopy({
      type: 'villa',
      area: 'Karen',
      beds: 5,
      features: ['pool', 'garden', 'gated'],
      tone: 'luxury',
    });
    expect(copy.highlights).toHaveLength(4);
  });

  it('mentions every selected feature in the body', () => {
    const copy = generateListingCopy({
      type: 'townhouse',
      area: 'Kileleshwa',
      beds: 4,
      features: ['solar', 'borehole', 'DSQ'],
      tone: 'diaspora',
    });
    expect(copy.description.toLowerCase()).toContain('solar');
    expect(copy.description.toLowerCase()).toContain('borehole');
    expect(copy.description.toLowerCase()).toContain('dsq');
  });
});

describe('upcomingViewings', () => {
  const now = new Date('2026-09-13T10:00:00Z');
  const viewing = (id: string, scheduledFor: string, status: Viewing['status'] = 'scheduled'): Viewing => ({
    id,
    propertyId: 'KJA-001',
    leadName: 'Lead',
    scheduledFor,
    status,
  });

  it('keeps only future scheduled viewings, soonest first', () => {
    const list = [
      viewing('past', '2026-09-01T10:00:00Z'),
      viewing('cancelled', '2026-09-20T10:00:00Z', 'cancelled'),
      viewing('later', '2026-09-25T10:00:00Z'),
      viewing('sooner', '2026-09-15T10:00:00Z'),
    ];
    const out = upcomingViewings(list, now);
    expect(out.map((v) => v.id)).toEqual(['sooner', 'later']);
  });

  it('includes a viewing scheduled exactly now', () => {
    const list = [viewing('now', '2026-09-13T10:00:00Z')];
    expect(upcomingViewings(list, now)).toHaveLength(1);
  });
});
