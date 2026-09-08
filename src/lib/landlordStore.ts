/**
 * Keja Landlord Studio — client-side property management store.
 *
 * Units, tenants, a rent ledger, maintenance tickets and owner statements,
 * persisted to localStorage under 'keja:landlord' via the shared useStore
 * pattern ('keja-store-change' CustomEvent). All figures rendered anywhere in
 * the studio are COMPUTED from this ledger by the pure helpers below — the
 * UI never hardcodes a stat. Honesty: this build is a browser-only demo;
 * production will sync M-Pesa statements and manager entries instead.
 */
import { DEFAULT_EXPENSES } from '@/lib/finance';
import { useStore } from '@/lib/store';

export interface Unit {
  id: string;
  name: string;
  type: 'apartment' | 'villa' | 'townhouse' | 'bungalow' | 'commercial';
  area: string;
  beds: number;
  monthlyRentKes: number;
  status: 'occupied' | 'vacant' | 'notice';
  /** Keja marketplace listing this unit is advertised on (if any). */
  marketListingId?: string;
}

export interface Tenant {
  id: string;
  unitId: string;
  name: string;
  phone: string;
  leaseStart: string; // 'YYYY-MM-DD'
  leaseEnd: string; // 'YYYY-MM-DD'
  monthlyRentKes: number;
  depositKes: number;
  /** Stored snapshot — the live figure always comes from computeArrears(). */
  balanceKes: number;
}

export interface RentPayment {
  id: string;
  tenantId: string;
  unitId: string;
  month: string; // 'YYYY-MM'
  amountKes: number;
  channel: 'mpesa' | 'bank' | 'cash';
  paidOn: string; // ISO timestamp
  note?: string;
}

export interface MaintenanceTicket {
  id: string;
  unitId: string;
  title: string;
  detail: string;
  priority: 'low' | 'medium' | 'high';
  status: 'new' | 'scheduled' | 'resolved';
  costKes: number;
  createdAt: string; // ISO timestamp
  resolvedAt?: string; // ISO timestamp
}

export interface LandlordData {
  units: Unit[];
  tenants: Tenant[];
  payments: RentPayment[];
  tickets: MaintenanceTicket[];
}

export type UnitStatus = Unit['status'];
export type PaymentChannel = RentPayment['channel'];
export type TicketPriority = MaintenanceTicket['priority'];
export type TicketStatus = MaintenanceTicket['status'];

/** localStorage slot: 'keja:landlord' (PREFIX lives in lib/store). */
export const LANDLORD_KEY = 'landlord';
/** Management fee charged on COLLECTED rent — matches the shared finance defaults. */
export const MGMT_FEE_PCT = DEFAULT_EXPENSES.managementPct;

/* ------------------------------ pure helpers ------------------------------ */

export interface TenantArrears {
  expectedKes: number;
  paidKes: number;
  balanceKes: number;
}

export interface UnitStatement {
  unitId: string;
  name: string;
  area: string;
  status: UnitStatus;
  expectedKes: number;
  collectedKes: number;
  maintenanceKes: number;
}

export interface MonthlyStatement {
  month: string;
  grossCollected: number;
  maintenanceCost: number;
  mgmtFee: number;
  net: number;
  byUnit: UnitStatement[];
}

const monthOf = (isoDate: string) => isoDate.slice(0, 7);

/** Latest 'YYYY-MM' seen in the ledger (payments drive the clock), else fallback. */
export function asOfMonth(payments: RentPayment[], fallback = ''): string {
  let max = fallback;
  for (const p of payments) {
    if (p.month > max) max = p.month;
  }
  return max;
}

/** Inclusive month count between two 'YYYY-MM' values (0 when reversed). */
export function monthCount(startMonth: string, endMonth: string): number {
  const [sy, sm] = startMonth.split('-').map(Number);
  const [ey, em] = endMonth.split('-').map(Number);
  const diff = (ey - sy) * 12 + (em - sm) + 1;
  return Math.max(0, diff);
}

