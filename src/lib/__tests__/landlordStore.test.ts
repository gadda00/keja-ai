// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import type { MaintenanceTicket, RentPayment, Tenant, Unit } from '@/lib/landlordStore';
import {
  asOfMonth,
  collectionRate,
  computeArrears,
  LANDLORD_KEY,
  MGMT_FEE_PCT,
  monthCount,
  monthIncome,
  occupancyRate,
  paymentsStatement,
  SEED_LANDLORD,
} from '@/lib/landlordStore';

/** landlordStore: every studio stat is computed by these pure helpers. */

const unit = (over: Partial<Unit> = {}): Unit => ({
  id: 'u1',
  name: 'Test Unit',
  type: 'apartment',
  area: 'Kilimani',
  beds: 2,
  monthlyRentKes: 85000,
  status: 'occupied',
  ...over,
});

const tenant = (over: Partial<Tenant> = {}): Tenant => ({
  id: 't1',
  unitId: 'u1',
  name: 'Test Tenant',
  phone: '+254 700 000 000',
  leaseStart: '2026-06-01',
  leaseEnd: '2026-11-30',
  monthlyRentKes: 85000,
  depositKes: 170000,
  balanceKes: 0,
  ...over,
});

const pay = (over: Partial<RentPayment> = {}): RentPayment => ({
  id: 'p1',
  tenantId: 't1',
  unitId: 'u1',
  month: '2026-09',
  amountKes: 85000,
  channel: 'mpesa',
  paidOn: '2026-09-05T09:00:00Z',
  ...over,
});

describe('landlordStore — month utilities', () => {
  it('monthCount is inclusive and reverses to zero', () => {
    expect(monthCount('2026-06', '2026-09')).toBe(4);
    expect(monthCount('2026-09', '2026-09')).toBe(1);
    expect(monthCount('2026-09', '2026-06')).toBe(0);
    expect(monthCount('2025-11', '2026-02')).toBe(4);
  });

  it('asOfMonth follows the latest recorded payment, with a fallback', () => {
    const payments = [pay({ month: '2026-07' }), pay({ month: '2026-09', id: 'p2' })];
    expect(asOfMonth(payments)).toBe('2026-09');
    expect(asOfMonth([], '2026-08')).toBe('2026-08');
    expect(asOfMonth([])).toBe('');
  });
});

describe('landlordStore — computeArrears', () => {
  it('pays in full → zero balance', () => {
    const payments = ['2026-06', '2026-07', '2026-08', '2026-09'].map((m, i) =>
      pay({ id: `p${i}`, month: m })
    );
    const arrears = computeArrears([tenant()], payments);
    expect(arrears.t1).toEqual({ expectedKes: 340000, paidKes: 340000, balanceKes: 0 });
  });

  it('one partial payment creates the exact arrears (85,000 − 45,000 = 40,000)', () => {
    const payments = [
      pay({ id: 'p1', month: '2026-06' }),
      pay({ id: 'p2', month: '2026-07' }),
      pay({ id: 'p3', month: '2026-08' }),
      pay({ id: 'p4', month: '2026-09', amountKes: 45000, note: 'partial' }),
    ];
    const arrears = computeArrears([tenant()], payments);
    expect(arrears.t1.paidKes).toBe(300000);
    expect(arrears.t1.balanceKes).toBe(40000);
  });

  it('expected rent is capped at the latest ledger month (no future billing)', () => {
    // payments only reach 2026-07 → the tenant is billed Jun+Jul, not through Nov
    const payments = [pay({ id: 'p1', month: '2026-07' })];
    const arrears = computeArrears([tenant()], payments);
    expect(arrears.t1.expectedKes).toBe(170000);
    expect(arrears.t1.balanceKes).toBe(85000);
  });

  it('expected rent stops at lease end even when the ledger runs on', () => {
    const ended = tenant({ leaseStart: '2026-06-01', leaseEnd: '2026-07-31' });
    const other = pay({ id: 'p9', tenantId: 't9', unitId: 'u9', month: '2026-09' });
    const arrears = computeArrears([ended], [other]);
    expect(arrears.t1.expectedKes).toBe(170000); // Jun + Jul only
    expect(arrears.t1.paidKes).toBe(0);
  });

  it('an empty ledger owes nothing (the clock starts when money moves)', () => {
    const arrears = computeArrears([tenant()], []);
    expect(arrears.t1).toEqual({ expectedKes: 0, paidKes: 0, balanceKes: 0 });
  });

  it('over-payment shows as a negative balance (credit)', () => {
    const payments = [
      pay({ id: 'p1', month: '2026-06' }),
      pay({ id: 'p2', month: '2026-07' }),
      pay({ id: 'p3', month: '2026-08' }),
      pay({ id: 'p4', month: '2026-09' }),
      pay({ id: 'p5', month: '2026-09', amountKes: 15000, note: 'advance' }),
    ];
    const arrears = computeArrears([tenant()], payments);
    expect(arrears.t1.paidKes).toBe(355000);
    expect(arrears.t1.balanceKes).toBe(-15000);
  });
});

