'use client';
/**
 * KEJA MANAGE (proposal §12) — the property & rental management desk:
 * units, tenants & screening, rent collection, leases, maintenance tickets,
 * statements, AI alerts and owner reporting. Seeded demo portfolio, fully
 * editable, persisted on-device.
 */
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, } from '@/components/charts/reexports';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  DoorClosed,
  LayoutDashboard,
  LineChart,
  Plus,
  Receipt,
  RotateCcw,
  Wrench,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  collectionRate,
  computeArrears,
  monthIncome,
  occupancyRate,
  useLandlordStore,
  type NewTenant,
  type NewTicket,
  type NewUnit,
} from '@/lib/landlordStore';
import { formatKES } from '@/lib/format';
import { cn } from '@/lib/utils';

const STATUS_CLASS = {
  occupied: 'bg-primary/10 text-primary',
  vacant: 'bg-gold/15 text-gold-foreground',
  notice: 'bg-destructive/10 text-destructive',
} as const;

const PRIORITY_CLASS = { high: 'bg-destructive text-destructive-foreground', medium: 'bg-gold text-gold-foreground', low: 'bg-muted text-muted-foreground' } as const;
const TICKET_CLASS = { new: 'border-gold/50 text-gold-foreground', scheduled: 'border-primary/40 text-primary', resolved: 'border-border text-muted-foreground' } as const;

