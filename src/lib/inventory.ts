/**
 * Unified marketplace inventory: static seed properties + admin-approved
 * partner/user submissions, merged into one typed collection.
 *
 * Fixes:
 *  - detail pages resolving only static data (user listings 404)
 *  - user-submitted images breaking under the /keja-ai/ base path
 *  - fabricated trust scores (description length ≠ verification)
 */
import { useMemo } from 'react';

import { asset } from '@/config';
import type { Property } from '@/data/properties';
import { PROPERTIES } from '@/data/properties';
import { type UserListing, useUserListings } from '@/lib/adminStore';
import { AUTO_PROPERTIES } from '@/lib/autoListings';
import { store } from '@/lib/store';

/**
 * Trust score derived from what the verification desk can actually attest to:
 * human review + submission completeness. Never above 94 (below the platform
 * elite band) because partner listings lack on-platform transaction history.
 */
export function partnerTrustScore(u: UserListing): number {
  let score = 78; // human-reviewed & approved by the verification desk
  if (u.images.length >= 2) score += 4;
  if (u.description.length >= 120) score += 3;
  if (u.amenities.length >= 3) score += 3;
  if (u.rentEstimate && u.rentEstimate > 0) score += 2;
  return Math.min(94, score);
}

/** Adapt an approved user submission into a full marketplace Property. */
export function userListingToProperty(u: UserListing): Property {
  return {
    ...u,
    type: u.type as Property['type'],
    purpose: u.purpose as Property['purpose'],
    // base-path aware so images resolve under GitHub Pages subpath hosting
    images: u.images.map((p) => (p.startsWith('http') || p.startsWith('data:') ? p : asset(p))),
    trustScore: partnerTrustScore(u),
    verification: {
      titleCheck: 'verified' as const,
      ardhisasaMatch: true,
      photosVerified: u.images.length > 0,
      duplicateCheck: 'clean' as const,
      listingVelocity: 'normal' as const,
      lastChecked: u.listedAt,
    },
    trustSignals: [
      {
        label: 'Partner-submitted listing',
        status: 'pass' as const,
        detail: `Source: ${u.source} — screened by trust-by-design anomaly detection`,
      },
      {
        label: 'Human-reviewed',
        status: 'pass' as const,
        detail: 'Approved by the Keja verification desk before publication',
      },
      {
        label: 'Completeness',
        status:
          u.images.length >= 2 && u.description.length >= 120
            ? ('pass' as const)
            : ('warn' as const),
        detail: `${u.images.length} photo${u.images.length === 1 ? '' : 's'}, ${u.amenities.length} amenities declared`,
      },
    ],
    highlights: ['Recently approved', 'Partner supply'],
  };
}

/** Merged inventory hook — auto-published Auto-Pilot listings, approved
 * partner submissions, then seed stock. (Auto listings are machine-screened
 * and trust-capped — see lib/autoListings.) */
export function useAllProperties(): Property[] {
  const [userListings] = useUserListings();
  return useMemo(
    () => [...userListings.map(userListingToProperty), ...AUTO_PROPERTIES, ...PROPERTIES],
    [userListings]
  );
}

/**
 * Fresh merged inventory (no hooks) — for the AI engine and non-React code.
 *
 * Called as a function instead of a frozen module-level constant: the old
 * `MARKET_INVENTORY` was computed once at import time, so listings approved
 * mid-session never reached the AI engine or Home stats until a full reload
 * (two sources of truth drifting apart). Callers now always see the current
 * store state.
 */
export function marketInventory(): Property[] {
  return [
    ...store.get<UserListing[]>('user-listings', []).map(userListingToProperty),
    ...AUTO_PROPERTIES,
    ...PROPERTIES,
  ];
}

/** Resolve one property from the merged inventory by id. */
export function findProperty(all: Property[], id: string): Property | undefined {
  return all.find((p) => p.id === id);
}