/**
 * Per-tenant balance: rent owed from lease start through the latest ledger
 * month (capped at lease end) minus everything actually paid. A tenant with
 * no recorded payments in an empty ledger owes nothing yet — the ledger clock
 * only starts when money moves.
 */
export function computeArrears(
  tenants: Tenant[],
  payments: RentPayment[]
): Record<string, TenantArrears> {
  const asOf = asOfMonth(payments);
  const paidBy: Record<string, number> = {};
  for (const p of payments) {
    paidBy[p.tenantId] = (paidBy[p.tenantId] ?? 0) + p.amountKes;
  }
  const out: Record<string, TenantArrears> = {};
  for (const t of tenants) {
    const start = monthOf(t.leaseStart);
    const end = monthOf(t.leaseEnd);
    const effectiveEnd = asOf && asOf < end ? asOf : end;
    const months = asOf ? monthCount(start, effectiveEnd) : 0;
    const expectedKes = months * t.monthlyRentKes;
    const paidKes = paidBy[t.id] ?? 0;
    out[t.id] = { expectedKes, paidKes, balanceKes: expectedKes - paidKes };
  }
  return out;
}

/** % of units with a tenant in place ('occupied' + 'notice' are tenanted). */
export function occupancyRate(units: Unit[]): number {
  if (units.length === 0) return 0;
  const filled = units.filter((u) => u.status !== 'vacant').length;
  return (filled / units.length) * 100;
}

/**
 * % collected vs expected for a 'YYYY-MM' month. Expected counts only tenants
 * whose lease covers that month — vacant units have no tenant, so they never
 * inflate the denominator.
 */
export function collectionRate(tenants: Tenant[], payments: RentPayment[], month: string): number {
  const expected = tenants
    .filter((t) => monthOf(t.leaseStart) <= month && month <= monthOf(t.leaseEnd))
    .reduce((sum, t) => sum + t.monthlyRentKes, 0);
  if (expected === 0) return 0;
  const collected = payments
    .filter((p) => p.month === month)
    .reduce((sum, p) => sum + p.amountKes, 0);
  return (collected / expected) * 100;
}

/** Gross rent actually collected in a 'YYYY-MM' month. */
export function monthIncome(payments: RentPayment[], month: string): number {
  return payments.filter((p) => p.month === month).reduce((sum, p) => sum + p.amountKes, 0);
}

/**
 * Owner statement for a 'YYYY-MM' month: collections by unit, maintenance
 * spend (resolved tickets only, attributed to the resolution month), the
 * management fee on COLLECTED rent (not billed rent — Keja charges on what
 * actually landed), and net to owner.
 */
export function paymentsStatement(
  units: Unit[],
  tenants: Tenant[],
  payments: RentPayment[],
  tickets: MaintenanceTicket[],
  month: string,
  mgmtFeePct: number
): MonthlyStatement {
  const collectedByUnit: Record<string, number> = {};
  for (const p of payments) {
    if (p.month !== month) continue;
    collectedByUnit[p.unitId] = (collectedByUnit[p.unitId] ?? 0) + p.amountKes;
  }
  const maintenanceByUnit: Record<string, number> = {};
  let maintenanceCost = 0;
  for (const t of tickets) {
    if (t.status !== 'resolved' || !t.resolvedAt) continue;
    if (monthOf(t.resolvedAt) !== month) continue;
    maintenanceByUnit[t.unitId] = (maintenanceByUnit[t.unitId] ?? 0) + t.costKes;
    maintenanceCost += t.costKes;
  }
  const expectedByUnit: Record<string, number> = {};
  for (const t of tenants) {
    if (monthOf(t.leaseStart) <= month && month <= monthOf(t.leaseEnd)) {
      expectedByUnit[t.unitId] = (expectedByUnit[t.unitId] ?? 0) + t.monthlyRentKes;
    }
  }
  const grossCollected = payments
    .filter((p) => p.month === month)
    .reduce((sum, p) => sum + p.amountKes, 0);
  const mgmtFee = (grossCollected * mgmtFeePct) / 100;
  return {
    month,
    grossCollected,
    maintenanceCost,
    mgmtFee,
    net: grossCollected - maintenanceCost - mgmtFee,
    byUnit: units.map((u) => ({
      unitId: u.id,
      name: u.name,
      area: u.area,
      status: u.status,
      expectedKes: expectedByUnit[u.id] ?? 0,
      collectedKes: collectedByUnit[u.id] ?? 0,
      maintenanceKes: maintenanceByUnit[u.id] ?? 0,
    })),
  };
}

