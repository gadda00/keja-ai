import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { asset, SITE, SITE_URL } from '@/config';

/** Default social image — matches the static tag shipped in index.html so a
 *  route without its own image resets to the site default instead of sharing
 *  the previous route's image (or dropping the card entirely).
 *  Absolute (SITE_URL + base): the OG/Twitter spec requires absolute URLs —
 *  relative paths make scrapers drop the share card entirely. */
const DEFAULT_OG_IMAGE = `${SITE_URL}${asset('og-image.jpg')}`;

const basePath = import.meta.env.BASE_URL;
/** Strips an already-prefixed deployment base (or the leading slash) so URL
 *  builders prefix exactly once — never …/keja-ai/keja-ai/… (a 404). */
const assetStripBase = (p: string) =>
  basePath !== '/' && p.startsWith(basePath) ? p.slice(basePath.length) : p.replace(/^\//, '');

/** Absolute URL for an image path (handles '' and '/x' inputs; http passthrough).
 *  Data sources store BOTH raw paths ('/og-image.jpg', guide heroes) and
 *  asset()-prefixed paths (property images) — assetStripBase normalizes so the
 *  deployment base is added exactly once. */
const absoluteImage = (path: string) =>
  path.startsWith('http') ? path : `${SITE_URL}${assetStripBase(path)}`;

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

const JSONLD_ID = 'keja-route-jsonld';

/** Replace (or remove) the per-route JSON-LD structured-data block. */
function setRouteJsonLd(data: object | object[] | null) {
  document.getElementById(JSONLD_ID)?.remove();
  if (!data) return;
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = JSONLD_ID;
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

export interface PageMetaOptions {
  title: string;
  description?: string;
  /** Route-specific OG image (absolute or asset() path). */
  image?: string;
  /** robots override — e.g. 'noindex' for soft-404 / private pages. */
  robots?: string;
  /** One structured-data object (or array) for this route. */
  jsonLd?: object | object[] | null;
}

/**
 * Per-route document title + meta description + canonical + OG/Twitter tags
 * + optional route-scoped JSON-LD structured data. Keeps social shares and
 * search snippets accurate on every route of the SPA.
 */
export function usePageMeta(
  title: string,
  description?: string,
  options?: Omit<PageMetaOptions, 'title' | 'description'>
) {
  const location = useLocation();
  useEffect(() => {
    const full = title.includes(SITE.name) ? title : `${title} — ${SITE.name}`;
    document.title = full;
    if (description) {
      upsertMeta('name', 'description', description);
      upsertMeta('property', 'og:description', description);
      upsertMeta('name', 'twitter:description', description);
    }
    upsertMeta('property', 'og:title', full);
    upsertMeta('name', 'twitter:title', full);
    if (options?.image) {
      const img = absoluteImage(options.image);
      upsertMeta('property', 'og:image', img);
      upsertMeta('name', 'twitter:image', img);
      upsertMeta('property', 'og:image:width', '1200');
      upsertMeta('property', 'og:image:height', '630');
    } else {
      // Reset to the site default so a route without its own image neither
      // keeps the previous route's image (stale unfurls) nor loses the card.
      upsertMeta('property', 'og:image', DEFAULT_OG_IMAGE);
      upsertMeta('name', 'twitter:image', DEFAULT_OG_IMAGE);
      upsertMeta('property', 'og:image:width', '1200');
      upsertMeta('property', 'og:image:height', '630');
    }
    if (options?.robots) upsertMeta('name', 'robots', options.robots);
    else document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.remove();
    // Canonical must match the sitemap/JSON-LD origin (SITE_URL) AND carry the
    // deployment base path — building it from the router's base-stripped
    // pathname makes it correct on every host (Pages, Netlify mirror, local),
    // always pointing at the canonical GitHub Pages URL.
    const canonical = `${SITE_URL}${import.meta.env.BASE_URL}${location.pathname.replace(/^\//, '')}`;
    upsertLink('canonical', canonical);
    upsertMeta('property', 'og:url', canonical);
    setRouteJsonLd(options?.jsonLd ?? null);
  }, [title, description, options?.image, options?.robots, options?.jsonLd, location.pathname]);
}

/* ------------------------- structured data builders ------------------------ */

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  // Defensive: also strip the deployment base if a caller (historically)
  // passed an already-prefixed path, so item URLs never double the base
  // (…/keja-ai/keja-ai/properties/… is a 404 inside structured data).
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${SITE_URL}${basePath}${assetStripBase(it.path)}`,
    })),
  };
}

export function realEstateListingJsonLd(p: {
  id: string;
  title: string;
  description: string;
  price: number;
  /** When true the vendor quotes no public price — the Offer omits price. */
  priceOnApplication?: boolean;
  images: string[];
  area: string;
  county: string;
  bedrooms?: number;
  bathrooms?: number;
  sizeSqm: number;
  agency: string;
  listedAt: string;
  monthly?: boolean;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: p.title,
    description: p.description,
    url: `${SITE_URL}${import.meta.env.BASE_URL}properties/${p.id}`,
    datePosted: p.listedAt,
    image: p.images.map((img) =>
      img.startsWith('http') ? img : `${SITE_URL}${basePath}${assetStripBase(img)}`
    ),
    offers: {
      '@type': 'Offer',
      // POA listings carry no price — an Offer with price 0 would
      // miscommunicate "free" to crawlers.
      ...(p.priceOnApplication ? {} : { price: p.price, priceCurrency: 'KES' }),
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'RealEstateAgent', name: p.agency },
    },
    ...(p.bedrooms ? { numberOfRooms: p.bedrooms } : {}),
    ...(p.bathrooms ? { numberOfBathroomsTotal: p.bathrooms } : {}),
    ...(p.sizeSqm > 0
      ? { floorSize: { '@type': 'QuantitativeValue', value: p.sizeSqm, unitCode: 'MTK' } }
      : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: p.area,
      addressRegion: p.county,
      addressCountry: 'KE',
    },
  };
}

export function articleJsonLd(a: {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  author: string;
  image?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: a.description,
    datePublished: a.publishedAt,
    author: { '@type': 'Organization', name: a.author },
    publisher: { '@type': 'Organization', name: SITE.parent },
    mainEntityOfPage: `${SITE_URL}${import.meta.env.BASE_URL}insights/${a.slug}`,
    ...(a.image ? { image: [absoluteImage(a.image)] } : {}),
  };
}

export function faqJsonLd(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}
