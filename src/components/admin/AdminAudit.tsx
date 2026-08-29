/** Admin Audit Trail — every platform action, filterable, per blueprint Ch.14. */
import { useState } from 'react'
import { FileClock, Search, ShieldAlert, Info, TriangleAlert } from 'lucide-react'
import { useAuditLog } from '@/lib/adminStore'

const SEVERITY_META = {
  info: { icon: Info, tone: 'text-green-600', chip: 'bg-green-100 text-green-700' },
  warning: { icon: TriangleAlert, tone: 'text-amber-600', chip: 'bg-amber-100 text-amber-800' },
  critical: { icon: ShieldAlert, tone: 'text-red-600', chip: 'bg-red-100 text-red-700' },
} as const

export default function AdminAudit() {
  const [audit] = useAuditLog()
  const [query, setQuery] = useState('')
  const [severity, setSeverity] = useState<'all' | 'info' | 'warning' | 'critical'>('all')

  const filtered = audit.filter((a) => {
    const q = query.trim().toLowerCase()
    const matchQ =
      !q ||
      a.actor.toLowerCase().includes(q) ||
      a.action.toLowerCase().includes(q) ||
      a.target.toLowerCase().includes(q) ||
      a.detail.toLowerCase().includes(q)
    const matchSev = severity === 'all' || a.severity === severity
    return matchQ && matchSev
  })

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            className="input-luxe !pl-10"
            placeholder="Search actor, action or target…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'info', 'warning', 'critical'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition ${
                severity === s
                  ? 'bg-gold-gradient text-white shadow-gold-sm'
                  : 'bg-gold-50 text-gold-700 ring-1 ring-gold-100 hover:bg-gold-100'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="card-luxe overflow-hidden">
        {filtered.length ? (
          <ul className="divide-y divide-gold-100">
            {filtered.map((a) => {
              const meta = SEVERITY_META[a.severity]
              return (
                <li key={a.id} className="flex items-start gap-4 px-5 py-4 transition hover:bg-gold-50/40">
                  <meta.icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.tone}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-relaxed text-ink-soft">
                      <strong className="text-ink">{a.actor}</strong>
                      <span className="mx-1.5 rounded bg-ink/5 px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
                        {a.action}
                      </span>
                      {a.detail}
                    </p>
                    <p className="mt-1 text-[11px] text-ink-faint">
                      target: {a.target} ·{' '}
                      {new Date(a.ts).toLocaleString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.chip}`}
                  >
                    {a.severity}
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <FileClock className="h-8 w-8 text-gold-300" />
            <p className="text-sm text-ink-muted">
              No audit entries match. Actions across the platform appear here in real time.
            </p>
          </div>
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-ink-faint">
        Auditability of critical workflows is a core KEJA security principle: authentication events,
        listing decisions, user role changes, partner approvals and feed operations are all
        recorded with actor, target and timestamp. In production this trail is immutable and
        exportable for due diligence (investor data room, blueprint Ch.19).
      </p>
    </div>
  )
}
