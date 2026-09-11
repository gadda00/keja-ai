/**
 * Keja AI — site configuration (Next.js edition).
 * Single source of truth for brand, contact and canonical-origin facts.
 * All env access is build-time inlined (NEXT_PUBLIC_*), safe for static export.
 */

export const SITE = {
  name: 'Keja AI',
  fullName: 'Keja AI by Chacadom',
  tagline: 'Africa\u2019s Real Estate Intelligence & Trust Infrastructure',
  secondaryTagline: 'Discover. Verify. Analyse. Finance. Invest. Transact. Manage.',
  parent: 'Chacadom Investments',
  // digits-only international format; overridable via NEXT_PUBLIC_WHATSAPP.
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? '254108611387',
  email: 'info@chacadom.com',
  /** Public administrator contact (shown on the admin gate + Trust Center). */
  adminEmail: 'torv54@gmail.com',
  phone: '+254 108 611 387',
  offices: 'Westlands, Nairobi · Kenya',
  founded: '2026',
  swahiliNote: '\u201CKeja\u201D is Swahili for home.',
  parentSiteUrl: 'https://gadda00.github.io/chacadom/',
};

/**
 * Base-path aware asset URL. The Next.js build serves public/ from the
 * configured basePath (root for keja.app, subpath for the Pages mirror).
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const asset = (path: string) =>
  `${BASE_PATH}/${path.replace(/^\//, '')}`;

export const whatsappLink = (message?: string) =>
  `https://wa.me/${SITE.whatsapp}${message ? `?text=${encodeURIComponent(message)}` : ''}`;

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'sw', label: 'Kiswahili' },
  { code: 'fr', label: 'Fran\u00E7ais' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

/**
 * Google Sign-In (Google Identity Services) — real Google accounts.
 *
 * When NEXT_PUBLIC_GOOGLE_CLIENT_ID is set (build-time inlined, static-safe),
 * the auth modal renders the real "Sign in with Google" button and the
 * returned ID token is validated client-side (issuer / audience / expiry /
 * email_verified). Without it, the platform stays fully usable through the
 * clearly-labelled demo accounts + email sign-in.
 *
 * See docs/GOOGLE_AUTH_SETUP.md for the 5-minute activation runbook
 * (Google Cloud Console → OAuth client → Vercel env var → redeploy).
 */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

/**
 * Comma-separated allowlist of Google account emails that are granted the
 * admin role on Google sign-in (NEXT_PUBLIC_ADMIN_EMAILS). Example:
 *   NEXT_PUBLIC_ADMIN_EMAILS=torv54@gmail.com,ops@chacadom.com
 * Emails are compared case-insensitively; allowlisting can upgrade a
 * matching account to admin but never downgrades an existing admin.
 * Defaults to the public administrator account so the platform has an
 * owner even when the env var is not set on a deployment.
 */
export const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? SITE.adminEmail)
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * Canonical site origin — single source of truth for SEO and deep links.
 * keja.app is the canonical home.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://keja.app'
).replace(/\/$/, '');

/** Absolute URL for a route path (handles both '' and '/x' inputs). */
export const siteUrl = (path = '') =>
  `${SITE_URL}${BASE_PATH}/${path.replace(/^\//, '')}`;
