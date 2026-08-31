import { describe, expect, it } from 'vitest';

import { PROPERTIES } from '@/data/properties';
import {
  evidenceFor,
  FRESHNESS_COPY,
  freshnessOf,
  listingFreshness,
  VERIFICATION_VALIDITY_DAYS,
} from '@/lib/verification';

describe('verification freshness policy', () => {
  it('marks evidence fresh inside the validity window', () => {
    const now = '2026-08-31';
    const f = freshnessOf('2026-08-20', now); // 11 days old
    expect(f.state).toBe('fresh');
    expect(f.daysRemaining).toBe(VERIFICATION_VALIDITY_DAYS - 11);
    expect(f.expiresAt).toBe('2026-11-18');
  });

  it('flags recheck-due inside the final 14 days', () => {
    // checked 80 days ago -> 10 days remain
    const f = freshnessOf('2026-06-12', '2026-08-31');
    expect(f.state).toBe('recheck-due');
  });

  it('flags evidence expired past the window', () => {
    const f = freshnessOf('2026-05-01', '2026-08-31'); // 122 days
    expect(f.state).toBe('expired');
    expect(f.daysRemaining).toBeLessThan(0);
  });

  it('copies exist for every freshness state', () => {
    for (const s of ['fresh', 'recheck-due', 'expired'] as const) {
      expect(FRESHNESS_COPY[s].length).toBeGreaterThan(5);
    }
  });
});

describe('evidence derivation', () => {
  it('derives four evidence checks with scope, dates and method for every property', () => {
    for (const p of PROPERTIES) {
      const checks = evidenceFor(p, '2026-08-31');
      expect(checks.length).toBe(4);
      for (const c of checks) {
        expect(c.scope.length).toBeGreaterThan(20); // a real sentence, not a label
        expect(c.checkedAt).toBe(p.verification.lastChecked);
        expect(c.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(c.method).toBe('simulated'); // honesty: this build simulates checks
        expect(['pass', 'warn', 'fail']).toContain(c.status);
      }
    }
  });

  it('maps title status onto evidence status faithfully', () => {
    const verified = PROPERTIES.find((p) => p.verification.titleCheck === 'verified');
    const flagged = PROPERTIES.find((p) => p.verification.titleCheck === 'flagged');
    if (verified) expect(evidenceFor(verified)[0].status).toBe('pass');
    if (flagged) expect(evidenceFor(flagged)[0].status).toBe('fail');
  });

  it('listingFreshness agrees with freshnessOf on the same date', () => {
    const p = PROPERTIES[0];
    expect(listingFreshness(p, '2026-08-31')).toEqual(
      freshnessOf(p.verification.lastChecked, '2026-08-31')
    );
  });
});
