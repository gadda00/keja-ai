/**
 * Free-query parser (2026-09-12).
 *
 * Regression origin: the hero search invites “2BR Kilimani under 15M”, but
 * the results page matched it as a literal substring — 0 results while the
 * qualifying KJA-A0162 existed. These tests pin the parser + matcher,
 * including a run against the REAL marketplace inventory (authored + auto).
 */
import { describe, expect, it } from 'vitest';

import { matchesFreeQuery, parseFreeQuery } from '@/lib/queryParser';
import { PROPERTIES } from '@/data/properties';
import { AUTO_PROPERTIES } from '@/lib/autoListings';

const AREAS = [
  ...new Set([...PROPERTIES, ...AUTO_PROPERTIES].map((p) => p.area)),
];

describe('parseFreeQuery — extraction', () => {
  it('parses the hero example into structured intent', () => {
    const pq = parseFreeQuery('2BR Kilimani under 15M', AREAS);
    expect(pq.minBeds).toBe(2);
    expect(pq.area).toBe('Kilimani');
    expect(pq.maxPriceKes).toBe(15_000_000);
    expect(pq.tokens).toEqual([]);
  });

  it.each([
    ['2br kilimani under 15m', 15_000_000],
    ['two bedroom kilimani below 15 million', 15_000_000],
    ['apartment under 150k', 150_000],
    ['3BR under 12.5M for sale', 12_500_000],
    ['studio less than 90k', 90_000],
    ['house under 15,000,000', 15_000_000],
    ['max 25m ksh', 25_000_000],
  ])('parses “%s” price ceiling', (query, expected) => {
    expect(parseFreeQuery(query, AREAS).maxPriceKes).toBe(expected);
  });

  it.each([
    ['2BR', 2],
    ['2 bed', 2],
    ['2-bedroom', 2],
    ['two bedrooms', 2],
    ['three BR', 3],
  ])('parses “%s” as minBeds', (fragment, expected) => {
    expect(parseFreeQuery(fragment, AREAS).minBeds).toBe(expected);
  });

  it('parses purpose, type and area together', () => {
    const pq = parseFreeQuery('apartment for rent in westlands', AREAS);
    expect(pq.purpose).toBe('rent');
    expect(pq.type).toBe('apartment');
    expect(pq.area).toBe('Westlands');
    expect(pq.tokens).toEqual([]);
  });

  it('keeps unmatched text as AND tokens', () => {
    const pq = parseFreeQuery('furnished 2BR kilimani', AREAS);
    expect(pq.minBeds).toBe(2);
    expect(pq.area).toBe('Kilimani');
    expect(pq.tokens).toEqual(['furnished']);
  });

  it('bare small numbers read as rent shorthand (thousands)', () => {
    expect(parseFreeQuery('under 150', AREAS).maxPriceKes).toBe(150_000);
  });

  it('bare numbers ≥10k read as absolute KES', () => {
    expect(parseFreeQuery('under 8000000', AREAS).maxPriceKes).toBe(8_000_000);
  });

  it('degrades to plain tokens when nothing parses', () => {
    const pq = parseFreeQuery('garden view', AREAS);
    expect(pq.tokens).toEqual(['garden', 'view']);
  });

  it('empty query parses to nothing', () => {
    expect(parseFreeQuery('   ', AREAS)).toEqual({ raw: '', tokens: [] });
  });
});

describe('matchesFreeQuery — semantics', () => {
  const listing = {
    title: 'Elegant 2-Bedroom Residence in Kilimani',
    area: 'Kilimani',
    county: 'Nairobi',
    type: 'apartment',
    description: 'A bright apartment near Yaya Centre',
    price: 10_100_000,
    purpose: ['buy'],
    bedrooms: 2,
  };

  it('matches the hero example (the original regression)', () => {
    const pq = parseFreeQuery('2BR Kilimani under 15M', AREAS);
    expect(matchesFreeQuery(listing, pq)).toBe(true);
  });

  it('rejects on price, beds, area, purpose and type', () => {
    const base = parseFreeQuery('2BR Kilimani under 15M', AREAS);
    expect(matchesFreeQuery({ ...listing, price: 16_000_000 }, base)).toBe(false);
    expect(matchesFreeQuery({ ...listing, bedrooms: 1 }, base)).toBe(false);
    expect(matchesFreeQuery({ ...listing, area: 'Karen' }, base)).toBe(false);

    const buyPq = parseFreeQuery('2BR Kilimani for sale under 15M', AREAS);
    expect(buyPq.purpose).toBe('buy');
    expect(matchesFreeQuery({ ...listing, purpose: ['rent'] }, buyPq)).toBe(false);

    const housePq = parseFreeQuery('house in Kilimani', AREAS);
    expect(housePq.type).toBe('house');
    expect(matchesFreeQuery(listing, housePq)).toBe(false);
  });

  it('requires every remaining token to appear (AND semantics)', () => {
    const pq = parseFreeQuery('furnished kilimani garden', AREAS);
    expect(matchesFreeQuery(listing, pq)).toBe(false); // no “garden”, no “furnished”
    expect(
      matchesFreeQuery({ ...listing, description: 'Fully furnished with garden' }, pq),
    ).toBe(true);
  });

  it('price-on-application never satisfies a ceiling', () => {
    const pq = parseFreeQuery('kilimani under 15M', AREAS);
    expect(matchesFreeQuery({ ...listing, priceOnApplication: true }, pq)).toBe(false);
  });
});

describe('parseFreeQuery — real inventory regression', () => {
  it('the hero example finds at least one real Kilimani 2BR ≤ 15M', () => {
    const pq = parseFreeQuery('2BR Kilimani under 15M', AREAS);
    const hits = [...PROPERTIES, ...AUTO_PROPERTIES].filter((p) =>
      matchesFreeQuery(
        {
          title: p.title,
          area: p.area,
          county: p.county,
          type: p.type,
          description: p.description,
          price: p.price,
          purpose: p.purpose,
          bedrooms: p.bedrooms,
          priceOnApplication: p.priceOnApplication,
        },
        pq,
      ),
    );
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((p) => p.id === 'KJA-A0162')).toBe(true);
  });

  it('a nonsense query returns zero hits without crashing', () => {
    const pq = parseFreeQuery('zzzqqq wubble', AREAS);
    const hits = [...PROPERTIES, ...AUTO_PROPERTIES].filter((p) =>
      matchesFreeQuery(
        {
          title: p.title,
          area: p.area,
          county: p.county,
          type: p.type,
          description: p.description,
          price: p.price,
          purpose: p.purpose,
          bedrooms: p.bedrooms,
          priceOnApplication: p.priceOnApplication,
        },
        pq,
      ),
    );
    expect(hits).toEqual([]);
  });
});
