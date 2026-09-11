#!/usr/bin/env node
/**
 * Sitemap generator — keeps public/sitemap.xml complete automatically.
 *
 * Extracts route data (property IDs incl. Auto-Pilot listings, article slugs)
 * from the source data files and emits the full URL set. Runs in CI before
 * every deploy so the sitemap never rots when inventory grows.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// Canonical origin is keja.app; GitHub Pages CI overrides via SITE_URL.
const BASE = process.env.SITE_URL ?? 'https://keja.app'
const today = new Date().toISOString().slice(0, 10)

/* ------------------------------ data extraction ---------------------------- */

function extractIds(path) {
  const src = readFileSync(resolve(ROOT, path), 'utf8')
  return [...src.matchAll(/id:\s*'(KJA-[A-Z0-9]+)'/g)].map((m) => m[1])
}

function extractArticleSlugs(path) {
  const src = readFileSync(resolve(ROOT, path), 'utf8')
  return [...src.matchAll(/slug:\s*'([a-z0-9-]+)'/g)].map((m) => m[1])
}

function extractGuideSlugs(path) {
  if (!existsSync(resolve(ROOT, path))) return []
  const src = readFileSync(resolve(ROOT, path), 'utf8')
  return [...src.matchAll(/slug:\s*'([a-z0-9-]+)'/g)].map((m) => m[1])
}

function extractAutoIds(path) {
  if (!existsSync(resolve(ROOT, path))) return []
  const data = JSON.parse(readFileSync(resolve(ROOT, path), 'utf8'))
  return (data.listings ?? []).map((l) => l.id)
}

const STATIC_ROUTES = [
  { loc: '/', priority: '1.0', changefreq: 'daily' },
  { loc: '/properties', priority: '0.9', changefreq: 'hourly' },
  { loc: '/tokenize', priority: '0.9', changefreq: 'daily' },
  { loc: '/ask', priority: '0.8', changefreq: 'weekly' },
  { loc: '/invest', priority: '0.8', changefreq: 'weekly' },
  { loc: '/trust', priority: '0.8', changefreq: 'weekly' },
  { loc: '/insights', priority: '0.8', changefreq: 'weekly' },
  { loc: '/ecosystem', priority: '0.7', changefreq: 'weekly' },
  { loc: '/partners', priority: '0.7', changefreq: 'weekly' },
  { loc: '/sell', priority: '0.7', changefreq: 'weekly' },
  { loc: '/valuation', priority: '0.6', changefreq: 'weekly' },
  { loc: '/develop', priority: '0.6', changefreq: 'weekly' },
  { loc: '/diaspora', priority: '0.6', changefreq: 'weekly' },
  { loc: '/about', priority: '0.6', changefreq: 'monthly' },
  { loc: '/contact', priority: '0.6', changefreq: 'monthly' },
  { loc: '/compare', priority: '0.5', changefreq: 'weekly' },
  { loc: '/legal', priority: '0.3', changefreq: 'yearly' },
]

// Private / crawl-budget-wasting routes are deliberately NOT listed here
// (account, admin, pro, manage, tenant, finance, transact, deal-analyst,
// portfolio) — robots.txt also disallows the admin surfaces, and none of
// them render meaningful content to a crawler (audit Ch. 7).

const propertyIds = [
  ...extractAutoIds('src/data/auto-listings.json'),
  ...extractIds('src/data/properties.ts'),
]
const articleSlugs = existsSync(resolve(ROOT, 'src/data/articles.ts')) ? extractArticleSlugs('src/data/articles.ts') : []
const guideSlugs = extractGuideSlugs('src/data/neighborhoods.ts')

const urls = [
  ...STATIC_ROUTES.map((r) => ({ ...r, lastmod: today })),
  ...propertyIds.map((id) => ({ loc: `/properties/${id}`, priority: '0.7', changefreq: 'weekly', lastmod: today })),
  ...articleSlugs.map((slug) => ({ loc: `/insights/${slug}`, priority: '0.7', changefreq: 'monthly', lastmod: today })),
  ...guideSlugs.map((slug) => ({ loc: `/areas/${slug}`, priority: '0.8', changefreq: 'weekly', lastmod: today })),
]

// Trailing-slash canonical form — matches the prerendered directories
// (out/properties/KJA-001/index.html) and the Next.js trailingSlash config,
// so sitemap, canonical and served URL never disagree.
const locFor = (loc) => (loc === '/' ? `${BASE}/` : `${BASE}${loc}/`)

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${locFor(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`

// public/ serves dev + `next build`'s copy step; out/ is the authoritative
// post-build artifact (audit F-07 / P0-3: the sitemap must exist as a real
// XML file BEFORE the SPA rewrite, which Vercel's filesystem precedence
// guarantees for real files).
writeFileSync(resolve(ROOT, 'public/sitemap.xml'), xml + '\n', 'utf8')
const OUT = resolve(ROOT, 'out/sitemap.xml')
if (existsSync(resolve(ROOT, 'out'))) writeFileSync(OUT, xml + '\n', 'utf8')
console.log(`[sitemap] wrote ${urls.length} URLs (${propertyIds.length} properties · ${articleSlugs.length} articles · ${guideSlugs.length} area guides · ${STATIC_ROUTES.length} static)${existsSync(resolve(ROOT, 'out')) ? ' → public/ + out/' : ' → public/'}`)
