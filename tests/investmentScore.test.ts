/**
 * KEJA Investment Score™ — the transparent multi-factor framework.
 *
 * Pins the structural contract: seven factors, 0-10 scale, one-decimal
 * overall, the five interpretation bands, and honest FACT/ESTIMATE/
 * ASSUMPTION labelling on every factor.
 */
import { PROPERTIES } from '@/data/properties';
import { investmentScore, scoreTone } from '@/lib/investmentScore';

const results = PROPERTIES.slice(0, 25).map((p) => ({ p, r: investmentScore(p) }));

describe('structure', () => {
  it('scores seven factors on the 0-10 scale', () => {
    for (const { r } of results) {
      expect(r.factors.length).toBeGreaterThanOrEqual(7);
      for (const f of r.factors) {
        expect(f.score).toBeGreaterThanOrEqual(0);
        expect(f.score).toBeLessThanOrEqual(10);
      }
    }
  });

  it('overall is one-decimal 0-10 and lands in a valid band', () => {
    const bands = ['Exceptional', 'Strong', 'Solid', 'Moderate', 'Speculative'];
    for (const { r } of results) {
      expect(r.overall).toBeGreaterThanOrEqual(0);
      expect(r.overall).toBeLessThanOrEqual(10);
      expect(Math.round(r.overall * 10)).toBe(r.overall * 10);
      expect(bands).toContain(r.band);
    }
  });

  it('every factor declares an honest basis and a note', () => {
    const bases = ['FACT', 'ESTIMATE', 'ASSUMPTION'];
    for (const { r } of results) {
      for (const f of r.factors) {
        expect(bases).toContain(f.basis);
        expect(f.note.length).toBeGreaterThan(5);
      }
    }
  });

  it('factor keys are unique within a score', () => {
    for (const { r } of results) {
      const keys = r.factors.map((f) => f.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});

describe('scoreTone', () => {
  it('maps the headline bands to distinct tones', () => {
    expect(scoreTone(9).chip).not.toBe(scoreTone(6).chip);
    expect(scoreTone(9).bar).toBeTruthy();
    expect(scoreTone(3).bar).toBeTruthy();
  });
});
