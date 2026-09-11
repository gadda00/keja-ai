/**
 * twoFactorGuard — the brute-force throttle policy (wave 10).
 *
 * A 6-digit TOTP admits 3 valid codes per 90s window (±1 step drift), so an
 * unthrottled verify form is a guessing channel for someone holding a
 * borrowed session. These tests pin the escalating-lockout policy with an
 * injected clock — no real time ever passes.
 */
import { describe, expect, it } from 'vitest';

import {
  checkLock,
  formatLockout,
  LOCKOUT_CEILING_SECONDS,
  LOCKOUT_TIERS,
  lockoutSecondsFor,
  recordFailure,
  recordSuccess,
  type ThrottleState,
} from '@/lib/twoFactorGuard';

const T0 = 1_700_000_000_000; // fixed epoch ms

describe('lockoutSecondsFor (tier table)', () => {
  it('no lockout before the first tier', () => {
    for (let i = 0; i < 5; i++) expect(lockoutSecondsFor(i)).toBe(0);
  });

  it('each tier arms exactly at its failure count', () => {
    expect(lockoutSecondsFor(5)).toBe(30);
    expect(lockoutSecondsFor(10)).toBe(300);
    expect(lockoutSecondsFor(20)).toBe(900);
  });

  it('tiers escalate and hold at the ceiling', () => {
    expect(lockoutSecondsFor(7)).toBe(30);
    expect(lockoutSecondsFor(15)).toBe(300);
    expect(lockoutSecondsFor(999)).toBe(LOCKOUT_CEILING_SECONDS);
    expect(LOCKOUT_TIERS).toHaveLength(3);
  });
});

describe('checkLock', () => {
  it('unlocked without state', () => {
    expect(checkLock({}, T0)).toEqual({ locked: false, remainingSeconds: 0 });
  });

  it('locked for the remaining seconds (rounded up)', () => {
    const until = new Date(T0 + 91_000).toISOString();
    expect(checkLock({ lockedUntil: until }, T0)).toEqual({
      locked: true,
      remainingSeconds: 91,
    });
  });

  it('an expired lock is not a lock', () => {
    const until = new Date(T0 - 1).toISOString();
    expect(checkLock({ lockedUntil: until }, T0)).toEqual({ locked: false, remainingSeconds: 0 });
  });

  it('garbage lockedUntil is ignored, not thrown on', () => {
    expect(checkLock({ lockedUntil: 'not-a-date' }, T0)).toEqual({ locked: false, remainingSeconds: 0 });
  });
});

describe('recordFailure', () => {
  it('counts and locks at the 5th failure', () => {
    let state = recordFailure({}, T0);
    for (let i = 2; i <= 4; i++) {
      state = recordFailure(state, T0);
      expect(state.failCount).toBe(i);
      expect(state.lockedUntil).toBeUndefined();
    }
    state = recordFailure(state, T0);
    expect(state.failCount).toBe(5);
    expect(new Date(state.lockedUntil as string).getTime()).toBe(T0 + 30_000);
  });

  it('escalates to the next tier as failures continue', () => {
    let state: ThrottleState = { failCount: 9 };
    state = recordFailure(state, T0); // 10th failure
    expect(new Date(state.lockedUntil as string).getTime()).toBe(T0 + 300_000);
  });

  it('a failure while locked extends from the existing lock, not from now', () => {
    // lock until T0+30s; the next failure lands at T0+20s and must arm from
    // the remaining lock, so the user cannot reset the window by failing
    const locked = { failCount: 5, lockedUntil: new Date(T0 + 30_000).toISOString() };
    const next = recordFailure(locked, T0 + 20_000); // 6th failure — tier still 30s
    // tier for 6 fails is 30s; lock end = max(now, existing lock end) + 30s
    expect(new Date(next.lockedUntil as string).getTime()).toBe(T0 + 60_000);
  });

  it('below the first tier a failure stores no lock', () => {
    const next = recordFailure({ failCount: 2 }, T0);
    expect(next.failCount).toBe(3);
    expect(next.lockedUntil).toBeUndefined();
  });
});

describe('recordSuccess', () => {
  it('clears the failure count', () => {
    expect(recordSuccess()).toEqual({ failCount: 0 });
  });
});

describe('formatLockout', () => {
  it('renders seconds below a minute', () => {
    expect(formatLockout(45)).toBe('45 s');
  });

  it('renders whole minutes without seconds', () => {
    expect(formatLockout(300)).toBe('5 min');
  });

  it('renders minutes with remainder', () => {
    expect(formatLockout(252)).toBe('4 min 12 s');
  });
});
