/**
 * KEJA Investment Score™ — the transparent multi-factor framework.
 *
 * Pins the structural contract: seven factors, 0-10 scale, one-decimal
 * overall, the five interpretation bands, honest FACT/ESTIMATE/
 * ASSUMPTION labelling on every factor, and the data-confidence layer
 * (wave 12): presentation precision must follow the comparable count.
 */
import { PROPERTIES } from '@/data/properties';
import { AUTO_PROPERTIES } from '@/lib/autoListings';
import {
  comparableCount,
  dataConfidence,
  displayFactor,
  displayOverall,
  INVESTMENT_ALGORITHM_VERSION,
  investmentScore,
  scoreTone,
} from '@/lib/investmentScore';

const CATALOGUE = [...AUTO_PROPERTIES, ...PROPERTIES];
const results = PROPERTIES.slice(0, 25).map((p) => ({ p, r: investmentScore(p, { inventory: CATALOGUE }) }));

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

describe('basis honesty (wave 12)', () => {
  it('the location factor never claims FACT — it is an editorial band table', () => {
    for (const { r } of results) {
      const location = r.factors.find((f) => f.key === 'location');
      expect(location!.basis).toBe('ESTIMATE');
    }
  });

  it('the demand factor never claims FACT — it blends views with the trust-score model', () => {
    for (const { r } of results) {
      const demand = r.factors.find((f) => f.key === 'demand');
      expect(demand!.basis).toBe('ESTIMATE');
    }
  });

  it('no factor outside verification-derived inputs claims FACT', () => {
    // risk derives from the verification record — the only defensible FACT;
    // keep this inventory of FACT-claiming keys explicit so a new FACT needs a reason
    const factKeys = new Set(['risk']);
    for (const { r } of results) {
      for (const f of r.factors) {
        if (f.basis === 'FACT') expect(factKeys.has(f.key), `${f.key} claims FACT`).toBe(true);
      }
    }
  });
});

describe('data confidence (wave 12)', () => {
  it('grades thin / growing / robust by comparable count', () => {
    const p = PROPERTIES[0];
    const thin = dataConfidence(p, [p, { ...p, id: 'X2' }, { ...p, id: 'X3' }]);
    expect(thin.grade).toBe('thin');
    expect(thin.precision).toBe('band');

    const growingList = Array.from({ length: 7 }, (_, i) => ({ ...p, id: `X${i}` }));
    const growing = dataConfidence(p, growingList);
    expect(growing.grade).toBe('growing');
    expect(growing.precision).toBe('integer');

    const robustList = Array.from({ length: 18 }, (_, i) => ({ ...p, id: `X${i}` }));
    const robust = dataConfidence(p, robustList);
    expect(robust.grade).toBe('robust');
    expect(robust.precision).toBe('decimal');
  });

  it('comparableCount excludes the subject and cross-market listings', () => {
    const sale = PROPERTIES.find((q) => !q.priceOnApplication && q.price > 3_000_000)!;
    const otherArea = { ...sale, id: 'OTHER-AREA', area: 'Somewhere Else' };
    const sameArea = { ...sale, id: 'SAME-AREA' };
    const cross = dataConfidence(sale, [sale, otherArea, sameArea]);
    expect(cross.comparables).toBe(1);
    expect(comparableCount(sale, [sale, sameArea])).toBe(1);
    expect(comparableCount(sale, [sale, otherArea])).toBe(0);
  });

  it('presentation precision follows confidence — thin data never shows a decimal', () => {
    const p = PROPERTIES[0];
    const thinScore = investmentScore(p, { inventory: [p, { ...p, id: 'X2' }] });
    expect(thinScore.confidence.grade).toBe('thin');
    expect(displayOverall(thinScore)).toBe(thinScore.band); // band only, no number
    expect(displayOverall(thinScore)).not.toMatch(/\d\.\d/);
    expect(displayFactor(7.3, 'band')).toBe('7');

    const robustList = Array.from({ length: 20 }, (_, i) => ({ ...p, id: `X${i}` }));
    const robustScore = investmentScore(p, { inventory: robustList });
    expect(displayOverall(robustScore)).toMatch(/^\d+\.\d$/); // decimal preserved when earned
    expect(displayFactor(7.3, 'decimal')).toBe('7.3');
  });

  it('every score carries an engine version', () => {
    expect(INVESTMENT_ALGORITHM_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
    expect(results[0].r.confidence).toBeTruthy();
    expect(results[0].r.confidence.note.length).toBeGreaterThan(10);
  });
});