describe('landlordStore — occupancyRate', () => {
  it('counts occupied + notice as tenanted; vacant drags the rate', () => {
    const units = [
      unit({ id: 'a', status: 'occupied' }),
      unit({ id: 'b', status: 'occupied' }),
      unit({ id: 'c', status: 'notice' }),
      unit({ id: 'd', status: 'vacant' }),
    ];
    expect(occupancyRate(units)).toBe(75);
  });

  it('empty portfolio → 0, never NaN', () => {
    expect(occupancyRate([])).toBe(0);
  });
});

describe('landlordStore — collectionRate', () => {
  it('partial collection month → collected ÷ expected', () => {
    const payments = [pay({ amountKes: 45000 })];
    expect(collectionRate([tenant()], payments, '2026-09')).toBeCloseTo(52.94, 2);
  });

  it('full collection month → 100', () => {
    const payments = [pay({})];
    expect(collectionRate([tenant()], payments, '2026-09')).toBe(100);
  });

  it('months outside the lease window expect nothing (ended lease ≠ arrears)', () => {
    const ended = tenant({ leaseEnd: '2026-09-30' });
    expect(collectionRate([ended], [], '2026-10')).toBe(0);
    expect(collectionRate([ended], [], '2026-05')).toBe(0);
  });

  it('no expected rent → 0, never NaN', () => {
    expect(collectionRate([], [], '2026-09')).toBe(0);
  });
});

describe('landlordStore — monthIncome', () => {
  it('sums only the selected month across tenants and channels', () => {
    const payments = [
      pay({ id: 'p1', tenantId: 't1', amountKes: 45000 }),
      pay({ id: 'p2', tenantId: 't2', amountKes: 185000, channel: 'bank' }),
      pay({ id: 'p3', tenantId: 't1', month: '2026-08', amountKes: 85000 }),
    ];
    expect(monthIncome(payments, '2026-09')).toBe(230000);
    expect(monthIncome(payments, '2026-08')).toBe(85000);
    expect(monthIncome(payments, '2025-12')).toBe(0);
  });
});

