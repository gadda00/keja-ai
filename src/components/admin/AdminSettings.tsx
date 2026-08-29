/** Admin Settings — platform operating parameters (demo-persisted). */
import { useState } from 'react'
import { Settings2, ShieldCheck, Save, RotateCcw } from 'lucide-react'
import { useSettings, logAudit } from '@/lib/adminStore'
import { useAuth as useAuthCtx } from '@/lib/auth'

export default function AdminSettings() {
  const { user } = useAuthCtx()
  const [settings, setSettings] = useSettings()
  const [saved, setSaved] = useState(false)
  const [threshold, setThreshold] = useState(settings.autoApproveThreshold)
  const [sla, setSla] = useState(settings.listingReviewSLA)
  const [phoneVerify, setPhoneVerify] = useState(settings.requirePhoneVerification)
  const [globalFeeds, setGlobalFeeds] = useState(settings.enableGlobalFeeds)
  const [maintenance, setMaintenance] = useState(settings.maintenanceMode)

  const save = () => {
    setSettings({
      autoApproveThreshold: threshold,
      listingReviewSLA: sla,
      requirePhoneVerification: phoneVerify,
      enableGlobalFeeds: globalFeeds,
      maintenanceMode: maintenance,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
    logAudit({
      actor: user?.name ?? 'admin',
      actorEmail: user?.email ?? '',
      action: 'admin.settings.update',
      target: 'platform',
      detail: `Settings updated — auto-approve ${threshold}%, SLA ${sla}h, phone-verify ${phoneVerify ? 'on' : 'off'}, global feeds ${globalFeeds ? 'on' : 'off'}, maintenance ${maintenance ? 'on' : 'off'}`,
      severity: 'warning',
    })
  }

  const reset = () => {
    setThreshold(95)
    setSla(24)
    setPhoneVerify(false)
    setGlobalFeeds(true)
    setMaintenance(false)
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-6 lg:col-span-2">
        {/* listing review */}
        <section className="card-luxe p-6">
          <h3 className="heading-display flex items-center gap-2 text-lg">
            <Settings2 className="h-5 w-5 text-gold-600" /> Listing review & verification
          </h3>
          <div className="mt-5 flex flex-col gap-6">
            <div>
              <div className="flex items-center justify-between">
                <label className="label-luxe !mb-0">
                  Auto-approve threshold (completeness score)
                </label>
                <span className="font-display text-lg font-bold text-gold-700">{threshold}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={100}
                step={5}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="mt-2 w-full accent-gold-600"
              />
              <p className="mt-1 text-[11px] text-ink-faint">
                Submissions scoring above this with zero red flags are candidates for expedited
                review. Human review is always required for high-stakes approvals (blueprint:
                trust by design).
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="label-luxe !mb-0">Review SLA (hours)</label>
                <span className="font-display text-lg font-bold text-gold-700">{sla}h</span>
              </div>
              <input
                type="range"
                min={1}
                max={72}
                step={1}
                value={sla}
                onChange={(e) => setSla(Number(e.target.value))}
                className="mt-2 w-full accent-gold-600"
              />
              <p className="mt-1 text-[11px] text-ink-faint">
                Partner listings exceeding the SLA escalate automatically.
              </p>
            </div>
            <label className="flex items-center justify-between gap-4 rounded-xl bg-gold-50/60 p-4 ring-1 ring-gold-100">
              <span>
                <span className="block text-sm font-semibold text-ink">
                  Require phone verification for submitters
                </span>
                <span className="mt-0.5 block text-[11px] text-ink-muted">
                  OTP check on new partner accounts before listings go live.
                </span>
              </span>
              <input
                type="checkbox"
                checked={phoneVerify}
                onChange={(e) => setPhoneVerify(e.target.checked)}
                className="h-5 w-5 shrink-0 accent-gold-600"
              />
            </label>
          </div>
        </section>

        {/* global supply */}
        <section className="card-luxe p-6">
          <h3 className="heading-display flex items-center gap-2 text-lg">
            <Settings2 className="h-5 w-5 text-gold-600" /> Global supply network
          </h3>
          <div className="mt-5 flex flex-col gap-4">
            <label className="flex items-center justify-between gap-4 rounded-xl bg-gold-50/60 p-4 ring-1 ring-gold-100">
              <span>
                <span className="block text-sm font-semibold text-ink">
                  Enable global feed ingestion
                </span>
                <span className="mt-0.5 block text-[11px] text-ink-muted">
                  API, CSV, portal-syndication and WhatsApp feeds from partner networks worldwide.
                </span>
              </span>
              <input
                type="checkbox"
                checked={globalFeeds}
                onChange={(e) => setGlobalFeeds(e.target.checked)}
                className="h-5 w-5 shrink-0 accent-gold-600"
              />
            </label>
            <label className="flex items-center justify-between gap-4 rounded-xl bg-red-50/60 p-4 ring-1 ring-red-100">
              <span>
                <span className="block text-sm font-semibold text-red-900">
                  Maintenance mode
                </span>
                <span className="mt-0.5 block text-[11px] text-red-700">
                  Shows a maintenance banner site-wide; blocks new submissions.
                </span>
              </span>
              <input
                type="checkbox"
                checked={maintenance}
                onChange={(e) => setMaintenance(e.target.checked)}
                className="h-5 w-5 shrink-0 accent-red-600"
              />
            </label>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button onClick={save} className="btn-gold !py-2.5 !text-xs">
            <Save className="h-4 w-4" /> {saved ? 'Saved ✓' : 'Save settings'}
          </button>
          <button onClick={reset} className="btn-outline !py-2.5 !text-xs">
            <RotateCcw className="h-4 w-4" /> Reset defaults
          </button>
        </div>
      </div>

      {/* side info */}
      <div className="flex flex-col gap-6">
        <section className="card-luxe p-6">
          <h3 className="heading-display flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-gold-600" /> Security posture
          </h3>
          <ul className="mt-4 flex flex-col gap-3 text-xs text-ink-soft">
            {[
              ['Role-based access control', 'admin / agent / user scopes enforced'],
              ['Session management', 'auto-expiring, sliding refresh, device-aware'],
              ['Audit trail', 'all critical actions recorded, exportable'],
              ['Data provenance', 'every listing carries source & timestamp'],
              ['Anomaly detection', 'duplicate, price & completeness screening'],
              ['High-stakes human review', 'final approvals always human'],
            ].map(([t, d]) => (
              <li key={t} className="flex items-start gap-2.5">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
                <span>
                  <strong className="text-ink">{t}</strong>
                  <span className="block text-ink-muted">{d}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card-luxe bg-ink p-6 text-white">
          <p className="eyebrow !text-gold-300">Phase-2 backend</p>
          <p className="mt-1 text-xs leading-relaxed text-white/70">
            This console runs on client-side persistence for the static MVP. The Phase-2 migration
            maps every collection to an API table: users → auth service, submissions → moderation
            queue, feeds → ingestion workers, audit → append-only log with hash chaining.
          </p>
        </section>
      </div>
    </div>
  )
}
