// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import type { RentalApplication } from '@/lib/tenantStore';
import {
  applicationSummary,
  competitiveness,
  daysToRenewal,
  daysUntilRentDue,
  isValidKejaPhone,
  MOVING_CHECKLIST,
  nextRequestStatus,
  rentDueDay,
  SEED_APPLICATION,
  SEED_TENANT,
  TENANT_KEY,
  validateApplication,
} from '@/lib/tenantStore';

/** tenantStore: validation, renewal countdown and affordability-ratio logic. */

const app = (over: Partial<RentalApplication> = {}): RentalApplication => ({
  id: 'app-test',
  fullName: 'Mercy Wangari',
  phone: '+254 711 234 567',
  email: 'mercy.wangari@example.com',
  employment: 'employed',
  monthlyIncomeKes: 250000,
  employerName: 'Airtel Kenya',
  areas: ['Kilimani', 'Westlands'],
  maxRentKes: 60000,
  beds: 1,
  moveInBy: '2026-11-15',
  refName: 'Joseph Kariuki',
  refPhone: '+254 722 345 678',
  note: 'Prefers furnished.',
  createdAt: '2026-09-01T10:00:00Z',
  status: 'submitted',
  ...over,
});

describe('tenantStore — phone validation', () => {
  it('accepts the common Kenyan mobile formats', () => {
    expect(isValidKejaPhone('+254 711 234 567')).toBe(true);
    expect(isValidKejaPhone('0711 234 567')).toBe(true);
    expect(isValidKejaPhone('254711234567')).toBe(true);
    expect(isValidKejaPhone('0123456789')).toBe(true);
  });

  it('rejects non-mobile and malformed numbers', () => {
    expect(isValidKejaPhone('12345')).toBe(false);
    expect(isValidKejaPhone('+254 811 234 567')).toBe(false); // 8-prefix is not mobile
    expect(isValidKejaPhone('')).toBe(false);
    expect(isValidKejaPhone('+254 711 234')).toBe(false);
  });
});

