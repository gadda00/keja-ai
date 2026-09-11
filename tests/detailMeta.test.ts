/**
 * Detail-route entity meta (2026-09-12).
 *
 * Pins the single shared derivation (src/lib/detailMeta) used by BOTH the
 * live views (post-hydration SEO) and the prerender script (crawler-facing
 * static HTML) — so the two can never drift apart. Regression origin: the
 * hydrated SPA used to revert detail pages to the generic shell title and
 * strip the JSON-LD because the views never called usePageMeta.
 */
import { describe, expect, it } from 'vitest';

import { areaMeta, articleMeta, listingMeta } from '@/lib/detailMeta';
import { PROPERTIES } from '@/data/properties';
import { ARTICLES } from '@/data/articles';
import { NEIGHBORHOOD_GUIDES } from '@/data/neighborhoods';

describe('listingMeta', () => {
  it('derives entity title, description and JSON-LD for a known listing', () => {
    const p = PROPERTIES[0];
    const m = listingMeta(p);
    expect(m.title).toContain(p.area);
    expect(m.title!.length).toBeLessThanOrEqual(66);
    expect(m.description).toContain('Trust Score');
    expect(m.description!.length).toBeLessThanOrEqual(159);
    expect(m.image).toBe(p.images[0]);
    expect(Array.isArray(m.jsonLd)).toBe(true);
    const jsonLd = JSON.stringify(m.jsonLd);
    expect(jsonLd).toContain('RealEstateListing');
    expect(jsonLd).toContain(p.id);
    expect(jsonLd).toContain('BreadcrumbList');
  });

  it('labels monthly prices for rental listings', () => {
    const rental = PROPERTIES.find((p) => p.purpose.includes('rent') && !p.priceOnApplication);
    if (rental) {
      expect(listingMeta(rental).description).toContain('/ month');
    }
  });

  it('handles price-on-application listings without a price label', () => {
    const poa = PROPERTIES.find((p) => p.priceOnApplication);
    if (poa) {
      expect(listingMeta(poa).description).toContain('Price on application');
    }
  });
});

describe('articleMeta', () => {
  it('derives title, description and Article JSON-LD', () => {
    const a = ARTICLES[0];
    const m = articleMeta(a);
    expect(m.title).toBe(a.title.slice(0, m.title!.length));
    expect(m.description).toContain(a.excerpt.slice(0, 20));
    const jsonLd = JSON.stringify(m.jsonLd);
    expect(jsonLd).toContain('"@type":"Article"');
    expect(jsonLd).toContain('BreadcrumbList');
  });
});

describe('areaMeta', () => {
  it('derives the guide title and breadcrumb JSON-LD', () => {
    const g = NEIGHBORHOOD_GUIDES[0];
    const m = areaMeta(g);
    expect(m.title).toBe(`${g.name} area guide`.slice(0, 65));
    expect(m.description!.length).toBeGreaterThan(0);
    const jsonLd = JSON.stringify(m.jsonLd);
    expect(jsonLd).toContain('BreadcrumbList');
    expect(jsonLd).toContain(g.name);
  });

  it('falls back to the tagline when no summary exists', () => {
    const g = NEIGHBORHOOD_GUIDES.find((x) => !x.summary);
    if (g) {
      expect(areaMeta(g).description).toBeTruthy();
    }
  });
});
