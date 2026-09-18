/**
 * Auto-Pilot hero-promise protection (wave-16).
 *
 * Incident (2026-09-18 14:25 UTC): the ingest's cap-60 eviction culled
 * KJA-A0162 — the only listing satisfying the hero's advertised example
 * ("2BR Kilimani under 15M") — the verify job caught it AFTER the push had
 * already deployed via the Vercel Git integration, and the guarded revert
 * healed production ~2 minutes later. Bad data reached the live site.
 *
 * The fix under test: publish.mjs enforces the hero promise at MERGE time
 * (`enforceHeroPromise`) — if cap eviction would leave zero qualifying
 * listings, the newest evicted qualifier is restored in place of the oldest
 * kept non-qualifier. These tests pin the policy so the promise can never
 * silently regress to "the revert job will catch it".
 */
import { describe, expect, it } from 'vitest';

import {
  HERO_QUERY,
  PUBLISHED_CAP,
  enforceHeroPromise,
  satisfiesHeroQuery,
} from '../scripts/auto-listings/publish.mjs';
import { AUTO_PROPERTIES } from '@/lib/autoListings';

const L = (over: Record<string, unknown>) => ({
  id: 'KJA-A9999',
  title: 'Test listing',
  area: 'Karen',
  county: 'Nairobi',
  price: 40_000_000,
  bedrooms: 4,
  purpose: ['buy'],
  sizeSqm: 200,
  listedAt: '2026-09-01T00:00:00.000Z',
  ...over,
});

const heroListing = (id: string, listedAt: string) =>
  L({
    id,
    area: HERO_QUERY.area,
    bedrooms: HERO_QUERY.minBeds,
    price: HERO_QUERY.maxPriceKes - 1_000_000,
    listedAt,
  });

describe('satisfiesHeroQuery — the advertised promise predicate', () => {
  it('accepts the known-good shape (mirrors the hero copy)', () => {
    expect(satisfiesHeroQuery(heroListing('X1', '2026-09-01'))).toBe(true);
  });

  it('rejects on area, beds, price, POA and purpose', () => {
    expect(satisfiesHeroQuery({ ...heroListing('X2', '2026-09-01'), area: 'Karen' })).toBe(false);
    expect(satisfiesHeroQuery({ ...heroListing('X3', '2026-09-01'), bedrooms: 1 })).toBe(false);
    expect(satisfiesHeroQuery({ ...heroListing('X4', '2026-09-01'), price: HERO_QUERY.maxPriceKes + 1 })).toBe(false);
    expect(satisfiesHeroQuery({ ...heroListing('X5', '2026-09-01'), priceOnApplication: true, price: 0 })).toBe(false);
    expect(satisfiesHeroQuery({ ...heroListing('X6', '2026-09-01'), purpose: ['rent'] })).toBe(false);
    expect(satisfiesHeroQuery({ ...heroListing('X7', '2026-09-01'), purpose: 'buy' })).toBe(false); // not an array
  });
});

describe('enforceHeroPromise — the merge-time policy', () => {
  it('no-op when a qualifying listing survives the cap', () => {
    const capped = [heroListing('H1', '2026-09-18'), L({ id: 'N1' })];
    const evicted = [heroListing('H2', '2026-08-01')];
    const out = enforceHeroPromise(capped, evicted);
    expect(out.restored).toBeNull();
    expect(out.listings).toEqual(capped);
  });

  it('restores the newest evicted qualifier when eviction empties the set', () => {
    const capped = [L({ id: 'N1' }), L({ id: 'N2' })];
    const evicted = [
      heroListing('OLD1', '2026-08-01'),
      heroListing('NEW1', '2026-09-10'),
      L({ id: 'N3' }),
    ];
    const out = enforceHeroPromise(capped, evicted);
    expect(out.restored).toBe('NEW1'); // newest qualifier, not the oldest
    expect(out.listings).toHaveLength(capped.length); // stable size
    expect(out.listings.some(satisfiesHeroQuery)).toBe(true);
    expect(out.listings[0].id).toBe('NEW1'); // replaced the oldest kept non-qualifier
    expect(out.listings).not.toContainEqual(evicted.find((l) => l.id === 'N3'));
  });

  it('does nothing when nothing qualifies anywhere (no ghosts invented)', () => {
    const capped = [L({ id: 'N1' })];
    const evicted = [L({ id: 'N2' })];
    const out = enforceHeroPromise(capped, evicted);
    expect(out.restored).toBeNull();
    expect(out.listings).toEqual(capped);
  });
});

describe('the live catalogue satisfies the promise today', () => {
  it('at least one live auto-listing matches the hero query', () => {
    expect(AUTO_PROPERTIES.filter(satisfiesHeroQuery).length).toBeGreaterThan(0);
  });

  it('the published cap is what it claims (60) — the policy scales with it', () => {
    expect(PUBLISHED_CAP).toBe(60);
  });
});
