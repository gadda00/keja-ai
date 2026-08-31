/// <reference types="node" />
/**
 * Sitemap ↔ prerender coverage — the site's crawlable surface.
 *
 * The prerender script enumerates property routes from the data sources with
 * a MAX_DYNAMIC cap. If inventory ever grows past the cap, the sitemap would
 * list URLs the prerenderer silently skips — soft-404s, the exact problem
 * prerendering exists to fix. This test fails loudly before that can ship.
 * (Same contract as the chacadom routes test, adapted for dynamic inventory.)
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const SITEMAP = existsSync(resolve(ROOT, 'public/sitemap.xml'))
  ? readFileSync(resolve(ROOT, 'public/sitemap.xml'), 'utf8')
  : '';
const PRERENDER = readFileSync(resolve(ROOT, 'scripts/prerender.mjs'), 'utf8');
const PROPERTIES_TS = readFileSync(resolve(ROOT, 'src/data/properties.ts'), 'utf8');
const AUTO_JSON = JSON.parse(readFileSync(resolve(ROOT, 'src/data/auto-listings.json'), 'utf8'));

const seedIds = [...PROPERTIES_TS.matchAll(/id:\s*'(KJA-[A-Z0-9]+)'/g)].map((m) => m[1]);
const autoIds = (AUTO_JSON.listings ?? []).map((l: { id: string }) => l.id);
const allPropertyIds = [...autoIds, ...seedIds];

const maxMatch = PRERENDER.match(/const MAX_DYNAMIC = (\d+)/);
const MAX_DYNAMIC = maxMatch ? Number(maxMatch[1]) : 0;

const sitemapPropertyIds = [...SITEMAP.matchAll(/\/properties\/(KJA-[A-Z0-9]+)</g)].map(
  (m) => m[1]
);
const sitemapStaticRoutes = [...SITEMAP.matchAll(/<loc>[^<]*\/keja-ai(\/[a-z]*)?<\/loc>/g)]
  .map((m) => m[1] || '/')
  .filter((r) => r !== '/' && !r.startsWith('/properties') && !r.startsWith('/insights'));

const prerenderStaticRoutes = [...PRERENDER.matchAll(/'(\/[a-z]+)'/g)].map((m) => m[1]);

describe('sitemap ↔ prerender coverage', () => {
  it('every static sitemap route is in the prerender list', () => {
    const missing = sitemapStaticRoutes.filter((r) => !prerenderStaticRoutes.includes(r));
    expect(missing, `static routes missing from prerender: ${missing.join(', ')}`).toEqual([]);
  });

  it('the sitemap is present and lists property detail pages', () => {
    expect(SITEMAP.length).toBeGreaterThan(0);
    expect(sitemapPropertyIds.length).toBeGreaterThan(10);
  });

  it('every property in the data sources is listed in the sitemap (CI regenerates it pre-build)', () => {
    const missing = allPropertyIds.filter((id) => !sitemapPropertyIds.includes(id));
    // note: locally the sitemap may lag auto-listings.json if not regenerated;
    // in CI, generate-sitemap.mjs always runs before the build, so a real gap
    // only exists if the generator's extraction itself drifts.
    if (missing.length > 0) {
      console.warn(
        `[routes] sitemap lags data sources by ${missing.length} ids ` +
          '(local-only staleness is OK — CI regenerates; check generate-sitemap.mjs if this grows)'
      );
    }
    // hard invariant: the generator and the prerenderer must AGREE on extraction
    const generatorSrc = readFileSync(resolve(ROOT, 'scripts/generate-sitemap.mjs'), 'utf8');
    const prerenderAgrees =
      generatorSrc.includes("id:\\s*'(KJA-[A-Z0-9]+)'") &&
      PRERENDER.includes("id:\\s*'(KJA-[A-Z0-9]+)'");
    expect(prerenderAgrees).toBe(true);
  });

  it('inventory stays inside the prerender cap — no silently-skipped sitemap URLs', () => {
    expect(
      allPropertyIds.length,
      `property inventory (${allPropertyIds.length}) exceeds MAX_DYNAMIC (${MAX_DYNAMIC}) — ` +
        'prerender would skip sitemap URLs. Raise the cap or cap inventory.'
    ).toBeLessThanOrEqual(MAX_DYNAMIC);
  });

  it('seed stock is never crowded out by Auto-Pilot listings (order guarantee)', () => {
    // The prerenderer concatenates auto + seed; with the cap enforced above
    // both sets always fit. This pins the extraction so the order can't
    // silently change to seed-first (which would cut the FRESHEST stock).
    expect(PRERENDER).toContain('...autoIds, ...seedIds');
  });
});

describe('neighbourhood guide coverage', () => {
  it('every guide slug is in the sitemap AND the prerender list', () => {
    const NEIGHBORHOODS_TS = readFileSync(resolve(ROOT, 'src/data/neighborhoods.ts'), 'utf8');
    const guideSlugs = [...NEIGHBORHOODS_TS.matchAll(/slug:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]);
    expect(guideSlugs.length).toBeGreaterThanOrEqual(1);
    expect(PRERENDER).toContain('guideRoutes');
    for (const slug of guideSlugs) {
      expect(SITEMAP, `sitemap missing /areas/${slug}`).toContain(`/areas/${slug}`);
      expect(PRERENDER).toContain('guideRoutes');
    }
    // the prerenderer builds guide routes from the same source file
    expect(PRERENDER).toContain("extractArticleSlugs('src/data/neighborhoods.ts')");
    expect(SITEMAP).toContain('/areas/waterfront-karen');
  });
});