/* -------------------------------- seed data ------------------------------- */

export const SEED_LANDLORD: LandlordData = {
  units: [
    {
      id: 'u-kilimani-2br',
      name: 'Kilimani 2BR — Riara Road',
      type: 'apartment',
      area: 'Kilimani',
      beds: 2,
      monthlyRentKes: 85000,
      status: 'occupied',
    },
    {
      id: 'u-westlands-studio',
      name: 'Westlands Studio — Woodmere Court',
      type: 'apartment',
      area: 'Westlands',
      beds: 1,
      monthlyRentKes: 45000,
      status: 'occupied',
    },
    {
      id: 'u-karen-4br',
      name: 'Karen 4BR Villa — Bogani East',
      type: 'villa',
      area: 'Karen',
      beds: 4,
      monthlyRentKes: 185000,
      status: 'notice',
    },
    {
      id: 'u-syokimau-3br',
      name: 'Syokimau 3BR Townhouse — Milimani Ridge',
      type: 'townhouse',
      area: 'Syokimau',
      beds: 3,
      monthlyRentKes: 65000,
      status: 'vacant',
    },
  ],
  tenants: [
    {
      id: 't-wanjiku',
      unitId: 'u-kilimani-2br',
      name: 'Wanjiku Mwangi',
      phone: '+254 712 345 678',
      leaseStart: '2026-06-01',
      leaseEnd: '2026-11-30',
      monthlyRentKes: 85000,
      depositKes: 170000,
      balanceKes: 40000,
    },
    {
      id: 't-kevin',
      unitId: 'u-westlands-studio',
      name: 'Kevin Otieno',
      phone: '+254 720 987 654',
      leaseStart: '2026-05-01',
      leaseEnd: '2027-04-30',
      monthlyRentKes: 45000,
      depositKes: 90000,
      balanceKes: 0,
    },
    {
      id: 't-amina',
      unitId: 'u-karen-4br',
      name: 'Dr. Amina Yusuf',
      phone: '+254 733 234 567',
      leaseStart: '2026-05-01',
      leaseEnd: '2026-09-30',
      monthlyRentKes: 185000,
      depositKes: 370000,
      balanceKes: 0,
    },
  ],
  payments: [
    // Wanjiku — Kilimani 2BR (85,000): Sep paid PARTIAL → 40,000 arrears
    {
      id: 'p-001',
      tenantId: 't-wanjiku',
      unitId: 'u-kilimani-2br',
      month: '2026-06',
      amountKes: 85000,
      channel: 'mpesa',
      paidOn: '2026-06-05T09:12:00Z',
    },
    {
      id: 'p-002',
      tenantId: 't-wanjiku',
      unitId: 'u-kilimani-2br',
      month: '2026-07',
      amountKes: 85000,
      channel: 'mpesa',
      paidOn: '2026-07-03T08:41:00Z',
    },
    {
      id: 'p-003',
      tenantId: 't-wanjiku',
      unitId: 'u-kilimani-2br',
      month: '2026-08',
      amountKes: 85000,
      channel: 'bank',
      paidOn: '2026-08-05T10:02:00Z',
    },
    {
      id: 'p-004',
      tenantId: 't-wanjiku',
      unitId: 'u-kilimani-2br',
      month: '2026-09',
      amountKes: 45000,
      channel: 'mpesa',
      paidOn: '2026-09-07T09:15:00Z',
      note: 'Partial — balance promised by the 25th',
    },
    // Kevin — Westlands studio (45,000): always on time
    {
      id: 'p-005',
      tenantId: 't-kevin',
      unitId: 'u-westlands-studio',
      month: '2026-05',
      amountKes: 45000,
      channel: 'mpesa',
      paidOn: '2026-05-02T07:55:00Z',
    },
    {
      id: 'p-006',
      tenantId: 't-kevin',
      unitId: 'u-westlands-studio',
      month: '2026-06',
      amountKes: 45000,
      channel: 'mpesa',
      paidOn: '2026-06-02T07:48:00Z',
    },
    {
      id: 'p-007',
      tenantId: 't-kevin',
      unitId: 'u-westlands-studio',
      month: '2026-07',
      amountKes: 45000,
      channel: 'mpesa',
      paidOn: '2026-07-02T08:02:00Z',
    },
    {
      id: 'p-008',
      tenantId: 't-kevin',
      unitId: 'u-westlands-studio',
      month: '2026-08',
      amountKes: 45000,
      channel: 'cash',
      paidOn: '2026-08-03T16:30:00Z',
    },
    {
      id: 'p-009',
      tenantId: 't-kevin',
      unitId: 'u-westlands-studio',
      month: '2026-09',
      amountKes: 45000,
      channel: 'mpesa',
      paidOn: '2026-09-02T07:59:00Z',
    },
    // Dr. Amina — Karen 4BR (185,000): bank transfers, lease ends 30 Sep
    {
      id: 'p-010',
      tenantId: 't-amina',
      unitId: 'u-karen-4br',
      month: '2026-05',
      amountKes: 185000,
      channel: 'bank',
      paidOn: '2026-05-04T11:20:00Z',
    },
    {
      id: 'p-011',
      tenantId: 't-amina',
      unitId: 'u-karen-4br',
      month: '2026-06',
      amountKes: 185000,
      channel: 'bank',
      paidOn: '2026-06-03T11:05:00Z',
    },
    {
      id: 'p-012',
      tenantId: 't-amina',
      unitId: 'u-karen-4br',
      month: '2026-07',
      amountKes: 185000,
      channel: 'bank',
      paidOn: '2026-07-03T11:10:00Z',
    },
    {
      id: 'p-013',
      tenantId: 't-amina',
      unitId: 'u-karen-4br',
      month: '2026-08',
      amountKes: 185000,
      channel: 'bank',
      paidOn: '2026-08-04T11:00:00Z',
    },
    {
      id: 'p-014',
      tenantId: 't-amina',
      unitId: 'u-karen-4br',
      month: '2026-09',
      amountKes: 185000,
      channel: 'bank',
      paidOn: '2026-09-01T10:45:00Z',
    },
  ],
  tickets: [
    {
      id: 'm-001',
      unitId: 'u-kilimani-2br',
      title: 'Water heater not heating',
      detail: 'Instant shower unit tripping the RCD; tenant bathing cold since Monday.',
      priority: 'high',
      status: 'resolved',
      costKes: 18500,
      createdAt: '2026-07-14T08:00:00Z',
      resolvedAt: '2026-07-16T15:30:00Z',
    },
    {
      id: 'm-002',
      unitId: 'u-westlands-studio',
      title: 'Kitchen tap dripping',
      detail: 'Cold tap washer worn out — slow drip overnight, basin staining.',
      priority: 'low',
      status: 'new',
      costKes: 0,
      createdAt: '2026-09-03T09:10:00Z',
    },
    {
      id: 'm-003',
      unitId: 'u-karen-4br',
      title: 'Gate motor replacement',
      detail: 'Sliding gate motor failed; manual operation only. Contractor quote awaited.',
      priority: 'medium',
      status: 'scheduled',
      costKes: 0,
      createdAt: '2026-08-28T14:25:00Z',
    },
    {
      id: 'm-004',
      unitId: 'u-syokimau-3br',
      title: 'Pre-listing repaint & deep clean',
      detail: 'Full repaint and deep clean before re-listing the vacant unit on Keja.',
      priority: 'medium',
      status: 'resolved',
      costKes: 32000,
      createdAt: '2026-08-02T10:00:00Z',
      resolvedAt: '2026-09-12T16:00:00Z',
    },
  ],
};

