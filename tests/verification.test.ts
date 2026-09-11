/**
 * Verification evidence model — "verified is never a timeless badge".
 *
 * Pins the 90-day validity policy and the three freshness states,
 * including the exact boundary days (14 → recheck-due, 0 → still
 * recheck-due, negative → expired).
 */
import {
  FRESHNESS_COPY,
  VERIFICATION_VALIDITY_DAYS,
  evidenceFor,
  freshnessOf,
  listingFreshness,
} from '@/lib/verification';
import { PROPERTIES } from '@/data/properties';

describe('freshnessOf (90-day policy)', () => {
  it('policy constant is 90 days', () => {
    expect(VERIFICATION_VALIDITY_DAYS).toBe(90);
  });

  it('a check from today is fresh', () => {
    const f = freshnessOf('2026-09-01', '2026-09-01');
    expect(f.state).toBe('fresh');
    expect(f.daysRemaining).toBe(90);
    expect(f.expiresAt).toBe('2026-11-30');
  });

  it('crosses to recheck-due at 14 days remaining', () => {
    // 2026-09-01 + 90 = 2026-11-30; 14 days before that is 2026-11-16
    expect(freshnessOf('2026-09-01', '2026-11-15').state).toBe('fresh');
    expect(freshnessOf('2026-09-01', '2026-11-16').state).toBe('recheck-due');
    expect(freshnessOf('2026-09-01', '2026-11-16').daysRemaining).toBe(14);
  });

  it('the expiry day itself is still recheck-due (grace)', () => {
    expect(freshnessOf('2026-09-01', '2026-11-30').state).toBe('recheck-due');
    expect(freshnessOf('2026-09-01', '2026-11-30').daysRemaining).toBe(0);
  });

  it('the day after expiry is expired with negative daysRemaining', () => {
    const f = freshnessOf('2026-09-01', '2026-12-01');
    expect(f.state).toBe('expired');
    expect(f.daysRemaining).toBe(-1);
  });

  it('carries checkedAt and computed expiresAt', () => {
    const f = freshnessOf('2026-08-01', '2026-09-01');
    expect(f.checkedAt).toBe('2026-08-01');
    expect(f.expiresAt).toBe('2026-10-30');
  });

  it('FRESHNESS_COPY covers all three states', () => {
    expect(Object.keys(FRESHNESS_COPY).sort()).toEqual(['expired', 'fresh', 'recheck-due']);
    for (const copy of Object.values(FRESHNESS_COPY)) expect(copy.length).toBeGreaterThan(0);
  });
});

describe('evidenceFor', () => {
  const property = PROPERTIES[0];

  it('derives the four standard checks for any listing', () => {
    const checks = evidenceFor(property);
    expect(checks.map((c) => c.name)).toEqual([
      'Title & registry search',
      'Photo authenticity',
      'Duplicate listing scan',
      'Listing velocity & pricing',
    ]);
  });

  it('every check carries scope, dates, freshness and the simulated method', () => {
    for (const check of evidenceFor(property)) {
      expect(check.scope.length).toBeGreaterThan(10);
      expect(check.method).toBe('simulated');
      expect(check.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(['fresh', 'recheck-due', 'expired']).toContain(check.freshness);
      expect(['pass', 'warn', 'fail']).toContain(check.status);
    }
  });

  it('title check status maps verification state honestly', () => {
    expect(
      evidenceFor({ ...property, verification: { ...property.verification, titleCheck: 'verified' } })
        .find((c) => c.name === 'Title & registry search')?.status,
    ).toBe('pass');
    expect(
      evidenceFor({ ...property, verification: { ...property.verification, titleCheck: 'pending' } })
        .find((c) => c.name === 'Title & registry search')?.status,
    ).toBe('warn');
    expect(
      evidenceFor({ ...property, verification: { ...property.verification, titleCheck: 'flagged' } })
        .find((c) => c.name === 'Title & registry search')?.status,
    ).toBe('fail');
  });

  it('listingFreshness matches the underlying lastChecked date', () => {
    const f = listingFreshness(property, property.verification.lastChecked);
    expect(f.state).toBe('fresh');
    expect(f.daysRemaining).toBe(90);
  });
});
