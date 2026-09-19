/**
 * Wave 19 — "admin territory" regression tests.
 *
 * The admin console moved to its own subdomain (admin.keja.app). The
 * contracts that make that real (and keep it from quietly breaking):
 *
 *   1. HOST DETECTION — admin.keja.app (and admin.* dev hosts) are the
 *      admin territory; keja.app / www.keja.app are the main production
 *      site; preview + localhost are neither.
 *   2. SESSION HANDOFF — the cross-origin envelope ferries ONLY
 *      2FA-verified admin sessions, expires in 90 s, survives the
 *      base64url round-trip and rejects tampered / mismatched payloads.
 *   3. SHELL WIRING (source contracts) — the canonical-origin redirect
 *      exempts the admin host (without the exemption every admin-host
 *      visit would bounce back to keja.app — the bug this wave nearly
 *      shipped), the app shell renders AdminShell with forced noindex,
 *      and #/admin on the main site hands off instead of serving the
 *      local console.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  ADMIN_HOST,
  decodeSessionHandoff,
  encodeSessionHandoff,
  handoffGrantsAdmin,
  isAdminHost,
  isMainProductionHost,
} from '@/lib/adminHost';
import { sessionSchema, userAccountSchema } from '@/lib/boundaries';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf-8');

/* ------------------------------------------------------------------ */
/* 1. Host detection                                                    */
/* ------------------------------------------------------------------ */

