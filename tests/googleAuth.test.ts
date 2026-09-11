/**
 * Google Identity Services integration — unit tests.
 *
 * Covers the pure surface of src/lib/googleAuth.ts:
 *  - decodeIdToken: round-trip, malformed inputs
 *  - validateIdTokenClaims: issuer / audience / expiry / email_verified rules
 *  - roleForEmail: admin allowlist mapping (case-insensitivity, no-match)
 *  - isPictureUrl: URL pictures (Google) vs colour hexes (demo accounts)
 *
 * The GIS script loader itself is DOM/network dependent and is exercised
 * by the build + manual QA; everything security-relevant about the token
 * handling is pinned here.
 */
import { describe, expect, it } from 'vitest';

import {
  decodeIdToken,
  isPictureUrl,
  roleForEmail,
  validateIdTokenClaims,
} from '@/lib/googleAuth';

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const b64url = (obj: unknown): string => {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const makeJwt = (claims: Record<string, unknown>): string =>
  `.${b64url(claims)}.`; // header signature irrelevant to the decoder

const NOW = 1_800_000_000_000; // fixed epoch ms
const CLIENT_ID = 'test-client-id.apps.googleusercontent.com';

const validClaims = {
  iss: 'https://accounts.google.com',
  aud: CLIENT_ID,
  sub: '110169484474387276334',
  exp: Math.floor(NOW / 1000) + 3600,
  iat: Math.floor(NOW / 1000) - 10,
  email: 'clive@chacadom.com',
  email_verified: true,
  name: 'Clive Mwangi',
  picture: 'https://lh3.googleusercontent.com/a/photo=s96-c',
};

/* ------------------------------------------------------------------ */
/* decodeIdToken                                                        */
/* ------------------------------------------------------------------ */

describe('decodeIdToken', () => {
  it('round-trips the payload claims', () => {
    const claims = decodeIdToken(makeJwt(validClaims));
    expect(claims.email).toBe('clive@chacadom.com');
    expect(claims.aud).toBe(CLIENT_ID);
    expect(claims.name).toBe('Clive Mwangi');
  });

  it('rejects tokens that are not three-segment JWTs', () => {
    expect(() => decodeIdToken('not-a-jwt')).toThrow(/malformed/i);
    expect(() => decodeIdToken('a.b')).toThrow(/malformed/i);
  });

  it('rejects payloads that are not JSON objects', () => {
    expect(() => decodeIdToken(`.${b64url([1, 2, 3])}.`)).toThrow(/malformed/i);
    expect(() => decodeIdToken(`.${b64url('string')}.`)).toThrow(/malformed/i);
  });
});

/* ------------------------------------------------------------------ */
/* validateIdTokenClaims                                                 */
/* ------------------------------------------------------------------ */

describe('validateIdTokenClaims', () => {
  it('accepts a well-formed token (https issuer)', () => {
    expect(validateIdTokenClaims(decodeIdToken(makeJwt(validClaims)), CLIENT_ID, NOW)).toEqual({
      ok: true,
    });
  });

  it('accepts the bare-string issuer variant', () => {
    const claims = { ...validClaims, iss: 'accounts.google.com' };
    expect(validateIdTokenClaims(decodeIdToken(makeJwt(claims)), CLIENT_ID, NOW).ok).toBe(true);
  });

  it('rejects a foreign issuer', () => {
    const claims = { ...validClaims, iss: 'https://evil.example.com' };
    const check = validateIdTokenClaims(decodeIdToken(makeJwt(claims)), CLIENT_ID, NOW);
    expect(check.ok).toBe(false);
    expect(check.reason).toMatch(/issuer/i);
  });

  it('rejects a token minted for a different app (audience)', () => {
    const claims = { ...validClaims, aud: 'someone-elses-app.apps.googleusercontent.com' };
    const check = validateIdTokenClaims(decodeIdToken(makeJwt(claims)), CLIENT_ID, NOW);
    expect(check.ok).toBe(false);
    expect(check.reason).toMatch(/different app/i);
  });

  it('rejects expired tokens (exp in the past)', () => {
    const claims = { ...validClaims, exp: Math.floor(NOW / 1000) - 1 };
    const check = validateIdTokenClaims(decodeIdToken(makeJwt(claims)), CLIENT_ID, NOW);
    expect(check.ok).toBe(false);
    expect(check.reason).toMatch(/expired/i);
  });

  it('rejects tokens exactly at their expiry instant', () => {
    const claims = { ...validClaims, exp: Math.floor(NOW / 1000) };
    expect(validateIdTokenClaims(decodeIdToken(makeJwt(claims)), CLIENT_ID, NOW).ok).toBe(false);
  });

  it('rejects tokens without an email claim', () => {
    const { email: _email, ...claims } = validClaims;
    const check = validateIdTokenClaims(decodeIdToken(makeJwt(claims)), CLIENT_ID, NOW);
    expect(check.ok).toBe(false);
    expect(check.reason).toMatch(/email/i);
  });

  it('rejects unverified email addresses', () => {
    const claims = { ...validClaims, email_verified: false };
    expect(validateIdTokenClaims(decodeIdToken(makeJwt(claims)), CLIENT_ID, NOW).ok).toBe(false);
  });

  it('accepts the string-encoded email_verified variant', () => {
    const claims = { ...validClaims, email_verified: 'true' };
    expect(validateIdTokenClaims(decodeIdToken(makeJwt(claims)), CLIENT_ID, NOW).ok).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* roleForEmail                                                         */
/* ------------------------------------------------------------------ */

describe('roleForEmail', () => {
  const allowlist = ['Clive@Chacadom.com', 'ops@keja.app'];

  it('maps allowlisted emails to admin (case-insensitive)', () => {
    expect(roleForEmail('clive@chacadom.com', allowlist)).toBe('admin');
    expect(roleForEmail('CLIVE@CHACADOM.COM', allowlist)).toBe('admin');
  });

  it('trims surrounding whitespace before matching', () => {
    expect(roleForEmail('  clive@chacadom.com  ', allowlist)).toBe('admin');
  });

  it('returns null for everyone else', () => {
    expect(roleForEmail('stranger@gmail.com', allowlist)).toBeNull();
    expect(roleForEmail('clive@chacadom.com.evil.io', allowlist)).toBeNull();
    expect(roleForEmail('', allowlist)).toBeNull();
  });

  it('returns null with an empty allowlist', () => {
    expect(roleForEmail('clive@chacadom.com', [])).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* isPictureUrl                                                         */
/* ------------------------------------------------------------------ */

describe('isPictureUrl', () => {
  it('recognises Google profile photo URLs', () => {
    expect(isPictureUrl('https://lh3.googleusercontent.com/a/ACg8ocJ=s96-c')).toBe(true);
    expect(isPictureUrl('http://example.com/me.png')).toBe(true);
  });

  it('rejects demo avatar colours and missing values', () => {
    expect(isPictureUrl('#a88727')).toBe(false);
    expect(isPictureUrl(undefined)).toBe(false);
    expect(isPictureUrl('')).toBe(false);
  });
});
