import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  MapPin, BedDouble, Bath, Ruler, Heart, Share2, ShieldCheck, ShieldAlert, CheckCircle2,
  AlertTriangle, Phone, Building2, TrendingUp, Calendar, Eye, Bot, FileText, ChevronLeft,
  ArrowRight, Clock, Award, Gauge,
} from 'lucide-react'
import { areaInsights } from '@/data/properties'
import { formatKES, timeAgo } from '@/lib/format'
import { analyzeInvestment, estimateMonthlyExpenses, calculateMortgage } from '@/lib/finance'
import { investmentScore, scoreTone } from '@/lib/investmentScore'
import { useAllProperties, findProperty } from '@/lib/inventory'
import TrustBadge from '@/components/property/TrustBadge'
import PropertyCard from '@/components/property/PropertyCard'
import { useStore, KEYS } from '@/lib/store'
import { whatsappLink } from '@/config'

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>()
  const allProperties = useAllProperties()
  const property = findProperty(allProperties, id ?? '')
  const score = useMemo(() => (property ? investmentScore(property) : null), [property])
  const [activeImg, setActiveImg] = useState(0)
  const [showAllSignals, setShowAllSignals] = useState(false)
  const [viewingOpen, setViewingOpen] = useState(false)
  const [favorites, setFavorites] = useStore<string[]>(KEYS.favorites, [])
  const [viewed, setViewed] = useStore<string[]>(KEYS.viewed, [])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [reference, setReference] = useState('')
  const [mortgageDeposit, setMortgageDeposit] = useState(20)

  useEffect(() => {
    setActiveImg(0)
    setViewingOpen(false)
    setSubmitted(false)
    if (property && !viewed.includes(property.id)) {
      setViewed([...viewed.slice(-7), property.id])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const investment = useMemo(() => {
    if (!property?.rentEstimate) return null
    return analyzeInvestment({
      price: property.price,
      furnishingCost: property.type === 'apartment' ? Math.round(property.price * 0.04) : 0,
      monthlyRent: property.rentEstimate,
      occupancyPct: 85,
      monthlyExpenses: estimateMonthlyExpenses(property.price, property.rentEstimate, property.sizeSqm),
      appreciationPct: property.appreciationForecast ?? 7,
      rentGrowthPct: 5,
    })
  }, [property])

  const mortgage = useMemo(() => {
    if (!property || property.price < 500000) return null
    return calculateMortgage({
      propertyPrice: property.price,
      depositPct: mortgageDeposit,
      annualRatePct: 13.5,
      termYears: 15,
    })
  }, [property, mortgageDeposit])

  if (!property) {
    return (
      <div className="container-luxe flex flex-col items-center py-24 text-center">
        <p className="font-display text-2xl font-bold text-ink">Property not found</p>
        <Link to="/properties" className="btn-gold mt-6">
          Back to marketplace
        </Link>
      </div>
    )
  }

  const isFav = favorites.includes(property.id)
  const similar = allProperties.filter(
    (p) => p.id !== property.id && (p.type === property.type || p.area === property.area) && p.trustScore >= 75,
  ).slice(0, 3)
  const flagged = property.trustScore < 60
  const insight = areaInsights[property.area]

  return (
    <div className="bg-white">
      {/* warning banner for flagged */}
      {flagged && (
        <div className="bg-red-600 px-4 py-3 text-center text-sm font-semibold text-white">
          ⚠ This listing is FLAGGED by the Keja Trust Layer. Do not send any money. See verification panel below for details.
        </div>
      )}

      <div className="container-luxe py-8">
        <Link to="/properties" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-gold-700">
          <ChevronLeft className="h-4 w-4" /> Back to marketplace
        </Link>

        {/* title row */}
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <TrustBadge score={property.trustScore} />
              {property.offPlan && <span className="chip">Off-Plan · {property.completionDate}</span>}
              {property.furnished && <span className="chip">Furnished</span>}
              {property.availability === 'reserved' && (
                <span className="rounded-full bg-ink px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gold-300">
                  Reserved
                </span>
              )}
            </div>
            <h1 className="heading-display mt-3 max-w-2xl text-2xl font-bold sm:text-4xl">{property.title}</h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-muted">
              <MapPin className="h-4 w-4 text-gold-600" />
              {property.area}, {property.county} · Listed {timeAgo(property.listedAt)} · {property.views} views
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl font-bold text-ink sm:text-4xl">
              {formatKES(property.price, { monthly: property.price < 500000 })}
            </p>
            {property.paymentPlan && <p className="mt-1 text-xs font-medium text-gold-700">{property.paymentPlan}</p>}
          </div>
        </div>

        {/* gallery */}
        <div className="mt-6 grid gap-3 grid-cols-1 lg:grid-cols-[2fr_1fr]">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative overflow-hidden rounded-2xl">
            <img src={property.images[activeImg]} alt={property.title} className="h-[300px] w-full object-cover sm:h-[460px]" />
            <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-ink">
              {activeImg + 1} / {property.images.length}
            </div>
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button
                onClick={() => setFavorites(isFav ? favorites.filter((f) => f !== property.id) : [...favorites, property.id])}
                className={`rounded-full p-3 shadow-md transition ${isFav ? 'bg-gold-500 text-white' : 'bg-white/95 text-ink hover:text-gold-600'}`}
                aria-label="Save"
              >
                <Heart className="h-5 w-5" fill={isFav ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={() => navigator.clipboard?.writeText(window.location.href)}
                className="rounded-full bg-white/95 p-3 text-ink shadow-md transition hover:text-gold-600"
                aria-label="Share"
              >
                <Share2 className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
            {property.images.slice(0, 3).map((img, i) => (
              <button
                key={img + i}
                onClick={() => setActiveImg(i)}
                className={`overflow-hidden rounded-xl ring-2 transition ${activeImg === i ? 'ring-gold-500' : 'ring-transparent hover:ring-gold-200'}`}
              >
                <img src={img} alt="" className="h-24 w-full object-cover sm:h-[145px]" loading="lazy" />
              </button>
            ))}
          </div>
        </div>

        {/* main grid */}
        <div className="mt-10 grid gap-10 grid-cols-1 lg:grid-cols-[1.7fr_1fr]">
          {/* left column */}
          <div>
            {/* specs */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: BedDouble, label: 'Bedrooms', value: property.bedrooms ?? '—' },
                { icon: Bath, label: 'Bathrooms', value: property.bathrooms ?? '—' },
                { icon: Ruler, label: 'Size', value: `${property.sizeSqm.toLocaleString()} sqm` },
                { icon: Building2, label: 'Agency', value: property.agency.split(' ')[0] },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-cream p-4 text-center">
                  <s.icon className="mx-auto h-5 w-5 text-gold-600" />
                  <p className="mt-2 text-sm font-bold text-ink">{s.value}</p>
                  <p className="text-[11px] uppercase tracking-wider text-ink-faint">{s.label}</p>
                </div>
              ))}
            </div>

            {/* description */}
            <section className="mt-8">
              <h2 className="font-display text-xl font-bold text-ink">About this property</h2>
              <p className="mt-3 leading-relaxed text-ink-soft">{property.description}</p>
            </section>

            {/* highlights */}
            <section className="mt-8">
              <h2 className="font-display text-xl font-bold text-ink">Why it stands out</h2>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {property.highlights.map((h) => (
                  <div key={h} className="flex items-start gap-2.5 rounded-xl bg-gold-50 px-4 py-3 text-sm text-ink-soft">
                    <Award className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                    {h}
                  </div>
                ))}
              </div>
            </section>

            {/* amenities */}
            <section className="mt-8">
              <h2 className="font-display text-xl font-bold text-ink">Amenities & features</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {property.amenities.map((a) => (
                  <span key={a} className="inline-flex items-center gap-1.5 rounded-full border border-gold-200 bg-white px-3.5 py-1.5 text-xs font-medium text-ink-soft">
                    <CheckCircle2 className="h-3.5 w-3.5 text-gold-600" />
                    {a}
                  </span>
                ))}
              </div>
            </section>

            {/* verification panel — the trust layer showcase */}
            <section className="mt-10 rounded-2xl border border-gold-200 bg-gradient-to-b from-gold-50/80 to-white p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
                  {flagged ? <ShieldAlert className="h-5 w-5 text-red-600" /> : <ShieldCheck className="h-5 w-5 text-gold-600" />}
                  Keja Verification Report
                </h2>
                <span className={`font-display text-3xl font-bold ${flagged ? 'text-red-600' : 'text-gold-600'}`}>
                  {property.trustScore}
                  <span className="text-base text-ink-faint">/100</span>
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {(showAllSignals ? property.trustSignals : property.trustSignals.slice(0, 3)).map((s) => (
                  <div key={s.label} className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gold-100">
                    {s.status === 'pass' && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />}
                    {s.status === 'warn' && <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />}
                    {s.status === 'fail' && <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />}
                    <div>
                      <p className="text-sm font-semibold text-ink">{s.label}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{s.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              {property.trustSignals.length > 3 && (
                <button
                  onClick={() => setShowAllSignals(!showAllSignals)}
                  className="mt-3 text-sm font-semibold text-gold-700 hover:text-gold-600"
                >
                  {showAllSignals ? 'Show less' : `Show all ${property.trustSignals.length} checks`}
                </button>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-gold-100 pt-4 text-xs text-ink-muted">
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-gold-600" />
                  Title: {property.verification.titleCheck === 'verified' ? 'Verified' : property.verification.titleCheck}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-gold-600" />
                  Ardhisasa: {property.verification.ardhisasaMatch ? 'Matched' : 'Not matched'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-gold-600" />
                  Last checked {property.verification.lastChecked}
                </span>
              </div>

              <p className="mt-4 text-[11px] leading-relaxed text-ink-faint">
                FACT: checks above reflect documented verification runs. Trust scores weigh title status (35%), photo
                authenticity (20%), duplicate scan (15%), pricing analysis (15%) and agent history (15%).
                <Link to="/trust" className="ml-1 font-semibold text-gold-700">How scoring works →</Link>
              </p>
            </section>

            {/* KEJA Investment Score™ */}
            {score && (
            <section className="mt-10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
                  <Gauge className="h-5 w-5 text-gold-600" />
                  KEJA Investment Score™
                </h2>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${scoreTone(score.overall).chip}`}>
                  {score.overall.toFixed(1)} / 10 · {score.band}
                </span>
              </div>
              <p className="mt-2 max-w-3xl text-xs leading-relaxed text-ink-muted">
                A transparent multi-factor framework — rental potential, capital appreciation,
                location, demand, price/value, liquidity and risk. Scores are decision-support
                tools, not guarantees; each factor declares whether it rests on verified facts,
                estimates or assumptions.
              </p>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {score.factors.map((f) => {
                  const tone = scoreTone(f.score)
                  return (
                    <div key={f.key} className="card-luxe p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-ink">{f.label}</p>
                        <span className={`rounded-md px-2 py-0.5 font-display text-sm font-bold ${tone.chip}`}>
                          {f.score.toFixed(1)}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gold-50">
                        <div
                          className={`h-full rounded-full ${tone.bar}`}
                          style={{ width: `${f.score * 10}%` }}
                        />
                      </div>
                      <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-muted">
                        <span
                          className={`mt-px shrink-0 rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide ${
                            f.basis === 'FACT'
                              ? 'bg-green-100 text-green-700'
                              : f.basis === 'ESTIMATE'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-ink/10 text-ink-muted'
                          }`}
                        >
                          {f.basis}
                        </span>
                        {f.note}
                      </p>
                    </div>
                  )
                })}
              </div>
            </section>
            )}

            {/* investment snapshot */}
            {investment && (
              <section className="mt-10">
                <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
                  <TrendingUp className="h-5 w-5 text-gold-600" />
                  Investment snapshot
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">Estimates</span>
                </h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Est. monthly rent', value: formatKES(property.rentEstimate!, { monthly: true }) },
                    { label: 'Gross yield', value: `${investment.grossYield.toFixed(1)}%` },
                    { label: 'Net yield', value: `${investment.netYield.toFixed(1)}%` },
                    { label: 'Payback period', value: `${investment.paybackYears.toFixed(1)} yrs` },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-ink p-4 text-center">
                      <p className="font-display text-lg font-bold text-gold-300">{s.value}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-white/50">{s.label}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-ink-faint">
                  Assumptions: 85% occupancy, furnishing 4% of price (new builds), expenses incl. service charge, 8%
                  management fee, insurance & land rates. Full model on the{' '}
                  <Link to="/invest" className="font-semibold text-gold-700">investment calculator →</Link>
                </p>
              </section>
            )}

            {/* mortgage */}
            {mortgage && (
              <section className="mt-10 rounded-2xl bg-cream p-6">
                <h2 className="font-display text-xl font-bold text-ink">Mortgage estimate</h2>
                <div className="mt-4 grid gap-4 grid-cols-1 sm:grid-cols-[200px_1fr] sm:items-center">
                  <div>
                    <label className="label-luxe">Deposit: {mortgageDeposit}% ({formatKES(mortgage.deposit)})</label>
                    <input
                      type="range"
                      min={10}
                      max={50}
                      step={5}
                      value={mortgageDeposit}
                      onChange={(e) => setMortgageDeposit(parseInt(e.target.value))}
                      className="w-full accent-gold-600"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="font-display text-lg font-bold text-ink">{formatKES(mortgage.monthlyRepayment, { monthly: true })}</p>
                      <p className="text-[10px] uppercase tracking-wider text-ink-faint">Monthly @ 13.5%</p>
                    </div>
                    <div>
                      <p className="font-display text-lg font-bold text-ink">{formatKES(mortgage.principal, { compact: true })}</p>
                      <p className="text-[10px] uppercase tracking-wider text-ink-faint">Loan (15 yrs)</p>
                    </div>
                    <div>
                      <p className="font-display text-lg font-bold text-ink">{formatKES(mortgage.totalInterest, { compact: true })}</p>
                      <p className="text-[10px] uppercase tracking-wider text-ink-faint">Total interest</p>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-xs text-ink-faint">Indicative only — connect with KCB, Stanbic, Absa, NCBA or I&M for current rates.</p>
              </section>
            )}
          </div>

          {/* right column — sticky agent card */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="card-luxe p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-gradient font-display text-lg font-bold text-white">
                  {property.agent.name.charAt(0)}
                </span>
                <div>
                  <p className="font-semibold text-ink">{property.agent.name}</p>
                  <p className="text-xs text-ink-muted">{property.agency}</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-gold-50 p-3 text-xs leading-relaxed text-ink-soft">
                <b>Keja note:</b> this agency is part of our verified network. Viewings can be escrow-protected via
                M-Pesa — viewing fees are only released after the viewing is confirmed.
              </div>

              <button onClick={() => setViewingOpen(true)} className="btn-gold mt-5 w-full">
                <Calendar className="h-4 w-4" /> Request viewing
              </button>
              <a href={`tel:${property.agent.phone.replace(/\s/g, '')}`} className="btn-outline mt-3 w-full">
                <Phone className="h-4 w-4" /> {property.agent.phone}
              </a>
              <a
                href={whatsappLink(`Hello, I’m interested in ${property.id} — ${property.title} (${property.area}). Is it still available?`)}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                WhatsApp agent
              </a>
              <Link to="/ask" className="btn-dark mt-3 w-full">
                <Bot className="h-4 w-4" /> Ask Keja about this property
              </Link>

              {/* viewing request form */}
              {viewingOpen && (
                <div className="mt-5 rounded-xl border border-gold-200 bg-cream/60 p-4">
                  {submitted ? (
                    <div className="py-4 text-center">
                      <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                      <p className="mt-3 font-semibold text-ink">Viewing request received ✓</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                        {property.agent.name} will confirm your slot. Reference: {reference}.
                        Any viewing fee is held in M-Pesa escrow until the viewing is confirmed.
                      </p>
                    </div>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        setReference(`VD-${property.id}-${Math.floor(Math.random() * 900 + 100)}`)
                        setSubmitted(true)
                      }}
                    >
                      <p className="text-sm font-bold text-ink">Book an escorted viewing</p>
                      <div className="mt-3 space-y-3">
                        <div>
                          <label htmlFor={`vd-name-${property.id}`} className="sr-only">Your name</label>
                          <input id={`vd-name-${property.id}`} value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name" autoComplete="name" className="input-luxe" />
                        </div>
                        <div>
                          <label htmlFor={`vd-phone-${property.id}`} className="sr-only">Phone number</label>
                          <input id={`vd-phone-${property.id}`} value={phone} onChange={(e) => setPhone(e.target.value)} required type="tel" placeholder="Phone (e.g. +254 7XX XXX XXX)" autoComplete="tel" className="input-luxe" />
                        </div>
                        <div>
                          <label htmlFor={`vd-date-${property.id}`} className="sr-only">Preferred date</label>
                          <input id={`vd-date-${property.id}`} type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} required className="input-luxe" />
                        </div>
                        <button type="submit" className="btn-gold w-full !py-2.5">Confirm request</button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* area insight */}
            {insight && (
              <div className="card-luxe mt-5 p-5">
                <p className="eyebrow">Area insight — {property.area}</p>
                <div className="mt-3 space-y-2 text-sm">
                  <p className="flex justify-between gap-3">
                    <span className="text-ink-muted">Market pricing</span>
                    <b className="text-ink">{insight.avgPricePerSqm}</b>
                  </p>
                  <p className="flex justify-between gap-3">
                    <span className="text-ink-muted">Typical yield</span>
                    <b className="text-ink">{insight.yield}</b>
                  </p>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-ink-muted">{insight.note}</p>
              </div>
            )}
          </div>
        </div>

        {/* similar */}
        <section className="mt-16">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-ink">Similar verified properties</h2>
            <Link to="/properties" className="inline-flex items-center gap-1 text-sm font-semibold text-gold-700">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