describe('tenantStore — validateApplication', () => {
  it('passes a complete, honest application', () => {
    const result = validateApplication(app());
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('flags every missing required field at once', () => {
    const result = validateApplication(
      app({
        fullName: '  ',
        phone: 'not-a-phone',
        monthlyIncomeKes: 0,
        maxRentKes: 0,
        areas: [],
        moveInBy: '15/11/2026',
        refName: '',
        refPhone: 'oops',
      })
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(8);
    expect(result.errors.some((e) => e.includes('Full name'))).toBe(true);
    expect(result.errors.some((e) => e.includes('Phone'))).toBe(true);
    expect(result.errors.some((e) => e.includes('income'))).toBe(true);
    expect(result.errors.some((e) => e.includes('rent'))).toBe(true);
    expect(result.errors.some((e) => e.includes('area'))).toBe(true);
    expect(result.errors.some((e) => e.includes('Move-in'))).toBe(true);
    expect(result.errors.some((e) => e.includes('Referee name'))).toBe(true);
    expect(result.errors.some((e) => e.includes('Referee phone'))).toBe(true);
  });

  it('rejects a malformed optional email but keeps everything else valid', () => {
    const result = validateApplication(app({ email: 'not-an-email' }));
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(['Email address looks invalid.']);
  });

  it('the seeded example application is fully valid (submit-ready)', () => {
    expect(validateApplication(SEED_APPLICATION).ok).toBe(true);
  });
});

describe('tenantStore — renewal countdown', () => {
  it('counts whole days to the lease end from a fixed today', () => {
    expect(daysToRenewal('2027-05-31', '2026-09-08')).toBe(265);
    expect(daysToRenewal('2026-09-09', '2026-09-08')).toBe(1);
    expect(daysToRenewal('2026-09-08', '2026-09-08')).toBe(0);
  });

  it('goes negative once the lease has ended (expired state)', () => {
    expect(daysToRenewal('2026-01-01', '2026-09-08')).toBe(-250);
  });
});

describe('tenantStore — rent due reminders', () => {
  it('derives the due day-of-month from the lease start', () => {
    expect(rentDueDay('2026-06-01')).toBe(1);
    expect(rentDueDay('2026-05-23')).toBe(23);
  });

  it('counts days to the next due date and rolls to next month when passed', () => {
    expect(daysUntilRentDue('2026-06-01', '2026-09-08')).toBe(23); // → 1 Oct
    expect(daysUntilRentDue('2026-05-23', '2026-09-08')).toBe(15); // → 23 Sep
    expect(daysUntilRentDue('2026-01-08', '2026-09-08')).toBe(30); // due today → 8 Oct
  });

  it('rolls a 31st due-day into the next month on 30-day months', () => {
    expect(daysUntilRentDue('2026-07-31', '2026-09-08')).toBe(23); // → 1 Oct
  });
});

describe('tenantStore — competitiveness ratio', () => {
  it('Strong at or under 25% of income (inclusive boundary)', () => {
    expect(competitiveness(100000, 25000)).toEqual({
      ratio: 0.25,
      verdict: 'strong',
      label: 'Strong',
    });
    expect(competitiveness(250000, 60000).verdict).toBe('strong');
  });

  it('Moderate between 25% and 35% (inclusive upper boundary)', () => {
    expect(competitiveness(100000, 35000).verdict).toBe('moderate');
    expect(competitiveness(100000, 30000).ratio).toBeCloseTo(0.3, 5);
  });

  it('Stretch beyond 35% and on zero income', () => {
    expect(competitiveness(100000, 50000).verdict).toBe('stretch');
    expect(competitiveness(0, 50000).ratio).toBe(Number.POSITIVE_INFINITY);
    expect(competitiveness(0, 50000).verdict).toBe('stretch');
  });
});

describe('tenantStore — applicationSummary', () => {
  it('renders a shareable plain-text block with the honesty footer', () => {
    const text = applicationSummary(app());
    expect(text).toContain('KEJA RENTAL APPLICATION — Mercy Wangari');
    expect(text).toContain('Kilimani, Westlands');
    expect(text).toContain('KES 60,000/mo');
    expect(text).toContain('Joseph Kariuki');
    expect(text).toContain('ESTIMATE');
  });

  it('omits optional lines that were never filled in', () => {
    const text = applicationSummary(app({ email: undefined, note: undefined }));
    expect(text).not.toContain('Email');
    expect(text).not.toContain('Note:');
  });
});

describe('tenantStore — request pipeline + checklist', () => {
  it('advances submitted → acknowledged → scheduled and then stops', () => {
    expect(nextRequestStatus('submitted')).toBe('acknowledged');
    expect(nextRequestStatus('acknowledged')).toBe('scheduled');
    expect(nextRequestStatus('scheduled')).toBe('scheduled');
  });

  it('ships a 10-item moving checklist with unique ids and hints', () => {
    expect(MOVING_CHECKLIST).toHaveLength(10);
    const ids = MOVING_CHECKLIST.map((i) => i.id);
    expect(new Set(ids).size).toBe(10);
    expect(MOVING_CHECKLIST[0].title).toContain('KPLC');
    for (const item of MOVING_CHECKLIST) {
      expect(item.title.length).toBeGreaterThan(3);
      expect(item.hint.length).toBeGreaterThan(3);
    }
  });

  it('seeds one submitted application, a lease, two requests — and a Strong read', () => {
    expect(SEED_TENANT.applications).toHaveLength(1);
    expect(SEED_TENANT.applications[0].status).toBe('submitted');
    expect(SEED_TENANT.lease).not.toBeNull();
    expect(SEED_TENANT.requests).toHaveLength(2);
    expect(SEED_TENANT.checklist).toEqual({});
    expect(
      competitiveness(SEED_APPLICATION.monthlyIncomeKes, SEED_APPLICATION.maxRentKes).verdict
    ).toBe('strong');
    expect(TENANT_KEY).toBe('tenant');
  });
});
