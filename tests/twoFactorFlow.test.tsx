/**
 * 2FA end-to-end flow (wave 10) — the AuthProvider wiring, not just the
 * modules: hashed recovery codes verify by hash, are single-use, and the
 * brute-force throttle locks the account after 5 wrong codes (rejecting
 * even a CORRECT code while locked). The legacy plaintext migration runs
 * on provider mount.
 *
 * The harness captures the provider's public API through useAuth (the same
 * surface the TwoFactorChallenge component consumes), so the tests exercise
 * exactly what production code calls.
 */
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useEffect } from 'react';

import { AuthProvider, useAuth, type AuthContextValue, type UserAccount } from '@/lib/auth';
import { hashRecoveryCode, totpCode } from '@/lib/totp';

const NOW = new Date().toISOString();
const SECRET = 'JBSWY3DPEHPK3PXP'; // RFC 6238 appendix-B vector secret

const USER: UserAccount = {
  id: 'usr-2fatest',
  name: 'Two Factor Test',
  email: '2fa@test.keja.app',
  role: 'user',
  provider: 'google',
  status: 'active',
  createdAt: NOW,
  lastLoginAt: NOW,
  loginCount: 1,
};

function seedSession() {
  localStorage.setItem('keja:users', JSON.stringify([USER]));
  localStorage.setItem(
    'keja:session',
    JSON.stringify({
      token: 't'.repeat(24),
      userId: USER.id,
      issuedAt: NOW,
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      remember: true,
      mfaVerified: false,
    }),
  );
}

function seedEnrolment(recoveryCodes: string[]) {
  localStorage.setItem(
    'keja:totp',
    JSON.stringify({
      [USER.id]: { secret: SECRET, confirmedAt: NOW, recoveryCodes, createdAt: NOW },
    }),
  );
}

/** Captures the provider API (what TwoFactorChallenge calls in production). */
let api: Pick<AuthContextValue, 'verifyTwoFactor'> | null = null;
function Probe() {
  const auth = useAuth();
  useEffect(() => {
    api = auth;
  });
  return null;
}

async function renderAuth() {
  api = null;
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await waitFor(() => expect(api?.verifyTwoFactor).toBeTruthy());
}

const verify = (code: string) =>
  (api as Pick<AuthContextValue, 'verifyTwoFactor'>).verifyTwoFactor(code);

const readEnrolment = () =>
  JSON.parse(localStorage.getItem('keja:totp') as string)[USER.id] as {
    recoveryCodes: string[];
    failCount?: number;
    lockedUntil?: string;
  };

describe('recovery codes — hashed storage through the provider', () => {
  it('a valid recovery code verifies by hash, exactly once', async () => {
    seedSession();
    seedEnrolment([await hashRecoveryCode('ABCDE-FGHIJ')]);
    await renderAuth();

    const first = await verify('abcde-fghij'); // lowercase — normalised before hashing
    expect(first).toEqual({ ok: true, usedRecovery: true });

    // single-use: the same code is refused, and the hash is gone from storage
    const second = await verify('ABCDE-FGHIJ');
    expect(second.ok).toBe(false);
    expect(readEnrolment().recoveryCodes).toHaveLength(0);
  });

  it('a wrong-but-well-formed recovery code counts as a failure', async () => {
    seedSession();
    seedEnrolment([await hashRecoveryCode('ABCDE-FGHIJ')]);
    await renderAuth();

    const wrong = await verify('ZZZZZ-99999');
    expect(wrong.ok).toBe(false);
    expect(wrong.lockoutRemainingSeconds).toBeUndefined(); // 1 failure — no lock yet
    expect(readEnrolment().failCount).toBe(1);
  });
});

describe('the brute-force throttle through the provider', () => {
  it('locks after 5 wrong codes and rejects even a CORRECT code while locked', async () => {
    seedSession();
    seedEnrolment([await hashRecoveryCode('ABCDE-FGHIJ')]);
    await renderAuth();

    for (let i = 1; i <= 4; i++) {
      const r = await verify('111111');
      expect(r.ok).toBe(false);
      expect(r.lockoutRemainingSeconds).toBeUndefined();
    }
    // 5th failure arms the 30 s lock
    const fifth = await verify('111111');
    expect(fifth.ok).toBe(false);
    expect(fifth.lockoutRemainingSeconds).toBeGreaterThan(0);
    expect(fifth.lockoutRemainingSeconds).toBeLessThanOrEqual(30);
    expect(readEnrolment().failCount).toBe(5);

    // the lock rejects the CORRECT TOTP code without verifying it
    const locked = await verify(await totpCode(SECRET));
    expect(locked.ok).toBe(false);
    expect(locked.lockoutRemainingSeconds).toBeGreaterThan(0);
  });

  it('a correct TOTP code verifies and resets the failure counter', async () => {
    seedSession();
    seedEnrolment([await hashRecoveryCode('ABCDE-FGHIJ')]);
    await renderAuth();

    const bad = await verify('111111');
    expect(bad.ok).toBe(false);

    const good = await verify(await totpCode(SECRET));
    expect(good).toEqual({ ok: true });
    expect(readEnrolment().failCount).toBe(0);
    expect(readEnrolment().lockedUntil).toBeUndefined();
  });
});

describe('legacy plaintext migration on mount', () => {
  it('hashes stored plaintext recovery codes; the paper copy still works', async () => {
    seedSession();
    seedEnrolment(['ABCDE-FGHIJ']); // plaintext, pre-wave-10 record
    await renderAuth();

    await waitFor(() => {
      expect(readEnrolment().recoveryCodes[0]).toMatch(/^[0-9a-f]{64}$/);
    });

    // and the code the user saved on paper still unlocks the account
    const viaPaper = await verify('ABCDE-FGHIJ');
    expect(viaPaper).toEqual({ ok: true, usedRecovery: true });
  });
});
