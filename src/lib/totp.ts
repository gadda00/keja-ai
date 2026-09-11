/**
 * TOTP — Time-based One-Time Passwords (RFC 6238) with Google Authenticator.
 * ---------------------------------------------------------------------------
 * The second factor of the KEJA account layer. Google handles "what you
 * know + who you are" (the account); this module adds "what you hold" —
 * a device-bound secret enrolled through the Google Authenticator app
 * (or any RFC 6238-compatible authenticator: Authy, 1Password, Microsoft
 * Authenticator, Aegis…).
 *
 * What this module owns (all pure / WebCrypto — no deps):
 *  - base32: RFC 4648 encode/decode (no padding, uppercase alphabet)
 *  - generateTotpSecret(): 160-bit crypto-random secret → base32
 *  - totpCode(): HMAC-SHA1 RFC 6238 generator (30s step, 6 digits)
 *  - verifyTotp(): constant-time-ish comparison, ±1 step clock drift
 *  - buildOtpauthUri(): the otpauth:// scheme Google Authenticator scans
 *
 * Honest scope (audit F-01 lineage): this is a static deployment — the
 * secret, its enrolment state and the verification happen on the client
 * and are stored on this device only. It hardens the admin console UI
 * against casual use of a borrowed/hijacked Google session on this
 * device; it is not a server-side policy until the Phase-2 auth service
 * ships (audit Ch. 24), where the same RFC 6238 module moves verbatim
 * to the server and the secret never touches the browser again.
 *
 * Everything here is a pure function (or takes injectables) so the vitest
 * suite covers it without a DOM (tests/totp.test.ts pins the RFC 6238
 * test vectors from the spec appendix).
 */

/* ------------------------------------------------------------------ */
/* Base32 (RFC 4648) — the alphabet Google Authenticator expects       */
/* ------------------------------------------------------------------ */

const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** bytes → base32 (no padding, uppercase). */
export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/** base32 → bytes (tolerates lowercase, spaces and '=' padding). */
export function base32Decode(input: string): Uint8Array {
  const clean = input.replace(/[=\s]/g, '').toUpperCase();
  if (clean.length === 0) return new Uint8Array(0);
  if (/[^A-Z2-7]/.test(clean)) throw new Error('Invalid base32 string.');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const c of clean) {
    value = (value << 5) | B32_ALPHABET.indexOf(c);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

/* ------------------------------------------------------------------ */
/* HMAC-SHA1 (WebCrypto) — injectable for tests                        */
/* ------------------------------------------------------------------ */

export type HmacSha1 = (key: Uint8Array, message: Uint8Array) => Promise<Uint8Array>;

/** Production HMAC-SHA1 via the WebCrypto SubtleCrypto API. */
export const subtleHmacSha1: HmacSha1 = async (key, message) => {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, message as unknown as BufferSource);
  return new Uint8Array(sig);
};

/* ------------------------------------------------------------------ */
/* RFC 6238 TOTP                                                        */
/* ------------------------------------------------------------------ */

export const TOTP_STEP_SECONDS = 30;
export const TOTP_DIGITS = 6;
/** Accept codes from the previous, current and next step (±30s drift). */
export const TOTP_DRIFT_STEPS = 1;

/** Generate a 160-bit (20-byte) secret — the RFC 4226 recommended size. */
export function generateTotpSecret(bytes: Uint8Array = crypto.getRandomValues(new Uint8Array(20))): string {
  return base32Encode(bytes);
}

/** HOTP (RFC 4226) at counter `n` — the inner function of TOTP. */
async function hotp(
  key: Uint8Array,
  counter: number,
  digits: number,
  hmac: HmacSha1,
): Promise<string> {
  const msg = new Uint8Array(8);
  // 64-bit big-endian counter (safe: counters here are < 2^32)
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    msg[i] = c & 0xff;
    c = Math.floor(c / 256);
  }
  const digest = await hmac(key, msg);
  // Dynamic truncation (RFC 4226 §5.3)
  const offset = digest[digest.length - 1] & 0x0f;
  const bin =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(bin % 10 ** digits).padStart(digits, '0');
}

/** TOTP code for `epochSeconds` (defaults to now). */
export async function totpCode(
  secretBase32: string,
  epochSeconds: number = Math.floor(Date.now() / 1000),
  hmac: HmacSha1 = subtleHmacSha1,
  step: number = TOTP_STEP_SECONDS,
  digits: number = TOTP_DIGITS,
): Promise<string> {
  return hotp(base32Decode(secretBase32), Math.floor(epochSeconds / step), digits, hmac);
}

