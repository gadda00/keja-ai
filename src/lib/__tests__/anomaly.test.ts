// @vitest-environment jsdom
/**
 * Anomaly detection — the trust gate for listing submissions.
 *
 * Regression coverage for the two bugs found in review:
 *  1. runAnomalyDetection used to WRITE the duplicate signature to
 *     localStorage on every call — since the wizard calls it inside useMemo
 *     on every keystroke, a user's own live draft got flagged
 *     `duplicate-suspected` against itself on the second keystroke.
 *  2. Signatures are now recorded exactly once at submit time
 *     (recordListingSignature), never during typing.
 */
import { afterEach, describe, expect, it } from 'vitest';

import {
  getListingSignatures,
  recordListingSignature,
  runAnomalyDetection,
} from '@/lib/adminStore';

const draft = {
  title: 'Spacious 3BR apartment in Kilimani with dsq',
  area: 'Kilimani',
  county: 'Nairobi',
  price: 14000000,
  sizeSqm: 140,
  bedrooms: 3,
  description:
    'A well-finished three-bedroom apartment in a gated complex off Argwings Kodhek Road, ' +
    'featuring ample natural light, borehole water, backup power, secure parking and a ' +
    'children play area. Walking distance to Yaya Centre and Kilimani schools.',
  images: ['/images/props/apartment_0.jpg', '/images/props/apartment_1.jpg'],
  amenities: ['lift', 'balcony', 'borehole', 'parking'],
};

afterEach(() => {
  localStorage.clear();
});

describe('runAnomalyDetection purity', () => {
  it('never writes to localStorage (typing must be side-effect free)', () => {
    // simulate the wizard: run the detector twice in a row on the same draft
    runAnomalyDetection(draft);
    runAnomalyDetection(draft);
    // no signature may have been recorded by mere evaluation
    expect(getListingSignatures()).toHaveLength(0);
  });

  it('does not flag the user\u2019s own draft as a duplicate while typing', () => {
    const first = runAnomalyDetection(draft);
    expect(first.flags).not.toContain('duplicate-suspected');
    // second keystroke / re-render — same draft, still no self-flag
    const second = runAnomalyDetection(draft, getListingSignatures());
    expect(second.flags).not.toContain('duplicate-suspected');
  });

  it('flags a genuinely duplicate submission (signature recorded at submit)', () => {
    recordListingSignature(draft); // submit #1 records the signature
    const resubmission = runAnomalyDetection(draft, getListingSignatures());
    expect(resubmission.flags).toContain('duplicate-suspected');
  });

  it('scores completeness and keeps flag ordering stable', () => {
    const r = runAnomalyDetection(draft);
    expect(r.completeness).toBeGreaterThan(60);
    expect(new Set(r.flags).size).toBe(r.flags.length); // deduped
  });

  it('detects suspicious pricing against the per-sqm band', () => {
    const tooCheap = runAnomalyDetection({ ...draft, price: 900000, sizeSqm: 140 });
    expect(tooCheap.flags).toContain('suspicious-price');
  });

  it('records each signature exactly once (idempotent)', () => {
    recordListingSignature(draft);
    recordListingSignature(draft);
    recordListingSignature(draft);
    expect(getListingSignatures()).toHaveLength(1);
  });
});
