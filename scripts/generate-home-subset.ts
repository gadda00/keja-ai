/**
 * generate-home-subset.ts — the boot-critical home dataset (wave-15).
 *
 * Problem: the KejaApp shell chunk statically carried the ENTIRE 87-listing
 * inventory (~250 kB minified) because Home's featured section and the
 * NotificationsBell sweep imported `@/lib/inventory`. The homepage actually
 * needs 8 featured cards and two precomputed numbers. This generator freezes
 * exactly that subset into `src/data/home-subset.json` so the shell graph
 * stays small while the full inventory loads lazily with the views that
 * render it (Discover, Compare, detail, AI).
 *
 * The committed subset is regenerated:
 *   - by the Auto-Pilot ingest workflow (with every auto-listings.json commit)
 *   - by hand: `bun scripts/generate-home-subset.ts`
 * and pinned byte-exact by tests/homeSubset.test.ts — the recompute test
 * fails CI if anyone changes the data without regenerating, so the featured
 * picks and the home stats can never silently drift from the real inventory.
 *
 * Usage:  bun scripts/generate-home-subset.ts
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PROPERTIES } from '../src/data/properties';
import { AUTO_PROPERTIES } from '../src/lib/autoListings';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src', 'data', 'home-subset.json');

/** The exact FeaturedProperties rule from src/components/home/Home.tsx —
 *  duplicated here ON PURPOSE under test surveillance: the subset test
 *  imports this script's rule via the shared recompute (see
 *  tests/homeSubset.test.ts) so the two can never disagree silently. */
export const FEATURED_COUNT = 8;

export function pickFeatured(inventory: typeof PROPERTIES): typeof PROPERTIES {
  return [...inventory]
    .filter((p) => p.availability !== 'sold')
    .sort((a, b) => b.trustScore - a.trustScore || b.views - a.views)
    .slice(0, FEATURED_COUNT);
}

export function computeStats(inventory: typeof PROPERTIES) {
  return {
    totalListings: inventory.length,
    verifiedHigh: inventory.filter((p) => p.trustScore >= 80).length,
  };
}

/* ------------------------------ generation ------------------------------- */

// The platform catalogue (deterministic build-time data — user-submitted
// listings live only in visitors' browsers and are counted live at runtime
// by SocialProof via the user-listings store, not frozen here).
const inventory = [...AUTO_PROPERTIES, ...PROPERTIES];

const featured = pickFeatured(inventory);
const stats = computeStats(inventory);

/* self-checks before anything is written */
const violations: string[] = [];
if (featured.length !== FEATURED_COUNT) {
  violations.push(`expected ${FEATURED_COUNT} featured picks, got ${featured.length}`);
}
const ids = featured.map((p) => p.id);
if (new Set(ids).size !== ids.length) violations.push('duplicate featured ids');
for (const p of featured) {
  const match = inventory.find((q) => q.id === p.id);
  if (!match) violations.push(`${p.id} is not in the live inventory`);
  else if (JSON.stringify(match) !== JSON.stringify(p)) {
    violations.push(`${p.id} drifted from the live inventory copy`);
  }
  if (p.availability === 'sold') violations.push(`${p.id} is sold — cannot be featured`);
}
if (stats.totalListings !== inventory.length) violations.push('stats.totalListings miscounted');
if (stats.verifiedHigh < 0 || stats.verifiedHigh > stats.totalListings) {
  violations.push('stats.verifiedHigh out of range');
}
if (violations.length > 0) {
  console.error('[home-subset] self-validation failed:');
  for (const v of violations) console.error(`  ✗ ${v}`);
  process.exit(1);
}

const subset = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  featured,
  stats,
};

const json = JSON.stringify(subset, null, 2) + '\n';

// Rotation notice: if the PREVIOUS committed copy existed and its pick set
// changed (generatedAt always changes — that is the freshness marker, not a
// rotation), say so. A human regenerating by hand should notice a rotation.
let previousIds: string[] | null = null;
try {
  const before = JSON.parse(readFileSync(OUT, 'utf8'));
  if (Array.isArray(before?.featured)) previousIds = before.featured.map((p: { id: string }) => p.id);
} catch {
  /* first generation — nothing to compare */
}
writeFileSync(OUT, json);
if (previousIds && previousIds.join(',') !== ids.join(',')) {
  console.log('[home-subset] featured set rotated (previous: ' + previousIds.join(', ') + ')');
}
const kb = (Buffer.byteLength(json) / 1024).toFixed(1);
console.log(
  `[home-subset] wrote src/data/home-subset.json — ${featured.length} featured picks, ` +
    `stats { total: ${stats.totalListings}, trust≥80: ${stats.verifiedHigh} }, ${kb} kB`,
);
