export const SITE = {
  name: 'Keja.ai',
  fullName: 'Keja.ai by Chacadom',
  tagline: 'Intelligent Real Estate. Verified Trust.',
  secondaryTagline: 'Smarter Investments.',
  parent: 'Chacadom Investments',
  // digits-only international format; overridable via VITE_WHATSAPP.
  // Default is the client's live line (same number that backs the
  // Chacadom vendor catalogue — see src/data/properties.ts agent entries).
  whatsapp: import.meta.env.VITE_WHATSAPP ?? '254108611387',
  email: 'hello@keja.ai',
  phone: '+254 108 611 387',
  offices: 'Westlands, Nairobi · Kenya',
  founded: '2026',
  swahiliNote: '"Keja" is Swahili for home.',
};

/** Base-path aware asset URL (works at root and under subpaths like GitHub Pages). */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

export const whatsappLink = (message?: string) =>
  `https://wa.me/${SITE.whatsapp}${message ? `?text=${encodeURIComponent(message)}` : ''}`;

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'sw', label: 'Kiswahili' },
  { code: 'fr', label: 'Français' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

/**
 * Canonical site origin — single source of truth for SEO, JSON-LD, sitemap
 * and robots. Override per-deploy with VITE_SITE_URL (e.g. when the custom
 * keja.ai domain lands); defaults to the current GitHub Pages host.
 */
export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? 'https://gadda00.github.io').replace(
  /\/$/,
  ''
);

/** Absolute URL for a route path (handles both '' and '/x' inputs). */
export const siteUrl = (path = '') =>
  `${SITE_URL}${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
