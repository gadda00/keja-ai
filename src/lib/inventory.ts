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
import { type UserListing, useUserListings, useSubmissions } from '@/lib/adminStore';
import { AUTO_PROPERTIES } from '@/lib/autoListings';
import { store } from '@/lib/store';

/**
 * Trust score derived from what the verification desk can actually attest to.
 * Approved submissions: human review + submission completeness, never above 94
 * (below the platform elite band — partner listings lack on-platform
 * transaction history).
 * Pending submissions: schema-screened only — the desk has NOT reviewed it
 * yet, so the score is capped at 78 and the baseline sits below every
 * human-verified band. The score a listing earns and the score it is
 * temporarily granted while awaiting review are different things.
 */
export function partnerTrustScore(u: UserListing, approved: boolean): number {
  let score = approved ? 78 : 66; // 78: human-reviewed · 66: awaiting review
  if (u.images.length >= 2) score += 4;
  if (u.description.length >= 120) score += 3;
  if (u.amenities.length >= 3) score += 3;
  if (u.rentEstimate && u.rentEstimate > 0) score += 2;
  return Math.min(approved ? 94 : 78, score);
}

/** Adapt an approved user submission into a full marketplace Property.
 *
 * Honest by review state: a listing awaiting desk review renders
 * titleCheck PENDING, no Ardhisasa match claim, a visible "pending review"
 * signal and a capped score. The admin console's Approve action upgrades
 * the same listing (via the submission join in useAllProperties) — approval
 * is now a state change the marketplace can see, not a private flag flip. */
export function userListingToProperty(u: UserListing, approved: boolean): Property {
  return {
    ...u,
    type: u.type as Property['type'],
    purpose: u.purpose as Property['purpose'],
    // base-path aware so images resolve under GitHub Pages subpath hosting
    images: u.images.map((p) => (p.startsWith('http') || p.startsWith('data:') ? p : asset(p))),
    trustScore: partnerTrustScore(u, approved),
    verification: {
      titleCheck: (approved ? 'verified' : 'pending') as Property['verification']['titleCheck'],
      ardhisasaMatch: approved,
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
      approved
        ? {
            label: 'Human-reviewed',
            status: 'pass' as const,
            detail: 'Approved by the Keja verification desk before publication',
          }
        : {
            label: 'Human review pending',
            status: 'warn' as const,
            detail:
              'Published ahead of review (trial platform) — the verification desk screens it next; title and registry checks stay pending until then',
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
    highlights: approved ? ['Recently approved', 'Partner supply'] : ['Pending desk review'],
  };
}

/** Merged inventory hook — auto-published Auto-Pilot listings, user
 * submissions (verification state derived from the linked submission's
 * review status), then seed stock. (Auto listings are machine-screened
 * and trust-capped — see lib/autoListings.) */
export function useAllProperties(): Property[] {
  const [userListings] = useUserListings();
  const [submissions] = useSubmissions();
  return useMemo(() => {
    const approved = new Set(
      submissions.filter((s) => s.status === 'approved').map((s) => s.id),
    );
    return [
      ...userListings.map((u) => userListingToProperty(u, !!u.submissionId && approved.has(u.submissionId))),
      ...AUTO_PROPERTIES,
      ...PROPERTIES,
    ];
  }, [userListings, submissions]);
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
  const approved = new Set(
    store
      .get<{ id: string; status: string }[]>('submissions', [])
      .filter((s) => s.status === 'approved')
      .map((s) => s.id),
  );
  return [
    ...store
      .get<UserListing[]>('user-listings', [])
      .map((u) => userListingToProperty(u, !!u.submissionId && approved.has(u.submissionId))),
    ...AUTO_PROPERTIES,
    ...PROPERTIES,
  ];
}

/** Resolve one property from the merged inventory by id. */
export function findProperty(all: Property[], id: string): Property | undefined {
  return all.find((p) => p.id === id);
}
