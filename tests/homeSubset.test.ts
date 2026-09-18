/**
 * Home subset (wave-15 inventory data-split) — the contract that keeps the
 * boot-critical homepage dataset honest.
 *
 * `src/data/home-subset.json` is a GENERATED artifact (scripts/
 * generate-home-subset.ts, run under bun) imported by the KejaApp shell
 * graph so the homepage paints without the full 87-listing catalogue. A
 * generated artifact that nobody pins is a drift hazard: this suite
 * recomputes the rule from the live data and demands byte-exact agreement,
 * so:
 *   - a human edit to the catalogue without regeneration fails CI here,
 *   - an Auto-Pilot ingest that forgets the regeneration step fails CI here
 *     (and the workflow's revert job restores the last good state),
 *   - a hand-edit to the JSON itself fails CI here.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { PROPERTIES, type Property } from '@/data/properties';
import { AUTO_PROPERTIES } from '@/lib/autoListings';
import { HOME_FEATURED, HOME_STATS } from '@/lib/homeSubset';
import { investmentFactors } from '@/lib/investmentScore';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const committed = JSON.parse(readFileSync(resolve(ROOT, 'src/data/home-subset.json'), 'utf8'));

// The platform catalogue — same composition the generator scores (user
// listings are device-local and counted live at runtime, never frozen).
const CATALOGUE: Property[] = [...AUTO_PROPERTIES, ...PROPERTIES];

/** The FeaturedProperties rule (Home.tsx) — highest trust first, views as
 *  tiebreak, sold stock excluded, exactly 8 picks. */
function recomputeFeatured(inventory: Property[], count = 8): Property[] {
  return [...inventory]
    .filter((p) => p.availability !== 'sold')
    .sort((a, b) => b.trustScore - a.trustScore || b.views - a.views)
    .slice(0, count);
}

describe('home subset — generated artifact integrity', () => {
  it('schema: version, timestamp, 8 featured, stats block', () => {
    expect(committed.schemaVersion).toBe(1);
    expect(committed.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(committed.featured).toHaveLength(8);
    expect(typeof committed.stats.totalListings).toBe('number');
    expect(typeof committed.stats.verifiedHigh).toBe('number');
  });

  it('the committed JSON and the imported module are the same data', () => {
    expect(HOME_FEATURED).toEqual(committed.featured);
    expect(HOME_STATS).toEqual(committed.stats);
  });

  it('byte-exact drift pin: the picks equal the rule recomputed from live data', () => {
    // Deep-equal (not JSON-string compare): key order is irrelevant, content
    // is not. Any catalogue change without regeneration fails here.
    expect(committed.featured).toEqual(recomputeFeatured(CATALOGUE));
  });

  it('stats equal the live recomputation', () => {
    expect(committed.stats.totalListings).toBe(CATALOGUE.length);
    expect(committed.stats.verifiedHigh).toBe(
      CATALOGUE.filter((p) => p.trustScore >= 80).length,
    );
  });
});

describe('home subset — every pick is a real, presentable listing', () => {
  it('every featured id resolves to the identical live record (no drift, no ghosts)', () => {
    for (const p of committed.featured) {
      const live = CATALOGUE.find((q) => q.id === p.id);
      expect(live, `${p.id} must exist in the catalogue`).toBeDefined();
      expect(p).toEqual(live);
    }
  });

  it('no sold listings, unique ids, sorted by the homepage rule', () => {
    const picks: Property[] = committed.featured;
    expect(new Set(picks.map((p) => p.id)).size).toBe(8);
    expect(picks.every((p) => p.availability !== 'sold')).toBe(true);
    for (let i = 1; i < picks.length; i++) {
      const [a, b] = [picks[i - 1], picks[i]];
      expect(
        b.trustScore - a.trustScore || b.views - a.views,
        `pick ${i - 1} → ${i} must not violate trust desc, views desc`,
      ).toBeLessThanOrEqual(0);
    }
  });

  it('PropertyCard can render every pick (fields the card touches exist)', () => {
    for (const p of committed.featured) {
      expect(p.images.length).toBeGreaterThan(0);
      expect(p.title.length).toBeGreaterThan(0);
      expect(Number.isFinite(p.price)).toBe(true);
      expect(Number.isFinite(p.sizeSqm)).toBe(true);
      expect(Number.isFinite(p.trustScore)).toBe(true);
      expect(p.area.length).toBeGreaterThan(0);
      // the investment chip must compute without an inventory (pure factors)
      expect(() => investmentFactors(p)).not.toThrow();
    }
  });
});