describe('landlordStore — paymentsStatement', () => {
  it('charges the management fee on COLLECTED rent, not expected rent', () => {
    // expected 315,000 but only 275,000 collected → fee 8% × 275,000 = 22,000 (not 25,200)
    const s = paymentsStatement(
      SEED_LANDLORD.units,
      SEED_LANDLORD.tenants,
      SEED_LANDLORD.payments,
      SEED_LANDLORD.tickets,
      '2026-09',
      8
    );
    expect(s.grossCollected).toBe(275000);
    expect(s.mgmtFee).toBe(22000);
    expect(s.mgmtFee).not.toBe(25200);
  });

  it('books maintenance in the resolution month only', () => {
    const july = paymentsStatement(
      SEED_LANDLORD.units,
      SEED_LANDLORD.tenants,
      SEED_LANDLORD.payments,
      SEED_LANDLORD.tickets,
      '2026-07',
      8
    );
    const august = paymentsStatement(
      SEED_LANDLORD.units,
      SEED_LANDLORD.tenants,
      SEED_LANDLORD.payments,
      SEED_LANDLORD.tickets,
      '2026-08',
      8
    );
    expect(july.maintenanceCost).toBe(18500); // water heater resolved 16 Jul
    expect(august.maintenanceCost).toBe(0); // repaint resolved 12 Sep, not Aug
  });

  it('net = collected − maintenance − fee', () => {
    const s = paymentsStatement(
      SEED_LANDLORD.units,
      SEED_LANDLORD.tenants,
      SEED_LANDLORD.payments,
      SEED_LANDLORD.tickets,
      '2026-09',
      8
    );
    expect(s.maintenanceCost).toBe(32000);
    expect(s.net).toBe(275000 - 32000 - 22000);
    expect(s.net).toBe(221000);
  });

  it('byUnit keeps vacant units out of collections but books their maintenance', () => {
    const s = paymentsStatement(
      SEED_LANDLORD.units,
      SEED_LANDLORD.tenants,
      SEED_LANDLORD.payments,
      SEED_LANDLORD.tickets,
      '2026-09',
      8
    );
    const syokimau = s.byUnit.find((u) => u.unitId === 'u-syokimau-3br');
    expect(syokimau?.status).toBe('vacant');
    expect(syokimau?.expectedKes).toBe(0);
    expect(syokimau?.collectedKes).toBe(0);
    expect(syokimau?.maintenanceKes).toBe(32000);
    const kilimani = s.byUnit.find((u) => u.unitId === 'u-kilimani-2br');
    expect(kilimani?.expectedKes).toBe(85000);
    expect(kilimani?.collectedKes).toBe(45000);
  });

  it('matches a zero-fee month exactly (fee optional for self-managers)', () => {
    const s = paymentsStatement([], [], [pay({ amountKes: 45000 })], [], '2026-09', 0);
    expect(s.mgmtFee).toBe(0);
    expect(s.net).toBe(45000);
  });

  it('unresolved tickets never leak projected costs into the statement', () => {
    const open: MaintenanceTicket = {
      id: 'm-open',
      unitId: 'u1',
      title: 'Gate motor',
      detail: 'quote awaited',
      priority: 'medium',
      status: 'scheduled',
      costKes: 0,
      createdAt: '2026-09-01T00:00:00Z',
    };
    const s = paymentsStatement([unit()], [], [], [open], '2026-09', 8);
    expect(s.maintenanceCost).toBe(0);
  });
});

describe('landlordStore — seed sanity (the demo portfolio)', () => {
  it('ships 4 units, 3 tenants, 14 payments and 4 tickets', () => {
    expect(SEED_LANDLORD.units).toHaveLength(4);
    expect(SEED_LANDLORD.tenants).toHaveLength(3);
    expect(SEED_LANDLORD.payments).toHaveLength(14);
    expect(SEED_LANDLORD.tickets).toHaveLength(4);
  });

  it('computes exactly one arrears: the 40,000 partial on Kilimani', () => {
    const arrears = computeArrears(SEED_LANDLORD.tenants, SEED_LANDLORD.payments);
    expect(arrears['t-wanjiku'].balanceKes).toBe(40000);
    expect(arrears['t-kevin'].balanceKes).toBe(0);
    expect(arrears['t-amina'].balanceKes).toBe(0);
  });

  it('derives the headline stats the Overview card shows', () => {
    expect(occupancyRate(SEED_LANDLORD.units)).toBe(75);
    expect(monthIncome(SEED_LANDLORD.payments, '2026-09')).toBe(275000);
    expect(collectionRate(SEED_LANDLORD.tenants, SEED_LANDLORD.payments, '2026-09')).toBeCloseTo(
      87.3,
      1
    );
  });

  it('uses the shared 8% management fee default and the keja:landlord slot', () => {
    expect(MGMT_FEE_PCT).toBe(8);
    expect(LANDLORD_KEY).toBe('landlord');
  });
});
