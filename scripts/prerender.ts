/**
 * Prerender — emit static, crawler-ready HTML for every public route
 * (audit F-03 Critical / P2-3).
 *
 * Problem: the platform is a hash-routed SPA inside a static export. Google
 * may render JS, but it treats the single index.html shell as one page —
 * every property, article and area page was invisible to search, and every
 * social share unfurled as the home page.
 *
 * Approach: after `next build`, clone the exported index.html once per
 * public route and inject, per page:
 *   - a real <title> + meta description + canonical + OG/Twitter tags
 *   - JSON-LD structured data (RealEstateListing / Article / Breadcrumb)
 *   - a <noscript> content summary (crawlable without JS)
 *   - a tiny inline boot script that sets location.hash before the bundle
 *     runs, so humans landing on the path URL boot straight into the view
 *
 * Vercel serves these files at path URLs (filesystem wins over the SPA
 * rewrite); the sitemap lists the same URLs. Runs under Bun so it can import
 * the TypeScript data modules directly — no fragile regex extraction.
 *
 * Usage:  bun scripts/prerender.ts    (expects out/ to exist)
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PROPERTIES, type Property } from '../src/data/properties';
import { ARTICLES } from '../src/data/articles';
import { NEIGHBORHOOD_GUIDES } from '../src/data/neighborhoods';
import { AUTO_PROPERTIES } from '../src/lib/autoListings';
import { SITE_URL } from '../src/config';
import {
  realEstateListingJsonLd,
  articleJsonLd,
  breadcrumbJsonLd,
} from '../src/lib/seo';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(ROOT, 'out');
const TEMPLATE = join(DIST, 'index.html');

if (!existsSync(TEMPLATE)) {
  console.error('[prerender] out/index.html not found — run the build first');
  process.exit(1);
}

const template = readFileSync(TEMPLATE, 'utf8');

/* ------------------------------ helpers ---------------------------------- */

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const escapeAttr = escapeHtml;

const clip = (s: string, n: number) => {
  const clean = s.replace(/\s+/g, ' ').trim();
  return clean.length <= n ? clean : `${clean.slice(0, n - 1).trimEnd()}…`;
};

const money = (n: number) => `KES ${n.toLocaleString('en-KE')}`;

interface PageSpec {
  /** route path, leading slash, no trailing slash (dirs get /index.html) */
  path: string;
  title: string;
  description: string;
  ogImage?: string;
  jsonLd?: object[];
  /** inner HTML for the <noscript> block */
  noscript: string;
}

function render(page: PageSpec): string {
  const canonical = `${SITE_URL}${page.path === '/' ? '/' : `${page.path}/`}`;
  const ogImage = page.ogImage ?? '/og-image.jpg';

  const head = [
    // (description is replaced in-place on the original tag — see render())
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:title" content="${escapeAttr(page.title)}" />`,
    `<meta property="og:description" content="${escapeAttr(page.description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${SITE_URL}${ogImage}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:site_name" content="Keja AI" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeAttr(page.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(page.description)}" />`,
    `<meta name="twitter:image" content="${SITE_URL}${ogImage}" />`,
    ...(page.jsonLd?.length
      ? [
          `<script type="application/ld+json" id="keja-prerender-jsonld">${JSON.stringify(
            page.jsonLd,
          )}</script>`,
        ]
      : []),
    // Boot the SPA straight into this route before any bundle executes.
    `<script>try{if(!location.hash||!location.hash.startsWith('#/')){location.hash=${JSON.stringify(
      page.path,
    )}}}catch(e){}</script>`,
  ].join('\n');

  let html = template;
  // 1. replace the title (first <title> in the document)
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(page.title)}</title>`);
  // 2. replace the description — Next emits self-closing tags with optional
  //    whitespace before "/>"; match both forms
  html = html.replace(
    /<meta name="description" content="[^"]*"\s*\/>/,
    `<meta name="description" content="${escapeAttr(page.description)}"/>`,
  );
  // 3. strip the default OG/Twitter cards + any existing canonical, then
  //    inject this page's complete set below (duplicate og: tags make
  //    scrapers unpredictable — first-wins on some, last-wins on others)
  html = html
    .replace(/<meta (?:property|name)="(?:og|twitter):[^"]*" content="[^"]*"\s*\/>/g, '')
    .replace(/<link rel="canonical" href="[^"]*"\s*\/>/g, '');
  // 4. inject our head block just before </head>
  html = html.replace('</head>', `${head}\n</head>`);
  // 5. noscript content right after <body...>
  html = html.replace(/(<body[^>]*>)/, `$1\n<noscript>${page.noscript}</noscript>`);
  return html;
}

function write(page: PageSpec) {
  const dir = join(DIST, page.path === '/' ? '' : page.path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), render(page), 'utf8');
}

const NOSCRIPT_STYLE =
  'font-family:-apple-system,system-ui,sans-serif;max-width:640px;margin:2rem auto;padding:0 1.25rem;color:#191612;line-height:1.6';

function listingSpec(p: Property): PageSpec {
  const monthly = p.purpose.includes('rent');
  const priceLabel = p.priceOnApplication
    ? 'Price on application'
    : `${money(p.price)}${monthly ? ' / month' : ''}`;
  const beds = p.bedrooms ? `${p.bedrooms} bed · ` : '';
  const baths = p.bathrooms ? `${p.bathrooms} bath · ` : '';
  const size = p.sizeSqm ? `${p.sizeSqm} sqm` : '';
  return {
    path: `/properties/${p.id}`,
    title: clip(`${p.title} — ${p.area}, ${p.county}`, 65),
    description: clip(
      `${p.type} in ${p.area}, ${p.county}. ${priceLabel}. Trust Score ${p.trustScore}/100 with verified evidence. ${p.description}`,
      158,
    ),
    ogImage: p.images[0],
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
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        sizeSqm: p.sizeSqm,
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
    noscript: `<div style="${NOSCRIPT_STYLE}"><h1>${escapeHtml(p.title)}</h1>
