import { describe, expect, it } from 'vitest';

import type { Property } from '@/data/properties';
import { formatKES, formatNumber, timeAgo, trustTier } from '@/lib/format';
import { findProperty, partnerTrustScore, userListingToProperty } from '@/lib/inventory';
import { investmentScore, scoreTone } from '@/lib/investmentScore';

/** Minimal but schema-complete sale listing used by the scoring exercises. */
const baseProperty: Property = {
  id: 'KJA-T001',
  title: 'Test Villa',
  type: 'villa',
  purpose: ['buy'],
  area: 'Kitengela',
  county: 'Kajiado',
  price: 12_500_000,
  rentEstimate: 90_000,
  bedrooms: 4,
  bathrooms: 3,
  sizeSqm: 200,
  amenities: ['Borehole'],
  images: ['/images/props/1.jpg'],
  description: 'Test listing',
  agency: 'Test Agency',
  agent: { name: 'Jane', phone: '+254700000000' },
  trustScore: 82,
  verification: {
    titleCheck: 'verified',
    ardhisasaMatch: true,
    photosVerified: true,
    duplicateCheck: 'clean',
    listingVelocity: 'normal',
    lastChecked: new Date().toISOString(),
  },
  trustSignals: [],
  availability: 'available',
  listedAt: new Date().toISOString(),
  views: 120,
  highlights: [],
};

describe('formatKES', () => {
  it('compacts millions with one decimal only when needed', () => {
    expect(formatKES(14_500_000)).toBe('KES 14.5M');
    expect(formatKES(2_000_000)).toBe('KES 2M');
    expect(formatKES(850_000)).toBe('KES 850,000');
  });

  it('formats billions', () => {
    expect(formatKES(1_200_000_000)).toBe('KES 1.2B');
  });

  it('appends /mo for monthly figures and honours compact=false', () => {
    expect(formatKES(65_000, { monthly: true })).toBe('KES 65,000/mo');
    expect(formatKES(2_500_000, { compact: false })).toBe('KES 2,500,000');
  });
});

describe('trustTier', () => {
  it('maps score bands to tiers and tones', () => {
    expect(trustTier(95).tone).toBe('high');
    expect(trustTier(90).label).toBe('Highly Verified');
    expect(trustTier(76).tone).toBe('good');
    expect(trustTier(75).label).toBe('Verified');
    expect(trustTier(60).tone).toBe('watch');
    expect(trustTier(59).tone).toBe('avoid');
  });
});

describe('timeAgo', () => {
  it('classifies today / yesterday / days / months', () => {
    const now = Date.now();
    expect(timeAgo(new Date(now).toISOString())).toBe('today');
    expect(timeAgo(new Date(now - 1.5 * 86400000).toISOString())).toBe('yesterday');
    expect(timeAgo(new Date(now - 5 * 86400000).toISOString())).toBe('5 days ago');
    expect(timeAgo(new Date(now - 45 * 86400000).toISOString())).toBe('1 month ago');
    expect(timeAgo(new Date(now - 100 * 86400000).toISOString())).toBe('3 months ago');
  });
});

describe('formatNumber', () => {
  it('groups thousands', () => {
    expect(formatNumber(1234567)).toMatch(/1,234,567/);
  });
});

describe('investmentScore', () => {
  it('returns bounded 3–10 factors and a 0–100 overall score', () => {
    const s = investmentScore(baseProperty);
    for (const f of s.factors) {
      expect(f.score).toBeGreaterThanOrEqual(3);
      expect(f.score).toBeLessThanOrEqual(10);
    }
    expect(s.overall).toBeGreaterThanOrEqual(0);
    expect(s.overall).toBeLessThanOrEqual(100);
  });

  it('scores a cheap-per-sqm listing higher than an overpriced twin', () => {
    const overpriced = { ...baseProperty, price: 45_000_000, id: 'KJA-T002' };
    expect(investmentScore(baseProperty).overall).toBeGreaterThan(
      investmentScore(overpriced).overall
    );
  });

  it('handles rental listings (price = monthly rent) without NaN', () => {
    const rental = {
      ...baseProperty,
      purpose: ['rent'] as Property['purpose'],
      price: 85_000,
      rentEstimate: undefined,
      grossYieldEstimate: 7.2,
    };
    const s = investmentScore(rental);
    expect(Number.isFinite(s.overall)).toBe(true);
    expect(s.factors.every((f) => Number.isFinite(f.score))).toBe(true);
  });

  it('scoreTone buckets 0–10 scores into escalating chip classes', () => {
    expect(scoreTone(9).chip).toContain('bg-green-600');
    expect(scoreTone(8).chip).toContain('bg-gold-gradient');
    expect(scoreTone(7).chip).toContain('bg-gold-100');
    expect(scoreTone(6).chip).toContain('bg-amber-100');
    expect(scoreTone(3).chip).toContain('bg-red-100');
  });
});

describe('inventory helpers', () => {
  it('findProperty matches by id and misses cleanly', () => {
    const all = [baseProperty, { ...baseProperty, id: 'KJA-T009' }];
    expect(findProperty(all, 'KJA-T001')?.id).toBe('KJA-T001');
    expect(findProperty(all, 'nope')).toBeUndefined();
  });

  it('partnerTrustScore rewards submission completeness, caps at 94', () => {
    // bare-minimum submission: human review only
    const weak = partnerTrustScore({
      ...baseProperty,
      images: [],
      amenities: [],
      rentEstimate: undefined,
      description: 'short',
    } as never);
    // complete submission: 2+ photos, 120+ char description, 3+ amenities
    const strong = partnerTrustScore({
      ...baseProperty,
      images: ['/a.jpg', '/b.jpg'],
      amenities: ['Borehole', 'Garden', 'Gated'],
      rentEstimate: 90_000,
      description: 'x'.repeat(150),
    } as never);
    expect(weak).toBe(78);
    expect(strong).toBe(90);
    expect(strong).toBeLessThanOrEqual(94);
  });

  it('userListingToProperty adapts a submission with trust fields', () => {
    const p = userListingToProperty({
      ...baseProperty,
      source: 'partner-feed',
      images: ['/images/props/x.jpg'],
    } as never);
    expect(p.trustScore).toBeLessThanOrEqual(94);
    expect(p.verification.titleCheck).toBe('verified');
    expect(p.trustSignals.some((s) => /Human-reviewed/i.test(s.label))).toBe(true);
  });
});