export default function ManageView() {
  const { data, addUnit, addTenant, recordPayment, addTicket, updateTicketStatus, resetDemo } = useLandlordStore();
  const [payOpenFor, setPayOpenFor] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [unitDraft, setUnitDraft] = useState<Partial<NewUnit>>({ type: 'apartment', area: 'Kilimani', beds: 2, status: 'vacant' });
  const [tenantDraft, setTenantDraft] = useState<Partial<NewTenant>>({});
  const [ticketDraft, setTicketDraft] = useState<Partial<NewTicket>>({ priority: 'medium' });
  const [unitOpen, setUnitOpen] = useState(false);
  const [tenantOpen, setTenantOpen] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const arrears = useMemo(() => computeArrears(data.tenants, data.payments), [data.tenants, data.payments]);
  const occupancy = occupancyRate(data.units);
  const collection = collectionRate(data.tenants, data.payments, thisMonth);
  const monthNow = monthIncome(data.payments, thisMonth);
  const expectedMonthly = data.tenants.reduce((s, t) => s + t.monthlyRentKes, 0);
  const arrearsTotal = Object.values(arrears).reduce((s, a) => s + Math.max(0, a.balanceKes), 0);

  // last 6 months income series
  const incomeSeries = useMemo(() => {
    const out: { month: string; income: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      out.push({ month: d.toLocaleDateString('en-KE', { month: 'short' }), income: monthIncome(data.payments, key) });
    }
    return out;
  }, [data.payments]);

  // AI alerts (rule-based, transparent) — computed inline, cheap
  const alerts = (() => {
    const list: { tone: 'high' | 'medium'; text: string }[] = [];
    for (const [tenantId, a] of Object.entries(arrears)) {
      const tenant = data.tenants.find((t) => t.id === tenantId);
      const monthsBehind = a.expectedKes > 0 ? Math.ceil(a.balanceKes / a.expectedKes) : 0;
      if (a.balanceKes > 0 && monthsBehind >= 2 && tenant) {
        list.push({ tone: 'high', text: `${tenant.name} is ~${monthsBehind} months in arrears (${formatKES(a.balanceKes)}) — issue a formal reminder or start the notice process.` });
      }
    }
    const vacant = data.units.filter((u) => u.status === 'vacant');
    if (vacant.length > 0) {
      list.push({ tone: 'medium', text: `${vacant.length} unit${vacant.length === 1 ? '' : 's'} vacant (${vacant.map((u) => u.name).slice(0, 3).join(', ')}) — relist on the Keja marketplace to shorten the void.` });
    }
    const openTickets = data.tickets.filter((t) => t.status !== 'resolved');
    if (openTickets.some((t) => t.priority === 'high')) {
      list.push({ tone: 'high', text: 'High-priority maintenance is still open — unresolved water/electrical issues escalate to habitability risk.' });
    }
    if (collection < 90 && expectedMonthly > 0) {
      list.push({ tone: 'medium', text: `Collections at ${collection.toFixed(0)}% this month — below the 90% healthy band.` });
    }
    return list;
  })();

  const unitsById = useMemo(() => new Map(data.units.map((u) => [u.id, u])), [data.units]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Badge variant="outline" className="border-primary/40 font-bold text-primary">Keja Manage</Badge>
          <h1 className="mt-2.5 text-3xl font-black tracking-tight sm:text-4xl">My properties</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {data.units.length} properties · {formatKES(expectedMonthly)} monthly rental income ·{' '}
            {occupancy.toFixed(0)}% occupancy · {formatKES(expectedMonthly * 12)} annual revenue
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="font-bold" onClick={resetDemo}>
            <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden /> Reset demo data
          </Button>
        </div>
      </div>

      {/* headline strip (mirrors proposal §12 mock) */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { l: 'Monthly rental income', v: formatKES(expectedMonthly), s: `${collection.toFixed(0)}% collected this month` },
          { l: 'Occupancy', v: `${occupancy.toFixed(0)}%`, s: `${data.units.filter((u) => u.status === 'vacant').length} vacant` },
          { l: 'Arrears outstanding', v: formatKES(arrearsTotal), s: `${Object.values(arrears).filter((a) => a.balanceKes > 0).length} tenants behind` },
          { l: 'Open maintenance', v: `${data.tickets.filter((t) => t.status !== 'resolved').length}`, s: `${data.tickets.filter((t) => t.priority === 'high' && t.status !== 'resolved').length} high priority` },
        ].map((m) => (
          <div key={m.l} className="card-lift rounded-2xl border bg-card p-4 sm:p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">{m.l}</p>
            <p className="mt-2 text-xl font-black tabular-nums sm:text-2xl">{m.v}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{m.s}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="overview" className="mt-7">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview" className="gap-1.5 font-bold"><LayoutDashboard className="h-4 w-4" aria-hidden /> Overview</TabsTrigger>
          <TabsTrigger value="units" className="gap-1.5 font-bold"><Building2 className="h-4 w-4" aria-hidden /> Properties</TabsTrigger>
          <TabsTrigger value="tenants" className="gap-1.5 font-bold"><DoorClosed className="h-4 w-4" aria-hidden /> Tenants & leases</TabsTrigger>
          <TabsTrigger value="rent" className="gap-1.5 font-bold"><Receipt className="h-4 w-4" aria-hidden /> Rent collection</TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-1.5 font-bold"><Wrench className="h-4 w-4" aria-hidden /> Maintenance</TabsTrigger>
        </TabsList>

        {/* ------------------------------ overview ------------------------------ */}
        <TabsContent value="overview" className="mt-6 space-y-5">
          {alerts.length > 0 && (
            <div className="rounded-3xl border-2 border-gold/40 bg-gold-soft p-5">
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-gold-foreground">
                <AlertTriangle className="h-4 w-4" aria-hidden /> AI alerts — rule-based, transparent
              </h3>
              <ul className="mt-3 space-y-2">
                {alerts.map((a, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-gold-foreground/90">
                    <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', a.tone === 'high' ? 'bg-destructive' : 'bg-gold')} aria-hidden />
                    {a.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
            <div className="rounded-3xl border bg-card p-5">
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
                <LineChart className="h-4 w-4 text-gold" aria-hidden /> Rent collected — last 6 months
              </h3>
              <div className="mt-4 h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={incomeSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={(v) => [formatKES(Number(v ?? 0)), 'Collected']} contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="income" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-3xl border bg-card p-5">
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
                <ClipboardList className="h-4 w-4 text-gold" aria-hidden /> Owner statement
              </h3>
              <div className="mt-4 space-y-2.5 text-sm">
                {[
                  ['Gross scheduled rent (month)', formatKES(expectedMonthly)],
                  ['Collected to date', formatKES(monthNow)],
                  ['Arrears (all tenants)', formatKES(arrearsTotal)],
                  ['Management fee (8%)', formatKES(Math.round(expectedMonthly * 0.08))],
                  ['Net to owner (est.)', formatKES(Math.round(monthNow - expectedMonthly * 0.08))],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between border-b border-dashed border-border pb-2 last:border-0">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-black tabular-nums">{v}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[10px] text-muted-foreground">
                Statement generated from on-device records. Full owner packs (annual, per-unit, tax-ready) ship with the live product.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* -------------------------------- units ------------------------------- */}
        <TabsContent value="units" className="mt-6">
          <div className="mb-4 flex justify-end">
            <Dialog open={unitOpen} onOpenChange={setUnitOpen}>
              <DialogTrigger asChild>
                <Button className="font-bold"><Plus className="mr-1.5 h-4 w-4" aria-hidden /> Add property</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add a property</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  {([['name', 'Unit name'], ['area', 'Area']] as const).map(([k, l]) => (
                    <div key={k} className="grid gap-1">
                      <Label htmlFor={`u-${k}`}>{l}</Label>
                      <Input id={`u-${k}`} value={unitDraft[k] as string ?? ''} onChange={(e) => setUnitDraft({ ...unitDraft, [k]: e.target.value })} />
                    </div>
                  ))}
                  <div className="grid gap-1">
                    <Label htmlFor="u-rent">Monthly rent (KES)</Label>
                    <Input id="u-rent" type="number" value={unitDraft.monthlyRentKes ?? ''} onChange={(e) => setUnitDraft({ ...unitDraft, monthlyRentKes: Number(e.target.value) })} />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="u-beds">Bedrooms</Label>
                    <Input id="u-beds" type="number" value={unitDraft.beds ?? ''} onChange={(e) => setUnitDraft({ ...unitDraft, beds: Number(e.target.value) })} />
                  </div>
                </div>
                <Button
                  className="mt-2 font-bold"
                  disabled={!unitDraft.name}
                  onClick={() => {
                    addUnit(unitDraft as NewUnit);
                    setUnitDraft({ type: 'apartment', area: 'Kilimani', beds: 2, status: 'vacant' });
                    setUnitOpen(false);
                  }}
                >
                  Add to portfolio
                </Button>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.units.map((u) => {
              const tenant = data.tenants.find((t) => t.unitId === u.id);
              return (
                <div key={u.id} className="card-lift rounded-2xl border bg-card p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold">{u.name}</h3>
                      <p className="text-xs text-muted-foreground">{u.area} · {u.beds} bed {u.type}</p>
                    </div>
                    <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider', STATUS_CLASS[u.status])}>{u.status}</span>
                  </div>
                  <p className="mt-3 text-lg font-black tabular-nums">{formatKES(u.monthlyRentKes)}<span className="text-xs font-bold text-muted-foreground">/mo</span></p>
                  {tenant ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {tenant.name} · lease to {new Date(tenant.leaseEnd).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs font-semibold text-gold">Vacant — relist to shorten the void</p>
                  )}
                  {(() => {
                    const ar = arrears[tenant?.id ?? ''];
                    const months = ar && ar.expectedKes > 0 ? Math.ceil(ar.balanceKes / ar.expectedKes) : 0;
                    return ar && ar.balanceKes > 0 ? (
                      <p className="mt-2 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-[11px] font-bold text-destructive">
                        In arrears: {formatKES(ar.balanceKes)} (~{months} mo)
                      </p>
                    ) : null;
                  })()}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ------------------------------- tenants ------------------------------ */}
        <TabsContent value="tenants" className="mt-6 space-y-5">
          <div className="flex justify-end">
            <Dialog open={tenantOpen} onOpenChange={setTenantOpen}>
              <DialogTrigger asChild>
                <Button className="font-bold"><Plus className="mr-1.5 h-4 w-4" aria-hidden /> Add tenant</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Onboard a tenant</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  {([['name', 'Full name'], ['phone', 'Phone'], ['leaseStart', 'Lease start'], ['leaseEnd', 'Lease end']] as const).map(([k, l]) => (
                    <div key={k} className="grid gap-1">
                      <Label htmlFor={`t-${k}`}>{l}</Label>
                      <Input
                        id={`t-${k}`}
                        type={k.includes('lease') ? 'date' : 'text'}
                        value={tenantDraft[k] as string ?? ''}
                        onChange={(e) => setTenantDraft({ ...tenantDraft, [k]: e.target.value })}
                      />
                    </div>
                  ))}
                  <div className="grid gap-1">
                    <Label htmlFor="t-rent">Monthly rent (KES)</Label>
                    <Input id="t-rent" type="number" value={tenantDraft.monthlyRentKes ?? ''} onChange={(e) => setTenantDraft({ ...tenantDraft, monthlyRentKes: Number(e.target.value) })} />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="t-unit">Unit</Label>
                    <select
                      id="t-unit"
                      className="h-9 rounded-lg border bg-background px-3 text-sm"
                      value={tenantDraft.unitId ?? ''}
                      onChange={(e) => setTenantDraft({ ...tenantDraft, unitId: e.target.value })}
                    >
                      <option value="">Select unit…</option>
                      {data.units.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <Button
                  className="mt-2 font-bold"
                  disabled={!tenantDraft.name || !tenantDraft.unitId}
                  onClick={() => {
                    addTenant({
                      ...(tenantDraft as NewTenant),
                      depositKes: (tenantDraft.monthlyRentKes ?? 0) * 2,
                      balanceKes: 0,
                    });
                    setTenantDraft({});
                    setTenantOpen(false);
                  }}
                >
                  Add tenant & occupy unit
                </Button>
              </DialogContent>
            </Dialog>
          </div>

          <div className="overflow-hidden rounded-3xl border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-accent/40 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3">Tenant</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Lease</th>
                    <th className="px-4 py-3 text-right">Rent</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tenants.map((t) => {
                    const ar = arrears[t.id];
                    return (
                      <tr key={t.id} className="border-b transition-colors last:border-0 hover:bg-accent/30">
                        <td className="px-5 py-3.5">
                          <p className="font-bold">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.phone}</p>
                        </td>
                        <td className="px-4 py-3.5">{unitsById.get(t.unitId)?.name ?? '—'}</td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">
                          {new Date(t.leaseStart).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })} → {new Date(t.leaseEnd).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums">{formatKES(t.monthlyRentKes)}</td>
                        <td className="px-4 py-3.5 text-right">
                          <span className={cn('font-black tabular-nums', (ar?.balanceKes ?? 0) > 0 ? 'text-destructive' : 'text-primary')}>
                            {formatKES(ar?.balanceKes ?? 0)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 font-bold"
                            onClick={() => {
                              setPayOpenFor(t.id);
                              setPayAmount(t.monthlyRentKes);
                            }}
                          >
                            Record rent
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* screening note */}
          <div className="rounded-3xl border bg-card p-5">
            <h3 className="text-sm font-black uppercase tracking-wider">Tenant screening (pilot)</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              With consent, screening combines identity verification, employment confirmation,
              prior-landlord references and an affordability check against the 33% rent-to-income
              guideline — the same discipline the Trust Score applies to listings, applied to people.
              Screening runs on the live product with partner integrations; the trial desk records
              results manually.
            </p>
          </div>
        </TabsContent>

        {/* -------------------------------- rent -------------------------------- */}
        <TabsContent value="rent" className="mt-6 space-y-5">
          <div className="rounded-3xl border bg-card p-5">
            <h3 className="text-sm font-black uppercase tracking-wider">This month — {new Date().toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })}</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Expected</p>
                <p className="text-xl font-black tabular-nums">{formatKES(expectedMonthly)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Collected</p>
                <p className="text-xl font-black tabular-nums text-primary">{formatKES(monthNow)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Collection rate</p>
                <p className="text-xl font-black tabular-nums">{collection.toFixed(0)}%</p>
                <Progress value={collection} className="mt-2 h-2" aria-label={`${collection}% collected`} />
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl border bg-card">
            <div className="border-b px-5 py-3.5 text-sm font-black uppercase tracking-wider">Recent payments</div>
            <div className="max-h-96 overflow-y-auto slim-scroll">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-accent/40">
                  <tr className="text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Tenant</th>
                    <th className="px-4 py-2.5">Month</th>
                    <th className="px-4 py-2.5">Channel</th>
                    <th className="px-4 py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.payments].reverse().slice(0, 25).map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="px-5 py-2.5 text-xs text-muted-foreground">{new Date(p.paidOn).toLocaleDateString('en-KE')}</td>
                      <td className="px-4 py-2.5 font-semibold">{data.tenants.find((t) => t.id === p.tenantId)?.name ?? '—'}</td>
                      <td className="px-4 py-2.5">{p.month}</td>
                      <td className="px-4 py-2.5"><Badge variant="secondary" className="text-[10px] font-bold uppercase">{p.channel}</Badge></td>
                      <td className="px-4 py-2.5 text-right font-black tabular-nums">{formatKES(p.amountKes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ----------------------------- maintenance ---------------------------- */}
        <TabsContent value="maintenance" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Dialog open={ticketOpen} onOpenChange={setTicketOpen}>
              <DialogTrigger asChild>
                <Button className="font-bold"><Plus className="mr-1.5 h-4 w-4" aria-hidden /> Log maintenance request</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Log a request</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div className="grid gap-1">
                    <Label htmlFor="m-title">Title</Label>
                    <Input id="m-title" value={ticketDraft.title ?? ''} onChange={(e) => setTicketDraft({ ...ticketDraft, title: e.target.value })} placeholder="e.g. Kitchen tap leaking" />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="m-detail">Detail</Label>
                    <Input id="m-detail" value={ticketDraft.detail ?? ''} onChange={(e) => setTicketDraft({ ...ticketDraft, detail: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1">
                      <Label htmlFor="m-unit">Unit</Label>
                      <select id="m-unit" className="h-9 rounded-lg border bg-background px-3 text-sm" value={ticketDraft.unitId ?? ''} onChange={(e) => setTicketDraft({ ...ticketDraft, unitId: e.target.value })}>
                        <option value="">Select unit…</option>
                        {data.units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="m-priority">Priority</Label>
                      <select id="m-priority" className="h-9 rounded-lg border bg-background px-3 text-sm" value={ticketDraft.priority ?? 'medium'} onChange={(e) => setTicketDraft({ ...ticketDraft, priority: e.target.value as NewTicket['priority'] })}>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  </div>
                </div>
                <Button
                  className="mt-2 font-bold"
                  disabled={!ticketDraft.title || !ticketDraft.unitId}
                  onClick={() => {
                    addTicket(ticketDraft as NewTicket);
                    setTicketDraft({ priority: 'medium' });
                    setTicketOpen(false);
                  }}
                >
                  Log request
                </Button>
              </DialogContent>
            </Dialog>
          </div>
          {data.tickets.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
              <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider', PRIORITY_CLASS[t.priority])}>{t.priority}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{t.title}</p>
                <p className="text-xs text-muted-foreground">{unitsById.get(t.unitId)?.name} · {t.detail}</p>
              </div>
              <Badge variant="outline" className={cn('text-[10px] font-bold capitalize', TICKET_CLASS[t.status])}>{t.status}</Badge>
              {t.status !== 'resolved' ? (
                <div className="flex gap-1.5">
                  {t.status === 'new' && (
                    <Button size="sm" variant="outline" className="h-8 text-xs font-bold" onClick={() => updateTicketStatus(t.id, 'scheduled')}>Schedule</Button>
                  )}
                  <Button size="sm" className="h-8 text-xs font-bold" onClick={() => updateTicketStatus(t.id, 'resolved', 4500)}>
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden /> Resolve
                  </Button>
                </div>
              ) : (
                <span className="text-xs font-semibold text-muted-foreground">
                  {t.resolvedAt ? `resolved ${new Date(t.resolvedAt).toLocaleDateString('en-KE')}` : ''} · {formatKES(t.costKes)}
                </span>
              )}
            </div>
          ))}
        </TabsContent>
      </Tabs>

      {/* record payment modal */}
      {payOpenFor && (() => {
        const tenant = data.tenants.find((t) => t.id === payOpenFor)!;
        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Record rent payment">
            <div className="w-full max-w-sm rounded-3xl border bg-card p-6">
              <DialogHeader>
                <DialogTitle>Record rent — {tenant.name}</DialogTitle>
              </DialogHeader>
              <div className="mt-4 grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="pay-amount">Amount (KES)</Label>
                  <Input id="pay-amount" type="number" value={payAmount || ''} onChange={(e) => setPayAmount(Number(e.target.value))} />
                </div>
                <div className="flex gap-1.5">
                  {(['mpesa', 'bank', 'cash'] as const).map((ch) => (
                    <Button
                      key={ch}
                      size="sm"
                      className="flex-1 font-bold capitalize"
                      onClick={() => {
                        recordPayment({ tenantId: tenant.id, month: thisMonth, amountKes: payAmount, channel: ch });
                        setPayOpenFor(null);
                      }}
                    >
                      {ch === 'mpesa' ? 'M-Pesa' : ch}
                    </Button>
                  ))}
                </div>
                <Button variant="ghost" onClick={() => setPayOpenFor(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
