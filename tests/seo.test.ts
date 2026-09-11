/**
 * SEO layer — per-route meta + JSON-LD (audit F-08 / F-09).
 *
 * The contract: meta mutations are idempotent (re-renders never duplicate
 * tags), routes without their own image reset to the site default (no
 * stale unfurls), and share images are absolute (scrapers drop relative).
 */
import { act, renderHook } from '@testing-library/react';

import { absoluteImage, absoluteUrl, breadcrumbJsonLd, DEFAULT_OG_IMAGE, setRouteJsonLd, usePageMeta } from '@/lib/seo';
import { SITE, SITE_URL } from '@/config';

describe('absoluteUrl', () => {
  it('builds canonical URLs in the trailing-slash form the prerender and sitemap use', () => {
    expect(absoluteUrl('/')).toBe(`${SITE_URL}/`);
    expect(absoluteUrl('/tokenize')).toBe(`${SITE_URL}/tokenize/`);
    expect(absoluteUrl('/properties/KJA-001')).toBe(`${SITE_URL}/properties/KJA-001/`);
  });

  it('normalises repeated and trailing slashes instead of concatenating the host', () => {
    // regression: 'https://keja.appproperties' (missing slash bug, 2026-09-12)
    expect(absoluteUrl('tokenize')).toBe(`${SITE_URL}/tokenize/`);
    expect(absoluteUrl('//tokenize//')).toBe(`${SITE_URL}/tokenize/`);
    expect(absoluteUrl('')).toBe(`${SITE_URL}/`);
  });

  it('passes absolute http(s) URLs through untouched', () => {
    expect(absoluteUrl('https://keja.app/properties/')).toBe('https://keja.app/properties/');
  });

  it('never produces a host glued to a path segment', () => {
    for (const p of ['/', '/x', '/properties/KJA-001', 'x', '//x//']) {
      expect(absoluteUrl(p)).not.toMatch(new RegExp(SITE_URL.replace(/\//g, '\\/') + '[a-z]', 'i'));
    }
  });
});

describe('absoluteImage', () => {
  it('prefixes site-relative paths with the site URL (exactly one slash)', () => {
    expect(absoluteImage('/og-image.jpg')).toBe(`${SITE_URL}/og-image.jpg`);
  });

  it('passes absolute http(s) URLs through untouched', () => {
    expect(absoluteImage('https://cdn.example.com/x.jpg')).toBe('https://cdn.example.com/x.jpg');
    expect(absoluteImage('http://example.com/y.png')).toBe('http://example.com/y.png');
  });

  it('the default OG image is absolute', () => {
    expect(DEFAULT_OG_IMAGE).toMatch(/^https?:\/\//);
    expect(DEFAULT_OG_IMAGE).toContain('og-image');
  });
});

describe('usePageMeta', () => {
  it('sets the document title with the site suffix', () => {
    renderHook(() => usePageMeta({ title: 'Apartments in Kilimani' }, '/properties'));
    expect(document.title).toBe(`Apartments in Kilimani · ${SITE.name}`);
  });

  it('does not double-append the site name when the title already has it', () => {
    renderHook(() => usePageMeta({ title: `${SITE.name} — homes` }, '/'));
    expect(document.title.match(new RegExp(SITE.name, 'g'))?.length).toBe(1);
  });

  it('upserts description tags without duplicating on re-render', () => {
    const { rerender } = renderHook(
      ({ desc }: { desc: string }) => usePageMeta({ title: 'T', description: desc }, '/x'),
      { initialProps: { desc: 'first description' } },
    );
    rerender({ desc: 'second description' });
    const metas = document.head.querySelectorAll<HTMLMetaElement>('meta[name="description"]');
    expect(metas).toHaveLength(1);
    expect(metas[0].getAttribute('content')).toBe('second description');
  });

  it('sets og:image to the absolute route image', () => {
    renderHook(() => usePageMeta({ title: 'T', image: '/images/props/villa_0.webp' }, '/x'));
    const og = document.head.querySelector<HTMLMetaElement>('meta[property="og:image"]');
    expect(og?.getAttribute('content')).toBe(`${SITE_URL}/images/props/villa_0.webp`);
  });

  it('resets og:image to the site default when the route has no image', () => {
    renderHook(() => usePageMeta({ title: 'T', image: '/images/props/villa_0.webp' }, '/x'));
    renderHook(() => usePageMeta({ title: 'T2' }, '/y'));
    const og = document.head.querySelector<HTMLMetaElement>('meta[property="og:image"]');
    expect(og?.getAttribute('content')).toBe(DEFAULT_OG_IMAGE);
  });

  it('emits a canonical and og:url that match the prerendered/sitemap URL form', () => {
    // regression (2026-09-12): the hydrated canonical read
    // 'https://keja.appproperties/KJA-001' — SITE_URL glued to the path.
    renderHook(() => usePageMeta({ title: 'Villa' }, '/properties/KJA-001'));
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const ogUrl = document.head.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    expect(canonical?.getAttribute('href')).toBe(`${SITE_URL}/properties/KJA-001/`);
    expect(ogUrl?.getAttribute('content')).toBe(`${SITE_URL}/properties/KJA-001/`);
  });

  it('uses the bare origin as the canonical for the home route', () => {
    renderHook(() => usePageMeta({ title: 'Home' }, '/'));
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    expect(canonical?.getAttribute('href')).toBe(`${SITE_URL}/`);
  });
});

describe('breadcrumbJsonLd', () => {
  it('emits absolute item URLs with the leading slash intact', () => {
    const ld = breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Properties', path: '/properties' },
      { name: 'Villa', path: '/properties/KJA-001' },
    ]);
    const items = (ld.itemListElement ?? []).map((e: { item: string }) => e.item);
    // regression (2026-09-12): items read 'https://keja.appproperties' — glued host
    expect(items).toEqual([
      `${SITE_URL}/`,
      `${SITE_URL}/properties/`,
      `${SITE_URL}/properties/KJA-001/`,
    ]);
    for (const url of items) {
      expect(url).toMatch(/^https:\/\/keja\.app\//);
    }
  });
});

describe('setRouteJsonLd', () => {
  it('replaces the route JSON-LD block instead of stacking duplicates', () => {
    act(() => {
      setRouteJsonLd({ '@type': 'RealEstateListing', name: 'A' });
      setRouteJsonLd({ '@type': 'RealEstateListing', name: 'B' });
    });
    const blocks = document.head.querySelectorAll('script#keja-route-jsonld');
    expect(blocks).toHaveLength(1);
    expect(JSON.parse(blocks[0].textContent ?? '{}').name).toBe('B');
  });

  it('removes the block on null', () => {
    act(() => {
      setRouteJsonLd({ '@type': 'Article' });
      setRouteJsonLd(null);
    });
    expect(document.head.querySelectorAll('script#keja-route-jsonld')).toHaveLength(0);
  });
});
