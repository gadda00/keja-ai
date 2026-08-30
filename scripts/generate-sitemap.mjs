#!/usr/bin/env node
/**
 * Sitemap generator — keeps public/sitemap.xml complete automatically.
 *
 * Extracts route data (property IDs incl. Auto-Pilot listings, article slugs)
 * from the source data files and emits the full URL set. Runs in CI before
 * every deploy so the sitemap never rots when inventory grows.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = 'https://gadda00.github.io/keja-ai'
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
  { loc: '/about', priority: '0.6', changefreq: 'monthly' },
  { loc: '/contact', priority: '0.6', changefreq: 'monthly' },
  { loc: '/dashboard', priority: '0.4', changefreq: 'weekly' },
  { loc: '/manage', priority: '0.5', changefreq: 'weekly' },
  { loc: '/compare', priority: '0.5', changefreq: 'weekly' },
  { loc: '/account', priority: '0.3', changefreq: 'monthly' },
  { loc: '/legal', priority: '0.3', changefreq: 'yearly' },
]

const propertyIds = [
  ...extractAutoIds('src/data/auto-listings.json'),
  ...extractIds('src/data/properties.ts'),
]
const articleSlugs = existsSync(resolve(ROOT, 'src/data/articles.ts')) ? extractArticleSlugs('src/data/articles.ts') : []

const urls = [
  ...STATIC_ROUTES.map((r) => ({ ...r, lastmod: today })),
  ...propertyIds.map((id) => ({ loc: `/properties/${id}`, priority: '0.7', changefreq: 'weekly', lastmod: today })),
  ...articleSlugs.map((slug) => ({ loc: `/insights/${slug}`, priority: '0.7', changefreq: 'monthly', lastmod: today })),
]

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${BASE}${u.loc === '/' ? '/' : u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`

writeFileSync(resolve(ROOT, 'public/sitemap.xml'), xml + '\n', 'utf8')
console.log(`[sitemap] wrote ${urls.length} URLs (${propertyIds.length} properties · ${articleSlugs.length} articles · ${STATIC_ROUTES.length} static)`)
