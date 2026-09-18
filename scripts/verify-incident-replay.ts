/**
 * Incident replay (2026-09-18 14:25 UTC): the ingest's cap-60 eviction
 * culled KJA-A0162 — the only listing satisfying the hero's advertised
 * example. This script replays that exact class of ingest against the
 * live state with the wave-16 publish logic and asserts the protection
 * engages. Run: bun scripts/verify-incident-replay.ts
 */
import { readFileSync } from 'node:fs';
import { publish, PUBLISHED_CAP, satisfiesHeroQuery } from './auto-listings/publish.mjs';

type AnyListing = Record<string, unknown>;
const state = JSON.parse(readFileSync('src/data/auto-listings.json', 'utf8')) as {
  listings: AnyListing[];
};

// Three fresh screened listings (route=publish), mimicking the 14:25 ingest
const mk = (id: string, n: number) => ({
  id,
  title: `Incident replay listing ${id}`,
  area: 'Syokimau',
  county: 'Machakos',
  price: 7_500_000 + n,
  bedrooms: 3,
  bathrooms: 2,
  sizeSqm: 110,
  purpose: ['buy'],
  amenities: ['Borehole'],
  images: ['/images/props/apartment_0.webp'],
  description: 'x'.repeat(140),
  agency: 'Replay Partners',
  agent: { name: 'Replay Desk', phone: '+254700000000' },
  trustScore: 62,
  verification: {
    titleCheck: 'pending',
    ardhisasaMatch: false,
    photosVerified: true,
    duplicateCheck: 'clean',
    listingVelocity: 'normal',
    lastChecked: new Date().toISOString(),
  },
  trustSignals: [],
  availability: 'available',
  listedAt: new Date().toISOString(),
  views: 12,
  highlights: [],
  auto: { source: 'market-scanner', route: 'publish', qualityScore: 88, checks: [] },
});

const screened = [mk('KJA-A9001', 1), mk('KJA-A9002', 2), mk('KJA-A9003', 3)];

const idOf = (arr: AnyListing[]) => arr.filter(satisfiesHeroQuery).map((l) => String(l.id));
const heroBefore = idOf(state.listings);
const { nextState, run } = publish({ state, screened, feedStatus: {}, runId: 'replay-' + Date.now() });
const afterListings = (nextState as { listings: AnyListing[] }).listings;

console.log('hero qualifiers before:', heroBefore);
console.log('listings before/after:', state.listings.length, '→', afterListings.length, `(cap ${PUBLISHED_CAP})`);
console.log('hero qualifiers after: ', idOf(afterListings));
console.log('run.heroPromiseRestored:', run.heroPromiseRestored);

const after = afterListings.filter(satisfiesHeroQuery);
if (after.length === 0) {
  console.error('✗ REPLAY FAILED — the protection did not hold');
  process.exit(1);
}
console.log('✓ REPLAY PASSED — the advertised hero query still resolves after cap eviction');