/* --------------------------------- the hook ------------------------------- */

export type NewUnit = Omit<Unit, 'id'>;
export type NewTenant = Omit<Tenant, 'id'>;
export type NewTicket = Omit<MaintenanceTicket, 'id' | 'createdAt' | 'status' | 'costKes'>;

export interface PaymentInput {
  tenantId: string;
  month: string; // 'YYYY-MM'
  amountKes: number;
  channel: PaymentChannel;
  note?: string;
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const cloneSeed = (): LandlordData => JSON.parse(JSON.stringify(SEED_LANDLORD)) as LandlordData;

/**
 * The Landlord Studio store hook. State lives in localStorage ('keja:landlord')
 * and stays in sync across components via the 'keja-store-change' event.
 */
export function useLandlordStore() {
  const [data, setData] = useStore<LandlordData>(LANDLORD_KEY, SEED_LANDLORD);

  const addUnit = (unit: NewUnit) => {
    setData((prev) => ({ ...prev, units: [...prev.units, { ...unit, id: uid('unit') }] }));
  };

  const updateUnit = (id: string, patch: Partial<Omit<Unit, 'id'>>) => {
    setData((prev) => ({
      ...prev,
      units: prev.units.map((u) => (u.id === id ? { ...u, ...patch } : u)),
    }));
  };

  const addTenant = (tenant: NewTenant) => {
    setData((prev) => ({
      ...prev,
      tenants: [...prev.tenants, { ...tenant, id: uid('tenant') }],
      units: prev.units.map((u) =>
        u.id === tenant.unitId && u.status === 'vacant' ? { ...u, status: 'occupied' } : u
      ),
    }));
  };

  const removeTenant = (id: string) => {
    setData((prev) => {
      const tenant = prev.tenants.find((t) => t.id === id);
      return {
        ...prev,
        tenants: prev.tenants.filter((t) => t.id !== id),
        units: prev.units.map((u) =>
          u.id === tenant?.unitId && u.status !== 'vacant' ? { ...u, status: 'vacant' } : u
        ),
      };
    });
  };

  const recordPayment = (input: PaymentInput) => {
    setData((prev) => {
      const tenant = prev.tenants.find((t) => t.id === input.tenantId);
      if (!tenant) return prev;
      const payment: RentPayment = {
        id: uid('pay'),
        tenantId: input.tenantId,
        unitId: tenant.unitId,
        month: input.month,
        amountKes: input.amountKes,
        channel: input.channel,
        paidOn: new Date().toISOString(),
        note: input.note,
      };
      const payments = [...prev.payments, payment];
      // keep stored balance snapshots in step with the computed ledger
      const arrears = computeArrears(prev.tenants, payments);
      const tenants = prev.tenants.map((t) => ({
        ...t,
        balanceKes: arrears[t.id]?.balanceKes ?? t.balanceKes,
      }));
      return { ...prev, payments, tenants };
    });
  };

  const addTicket = (ticket: NewTicket) => {
    setData((prev) => ({
      ...prev,
      tickets: [
        ...prev.tickets,
        {
          ...ticket,
          id: uid('ticket'),
          status: 'new',
          costKes: 0,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  };

  const updateTicketStatus = (id: string, status: TicketStatus, costKes?: number) => {
    setData((prev) => ({
      ...prev,
      tickets: prev.tickets.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              costKes: costKes ?? t.costKes,
              resolvedAt:
                status === 'resolved' ? (t.resolvedAt ?? new Date().toISOString()) : undefined,
            }
          : t
      ),
    }));
  };

  const resetDemo = () => setData(cloneSeed());

  return {
    data,
    addUnit,
    updateUnit,
    addTenant,
    removeTenant,
    recordPayment,
    addTicket,
    updateTicketStatus,
    resetDemo,
  };
}
