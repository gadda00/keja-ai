/**
 * Landlord Studio — unit tests for the pure math the claims register's
 * 'landlord-studio' claim cites (arrears, occupancy, collection, statements).
 * The register previously said "covered by unit tests" while no test file
 * imported this module; these tests make that sentence true.
 */
import { describe, expect, it } from 'vitest';

import {
  asOfMonth,
  collectionRate,
  computeArrears,
  monthCount,
  monthIncome,
  occupancyRate,
  paymentsStatement,
  type MaintenanceTicket,
  type RentPayment,
  type Tenant,
  type Unit,
} from '@/lib/landlordStore';

const unit = (id: string, status: Unit['status'] = 'occupied'): Unit => ({
  id,
  name: `Unit ${id}`,
  type: 'apartment',
  area: 'Kilimani',
  beds: 2,
  monthlyRentKes: 65_000,
  status,
});

const tenant = (id: string, unitId: string, opts: Partial<Tenant> = {}): Tenant => ({
  id,
  unitId,
  name: `Tenant ${id}`,
  phone: '+254 700 000 000',
  leaseStart: '2026-01-01',
  leaseEnd: '2026-12-31',
  monthlyRentKes: 65_000,
  depositKes: 65_000,
  balanceKes: 0,
  ...opts,
});

const payment = (
  tenantId: string,
  unitId: string,
  month: string,
  amountKes: number
): RentPayment => ({
  id: `pay-${tenantId}-${month}`,
  tenantId,
  unitId,
  month,
  amountKes,
  channel: 'mpesa',
  paidOn: `${month}-05T10:00:00Z`,
});

describe('asOfMonth', () => {
  it('returns the latest ledger month', () => {
    const pays = [
      payment('t1', 'u1', '2026-03', 65_000),
      payment('t1', 'u1', '2026-01', 65_000),
      payment('t2', 'u2', '2026-05', 80_000),
    ];
    expect(asOfMonth(pays)).toBe('2026-05');
  });

  it('falls back when the ledger is empty', () => {
    expect(asOfMonth([], '2026-01')).toBe('2026-01');
  });
});

describe('monthCount', () => {
  it('counts inclusively', () => {
    expect(monthCount('2026-01', '2026-01')).toBe(1);
    expect(monthCount('2026-01', '2026-12')).toBe(12);
    expect(monthCount('2025-11', '2026-02')).toBe(4);
  });

  it('returns 0 for reversed ranges', () => {
    expect(monthCount('2026-05', '2026-04')).toBe(0);
  });
});

describe('computeArrears', () => {
  it('owes nothing on an empty ledger (clock only starts when money moves)', () => {
    const out = computeArrears([tenant('t1', 'u1')], []);
    expect(out.t1).toEqual({ expectedKes: 0, paidKes: 0, balanceKes: 0 });
  });

  it('computes expected rent through the latest ledger month minus payments', () => {
    const t = tenant('t1', 'u1');
    // ledger clock runs to the newest payment month (Feb): 2 months due,
    // January paid in full, February part-paid → 25k arrears
    const pays = [payment('t1', 'u1', '2026-01', 65_000), payment('t1', 'u1', '2026-02', 40_000)];
    const out = computeArrears([t], pays);
    expect(out.t1.expectedKes).toBe(2 * 65_000);
    expect(out.t1.paidKes).toBe(105_000);
    expect(out.t1.balanceKes).toBe(25_000);
  });

  it('never charges beyond lease end', () => {
    const t = tenant('t1', 'u1', { leaseStart: '2026-01-01', leaseEnd: '2026-02-28' });
    // ledger keeps moving into April via another tenant, but this lease ended
    const other = tenant('t2', 'u2', { leaseStart: '2026-01-01', leaseEnd: '2026-12-31' });
    const pays = [
      payment('t2', 'u2', '2026-03', 65_000),
      payment('t2', 'u2', '2026-04', 65_000),
    ];
    const out = computeArrears([t, other], pays);
    expect(out.t1.expectedKes).toBe(2 * 65_000); // capped at lease end (Feb)
    expect(out.t1.balanceKes).toBe(2 * 65_000); // nothing paid
  });

  it('credits part payments', () => {
    const t = tenant('t1', 'u1');
    const pays = [payment('t1', 'u1', '2026-01', 40_000)];
    const out = computeArrears([t], pays);
    expect(out.t1.balanceKes).toBe(65_000 - 40_000);
  });
});

