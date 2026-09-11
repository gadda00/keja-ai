/**
 * Password hashing — the extracted crypto core of the auth layer
 * (audit F-01 remediation).
 *
 * History: the original layer hashed passwords with unsalted DJB2 (a 1997
 * non-cryptographic string hash) — trivially reversible and collision-prone.
 *
 * This module uses PBKDF2-SHA-256 (100k iterations, 16-byte random salt)
 * via the WebCrypto API — real cryptographic hashing, available in every
 * browser and Capacitor WebView the platform targets. Stored format:
 *
 *   k2$<iterations>$<salt-b64>$<hash-b64>
 *
 * Accounts created before this change carry `k1$…` DJB2 hashes; those are
 * still accepted on sign-in and transparently re-hashed to k2 on success
 * (standard hash-migration pattern), so no user is ever locked out.
 *
 * Honest scope: client-side hashing can never be server-side security.
 * Until the Phase-2 auth service ships (audit Ch. 24), registration
 * explicitly warns that accounts live only on this device, and the demo
 * credential set is clearly labelled in the UI.
 *
 * Extracted from src/lib/auth.tsx so the crypto surface is unit-testable
 * without the React context (same functions, no behaviour change).
 */

export const PBKDF2_ITERATIONS = 100_000;

const toB64 = (buf: ArrayBuffer | Uint8Array): string => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};

const fromB64 = (b64: string): Uint8Array => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

async function deriveBits(pw: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pw),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations, hash: 'SHA-256' },
    key,
    256,
  );
  return new Uint8Array(bits);
}

/** Hash a password with PBKDF2 (random salt) → `k2$iter$salt$hash`. */
export async function hashPassword(pw: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveBits(pw, salt, PBKDF2_ITERATIONS);
  return `k2$${PBKDF2_ITERATIONS}$${toB64(salt)}$${toB64(hash)}`;
}

/** Legacy DJB2 (pre-migration accounts only). */
export const legacyDjb2 = (pw: string): string => {
  let h = 5381;
  for (let i = 0; i < pw.length; i++) h = ((h << 5) + h + pw.charCodeAt(i)) | 0;
  return `k1$${(h >>> 0).toString(36)}$${pw.length}`;
};

/** Constant-time-ish byte comparison (no early exit on first difference).
 * Not a true constant-time comparison, but removes the trivial timing
 * oracle of `===` on the full digest. */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Verify a password against a stored k2 (PBKDF2) or k1 (legacy) hash. */
export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  if (stored.startsWith('k2$')) {
    // stored format is k2$iterations$saltB64$hashB64 — exactly four fields,
    // so one element is skipped (the 'k2' prefix), not two. The original
    // double-skip destructuring read the SALT as the iteration count
    // (Number('YzvO…') = NaN) and made every k2 verification fail.
    const [, iterStr, saltB64, hashB64] = stored.split('$');
    const iterations = Number(iterStr);
    if (!Number.isFinite(iterations) || iterations < 1 || iterations > 10_000_000) return false;
    try {
      const derived = await deriveBits(pw, fromB64(saltB64), iterations);
      return timingSafeEqual(derived, fromB64(hashB64));
    } catch {
      return false;
    }
  }
  if (stored.startsWith('k1$')) return legacyDjb2(pw) === stored;
  return false;
}

/** True when the stored hash is the legacy format and should be upgraded. */
export const isLegacyHash = (stored: string | undefined): boolean => !!stored?.startsWith('k1$');

/* Pre-computed PBKDF2 hashes for the documented demo credentials (public,
 * fixed salts — these accounts exist only to demonstrate the platform).
 * Passwords: admin123 / agent123 / investor123. */
export const DEMO_PW_HASHES: Record<string, string> = {
  'admin@demo.keja.app':
    'k2$100000$odDG6D8CcyfYRhBj9KxYpg==$kIoSCX690Z9pEaqQ5wy6x1anWh8J0GVBxvlTWukTJio=',
  'agent@demo.keja.app':
    'k2$100000$GfPNMI8UVbP6CaaCsOMtGg==$ruXM9tgewhP01wNqAUNP1D1SuixQPV0oGZPEVUQZfhc=',
  'investor@demo.keja.app':
    'k2$100000$AzbcurBbNNdePkLmsrtvNg==$mVsO+am9YxdX5CQCmhiRqPorF8IyfZX2tFv0g2hIilE=',
};
