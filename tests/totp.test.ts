/**
 * TOTP (RFC 6238) — unit tests.
 *
 * Covers the pure surface of src/lib/totp.ts:
 *  - base32: RFC 4648 round-trip, known vectors, tolerant decoding
 *  - totpCode: the six RFC 6238 appendix-B test vectors (SHA-1)
 *  - verifyTotp: exact match, ±1 step drift acceptance, rejection rules
 *  - buildOtpauthUri: the Key-Uri Format Google Authenticator scans
 *  - generateTotpSecret: length, alphabet, uniqueness
 *
 * A Node-crypto HMAC is injected so the vectors are deterministic — no
 * reliance on jsdom's WebCrypto, no mocks of the algorithm under test.
 */
import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  base32Decode,
  base32Encode,
  buildOtpauthUri,
  generateTotpSecret,
  totpCode,
  verifyTotp,
  type HmacSha1,
} from '@/lib/totp';

/* ------------------------------------------------------------------ */
/* Deterministic HMAC-SHA1 (Node) injected into every call              */
/* ------------------------------------------------------------------ */

const nodeHmac: HmacSha1 = async (key, message) =>
  new Uint8Array(
    createHmac('sha1', Buffer.from(key)).update(Buffer.from(message)).digest(),
  );

const SECRET_ASCII = '12345678901234567890'; // RFC 6238 §Appendix B seed
const SECRET_B32 = base32Encode(new TextEncoder().encode(SECRET_ASCII));

/* ------------------------------------------------------------------ */
/* base32                                                              */
/* ------------------------------------------------------------------ */

describe('base32 (RFC 4648)', () => {
  it('encodes known vectors', () => {
    expect(base32Encode(new TextEncoder().encode(''))).toBe('');
    expect(base32Encode(new TextEncoder().encode('f'))).toBe('MY======'.replace(/=+$/, ''));
    expect(base32Encode(new TextEncoder().encode('fo'))).toBe('MZXQ');
    expect(base32Encode(new TextEncoder().encode('foobar'))).toBe('MZXW6YTBOI');
  });

  it('round-trips arbitrary bytes', () => {
    const bytes = crypto.getRandomValues(new Uint8Array(20));
    expect(base32Decode(base32Encode(bytes))).toEqual(bytes);
  });

  it('decodes tolerantly (lowercase, spaces, padding)', () => {
    expect(base32Decode('mzxw 6ytb oi==')).toEqual(base32Decode('MZXW6YTBOI'));
  });

  it('rejects characters outside the alphabet', () => {
    expect(() => base32Decode('MZXW6YTBO1')).toThrow(/base32/i); // 1 is invalid
  });
});

/* ------------------------------------------------------------------ */
/* RFC 6238 test vectors (SHA-1, 8 digits → also 6-digit truncations)   */
/* ------------------------------------------------------------------ */

describe('totpCode — RFC 6238 appendix B vectors', () => {
  const vectors = [
    { t: 59, eight: '94287082' },
    { t: 1111111109, eight: '07081804' },
    { t: 1111111111, eight: '14050471' },
    { t: 1234567890, eight: '89005924' },
    { t: 2000000000, eight: '69279037' },
    { t: 20000000000, eight: '65353130' },
  ];

  it.each(vectors)('T=$t → 8-digit $eight', async ({ t, eight }) => {
    await expect(totpCode(SECRET_B32, t, nodeHmac, 30, 8)).resolves.toBe(eight);
  });

  it('produces the 6-digit truncation of each vector', async () => {
    await expect(totpCode(SECRET_B32, 59, nodeHmac, 30, 6)).resolves.toBe('287082');
    await expect(totpCode(SECRET_B32, 1111111109, nodeHmac, 30, 6)).resolves.toBe('081804');
  });

  it('rolls over at the 30s step boundary', async () => {
    const atStep = await totpCode(SECRET_B32, 30, nodeHmac);
    const justBefore = await totpCode(SECRET_B32, 59, nodeHmac);
    const nextStep = await totpCode(SECRET_B32, 60, nodeHmac);
    expect(atStep).toBe(justBefore);
    expect(atStep).not.toBe(nextStep);
  });
});

