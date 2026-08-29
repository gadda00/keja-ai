/**
 * Admin Listings — the verification queue from blueprint Ch.8 (Trust by
 * Design): anomaly flags, completeness scores, approve/reject workflow and
 * promotion of approved submissions into the live marketplace.
 */
import { useMemo, useState } from 'react'
import {
  Check,
  X,
  Flag,
  AlertTriangle,
  ShieldCheck,
  Eye,
  ExternalLink,
  ImageOff,
  FileText,
  Copy,
  Gauge,
  Clock,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import {
  useSubmissions,
  ListingSubmission,
  submissionToListing,
  useUserListings,
  useSettings,
} from '@/lib/adminStore'
import { logAudit } from '@/lib/adminStore'
import { store } from '@/lib/store'

const FLAG_META: Record<string, { label: string; icon: typeof AlertTriangle; tone: string }> = {
  'suspicious-price': { label: 'Suspicious price', icon: AlertTriangle, tone: 'bg-red-100 text-red-700 ring-red-200' },
  'duplicate-suspected': { label: 'Duplicate suspected', icon: Copy, tone: 'bg-red-100 text-red-700 ring-red-200' },
  'off-platform-contact': { label: 'Off-platform contact', icon: AlertTriangle, tone: 'bg-amber-100 text-amber-800 ring-amber-200' },
  'thin-description': { label: 'Thin description', icon: FileText, tone: 'bg-amber-100 text-amber-800 ring-amber-200' },
  'no-images': { label: 'No images', icon: ImageOff, tone: 'bg-amber-100 text-amber-800 ring-amber-200' },
  'short-title': { label: 'Short title', icon: FileText, tone: 'bg-amber-100 text-amber-800 ring-amber-200' },
  'shouty-title': { label: 'Shouty title', icon: FileText, tone: 'bg-amber-100 text-amber-800 ring-amber-200' },
  'currency-mismatch': { label: 'Currency mismatch', icon: AlertTriangle, tone: 'bg-amber-100 text-amber-800 ring-amber-200' },
  'price-outlier-high': { label: 'Price outlier (high)', icon: AlertTriangle, tone: 'bg-amber-100 text-amber-800 ring-amber-200' },
}

type Filter = 'pending' | 'approved' | 'rejected' | 'flagged' | 'all'

export default function AdminListings() {
  const { user } = useAuth()
  const [submissions, setSubmissions] = useSubmissions()
  const [userListings, setUserListings] = useUserListings()
  const [settings] = useSettings()
  const [filter, setFilter] = useState<Filter>('pending')
  const [selected, setSelected] = useState<ListingSubmission | null>(null)
  const [note, setNote] = useState('')

  const counts = useMemo(
    () => ({
      pending: submissions.filter((s) => s.status === 'pending').length,
      approved: submissions.filter((s) => s.status === 'approved').length,
      rejected: submissions.filter((s) => s.status === 'rejected').length,
      flagged: submissions.filter((s) => s.status === 'flagged').length,
      all: submissions.length,
    }),
    [submissions],
  )

  const list = submissions.filter((s) => filter === 'all' || s.status === filter)

  const review = (s: ListingSubmission, status: 'approved' | 'rejected' | 'flagged') => {
    const next = submissions.map((x) =>
      x.id === s.id
        ? {
            ...x,
            status,
            reviewedAt: new Date().toISOString(),
            reviewedBy: user?.name ?? 'admin',
            reviewNote: note || x.reviewNote,
          }
        : x,
    )
    setSubmissions(next)
    if (status === 'approved') {
      const listing = submissionToListing(s)
      setUserListings([listing, ...userListings])
    }
    logAudit({
      actor: user?.name ?? 'admin',
      actorEmail: user?.email ?? '',
      action: `listing.${status}`,
      target: s.title,
      detail:
        status === 'approved'
          ? `Approved & published to marketplace — completeness ${s.completeness}%${
              s.flags.length ? ` (flags: ${s.flags.join(', ')})` : ''
            }`
          : status === 'rejected'
            ? `Rejected — ${note || 'did not meet listing standards'}`
            : `Flagged — ${s.flags.join(', ')}`,
      severity: status === 'rejected' ? 'warning' : status === 'flagged' ? 'critical' : 'info',
    })
    setSelected(null)
    setNote('')
  }

  return (
    <div className="flex flex-col gap-5">
      {/* filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {(['pending', 'flagged', 'approved', 'rejected', 'all'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition ${
              filter === f
                ? 'bg-gold-gradient text-white shadow-gold-sm'
                : 'bg-gold-50 text-gold-700 ring-1 ring-gold-100 hover:bg-gold-100'
            }`}
          >
            {f} <span className="opacity-70">({counts[f]})</span>
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-ink-faint">
          <Gauge className="h-3.5 w-3.5" /> Auto-approve threshold: {settings.autoApproveThreshold}%
        </span>
      </div>

      {/* queue */}
      <div className="grid grid-cols-1 gap-4">
        {list.map((s) => (
          <div
            key={s.id}
            className={`card-luxe p-5 transition ${
              s.status === 'flagged' ? 'ring-2 ring-red-200' : ''
            }`}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-base font-bold text-ink">{s.title}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      s.status === 'pending'
                        ? 'bg-sky-100 text-sky-700'
                        : s.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : s.status === 'flagged'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-ink/10 text-ink-muted'
                    }`}
                  >
                    {s.status}
                  </span>
                  <span className="rounded-full bg-gold-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-700 ring-1 ring-gold-100">
                    {s.source}
                  </span>
                </div>

                <p className="mt-1 text-xs text-ink-muted">
                  {s.area}, {s.county} · {s.type} · {s.sizeSqm} sqm
                  {s.bedrooms ? ` · ${s.bedrooms}BR` : ''} · KES{' '}
                  {(s.price / 1000).toLocaleString()}k · by{' '}
                  <strong className="text-ink-soft">
                    {s.submitterName}
                    {s.agency ? ` (${s.agency})` : ''}
                  </strong>{' '}
                  · {new Date(s.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>

                {/* completeness + flags */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-28 overflow-hidden rounded-full bg-gold-50 ring-1 ring-gold-100">
                      <div
                        className={`h-full rounded-full ${
                          s.completeness >= 80
                            ? 'bg-green-500'
                            : s.completeness >= 50
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                        }`}
                        style={{ width: `${s.completeness}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-ink-soft">
                      {s.completeness}% complete
                    </span>
                  </div>
                  {s.flags.map((f) => {
                    const meta = FLAG_META[f] ?? {
                      label: f,
                      icon: AlertTriangle,
                      tone: 'bg-amber-100 text-amber-800 ring-amber-200',
                    }
                    return (
                      <span
                        key={f}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${meta.tone}`}
                      >
                        <meta.icon className="h-3 w-3" /> {meta.label}
                      </span>
                    )
                  })}
                  {s.flags.length === 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 ring-1 ring-green-200">
                      <ShieldCheck className="h-3 w-3" /> clean
                    </span>
                  )}
                </div>

                {s.reviewNote && (
                  <p className="mt-2 rounded-lg bg-gold-50 px-3 py-2 text-[11px] text-ink-muted ring-1 ring-gold-100">
                    <Clock className="mr-1 inline h-3 w-3" />
                    Reviewer note ({s.reviewedBy}): {s.reviewNote}
                  </p>
                )}
              </div>

              {/* actions */}
              <div className="flex shrink-0 gap-2 lg:flex-col">
                <button
                  onClick={() => {
                    setSelected(s)
                    setNote('')
                  }}
                  className="btn-outline !px-3 !py-2 !text-xs"
                >
                  <Eye className="h-3.5 w-3.5" /> Review
                </button>
                {s.status !== 'approved' && (
                  <button
                    onClick={() => review(s, 'approved')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-green-700"
                  >
                    <Check className="h-3.5 w-3.5" /> Approve
                  </button>
                )}
                {s.status !== 'flagged' && s.flags.length > 0 && (
                  <button
                    onClick={() => review(s, 'flagged')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-700"
                  >
                    <Flag className="h-3.5 w-3.5" /> Flag
                  </button>
                )}
                {s.status === 'pending' && (
                  <button
                    onClick={() => review(s, 'rejected')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
                  >
                    <X className="h-3.5 w-3.5" /> Reject
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <div className="card-luxe flex flex-col items-center gap-2 py-14 text-center">
            <ShieldCheck className="h-8 w-8 text-green-400" />
            <p className="text-sm font-medium text-ink">Queue clear — nothing {filter}.</p>
            <p className="text-xs text-ink-muted">
              New submissions arrive from the listing wizard, partners and global feeds.
            </p>
          </div>
        )}
      </div>

      {/* published listings count */}
      <div className="flex items-center justify-between rounded-xl bg-ink px-5 py-3.5 text-white">
        <span className="flex items-center gap-2 text-xs font-medium text-white/80">
          <ExternalLink className="h-4 w-4 text-gold-400" />
          {userListings.length} partner/user listing{userListings.length === 1 ? '' : 's'} live on
          the marketplace
        </span>
        <span className="text-[11px] text-white/50">
          Approved submissions publish instantly · {settings.listingReviewSLA}h review SLA
        </span>
      </div>

      {/* review drawer/modal */}
      {selected && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          />
          <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-gold-200">
            <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-gold-100 bg-white/95 px-6 py-4 backdrop-blur">
              <div>
                <p className="eyebrow">Listing review · {selected.id}</p>
                <h3 className="font-display text-lg font-bold">{selected.title}</h3>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 text-ink-muted hover:bg-gold-50"
                aria-label="Close review"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-5 px-6 py-5">
              {selected.images.length > 0 && (
                <img
                  src={selected.images[0]}
                  alt=""
                  className="h-44 w-full rounded-xl object-cover ring-1 ring-gold-100"
                  loading="lazy"
                />
              )}
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                {[
                  { label: 'Price', value: `KES ${(selected.price / 1_000_000).toFixed(1)}M` },
                  { label: 'Size', value: `${selected.sizeSqm} sqm` },
                  { label: 'Bedrooms', value: selected.bedrooms ? String(selected.bedrooms) : '—' },
                  { label: 'Completeness', value: `${selected.completeness}%` },
                ].map((m) => (
                  <div key={m.label} className="rounded-xl bg-gold-50 p-3 ring-1 ring-gold-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                      {m.label}
                    </p>
                    <p className="font-display text-base font-bold text-ink">{m.value}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="label-luxe">Description</p>
                <p className="mt-1 rounded-xl bg-gold-50/60 p-3 text-sm leading-relaxed text-ink-soft ring-1 ring-gold-100">
                  {selected.description || '— no description provided —'}
                </p>
              </div>
              <div>
                <p className="label-luxe">Submitter</p>
                <p className="text-sm text-ink-soft">
                  {selected.submitterName} · {selected.submitterEmail}
                  {selected.submitterPhone ? ` · ${selected.submitterPhone}` : ''}
                  {selected.agency ? ` · ${selected.agency}` : ''}
                </p>
              </div>
              <div>
                <p className="label-luxe">Trust-by-design checks</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {selected.flags.length ? (
                    selected.flags.map((f) => (
                      <span
                        key={f}
                        className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200"
                      >
                        {FLAG_META[f]?.label ?? f}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-semibold text-green-700 ring-1 ring-green-200">
                      All checks passed
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className="label-luxe" htmlFor="review-note">
                  Review note (recorded in audit trail)
                </label>
                <textarea
                  id="review-note"
                  className="input-luxe min-h-20"
                  placeholder="e.g. Title verified against Ardhisasa; comparables check out."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={() => review(selected, 'approved')}
                  className="flex-1 rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
                >
                  Approve & publish to marketplace
                </button>
                <button
                  onClick={() => review(selected, 'rejected')}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
