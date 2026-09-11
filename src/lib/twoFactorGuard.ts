/**
 * twoFactorGuard — the brute-force throttle for 2FA verification.
 * ---------------------------------------------------------------------------
 * A 6-digit TOTP admits 3 valid codes per 90s window (±1 step drift), so an
 * unthrottled verify form is a viable guessing channel for someone holding
 * a borrowed session — exactly the threat the claims register names
 * ("casual use of a borrowed session on the device"). This module is the
 * pure policy: consecutive failures escalate into timed lockouts, and a
 * successful verification resets the counter.
 *
 * Pure by design (clock injected, state passed in and returned) so the
 * policy is unit-testable and moves verbatim server-side with the Phase-2
 * auth service.
 */

/** Escalating lockout tiers: at N consecutive failures, lock for S seconds. */
export const LOCKOUT_TIERS: ReadonlyArray<{ fails: number; seconds: number }> = [
  { fails: 5, seconds: 30 }, // 5 quick mistakes — a short pause
  { fails: 10, seconds: 300 }, // 10 — 5 minutes, clearly not a typo pattern
  { fails: 20, seconds: 900 }, // 20 — 15 minutes (ceiling)
];

/** Lock applied at any failure count beyond the last tier. */
export const LOCKOUT_CEILING_SECONDS = LOCKOUT_TIERS[LOCKOUT_TIERS.length - 1].seconds;

/** Throttle state as persisted inside the enrolment record. */
export interface ThrottleState {
  failCount?: number;
  lockedUntil?: string;
}

/** The lockout a given consecutive-failure count earns (0 = none). */
export function lockoutSecondsFor(failCount: number): number {
  let seconds = 0;
  for (const tier of LOCKOUT_TIERS) {
    if (failCount >= tier.fails) seconds = tier.seconds;
  }
  return seconds;
}

export interface LockCheck {
  locked: boolean;
  /** Seconds remaining (0 when not locked). */
  remainingSeconds: number;
}

/** Is verification currently locked out at `nowMs`? */
export function checkLock(state: ThrottleState, nowMs: number): LockCheck {
  const until = state.lockedUntil ? Date.parse(state.lockedUntil) : NaN;
  if (!Number.isFinite(until)) return { locked: false, remainingSeconds: 0 };
  const remaining = Math.ceil((until - nowMs) / 1000);
  if (remaining <= 0) return { locked: false, remainingSeconds: 0 };
  return { locked: true, remainingSeconds: remaining };
}

/** Record a failed attempt: increment the counter, apply/extend the tier.
 *  Returns the next state — the caller persists it. */
export function recordFailure(
  state: ThrottleState,
  nowMs: number,
): ThrottleState & { failCount: number } {
  const failCount = (state.failCount ?? 0) + 1;
  const seconds = lockoutSecondsFor(failCount);
  const currentLock = checkLock(state, nowMs);
  // A failure while already locked extends nothing (attempts are rejected
  // before reaching verification anyway); the tier re-arms from the new
  // count when this failure itself unlocks.
  const lockedUntil = seconds
    ? new Date(
        Math.max(nowMs, currentLock.locked ? Date.parse(state.lockedUntil as string) : 0) +
          seconds * 1000,
      ).toISOString()
    : state.lockedUntil;
  return { failCount, lockedUntil };
}

/** A successful verification clears the counter (the lock, if any, would
 *  have prevented the attempt — nothing to clear beyond the count). */
export function recordSuccess(): ThrottleState & { failCount: number } {
  return { failCount: 0 };
}

/** Human-facing lockout message, e.g. "4 min 12 s". */
export function formatLockout(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m} min ${s} s` : `${m} min`;
}
