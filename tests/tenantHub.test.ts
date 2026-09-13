/**
 * Tenant Hub — unit tests for the pure logic the claims register's
 * 'tenant-hub' claim cites (application validation, lease dates,
 * competitiveness). The register previously said "covered by unit tests"
 * while no test file imported this module.
 */
import { describe, expect, it } from 'vitest';

import {
  competitiveness,
  daysToRenewal,
  daysUntilRentDue,
  isValidKejaPhone,
  nextRequestStatus,
  rentDueDay,
  validateApplication,
  type RentalApplication,
} from '@/lib/tenantStore';

const validApp = (): RentalApplication => ({
  id: 'app-1',
  fullName: 'Mercy Wangari',
  phone: '+254 711 234 567',
  email: 'mercy@example.com',
  employment: 'employed',
  monthlyIncomeKes: 250_000,
  areas: ['Kilimani'],
  maxRentKes: 80_000,
  beds: 2,
  moveInBy: '2026-10-01',
  refName: 'John Kamau',
  refPhone: '0722000000',
  createdAt: '2026-09-01T09:00:00Z',
  status: 'draft',
});

describe('isValidKejaPhone', () => {
  it.each([
    ['0712345678', true],
    ['0110123456', true],
    ['0133456789', true], // 01x prefixes are valid Kenyan mobiles (rule: 0 + [17] + 8 digits)
    ['+254712345678', true],
    ['+254 711 234 567', true],
    ['254712345678', true],
    ['0200456789', false], // 02 prefix is a landline shape
    ['071234567', false], // too few digits
    ['+2547123456789', false], // too many digits
    ['12345', false],
    ['abcdefghij', false],
  ])('%s → %s', (phone, expected) => {
    expect(isValidKejaPhone(phone)).toBe(expected);
  });
});

describe('validateApplication', () => {
  it('accepts a complete application', () => {
    const v = validateApplication(validApp());
    expect(v.ok).toBe(true);
    expect(v.errors).toEqual([]);
  });

  it('collects every failure at once', () => {
    const v = validateApplication({
      ...validApp(),
      fullName: 'Me',
      phone: 'not-a-phone',
      email: 'broken-at',
      monthlyIncomeKes: 0,
      maxRentKes: -1,
      areas: [],
      moveInBy: '31/09/2026',
      refName: '',
      refPhone: '000',
    });
    expect(v.ok).toBe(false);
    expect(v.errors.length).toBeGreaterThanOrEqual(8);
  });

  it('rejects a bad referee phone even when the applicant phone is fine', () => {
    const v = validateApplication({ ...validApp(), refPhone: '0800-000-000' });
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes('Referee phone'))).toBe(true);
  });

  it('accepts a missing email (optional field) but rejects a malformed one', () => {
    expect(validateApplication({ ...validApp(), email: undefined }).ok).toBe(true);
    expect(validateApplication({ ...validApp(), email: 'nope' }).ok).toBe(false);
  });
});

describe('lease date math', () => {
  it('daysToRenewal counts whole days from a fixed today', () => {
    expect(daysToRenewal('2026-10-01', '2026-09-13')).toBe(18);
    expect(daysToRenewal('2026-09-13', '2026-09-13')).toBe(0);
    expect(daysToRenewal('2026-09-01', '2026-09-13')).toBe(-12);
  });

  it('rentDueDay derives the due day from the lease start', () => {
    expect(rentDueDay('2026-01-15')).toBe(15);
    expect(rentDueDay('2026-02-01')).toBe(1);
  });

  it('daysUntilRentDue rolls to next month when today is the due day', () => {
    // due the 5th; on the 5th the next due date is next month's 5th
    expect(daysUntilRentDue('2026-01-05', '2026-09-05')).toBe(30);
    // due the 15th, today the 13th → 2 days
    expect(daysUntilRentDue('2026-03-15', '2026-09-13')).toBe(2);
    // due the 1st, today the 30th of a 31-day month → 2 days (rolls to the 1st)
    expect(daysUntilRentDue('2026-05-01', '2026-08-30')).toBe(2);
  });
});

describe('competitiveness', () => {
  it('strong at ≤ 25% of income', () => {
    const c = competitiveness(200_000, 50_000);
    expect(c.verdict).toBe('strong');
    expect(c.ratio).toBeCloseTo(0.25);
  });

  it('moderate between 25% and 35%', () => {
    expect(competitiveness(200_000, 60_000).verdict).toBe('moderate');
  });

  it('stretch beyond 35%', () => {
    expect(competitiveness(100_000, 50_000).verdict).toBe('stretch');
  });

  it('zero income never divides to a silent verdict', () => {
    const c = competitiveness(0, 50_000);
    expect(c.verdict).toBe('stretch');
    expect(c.ratio).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('nextRequestStatus', () => {
  it('walks the demo pipeline submitted → acknowledged → scheduled', () => {
    expect(nextRequestStatus('submitted')).toBe('acknowledged');
    expect(nextRequestStatus('acknowledged')).toBe('scheduled');
    expect(nextRequestStatus('scheduled')).toBe('scheduled');
  });
});
