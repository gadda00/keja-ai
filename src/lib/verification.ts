/**
 * Verification evidence model — "verified" is never a timeless binary badge.
 *
 * Review feedback: a trust score alone hides too much. Every check needs a
 * scope, a method, a date, an expiry, and a path to human review. This module
 * derives that evidence view from the existing Property data model so every
 * listing (seeded or Auto-Pilot ingested) renders the same honest evidence
 * panel without per-listing hand-editing.
 */
import type { Property } from '@/data/properties';

/** Policy: a verification check is trusted for 90 days, then it is stale. */
export const VERIFICATION_VALIDITY_DAYS = 90;

export type FreshnessState = 'fresh' | 'recheck-due' | 'expired';

export interface Freshness {
  state: FreshnessState;
  /** Days until expiry (negative when already expired). */
  daysRemaining: number;
  checkedAt: string;
  expiresAt: string;
}

export interface EvidenceCheck {
  /** Short name shown in the evidence panel. */
  name: string;
  /** What the check actually covered — one honest sentence. */
  scope: string;
  /** pass | warn | fail — same vocabulary as TrustSignal. */
  status: 'pass' | 'warn' | 'fail';
  checkedAt: string;
  expiresAt: string;
  freshness: FreshnessState;
  /** How the check was performed in this build. */
  method: 'simulated';
}

const addDays = (iso: string, days: number): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const daysBetween = (fromIso: string, toIso: string): number =>
  Math.round(
    (new Date(`${toIso}T00:00:00Z`).getTime() - new Date(`${fromIso}T00:00:00Z`).getTime()) /
      86_400_000
  );

/** Freshness of a `lastChecked` date relative to `now` (ISO, default today). */
export function freshnessOf(
  lastChecked: string,
  now: string = new Date().toISOString().slice(0, 10)
): Freshness {
  const expiresAt = addDays(lastChecked, VERIFICATION_VALIDITY_DAYS);
  const daysRemaining = daysBetween(now, expiresAt);
  const state: FreshnessState =
    daysRemaining < 0 ? 'expired' : daysRemaining <= 14 ? 'recheck-due' : 'fresh';
  return { state, daysRemaining, checkedAt: lastChecked, expiresAt };
}

/**
 * Derive the evidence list for a property from its verification block and
 * trust signals. Deterministic and pure — safe for render and tests.
 */
export function evidenceFor(property: Property, now?: string): EvidenceCheck[] {
  const v = property.verification;
  const fresh = freshnessOf(v.lastChecked, now);

  const make = (
    name: string,
    scope: string,
    status: EvidenceCheck['status'],
    detail?: string
  ): EvidenceCheck => ({
    name,
    scope: detail ? `${scope} — ${detail}` : scope,
    status,
    checkedAt: v.lastChecked,
    expiresAt: fresh.expiresAt,
    freshness: fresh.state,
    method: 'simulated',
  });

  const checks: EvidenceCheck[] = [
    make(
      'Title & registry search',
      'Ownership, encumbrances, caveats and charges for the registered parcel',
      v.titleCheck === 'verified' ? 'pass' : v.titleCheck === 'pending' ? 'warn' : 'fail',
      v.ardhisasaMatch
        ? 'matched against registry records in this demo dataset'
        : 'not matched against registry records'
    ),
    make(
      'Photo authenticity',
      'All listing photos checked for cross-listing reuse and stock-image substitution',
      v.photosVerified ? 'pass' : 'warn'
    ),
    make(
      'Duplicate listing scan',
      'Cross-listing similarity across the platform inventory',
      v.duplicateCheck === 'clean' ? 'pass' : v.duplicateCheck === 'similar-found' ? 'warn' : 'fail'
    ),
    make(
      'Listing velocity & pricing',
      'Posting-frequency pattern and asking price against the area market band',
      v.listingVelocity === 'suspicious' ? 'fail' : v.listingVelocity === 'high' ? 'warn' : 'pass'
    ),
  ];

  return checks;
}

/** Headline freshness for badges: worst-case across checks (all share lastChecked). */
export function listingFreshness(property: Property, now?: string): Freshness {
  return freshnessOf(property.verification.lastChecked, now);
}

export const FRESHNESS_COPY: Record<FreshnessState, string> = {
  fresh: 'Evidence current',
  'recheck-due': 'Recheck due soon',
  expired: 'Evidence stale — re-verification required',
};
