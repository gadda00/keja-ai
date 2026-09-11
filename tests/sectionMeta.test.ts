/**
 * Section catalogue (src/lib/sectionMeta.ts) — the contract that keeps the
 * consumers of section SEO in lockstep:
 *
 *   1. KejaApp's RouteMeta (hydrated <title>/description),
 *   2. scripts/prerender.ts (crawler-facing static HTML per section),
 *   3. scripts/generate-sitemap.mjs (the sitemap <loc> set).
 *
 * Background (2026-09-12): the sitemap advertised 17 static routes but only
 * /properties had prerendered HTML — 16 sitemap'd URLs served the generic
 * home shell (duplicate content / wasted crawl budget), and the SPA titles
 * were hand-duplicated inside KejaApp.tsx. The app-workspace sections
 * (finance, data, …) are prerendered as noindexed shells so their legacy
 * path URLs keep booting the SPA without any vercel.json rewrite — the
 * regex rewrite source proved unreliable on Vercel's path-to-regexp engine
 * (the deploy smoke test caught /finance 404ing), so real files replaced
 * rewrites entirely.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  APP_SECTION_META,
  SECTION_META,
  SECTION_META_BY_PATH,
  APP_SECTION_META_BY_PATH,
} from '@/lib/sectionMeta';
import { ROUTE_META } from '@/components/shell/KejaApp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('SECTION_META catalogue (public, crawl-worthy sections)', () => {
  it('lists every public section the sitemap advertises (16 + home)', () => {
    expect(SECTION_META.length).toBe(16);
    const paths = SECTION_META.map((s) => s.path);
    expect(paths).toContain('/properties');
    expect(paths).toContain('/tokenize');
    expect(paths).toContain('/legal');
    expect(new Set(paths).size).toBe(paths.length); // no duplicates
  });

  it('carries a title, description, sitemap fields and a noscript summary for every section', () => {
    for (const s of SECTION_META) {
      expect(s.path).toMatch(/^\/[a-z-]+$/);
      expect(s.title.length).toBeGreaterThan(3);
      expect(s.title.length).toBeLessThanOrEqual(70);
      expect(s.description.length).toBeGreaterThan(30);
      expect(s.description.length).toBeLessThanOrEqual(200);
      expect(s.noscript.length).toBeGreaterThan(20);
      expect(['0.3', '0.5', '0.6', '0.7', '0.8', '0.9', '1.0']).toContain(s.priority);
      expect(['hourly', 'daily', 'weekly', 'monthly', 'yearly']).toContain(s.changefreq);
    }
  });

  it('keeps private / app-state routes out of the crawl-worthy catalogue', () => {
    const paths = SECTION_META.map((s) => s.path);
    for (const privateRoute of [
      '/account', '/admin', '/pro', '/manage', '/tenant', '/finance', '/transact',
      '/data', '/portfolio', '/deal-analyst', '/institutional',
    ]) {
      expect(paths).not.toContain(privateRoute);
    }
  });
});

describe('APP_SECTION_META (app-workspace shells)', () => {
  it('lists the 8 workspace sections that keep path URLs without rewrites', () => {
    expect(APP_SECTION_META.map((s) => s.path).sort()).toEqual(
      ['/data', '/deal-analyst', '/finance', '/institutional', '/manage', '/portfolio', '/tenant', '/transact'].sort(),
    );
  });

  it('is disjoint from the public catalogue (sitemap stays crawl-budget-clean)', () => {
    const publicPaths = new Set(SECTION_META.map((s) => s.path));
    for (const s of APP_SECTION_META) expect(publicPaths.has(s.path)).toBe(false);
  });

  it('is noindexed in the RouteMeta lookup (matches the prerendered shells)', () => {
    for (const s of APP_SECTION_META) {
      expect(APP_SECTION_META_BY_PATH[s.path].robots).toBe('noindex');
    }
  });
});

describe('RouteMeta consumes both catalogues', () => {
  it('KejaApp ROUTE_META serves the catalogue entries verbatim (no drift)', () => {
    for (const s of [...SECTION_META, ...APP_SECTION_META]) {
      expect(ROUTE_META[s.path]).toBeDefined();
      expect(ROUTE_META[s.path].title).toBe(s.title);
      expect(ROUTE_META[s.path].description).toBe(s.description);
    }
  });

  it('app-workspace sections are noindex in ROUTE_META (hydration keeps the static noindex)', () => {
    for (const s of APP_SECTION_META) {
      expect(ROUTE_META[s.path].robots).toBe('noindex');
    }
  });

  it('noindex private routes stay noindex after the catalogue merge', () => {
    for (const p of ['/account', '/admin', '/pro']) {
      expect(ROUTE_META[p]?.robots).toBe('noindex');
    }
  });

  it('the catalogue lookups are consistent with the arrays', () => {
    for (const s of SECTION_META) {
      expect(SECTION_META_BY_PATH[s.path].title).toBe(s.title);
    }
  });
});

describe('the prerender and sitemap scripts consume the catalogues', () => {
  it('prerender.ts imports both catalogues (static sections derive from them)', () => {
    const src = readFileSync(resolve(ROOT, 'scripts/prerender.ts'), 'utf8');
    expect(src).toContain("from '../src/lib/sectionMeta'");
    expect(src).toContain('APP_SECTION_META');
    expect(src).not.toMatch(/path: '\/tokenize'/); // no hand-copied sections left
  });

  it('generate-sitemap.mjs imports the public catalogue only (app shells stay unsitemap\u2019d)', () => {
    const src = readFileSync(resolve(ROOT, 'scripts/generate-sitemap.mjs'), 'utf8');
    expect(src).toContain("from '../src/lib/sectionMeta.ts'");
    expect(src).not.toContain('APP_SECTION_META');
  });

  it('the deployed sitemap (public/sitemap.xml) lists exactly home + public catalogue', () => {
    const sitemapPath = resolve(ROOT, 'public/sitemap.xml');
    if (!existsSync(sitemapPath)) return; // not built yet — CI covers it
    const xml = readFileSync(sitemapPath, 'utf8');
    for (const s of SECTION_META) {
      // trailing-slash form — the canonical URL shape everywhere on this site
      expect(xml).toContain(`/${s.path.replace(/^\//, '')}/</loc>`);
    }
    for (const s of APP_SECTION_META) {
      // app-workspace shells are deliberately NOT advertised
      expect(xml).not.toContain(`/${s.path.replace(/^\//, '')}/</loc>`);
    }
  });
});

describe('routing config no longer swallows 404s', () => {
  it('vercel.json has no rewrites (prerendered files + 404.html only)', () => {
    const vercel = JSON.parse(readFileSync(resolve(ROOT, 'vercel.json'), 'utf8'));
    expect(vercel.rewrites ?? []).toEqual([]); // no catch-all, no regex sources
  });
});
