/**
 * Keja Manage — the Landlord Studio.
 *
 * A real working property-management tool (replaces the old marketing-only
 * page): units, tenants, an M-Pesa-style rent ledger, maintenance tickets and
 * monthly owner statements. Every stat on this page is COMPUTED from the
 * ledger in landlordStore (no hardcoded figures), everything persists to
 * localStorage, and the demo boundary is stated up front. The services strip
 * at the bottom keeps the fee facts from the old marketing page.
 *
 * Deep links: /manage?tab=overview|ledger|maintenance|statement
 */
import { m } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  FlaskConical,
  Home,
  KeyRound,
  LayoutDashboard,
  MapPin,
  Percent,
  Plus,
  Printer,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Wallet,
  Wrench,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { formatKES, timeAgo } from '@/lib/format';
import type {
  MaintenanceTicket,
  MonthlyStatement,
  PaymentChannel,
  RentPayment,
  Tenant,
  Unit,
  UnitStatus,
} from '@/lib/landlordStore';
import {
  asOfMonth,
  collectionRate,
  computeArrears,
  MGMT_FEE_PCT,
  occupancyRate,
  paymentsStatement,
  useLandlordStore,
} from '@/lib/landlordStore';
import { usePageMeta } from '@/lib/seo';

type Tab = 'overview' | 'ledger' | 'maintenance' | 'statement';

const TABS: { v: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { v: 'overview', label: 'Overview', icon: LayoutDashboard },
  { v: 'ledger', label: 'Rent ledger', icon: Wallet },
  { v: 'maintenance', label: 'Maintenance', icon: Wrench },
  { v: 'statement', label: 'Owner statement', icon: Printer },
];
const VALID_TABS: Tab[] = ['overview', 'ledger', 'maintenance', 'statement'];

type Store = ReturnType<typeof useLandlordStore>;

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6 },
};

/* ------------------------------ small helpers ----------------------------- */

const nowMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** The `count` months ending at `endMonth` (inclusive), oldest first. */
function monthRange(endMonth: string, count: number): string[] {
  const [y, mo] = endMonth.split('-').map(Number);
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, mo - 1 - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** Deterministic 'Sep 2026' label (locale data varies by environment). */
function monthLabel(month: string): string {
  const [y, mo] = month.split('-').map(Number);
  return `${MONTHS_SHORT[mo - 1] ?? month} ${y}`;
}

const pct = (v: number) => `${Math.round(v * 10) / 10}%`;

const TYPE_LABEL: Record<Unit['type'], string> = {
  apartment: 'Apartment',
  villa: 'Villa',
  townhouse: 'Townhouse',
  bungalow: 'Bungalow',
  commercial: 'Commercial',
};

const STATUS_STYLE: Record<UnitStatus, string> = {
  occupied: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  notice: 'bg-amber-50 text-amber-700 border-amber-200',
  vacant: 'bg-rose-50 text-rose-700 border-rose-200',
};
const STATUS_LABEL: Record<UnitStatus, string> = {
  occupied: 'Occupied',
  notice: 'On notice',
  vacant: 'Vacant',
};

function StatusChip({ status }: { status: UnitStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STATUS_STYLE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

const CHANNEL_STYLE: Record<PaymentChannel, string> = {
  mpesa: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  bank: 'bg-cream-deep text-ink-soft border-gold-100',
  cash: 'bg-gold-50 text-gold-700 border-gold-200',
};

function ChannelChip({ channel }: { channel: PaymentChannel }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide2 ${CHANNEL_STYLE[channel]}`}
    >
      {channel === 'mpesa' ? 'M-Pesa' : channel === 'bank' ? 'Bank' : 'Cash'}
    </span>
  );
}

const PRIORITY_STYLE: Record<MaintenanceTicket['priority'], string> = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function PriorityChip({ priority }: { priority: MaintenanceTicket['priority'] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide2 ${PRIORITY_STYLE[priority]}`}
    >
      {priority}
    </span>
  );
}

const TICKET_STATUS_STYLE: Record<MaintenanceTicket['status'], string> = {
  new: 'bg-rose-50 text-rose-700 border-rose-200',
  scheduled: 'bg-amber-50 text-amber-700 border-amber-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function TicketStatusChip({ status }: { status: MaintenanceTicket['status'] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide2 ${TICKET_STATUS_STYLE[status]}`}
    >
      {status}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="card-luxe card-luxe-hover p-6">
      <Icon className="h-5 w-5 text-gold-600" aria-hidden />
      <p className="mt-3 font-display text-2xl font-bold text-ink">{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{label}</p>
      <p className="mt-0.5 text-xs text-ink-muted">{sub}</p>
    </div>
  );
}

/** Gold month chips shared by the ledger + statement tabs. */
function MonthChips({
  months,
  value,
  onChange,
  ariaLabel,
}: {
  months: string[];
  value: string;
  onChange: (m: string) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="no-scrollbar flex items-center gap-2 overflow-x-auto py-1"
    >
      {months.map((mo) => (
        <button
          key={mo}
          type="button"
          onClick={() => onChange(mo)}
          aria-pressed={value === mo}
          className={`inline-flex min-h-[36px] shrink-0 items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            value === mo
              ? 'border-gold-600 bg-gold-gradient text-white shadow-gold-sm'
              : 'border-gold-200 bg-white text-ink-soft hover:border-gold-400 hover:text-gold-700'
          }`}
        >
          {monthLabel(mo)}
        </button>
      ))}
    </div>
  );
}

function tenantForUnit(tenants: Tenant[], unitId: string): Tenant | undefined {
  return tenants.find((t) => t.unitId === unitId);
}

function leaseCoversMonth(tenant: Tenant, month: string): boolean {
  return tenant.leaseStart.slice(0, 7) <= month && month <= tenant.leaseEnd.slice(0, 7);
}

function paymentsFor(payments: RentPayment[], tenantId: string, month: string): RentPayment[] {
  return payments.filter((p) => p.tenantId === tenantId && p.month === month);
}

/* -------------------------------- Overview -------------------------------- */

function OverviewTab({
  store,
  onQuickRecord,
  asOf,
}: {
  store: Store;
  onQuickRecord: (tenantId: string) => void;
  asOf: string;
}) {
  const { data } = store;
  const stats = useMemo(() => {
    const arrears = computeArrears(data.tenants, data.payments);
    const arrearsList = Object.values(arrears);
    return {
      occupied: data.units.filter((u) => u.status === 'occupied').length,
      vacant: data.units.filter((u) => u.status === 'vacant').length,
      occupancy: occupancyRate(data.units),
      roll: data.units
        .filter((u) => u.status !== 'vacant')
        .reduce((s, u) => s + u.monthlyRentKes, 0),
      collection: collectionRate(data.tenants, data.payments, asOf),
      openTickets: data.tickets.filter((t) => t.status !== 'resolved').length,
      highOpen: data.tickets.filter((t) => t.status !== 'resolved' && t.priority === 'high').length,
      arrearsTotal: arrearsList.reduce((s, a) => s + Math.max(0, a.balanceKes), 0),
      arrearsCount: arrearsList.filter((a) => a.balanceKes > 0).length,
    };
  }, [data, asOf]);

  const cards = [
    {
      icon: Building2,
      label: 'Units',
      value: String(data.units.length),
      sub: `${stats.occupied} occupied · ${stats.vacant} vacant`,
    },
    {
      icon: Percent,
      label: 'Occupancy',
      value: pct(stats.occupancy),
      sub: 'incl. units on notice',
    },
    {
      icon: Wallet,
      label: 'Monthly roll',
      value: formatKES(stats.roll, { monthly: true }),
      sub: 'rent under management',
    },
    {
      icon: TrendingUp,
      label: 'Collection rate',
      value: pct(stats.collection),
      sub: `${monthLabel(asOf)} ledger`,
    },
    {
      icon: Wrench,
      label: 'Open tickets',
      value: String(stats.openTickets),
      sub: stats.highOpen > 0 ? `${stats.highOpen} high priority` : 'no high priority',
    },
    {
      icon: AlertTriangle,
      label: 'Arrears',
      value: formatKES(stats.arrearsTotal),
      sub:
        stats.arrearsCount > 0
          ? `${stats.arrearsCount} tenant${stats.arrearsCount > 1 ? 's' : ''} behind`
          : 'ledger clear',
    },
  ];

  return (
    <div className="space-y-10">
      <m.div {...fadeUp} className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <StatCard key={c.label} icon={c.icon} label={c.label} value={c.value} sub={c.sub} />
        ))}
      </m.div>

      <m.section {...fadeUp} aria-labelledby="units-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="units-heading" className="font-display text-xl font-bold text-ink">
            Units
          </h2>
          <p className="text-xs text-ink-faint">All figures from this device&rsquo;s ledger</p>
        </div>
        <div className="mt-4 grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {data.units.map((u) => {
            const tenant = tenantForUnit(data.tenants, u.id);
            return (
              <div key={u.id} className="card-luxe card-luxe-hover flex flex-col p-6">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-base font-semibold leading-snug text-ink">
                    {u.name}
                  </h3>
                  <StatusChip status={u.status} />
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-gold-600" aria-hidden />
                  {u.area} · {TYPE_LABEL[u.type]} · {u.beds} bed{u.beds === 1 ? '' : 's'}
                </p>
                <p className="mt-3 font-display text-xl font-bold text-ink">
                  {formatKES(u.monthlyRentKes, { monthly: true })}
                </p>
                {tenant ? (
                  <div className="mt-3 space-y-1.5 text-xs text-ink-muted">
                    <p className="font-semibold text-ink-soft">{tenant.name}</p>
                    <p>{tenant.phone}</p>
                    <p className="flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5 shrink-0 text-gold-600" aria-hidden />
                      Lease ends {tenant.leaseEnd}
                      {u.status === 'notice' ? ' — re-list early' : ''}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-ink-faint">No tenant in place.</p>
                )}
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                  {tenant ? (
                    <button
                      type="button"
                      onClick={() => onQuickRecord(tenant.id)}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-gold-gradient px-3.5 py-2 text-xs font-semibold text-white shadow-gold-sm transition-all hover:shadow-gold-md focus:outline-none focus:ring-2 focus:ring-gold-300 active:scale-[0.98]"
                    >
                      <Wallet className="h-3.5 w-3.5" aria-hidden /> Record payment
                    </button>
                  ) : (
                    <Link
                      to="/sell"
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-gold-500/60 px-3.5 py-2 text-xs font-semibold text-gold-700 transition-colors hover:bg-gold-50"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden /> Publish listing
                    </Link>
                  )}
                  {u.marketListingId ? (
                    <Link
                      to={`/properties/${u.marketListingId}`}
                      className="chip !py-1 text-[11px]"
                    >
                      View Keja listing <ArrowRight className="h-3 w-3" aria-hidden />
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </m.section>
    </div>
  );
}

/* ------------------------------- Rent ledger ------------------------------ */

function LedgerTab({
  store,
  months,
  month,
  setMonth,
  autoOpenFor,
  onAutoOpenConsumed,
}: {
  store: Store;
  months: string[];
  month: string;
  setMonth: (m: string) => void;
  autoOpenFor: string | null;
  onAutoOpenConsumed: () => void;
}) {
  const { data, recordPayment } = store;
  const [formOpen, setFormOpen] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [channel, setChannel] = useState<PaymentChannel>('mpesa');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');

  // quick-record jump from the Overview tab pre-selects the tenant
  useEffect(() => {
    if (!autoOpenFor) return;
    setFormOpen(true);
    setTenantId(autoOpenFor);
    const t = data.tenants.find((x) => x.id === autoOpenFor);
    setAmountStr(t ? String(t.monthlyRentKes) : '');
    onAutoOpenConsumed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenFor]);

  const arrears = useMemo(() => computeArrears(data.tenants, data.payments), [data]);

  const rows = data.tenants.map((t) => {
    const tenantPayments = paymentsFor(data.payments, t.id, month);
    const paid = tenantPayments.reduce((s, p) => s + p.amountKes, 0);
    const lastChannel =
      tenantPayments.length > 0 ? tenantPayments[tenantPayments.length - 1] : null;
    const unit = data.units.find((u) => u.id === t.unitId);
    return {
      tenant: t,
      unit,
      expected: leaseCoversMonth(t, month) ? t.monthlyRentKes : 0,
      paid,
      balance: arrears[t.id]?.balanceKes ?? 0,
      lastChannel,
      payments: tenantPayments,
    };
  });

  const expectedTotal = rows.reduce((s, r) => s + r.expected, 0);
  const paidTotal = rows.reduce((s, r) => s + r.paid, 0);

  const selectedTenant = data.tenants.find((t) => t.id === tenantId);

  const onTenantChange = (id: string) => {
    setTenantId(id);
    setFormError('');
    const t = data.tenants.find((x) => x.id === id);
    setAmountStr(t ? String(t.monthlyRentKes) : '');
  };

  const submitPayment = () => {
    const amount = Math.round(Number(amountStr));
    if (!selectedTenant) {
      setFormError('Pick a tenant first.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Amount must be greater than zero.');
      return;
    }
    recordPayment({
      tenantId: selectedTenant.id,
      month,
      amountKes: amount,
      channel,
      note: note.trim() || undefined,
    });
    setNote('');
    setFormError('');
    setAmountStr(String(selectedTenant.monthlyRentKes));
  };

  return (
    <div className="space-y-6">
      <m.div {...fadeUp} className="card-luxe p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">Rent ledger</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Expected vs collected per tenant. Balance is cumulative across the whole ledger.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFormOpen((o) => !o)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-gold-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-gold-sm transition-all hover:shadow-gold-md focus:outline-none focus:ring-2 focus:ring-gold-300 active:scale-[0.98]"
            aria-expanded={formOpen}
          >
            <Plus className="h-4 w-4" aria-hidden /> Record payment
          </button>
        </div>
        <div className="mt-4">
          <MonthChips months={months} value={month} onChange={setMonth} ariaLabel="Ledger month" />
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          {monthLabel(month)}: collected {formatKES(paidTotal)} of {formatKES(expectedTotal)}{' '}
          expected ({expectedTotal > 0 ? pct((paidTotal / expectedTotal) * 100) : '—'})
        </p>
      </m.div>

      {formOpen ? (
        <m.div {...fadeUp} className="card-luxe p-6">
          <h3 className="font-display text-lg font-bold text-ink">Record a payment</h3>
          {data.tenants.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">
              No tenants in the ledger yet — add one from a unit card.
            </p>
          ) : (
            <>
              <div className="mt-4 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label htmlFor="pay-tenant" className="label-luxe">
                    Tenant
                  </label>
                  <select
                    id="pay-tenant"
                    value={tenantId}
                    onChange={(e) => onTenantChange(e.target.value)}
                    className="input-luxe"
                  >
                    <option value="">Select tenant…</option>
                    {data.tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} — {formatKES(t.monthlyRentKes, { monthly: true })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="pay-amount" className="label-luxe">
                    Amount (KES)
                  </label>
                  <input
                    id="pay-amount"
                    type="number"
                    min={1}
                    step={500}
                    value={amountStr}
                    onChange={(e) => {
                      setAmountStr(e.target.value);
                      setFormError('');
                    }}
                    className="input-luxe"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label htmlFor="pay-channel" className="label-luxe">
                    Channel
                  </label>
                  <select
                    id="pay-channel"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as PaymentChannel)}
                    className="input-luxe"
                  >
                    <option value="mpesa">M-Pesa</option>
                    <option value="bank">Bank transfer</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="pay-note" className="label-luxe">
                    Note (optional)
                  </label>
                  <input
                    id="pay-note"
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. partial — balance promised"
                    className="input-luxe"
                  />
                </div>
              </div>
              {formError ? (
                <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
                  {formError}
                </p>
              ) : null}
              <div className="mt-4 flex items-center gap-3">
                <button type="button" onClick={submitPayment} className="btn-gold">
                  <CheckCircle2 className="h-4 w-4" aria-hidden /> Save to ledger
                </button>
                <span className="text-xs text-ink-faint">
                  Books against {monthLabel(month)} — demo entry, browser only.
                </span>
              </div>
            </>
          )}
        </m.div>
      ) : null}

      {/* desktop table */}
      <m.div {...fadeUp} className="card-luxe hidden overflow-x-auto p-6 md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gold-100 text-left text-[11px] font-bold uppercase tracking-wider text-ink-faint">
              <th scope="col" className="pb-3 pr-4">
                Tenant
              </th>
              <th scope="col" className="pb-3 pr-4">
                Unit
              </th>
              <th scope="col" className="pb-3 pr-4">
                Expected
              </th>
              <th scope="col" className="pb-3 pr-4">
                Paid
              </th>
              <th scope="col" className="pb-3 pr-4">
                Balance
              </th>
              <th scope="col" className="pb-3">
                Channel
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.tenant.id}
                className={`border-b border-gold-100/70 last:border-0 ${
                  r.balance > 0 ? 'bg-rose-50/60' : ''
                }`}
              >
                <td className="py-3.5 pr-4">
                  <p className="font-semibold text-ink">{r.tenant.name}</p>
                  <p className="text-xs text-ink-faint">{r.tenant.phone}</p>
                </td>
                <td className="py-3.5 pr-4 text-ink-soft">
                  {r.unit ? (
                    <>
                      <p>{r.unit.name}</p>
                      <p className="text-xs text-ink-faint">{r.unit.area}</p>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="py-3.5 pr-4 text-ink-soft">
                  {r.expected > 0 ? formatKES(r.expected) : '—'}
                </td>
                <td className="py-3.5 pr-4 text-ink-soft">
                  {r.paid > 0 ? formatKES(r.paid) : '—'}
                </td>
                <td className="py-3.5 pr-4">
                  {r.balance > 0 ? (
                    <span className="font-bold text-red-700">{formatKES(r.balance)} overdue</span>
                  ) : r.balance < 0 ? (
                    <span className="font-semibold text-emerald-700">
                      {formatKES(-r.balance)} in credit
                    </span>
                  ) : (
                    <span className="font-semibold text-emerald-700">Clear</span>
                  )}
                </td>
                <td className="py-3.5">
                  {r.lastChannel ? <ChannelChip channel={r.lastChannel.channel} /> : '—'}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-ink-muted">
                  No tenants yet — the ledger is empty.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </m.div>

      {/* mobile cards */}
      <div className="space-y-4 md:hidden">
        {rows.map((r) => (
          <div
            key={r.tenant.id}
            className={`card-luxe p-4 ${r.balance > 0 ? 'ring-1 ring-rose-200' : ''}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-ink">{r.tenant.name}</p>
                <p className="text-xs text-ink-faint">
                  {r.unit ? `${r.unit.name} · ${r.unit.area}` : '—'}
                </p>
              </div>
              {r.lastChannel ? <ChannelChip channel={r.lastChannel.channel} /> : null}
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Expected</dt>
                <dd className="text-ink-soft">{r.expected > 0 ? formatKES(r.expected) : '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Paid</dt>
                <dd className="text-ink-soft">{r.paid > 0 ? formatKES(r.paid) : '—'}</dd>
              </div>
              <div className="flex justify-between border-t border-gold-100 pt-1.5">
                <dt className="text-ink-muted">Balance</dt>
                <dd>
                  {r.balance > 0 ? (
                    <span className="font-bold text-red-700">{formatKES(r.balance)} overdue</span>
                  ) : r.balance < 0 ? (
                    <span className="font-semibold text-emerald-700">
                      {formatKES(-r.balance)} in credit
                    </span>
                  ) : (
                    <span className="font-semibold text-emerald-700">Clear</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        ))}
        {rows.length === 0 ? (
          <p className="card-luxe p-4 text-center text-sm text-ink-muted">
            No tenants yet — the ledger is empty.
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------- Maintenance ------------------------------ */

function MaintenanceTab({ store }: { store: Store }) {
  const { data, addTicket, updateTicketStatus } = store;
  const [filter, setFilter] = useState<'all' | MaintenanceTicket['status']>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [unitId, setUnitId] = useState('');
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [priority, setPriority] = useState<MaintenanceTicket['priority']>('medium');
  const [formError, setFormError] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [costStr, setCostStr] = useState('');

  const tickets = useMemo(() => {
    const list = [...data.tickets].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return filter === 'all' ? list : list.filter((t) => t.status === filter);
  }, [data.tickets, filter]);

  const counts = useMemo(
    () => ({
      all: data.tickets.length,
      new: data.tickets.filter((t) => t.status === 'new').length,
      scheduled: data.tickets.filter((t) => t.status === 'scheduled').length,
      resolved: data.tickets.filter((t) => t.status === 'resolved').length,
    }),
    [data.tickets]
  );

  const submitTicket = () => {
    if (!unitId) {
      setFormError('Pick the unit this ticket belongs to.');
      return;
    }
    if (title.trim().length < 4) {
      setFormError('Give the ticket a short title (at least 4 characters).');
      return;
    }
    addTicket({ unitId, title: title.trim(), detail: detail.trim(), priority });
    setFormOpen(false);
    setTitle('');
    setDetail('');
    setUnitId('');
    setPriority('medium');
    setFormError('');
  };

  const confirmResolve = (id: string) => {
    const cost = Math.max(0, Math.round(Number(costStr) || 0));
    updateTicketStatus(id, 'resolved', cost);
    setResolvingId(null);
    setCostStr('');
  };

  const FILTERS: { v: 'all' | MaintenanceTicket['status']; label: string }[] = [
    { v: 'all', label: `All (${counts.all})` },
    { v: 'new', label: `New (${counts.new})` },
    { v: 'scheduled', label: `Scheduled (${counts.scheduled})` },
    { v: 'resolved', label: `Resolved (${counts.resolved})` },
  ];

  return (
    <div className="space-y-6">
      <m.div {...fadeUp} className="card-luxe p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">Maintenance</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Tickets raised by tenants and managers, with costs booked on resolution.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFormOpen((o) => !o)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-gold-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-gold-sm transition-all hover:shadow-gold-md focus:outline-none focus:ring-2 focus:ring-gold-300 active:scale-[0.98]"
            aria-expanded={formOpen}
          >
            <Plus className="h-4 w-4" aria-hidden /> New ticket
          </button>
        </div>
        <div
          className="mt-4 flex flex-wrap gap-2"
          role="group"
          aria-label="Filter tickets by status"
        >
          {FILTERS.map((f) => (
            <button
              key={f.v}
              type="button"
              onClick={() => setFilter(f.v)}
              aria-pressed={filter === f.v}
              className={`inline-flex min-h-[36px] items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                filter === f.v
                  ? 'border-gold-600 bg-gold-gradient text-white shadow-gold-sm'
                  : 'border-gold-200 bg-white text-ink-soft hover:border-gold-400 hover:text-gold-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </m.div>

      {formOpen ? (
        <m.div {...fadeUp} className="card-luxe p-6">
          <h3 className="font-display text-lg font-bold text-ink">Raise a ticket</h3>
          <div className="mt-4 grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div>
              <label htmlFor="ticket-unit" className="label-luxe">
                Unit
              </label>
              <select
                id="ticket-unit"
                value={unitId}
                onChange={(e) => {
                  setUnitId(e.target.value);
                  setFormError('');
                }}
                className="input-luxe"
              >
                <option value="">Select unit…</option>
                {data.units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.area}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ticket-priority" className="label-luxe">
                Priority
              </label>
              <select
                id="ticket-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as MaintenanceTicket['priority'])}
                className="input-luxe"
              >
                <option value="low">Low — when convenient</option>
                <option value="medium">Medium — this week</option>
                <option value="high">High — urgent</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="ticket-title" className="label-luxe">
                Title
              </label>
              <input
                id="ticket-title"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setFormError('');
                }}
                placeholder="e.g. Water heater not heating"
                className="input-luxe"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="ticket-detail" className="label-luxe">
                Detail
              </label>
              <textarea
                id="ticket-detail"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                rows={3}
                placeholder="What exactly is wrong? Access notes, contractor hints…"
                className="input-luxe"
              />
            </div>
          </div>
          {formError ? (
            <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
              {formError}
            </p>
          ) : null}
          <button type="button" onClick={submitTicket} className="btn-gold mt-4">
            <Wrench className="h-4 w-4" aria-hidden /> Open ticket
          </button>
        </m.div>
      ) : null}

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {tickets.map((t) => {
          const unit = data.units.find((u) => u.id === t.unitId);
          return (
            <m.div key={t.id} {...fadeUp} className="card-luxe card-luxe-hover p-6">
              <div className="flex flex-wrap items-center gap-2">
                <PriorityChip priority={t.priority} />
                <TicketStatusChip status={t.status} />
                {unit ? (
                  <span className="text-xs text-ink-faint">
                    {unit.name} · {unit.area}
                  </span>
                ) : null}
                <span className="ml-auto text-xs text-ink-faint">
                  Raised {timeAgo(t.createdAt)}
                </span>
              </div>
              <h3 className="mt-3 font-display text-base font-semibold text-ink">{t.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{t.detail}</p>
              {t.status === 'resolved' ? (
                <p className="mt-3 flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
                  <span className="text-emerald-700">
                    Resolved {t.resolvedAt ? timeAgo(t.resolvedAt) : ''} — cost{' '}
                    {formatKES(t.costKes)}
                  </span>
                </p>
              ) : resolvingId === t.id ? (
                <div className="mt-4 rounded-xl bg-cream p-4">
                  <label htmlFor={`cost-${t.id}`} className="label-luxe">
                    Final cost (KES)
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      id={`cost-${t.id}`}
                      type="number"
                      min={0}
                      step={100}
                      value={costStr}
                      onChange={(e) => setCostStr(e.target.value)}
                      className="input-luxe max-w-[10rem]"
                      inputMode="numeric"
                    />
                    <button
                      type="button"
                      onClick={() => confirmResolve(t.id)}
                      className="btn-gold !px-4"
                    >
                      Confirm resolution
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setResolvingId(null);
                        setCostStr('');
                      }}
                      className="btn-outline !px-4"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {t.status === 'new' ? (
                    <button
                      type="button"
                      onClick={() => updateTicketStatus(t.id, 'scheduled')}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-gold-500/60 px-3.5 py-2 text-xs font-semibold text-gold-700 transition-colors hover:bg-gold-50"
                    >
                      <CalendarClock className="h-3.5 w-3.5" aria-hidden /> Schedule contractor
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setResolvingId(t.id);
                      setCostStr('');
                    }}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-gold-500/60 px-3.5 py-2 text-xs font-semibold text-gold-700 transition-colors hover:bg-gold-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Resolve with cost
                  </button>
                </div>
              )}
            </m.div>
          );
        })}
        {tickets.length === 0 ? (
          <p className="card-luxe p-6 text-center text-sm text-ink-muted lg:col-span-2">
            No tickets in this filter.
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------ Owner statement --------------------------- */

function StatementTab({
  store,
  months,
  initialMonth,
}: {
  store: Store;
  months: string[];
  initialMonth: string;
}) {
  const { data } = store;
  const [month, setMonth] = useState(initialMonth);
  const statement: MonthlyStatement = useMemo(
    () =>
      paymentsStatement(data.units, data.tenants, data.payments, data.tickets, month, MGMT_FEE_PCT),
    [data, month]
  );

  const figures = [
    { label: 'Gross collected', value: statement.grossCollected, strong: true },
    { label: 'Maintenance costs', value: -statement.maintenanceCost, strong: false },
    {
      label: `Management fee (${MGMT_FEE_PCT}% of collected)`,
      value: -statement.mgmtFee,
      strong: false,
    },
    { label: 'Net to owner', value: statement.net, strong: true },
  ];

  return (
    <div className="space-y-6">
      <m.div {...fadeUp} className="card-luxe p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">Owner statement</h2>
            <p className="mt-1 text-sm text-ink-muted">
              One month, computed from the ledger on this device.
            </p>
          </div>
          <button type="button" onClick={() => window.print()} className="btn-outline">
            <Printer className="h-4 w-4" aria-hidden /> Print statement
          </button>
        </div>
        <div className="mt-4">
          <MonthChips
            months={months}
            value={month}
            onChange={setMonth}
            ariaLabel="Statement month"
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="chip">
            <FlaskConical className="h-3.5 w-3.5" aria-hidden /> Statement is a DEMO computation —
            figures ESTIMATE
          </span>
        </div>
      </m.div>

      <m.div {...fadeUp} className="rounded-2xl bg-ink p-6 shadow-card sm:p-8">
        <p className="eyebrow !text-gold-400">{monthLabel(month)} statement</p>
        <div className="mt-5 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {figures.map((f) => (
            <div
              key={f.label}
              className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10 print:bg-white print:ring-gold-100"
            >
              <p
                className={`font-display text-xl font-bold ${
                  f.strong ? 'text-white print:text-ink' : 'text-gold-200 print:text-gold-700'
                }`}
              >
                {f.value < 0 ? `− ${formatKES(-f.value)}` : formatKES(f.value)}
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-white/50 print:text-ink-faint">
                {f.label}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs leading-relaxed text-white/50 print:text-ink-faint">
          Maintenance reflects resolved tickets only. The management fee is charged on collected
          rent — nothing when nothing is collected.
        </p>
      </m.div>

      {/* desktop table */}
      <m.div {...fadeUp} className="card-luxe hidden overflow-x-auto p-6 md:block">
        <h3 className="font-display text-lg font-bold text-ink">Collections by unit</h3>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-gold-100 text-left text-[11px] font-bold uppercase tracking-wider text-ink-faint">
              <th scope="col" className="pb-3 pr-4">
                Unit
              </th>
              <th scope="col" className="pb-3 pr-4">
                Status
              </th>
              <th scope="col" className="pb-3 pr-4">
                Expected
              </th>
              <th scope="col" className="pb-3 pr-4">
                Collected
              </th>
              <th scope="col" className="pb-3">
                Maintenance
              </th>
            </tr>
          </thead>
          <tbody>
            {statement.byUnit.map((u) => (
              <tr key={u.unitId} className="border-b border-gold-100/70 last:border-0">
                <td className="py-3.5 pr-4">
                  <p className="font-semibold text-ink">{u.name}</p>
                  <p className="text-xs text-ink-faint">{u.area}</p>
                </td>
                <td className="py-3.5 pr-4">
                  <StatusChip status={u.status} />
                </td>
                <td className="py-3.5 pr-4 text-ink-soft">
                  {u.expectedKes > 0 ? formatKES(u.expectedKes) : '—'}
                </td>
                <td className="py-3.5 pr-4 text-ink-soft">
                  {u.collectedKes > 0 ? formatKES(u.collectedKes) : '—'}
                </td>
                <td className="py-3.5 text-ink-soft">
                  {u.maintenanceKes > 0 ? formatKES(u.maintenanceKes) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </m.div>

      {/* mobile cards */}
      <div className="space-y-4 md:hidden">
        <h3 className="font-display text-lg font-bold text-ink">Collections by unit</h3>
        {statement.byUnit.map((u) => (
          <div key={u.unitId} className="card-luxe p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-ink">{u.name}</p>
                <p className="text-xs text-ink-faint">{u.area}</p>
              </div>
              <StatusChip status={u.status} />
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Expected</dt>
                <dd className="text-ink-soft">
                  {u.expectedKes > 0 ? formatKES(u.expectedKes) : '—'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Collected</dt>
                <dd className="text-ink-soft">
                  {u.collectedKes > 0 ? formatKES(u.collectedKes) : '—'}
                </dd>
              </div>
              <div className="flex justify-between border-t border-gold-100 pt-1.5">
                <dt className="text-ink-muted">Maintenance</dt>
                <dd className="text-ink-soft">
                  {u.maintenanceKes > 0 ? formatKES(u.maintenanceKes) : '—'}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------- page ---------------------------------- */

const SERVICES = [
  {
    icon: KeyRound,
    title: 'Tenant sourcing & placement',
    text: 'Qualified tenants from the Keja network. Letting only: one month’s rent, once.',
  },
  {
    icon: Building2,
    title: 'Full management',
    text: 'Long-let management at 8% of collected rent — nothing when nothing is collected.',
  },
  {
    icon: Sparkles,
    title: 'Airbnb & short-stay',
    text: 'From 15%, all-inclusive of guest handling, pricing and turnovers.',
  },
  {
    icon: Home,
    title: 'Furnishing packages',
    text: 'Staged, financed and rent-optimised for landlords who want the premium band.',
  },
];

export default function Manage() {
  usePageMeta(
    'Landlord Studio — Units, Rent Ledger & Owner Statements',
    'Track units, tenants, M-Pesa rent collection, maintenance tickets and monthly owner statements — every figure computed live from your ledger.'
  );
  const store = useLandlordStore();
  const [tab, setTab] = useState<Tab>('overview');
  const [searchParams, setSearchParams] = useSearchParams();

  // deep links: /manage?tab=ledger
  useEffect(() => {
    const q = searchParams.get('tab');
    if (q && VALID_TABS.includes(q as Tab)) {
      setTab(q as Tab);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const asOf = useMemo(() => asOfMonth(store.data.payments, nowMonth()), [store.data.payments]);
  const months = useMemo(() => monthRange(asOf, 6), [asOf]);
  const [ledgerMonth, setLedgerMonth] = useState(asOf);
  const [autoOpenFor, setAutoOpenFor] = useState<string | null>(null);

  const quickRecord = (tenantId: string) => {
    setLedgerMonth(asOf);
    setAutoOpenFor(tenantId);
    setTab('ledger');
  };

  return (
    <div className="bg-cream/60">
      <section className="bg-ink py-16 sm:py-20">
        <div className="container-luxe max-w-3xl text-center">
          <p className="eyebrow !text-gold-400">Property management</p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
            Landlord <span className="gold-text">Studio</span>
          </h1>
          <p className="mt-6 leading-relaxed text-white/65">
            Units, tenants, rent and maintenance in one honest ledger. Every number on this page is
            computed live from the payments and tickets you record — no vanity stats, no surprises
            on the statement.
          </p>
        </div>
      </section>

      {/* honest demo boundary */}
      <div role="note" className="border-b border-amber-200 bg-amber-50">
        <div className="container-luxe flex items-center justify-center gap-2.5 px-4 py-2.5 text-center text-xs text-amber-900">
          <FlaskConical className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <p>
            <strong>Studio demo</strong> — data lives in your browser only. Production syncs M-Pesa
            statements + manager entries.
          </p>
        </div>
      </div>

      {/* tab bar */}
      <div className="sticky top-16 sticky-banner-shift z-30 border-b border-gold-100 bg-white/95 backdrop-blur-md">
        <div
          className="container-luxe no-scrollbar flex items-center gap-1 overflow-x-auto py-2.5"
          role="tablist"
          aria-label="Landlord Studio sections"
        >
          <span className="mr-2 hidden items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide2 text-gold-700 sm:flex">
            <LayoutDashboard className="h-4 w-4" /> Landlord Studio
          </span>
          {TABS.map((t) => (
            <button
              key={t.v}
              type="button"
              onClick={() => setTab(t.v)}
              role="tab"
              aria-selected={tab === t.v}
              className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors ${
                tab === t.v
                  ? 'bg-gold-50 text-gold-700'
                  : 'text-ink-soft hover:bg-gold-50/60 hover:text-gold-700'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" aria-hidden />
              {t.label}
            </button>
          ))}
          <button
            type="button"
            onClick={store.resetDemo}
            className="ml-auto inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-ink-muted transition-colors hover:bg-gold-50 hover:text-gold-700"
            title="Restore the seeded demo portfolio"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Reset demo data</span>
          </button>
        </div>
      </div>

      <div className="container-luxe py-10 sm:py-14">
        {tab === 'overview' ? (
          <OverviewTab store={store} onQuickRecord={quickRecord} asOf={asOf} />
        ) : null}
        {tab === 'ledger' ? (
          <LedgerTab
            store={store}
            months={months}
            month={ledgerMonth}
            setMonth={setLedgerMonth}
            autoOpenFor={autoOpenFor}
            onAutoOpenConsumed={() => setAutoOpenFor(null)}
          />
        ) : null}
        {tab === 'maintenance' ? <MaintenanceTab store={store} /> : null}
        {tab === 'statement' ? (
          <StatementTab store={store} months={months} initialMonth={asOf} />
        ) : null}
      </div>

      {/* services we plug into — kept compact from the old marketing page */}
      <section className="section-pad bg-cream">
        <div className="container-luxe">
          <p className="eyebrow">Services we plug into</p>
          <h2 className="heading-display mt-3 text-2xl sm:text-3xl">
            When you want humans behind the tool
          </h2>
          <div className="mt-8 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((s) => (
              <m.div key={s.title} {...fadeUp} className="card-luxe card-luxe-hover p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-gradient shadow-gold-sm">
                  <s.icon className="h-5 w-5 text-white" />
                </span>
                <h3 className="mt-4 font-display text-base font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{s.text}</p>
              </m.div>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <Link to="/contact" className="btn-gold">
              Get a management quote <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
