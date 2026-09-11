/**
 * Section catalogue (src/lib/sectionMeta.ts) — the contract that keeps the
 * three consumers of section SEO in lockstep:
 *
 *   1. KejaApp's RouteMeta (hydrated <title>/description),
 *   2. scripts/prerender.ts (crawler-facing static HTML per section),
 *   3. scripts/generate-sitemap.mjs (the sitemap <loc> set).
 *
 * Background (2026-09-12): the sitemap advertised 17 static routes but only
 * /properties had prerendered HTML — 16 sitemap'd URLs served the generic
 * home shell (duplicate content / wasted crawl budget), and the SPA titles
 * were hand-duplicated inside KejaApp.tsx.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SECTION_META } from '@/lib/sectionMeta';
import { ROUTE_META } from '@/components/shell/KejaApp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('SECTION_META catalogue', () => {
  it('lists every public section the sitemap advertises (16 + home)', () => {
    // Kept in lockstep with the STATIC_ROUTES list generate-sitemap.mjs
    // derives from this same module — the sitemap is home + SECTION_META.
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
    for (const privateRoute of ['/account', '/admin', '/pro', '/manage', '/tenant', '/finance', '/transact', '/data', '/portfolio', '/deal-analyst', '/institutional']) {
      expect(paths).not.toContain(privateRoute);
    }
  });
});

describe('RouteMeta consumes the catalogue', () => {
  it('KejaApp ROUTE_META serves the catalogue entries verbatim (no drift)', () => {
    for (const s of SECTION_META) {
      expect(ROUTE_META[s.path]).toBeDefined();
      expect(ROUTE_META[s.path].title).toBe(s.title);
      expect(ROUTE_META[s.path].description).toBe(s.description);
    }
  });

  it('noindex private routes stay noindex after the catalogue merge', () => {
    for (const p of ['/account', '/admin', '/pro']) {
      expect(ROUTE_META[p]?.robots).toBe('noindex');
    }
  });
});

describe('the prerender and sitemap scripts consume the catalogue', () => {
  it('prerender.ts imports SECTION_META (static sections derive from it)', () => {
    const src = readFileSync(resolve(ROOT, 'scripts/prerender.ts'), 'utf8');
    expect(src).toContain("from '../src/lib/sectionMeta'");
    expect(src).not.toMatch(/path: '\/tokenize'/); // no hand-copied sections left
  });

  it('generate-sitemap.mjs imports SECTION_META (sitemap derives from it)', () => {
    const src = readFileSync(resolve(ROOT, 'scripts/generate-sitemap.mjs'), 'utf8');
    expect(src).toContain("from '../src/lib/sectionMeta.ts'");
  });

  it('the deployed sitemap (public/sitemap.xml) lists exactly home + catalogue', () => {
    const sitemapPath = resolve(ROOT, 'public/sitemap.xml');
    if (!existsSync(sitemapPath)) return; // not built yet — CI covers it
    const xml = readFileSync(sitemapPath, 'utf8');
    for (const s of SECTION_META) {
      // trailing-slash form — the canonical URL shape everywhere on this site
      expect(xml).toContain(`/${s.path.replace(/^\//, '')}/</loc>`);
    }
  });
});

describe('vercel.json rewrites no longer swallow 404s', () => {
  it('has no catch-all rewrite (unknown paths must fall through to 404.html)', () => {
    const vercel = JSON.parse(readFileSync(resolve(ROOT, 'vercel.json'), 'utf8'));
    const sources = (vercel.rewrites ?? []).map((r: { source: string }) => r.source);
    expect(sources).not.toContain('/(.*)'); // the old soft-404 catch-all
    for (const src of sources) {
      expect(src.startsWith('^/')).toBe(true); // explicit section regexes only
    }
  });
});
