import { describe, expect, it } from 'vitest';

import { PROPERTIES } from '@/data/properties';
import { investmentScore } from '@/lib/investmentScore';
import { matchesSearch, type SavedSearch } from '@/lib/searchStore';

describe('matchesSearch parity with marketplace filters', () => {
  it('matches by free-text query across title/area/county/id/type/agency', () => {
    const f: SavedSearch['filters'] = { q: 'kilimani' };
    const hits = PROPERTIES.filter((x) => matchesSearch(x, f));
    expect(hits.length).toBeGreaterThan(0);
    expect(
      hits.every((h) =>
        `${h.title} ${h.area} ${h.county} ${h.id} ${h.type} ${h.agency}`
          .toLowerCase()
          .includes('kilimani')
      )
    ).toBe(true);
  });

  it('applies the rent/buy price multiplier split (×1000 vs ×1M)', () => {
    const rental = PROPERTIES.find((x) => x.price < 500_000);
    if (!rental) throw new Error('expected a seeded rental-priced property');
    const rentSearch: SavedSearch['filters'] = { maxPrice: Math.ceil(rental.price / 1000) };
    expect(matchesSearch(rental, rentSearch)).toBe(true);

    const sale = PROPERTIES.find((x) => x.price > 1_000_000);
    if (!sale) throw new Error('expected a seeded sale-priced property');
    const saleSearch: SavedSearch['filters'] = { maxPrice: Math.ceil(sale.price / 1_000_000) };
    expect(matchesSearch(sale, saleSearch)).toBe(true);
    const tightSale: SavedSearch['filters'] = { maxPrice: Math.floor(sale.price / 1_000_000) };
    expect(matchesSearch(sale, tightSale)).toBe(false);
  });

  it('filters type and bedrooms', () => {
    const f: SavedSearch['filters'] = { type: 'villa', minBeds: 4 };
    const hits = PROPERTIES.filter((x) => matchesSearch(x, f));
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => h.type === 'villa' && (h.bedrooms ?? 0) >= 4)).toBe(true);
  });

  it('purpose=rent only matches rent-listed properties', () => {
    const f: SavedSearch['filters'] = { purpose: 'rent' };
    expect(
      PROPERTIES.filter((x) => matchesSearch(x, f)).every((h) => h.purpose.includes('rent'))
    ).toBe(true);
  });
});

describe('investmentScore engine', () => {
  it('scores every seeded property within 0–10 with 7 labelled factors', () => {
    for (const prop of PROPERTIES) {
      const s = investmentScore(prop);
      expect(s.overall).toBeGreaterThanOrEqual(0);
      expect(s.overall).toBeLessThanOrEqual(10);
      expect(s.factors).toHaveLength(7);
      expect(['Exceptional', 'Strong', 'Solid', 'Moderate', 'Speculative']).toContain(s.band);
      for (const f of s.factors) {
        expect(['FACT', 'ESTIMATE', 'ASSUMPTION']).toContain(f.basis);
        expect(f.score).toBeGreaterThanOrEqual(0);
        expect(f.score).toBeLessThanOrEqual(10);
      }
    }
  });

  it('is deterministic per property', () => {
    const a = PROPERTIES[0];
    expect(investmentScore(a).overall).toBe(investmentScore(a).overall);
  });
});
