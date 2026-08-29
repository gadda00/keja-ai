/** Admin Overview — KPIs, health, funnel, recent audit activity. */
import { Link } from 'react-router-dom'
import {
  Users,
  Building2,
  Flame,
  Handshake,
  FileClock,
  TrendingUp,
  ArrowUpRight,
  AlertTriangle,
  ShieldCheck,
  Globe2,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useSubmissions, usePartners, useFeeds, useAuditLog } from '@/lib/adminStore'
import { useStore, KEYS, Lead } from '@/lib/store'
import { useTokenize } from '@/lib/tokenizeStore'

export default function AdminOverview({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { users } = useAuth()
  const [submissions] = useSubmissions()
  const [partners] = usePartners()
  const [feeds] = useFeeds()
  const [audit] = useAuditLog()
  const [leads] = useStore<Lead[]>(KEYS.leads, [])
  const tokenize = useTokenize()
  const kycVerified = tokenize.investor ? 1 : 0
  const waitlistCount = tokenize.waitlist.length

  const pending = submissions.filter((s) => s.status === 'pending')
  const flagged = submissions.filter((s) => s.status === 'flagged')
  const hot = leads.filter((l) => l.temperature === 'HOT')
  const warm = leads.filter((l) => l.temperature === 'WARM')
  const cold = leads.filter((l) => l.temperature === 'COLD')
  const pendingPartners = partners.filter((p) => p.status === 'pending')
  const healthyFeeds = feeds.filter((f) => f.status === 'healthy').length

  const kpis = [
    { label: 'Registered users', value: (users.length * 47 + 113).toLocaleString(), sub: `${users.length} in this demo`, icon: Users, trend: '+12% this week' },
    { label: 'Listings under review', value: String(pending.length), sub: `${flagged.length} flagged · SLA 24h`, icon: Building2, trend: 'needs attention', warn: pending.length > 2 },
    { label: 'HOT leads', value: String(hot.length), sub: `${warm.length} WARM · ${cold.length} COLD`, icon: Flame, trend: 'route to sales now' },
    { label: 'Tokenize waitlist', value: String(waitlistCount + 38), sub: `${kycVerified} KYC record${kycVerified === 1 ? '' : 's'} in demo`, icon: TrendingUp, trend: '+4 this week' },
  ]

  return (
    <div className="flex flex-col gap-8">
      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="card-luxe p-5">
            <div className="flex items-start justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-50 ring-1 ring-gold-100">
                <k.icon className="h-5 w-5 text-gold-700" />
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  k.warn ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                }`}
              >
                {k.trend}
              </span>
            </div>
            <p className="mt-3 font-display text-3xl font-bold text-ink">{k.value}</p>
            <p className="text-xs font-semibold text-ink-soft">{k.label}</p>
            <p className="mt-1 text-[11px] text-ink-faint">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* funnel */}
        <div className="card-luxe p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="heading-display text-lg">Lead-to-transaction funnel</h3>
            <button
              onClick={() => onNavigate('leads')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gold-700 hover:underline"
            >
              Open CRM <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-5 flex flex-col gap-3">
            {[
              { label: 'HOT — budget confirmed, ready to buy', count: hot.length, width: Math.max(hot.length / Math.max(leads.length, 1) * 100, 12), color: 'bg-red-500' },
              { label: 'WARM — comparing options', count: warm.length, width: Math.max(warm.length / Math.max(leads.length, 1) * 100, 12), color: 'bg-amber-500' },
              { label: 'COLD — researching', count: cold.length, width: Math.max(cold.length / Math.max(leads.length, 1) * 100, 12), color: 'bg-sky-500' },
            ].map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-ink-soft">{row.label}</span>
                  <span className="font-bold text-ink">{row.count}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-gold-50 ring-1 ring-gold-100">
                  <div
                    className={`h-full rounded-full ${row.color} transition-all duration-700`}
                    style={{ width: `${row.width}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Viewing conversion', value: '34%' },
              { label: 'Avg. response time', value: '11 min' },
              { label: 'Qualified-lead rate', value: '61%' },
              { label: 'CAC (blended)', value: 'KES 1.8k' },
            ].map((m) => (
              <div key={m.label} className="rounded-xl bg-gold-50/70 p-3 ring-1 ring-gold-100">
                <p className="font-display text-lg font-bold text-ink">{m.value}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                  {m.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* supply health */}
        <div className="card-luxe p-6">
          <div className="flex items-center justify-between">
            <h3 className="heading-display text-lg">Supply network</h3>
            <button
              onClick={() => onNavigate('partners')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gold-700 hover:underline"
            >
              Manage <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-ink-soft">
                <Globe2 className="h-4 w-4 text-gold-600" /> Feed connections
              </span>
              <span className="font-bold text-ink">
                {healthyFeeds}/{feeds.length} healthy
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-ink-soft">
                <Handshake className="h-4 w-4 text-gold-600" /> Partner applications
              </span>
              <span className="font-bold text-ink">{pendingPartners.length} pending</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-ink-soft">
                <ShieldCheck className="h-4 w-4 text-gold-600" /> Duplicates blocked
              </span>
              <span className="font-bold text-ink">
                {feeds.reduce((a, f) => a + f.duplicatesBlocked, 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-ink-soft">
                <Building2 className="h-4 w-4 text-gold-600" /> Listings imported (30d)
              </span>
              <span className="font-bold text-ink">
                {feeds.reduce((a, f) => a + f.listingsImported, 0)}
              </span>
            </div>
          </div>
          {flagged.length > 0 && (
            <button
              onClick={() => onNavigate('listings')}
              className="mt-5 flex w-full items-center gap-2 rounded-xl bg-amber-50 p-3 text-left ring-1 ring-amber-200 transition hover:bg-amber-100"
            >
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
              <span className="text-xs leading-snug text-amber-900">
                <strong>{flagged.length} flagged listing{flagged.length > 1 ? 's' : ''}</strong> —
                trust-by-design anomaly detection caught suspicious patterns. Review now.
              </span>
            </button>
          )}
        </div>
      </div>

      {/* audit preview */}
      <div className="card-luxe p-6">
        <div className="flex items-center justify-between">
          <h3 className="heading-display flex items-center gap-2 text-lg">
            <FileClock className="h-5 w-5 text-gold-600" /> Recent platform activity
          </h3>
          <button
            onClick={() => onNavigate('audit')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-gold-700 hover:underline"
          >
            Full audit trail <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
        {audit.length ? (
          <ul className="mt-4 divide-y divide-gold-100">
            {audit.slice(0, 6).map((a) => (
              <li key={a.id} className="flex items-start gap-3 py-2.5">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    a.severity === 'critical'
                      ? 'bg-red-500'
                      : a.severity === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-green-500'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-relaxed text-ink-soft">
                    <strong className="text-ink">{a.actor}</strong> — {a.detail}
                  </p>
                  <p className="mt-0.5 text-[10px] text-ink-faint">
                    {a.action} · {new Date(a.ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-ink-muted">
            No activity yet — actions across the platform are recorded here automatically.
          </p>
        )}
      </div>
    </div>
  )
}
