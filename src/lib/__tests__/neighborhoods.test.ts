/**
 * Waterfront Karen neighbourhood feature — data integrity + AI wiring.
 *
 * Guards: guide images actually exist in public/, stats/sources/ids are
 * well-formed, the marketplace join works, and Ask Keja answers Waterfront
 * queries with the guide (REPORTED labels included) while letting
 * criteria-bearing searches fall through to live inventory.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  getNeighborhoodGuide,
  guideInventoryCount,
  isNearWaterfront,
  NEIGHBORHOOD_GUIDES,
  WATERFRONT_KAREN,
} from '@/data/neighborhoods';
import { PROPERTIES } from '@/data/properties';
import { kejaAI } from '@/lib/ai/engine';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

describe('neighborhood guides — data integrity', () => {
  it('ships at least the Waterfront Karen guide', () => {
    expect(NEIGHBORHOOD_GUIDES.length).toBeGreaterThanOrEqual(1);
    expect(WATERFRONT_KAREN.slug).toBe('waterfront-karen');
    expect(WATERFRONT_KAREN.area).toBe('Karen');
  });

  it('every hero and gallery image exists as webp+jpg in public/', () => {
    const images = [WATERFRONT_KAREN.hero, ...WATERFRONT_KAREN.gallery];
    for (const im of images) {
      expect(existsSync(resolve(ROOT, `public${im.base}.webp`)), `${im.base}.webp`).toBe(true);
      expect(existsSync(resolve(ROOT, `public${im.base}.jpg`)), `${im.base}.jpg`).toBe(true);
    }
  });

  it('exposes lookup, join helpers and sane metadata', () => {
    expect(getNeighborhoodGuide('waterfront-karen')).toBe(WATERFRONT_KAREN);
    expect(getNeighborhoodGuide('nowhere')).toBeUndefined();

    expect(isNearWaterfront({ area: 'Karen' })).toBe(true);
    expect(isNearWaterfront({ area: 'Kilimani' })).toBe(false);

    const fake = [
      { id: 'T1', area: 'Karen' },
      { id: 'T2', area: 'Karen' },
      { id: 'T3', area: 'Runda' },
    ] as never as typeof PROPERTIES;
    expect(guideInventoryCount(WATERFRONT_KAREN, fake)).toBe(2);

    expect(WATERFRONT_KAREN.stats.length).toBeGreaterThanOrEqual(4);
    expect(WATERFRONT_KAREN.amenities.length).toBeGreaterThanOrEqual(6);
    expect(WATERFRONT_KAREN.investmentThesis.length).toBeGreaterThanOrEqual(3);
    for (const s of WATERFRONT_KAREN.sources) {
      expect(s.url).toMatch(/^https:\/\/[\w.-]+/);
    }
    expect(WATERFRONT_KAREN.video.id).toMatch(/^[\w-]{11}$/);
  });

  it('the guide area actually has live seed inventory to join', () => {
    expect(PROPERTIES.some((p) => p.area === WATERFRONT_KAREN.area)).toBe(true);
  });
});

describe('Ask Keja — Waterfront Karen intent', () => {
  it('answers informational queries with the guide, REPORTED labels included', () => {
    const r = kejaAI.respond('Tell me about the Waterfront Karen');
    expect(r.text).toContain('Waterfront');
    expect(r.text).toContain('/areas/waterfront-karen');
    expect(r.text).toContain('Maji Magic');
    expect(r.meta?.some((m) => m.label === 'REPORTED')).toBe(true);
    // Karen seed inventory is surfaced with the answer
    expect((r.propertyIds ?? []).length).toBeGreaterThan(0);
  });

  it('answers "maji magic" and bare "waterfront" queries the same way', () => {
    expect(kejaAI.respond('what is maji magic').text).toContain('Waterfront');
    expect(kejaAI.respond('waterfront').text).toContain('/areas/waterfront-karen');
  });

  it('lets criteria-bearing searches fall through to live Karen inventory', () => {
    const r = kejaAI.respond('villas near the waterfront under 60M');
    expect(r.text).not.toContain('/areas/waterfront-karen');
    // search answer ranks by trust score and mentions the Karen area filter
    expect(r.text).toContain('Karen');
  });
});

describe('sitemap includes the area guide route', () => {
  it('public/sitemap.xml carries /areas/waterfront-karen', () => {
    const xml = readFileSync(resolve(ROOT, 'public/sitemap.xml'), 'utf8');
    expect(xml).toContain('/areas/waterfront-karen');
  });
});
