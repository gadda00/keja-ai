/**
 * Admin host — the admin console's own territory: admin.keja.app.
 * ---------------------------------------------------------------------------
 * The admin console used to live at keja.app/#/admin behind a UI gate,
 * sharing the public shell. This module gives it its own address:
 *
 *   - admin.keja.app serves the same static build; the app shell detects
 *     the hostname, drops the public chrome (navbar / footer / marketing
 *     floats) and forces the #/admin route (KejaApp · AdminHostRouter).
 *   - On the main site, #/admin hands off to the subdomain (production
 *     hosts only — localhost and preview deployments keep the local
 *     console so dev/test flows never depend on DNS).
 *   - Cross-origin sessions: localStorage is per-origin, so a session on
 *     keja.app is invisible on admin.keja.app. The handoff carries the
 *     ADMIN account + its (already 2FA-verified) session across in a
 *     one-time, 90-second, URL-safe envelope: consumed on arrival,
 *     validated, installed, stripped from the address bar. The trust
 *     level is identical to the existing localStorage sessions (static
 *     build, no server-side authority — see AdminGate's scope note).
 *     Direct Google sign-in also works on the admin host once the OAuth
 *     client lists https://admin.keja.app (docs/ADMIN_SUBDOMAIN.md).
 *
 * Pure helpers — no React, importable from tests.
 */

/** The admin subdomain host (overridable for preview deployments). */
export const ADMIN_HOST = (process.env.NEXT_PUBLIC_ADMIN_HOST ?? 'admin.keja.app').toLowerCase();

/** 90 seconds: long enough for a redirect, short enough to kill replays
 *  of a URL left in history or a chat message. */
const HANDOFF_TTL_MS = 90_000;

/** True when the current window is served from the admin subdomain
 *  (admin.keja.app, or any admin.* host — admin.localhost for dev). */
export function isAdminHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === ADMIN_HOST || host.startsWith(`${ADMIN_HOST}.`) || host.startsWith('admin.');
}

/** The production main site hosts that redirect #/admin to the subdomain.
 *  Preview deployments (*.vercel.app), localhost and other mirrors keep
 *  the local console. */
export function isMainProductionHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (isAdminHost(host)) return false;
  return host === 'keja.app' || host === 'www.keja.app';
}

/** Absolute admin console URL (origin of the admin territory). */
export function adminConsoleOrigin(): string {
  return `https://${ADMIN_HOST}`;
}

/** URL-safe base64 codec that works in browsers AND Node tests without a
 *  single Node builtin — an earlier draft's `Buffer.from` fallback made
 *  webpack ship a ~24 kB buffer polyfill into the shared boot chunk for a
 *  dead branch (btoa always exists in browsers; btoa/atob and
 *  TextEncoder/TextDecoder are global in Node 16+ too). */
function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/* ------------------------------------------------------------------ */
/* Session handoff envelope                                            */
/* ------------------------------------------------------------------ */

/** The minimum the handoff needs to install a working session — the admin
 *  user record + the session record, mint-timestamped. */
export interface SessionHandoff {
  u: unknown;
  s: unknown;
  /** issued-at (epoch ms) — expiry is checked on arrival. */
  t: number;
}

/** Mint a one-time handoff envelope for the signed-in admin. Returns null
 *  when the account is not an admin (the envelope is admin-console-only:
 *  it must never ferry a regular account across origins) or the session
 *  has not cleared the 2FA wall (unverified sessions re-authenticate on
 *  arrival rather than crossing). */
export function encodeSessionHandoff(
  user: { id: string; role: string } | null,
  session: { mfaVerified?: boolean } | null,
  now = Date.now(),
): string | null {
  if (!user || user.role !== 'admin' || !session) return null;
  if (!session.mfaVerified) return null;
  const envelope: SessionHandoff = { u: user, s: session, t: now };
  return toBase64Url(JSON.stringify(envelope));
}

/** Shape check for a decoded envelope (both records parsed by the caller). */
export function decodeSessionHandoff(
  payload: string,
  now = Date.now(),
): SessionHandoff | null {
  try {
    const parsed = JSON.parse(fromBase64Url(payload)) as Partial<SessionHandoff>;
    if (typeof parsed.t !== 'number') return null;
    if (!parsed.u || typeof parsed.u !== 'object') return null;
    if (!parsed.s || typeof parsed.s !== 'object') return null;
    if (now - parsed.t > HANDOFF_TTL_MS || parsed.t - now > 60_000) return null; // expired / clock-skewed
    return parsed as SessionHandoff;
  } catch {
    return null; // tampered / truncated payload — never throw on untrusted input
  }
}

/** Validate a decoded envelope against the account + session contracts.
 *  Accepts the parsed shapes as predicates so the installer (browser) and
 *  the tests (node) share one ruleset. */
export function handoffGrantsAdmin(
  handoff: SessionHandoff,
  checks: {
    userValid: boolean;
    sessionValid: boolean;
    user: { id: string; role: string } | null;
    session: { userId: string; expiresAt: string; mfaVerified: boolean } | null;
    now?: number;
  },
): boolean {
  const { userValid, sessionValid, user, session } = checks;
  if (!userValid || !sessionValid || !user || !session) return false;
  if (user.role !== 'admin') return false; // ferry is admin-only
  if (session.userId !== user.id) return false; // session must be the user's own
  if (!session.mfaVerified) return false; // unverified sessions re-authenticate on arrival
  const now = checks.now ?? Date.now();
  return new Date(session.expiresAt).getTime() > now; // session still live
}
