/**
 * Section catalogue — the single source of truth for public section SEO.
 *
 * Three consumers must never disagree about a public section's identity:
 *  1. `KejaApp`'s RouteMeta — the hydrated SPA's per-route <title>/description;
 *  2. `scripts/prerender.ts` — the crawler-facing static HTML per section;
 *  3. `scripts/generate-sitemap.mjs` — the sitemap <loc> set.
 *
 * Before this module (2026-09-12) the sitemap advertised 17 static routes but
 * only /properties had prerendered HTML — 16 sitemap'd URLs served the generic
 * home shell (duplicate content / wasted crawl budget), and the SPA titles
 * were hand-duplicated inside KejaApp.tsx. Every section listed here now gets
 * a real prerendered page, a sitemap entry and the same hydrated meta.
 *
 * Private / app-state routes (account, admin, pro, manage, …) are NOT listed:
 * they are not crawl-worthy (robots.txt disallows the admin surfaces) and the
 * prerender deliberately does not emit shells for them.
 */

export interface SectionMetaEntry {
  /** Hash-router path — leading slash, no trailing slash. */
  path: string;
  title: string;
  description: string;
  /** Sitemap priority. */
  priority: string;
  /** Sitemap changefreq. */
  changefreq: string;
  /** Short honest summary for the prerendered <noscript> block. */
  noscript: string;
}

export const SECTION_META: SectionMetaEntry[] = [
  {
    path: '/properties',
    title: 'Properties for sale & rent in Kenya',
    description:
      'Verified houses, apartments and land across Nairobi, Mombasa and Kenya\u2019s growth corridors — with trust scores, evidence panels and honest pricing.',
    priority: '0.9',
    changefreq: 'hourly',
    noscript: 'Browse verified Kenyan listings with Keja Trust Scores, evidence panels and honest pricing.',
  },
  {
    path: '/tokenize',
    title: 'Tokenize — fractional real estate',
    description:
      'Learn how Keja tokenizes income-producing Kenyan real estate — trial marketplace, journey and regulatory readiness.',
    priority: '0.9',
    changefreq: 'daily',
    noscript: 'Keja\u2019s tokenization trial — how fractional ownership of Kenyan real estate would work, and the regulatory path.',
  },
  {
    path: '/ask',
    title: 'Ask Keja AI',
    description: 'Your AI property advisor for Kenya — search, qualify and hand off to a human expert.',
    priority: '0.8',
    changefreq: 'weekly',
    noscript: 'Ask Keja AI — grounded answers about Kenyan property, with sources and human handoff for regulated questions.',
  },
  {
    path: '/invest',
    title: 'Investment calculators',
    description: 'ROI, mortgage and affordability calculators tuned to Kenyan market realities.',
    priority: '0.8',
    changefreq: 'weekly',
    noscript: 'ROI, mortgage and affordability calculators tuned to Kenyan market realities — yields, taxes and costs included.',
  },
  {
    path: '/trust',
    title: 'Trust Center',
    description:
      'How Keja verifies listings, scores trust and stays honest — claims, evidence and methodology.',
    priority: '0.8',
    changefreq: 'weekly',
    noscript: 'How Keja verifies listings, scores trust and stays honest — the claims register, evidence model and methodology.',
  },
  {
    path: '/insights',
    title: 'Insights',
    description: 'Long-form guides to buying, financing and investing in Kenyan real estate.',
    priority: '0.8',
    changefreq: 'weekly',
    noscript: 'Long-form guides to buying, financing and investing in Kenyan real estate.',
  },
  {
    path: '/ecosystem',
    title: 'Ecosystem',
    description: 'The full Keja platform map — every product surface and how they connect.',
    priority: '0.7',
    changefreq: 'weekly',
    noscript: 'The full Keja platform map — every product surface and how they connect.',
  },
  {
    path: '/partners',
    title: 'Partners',
    description: 'The Keja partner ecosystem — agencies, valuers, lawyers and financiers.',
    priority: '0.7',
    changefreq: 'weekly',
    noscript: 'The Keja partner ecosystem — agencies, valuers, lawyers and financiers.',
  },
  {
    path: '/sell',
    title: 'List a property',
    description: 'Publish a property to the Keja marketplace with AI-assisted pricing and verification-ready evidence.',
    priority: '0.7',
    changefreq: 'weekly',
    noscript: 'Publish a property to the Keja marketplace with AI-assisted pricing and verification-ready evidence.',
  },
  {
    path: '/valuation',
    title: 'Valuation desk',
    description: 'Instant property valuations anchored to Kenyan comparables.',
    priority: '0.6',
    changefreq: 'weekly',
    noscript: 'Instant property valuations anchored to Kenyan comparables.',
  },
  {
    path: '/develop',
    title: 'Developer portal',
    description: 'Partner with Keja to move inventory with data-backed pricing and reach.',
    priority: '0.6',
    changefreq: 'weekly',
    noscript: 'Partner with Keja to move inventory with data-backed pricing, portals and off-plan reach.',
  },
  {
    path: '/diaspora',
    title: 'Diaspora hub',
    description: 'Buy and oversee Kenyan property from abroad — verified evidence and remote processes.',
    priority: '0.6',
    changefreq: 'weekly',
    noscript: 'Buy and oversee Kenyan property from abroad — verified evidence, remote viewings and management.',
  },
  {
    path: '/about',
    title: 'About Keja AI',
    description: 'The team and mission behind Keja — trusted African real estate infrastructure.',
    priority: '0.6',
    changefreq: 'monthly',
    noscript: 'The team and mission behind Keja — trusted African real estate infrastructure.',
  },
  {
    path: '/contact',
    title: 'Contact',
    description: 'Talk to the Keja team — WhatsApp, email or visit the Nairobi office.',
    priority: '0.6',
    changefreq: 'monthly',
    noscript: 'Talk to the Keja team — WhatsApp, email or visit the Nairobi office.',
  },
  {
    path: '/compare',
    title: 'Compare properties',
    description: 'Side-by-side comparison of up to four properties — price, yield, trust and evidence.',
    priority: '0.5',
    changefreq: 'weekly',
    noscript: 'Side-by-side comparison of up to four properties — price, yield, trust and evidence.',
  },
  {
    path: '/legal',
    title: 'Legal & privacy',
    description: 'Terms of use and privacy policy — Kenya Data Protection Act aligned.',
    priority: '0.3',
    changefreq: 'yearly',
    noscript: 'Terms of use and privacy policy — Kenya Data Protection Act aligned.',
  },
];

/** Lookup by route path — O(1) access for RouteMeta. */
export const SECTION_META_BY_PATH: Record<string, { title: string; description: string }> =
  Object.fromEntries(SECTION_META.map((s) => [s.path, { title: s.title, description: s.description }]));
