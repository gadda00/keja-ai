#!/usr/bin/env node
/**
 * Prerender — turns the SPA into a static-first site.
 *
 * Problem this solves: on GitHub Pages every deep route (/trust, /properties,
 * /properties/KJA-001…) was served by the 404.html SPA-fallback copy — the
 * page rendered, but with HTTP status 404. Crawlers treated all sitemap URLs
 * as soft-404s and social scrapers refused to unfurl them, so every share
 * showed Home's meta tags. (Same fix already shipped on the chacadom site.)
 *
 * Approach: after `vite build`, serve dist/ locally, open every route in
 * headless Chromium, wait for the app to settle (meta mutations from
 * usePageMeta included), then write the rendered DOM to dist/<route>/index.html.
 * GitHub Pages serves those files with status 200. The SPA still boots on top
 * (progressive enhancement — same bundle, React re-renders into the same
 * markup), and 404.html remains the fallback for unknown URLs.
 *
 * Route list mirrors the sitemap generator (static routes + property detail
 * pages + article slugs); a cap keeps CI time bounded as inventory grows.
 *
 * Usage:  node scripts/prerender.mjs            (expects dist/ to exist)
 *         node scripts/prerender.mjs --base /keja-ai/
 */
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = resolve(ROOT, 'dist')

// The preview server's origin (http://localhost:4173) leaks into captured
// HTML via window.location-derived canonical/og:url and vite's runtime
// modulepreload links. Rewrite every occurrence to the production origin or
// social scrapers would refuse the unfurls and canonicals would point off-site.
const PROD_ORIGIN = process.env.PRERENDER_ORIGIN ?? 'https://gadda00.github.io'
const PREVIEW_ORIGIN = 'http://localhost:4173'

const args = process.argv.slice(2)
const baseArgIdx = args.indexOf('--base')
const BASE = (baseArgIdx !== -1 ? args[baseArgIdx + 1] : '/keja-ai/').replace(/\/$/, '')

/**
 * Cap dynamic pages so CI stays bounded. Auto-Pilot caps its own inventory at
 * 60 listings and the seed stock is 20, so 100 covers the full sitemap surface
 * with headroom. If truncation ever kicks in, the run FAILS loudly — a
 * sitemap URL that is not prerendered is exactly the soft-404 this script
 * exists to prevent.
 */
const MAX_DYNAMIC = 100

/* --------------------------- route enumeration ----------------------------- */

const STATIC_ROUTES = [
  '/',
  '/properties',
  '/tokenize',
  '/ask',
  '/invest',
  '/trust',
  '/insights',
  '/ecosystem',
  '/partners',
  '/sell',
  '/about',
  '/contact',
  '/manage',
  '/compare',
  '/legal',
]

function extractIds(path) {
  const src = readFileSync(resolve(ROOT, path), 'utf8')
  return [...src.matchAll(/id:\s*'(KJA-[A-Z0-9]+)'/g)].map((m) => m[1])
}

function extractArticleSlugs(path) {
  if (!existsSync(resolve(ROOT, path))) return []
  const src = readFileSync(resolve(ROOT, path), 'utf8')
  return [...src.matchAll(/slug:\s*'([a-z0-9-]+)'/g)].map((m) => m[1])
}

function extractAutoIds(path) {
  if (!existsSync(resolve(ROOT, path))) return []
  const data = JSON.parse(readFileSync(resolve(ROOT, path), 'utf8'))
  return (data.listings ?? []).map((l) => l.id)
}

// trust order: Auto-Pilot first (freshest stock), then seed properties
const autoIds = extractAutoIds('src/data/auto-listings.json')
const seedIds = extractIds('src/data/properties.ts')
const propertyRoutes = [...autoIds, ...seedIds].slice(0, MAX_DYNAMIC).map((id) => `/properties/${id}`)
if (autoIds.length + seedIds.length > MAX_DYNAMIC) {
  console.error(
    `[prerender] ABORT: ${autoIds.length + seedIds.length} property routes exceed the ${MAX_DYNAMIC} cap — ` +
      'the sitemap would contain soft-404 URLs. Raise MAX_DYNAMIC or cap inventory.',
  )
  process.exit(3)
}

const articleRoutes = extractArticleSlugs('src/data/articles.ts')
  .slice(0, MAX_DYNAMIC)
  .map((slug) => `/insights/${slug}`)

const guideRoutes = extractArticleSlugs('src/data/neighborhoods.ts').map((slug) => `/areas/${slug}`)

const ROUTES = [...STATIC_ROUTES, ...propertyRoutes, ...articleRoutes, ...guideRoutes]

/* --------------------------------- runner ---------------------------------- */

