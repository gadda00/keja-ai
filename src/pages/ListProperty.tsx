import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Home,
  TrendingUp,
  BadgeCheck,
  Camera,
  FileSearch,
  Rocket,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Bot,
  ShieldCheck,
  AlertTriangle,
  Building2,
  BedDouble,
  Ruler,
  MapPin,
  ClipboardCheck,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useSubmissions, runAnomalyDetection, logAudit } from '@/lib/adminStore'

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6 },
}

const STEPS = [
  {
    icon: FileSearch,
    title: 'Submit your property',
    text: 'Share the basics: location, size, asking price, photos, and any existing documents (title, approvals, tenancy schedules for income property). Takes about ten minutes.',
  },
  {
    icon: Camera,
    title: 'Keja verifies it',
    text: 'Title cross-check, photo authenticity, pricing benchmarking against the market band, duplicate scan. We may request an on-site visit for premium or off-plan listings.',
  },
  {
    icon: BadgeCheck,
    title: 'Get the Verified badge',
    text: 'Verified listings earn the badge, rank higher in search, and sell faster at fairer prices — because buyers can see exactly why your listing deserves trust.',
  },
  {
    icon: Rocket,
    title: 'Keja markets it — everywhere',
    text: 'Your property enters the AI recommendation engine: matched to qualified buyers in chat, on WhatsApp, and across every agency channel in the network. You get weekly performance reports.',
  },
]

const WIZARD_STEPS = ['Contact', 'Property', 'Details', 'Review & checks']

type WizardForm = {
  name: string
  email: string
  phone: string
  agency: string
  title: string
  type: string
  purposeBuy: boolean
  purposeRent: boolean
  purposeInvest: boolean
  area: string
  county: string
  price: string
  rentEstimate: string
  bedrooms: string
  bathrooms: string
  sizeSqm: string
  description: string
  amenities: string
  imageCount: number
}

const EMPTY: WizardForm = {
  name: '',
  email: '',
  phone: '',
  agency: '',
  title: '',
  type: 'apartment',
  purposeBuy: true,
  purposeRent: false,
  purposeInvest: false,
  area: '',
  county: 'Nairobi',
  price: '',
  rentEstimate: '',
  bedrooms: '',
  bathrooms: '',
  sizeSqm: '',
  description: '',
  amenities: '',
  imageCount: 0,
}

