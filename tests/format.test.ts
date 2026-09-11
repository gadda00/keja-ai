/**
 * Formatting helpers — money, trust tiers and relative time.
 * These render in every listing card; a regression here is user-visible
 * everywhere at once.
 */
import { formatKES, formatNumber, timeAgo, trustTier } from '@/lib/format';

describe('formatKES', () => {
  it('compacts millions', () => {
    expect(formatKES(14_500_000)).toBe('KES 14.5M');
    expect(formatKES(8_000_000)).toBe('KES 8M');
  });

  it('compacts billions', () => {
    expect(formatKES(2_400_000_000)).toBe('KES 2.4B');
  });

  it('locale-formats sub-million amounts', () => {
    expect(formatKES(850_000)).toBe('KES 850,000');
    expect(formatKES(65_000)).toBe('KES 65,000');
  });

  it('appends /mo for monthly amounts', () => {
    expect(formatKES(65_000, { monthly: true })).toBe('KES 65,000/mo');
    expect(formatKES(14_500_000, { monthly: true })).toBe('KES 14.5M/mo');
  });

  it('honours compact:false for exact millions', () => {
    expect(formatKES(8_000_000, { compact: false })).toBe('KES 8,000,000');
  });

  it('handles zero and small amounts', () => {
    expect(formatKES(0)).toBe('KES 0');
    expect(formatKES(500)).toBe('KES 500');
  });
});

describe('formatNumber', () => {
  it('groups thousands', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });
});

describe('trustTier bands (platform standard)', () => {
  it('maps the five interpretation bands at their boundaries', () => {
    expect(trustTier(100).label).toBe('Exceptional');
    expect(trustTier(90).label).toBe('Exceptional');
    expect(trustTier(89).label).toBe('Strong');
    expect(trustTier(80).label).toBe('Strong');
    expect(trustTier(79).label).toBe('Moderate');
    expect(trustTier(70).label).toBe('Moderate');
    expect(trustTier(69).label).toBe('High Risk');
    expect(trustTier(60).label).toBe('High Risk');
    expect(trustTier(59).label).toBe('Requires Significant Due Diligence');
  });

  it('tones narrow from high to avoid', () => {
    expect(trustTier(95).tone).toBe('high');
    expect(trustTier(75).tone).toBe('good');
    expect(trustTier(65).tone).toBe('watch');
    expect(trustTier(40).tone).toBe('avoid');
  });
});

describe('timeAgo', () => {
  it('renders today / yesterday / days / months', () => {
    const now = Date.now();
    expect(timeAgo(new Date(now).toISOString())).toBe('today');
    expect(timeAgo(new Date(now - 86400000).toISOString())).toBe('yesterday');
    expect(timeAgo(new Date(now - 5 * 86400000).toISOString())).toBe('5 days ago');
    expect(timeAgo(new Date(now - 45 * 86400000).toISOString())).toBe('1 month ago');
    expect(timeAgo(new Date(now - 100 * 86400000).toISOString())).toBe('3 months ago');
  });
});