async function main() {
  if (!existsSync(DIST)) {
    console.error('[prerender] dist/ not found — run `npm run build` first')
    process.exit(1)
  }

  const { chromium } = await import('playwright')

  // Local static server: vite preview serves dist/ exactly as it will be hosted.
  // Spawn in its own process group so killing the tree actually frees the port
  const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], {
    cwd: ROOT,
    stdio: 'ignore',
    detached: true,
  })

  const origin = 'http://localhost:4173'
  let up = false
  for (let i = 0; i < 60 && !up; i++) {
    try {
      const res = await fetch(origin + BASE + '/index.html')
      up = res.ok
      if (!up) await new Promise((r) => setTimeout(r, 500))
    } catch {
      await new Promise((r) => setTimeout(r, 500))
    }
  }
  if (!up) {
    try { process.kill(-server.pid, 'SIGKILL') } catch { server.kill() }
    console.error('[prerender] vite preview did not come up on :4173')
    process.exit(1)
  }

  let failures = 0
  try {
    const browser = await chromium.launch()
    const page = await browser.newPage()

    for (const route of ROUTES) {
      const url = origin + BASE + route
      try {
        await page.goto(url, { waitUntil: 'networkidle' })
        // settle: let React mount + lazy chunks load + usePageMeta run
        await page.waitForFunction(() => document.readyState === 'complete')
        await page.waitForTimeout(route.startsWith('/properties/') ? 600 : 350)

        let html = await page.evaluate(() => {
          // Framer-motion initial states hide below-fold content from
          // no-JS clients and crawlers (inline `opacity: 0` +
          // `transform: translateY(...)` on whileInView elements). Static
          // HTML must actually show the content — the SPA re-applies its
          // own initial states once it boots. Only elements carrying BOTH
          // properties are touched, so intentional CSS hides are safe.
          document.querySelectorAll('[style]').forEach((el) => {
            const s = el.getAttribute('style') || ''
            if (s.includes('opacity: 0') && /transform:\s*translate/.test(s)) {
              el.setAttribute(
                'style',
                s
                  .replace(/opacity:\s*0(?:\.0+)?;?\s*/g, '')
                  .replace(/transform:\s*[^;]*;?\s*/g, ''),
              )
            }
          })
          // strip dev-only artifacts so they never leak into static files
          document.querySelectorAll('script[src*="@vite"]').forEach((s) => s.remove())
          return '<!DOCTYPE html>\n' + document.documentElement.outerHTML
        })
        // canonical/og:url/modulepreload: preview origin -> production origin
        html = html.replaceAll(PREVIEW_ORIGIN, PROD_ORIGIN)
        if (html.includes('localhost:')) {
          throw new Error('localhost URL survived the rewrite — check canonical/meta/modulepreload')
        }

        // sanity: the route's own title must be present (catches a blank render)
        const title = await page.title()
        if (!title) throw new Error('empty document title')

        // sanity: property pages must actually show the listing, not NotFound
        if (route.startsWith('/properties/')) {
          const h1 = await page.evaluate(() => document.querySelector('h1')?.textContent ?? '')
          if (/not found/i.test(h1)) throw new Error('property detail rendered NotFound')
        }

        const outDir = resolve(DIST, route === '/' ? '.' : route.slice(1))
        mkdirSync(outDir, { recursive: true })
        writeFileSync(resolve(outDir, 'index.html'), html)
        console.log(
          `[prerender] ${route.padEnd(28)} -> dist${route === '/' ? '/index.html' : `${route}/index.html`}  ("${title.slice(0, 48)}")`,
        )
      } catch (err) {
        failures++
        console.error(`[prerender] FAILED ${route}: ${err.message}`)
      }
    }

    // Capture the router's NotFound page (path="*") as the real 404.html.
    // GitHub Pages serves it for unknown URLs with status 404 — previously
    // workflows copied the Home page here, which flashed Home's content and
    // meta tags on every dead link. The fake path echoed in the copy
    // ("We couldn't find /404-preview") is rewritten to a neutral phrase.
    try {
      const url = origin + BASE + '/404-preview'
      await page.goto(url, { waitUntil: 'networkidle' })
      await page.waitForFunction(() => document.readyState === 'complete')
      await page.waitForTimeout(350)
      let html = await page.evaluate(() => {
        document.querySelectorAll('script[src*="@vite"]').forEach((s) => s.remove())
        return '<!DOCTYPE html>\n' + document.documentElement.outerHTML
      })
      html = html.replaceAll(PREVIEW_ORIGIN, PROD_ORIGIN)
      // The 404 capture echoes the fake path '/404-preview' inside
      // canonical/og:url (written by usePageMeta before the text rewrite
      // below). A noindex 404 needs neither — strip them first so no
      // malformed URL like '…/keja-aithis page' ever ships.
      html = html
        .replace(/<link\s+rel="canonical"[^>]*>\s*/g, '')
        .replace(/<meta\s+property="og:url"[^>]*>\s*/g, '')
        .replaceAll('/404-preview', 'this page')
      if (html.includes('localhost:')) {
        throw new Error('localhost URL survived the rewrite — check canonical/meta/modulepreload')
      }
      writeFileSync(resolve(DIST, '404.html'), html)
      console.log('[prerender] 404 page      -> dist/404.html (real NotFound, noindex)')
    } catch (err) {
      failures++
      console.error(`[prerender] FAILED 404 capture: ${err.message}`)
    }

    await browser.close()
  } finally {
    // always free the port — an orphaned preview server serving stale dist
    // makes every later run "succeed" against the wrong build
    try { process.kill(-server.pid, 'SIGKILL') } catch { server.kill() }
  }

  if (failures > 0) {
    console.error(`[prerender] ${failures}/${ROUTES.length} routes failed`)
    process.exit(2)
  }
  console.log(
    `[prerender] ${ROUTES.length}/${ROUTES.length} routes prerendered (status-200 pages for every sitemap URL)`,
  )
}

main().catch((e) => {
  console.error('[prerender] fatal:', e)
  process.exit(1)
})