/** No early-exit comparison of two equal-length strings. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export interface TotpVerifyResult {
  ok: boolean;
  /** The step offset the code matched at (−1, 0 or +1). */
  drift: number;
}

/** Verify a user-entered code: exact string match, ±1 step clock drift. */
export async function verifyTotp(
  secretBase32: string,
  code: string,
  epochSeconds: number = Math.floor(Date.now() / 1000),
  hmac: HmacSha1 = subtleHmacSha1,
  step: number = TOTP_STEP_SECONDS,
  digits: number = TOTP_DIGITS,
  maxDrift: number = TOTP_DRIFT_STEPS,
): Promise<TotpVerifyResult> {
  const normalised = code.replace(/\D/g, '');
  if (normalised.length !== digits) return { ok: false, drift: 0 };
  const counter = Math.floor(epochSeconds / step);
  for (let d = -maxDrift; d <= maxDrift; d++) {
    const candidate = await hotp(base32Decode(secretBase32), counter + d, digits, hmac);
    if (timingSafeEqual(candidate, normalised)) return { ok: true, drift: d };
  }
  return { ok: false, drift: 0 };
}

/* ------------------------------------------------------------------ */
/* otpauth:// URI — what the QR code encodes                           */
/* ------------------------------------------------------------------ */

/** Build the otpauth:// URI the authenticator app scans (Key-Uri Format). */
export function buildOtpauthUri(params: {
  secretBase32: string;
  account: string;
  issuer: string;
  digits?: number;
  period?: number;
}): string {
  const digits = params.digits ?? TOTP_DIGITS;
  const period = params.period ?? TOTP_STEP_SECONDS;
  const label = encodeURIComponent(`${params.issuer}:${params.account}`);
  const q = new URLSearchParams({
    secret: params.secretBase32,
    issuer: params.issuer,
    algorithm: 'SHA1',
    digits: String(digits),
    period: String(period),
  });
  return `otpauth://totp/${label}?${q.toString()}`;
}

/* ------------------------------------------------------------------ */
/* Enrolment record (persisted per account on this device)             */
/* ------------------------------------------------------------------ */

export interface TotpEnrolment {
  /** Base32 secret (160-bit). */
  secret: string;
  /** When the enrolment was confirmed by a first verified code. */
  confirmedAt: string;
  /** SHA-256 hashes of the recovery codes (single-use). The plaintext
   *  codes exist exactly once — on screen at enrolment; only these hashes
   *  are persisted, so a device snoop cannot read a usable code. */
  recoveryCodes: string[];
  /** Consecutive failed verifications (brute-force throttle state). */
  failCount?: number;
  /** ISO timestamp — verification attempts are rejected until this moment. */
  lockedUntil?: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Recovery-code hashing (storage hardening)                           */
/* ------------------------------------------------------------------ */

/** Match the plaintext recovery-code form ("XXXXX-XXXXX"). */
export const RECOVERY_CODE_FORMAT = /^[A-Z2-9]{5}-[A-Z2-9]{5}$/;
/** SHA-256 hex digest form (what is actually persisted). */
export const RECOVERY_HASH_FORMAT = /^[0-9a-f]{64}$/;

/** SHA-256 hex digest of a normalised recovery code — the stored form. */
export async function hashRecoveryCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code.trim().toUpperCase());
  const digest = await crypto.subtle.digest('SHA-256', data as unknown as BufferSource);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash every plaintext recovery code in an enrolment map (one-time
 * migration for records written before hashing shipped). Idempotent:
 * entries already in hash form are left untouched.
 */
export async function hashLegacyRecoveryCodes(
  map: Record<string, TotpEnrolment>,
): Promise<Record<string, TotpEnrolment>> {
  const out: Record<string, TotpEnrolment> = {};
  for (const [userId, enrolment] of Object.entries(map)) {
    const needsHashing = enrolment.recoveryCodes.some(
      (c) => !RECOVERY_HASH_FORMAT.test(c),
    );
    out[userId] = needsHashing
      ? {
          ...enrolment,
          recoveryCodes: await Promise.all(
            enrolment.recoveryCodes.map(async (c) =>
              RECOVERY_HASH_FORMAT.test(c) ? c : await hashRecoveryCode(c),
            ),
          ),
        }
      : enrolment;
  }
  return out;
}
