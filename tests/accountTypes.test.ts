/**
 * Account types — registration catalogue (2026-09-11).
 *
 * Guards the pieces the registration + posting flows rely on: the catalogue
 * shape, the tamper-proof type guard, group destinations, and the
 * posting-permission predicate used by the listing wizard.
 */
import { describe, expect, it } from 'vitest';

import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_VALUES,
  accountTypeInfo,
  canPostProperties,
  isAccountType,
  POSTING_TYPES,
} from '@/lib/accountTypes';
import { submissionToListing, type ListingSubmission } from '@/lib/adminStore';

describe('ACCOUNT_TYPES catalogue', () => {
  it('offers the five journeys with unique values', () => {
    expect(ACCOUNT_TYPES.map((t) => t.value)).toEqual([
      'renter',
      'landlord',
      'developer',
      'agent',
      'investor',
    ]);
  });

  it('gives every type a destination route and at least one quick action', () => {
    for (const t of ACCOUNT_TYPES) {
      expect(t.to.startsWith('/')).toBe(true);
      expect(t.actions.length).toBeGreaterThan(0);
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.blurb.length).toBeGreaterThan(0);
    }
  });

  it('sends fresh landlords and developers straight to the posting wizard', () => {
    expect(accountTypeInfo('landlord').to).toBe('/sell');
    expect(accountTypeInfo('developer').to).toBe('/sell');
    expect(accountTypeInfo('renter').to).toBe('/properties');
  });
});

describe('isAccountType guard', () => {
  it('accepts the five real types and rejects everything else', () => {
    for (const v of ACCOUNT_TYPE_VALUES) expect(isAccountType(v)).toBe(true);
    expect(isAccountType('admin')).toBe(false); // role, not account type
    expect(isAccountType('')).toBe(false);
    expect(isAccountType(null)).toBe(false);
    expect(isAccountType(42)).toBe(false);
    expect(isAccountType({ value: 'renter' })).toBe(false);
  });
});

describe('accountTypeInfo', () => {
  it('resolves every catalogue entry', () => {
    for (const t of ACCOUNT_TYPES) expect(accountTypeInfo(t.value)).toBe(t);
  });

  it('throws on unknown types instead of returning undefined', () => {
    // @ts-expect-error deliberate misuse
    expect(() => accountTypeInfo('landord')).toThrow(/unknown account type/i);
  });
});

describe('canPostProperties', () => {
  it('allows landlords, developers and agents', () => {
    for (const t of POSTING_TYPES) expect(canPostProperties(t)).toBe(true);
    expect(POSTING_TYPES).toEqual(['landlord', 'developer', 'agent']);
  });

  it('blocks renters, investors and signed-out visitors', () => {
    expect(canPostProperties('renter')).toBe(false);
    expect(canPostProperties('investor')).toBe(false);
    expect(canPostProperties(undefined)).toBe(false);
    expect(canPostProperties(null)).toBe(false);
  });
});

describe('listing ownership attribution', () => {
  const base: ListingSubmission = {
    id: 'SUB-1',
    submitterName: 'Amina Kea',
    submitterEmail: 'amina@example.com',
    submitterPhone: '+254700000001',
    agency: 'Kea Developers Ltd',
    ownerEmail: 'amina@example.com',
    ownerName: 'Amina Kea',
    title: 'Sunlit 3BR, Kileleshwa',
    type: 'apartment',
    purpose: ['buy'],
    area: 'Kileleshwa',
    county: 'Nairobi',
    price: 16_500_000,
    rentEstimate: 110_000,
    bedrooms: 3,
    bathrooms: 2,
    sizeSqm: 120,
    amenities: [],
    images: [],
    description: 'A bright family home near the school strip.',
    source: 'wizard',
    status: 'pending',
    flags: [],
    completeness: 80,
    createdAt: '2026-09-11T00:00:00.000Z',
  };

  it('stamps the owner onto the published listing (My listings filter)', () => {
    const listing = submissionToListing(base);
    expect(listing.ownerEmail).toBe('amina@example.com');
    expect(listing.ownerName).toBe('Amina Kea');
    expect(listing.userSubmitted).toBe(true);
  });

  it('keeps legacy (owner-less) submissions valid — attribution optional', () => {
    const { ownerEmail: _e, ownerName: _n, ...legacy } = base;
    const listing = submissionToListing(legacy);
    expect(listing.ownerEmail).toBeUndefined();
    expect(listing.ownerName).toBeUndefined();
    expect(listing.agent.name).toBe('Amina Kea');
  });
});
