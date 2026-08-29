/**
 * Partners — the global supply engine: how Keja acquires inventory worldwide
 * (researched best practice: MLS/IDX-style syndication, ListGlobally-style
 * cross-portal networks, agent/developer partnerships, self-service + feeds).
 * Includes the partner application form and the listing-submission wizard.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Globe2,
  Handshake,
  Building2,
  Upload,
  Check,
  ArrowRight,
  Webhook,
  FileSpreadsheet,
  MessageCircle,
  Database,
  ShieldCheck,
  TrendingUp,
  Users,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { usePartners, logAudit } from '@/lib/adminStore'

const CHANNELS = [
  {
    icon: Handshake,
    title: 'Agent & Agency Partnerships',
    tag: 'Supply-first flywheel',
    desc: 'Verified agencies get KEJA PRO free — CRM, HOT/WARM/COLD lead engine and analytics — in exchange for exclusive verified inventory. The more agents who join, the deeper the data moat.',
    metrics: ['45+ agencies onboarded (demo)', 'Free PRO tools', 'Exclusive inventory'],
  },
  {
    icon: Building2,
    title: 'Developer Direct Deals',
    tag: 'Off-plan & new builds',
    desc: 'Developers upload once — Keja structures payment plans, completion tracking and investment analysis, then syndicates everywhere with verified provenance.',
    metrics: ['Off-plan support', 'Payment plans', 'Completion tracking'],
  },
  {
    icon: Upload,
    title: 'Owner & Landlord Self-Service',
    tag: 'Lowest friction',
    desc: 'Free listings through a guided wizard with document checks, WhatsApp capture and QR-code funnels. From listing to marketplace in under 24 hours (SLA).',
    metrics: ['Free forever', '24h review SLA', 'WhatsApp first'],
  },
  {
    icon: Globe2,
    title: 'Cross-Portal Syndication',
    tag: 'Global reach, ListGlobally model',
    desc: 'XML/JSON feed network connecting diaspora corridors (UK, US, UAE) and regional portals. Keja deduplicates and screens every imported listing before it goes live.',
    metrics: ['UK · US · UAE corridors', 'XML/JSON feeds', 'Automatic dedupe'],
  },
  {
    icon: Webhook,
    title: 'API & Data Partnerships',
    tag: 'Institutional supply',
    desc: 'MLS-equivalent data-sharing agreements, bank and insurer inventory integrations, and enterprise API access for institutional partners.',
    metrics: ['REST ingestion API', 'Bank integrations', 'Enterprise SLAs'],
  },
]

const FEED_FORMATS = [
  { icon: Webhook, name: 'REST API', detail: 'JSON · OAuth2 · webhooks on new listings' },
  { icon: FileSpreadsheet, name: 'CSV / XLSX', detail: 'Scheduled drops · Google Drive / S3 / email' },
  { icon: Globe2, name: 'XML Syndication', detail: 'ListHub / ListGlobally-compatible schemas' },
  { icon: MessageCircle, name: 'WhatsApp Bot', detail: 'Send photos + details · auto-structured' },
  { icon: Database, name: 'Manual Upload', detail: 'Guided wizard with anomaly detection' },
]

export default function Partners() {
  const { user, isLoggedIn } = useAuth()
  const [partners, setPartners] = usePartners()
  const [applied, setApplied] = useState(false)
  const [form, setForm] = useState({
    orgName: '',
    contactName: '',
    email: '',
    phone: '',
    type: 'agency',
    market: '',
    listingsCount: '',
    message: '',
  })

  const submitPartner = () => {
    if (!form.orgName.trim() || !form.contactName.trim() || !form.email.trim()) return
    setPartners([
      {
        id: `prt-${Date.now().toString().slice(-5)}`,
        orgName: form.orgName,
        contactName: form.contactName,
        email: form.email,
        phone: form.phone || undefined,
        type: form.type as never,
        market: form.market || 'Kenya',
        listingsCount: Number(form.listingsCount) || 0,
        message: form.message || undefined,
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
      ...partners,
    ])
    setApplied(true)
    logAudit({
      actor: user?.name ?? 'guest',
      actorEmail: user?.email ?? 'guest',
      action: 'partner.apply',
      target: form.orgName,
      detail: `Partner application submitted — ${form.type} (${form.market})`,
      severity: 'info',
    })
  }

  return (
    <div className="container-luxe py-14">
      {/* hero */}
      <div className="mx-auto max-w-3xl text-center">
        <p className="eyebrow">Keja Partner Network</p>
        <h1 className="heading-display mt-2 text-4xl sm:text-5xl">
          Get your listings in front of{' '}
          <span className="gold-text">Africa&apos;s most qualified buyers</span>
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-muted">
          Whether you&apos;re an agency in Nairobi, a developer in Kigali, a landlord in Mombasa or
          a diaspora portal in London — Keja ingests your inventory through five channels, verifies
          it with trust-by-design screening, and distributes it to verified, investment-ready
          demand.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href="#apply" className="btn-gold">
            Become a partner
          </a>
          <Link to="/sell" className="btn-outline">
            List a single property
          </Link>
        </div>
      </div>

      {/* stats strip */}
      <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { icon: Building2, value: '20+', label: 'Live verified listings' },
          { icon: Users, value: '5', label: 'Partner agencies' },
          { icon: Globe2, value: '5', label: 'Feed connections' },
          { icon: TrendingUp, value: '$45.5M', label: 'Tokenized asset value' },
        ].map((s) => (
          <div key={s.label} className="card-luxe p-5 text-center">
            <s.icon className="mx-auto h-5 w-5 text-gold-600" />
            <p className="font-display mt-2 text-2xl font-bold text-ink">{s.value}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* five channels */}
      <section className="mt-20">
        <h2 className="heading-display text-center text-2xl sm:text-3xl">
          Five channels to global inventory
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-ink-muted">
          Researched from the world&apos;s best-performing marketplaces — MLS/IDX syndication,
          ListGlobally-style portal networks and African supply-first strategies — adapted to
          how African real estate actually trades.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {CHANNELS.map((c, i) => (
            <div key={c.title} className="card-luxe card-luxe-hover flex flex-col p-6">
              <div className="flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-gradient shadow-gold-sm">
                  <c.icon className="h-6 w-6 text-white" />
                </span>
                <span className="rounded-full bg-gold-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gold-700 ring-1 ring-gold-100">
                  {c.tag}
                </span>
              </div>
              <h3 className="font-display mt-4 text-lg font-bold text-ink">
                <span className="mr-2 text-gold-400">0{i + 1}</span>
                {c.title}
              </h3>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-ink-muted">{c.desc}</p>
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {c.metrics.map((m) => (
                  <li
                    key={m}
                    className="rounded-full bg-gold-50 px-2.5 py-1 text-[10px] font-semibold text-gold-800 ring-1 ring-gold-100"
                  >
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* trust card */}
          <div className="flex flex-col rounded-2xl bg-ink p-6 text-white shadow-card">
            <ShieldCheck className="h-8 w-8 text-gold-400" />
            <h3 className="font-display mt-3 text-lg font-bold">
              Trust by design — every channel, every listing
            </h3>
            <p className="mt-2 flex-1 text-xs leading-relaxed text-white/70">
              Before any inventory goes live, Keja runs duplicate detection, price-anomaly
              screening, document completeness checks and provenance tracking. Verified inventory
              is the product — not a nice-to-have.
            </p>
            <Link
              to="/trust"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-gold-300 hover:text-gold-200"
            >
              See the Trust Center methodology <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* feed formats */}
      <section className="mt-20">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="heading-display text-2xl sm:text-3xl">Feed formats we speak</h2>
            <p className="mt-2 max-w-xl text-sm text-ink-muted">
              Connect once — Keja&apos;s ingestion workers pull your inventory on schedule, dedupe
              against existing supply, and screen for anomalies automatically.
            </p>
          </div>
          <div className="rounded-xl bg-gold-50 px-4 py-3 ring-1 ring-gold-100">
            <p className="flex items-center gap-2 text-xs font-semibold text-gold-800">
              <Sparkles className="h-4 w-4" /> Developers: POST /api/v1/listings
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-ink-muted">
              {`{ title, area, county, price, bedrooms, sizeSqm, images[], source }`}
            </p>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {FEED_FORMATS.map((f) => (
            <div key={f.name} className="card-luxe card-luxe-hover p-5 text-center">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-gold-50 ring-1 ring-gold-100">
                <f.icon className="h-5 w-5 text-gold-700" />
              </span>
              <h3 className="font-display mt-3 text-sm font-bold text-ink">{f.name}</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">{f.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* apply */}
      <section id="apply" className="mt-20 scroll-mt-24">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Apply</p>
            <h2 className="heading-display mt-1 text-2xl sm:text-3xl">Become a Keja partner</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              Tell us about your business and inventory. Our partnerships team reviews applications
              within 48 hours, then walks you through onboarding: feed connection or bulk upload,
              agent verification, and your KEJA PRO dashboard.
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {[
                'Verified partner badge on all your listings',
                'KEJA PRO free during early access — CRM, leads, analytics',
                'Investment analysis and Keja Investment Scores on your inventory',
                'Diaspora and cross-border buyer exposure',
                'Optional tokenization pathway for eligible assets',
              ].map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-ink-soft">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                  {b}
                </li>
              ))}
            </ul>
            <div className="mt-8 rounded-2xl bg-ink p-5 text-white">
              <p className="text-xs leading-relaxed text-white/70">
                <strong className="text-gold-300">Already applied?</strong> Track your application
                and listing queue in the admin console — partners get a dedicated dashboard in the
                production build.
              </p>
            </div>
          </div>

          <div className="card-luxe p-6 sm:p-8">
            {applied ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <Check className="h-8 w-8 text-green-600" />
                </span>
                <h3 className="font-display text-xl font-bold">Application received</h3>
                <p className="max-w-sm text-sm leading-relaxed text-ink-muted">
                  Thank you — <strong className="text-ink">{form.orgName}</strong> is now in the
                  partner review queue. Our team responds within 48 hours. You can see your
                  application live in the Admin Console → Partners & Feeds.
                </p>
                <div className="flex gap-2">
                  <Link to="/admin" className="btn-gold !py-2.5 !text-xs">
                    View in Admin Console
                  </Link>
                  <button
                    onClick={() => {
                      setApplied(false)
                      setForm({
                        orgName: '',
                        contactName: '',
                        email: '',
                        phone: '',
                        type: 'agency',
                        market: '',
                        listingsCount: '',
                        message: '',
                      })
                    }}
                    className="btn-outline !py-2.5 !text-xs"
                  >
                    Submit another
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  submitPartner()
                }}
                className="flex flex-col gap-4"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label-luxe" htmlFor="p-org">
                      Organisation name *
                    </label>
                    <input
                      id="p-org"
                      className="input-luxe"
                      placeholder="Skyline Agents Kenya"
                      value={form.orgName}
                      onChange={(e) => setForm({ ...form, orgName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="label-luxe" htmlFor="p-contact">
                      Contact person *
                    </label>
                    <input
                      id="p-contact"
                      className="input-luxe"
                      placeholder="Wanjiru Kamau"
                      value={form.contactName}
                      onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label-luxe" htmlFor="p-email">
                      Email *
                    </label>
                    <input
                      id="p-email"
                      type="email"
                      className="input-luxe"
                      placeholder="you@agency.co.ke"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="label-luxe" htmlFor="p-phone">
                      Phone / WhatsApp
                    </label>
                    <input
                      id="p-phone"
                      className="input-luxe"
                      placeholder="+254 7xx xxx xxx"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="label-luxe" htmlFor="p-type">
                      Partner type
                    </label>
                    <select
                      id="p-type"
                      className="input-luxe"
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                    >
                      <option value="agency">Agency</option>
                      <option value="developer">Developer</option>
                      <option value="landlord">Landlord</option>
                      <option value="portal">Portal / syndicator</option>
                      <option value="data-partner">Data partner</option>
                      <option value="diaspora-agent">Diaspora agent</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-luxe" htmlFor="p-market">
                      Market
                    </label>
                    <input
                      id="p-market"
                      className="input-luxe"
                      placeholder="Nairobi / Kigali / UK"
                      value={form.market}
                      onChange={(e) => setForm({ ...form, market: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label-luxe" htmlFor="p-count">
                      ~Listings
                    </label>
                    <input
                      id="p-count"
                      type="number"
                      min={0}
                      className="input-luxe"
                      placeholder="45"
                      value={form.listingsCount}
                      onChange={(e) => setForm({ ...form, listingsCount: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="label-luxe" htmlFor="p-msg">
                    Anything else?
                  </label>
                  <textarea
                    id="p-msg"
                    className="input-luxe min-h-24"
                    placeholder="Tell us about your inventory, feed format or markets…"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </div>
                <button type="submit" className="btn-gold w-full !py-3">
                  Submit application
                </button>
                <p className="text-center text-[11px] text-ink-faint">
                  {isLoggedIn
                    ? `Submitting as ${user?.name}`
                    : 'Tip: sign in first to track your application in your account'}
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
