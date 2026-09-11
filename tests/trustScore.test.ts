/**
 * KEJA Trust Score™ — the twelve-factor composite.
 *
 * Pins the structural invariants (weights sum to one, factors stay in
 * 0-100, band thresholds) and the behavioural ones (adverse signals
 * reduce the risk factor; verified titles dominate unverified ones).
 */
import { PROPERTIES } from '@/data/properties';
import { trustScore } from '@/lib/trustScore';

describe('structure', () => {
  const results = PROPERTIES.slice(0, 25).map((p) => ({ p, r: trustScore(p) }));

  it('produces exactly twelve factors', () => {
    for (const { r } of results) expect(r.factors).toHaveLength(12);
  });

  it('factor weights sum to 1.0', () => {
    for (const { r } of results) {
      const sum = r.factors.reduce((s, f) => s + f.weight, 0);
      expect(sum).toBeCloseTo(1.0, 6);
    }
  });

  it('every factor score sits in 0-100', () => {
    for (const { r } of results) {
      for (const f of r.factors) {
        expect(f.score).toBeGreaterThanOrEqual(0);
        expect(f.score).toBeLessThanOrEqual(100);
      }
    }
  });

  it('composite matches the weighted sum of its factors', () => {
    for (const { r } of results) {
      const expected = Math.round(r.factors.reduce((s, f) => s + f.score * f.weight, 0));
      expect(r.composite).toBe(expected);
    }
  });

  it('composite stays in 0-100 and lands in a valid band', () => {
    const bands = ['Exceptional', 'Strong', 'Moderate', 'High Risk', 'Requires Significant Due Diligence'];
    for (const { r } of results) {
      expect(r.composite).toBeGreaterThanOrEqual(0);
      expect(r.composite).toBeLessThanOrEqual(100);
      expect(bands).toContain(r.band);
    }
  });

  it('every factor declares an honest basis', () => {
    const bases = ['FACT', 'ESTIMATE', 'ASSUMPTION'];
    for (const { r } of results) for (const f of r.factors) expect(bases).toContain(f.basis);
  });
});

describe('behaviour', () => {
  it('verified + Ardhisasa-matched titles outrank unverified ones', () => {
    const base = PROPERTIES[0];
    const verified = trustScore({
      ...base,
      verification: { ...base.verification, titleCheck: 'verified', ardhisasaMatch: true },
    });
    const flagged = trustScore({
      ...base,
      verification: { ...base.verification, titleCheck: 'flagged', ardhisasaMatch: false },
    });
    const own = (r: ReturnType<typeof trustScore>) =>
      r.factors.find((f) => f.key === 'ownership')?.score ?? 0;
    expect(own(verified)).toBe(97);
    expect(own(flagged)).toBe(22);
    expect(verified.composite).toBeGreaterThan(flagged.composite);
  });

  it('adverse trust signals reduce the risk factor', () => {
    const base = PROPERTIES[0];
    const clean = trustScore({
      ...base,
      trustSignals: [
        { label: 'Pricing check', status: 'pass', detail: 'within band' },
        { label: 'Ownership', status: 'pass', detail: 'verified' },
      ],
    });
    const adverse = trustScore({
      ...base,
      trustSignals: [
        { label: 'Pricing check', status: 'warn', detail: 'above band' },
        { label: 'Ownership', status: 'fail', detail: 'mismatch' },
      ],
    });
    const risk = (r: ReturnType<typeof trustScore>) => r.factors.find((f) => f.key === 'risk')?.score ?? 0;
    expect(risk(clean)).toBeGreaterThan(risk(adverse));
  });

  it('suspicious listing velocity is penalised harder than high velocity', () => {
    const base = PROPERTIES[0];
    const risk = (velocity: string) =>
      trustScore({
        ...base,
        verification: { ...base.verification, listingVelocity: velocity as 'suspicious' },
      }).factors.find((f) => f.key === 'risk')?.score ?? 0;
    expect(risk('normal')).toBeGreaterThan(risk('high'));
    expect(risk('high')).toBeGreaterThan(risk('suspicious'));
  });
});
