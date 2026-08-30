import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Building2,
  Eye,
  Flame,
  LayoutDashboard,
  Percent,
  ShieldCheck,
  Snowflake,
  Sun,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import SmartImg from '@/components/ui/SmartImg';
import { AGENCIES, PROPERTIES } from '@/data/properties';
import { formatKES } from '@/lib/format';
import { usePageMeta } from '@/lib/seo';
import type { Lead } from '@/lib/store';
import { KEYS, seedLeads, useStore } from '@/lib/store';

const TEMPS = [
  {
    key: 'HOT',
    label: 'HOT',
    icon: Flame,
    style: 'bg-red-50 border-red-200 text-red-700',
    dot: 'bg-red-500',
  },
  {
    key: 'WARM',
    label: 'WARM',
    icon: Sun,
    style: 'bg-amber-50 border-amber-200 text-amber-700',
    dot: 'bg-amber-500',
  },
  {
    key: 'COLD',
    label: 'COLD',
    icon: Snowflake,
    style: 'bg-sky-50 border-sky-200 text-sky-700',
    dot: 'bg-sky-500',
  },
] as const;

export default function Dashboard() {
  usePageMeta(
    'Sales Dashboard — Leads & Pipeline',
    'HOT/WARM/COLD lead qualification, pipeline analytics and the verification queue for Keja partners.'
  );
  const [userLeads] = useStore<Lead[]>(KEYS.leads, []);
  const [viewed] = useStore<string[]>(KEYS.viewed, []);
  const [favorites] = useStore<string[]>(KEYS.favorites, []);
  const leads = useMemo(() => [...userLeads, ...seedLeads], [userLeads]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const stats = useMemo(() => {
    const byType: Record<string, number> = {};
    PROPERTIES.forEach((p) => {
      byType[p.type] = (byType[p.type] ?? 0) + 1;
    });
    return {
      total: PROPERTIES.length,
      available: PROPERTIES.filter((p) => p.availability === 'available').length,
      reserved: PROPERTIES.filter((p) => p.availability === 'reserved').length,
      flagged: PROPERTIES.filter((p) => p.trustScore < 60).length,
      avgTrust: Math.round(PROPERTIES.reduce((s, p) => s + p.trustScore, 0) / PROPERTIES.length),
      totalValue: PROPERTIES.reduce((s, p) => s + p.price, 0),
      byType: Object.entries(byType).map(([name, value]) => ({ name, value })),
      hotCount: leads.filter((l) => l.temperature === 'HOT').length,
    };
  }, [leads]);

  const occupancyData = [
    { month: 'Mar', occupancy: 82, rent: 92 },
    { month: 'Apr', occupancy: 85, rent: 94 },
    { month: 'May', occupancy: 88, rent: 96 },
    { month: 'Jun', occupancy: 84, rent: 97 },
    { month: 'Jul', occupancy: 89, rent: 99 },
    { month: 'Aug', occupancy: 91, rent: 100 },
  ];

  const verificationQueue = PROPERTIES.filter((p) => p.trustScore < 90).slice(0, 5);

  return (
    <div className="bg-cream/60">
      <div className="container-luxe py-10 sm:py-14">
        {/* header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Command centre · demo data</p>
            <h1 className="heading-display mt-3 flex items-center gap-3 text-3xl sm:text-4xl">
              <LayoutDashboard className="h-8 w-8 text-gold-600" />
              Keja Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
              Multi-agency lead pipeline, inventory performance and the verification queue — the
              operational view of the trust layer. Leads captured on this device appear alongside
              seeded demo leads.
            </p>
          </div>
          <Link to="/ask" className="btn-gold">
            <Bot className="h-4 w-4" /> Generate more leads
          </Link>
        </div>

        {/* stat cards */}
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-6">
          {[
            {
              icon: Building2,
              label: 'Listings',
              value: stats.total,
              sub: `${stats.available} available · ${stats.reserved} reserved`,
            },
            {
              icon: ShieldCheck,
              label: 'Avg trust',
              value: `${stats.avgTrust}/100`,
              sub: `${stats.flagged} flagged`,
            },
            { icon: Users, label: 'Leads', value: leads.length, sub: `${stats.hotCount} HOT` },
            {
              icon: TrendingUp,
              label: 'Portfolio value',
              value: formatKES(stats.totalValue, { compact: true }),
              sub: 'across agencies',
            },
            {
              icon: Eye,
              label: 'Your activity',
              value: viewed.length,
              sub: `${favorites.length} favourited`,
            },
            { icon: Percent, label: 'Avg occupancy', value: '87%', sub: 'managed units' },
          ].map((s) => (
            <div key={s.label} className="card-luxe p-4">
              <s.icon className="h-5 w-5 text-gold-600" />
              <p className="mt-2 font-display text-2xl font-bold text-ink">{s.value}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                {s.label}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-muted">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* pipeline */}
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-ink">Lead pipeline</h2>
            <p className="text-xs text-ink-faint">
              HOT leads route to agency sales teams immediately
            </p>
          </div>
          <div className="mt-4 grid gap-4 grid-cols-1 lg:grid-cols-3">
            {TEMPS.map((t) => {
              const colLeads = leads.filter((l) => l.temperature === t.key);
              return (
                <div key={t.key} className={`rounded-2xl border p-4 ${t.style}`}>
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-2 text-sm font-bold">
                      <t.icon className="h-4 w-4" /> {t.label}
                    </p>
                    <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-bold">
                      {colLeads.length}
                    </span>
                  </div>
                  <div className="mt-3 space-y-2.5">
                    {colLeads.length === 0 && (
                      <p className="rounded-xl bg-white/50 px-3 py-4 text-center text-xs text-ink-muted">
                        No leads yet
                      </p>
                    )}
                    {colLeads.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => setSelectedLead(l)}
                        className="w-full rounded-xl bg-white p-3.5 text-left shadow-sm transition hover:shadow-md"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-ink">{l.name}</p>
                          <span className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">
                            {l.source}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-ink-muted">{l.interest}</p>
                        <p className="mt-1.5 text-[11px] font-semibold text-gold-700">{l.budget}</p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* lead detail */}
          {selectedLead ? (
            <div className="card-luxe mt-4 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-gradient font-display text-base font-bold text-white">
                      {selectedLead.name.charAt(0)}
                    </span>
                    <div>
                      <p className="font-display text-lg font-bold text-ink">{selectedLead.name}</p>
                      <p className="text-xs text-ink-muted">
                        {selectedLead.phone}
                        {selectedLead.email ? ` · ${selectedLead.email}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-x-10 gap-y-2 text-sm sm:grid-cols-2">
                    <p>
                      <span className="text-ink-faint">Interest:</span>{' '}
                      <b className="text-ink">{selectedLead.interest}</b>
                    </p>
                    <p>
                      <span className="text-ink-faint">Budget:</span>{' '}
                      <b className="text-ink">{selectedLead.budget ?? '—'}</b>
                    </p>
                    <p>
                      <span className="text-ink-faint">Timeline:</span>{' '}
                      <b className="text-ink">{selectedLead.timeline ?? '—'}</b>
                    </p>
                    <p>
                      <span className="text-ink-faint">Source:</span>{' '}
                      <b className="text-ink capitalize">{selectedLead.source}</b>
                    </p>
                    {selectedLead.propertyId ? (
                      <p className="sm:col-span-2">
                        <span className="text-ink-faint">Linked listing:</span>{' '}
                        <Link
                          to={`/properties/${selectedLead.propertyId}`}
                          className="font-bold text-gold-700"
                        >
                          {selectedLead.propertyId} →
                        </Link>
                      </p>
                    ) : null}
                  </div>
                  {selectedLead.note ? (
                    <p className="mt-3 rounded-xl bg-gold-50 p-3 text-xs leading-relaxed text-ink-soft">
                      <b>AI note:</b> {selectedLead.note}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2">
                  <a
                    href={`tel:${selectedLead.phone.replace(/\s/g, '')}`}
                    className="btn-outline !py-2 text-xs"
                  >
                    Call lead
                  </a>
                  <a
                    href={`https://wa.me/${selectedLead.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {/* charts row */}
        <div className="mt-10 grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* inventory by type */}
          <div className="card-luxe p-6">
            <h3 className="font-display text-lg font-bold text-ink">Inventory by type</h3>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.byType}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {stats.byType.map((_, i) => (
                      <Cell
                        key={i}
                        fill={
                          ['#C6A34F', '#A88430', '#8A6B26', '#E8D5A3', '#6B521D', '#DFC470'][i % 6]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #EAD8A0', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* rental performance */}
          <div className="card-luxe p-6">
            <h3 className="font-display text-lg font-bold text-ink">
              Rental performance — managed units
            </h3>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={occupancyData} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0E8D5" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8F887C' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#8F887C' }} domain={[70, 100]} />
                  <Tooltip
                    formatter={(v, name) => [
                      name === 'occupancy' ? `${v}%` : `${v}%`,
                      name === 'occupancy' ? 'Occupancy' : 'Rent collected %',
                    ]}
                    contentStyle={{ borderRadius: 12, border: '1px solid #EAD8A0', fontSize: 12 }}
                  />
                  <Bar dataKey="occupancy" fill="#C6A34F" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="rent" fill="#8A6B26" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* verification queue */}
        <section className="mt-10">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Verification queue
          </h2>
          <div className="card-luxe mt-4 divide-y divide-gold-100">
            {verificationQueue.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-4 p-4">
                <SmartImg
                  src={p.images[0]}
                  alt={p.title}
                  className="h-14 w-20 rounded-lg object-cover"
                />
                <div className="min-w-[200px] flex-1">
                  <Link
                    to={`/properties/${p.id}`}
                    className="text-sm font-bold text-ink hover:text-gold-700"
                  >
                    {p.title}
                  </Link>
                  <p className="text-xs text-ink-muted">
                    {p.agency} · {p.area} · listed {p.listedAt}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {p.trustSignals
                    .filter((s) => s.status !== 'pass')
                    .map((s) => (
                      <span
                        key={s.label}
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          s.status === 'fail'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {s.label}
                      </span>
                    ))}
                </div>
                <span
                  className={`font-display text-lg font-bold ${p.trustScore < 60 ? 'text-red-600' : 'text-ink'}`}
                >
                  {p.trustScore}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* agency network */}
        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-ink">Agency network</h2>
          <div className="mt-4 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
            {AGENCIES.map((a) => (
              <div key={a.name} className="card-luxe p-5 text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gold-100 font-display text-sm font-bold text-gold-700">
                  {a.name
                    .split(' ')
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')}
                </span>
                <p className="mt-3 text-sm font-bold text-ink">{a.name}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  ★ {a.rating} · verified {a.verifiedSince}
                </p>
                <p className="mt-2 font-display text-xl font-bold text-gold-600">{a.listings}</p>
                <p className="text-[10px] uppercase tracking-wider text-ink-faint">
                  active listings
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-10 rounded-2xl bg-ink p-8 text-center">
          <p className="font-display text-xl font-bold text-white">
            Want the full investor report on any listing?
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/60">
            Property & location analysis, purchase vs rental potential, yield, expenses, ROI,
            5/10-year projections, risks & strengths, comparable opportunities — with a
            plain-language investment verdict.
          </p>
          <Link to="/ask" className="btn-gold mt-5">
            Ask Keja for an investor report <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