describe('occupancyRate', () => {
  it('counts occupied + notice as tenanted, vacant as empty', () => {
    const units = [unit('u1'), unit('u2', 'vacant'), unit('u3', 'notice')];
    expect(occupancyRate(units)).toBeCloseTo((2 / 3) * 100);
  });

  it('handles an empty portfolio', () => {
    expect(occupancyRate([])).toBe(0);
  });
});

describe('collectionRate', () => {
  it('is collected vs expected for leases covering the month', () => {
    const tenants = [
      tenant('t1', 'u1'), // in lease all of 2026
      tenant('t2', 'u2', { leaseStart: '2026-06-01', leaseEnd: '2026-12-31' }), // not in March
    ];
    const pays = [payment('t1', 'u1', '2026-03', 65_000)];
    expect(collectionRate(tenants, pays, '2026-03')).toBe(100);
  });

  it('returns 0 with no active leases (never divides by zero)', () => {
    expect(collectionRate([], [], '2026-03')).toBe(0);
  });

  it('partial collection is fractional', () => {
    const tenants = [tenant('t1', 'u1')];
    const pays = [payment('t1', 'u1', '2026-03', 32_500)];
    expect(collectionRate(tenants, pays, '2026-03')).toBeCloseTo(50);
  });
});

describe('monthIncome', () => {
  it('sums only the requested month', () => {
    const pays = [
      payment('t1', 'u1', '2026-03', 65_000),
      payment('t2', 'u2', '2026-03', 80_000),
      payment('t1', 'u1', '2026-04', 65_000),
    ];
    expect(monthIncome(pays, '2026-03')).toBe(145_000);
    expect(monthIncome(pays, '2026-04')).toBe(65_000);
    expect(monthIncome(pays, '2026-05')).toBe(0);
  });
});

describe('paymentsStatement', () => {
  const units = [unit('u1'), unit('u2', 'vacant')];
  const tenants = [tenant('t1', 'u1'), tenant('t2', 'u2')];

  const ticket = (unitId: string, status: MaintenanceTicket['status'], resolvedAt?: string): MaintenanceTicket => ({
    id: `tk-${unitId}-${status}`,
    unitId,
    title: 'Leak',
    detail: 'Kitchen tap',
    priority: 'medium',
    status,
    costKes: 8_000,
    createdAt: '2026-03-01T09:00:00Z',
    resolvedAt,
  });

  it('charges the management fee on collected rent, not billed rent', () => {
    const pays = [payment('t1', 'u1', '2026-03', 65_000), payment('t2', 'u2', '2026-03', 40_000)];
    const s = paymentsStatement(units, tenants, pays, [], '2026-03', 7.5);
    expect(s.grossCollected).toBe(105_000);
    expect(s.mgmtFee).toBeCloseTo(105_000 * 0.075);
    expect(s.net).toBeCloseTo(105_000 - 105_000 * 0.075);
  });

  it('attributes resolved tickets to the resolution month only', () => {
    const tickets = [
      ticket('u1', 'resolved', '2026-03-20T12:00:00Z'), // counts for March
      ticket('u2', 'resolved', '2026-02-20T12:00:00Z'), // February — not March
      ticket('u1', 'scheduled'), // not resolved — never hits the statement
    ];
    const s = paymentsStatement(units, tenants, [], tickets, '2026-03', 7.5);
    expect(s.maintenanceCost).toBe(8_000);
    expect(s.byUnit.find((b) => b.unitId === 'u1')?.maintenanceKes).toBe(8_000);
    expect(s.byUnit.find((b) => b.unitId === 'u2')?.maintenanceKes).toBe(0);
  });

  it('nets maintenance against the owner take', () => {
    const pays = [payment('t1', 'u1', '2026-03', 65_000)];
    const tickets = [ticket('u1', 'resolved', '2026-03-20T12:00:00Z')];
    const s = paymentsStatement(units, tenants, pays, tickets, '2026-03', 7.5);
    expect(s.net).toBeCloseTo(65_000 - 8_000 - 65_000 * 0.075);
  });

  it('reports per-unit expected vs collected', () => {
    const pays = [payment('t1', 'u1', '2026-03', 65_000)];
    const s = paymentsStatement(units, tenants, pays, [], '2026-03', 7.5);
    const u1 = s.byUnit.find((b) => b.unitId === 'u1')!;
    const u2 = s.byUnit.find((b) => b.unitId === 'u2')!;
    expect(u1.expectedKes).toBe(65_000);
    expect(u1.collectedKes).toBe(65_000);
    expect(u2.expectedKes).toBe(65_000);
    expect(u2.collectedKes).toBe(0);
  });
});
