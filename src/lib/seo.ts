/**
 * Per-route SEO meta + JSON-LD structured data (audit F-08 / F-09, P0-4).
 *
 * Adapted from the pre-rebuild SEO layer for the Next.js hash router:
 *  - document title, meta description, OG/Twitter cards on every route
 *  - canonical URLs point at the PATH form (SITE_URL + path) — the same URLs
 *    the build-time prerender pass (scripts/prerender.mjs) emits as static
 *    HTML, so crawlers and share unfurls see identical content
 *  - route-scoped JSON-LD (RealEstateListing / Article / Breadcrumb / FAQ)
 *
 * All tag mutations are idempotent (upsert) so re-renders never duplicate
 * meta elements, and unmounting a view leaves the last meta in place —
 * the next route's usePageMeta call overwrites it deterministically.
 */
import { useEffect } from 'react';

import { asset, SITE, SITE_URL } from '@/config';

/** Default social image — matches the static tag shipped by Next's metadata
 *  so a route without its own image resets to the site default instead of
 *  sharing the previous route's image. Absolute: the OG/Twitter spec requires
 *  absolute URLs — relative paths make scrapers drop the share card. */
export const DEFAULT_OG_IMAGE = `${SITE_URL}${asset('og-image.jpg')}`;

/** Absolute URL for an image path ('/x' inputs; http(s) passthrough). */
export const absoluteImage = (path: string): string =>
  path.startsWith('http') ? path : `${SITE_URL}/${path.replace(/^\//, '')}`;

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
export function setRouteJsonLd(data: object | object[] | null) {
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
  /** Route-specific OG image (absolute or site-relative path). */
  image?: string;
  /** robots override — e.g. 'noindex' for private / soft-404 pages. */
  robots?: string;
  /** One structured-data object (or array) for this route. */
  jsonLd?: object | object[] | null;
}

/**
 * Per-route document title + meta description + canonical + OG/Twitter tags
 * + optional route-scoped JSON-LD. The `routePath` is the hash-router path
 * ('/properties/KJA-001'); canonicals are emitted in path form, matching the
 * prerendered static URLs and the sitemap.
 */
export function usePageMeta(opts: PageMetaOptions, routePath: string) {
  const { title, description, image, robots, jsonLd } = opts;
  const jsonLdKey = jsonLd ? JSON.stringify(jsonLd) : '';
  useEffect(() => {
    const full = title.includes(SITE.name) ? title : `${title} · ${SITE.name}`;
    document.title = full;
    if (description) {
      upsertMeta('name', 'description', description);
      upsertMeta('property', 'og:description', description);
      upsertMeta('name', 'twitter:description', description);
    }
    upsertMeta('property', 'og:title', full);
    upsertMeta('name', 'twitter:title', full);
    if (image) {
      const img = absoluteImage(image);
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
    if (robots) upsertMeta('name', 'robots', robots);
    else document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.remove();
    // Canonical matches the sitemap and the prerendered path URLs.
    const canonical = `${SITE_URL}${routePath === '/' ? '/' : routePath.replace(/^\//, '')}`;
    upsertLink('canonical', canonical);
    upsertMeta('property', 'og:url', canonical);
    setRouteJsonLd(jsonLd ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- serialised deps are exhaustive by construction
  }, [title, description, image, robots, routePath, jsonLdKey]);
}

/* ------------------------- structured data builders ------------------------ */

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${SITE_URL}${it.path.replace(/^\//, '')}`,
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
    url: `${SITE_URL}/properties/${p.id}`,
    datePosted: p.listedAt,
    image: p.images.map((img) => absoluteImage(img)),
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
    mainEntityOfPage: `${SITE_URL}/insights/${a.slug}`,
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

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    legalName: SITE.parent,
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}${asset('og-image.jpg')}`,
    email: SITE.email,
    telephone: SITE.phone,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Nairobi',
      addressCountry: 'KE',
    },
    sameAs: [SITE.parentSiteUrl],
  };
}