describe('admin host detection (wave 19)', () => {
  it('recognises the admin territory and admin dev hosts', () => {
    expect(isAdminHost('admin.keja.app')).toBe(true);
    expect(isAdminHost('ADMIN.KEJA.APP')).toBe(true); // case-insensitive
    expect(isAdminHost('admin.localhost')).toBe(true); // local dev
    expect(isAdminHost('admin.vercel.app')).toBe(true); // any admin.* prefix
  });

  it('does not claim mirrors, previews or the main site', () => {
    expect(isAdminHost('keja.app')).toBe(false);
    expect(isAdminHost('www.keja.app')).toBe(false);
    expect(isAdminHost('localhost')).toBe(false);
    expect(isAdminHost('keja-ai.vercel.app')).toBe(false);
    expect(isAdminHost('adminkeja.app')).toBe(false); // prefix must be a label
    expect(isAdminHost('notadmin.keja.app')).toBe(false);
  });

  it('main production hosts are exactly keja.app / www.keja.app', () => {
    expect(isMainProductionHost('keja.app')).toBe(true);
    expect(isMainProductionHost('www.keja.app')).toBe(true);
    expect(isMainProductionHost('admin.keja.app')).toBe(false); // the territory itself
    expect(isMainProductionHost('localhost')).toBe(false);
    expect(isMainProductionHost('keja-ai.vercel.app')).toBe(false);
    expect(isMainProductionHost('staging.keja.app')).toBe(false);
  });

  it('the admin host constant is a bare hostname (used in URLs + copy)', () => {
    expect(ADMIN_HOST).not.toContain('://');
    expect(ADMIN_HOST).not.toContain('/');
    expect(ADMIN_HOST.startsWith('admin.')).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* 2. Session handoff                                                   */
/* ------------------------------------------------------------------ */

const adminUser = {
  id: 'u-admin',
  name: 'Platform Admin',
  email: 'torv54@gmail.com',
  role: 'admin',
  provider: 'google',
  status: 'active',
  createdAt: '2026-09-01T00:00:00.000Z',
  lastLoginAt: '2026-09-19T00:00:00.000Z',
  loginCount: 5,
} as const;

const baseUser = { ...adminUser, id: 'u-regular', role: 'user' } as const;

const liveSession = {
  token: 'a'.repeat(24),
  userId: 'u-admin',
  issuedAt: '2026-09-19T00:00:00.000Z',
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  remember: true,
  mfaVerified: true,
} as const;

describe('session handoff codec (wave 19)', () => {
  it('round-trips a valid admin envelope', () => {
    const payload = encodeSessionHandoff(adminUser, liveSession);
    expect(payload).toBeTruthy();
    const decoded = decodeSessionHandoff(payload as string);
    expect(decoded).not.toBeNull();
    expect(decoded?.t).toBeLessThanOrEqual(Date.now());
    expect(userAccountSchema.safeParse(decoded?.u).success).toBe(true);
    expect(sessionSchema.safeParse(decoded?.s).success).toBe(true);
  });

  it('is URL-safe (no +/= padding survives encodeURIComponent)', () => {
    const payload = encodeSessionHandoff(adminUser, liveSession) as string;
    expect(payload).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('refuses to mint envelopes for non-admins or unverified sessions', () => {
    expect(encodeSessionHandoff(baseUser, liveSession)).toBeNull();
    expect(encodeSessionHandoff(null, liveSession)).toBeNull();
    expect(encodeSessionHandoff(adminUser, null)).toBeNull();
    expect(
      encodeSessionHandoff(adminUser, { ...liveSession, mfaVerified: false }),
    ).toBeNull(); // 2FA wall: unverified sessions re-authenticate, never cross
  });

  it('expired and clock-skewed envelopes are dropped on arrival', () => {
    const stale = encodeSessionHandoff(adminUser, liveSession, Date.now() - 120_000);
    expect(decodeSessionHandoff(stale as string)).toBeNull(); // > 90 s TTL
    const future = encodeSessionHandoff(adminUser, liveSession, Date.now() + 120_000);
    expect(decodeSessionHandoff(future as string)).toBeNull(); // far-future mint
  });

  it('tampered / malformed payloads never throw', () => {
    expect(decodeSessionHandoff('!!!not-base64!!!')).toBeNull();
    expect(decodeSessionHandoff('')).toBeNull();
    expect(decodeSessionHandoff('e30')).toBeNull(); // "{}" — wrong shape
  });

  it('handoffGrantsAdmin enforces ownership, role, 2FA and live expiry', () => {
    const envelope = decodeSessionHandoff(
      encodeSessionHandoff(adminUser, liveSession) as string,
    ) as { u: unknown; s: unknown; t: number };

    const ok = (user: unknown, session: unknown, extra: Record<string, unknown> = {}) =>
      handoffGrantsAdmin(envelope, {
        userValid: userAccountSchema.safeParse(user).success,
        sessionValid: sessionSchema.safeParse(session).success,
        user: user as { id: string; role: string },
        session: session as { userId: string; expiresAt: string; mfaVerified: boolean },
        ...extra,
      });

    expect(ok(adminUser, liveSession)).toBe(true);
    expect(ok(baseUser, { ...liveSession, userId: 'u-regular' })).toBe(false); // not an admin
    expect(ok(adminUser, { ...liveSession, userId: 'u-someone-else' })).toBe(false); // session not the user's
    expect(ok(adminUser, { ...liveSession, mfaVerified: false })).toBe(false); // 2FA wall
    expect(
      ok(adminUser, { ...liveSession, expiresAt: new Date(Date.now() - 1).toISOString() }),
    ).toBe(false); // expired session
    expect(ok(adminUser, liveSession, { userValid: false })).toBe(false); // schema gate
    expect(ok(adminUser, liveSession, { sessionValid: false })).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* 3. Shell wiring (source contracts)                                   */
/* ------------------------------------------------------------------ */

describe('admin territory shell wiring (source contracts)', () => {
  const kejaApp = read('src/components/shell/KejaApp.tsx');

  it('the canonical-origin redirect exempts the admin host BEFORE the .keja.app mirror rule', () => {
    // the exemption must exist…
    expect(kejaApp).toContain('isAdminHost(here.hostname)');
    // …and sit above the mirror-squash guard that would otherwise capture it
    const exemption = kejaApp.indexOf('if (isAdminHost(here.hostname)) return;');
    const mirrorRule = kejaApp.indexOf("if (!here.hostname.endsWith('.keja.app')) return;");
    expect(exemption).toBeGreaterThan(-1);
    expect(mirrorRule).toBeGreaterThan(exemption);
  });

  it('the app shell branches on the admin host: AdminShell + forced noindex', () => {
    expect(kejaApp).toContain('isAdminHost(window.location.hostname)');
    expect(kejaApp).toContain('<AdminShell>');
    expect(kejaApp).toContain('forceNoindex={adminHost}');
    expect(kejaApp).toContain('Routes adminOnly');
  });

  it('every route on the admin host renders the gated console, never the marketplace', () => {
    expect(kejaApp).toContain('if (adminOnly && head !== \'admin\')');
  });

  it('#/admin on the main production site hands the session to the subdomain', () => {
    expect(kejaApp).toContain('MainHostAdminRedirect');
    expect(kejaApp).toContain('isMainProductionHost(window.location.hostname)');
    expect(kejaApp).toContain('encodeSessionHandoff(user, session)');
    expect(kejaApp).toContain("adminConsoleOrigin()}/?handoff=");
  });

  it('the handoff is validated against the account + session schemas on arrival', () => {
    expect(kejaApp).toContain('userAccountSchema.safeParse(handoff.u)');
    expect(kejaApp).toContain('sessionSchema.safeParse(handoff.s)');
  });

  it('the path→hash bridge boots the admin host into #/admin with no public mapping', () => {
    expect(kejaApp).toMatch(/isAdminHost\(window\.location\.hostname\)[\s\S]{0,200}window\.location\.hash = '#\/admin'/);
  });

  it('the admin shell carries its own auth modal (the sign-in wall works on the territory)', () => {
    const adminBranch = kejaApp.slice(
      kejaApp.indexOf('<AdminShell>'),
      kejaApp.indexOf('</AdminShell>'),
    );
    expect(adminBranch).toContain('<AuthModal />');
  });

  it('the AuthModal treats the admin host as an intentional origin (no false mismatch note)', () => {
    const modal = read('src/components/shell/AuthModal.tsx');
    expect(modal).toContain('isAdminHost(window.location.hostname)) return false');
  });

  it('the /admin path on the main site redirects at the edge (vercel.json)', () => {
    const vercel = read('vercel.json');
    expect(vercel).toContain('"source": "/admin"');
    expect(vercel).toContain('https://admin.keja.app/');
  });

  it('config exposes the admin host (single source, env-overridable)', () => {
    const config = read('src/config/index.ts');
    expect(config).toContain("NEXT_PUBLIC_ADMIN_HOST ?? 'admin.keja.app'");
  });
});
