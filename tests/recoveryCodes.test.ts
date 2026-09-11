/**
 * Recovery-code hardening (wave 10).
 *
 * Contract: the plaintext "XXXXX-XXXXX" recovery codes exist exactly once —
 * on screen at enrolment. Storage holds only their SHA-256 hashes, and
 * enrolments written before this shipped (plaintext in localStorage) are
 * migrated in place on load, so the codes a user saved on paper keep
 * working while storage stops leaking them.
 */
import { describe, expect, it } from 'vitest';

import {
  hashLegacyRecoveryCodes,
  hashRecoveryCode,
  RECOVERY_CODE_FORMAT,
  RECOVERY_HASH_FORMAT,
  type TotpEnrolment,
} from '@/lib/totp';

const PLAIN = 'ABCDE-FGHIJ'; // valid XXXXX-XXXXX shape

const enrolment = (recoveryCodes: string[]): TotpEnrolment => ({
  secret: 'JBSWY3DPEHPK3PXP',
  confirmedAt: '2026-09-12T00:00:00Z',
  recoveryCodes,
  createdAt: '2026-09-12T00:00:00Z',
});

describe('hashRecoveryCode', () => {
  it('produces the 64-hex SHA-256 digest of the normalised code', async () => {
    const hash = await hashRecoveryCode(PLAIN);
    expect(hash).toMatch(RECOVERY_HASH_FORMAT);
    // deterministic + normalised (case, surrounding space)
    expect(await hashRecoveryCode(PLAIN.toLowerCase())).toBe(hash);
    expect(await hashRecoveryCode(`  ${PLAIN} `)).toBe(hash);
  });

  it('different codes hash differently', async () => {
    expect(await hashRecoveryCode('ABCDE-FGHIJ')).not.toBe(await hashRecoveryCode('ABCDE-FGHIK'));
  });
});

describe('format detection', () => {
  it('recognises the plaintext recovery-code shape', () => {
    expect(RECOVERY_CODE_FORMAT.test('ABCDE-FGHIJ')).toBe(true);
    expect(RECOVERY_CODE_FORMAT.test('ABCD-FGHIJ')).toBe(false); // 4 chars
    expect(RECOVERY_CODE_FORMAT.test('abcde-fghij')).toBe(false); // lowercase
    expect(RECOVERY_CODE_FORMAT.test('123456')).toBe(false);
  });

  it('recognises the stored hash shape', () => {
    expect(RECOVERY_HASH_FORMAT.test('a'.repeat(64))).toBe(true);
    expect(RECOVERY_HASH_FORMAT.test(PLAIN)).toBe(false);
    expect(RECOVERY_HASH_FORMAT.test('A'.repeat(64))).toBe(false); // uppercase ≠ hex we store
  });
});

describe('hashLegacyRecoveryCodes (the one-time migration)', () => {
  it('hashes plaintext codes and leaves hash-form codes untouched', async () => {
    const existingHash = await hashRecoveryCode('KLMNP-QRSTU');
    const map = {
      legacy: enrolment([PLAIN, 'VWXYZ-23456']),
      modern: enrolment([existingHash]),
    };
    const out = await hashLegacyRecoveryCodes(map);

    expect(out.legacy.recoveryCodes).toHaveLength(2);
    for (const c of out.legacy.recoveryCodes) expect(c).toMatch(RECOVERY_HASH_FORMAT);
    // the paper codes still verify against the migrated storage
    expect(out.legacy.recoveryCodes).toContain(await hashRecoveryCode(PLAIN));
    expect(out.legacy.recoveryCodes).toContain(await hashRecoveryCode('VWXYZ-23456'));

    expect(out.modern.recoveryCodes).toEqual([existingHash]); // not re-hashed
  });

  it('is idempotent (running it twice changes nothing)', async () => {
    const map = { u: enrolment([PLAIN]) };
    const once = await hashLegacyRecoveryCodes(map);
    const twice = await hashLegacyRecoveryCodes(once);
    expect(twice).toEqual(once);
  });

  it('handles a mixed list (some hashed, some not) and empty maps', async () => {
    const h = await hashRecoveryCode('KLMNP-QRSTU'); // different code, already hashed
    const out = await hashLegacyRecoveryCodes({
      mixed: enrolment([h, PLAIN]),
    });
    expect(out.mixed.recoveryCodes.filter((c) => c === h)).toHaveLength(1); // untouched
    expect(out.mixed.recoveryCodes).toContain(await hashRecoveryCode(PLAIN));
    expect(await hashLegacyRecoveryCodes({})).toEqual({});
  });
});
