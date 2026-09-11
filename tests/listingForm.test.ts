/**
 * The listing-wizard publish boundary (wave 10).
 *
 * Before this gate, the wizard stored its form state verbatim: an emptied
 * numeric field is NaN or 0, an empty title is not a listing — and the junk
 * flowed straight into the marketplace merge (useAllProperties), home stats
 * and the AI corpus. These tests pin the schema that now stands between
 * the form and the store.
 */
import { describe, expect, it } from 'vitest';

import { listingFormSchema, validateListingForm } from '@/lib/boundaries';

const VALID = {
  title: 'Sunlit 3BR with garden, Kileleshwa',
  type: 'apartment',
  area: 'Kileleshwa',
  county: 'Nairobi',
  price: 14_500_000,
  rentEstimate: 85_000,
  bedrooms: 3,
  bathrooms: 2,
  sizeSqm: 140,
  purpose: ['buy'],
  description: 'Bright corner unit on a quiet street. Recently renovated kitchen, mature garden.',
  phone: '+254 722 000 111',
};

describe('valid submissions pass', () => {
  it('accepts the canonical form and returns the cleaned value', () => {
    const check = validateListingForm(VALID);
    expect(check.ok).toBe(true);
    if (check.ok) expect(check.value.title).toBe(VALID.title);
  });

  it('accepts land without bedrooms and a zero rent estimate', () => {
    const check = validateListingForm({
      ...VALID,
      type: 'land',
      bedrooms: 0,
      bathrooms: 0,
      rentEstimate: 0,
      purpose: ['invest'],
    });
    expect(check.ok).toBe(true);
  });
});

describe('the failure modes the gate exists for', () => {
  it('rejects an empty or too-short title', () => {
    for (const title of ['', 'short', '   ']) {
      const check = validateListingForm({ ...VALID, title });
      expect(check.ok).toBe(false);
      if (!check.ok) expect(check.errors.title).toMatch(/title/i);
    }
  });

  it('rejects NaN, 0, negative and absurd prices (the emptied-field case)', () => {
    for (const price of [NaN, 0, -5, 1e12]) {
      const check = validateListingForm({ ...VALID, price });
      expect(check.ok).toBe(false);
      if (!check.ok) expect(check.errors.price).toBeTruthy();
    }
  });

  it('rejects NaN / tiny / absurd sizes', () => {
    for (const sizeSqm of [NaN, 0, 5, 2e6]) {
      const check = validateListingForm({ ...VALID, sizeSqm });
      expect(check.ok).toBe(false);
      if (!check.ok) expect(check.errors.sizeSqm).toBeTruthy();
    }
  });

  it('rejects an empty purpose selection', () => {
    const check = validateListingForm({ ...VALID, purpose: [] });
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.errors.purpose).toMatch(/purpose/i);
  });

  it('rejects a too-short or oversized description', () => {
    expect(validateListingForm({ ...VALID, description: 'too short' }).ok).toBe(false);
    expect(
      validateListingForm({ ...VALID, description: 'x'.repeat(5_001) }).ok,
    ).toBe(false);
    expect(validateListingForm({ ...VALID, description: 'x'.repeat(5_000) }).ok).toBe(true);
  });

  it('rejects an oversized phone field', () => {
    const check = validateListingForm({ ...VALID, phone: '+254 722 000 111 999 888 777' });
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.errors.phone).toBeTruthy();
  });

  it('reports the first error per field, keyed by field name', () => {
    const check = validateListingForm({ ...VALID, title: '', price: NaN });
    expect(check.ok).toBe(false);
    if (!check.ok) {
      expect(Object.keys(check.errors).sort()).toEqual(['price', 'title']);
    }
  });
});

describe('schema caps are the contract they claim to be', () => {
  it('a 120-char title and 5,000-char description are the exact bounds', () => {
    expect(listingFormSchema.safeParse({ ...VALID, title: 'T'.repeat(120) }).success).toBe(true);
    expect(listingFormSchema.safeParse({ ...VALID, title: 'T'.repeat(121) }).success).toBe(false);
    expect(listingFormSchema.safeParse({ ...VALID, description: 'D'.repeat(5_000) }).success).toBe(true);
  });
});
