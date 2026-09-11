/**
 * Data integrity — the marketplace's ground truth, verified.
 *
 * Two datasets feed every listing surface:
 *   - src/data/properties.ts     (authored, hand-curated)
 *   - src/data/auto-listings.json (5,600+ lines committed by the Auto-Pilot
 *     bot twice a day — nobody human reviews those diffs)
 *
 * These tests are the review: every listing passes its boundary schema,
 * every image path resolves to a real file in public/, ids are unique,
 * and prices are sane. A bot regression fails CI instead of shipping.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import autoStateRaw from '@/data/auto-listings.json';
import { PROPERTIES } from '@/data/properties';
import { validateAutoState } from '@/lib/boundaries';

const PUBLIC_DIR = path.resolve(__dirname, '../public');

const imageExists = (p: string): boolean => {
  if (!p.startsWith('/')) return true; // external / data URLs out of scope
  try {
    readFileSync(path.join(PUBLIC_DIR, p.replace(/^\//, '')));
    return true;
  } catch {
    return false;
  }
};

describe('auto-listings.json (Auto-Pilot payload)', () => {
  const state = validateAutoState(autoStateRaw);

  it('every entry passes the boundary schema (nothing dropped)', () => {
    expect(state.dropped).toBe(0);
  });

  it('carries a meaningful live inventory', () => {
    expect(state.listings.length).toBeGreaterThan(50);
  });

  it('all listing ids are unique', () => {
    const ids = state.listings.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every referenced image exists in public/', () => {
    const broken: string[] = [];
    for (const l of state.listings) {
      for (const img of l.images) if (!imageExists(img)) broken.push(`${l.id}: ${img}`);
    }
    expect(broken, `missing files: ${broken.slice(0, 10).join(', ')}`).toEqual([]);
  });

  it('images are the optimized WebP catalog (no stale .jpg references)', () => {
    const jpgs = state.listings.flatMap((l) => l.images).filter((i) => i.endsWith('.jpg'));
    expect(jpgs).toEqual([]);
  });

  it('every listing has an agent with a phone number', () => {
    for (const l of state.listings) {
      expect(l.agent.name.length).toBeGreaterThan(1);
      expect(l.agent.phone).toMatch(/^\+?[\d\s-]{9,}$/);
    }
  });

  it('sale listings carry non-negative prices and type-appropriate sizes', () => {
    for (const l of state.listings) {
      expect(l.price).toBeGreaterThanOrEqual(0);
      expect(l.sizeSqm).toBeGreaterThan(0);
      // land parcels are acreage (up to ~10 ha here); buildings stay compact
      const ceiling = l.type === 'land' ? 1_000_000 : 20_000;
      expect(l.sizeSqm, `${l.id} size ${l.sizeSqm}`).toBeLessThan(ceiling);
    }
  });

  it('quality gates recorded their checks', () => {
    for (const l of state.listings) {
      expect(l.auto.checks.length).toBeGreaterThan(0);
      for (const c of l.auto.checks) {
        expect(['pass', 'warn', 'fail']).toContain(c.status);
      }
    }
  });
});

describe('properties.ts (authored inventory)', () => {
  it('has a substantial curated inventory', () => {
    expect(PROPERTIES.length).toBeGreaterThan(20);
  });

  it('all ids are unique and non-empty', () => {
    const ids = PROPERTIES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id.length).toBeGreaterThan(0);
  });

  it('every referenced image exists in public/', () => {
    const broken: string[] = [];
    for (const p of PROPERTIES) {
      for (const img of p.images) if (!imageExists(img)) broken.push(`${p.id}: ${img}`);
    }
    expect(broken, `missing files: ${broken.slice(0, 10).join(', ')}`).toEqual([]);
  });

  it('every listing carries a verification record with a parseable check date', () => {
    for (const p of PROPERTIES) {
      expect(p.verification).toBeDefined();
      expect(new Date(p.verification.lastChecked).toString()).not.toBe('Invalid Date');
      expect(['verified', 'pending', 'flagged']).toContain(p.verification.titleCheck);
    }
  });

  it('every listing has an area, a type and purposes from the domain vocabulary', () => {
    const types = ['apartment', 'villa', 'townhouse', 'bungalow', 'land', 'commercial'];
    const purposes = ['buy', 'rent', 'invest'];
    for (const p of PROPERTIES) {
      expect(p.area.length).toBeGreaterThan(1);
      expect(types).toContain(p.type);
      expect(p.purpose.length).toBeGreaterThan(0);
      for (const pu of p.purpose) expect(purposes).toContain(pu);
    }
  });

  it('authored and auto inventories do not collide on ids', () => {
    const autoIds = new Set(validateAutoState(autoStateRaw).listings.map((l) => l.id));
    const collisions = PROPERTIES.filter((p) => autoIds.has(p.id)).map((p) => p.id);
    expect(collisions).toEqual([]);
  });
});
