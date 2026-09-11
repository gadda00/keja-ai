/**
 * Area gazetteer — sanity of the coordinates that power the results map.
 *
 * Kenya spans roughly lat -5..+5.5, lng 33.5..42. A coordinate outside
 * that box means a typo landed the cluster pin in another country (or the
 * ocean) — the map would silently lie.
 */
import { AREA_COORDS } from '@/data/areaCoords';
import { AREAS } from '@/data/properties';

describe('AREA_COORDS', () => {
  const entries = Object.entries(AREA_COORDS);

  it('covers a meaningful gazetteer (20+ areas)', () => {
    expect(entries.length).toBeGreaterThanOrEqual(20);
  });

  it('every coordinate is finite', () => {
    for (const [area, c] of entries) {
      expect(Number.isFinite(c.lat), `${area} lat`).toBe(true);
      expect(Number.isFinite(c.lng), `${area} lng`).toBe(true);
    }
  });

  it("every coordinate lands inside Kenya's bounding box", () => {
    for (const [area, c] of entries) {
      expect(c.lat, `${area} lat`).toBeGreaterThanOrEqual(-5);
      expect(c.lat, `${area} lat`).toBeLessThanOrEqual(5.5);
      expect(c.lng, `${area} lng`).toBeGreaterThanOrEqual(33.5);
      expect(c.lng, `${area} lng`).toBeLessThanOrEqual(42);
    }
  });

  it('areas referenced by the marketplace resolve to coordinates', () => {
    // every authored area key used by listings should have a coord entry
    const known = new Set(entries.map(([area]) => area.toLowerCase()));
    const missing = AREAS.filter((a: string) => !known.has(a.toLowerCase()));
    // the gazetteer may deliberately include extra areas; the reverse
    // (marketplace area without coordinates) is a map bug
    expect(missing, `areas without coordinates: ${missing.join(', ')}`).toEqual([]);
  });
});
