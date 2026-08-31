import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Flag,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { useState } from 'react';

import type { Property } from '@/data/properties';
import { REPORT_REASONS, reportListing, type ReportReason } from '@/lib/adminStore';
import { track } from '@/lib/analytics';
import {
  evidenceFor,
  FRESHNESS_COPY,
  listingFreshness,
  VERIFICATION_VALIDITY_DAYS,
} from '@/lib/verification';

/**
 * Verification evidence panel — answers "verified, exactly how?".
 *
 * Renders every check with its scope, method, check date, expiry date and
 * freshness state, plus two actions the review demanded: report an issue
 * (feeds the admin adjudication queue) and request human review.
 */

const freshnessTone: Record<string, string> = {
  fresh: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'recheck-due': 'bg-amber-50 text-amber-700 ring-amber-200',
  expired: 'bg-red-50 text-red-700 ring-red-200',
};

export default function EvidencePanel({ property }: { property: Property }) {
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('sold-or-let');
  const [detail, setDetail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [reviewRequested, setReviewRequested] = useState(false);

  const checks = evidenceFor(property);
  const fresh = listingFreshness(property);

  const submitReport = () => {
    reportListing({
      propertyId: property.id,
      propertyTitle: property.title,
      reason,
      detail: detail.trim() || undefined,
    });
    track({ event: 'issue_reported', propertyId: property.id, reason });
    setSubmitted(true);
    setReportOpen(false);
    setDetail('');
    window.setTimeout(() => setSubmitted(false), 6000);
  };

  return (
    <section
      className="mt-10 rounded-2xl border border-gold-200 bg-gradient-to-b from-gold-50/80 to-white p-6"
      aria-label="Verification evidence"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
          <ShieldCheck className="h-5 w-5 text-gold-600" />
          Verification evidence
        </h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ring-inset ${freshnessTone[fresh.state]}`}
        >
          <Clock className="h-3 w-3" />
          {FRESHNESS_COPY[fresh.state]}
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-ink-muted">
        Each check below states its scope, when it ran, and when it expires (evidence older than{' '}
        {VERIFICATION_VALIDITY_DAYS} days is marked stale). Checks in this build run on the demo
        dataset — treat them as a preview of the production evidence format, not a live registry
        search.
      </p>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-gold-200 text-[11px] uppercase tracking-wider text-ink-faint">
              <th className="py-2 pr-3 font-semibold">Check</th>
              <th className="py-2 pr-3 font-semibold">Scope</th>
              <th className="py-2 pr-3 font-semibold">Result</th>
              <th className="py-2 pr-3 font-semibold">Checked</th>
              <th className="py-2 font-semibold">Expires</th>
            </tr>
          </thead>
          <tbody>
            {checks.map((c) => (
              <tr key={c.name} className="border-b border-gold-100 last:border-0 align-top">
                <td className="py-3 pr-3">
                  <span className="flex items-center gap-1.5 font-semibold text-ink">
                    {c.status === 'pass' ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : c.status === 'warn' ? (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                    ) : (
                      <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
                    )}
                    {c.name}
                  </span>
                </td>
                <td className="py-3 pr-3 text-xs leading-relaxed text-ink-muted">{c.scope}</td>
                <td className="py-3 pr-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                      c.status === 'pass'
                        ? 'bg-emerald-50 text-emerald-700'
                        : c.status === 'warn'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {c.status}
                  </span>
                </td>
                <td className="py-3 pr-3 text-xs text-ink-muted">{c.checkedAt}</td>
                <td className="py-3 text-xs text-ink-muted">{c.expiresAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-gold-100 pt-4">
        <button
          onClick={() => {
            setReportOpen(true);
            track({ event: 'evidence_reviewed', propertyId: property.id });
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gold-300 bg-white px-3.5 py-2 text-xs font-semibold text-ink-soft transition hover:border-gold-400 hover:text-ink"
        >
          <Flag className="h-3.5 w-3.5 text-gold-600" />
          Report an issue with this listing
        </button>
        <button
          onClick={() => setReviewRequested(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gold-300 bg-white px-3.5 py-2 text-xs font-semibold text-ink-soft transition hover:border-gold-400 hover:text-ink"
        >
          <UserCheck className="h-3.5 w-3.5 text-gold-600" />
          Request human review
        </button>
        {submitted ? (
          <span
            role="status"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"
          >
            <CheckCircle2 className="h-4 w-4" />
            Report received — it enters the admin adjudication queue.
          </span>
        ) : null}
        {reviewRequested ? (
          <span
            role="status"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"
          >
            <Eye className="h-4 w-4" />
            Request logged. In production this routes to a named reviewer with an SLA; in this demo
            it is recorded in your session.
          </span>
        ) : null}
      </div>

      {reportOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Report an issue"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/60 p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-ink">Report an issue</h3>
                <p className="mt-1 text-xs text-ink-muted">
                  {property.id} · {property.title}
                </p>
              </div>
              <button
                onClick={() => setReportOpen(false)}
                className="rounded-lg p-1.5 text-ink-muted transition hover:bg-gold-50"
                aria-label="Close report dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="report-reason"
                  className="text-xs font-semibold uppercase tracking-wider text-ink-faint"
                >
                  What is wrong?
                </label>
                <select
                  id="report-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value as ReportReason)}
                  className="mt-1.5 w-full rounded-lg border border-gold-200 bg-white px-3 py-2.5 text-sm text-ink focus:border-gold-400 focus:outline-none"
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="report-detail"
                  className="text-xs font-semibold uppercase tracking-wider text-ink-faint"
                >
                  Details (optional)
                </label>
                <textarea
                  id="report-detail"
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Anything that helps us verify faster"
                  className="mt-1.5 w-full rounded-lg border border-gold-200 bg-white px-3 py-2.5 text-sm text-ink focus:border-gold-400 focus:outline-none"
                />
              </div>
              <p className="text-[11px] leading-relaxed text-ink-faint">
                Reports are stored in your browser in this demo — no personal data leaves your
                device. In production they feed a human adjudication queue with a published SLA.
              </p>
              <button onClick={submitReport} className="btn-gold w-full !py-2.5 text-sm">
                Submit report
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