export default function ListProperty() {
  const { user, requireAuth, isLoggedIn } = useAuth()
  const [submissions, setSubmissions] = useSubmissions()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<WizardForm>(EMPTY)
  const [checksRun, setChecksRun] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submissionId, setSubmissionId] = useState('')

  // prefill from account
  const prefill = () =>
    setForm((f) => ({
      ...f,
      name: f.name || user?.name || '',
      email: f.email || user?.email || '',
      phone: f.phone || user?.phone || '',
      agency: f.agency || user?.company || '',
    }))

  const anomaly = useMemo(
    () =>
      runAnomalyDetection({
        title: form.title,
        area: form.area,
        county: form.county,
        price: Number(form.price) || 0,
        sizeSqm: Number(form.sizeSqm) || 0,
        bedrooms: Number(form.bedrooms) || undefined,
        description: form.description,
        images: Array.from({ length: form.imageCount }),
        amenities: form.amenities
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
      }),
    [form],
  )

  const canNext = () => {
    if (step === 0) return form.name.trim() && form.phone.trim()
    if (step === 1) return form.title.trim() && form.area.trim() && Number(form.price) > 0
    if (step === 2) return Number(form.sizeSqm) > 0
    return true
  }

  const submit = () => {
    const id = `sub-${Math.floor(Math.random() * 9000 + 1000)}`
    const images = form.imageCount > 0 ? ['/images/props/apartment_2.jpg'] : []
    const sub = {
      id,
      submitterName: form.name,
      submitterEmail: form.email || 'no-email@keja.ai',
      submitterPhone: form.phone,
      agency: form.agency || undefined,
      title: form.title,
      type: form.type,
      purpose: [
        form.purposeBuy && 'buy',
        form.purposeRent && 'rent',
        form.purposeInvest && 'invest',
      ].filter(Boolean) as string[],
      area: form.area,
      county: form.county,
      price: Number(form.price),
      rentEstimate: Number(form.rentEstimate) || undefined,
      bedrooms: Number(form.bedrooms) || undefined,
      bathrooms: Number(form.bathrooms) || undefined,
      sizeSqm: Number(form.sizeSqm),
      description: form.description,
      amenities: form.amenities
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
      images,
      source: 'wizard' as const,
      status: 'pending' as const,
      flags: anomaly.flags,
      completeness: anomaly.completeness,
      createdAt: new Date().toISOString(),
    }
    setSubmissions([sub, ...submissions])
    setSubmissionId(id)
    setSubmitted(true)
    logAudit({
      actor: user?.name ?? form.name,
      actorEmail: user?.email ?? form.email,
      action: 'listing.submit',
      target: form.title,
      detail: `New listing submission — completeness ${anomaly.completeness}%${anomaly.flags.length ? `, flags: ${anomaly.flags.join(', ')}` : ''}`,
      severity: 'info',
    })
  }

  const stepContent = (
    <div className="flex flex-col gap-5">
      {step === 0 && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-bold text-ink">Who&apos;s listing?</h3>
            {!isLoggedIn && (
              <button
                type="button"
                onClick={() => requireAuth('Sign in to auto-fill your details', prefill)}
                className="text-xs font-semibold text-gold-700 hover:underline"
              >
                Sign in to auto-fill →
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label-luxe">Your name *</label>
              <input
                className="input-luxe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jane Wanjiku"
              />
            </div>
            <div>
              <label className="label-luxe">Phone / WhatsApp *</label>
              <input
                className="input-luxe"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+254 7XX XXX XXX"
              />
            </div>
            <div>
              <label className="label-luxe">Email</label>
              <input
                type="email"
                className="input-luxe"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="label-luxe">Agency / company</label>
              <input
                className="input-luxe"
                value={form.agency}
                onChange={(e) => setForm({ ...form, agency: e.target.value })}
                placeholder="Optional — e.g. Chacadom Premier"
              />
            </div>
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <h3 className="font-display text-xl font-bold text-ink">The property</h3>
          <div>
            <label className="label-luxe">Listing title *</label>
            <input
              className="input-luxe"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Premium 3BR Apartment with City Views"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label-luxe">Property type</label>
              <select
                className="input-luxe"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="apartment">Apartment</option>
                <option value="villa">Villa</option>
                <option value="townhouse">Townhouse</option>
                <option value="bungalow">Bungalow</option>
                <option value="land">Land</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>
            <div>
              <label className="label-luxe">Area / neighbourhood *</label>
              <input
                className="input-luxe"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                placeholder="e.g. Kilimani"
              />
            </div>
            <div>
              <label className="label-luxe">County</label>
              <select
                className="input-luxe"
                value={form.county}
                onChange={(e) => setForm({ ...form, county: e.target.value })}
              >
                {['Nairobi', 'Kiambu', 'Kajiado', 'Machakos', 'Mombasa', 'Kwale', 'Nakuru', 'Kisumu', 'Nyeri', 'Uasin Gishu', 'Other'].map(
                  (c) => (
                    <option key={c}>{c}</option>
                  ),
                )}
              </select>
            </div>
            <div>
              <label className="label-luxe">Asking price (KES) *</label>
              <input
                type="number"
                className="input-luxe"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="e.g. 12500000"
              />
            </div>
          </div>
          <div>
            <label className="label-luxe">Listing purpose</label>
            <div className="flex flex-wrap gap-2">
              {[
                ['purposeBuy', 'For sale'],
                ['purposeRent', 'For rent'],
                ['purposeInvest', 'Investment-grade'],
              ].map(([key, label]) => {
                const k = key as keyof WizardForm
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setForm({ ...form, [k]: !form[k] } as WizardForm)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                      form[k]
                        ? 'bg-gold-gradient text-white shadow-gold-sm'
                        : 'bg-gold-50 text-gold-700 ring-1 ring-gold-100 hover:bg-gold-100'
                    }`}
                  >
                    {label as string}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h3 className="font-display text-xl font-bold text-ink">Details that build trust</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label-luxe">Bedrooms</label>
              <input
                type="number"
                min={0}
                className="input-luxe"
                value={form.bedrooms}
                onChange={(e) => setForm({ ...form, bedrooms: e.target.value })}
                placeholder="3"
              />
            </div>
            <div>
              <label className="label-luxe">Bathrooms</label>
              <input
                type="number"
                min={0}
                className="input-luxe"
                value={form.bathrooms}
                onChange={(e) => setForm({ ...form, bathrooms: e.target.value })}
                placeholder="2"
              />
            </div>
            <div>
              <label className="label-luxe">Size (sqm) *</label>
              <input
                type="number"
                min={1}
                className="input-luxe"
                value={form.sizeSqm}
                onChange={(e) => setForm({ ...form, sizeSqm: e.target.value })}
                placeholder="145"
              />
            </div>
          </div>
          <div>
            <label className="label-luxe">Monthly rent estimate (KES)</label>
            <input
              type="number"
              className="input-luxe"
              value={form.rentEstimate}
              onChange={(e) => setForm({ ...form, rentEstimate: e.target.value })}
              placeholder="e.g. 110000 — powers the investment analysis"
            />
          </div>
          <div>
            <label className="label-luxe">Description</label>
            <textarea
              className="input-luxe min-h-28"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Finishing, view, amenities nearby, why it's a strong buy…"
            />
            <p className="mt-1 text-[11px] text-ink-faint">
              {form.description.trim().length} characters — detailed descriptions (120+) score
              higher in completeness checks.
            </p>
          </div>
          <div>
            <label className="label-luxe">Amenities (comma-separated)</label>
            <input
              className="input-luxe"
              value={form.amenities}
              onChange={(e) => setForm({ ...form, amenities: e.target.value })}
              placeholder="Balcony, Gym, Pool, 24/7 Security, Borehole"
            />
          </div>
          <div>
            <label className="label-luxe">Photos ready?</label>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4].map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setForm({ ...form, imageCount: n })}
                  className={`flex-1 rounded-xl border px-3 py-3 text-xs font-semibold transition ${
                    form.imageCount === n
                      ? 'border-gold-500 bg-gold-50 text-gold-700'
                      : 'border-gold-100 text-ink-muted hover:bg-gold-50'
                  }`}
                >
                  {n === 0 ? 'None yet' : n === 4 ? '4+' : String(n)}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h3 className="font-display flex items-center gap-2 text-xl font-bold text-ink">
            <ClipboardCheck className="h-5 w-5 text-gold-600" /> Trust-by-design pre-checks
          </h3>
          <p className="text-xs leading-relaxed text-ink-muted">
            Keja runs automatic screening on every submission — duplicates, price anomalies,
            completeness. These same checks run in the admin review queue (24h SLA).
          </p>

          {/* completeness */}
          <div className="card-luxe p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Completeness score</span>
              <span className="font-display text-2xl font-bold text-gold-700">
                {anomaly.completeness}%
              </span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-gold-50 ring-1 ring-gold-100">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  anomaly.completeness >= 80
                    ? 'bg-green-500'
                    : anomaly.completeness >= 50
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${anomaly.completeness}%` }}
              />
            </div>
          </div>

          {/* checks list */}
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {[
              { label: 'Title quality', pass: form.title.trim().length >= 15 },
              { label: 'Description depth', pass: form.description.trim().length >= 120 },
              { label: 'Photo coverage', pass: form.imageCount >= 3 },
              { label: 'Amenities listed', pass: form.amenities.split(',').filter((a) => a.trim()).length >= 4 },
              { label: 'Price vs market band', pass: !anomaly.flags.includes('suspicious-price') },
              { label: 'Duplicate scan', pass: !anomaly.flags.includes('duplicate-suspected') },
              { label: 'Contact pattern', pass: !anomaly.flags.includes('off-platform-contact') },
              { label: 'Size & rooms', pass: Number(form.sizeSqm) > 0 && !!form.bedrooms },
            ].map((c) => (
              <li
                key={c.label}
                className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-medium ring-1 ${
                  c.pass
                    ? 'bg-green-50 text-green-800 ring-green-100'
                    : 'bg-amber-50 text-amber-800 ring-amber-100'
                }`}
              >
                {c.pass ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                )}
                {c.label}
              </li>
            ))}
          </ul>

          {/* summary */}
          <div className="rounded-xl bg-ink p-5 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gold-300">
              Submission summary
            </p>
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-white/75 sm:grid-cols-3">
              <span><strong className="text-white">{form.title || '—'}</strong></span>
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {form.area || '—'}, {form.county}</span>
              <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {form.type}</span>
              <span>KES {Number(form.price || 0).toLocaleString()}</span>
              <span className="flex items-center gap-1"><Ruler className="h-3 w-3" /> {form.sizeSqm || '—'} sqm</span>
              <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" /> {form.bedrooms || '—'} BR</span>
            </div>
          </div>
        </>
      )}
    </div>
  )

  return (
    <div>
      <section className="bg-ink py-20 sm:py-24">
        <div className="container-luxe max-w-3xl text-center">
          <p className="eyebrow !text-gold-400">Sell with Keja</p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
            Verified listings sell <span className="gold-text">faster & fairer</span>
          </h1>
          <p className="mt-6 leading-relaxed text-white/65">
            The Verified by Keja badge tells buyers your property has passed real checks — titles,
            photos, pricing. In a market scarred by fraud, that badge is the strongest marketing you
            can buy. And it can&apos;t be bought; it&apos;s earned.
          </p>
        </div>
      </section>

      {/* steps */}
      <section className="section-pad bg-white">
        <div className="container-luxe grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.title}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.07 }}
              className="card-luxe p-6"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-gradient shadow-gold-sm">
                  <s.icon className="h-5 w-5 text-white" />
                </span>
                <span className="font-display text-3xl font-bold text-gold-200">0{i + 1}</span>
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{s.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* wizard & pricing */}
      <section className="section-pad bg-cream">
        <div className="container-luxe grid gap-10 grid-cols-1 lg:grid-cols-2">
          <motion.div {...fadeUp} className="card-luxe p-6 sm:p-8">
            {submitted ? (
              <div className="py-10 text-center">
                <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
                <h3 className="mt-4 font-display text-2xl font-bold text-ink">
                  Submission received — {submissionId}
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
                  Your listing entered the verification queue with a completeness score of{' '}
                  <strong className="text-ink">{anomaly.completeness}%</strong>. Our team reviews
                  within 24 hours (SLA), then calls you to start the title check. Track it live in
                  the Admin Console → Listings.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Link to="/admin" className="btn-outline !py-2.5 !text-xs">
                    Track in Admin Console
                  </Link>
                  <Link to="/partners" className="btn-gold !py-2.5 !text-xs">
                    Agency? Join the partner network
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* wizard header */}
                <div className="mb-6">
                  <h3 className="font-display text-xl font-bold text-ink">List your property</h3>
                  <p className="mt-1 text-sm text-ink-muted">
                    Four quick steps — verification comes first, always.
                  </p>
                  {/* stepper */}
                  <div className="mt-5 flex items-center gap-1.5">
                    {WIZARD_STEPS.map((s, i) => (
                      <div key={s} className="flex flex-1 flex-col gap-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-500 ${
                            i <= step ? 'bg-gold-gradient' : 'bg-gold-100'
                          }`}
                        />
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wide ${
                            i === step ? 'text-gold-700' : 'text-ink-faint'
                          }`}
                        >
                          {s}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {stepContent}

                {/* nav */}
                <div className="mt-8 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(Math.max(0, step - 1))}
                    disabled={step === 0}
                    className="btn-outline !px-4 !py-2.5 !text-xs disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" /> Back
                  </button>
                  {step < 3 ? (
                    <button
                      type="button"
                      onClick={() => canNext() && setStep(step + 1)}
                      disabled={!canNext()}
                      className="btn-gold !px-6 !py-2.5 !text-xs disabled:opacity-40"
                    >
                      Continue <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={submit}
                      className="btn-gold !px-6 !py-2.5 !text-xs"
                    >
                      <ShieldCheck className="h-4 w-4" /> Submit for verification
                    </button>
                  )}
                </div>
              </>
            )}
          </motion.div>

          <motion.div {...fadeUp}>
            <p className="eyebrow">Transparent pricing</p>
            <h2 className="heading-display mt-3 text-3xl sm:text-4xl">No sale, no fee. Ever.</h2>
            <div className="mt-8 space-y-4">
              {[
                { name: 'Verification & badge', price: 'Free', note: 'Title check, photo scan, pricing benchmark — free for every listing.' },
                { name: 'Standard sale', price: '2.5%', note: 'Paid on completion. Includes AI matching, escorted viewings, escrowed deposits and closing support.' },
                { name: 'Premium / luxury stock', price: 'Custom', note: 'Dedicated marketing, drone media, investor-targeted distribution through Chacadom\u2019s network.' },
                { name: 'Landlords — management', price: '8% of rent', note: 'Tenant sourcing, M-Pesa rent collection, maintenance, monthly owner statements.' },
              ].map((r) => (
                <div key={r.name} className="card-luxe flex items-start justify-between gap-6 p-5">
                  <div>
                    <p className="font-display text-lg font-semibold text-ink">{r.name}</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-muted">{r.note}</p>
                  </div>
                  <p className="shrink-0 font-display text-xl font-bold text-gold-600">{r.price}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-gold-50 p-5">
              <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" />
              <p className="text-sm leading-relaxed text-ink-soft">
                <b>Why verified sells faster:</b> buyers shortlist listings they can trust. On Keja,
                a 90+ trust score puts your property in the AI&apos;s top recommendations to
                qualified buyers — automatically.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* manage teaser */}
      <section className="bg-ink py-16">
        <div className="container-luxe flex flex-col items-center gap-6 text-center lg:flex-row lg:text-left">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gold-gradient shadow-gold-lg">
            <Bot className="h-8 w-8 text-white" />
          </span>
          <div className="flex-1">
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
              Property doesn&apos;t end at the sale
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
              Tenants, rent collection, maintenance, owner statements — Keja&apos;s management desk
              keeps income properties income-producing. M-Pesa-native, Airbnb-capable, boringly
              reliable.
            </p>
          </div>
          <Link to="/manage" className="btn-gold shrink-0">
            Explore management <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
