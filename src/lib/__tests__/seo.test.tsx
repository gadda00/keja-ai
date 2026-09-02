// @vitest-environment jsdom
/**
 * SEO regression suite — pins the defects that previously shipped precisely
 * because seo.ts had zero tests:
 *  1. og:image / twitter:image must be ABSOLUTE URLs. A relative path makes
 *     Facebook/LinkedIn/X/WhatsApp scrapers drop the share card entirely —
 *     ~92 of 107 prerendered pages shared as bare links before this fix.
 *  2. canonical / og:url must be SITE_URL + base + router pathname, built
 *     exactly once (breadcrumb item URLs must never double the base path).
 *  3. price-on-application listings must not emit offers.price = 0 ("free"
 *     to crawlers) or floorSize = 0 into RealEstateListing JSON-LD.
 */
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { SITE_URL } from '@/config';
import { breadcrumbJsonLd, realEstateListingJsonLd, usePageMeta } from '@/lib/seo';

afterEach(cleanup);

const metaContent = (selector: string) =>
  document.head.querySelector<HTMLMetaElement>(selector)?.content ?? '';

function Probe(props: { title: string; image?: string }) {
  usePageMeta(props.title, 'probe description', { image: props.image });
  return null;
}

describe('usePageMeta — social + canonical URLs', () => {
  it('emits an ABSOLUTE default og:image and twitter:image (route without its own image)', () => {
    render(
      <MemoryRouter initialEntries={['/properties/KJA-001']}>
        <Probe title="Probe route" />
      </MemoryRouter>
    );
    const og = metaContent('meta[property="og:image"]');
    const tw = metaContent('meta[name="twitter:image"]');
    expect(og).toMatch(/^https?:\/\//);
    expect(og).toContain('og-image.jpg');
    expect(tw).toBe(og);
  });

  it('absolutizes a route-provided image path', () => {
    render(
      <MemoryRouter initialEntries={['/areas/waterfront-karen']}>
        <Probe title="Probe image" image="/og-image.jpg" />
      </MemoryRouter>
    );
    const og = metaContent('meta[property="og:image"]');
    expect(og).toMatch(/^https?:\/\//);
    expect(og).toContain('og-image.jpg');
  });

  it('builds canonical and og:url from SITE_URL + base + pathname (once, no double base)', () => {
    render(
      <MemoryRouter initialEntries={['/properties/KJA-026']}>
        <Probe title="Probe canonical" />
      </MemoryRouter>
    );
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
    const ogUrl = metaContent('meta[property="og:url"]');
    expect(canonical).toBeDefined();
    expect(canonical).toMatch(new RegExp(`^${SITE_URL}`));
    expect(canonical).toContain('properties/KJA-026');
    expect(ogUrl).toBe(canonical);
    // the deployment base path may appear exactly once
    expect(canonical!.split(/keja-ai\//).length - 1).toBeLessThanOrEqual(1);
  });
});

describe('breadcrumbJsonLd — item URLs', () => {
  it('emits absolute item URLs with no doubled base path for clean caller paths', () => {
    const ld = breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Properties', path: '/properties' },
      { name: 'KJA-001', path: '/properties/KJA-001' },
    ]) as { itemListElement: { item: string }[] };
    const urls = ld.itemListElement.map((i) => i.item);
    urls.forEach((u) => expect(u).toMatch(new RegExp(`^${SITE_URL}`)));
    urls.forEach((u) => expect(u.includes('/keja-ai/keja-ai/')).toBe(false));
    expect(urls[2]).toMatch(/\/properties\/KJA-001$/);
  });
});

describe('realEstateListingJsonLd — price-on-application and floor size', () => {
  const base = {
    id: 'KJA-027',
    title: 'Amber Bay Heights',
    description: 'Off-plan tower',
    images: ['/images/props/listing_amberbay.jpg'],
    area: 'Westlands',
    county: 'Nairobi',
    agency: 'Chacadom Premier Properties',
    listedAt: '2026-09-02',
  };

  it('omits offers.price and floorSize for POA listings and absolutizes images', () => {
    const ld = realEstateListingJsonLd({
      ...base,
      price: 0,
      priceOnApplication: true,
      sizeSqm: 0,
    }) as Record<string, unknown> & { offers: Record<string, unknown>; image: string[] };
    expect(ld.offers).not.toHaveProperty('price');
    expect(ld.offers).toHaveProperty('availability');
    expect(ld.offers).toHaveProperty('seller');
    expect(ld).not.toHaveProperty('floorSize');
    ld.image.forEach((img) => expect(img).toMatch(/^https?:\/\//));
  });

  it('keeps price and floorSize for normally priced listings', () => {
    const ld = realEstateListingJsonLd({ ...base, price: 67_000_000, sizeSqm: 460 }) as Record<
      string,
      unknown
    > & { offers: Record<string, unknown> };
    expect(ld.offers).toHaveProperty('price', 67_000_000);
    expect(ld.offers).toHaveProperty('priceCurrency', 'KES');
    expect(ld).toHaveProperty('floorSize');
  });
});