/* ------------------------------------------------------------------ */
/* verifyTotp                                                          */
/* ------------------------------------------------------------------ */

describe('verifyTotp', () => {
  it('accepts the current-step code', async () => {
    const code = await totpCode(SECRET_B32, 1000, nodeHmac);
    await expect(verifyTotp(SECRET_B32, code, 1000, nodeHmac)).resolves.toEqual({
      ok: true,
      drift: 0,
    });
  });

  it('accepts ±1 step (clock drift) and reports the offset', async () => {
    const code = await totpCode(SECRET_B32, 1060, nodeHmac); // counter 35 (step 1050-1079)
    await expect(verifyTotp(SECRET_B32, code, 1030, nodeHmac)).resolves.toEqual({
      // verify counter 34 → the code is one step ahead (+1)
      ok: true,
      drift: 1,
    });
    await expect(verifyTotp(SECRET_B32, code, 1090, nodeHmac)).resolves.toEqual({
      // verify counter 36 → the code is one step behind (−1)
      ok: true,
      drift: -1,
    });
  });

  it('rejects codes outside the drift window', async () => {
    const code = await totpCode(SECRET_B32, 1000, nodeHmac);
    await expect(verifyTotp(SECRET_B32, code, 1180, nodeHmac)).resolves.toEqual({
      ok: false,
      drift: 0,
    });
  });

  it('rejects malformed codes without throwing', async () => {
    await expect(verifyTotp(SECRET_B32, '12345', 1000, nodeHmac)).resolves.toMatchObject({ ok: false });
    await expect(verifyTotp(SECRET_B32, 'abcdef', 1000, nodeHmac)).resolves.toMatchObject({ ok: false });
    await expect(verifyTotp(SECRET_B32, '', 1000, nodeHmac)).resolves.toMatchObject({ ok: false });
  });

  it('rejects a code minted from a different secret', async () => {
    const other = base32Encode(new TextEncoder().encode('wrong-secret-000'));
    const code = await totpCode(other, 1000, nodeHmac);
    await expect(verifyTotp(SECRET_B32, code, 1000, nodeHmac)).resolves.toMatchObject({ ok: false });
  });
});

/* ------------------------------------------------------------------ */
/* otpauth:// URI (Key-Uri Format)                                     */
/* ------------------------------------------------------------------ */

describe('buildOtpauthUri', () => {
  it('encodes issuer, account and parameters in the canonical format', () => {
    const uri = buildOtpauthUri({
      secretBase32: 'JBSWY3DPEHPK3PXP',
      account: 'torv54@gmail.com',
      issuer: 'Keja AI',
    });
    expect(uri).toBe(
      'otpauth://totp/Keja%20AI%3Atorv54%40gmail.com' +
        '?secret=JBSWY3DPEHPK3PXP&issuer=Keja+AI&algorithm=SHA1&digits=6&period=30',
    );
  });

  it('honours custom digit and period overrides', () => {
    const uri = buildOtpauthUri({
      secretBase32: 'JBSWY3DPEHPK3PXP',
      account: 'a@b.c',
      issuer: 'X',
      digits: 8,
      period: 60,
    });
    expect(uri).toContain('digits=8');
    expect(uri).toContain('period=60');
  });
});

/* ------------------------------------------------------------------ */
/* Secret generation                                                    */
/* ------------------------------------------------------------------ */

describe('generateTotpSecret', () => {
  it('produces a 32-char base32 string (160 bits)', () => {
    const s = generateTotpSecret();
    expect(s).toMatch(/^[A-Z2-7]{32}$/);
  });

  it('is crypto-random (no repeats across draws)', () => {
    const draws = new Set(Array.from({ length: 8 }, () => generateTotpSecret()));
    expect(draws.size).toBe(8);
  });

  it('decodes back to 20 bytes', () => {
    expect(base32Decode(generateTotpSecret()).length).toBe(20);
  });
});
