/**
 * Entity meta for detail routes (2026-09-12).
 *
 * The prerender script (scripts/prerender.ts) emits correct per-entity
 * <title>/description/OG/JSON-LD into the static HTML, but the hydrated SPA
 * previously never re-applied that meta — RouteMeta's fallback reverted the
 * title to "Keja AI" and stripped the JSON-LD after mount. This module is
 * the single source BOTH the views and the prerender derive from, so the
 * hydrated DOM and the crawler-facing HTML can never drift apart.
 */
import {
  articleJsonLd,
  breadcrumbJsonLd,
  realEstateListingJsonLd,
  type PageMetaOptions,
} from '@/lib/seo';

function clip(s: string, n: number): string {
  const clean = s.replace(/\s+/g, ' ').trim();
  return clean.length <= n ? clean : `${clean.slice(0, n - 1).trimEnd()}…`;
}

const money = (n: number) => `KES ${n.toLocaleString('en-KE')}`;

/** Normalise optional/nullish numbers for the JSON-LD builders. */
const num = (v: number | null | undefined) => (v == null ? undefined : v);

export interface ListingLike {
  id: string;
  title: string;
  description: string;
  price: number;
  priceOnApplication?: boolean;
  images: string[];
  area: string;
  county: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  sizeSqm?: number | null;
  agency: string;
  listedAt: string;
  trustScore: number;
  purpose: string[];
  type: string;
}

/** SEO meta for a property detail route — mirrors prerender.ts listingSpec. */
export function listingMeta(p: ListingLike): PageMetaOptions {
  const monthly = p.purpose.includes('rent');
  const priceLabel = p.priceOnApplication
    ? 'Price on application'
    : `${money(p.price)}${monthly ? ' / month' : ''}`;
  return {
    title: clip(`${p.title} — ${p.area}, ${p.county}`, 65),
    description: clip(
      `${p.type} in ${p.area}, ${p.county}. ${priceLabel}. Trust Score ${p.trustScore}/100 with verified evidence. ${p.description}`,
      158,
    ),
    image: p.images[0],
    jsonLd: [
      realEstateListingJsonLd({
        id: p.id,
        title: p.title,
        description: clip(p.description, 400),
        price: p.price,
        priceOnApplication: p.priceOnApplication,
        images: p.images.slice(0, 3),
        area: p.area,
        county: p.county,
        bedrooms: num(p.bedrooms),
        bathrooms: num(p.bathrooms),
        sizeSqm: p.sizeSqm ?? 0,
        agency: p.agency,
        listedAt: p.listedAt,
        monthly,
      }),
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Properties', path: '/properties' },
        { name: p.title, path: `/properties/${p.id}` },
      ]),
    ],
  };
}

export interface ArticleLike {
  title: string;
  excerpt: string;
  slug: string;
  date: string;
  author: string;
}

/** SEO meta for an insights article route — mirrors prerender.ts articleSpec. */
export function articleMeta(a: ArticleLike): PageMetaOptions {
  return {
    title: clip(a.title, 65),
    description: clip(a.excerpt, 158),
    jsonLd: [
      articleJsonLd({
        title: a.title,
        description: a.excerpt,
        slug: a.slug,
        publishedAt: a.date,
        author: a.author,
      }),
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Insights', path: '/insights' },
        { name: a.title, path: `/insights/${a.slug}` },
      ]),
    ],
  };
}

export interface AreaGuideLike {
  name: string;
  slug: string;
  summary?: string;
  tagline?: string;
  hero?: { base?: string };
}

/** SEO meta for an area guide route — mirrors prerender.ts areaSpec. */
export function areaMeta(g: AreaGuideLike): PageMetaOptions {
  const summary = g.summary ?? g.tagline ?? `${g.name} area guide`;
  return {
    title: clip(`${g.name} area guide`, 65),
    description: clip(summary, 158),
    image: g.hero?.base,
    jsonLd: [
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Area guides', path: '/areas' },
        { name: g.name, path: `/areas/${g.slug}` },
      ]),
    ],
  };
}