<p><strong>${escapeHtml(priceLabel)}</strong> · ${escapeHtml(`${beds}${baths}${size}`)} · ${escapeHtml(p.area)}, ${escapeHtml(p.county)}</p>
<p>${escapeHtml(clip(p.description, 420))}</p>
<p>Listed by ${escapeHtml(p.agency)} · Keja Trust Score ${p.trustScore}/100 · <a href="${SITE_URL}/properties/${p.id}/">View full listing</a></p></div>`,
  };
}

function articleSpec(a: (typeof ARTICLES)[number]): PageSpec {
  return {
    path: `/insights/${a.slug}`,
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
    noscript: `<div style="${NOSCRIPT_STYLE}"><h1>${escapeHtml(a.title)}</h1>
<p>${escapeHtml(a.excerpt)}</p>
<p>${escapeHtml(a.author)} · ${escapeHtml(a.date)} · ${a.minutes} min read · <a href="${SITE_URL}/insights/${a.slug}/">Read the full guide</a></p></div>`,
  };
}

function areaSpec(g: (typeof NEIGHBORHOOD_GUIDES)[number]): PageSpec {
  const summary = g.summary ?? g.tagline;
  return {
    path: `/areas/${g.slug}`,
    title: clip(`${g.name} area guide`, 65),
    description: clip(summary, 158),
    ogImage: g.hero?.base,
    jsonLd: [
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Area guides', path: '/areas' },
        { name: g.name, path: `/areas/${g.slug}` },
      ]),
    ],
    noscript: `<div style="${NOSCRIPT_STYLE}"><h1>${escapeHtml(g.name)} — area guide</h1>
<p>${escapeHtml(clip(summary, 420))}</p>
<p><a href="${SITE_URL}/areas/${g.slug}/">Open the full guide</a></p></div>`,
  };
}

/* ------------------------------ static sections -------------------------- */

const listings = [...PROPERTIES, ...AUTO_PROPERTIES];

const STATIC_PAGES: PageSpec[] = [
  {
    path: '/properties',
    title: 'Properties for sale & rent in Kenya',
    description:
      'Verified houses, apartments and land across Nairobi, Mombasa and Kenya\u2019s growth corridors — trust scores, evidence panels and honest pricing.',
    noscript: `<div style="${NOSCRIPT_STYLE}"><h1>Properties for sale &amp; rent in Kenya</h1>
<p>Browse ${listings.length} verified listings with Keja Trust Scores, evidence panels and honest pricing. <a href="${SITE_URL}/properties/">Open the marketplace</a></p></div>`,
  },
];

/* ------------------------------ run -------------------------------------- */

const MAX_DYNAMIC = 200;
const dynamic = [
  ...listings.slice(0, MAX_DYNAMIC).map(listingSpec),
  ...ARTICLES.map(articleSpec),
  ...NEIGHBORHOOD_GUIDES.map(areaSpec),
];

let count = 0;
for (const page of [...STATIC_PAGES, ...dynamic]) {
  write(page);
  count++;
}

console.log(
  `[prerender] wrote ${count} static pages ` +
    `(${dynamic.filter((d) => d.path.startsWith('/properties')).length} listings, ` +
    `${ARTICLES.length} articles, ${NEIGHBORHOOD_GUIDES.length} area guides, ${STATIC_PAGES.length} section)`,
);
if (listings.length > MAX_DYNAMIC) {
  console.warn(
    `[prerender] WARNING: ${listings.length - MAX_DYNAMIC} listings not prerendered (cap ${MAX_DYNAMIC}) — raise the cap or prune inventory`,
  );
}
