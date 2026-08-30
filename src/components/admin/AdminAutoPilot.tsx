/**
 * Admin Console — Auto-Pilot tab.
 *
 * Live window into the AI automatic listing pipeline: run history, feed
 * health, quality routing (publish/review/reject), and the current
 * auto-ingested inventory. The pipeline itself runs as code on a schedule
 * (see scripts/auto-listings + .github/workflows/auto-listings.yml).
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, Activity, CheckCircle2, AlertTriangle, XCircle, Clock, Database, Cpu, ChevronDown } from 'lucide-react'
import { AUTO_LISTINGS, AUTO_PENDING, AUTO_RUNS, autoPilotStats } from '@/lib/autoListings'
import { formatKES, timeAgo } from '@/lib/format'
import { isRentalPrice } from '@/lib/finance'

const checkIcon = (status: string) =>
  status === 'pass' ? (
    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
  ) : status === 'warn' ? (
    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
  ) : (
    <XCircle className="h-4 w-4 shrink-0 text-red-600" />
  )

export default function AdminAutoPilot() {
  const stats = autoPilotStats()
  const [expanded, setExpanded] = useState<string | null>(AUTO_LISTINGS[0]?.id ?? null)

  return (
    <div className="space-y-6">
      {/* intro */}
      <div className="card-luxe p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="eyebrow flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5" /> Keja Auto-Pilot — AI listing ingestion
            </p>
            <h2 className="mt-2 font-display text-xl font-bold text-ink">The marketplace grows itself</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Every 6 hours the pipeline ingests new postings from the market scanner and contracted
              partner feeds (JSON · CSV · XML), enriches them with AI-written descriptions and pricing
              intelligence, deduplicates across sources, screens for anomalies, and publishes what
              passes. Fully automated by code — this console is the audit window.
            </p>
          </div>
          <div className="rounded-xl bg-gold-50 px-4 py-3 text-xs leading-relaxed text-ink-soft ring-1 ring-gold-200">
            <b className="text-ink">Trust by design:</b> auto listings are machine-screened only —
            title verification stays <b>PENDING</b> until human review, and trust scores are capped
            below the human-verified band.
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card-luxe p-5">
          <Database className="h-5 w-5 text-gold-600" />
          <p className="mt-2 font-display text-2xl font-bold text-ink">{stats.liveListings}</p>
          <p className="text-[11px] uppercase tracking-wider text-ink-faint">Live auto listings</p>
        </div>
        <div className="card-luxe p-5">
          <Activity className="h-5 w-5 text-gold-600" />
          <p className="mt-2 font-display text-2xl font-bold text-ink">{stats.totalRuns}</p>
          <p className="text-[11px] uppercase tracking-wider text-ink-faint">Pipeline runs logged</p>
        </div>
        <div className="card-luxe p-5">
          <Cpu className="h-5 w-5 text-gold-600" />
          <p className="mt-2 font-display text-2xl font-bold text-ink">{stats.avgQuality}</p>
          <p className="text-[11px] uppercase tracking-wider text-ink-faint">Avg quality score</p>
        </div>
        <div className="card-luxe p-5">
          <Clock className="h-5 w-5 text-gold-600" />
          <p className="mt-2 font-display text-2xl font-bold text-ink">{stats.publishedThisWeek}</p>
          <p className="text-[11px] uppercase tracking-wider text-ink-faint">Published this week</p>
        </div>
      </div>

      {/* feed health + last run */}
      {stats.lastRun && (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <div className="card-luxe p-5">
            <p className="eyebrow">Feed health — last run</p>
            <div className="mt-3 space-y-2.5">
              {(stats.lastRun.feedStatus ?? []).map((f) => (
                <div key={f.feed} className="flex items-center justify-between gap-3 rounded-lg bg-cream px-3 py-2.5 text-xs">
                  <span className="min-w-0">
                    <b className="truncate text-ink">{f.feed}</b>
                    <span className="ml-2 rounded bg-gold-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-gold-700">{f.format}</span>
                  </span>
                  <span className={`shrink-0 font-semibold ${f.state === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>
                    {f.state === 'ok' ? `OK · ${f.items} items` : f.state}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 rounded-lg bg-cream px-3 py-2.5 text-xs">
                <b className="text-ink">market-scanner</b>
                <span className="font-semibold text-emerald-700">OK · {stats.lastRun.sources.scanner} sightings</span>
              </div>
            </div>
          </div>

          <div className="card-luxe p-5">
            <p className="eyebrow">Run log</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gold-100 text-[10px] uppercase tracking-wider text-ink-faint">
                    <th className="py-2 pr-3">Run</th>
                    <th className="py-2 pr-3">Ingested</th>
                    <th className="py-2 pr-3">Published</th>
                    <th className="py-2 pr-3">Review</th>
                    <th className="py-2 pr-3">Rejected</th>
                    <th className="py-2 pr-3">Dupes</th>
                    <th className="py-2">When</th>
                  </tr>
                </thead>
                <tbody>
                  {AUTO_RUNS.slice(0, 6).map((r) => (
                    <tr key={r.id} className="border-b border-gold-50 last:border-0">
                      <td className="py-2.5 pr-3 font-mono text-[10px] text-ink-muted">{r.id}</td>
                      <td className="py-2.5 pr-3 font-semibold text-ink">{r.ingested}</td>
                      <td className="py-2.5 pr-3 font-semibold text-emerald-700">{r.published}</td>
                      <td className="py-2.5 pr-3 font-semibold text-amber-600">{r.queued}</td>
                      <td className="py-2.5 pr-3 font-semibold text-red-600">{r.rejected}</td>
                      <td className="py-2.5 pr-3 text-ink-muted">{r.deduped}</td>
                      <td className="py-2.5 text-ink-muted">{timeAgo(r.startedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* review queue */}
      {AUTO_PENDING.length > 0 && (
        <div className="card-luxe border-l-4 border-l-amber-400 p-5">
          <p className="eyebrow">Review queue — routed here by the quality gate (score 60–79)</p>
          <div className="mt-3 space-y-2">
            {AUTO_PENDING.slice(0, 6).map((l) => (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-cream px-3 py-2.5 text-xs">
                <span className="min-w-0">
                  <b className="text-ink">{l.title}</b>
                  <span className="ml-2 font-mono text-[10px] text-ink-faint">{l.id}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="rounded bg-amber-100 px-2 py-0.5 font-bold text-amber-700">quality {l.auto.qualityScore}</span>
                  <span className="text-ink-faint">{l.auto.source}</span>
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
            In production these route to the human verification desk (Listings tab). Demo build keeps
            them parked here to show the gate working.
          </p>
        </div>
      )}

      {/* live auto inventory */}
      <div className="card-luxe p-5">
        <div className="flex items-center justify-between">
          <p className="eyebrow">Live auto-ingested inventory ({AUTO_LISTINGS.length})</p>
          <p className="text-[11px] text-ink-faint">Newest first · click a row to see its machine screens</p>
        </div>
        <div className="mt-3 space-y-2">
          {AUTO_LISTINGS.slice(0, 12).map((l) => (
            <div key={l.id} className="rounded-xl ring-1 ring-gold-100">
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() => setExpanded(expanded === l.id ? null : l.id)}
                  aria-expanded={expanded === l.id}
                >
                  <ChevronDown className={`h-4 w-4 shrink-0 text-gold-600 transition ${expanded === l.id ? 'rotate-180' : ''}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{l.title}</span>
                    <span className="text-[11px] text-ink-muted">
                      {l.id} · {l.area}, {l.county} · {formatKES(l.price, { monthly: isRentalPrice(l.price) })}
                    </span>
                  </span>
                </button>
                <span className={`hidden shrink-0 rounded px-2 py-0.5 text-[10px] font-bold sm:inline ${l.auto.source.startsWith('feed:') ? 'bg-sky-100 text-sky-700' : 'bg-gold-100 text-gold-700'}`}>
                  {l.auto.source.startsWith('feed:') ? l.auto.source.split(':')[2] : 'SCANNER'}
                </span>
                <span className="shrink-0 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Q{l.auto.qualityScore}</span>
                <Link to={`/properties/${l.id}`} className="shrink-0 text-[11px] font-semibold text-gold-700 hover:text-gold-600">
                  View →
                </Link>
              </div>
              {expanded === l.id && (
                <div className="border-t border-gold-100 bg-cream/50 px-4 py-3">
                  <div className="space-y-2">
                    {l.auto.checks.map((c) => (
                      <div key={c.label} className="flex items-start gap-2.5">
                        {checkIcon(c.status)}
                        <div className="text-xs">
                          <b className="text-ink">{c.label}</b>
                          <span className="text-ink-muted"> — {c.detail}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[10px] text-ink-faint">
                    Enriched by {l.auto.enrichedBy} · price grade: {l.auto.priceGrade} · area yield band {l.auto.areaYieldBand}% ·
                    ingested {timeAgo(l.auto.firstSeenAt)}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
