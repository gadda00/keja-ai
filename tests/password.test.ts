/**
 * Password hashing — audit F-01 (Critical) regression tests.
 *
 * The original sin: unsalted DJB2. These tests pin the remediation so it
 * can never quietly regress:
 *   - hashes are salted (two hashes of one password differ)
 *   - verification is exact (right password passes, everything else fails)
 *   - the k1 legacy path still verifies (no user locked out by migration)
 *   - isLegacyHash flags exactly the k1 format
 *   - tampered iteration counts are rejected (DoS guard)
 *   - the committed demo-credential hashes verify against their documented
 *     passwords — the demo sign-ins depend on these specimens
 */
import {
  DEMO_PW_HASHES,
  PBKDF2_ITERATIONS,
  hashPassword,
  isLegacyHash,
  legacyDjb2,
  timingSafeEqual,
  verifyPassword,
} from '@/lib/password';

describe('hashPassword (PBKDF2-SHA-256)', () => {
  it('produces the documented k2$iterations$salt$hash format', async () => {
    const stored = await hashPassword('correct horse battery staple');
    const parts = stored.split('$');
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe('k2');
    expect(Number(parts[1])).toBe(PBKDF2_ITERATIONS);
    // 16-byte salt → 24 base64 chars; 32-byte SHA-256 → 44 base64 chars
    expect(parts[2]).toHaveLength(24);
    expect(parts[3]).toHaveLength(44);
  });

  it('uses a random salt per hash (no rainbow-table reuse)', async () => {
    const a = await hashPassword('same-password');
    const b = await hashPassword('same-password');
    expect(a).not.toBe(b);
  });

  it('verifies the correct password', async () => {
    const stored = await hashPassword('S3cure!pw');
    await expect(verifyPassword('S3cure!pw', stored)).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const stored = await hashPassword('S3cure!pw');
    await expect(verifyPassword('S3cure!pW', stored)).resolves.toBe(false);
    await expect(verifyPassword('', stored)).resolves.toBe(false);
    await expect(verifyPassword('s3cure!pw', stored)).resolves.toBe(false);
  });

  it('rejects malformed stored values without throwing', async () => {
    await expect(verifyPassword('x', 'not-a-hash')).resolves.toBe(false);
    await expect(verifyPassword('x', 'k2$abc$not$b64!')).resolves.toBe(false);
    await expect(verifyPassword('x', '')).resolves.toBe(false);
  });

  it('rejects out-of-bounds iteration counts (DoS guard)', async () => {
    // iteration count of 0 / negative / absurdly large must fail fast
    const stored = await hashPassword('pw');
    const parts = stored.split('$');
    const zeroIter = ['k2', '0', parts[2], parts[3]].join('$');
    const hugeIter = ['k2', '999999999', parts[2], parts[3]].join('$');
    const nanIter = ['k2', 'not-a-number', parts[2], parts[3]].join('$');
    await expect(verifyPassword('pw', zeroIter)).resolves.toBe(false);
    await expect(verifyPassword('pw', nanIter)).resolves.toBe(false);
    // 10M is the documented ceiling — just inside it the derivation is
    // allowed (slow but valid); far beyond it must be refused.
    await expect(verifyPassword('pw', hugeIter)).resolves.toBe(false);
  });
});

describe('legacy DJB2 path (k1 migration)', () => {
  it('legacyDjb2 produces the k1$hash$length format', () => {
    const stored = legacyDjb2('admin123');
    const parts = stored.split('$');
    expect(parts[0]).toBe('k1');
    expect(parts[2]).toBe('8'); // password length travelled with the hash
  });

  it('still verifies legacy passwords (no lockout on migration)', async () => {
    const stored = legacyDjb2('old-password');
    await expect(verifyPassword('old-password', stored)).resolves.toBe(true);
    await expect(verifyPassword('wrong', stored)).resolves.toBe(false);
  });

  it('isLegacyHash flags exactly the k1 prefix', () => {
    expect(isLegacyHash(legacyDjb2('x'))).toBe(true);
    expect(isLegacyHash('k1$anything')).toBe(true);
    expect(isLegacyHash(undefined)).toBe(false);
    expect(isLegacyHash('k2$100000$s$h')).toBe(false);
    expect(isLegacyHash('plaintext')).toBe(false);
  });
});

describe('committed demo-credential specimens', () => {
  const cases: [string, string][] = [
    ['admin@demo.keja.app', 'admin123'],
    ['agent@demo.keja.app', 'agent123'],
    ['investor@demo.keja.app', 'investor123'],
  ];

  it.each(cases)('%s verifies with its documented password', async (email, pw) => {
    const stored = DEMO_PW_HASHES[email];
    expect(stored).toBeDefined();
    await expect(verifyPassword(pw, stored)).resolves.toBe(true);
  });

  it('every demo hash is k2 (already migrated, not legacy)', () => {
    for (const stored of Object.values(DEMO_PW_HASHES)) {
      expect(stored.startsWith('k2$')).toBe(true);
      expect(isLegacyHash(stored)).toBe(false);
    }
  });
});

describe('timingSafeEqual', () => {
  it('matches identical arrays and rejects differences without early exit', () => {
    const a = new Uint8Array([1, 2, 3, 4]);
    expect(timingSafeEqual(a, new Uint8Array([1, 2, 3, 4]))).toBe(true);
    expect(timingSafeEqual(a, new Uint8Array([1, 2, 3, 5]))).toBe(false);
    expect(timingSafeEqual(a, new Uint8Array([1, 2, 3]))).toBe(false);
    expect(timingSafeEqual(new Uint8Array(), new Uint8Array())).toBe(true);
  });
});
