/**
 * The boot-critical home dataset (wave-15 inventory data-split).
 *
 * `src/data/home-subset.json` is GENERATED (scripts/generate-home-subset.ts,
 * run under bun) from the real platform catalogue — never hand-edited. It
 * exists so the KejaApp shell graph does not have to carry the entire
 * 87-listing inventory for the homepage: the featured section renders these
 * 8 frozen picks and the social-proof strip renders these two precomputed
 * numbers, while the full catalogue loads lazily with Discover / Compare /
 * detail / AI views.
 *
 * Drift discipline: tests/homeSubset.test.ts recomputes the rule from the
 * live data and compares byte-for-byte — CI fails if the catalogue changes
 * without regenerating the subset (the Auto-Pilot ingest workflow
 * regenerates it on every listing commit).
 */
import type { Property } from '@/data/properties';
import raw from '@/data/home-subset.json';

export interface HomeSubset {
  schemaVersion: number;
  generatedAt: string;
  featured: Property[];
  stats: {
    /** live static-catalogue listing count (user submissions are counted at runtime) */
    totalListings: number;
    /** listings with Trust Score ≥ 80 */
    verifiedHigh: number;
  };
}

const subset = raw as unknown as HomeSubset;

/** Featured picks for the homepage carousel — full Property records, ready
 *  for PropertyCard. Build-time selection: highest trust first, views as
 *  tiebreak, sold listings excluded (the Home section rule, frozen). */
export const HOME_FEATURED: Property[] = subset.featured;

/** Precomputed homepage stats. `totalListings` counts the static catalogue;
 *  user-submitted listings (device-local) are added by the caller so the
 *  number stays honest as people publish. */
export const HOME_STATS = subset.stats;
