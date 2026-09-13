/**
 * Trust Anchor — the published, per-release score manifest (wave 12).
 *
 * Pins the contract the platform's audit story depends on:
 *  - the manifest covers the platform catalogue exactly (no missing ids)
 *  - digests are tamper-evident: any factor/weight/outcome change breaks them
 *  - the manifest is reproducible for the same inputs (except the timestamp)
 *  - validation catches coverage gaps and malformed entries
 */
import { PROPERTIES } from '@/data/properties';
import { AUTO_PROPERTIES } from '@/lib/autoListings';
import {
  anchorDigest,
  buildTrustAnchor,
  inputSnapshotDigest,
  TRUST_ANCHOR_SCHEMA_VERSION,
  validateTrustAnchor,
} from '@/lib/trustAnchor';
import { TRUST_ALGORITHM_VERSION } from '@/lib/trustScore';
import { INVESTMENT_ALGORITHM_VERSION } from '@/lib/investmentScore';

const CATALOGUE = [...AUTO_PROPERTIES, ...PROPERTIES];
const IDS = CATALOGUE.map((p) => p.id);

describe('buildTrustAnchor', () => {
  it('covers the platform catalogue exactly, once per listing', () => {
    const m = buildTrustAnchor(CATALOGUE, '2026-09-13T00:00:00.000Z');
    expect(m.listings).toHaveLength(IDS.length);
    const ids = m.listings.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of IDS) expect(ids).toContain(id);
    expect(m.inventoryCount).toBe(IDS.length);
  });

  it('carries both engine versions and schema version', () => {
    const m = buildTrustAnchor(CATALOGUE, '2026-09-13T00:00:00.000Z');
    expect(m.schemaVersion).toBe(TRUST_ANCHOR_SCHEMA_VERSION);
    expect(m.algorithmVersion).toBe(TRUST_ALGORITHM_VERSION);
    expect(m.investmentAlgorithmVersion).toBe(INVESTMENT_ALGORITHM_VERSION);
    expect(m.algorithmVersion).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
  });

  it('is reproducible for the same inputs (except generatedAt)', () => {
    const a = buildTrustAnchor(CATALOGUE, '2026-09-13T00:00:00.000Z');
    const b = buildTrustAnchor(CATALOGUE, '2026-09-13T00:00:00.000Z');
    expect(a).toEqual(b);
    const c = buildTrustAnchor(CATALOGUE, '2026-09-14T00:00:00.000Z');
    expect(c.listings).toEqual(a.listings); // scores unchanged, only the stamp
    expect(c.generatedAt).not.toBe(a.generatedAt);
  });

  it('input snapshot changes when the underlying data changes', () => {
    const before = inputSnapshotDigest(CATALOGUE);
    const edited = CATALOGUE.map((p, i) => (i === 0 ? { ...p, price: p.price + 1 } : p));
    expect(inputSnapshotDigest(edited)).not.toBe(before);
    // order must not matter
    const reordered = [...CATALOGUE].reverse();
    expect(inputSnapshotDigest(reordered)).toBe(before);
  });
});

describe('tamper evidence', () => {
  it('any factor score change breaks the digest', () => {
    const base = {
      id: 'KJA-001',
      trust: 88,
      band: 'Strong',
      investment: 7.9,
      investmentBand: 'Strong',
      trustFactors: [{ key: 'ownership', score: 97, weight: 0.22 }],
      investmentFactors: [{ key: 'rental', score: 8.2 }],
    };
    const d0 = anchorDigest(base);
    const tampered = {
      ...base,
      trustFactors: [{ key: 'ownership', score: 96, weight: 0.22 }],
    };
    expect(anchorDigest(tampered)).not.toBe(d0);
  });

  it('any weight change breaks the digest', () => {
    const base = {
      id: 'KJA-001',
      trust: 88,
      band: 'Strong',
      investment: 7.9,
      investmentBand: 'Strong',
      trustFactors: [{ key: 'ownership', score: 97, weight: 0.22 }],
      investmentFactors: [{ key: 'rental', score: 8.2 }],
    };
    const d0 = anchorDigest(base);
    const reweighted = { ...base, trustFactors: [{ key: 'ownership', score: 97, weight: 0.23 }] };
    expect(anchorDigest(reweighted)).not.toBe(d0);
  });

  it('an outcome change (same factors) breaks the digest', () => {
    const base = {
      id: 'KJA-001',
      trust: 88,
      band: 'Strong',
      investment: 7.9,
      investmentBand: 'Strong',
      trustFactors: [{ key: 'ownership', score: 97, weight: 0.22 }],
      investmentFactors: [{ key: 'rental', score: 8.2 }],
    };
    expect(anchorDigest({ ...base, trust: 87 })).not.toBe(anchorDigest(base));
  });
});

describe('validateTrustAnchor', () => {
  it('accepts a freshly built manifest over the catalogue', () => {
    const m = buildTrustAnchor(CATALOGUE, '2026-09-13T00:00:00.000Z');
    expect(validateTrustAnchor(m, IDS)).toEqual([]);
  });

  it('flags listings missing from the manifest', () => {
    const m = buildTrustAnchor(CATALOGUE, '2026-09-13T00:00:00.000Z');
    const pruned = { ...m, listings: m.listings.slice(0, m.listings.length - 3) };
    const violations = validateTrustAnchor(pruned, IDS);
    expect(violations.length).toBeGreaterThanOrEqual(3);
    expect(violations.some((v) => v.why.includes('missing from manifest'))).toBe(true);
  });

  it('flags malformed entries', () => {
    const m = buildTrustAnchor(CATALOGUE, '2026-09-13T00:00:00.000Z');
    const mangled = {
      ...m,
      listings: [{ ...m.listings[0], digest: 'not-a-hash' }, ...m.listings.slice(1)],
    };
    const violations = validateTrustAnchor(mangled, IDS);
    expect(violations.some((v) => v.why.includes('digest'))).toBe(true);
  });

  it('flags unversioned engines', () => {
    const m = buildTrustAnchor(CATALOGUE, '2026-09-13T00:00:00.000Z');
    const unversioned = { ...m, algorithmVersion: '' };
    expect(validateTrustAnchor(unversioned, IDS).length).toBeGreaterThan(0);
  });
});
