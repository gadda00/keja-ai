/**
 * Keja Tokenize — Issuer Console: a 6-step guided wizard that takes a property
 * from acquisition details to token issuance (client-side simulation).
 */
import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Building2, Scale, Coins, Banknote, ShieldCheck, ClipboardCheck, ArrowRight, ArrowLeft,
  CheckCircle2, Loader2, Landmark, Sparkles, ExternalLink,
} from 'lucide-react'
import { useTokenize } from '@/lib/tokenizeStore'
import type { IssuerDraft, IssueResult } from '@/lib/tokenizeStore'
import { SectionTitle, useToast, fmtNum, fmtUsd } from './shared'

const STEPS = [
  { id: 1, label: 'Property', icon: Building2, desc: 'Identify & describe the asset' },
  { id: 2, label: 'Legal structure', icon: Scale, desc: 'Wrap the property in an SPV' },
  { id: 3, label: 'Tokenomics', icon: Coins, desc: 'Set value, supply & price' },
  { id: 4, label: 'Income', icon: Banknote, desc: 'Define yield & distributions' },
  { id: 5, label: 'Compliance', icon: ShieldCheck, desc: 'Gate the offering correctly' },
  { id: 6, label: 'Review & issue', icon: ClipboardCheck, desc: 'Mint the tokens' },
] as const

const TYPE_OPTIONS = [
  { v: 'OFFICE', label: 'Office' },
  { v: 'RESIDENTIAL', label: 'Residential' },
  { v: 'RETAIL', label: 'Retail' },
  { v: 'MIXED_USE', label: 'Mixed-Use' },
  { v: 'LOGISTICS', label: 'Logistics' },
] as const

export function IssuerConsole() {
  const { setView, issueProperty, openProperty } = useTokenize()
  const { toast } = useToast()

  const [step, setStep] = useState(1)
  const [issuing, setIssuing] = useState(false)
  const [issued, setIssued] = useState<IssueResult | null>(null)
  const [supply, setSupply] = useState(0)

  const [f, setF] = useState({
    title: '',
    tagline: '',
    propertyType: 'OFFICE' as (typeof TYPE_OPTIONS)[number]['v'],
    location: '',
    city: 'Nairobi',
    description: '',
    highlights: '',
    spvName: '',
    jurisdiction: 'Kenya',
    totalValueUsd: '',
    tokenPriceUsd: '10',
    minTokens: '20',
    annualNetIncomeUsd: '',
    distributionFreq: 'QUARTERLY' as 'MONTHLY' | 'QUARTERLY',
    appreciationPct: '4',
    occupancyPct: '92',
    managementFeePct: '8',
    valuationReport: false,
    titleSearch: false,
    kycGating: false,
    cmaAck: false,
  })

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }))
  const num = (s: string) => parseFloat(s.replace(/,/g, '')) || 0

  const totalTokens = useMemo(() => {
    const price = num(f.tokenPriceUsd)
    return price > 0 ? Math.round(num(f.totalValueUsd) / price) : 0
  }, [f.totalValueUsd, f.tokenPriceUsd])

  const yieldPct = useMemo(() => {
    const v = num(f.totalValueUsd)
    return v > 0 ? (num(f.annualNetIncomeUsd) / v) * 100 : 0
  }, [f.annualNetIncomeUsd, f.totalValueUsd])

  const stepValid = [
    f.title.trim().length >= 4 && f.tagline.trim().length >= 8 && f.location.trim().length >= 3 && f.description.trim().length >= 40,
    f.spvName.trim().length >= 4 && f.jurisdiction.trim().length >= 2,
    num(f.totalValueUsd) >= 100_000 && num(f.tokenPriceUsd) >= 1 && totalTokens >= 1000 && num(f.minTokens) >= 1,
    num(f.annualNetIncomeUsd) > 0 && yieldPct <= 25 && yieldPct > 0,
    f.valuationReport && f.titleSearch && f.kycGating && f.cmaAck,
    true,
  ]

  const suggestedSpv = f.title ? `Keja ${f.title.split(' ')[0]} Holdings Ltd` : ''
  const CurrentStepIcon = STEPS[step - 1].icon

  function issue() {
    setIssuing(true)
    setTimeout(() => {
      try {
        const draft: IssuerDraft = {
          title: f.title.trim(),
          tagline: f.tagline.trim(),
          description: f.description.trim(),
          location: f.location.trim(),
          city: f.city.trim() || 'Nairobi',
          propertyType: f.propertyType,
          totalValueUsd: num(f.totalValueUsd),
          tokenPriceUsd: num(f.tokenPriceUsd),
          minTokens: Math.round(num(f.minTokens)),
          annualNetIncomeUsd: num(f.annualNetIncomeUsd),
          distributionFreq: f.distributionFreq,
          appreciationPct: num(f.appreciationPct),
          occupancyPct: num(f.occupancyPct),
          managementFeePct: num(f.managementFeePct),
          spvName: f.spvName.trim(),
          jurisdiction: f.jurisdiction.trim(),
          highlights: f.highlights.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 6),
        }
        const result = issueProperty(draft)
        setSupply(totalTokens)
        setIssued(result)
        toast({
          title: `${result.property.tokenSymbol} tokens issued`,
          description: 'Your property is now live on the marketplace and open for funding.',
        })
      } catch (e) {
        toast({ title: 'Tokenization failed', description: e instanceof Error ? e.message : 'Please try again.' })
      } finally {
        setIssuing(false)
      }
    }, 2600)
  }

  /* ─── success screen ─── */
  if (issued) {
    return (
      <div className="min-h-screen bg-cream">
        <div className="mx-auto max-w-2xl px-4 py-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="overflow-hidden rounded-3xl border border-gold-200 bg-white shadow-gold-lg"
          >
            <div className="flex items-center gap-3 bg-gold-gradient px-6 py-5">
              <CheckCircle2 className="h-7 w-7 text-white" />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide2 text-white/80">Tokenization complete</p>
                <h2 className="font-display text-2xl font-bold text-white">{issued.property.tokenSymbol} is live</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Token contract', value: `${issued.property.contractAddress.slice(0, 14)}…` },
                  { label: 'Token supply', value: fmtNum(supply) },
                  { label: 'Token price', value: `$${f.tokenPriceUsd}` },
                  { label: 'Net yield', value: `${yieldPct.toFixed(1)}%` },
                  { label: 'Legal wrapper', value: f.spvName },
                  { label: 'Issuance tx block', value: `#${issued.blockNumber.toLocaleString()}` },
                ].map((r) => (
                  <div key={r.label} className="rounded-xl border border-gold-100 bg-cream p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gold-700">{r.label}</p>
                    <p className="mt-1 truncate text-[13px] font-bold text-ink">{r.value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 break-all rounded-xl border border-gold-200 bg-white p-3 font-mono text-[11px] text-gold-700">
                {issued.txHash}
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <button
                  className="btn-outline flex-1"
                  onClick={() => {
                    openProperty(issued.property.id)
                  }}
                >
                  View offering <ExternalLink className="h-4 w-4" />
                </button>
                <button
                  className="btn-gold flex-[2]"
                  onClick={() => {
                    setIssued(null)
                    setStep(1)
                    setView('marketplace')
                  }}
                >
                  Back to marketplace <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  /* ─── wizard ─── */
  return (
    <div className="bg-cream">
      <div className="container-luxe py-10">
        <button
          onClick={() => setView('marketplace')}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gold-700 transition-all hover:gap-2.5"
        >
          <ArrowLeft className="h-4 w-4" /> Back to marketplace
        </button>

        <div className="mt-6">
          <SectionTitle
            eyebrow="Issuer Console"
            title="Tokenize a property"
            sub="Six guided stages — the same model an institutional issuer follows: acquisition, SPV structuring, tokenomics, income, compliance gating and issuance."
          />
        </div>

        {/* stepper */}
        <div className="no-scrollbar mt-8 flex gap-2 overflow-x-auto pb-2">
          {STEPS.map((s) => (
            <button
              key={s.id}
              onClick={() => s.id < step && setStep(s.id)}
              className={`flex shrink-0 items-center gap-2.5 rounded-xl border px-4 py-3 text-left transition ${
                s.id === step
                  ? 'border-gold-600 bg-white shadow-gold-sm'
                  : s.id < step
                    ? 'border-emerald-200 bg-white'
                    : 'border-gold-100 bg-white/60'
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  s.id < step ? 'bg-emerald-100 text-emerald-700' : s.id === step ? 'bg-gold-gradient text-white' : 'bg-gold-100 text-gold-700'
                }`}
              >
                {s.id < step ? <CheckCircle2 className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              </span>
              <span>
                <span className="block whitespace-nowrap text-[12.5px] font-bold text-ink">Step {s.id} · {s.label}</span>
                <span className="hidden whitespace-nowrap text-[11px] text-ink-muted lg:block">{s.desc}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-gold-100 bg-white shadow-card">
          <div className="border-b border-gold-100 bg-cream px-6 py-4">
            <h2 className="flex items-center gap-2 text-[15px] font-bold text-ink">
              <CurrentStepIcon className="h-4 w-4 text-gold-600" />
              {STEPS[step - 1].label}
              <span className="ml-auto text-[12px] font-medium text-ink-muted">{STEPS[step - 1].desc}</span>
            </h2>
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              {/* 1 — property */}
              {step === 1 && (
                <motion.div key="s1" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-4">
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <div>
                      <label className="label-luxe" htmlFor="iss-title">Property title</label>
                      <input id="iss-title" className="input-luxe" placeholder="e.g. Upper Hill Sky Suites" value={f.title} onChange={(e) => set('title', e.target.value)} />
                    </div>
                    <div>
                      <label className="label-luxe" htmlFor="iss-tagline">Tagline</label>
                      <input id="iss-tagline" className="input-luxe" placeholder="One-line hook for investors" value={f.tagline} onChange={(e) => set('tagline', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <div>
                      <label className="label-luxe" htmlFor="iss-location">Location</label>
                      <input id="iss-location" className="input-luxe" placeholder="e.g. Upper Hill Road, Nairobi" value={f.location} onChange={(e) => set('location', e.target.value)} />
                    </div>
                    <div>
                      <label className="label-luxe" htmlFor="iss-city">City</label>
                      <input id="iss-city" className="input-luxe" value={f.city} onChange={(e) => set('city', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <span className="label-luxe">Property type</span>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {TYPE_OPTIONS.map((o) => (
                        <button
                          key={o.v}
                          onClick={() => set('propertyType', o.v)}
                          className={`rounded-lg border px-3.5 py-2 text-[13px] font-semibold transition ${
                            f.propertyType === o.v ? 'border-gold-600 bg-gold-50 text-gold-700' : 'border-gold-100 text-ink-muted hover:border-gold-300'
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label-luxe" htmlFor="iss-desc">Investment case (min 40 characters)</label>
                    <textarea id="iss-desc" rows={4} className="input-luxe" placeholder="Describe the asset, tenants, sub-market dynamics…" value={f.description} onChange={(e) => set('description', e.target.value)} />
                  </div>
                  <div>
                    <label className="label-luxe" htmlFor="iss-highlights">Highlights (one per line)</label>
                    <textarea id="iss-highlights" rows={3} className="input-luxe" placeholder={'Anchor tenant on 10-year lease\nIndependent valuation 2026\nTitle verified on Ardhisasa'} value={f.highlights} onChange={(e) => set('highlights', e.target.value)} />
                  </div>
                </motion.div>
              )}

              {/* 2 — legal */}
              {step === 2 && (
                <motion.div key="s2" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-4">
                  <div className="rounded-xl border border-gold-200 bg-gold-50 p-4 text-[12.5px] leading-relaxed text-gold-700">
                    <Scale className="mr-1.5 inline h-4 w-4" />
                    Each property is ring-fenced in a dedicated Special Purpose Vehicle (SPV). Token
                    holders hold economic rights in the SPV — not the land title itself.
                  </div>
                  <div>
                    <label className="label-luxe" htmlFor="iss-spv">SPV name</label>
                    <input
                      id="iss-spv"
                      className="input-luxe"
                      placeholder="e.g. Keja Upperhill Holdings Ltd"
                      value={f.spvName}
                      onChange={(e) => set('spvName', e.target.value)}
                    />
                    {suggestedSpv && f.spvName !== suggestedSpv && (
                      <button className="mt-1.5 text-[12px] font-medium text-gold-700 underline" onClick={() => set('spvName', suggestedSpv)}>
                        Use suggestion: {suggestedSpv}
                      </button>
                    )}
                  </div>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <div>
                      <label className="label-luxe" htmlFor="iss-jur">Jurisdiction</label>
                      <input id="iss-jur" className="input-luxe" value={f.jurisdiction} onChange={(e) => set('jurisdiction', e.target.value)} />
                    </div>
                    <div>
                      <label className="label-luxe" htmlFor="iss-mgmt">Management fee (%)</label>
                      <input id="iss-mgmt" type="number" min={0} max={20} className="input-luxe" value={f.managementFeePct} onChange={(e) => set('managementFeePct', e.target.value)} />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 3 — tokenomics */}
              {step === 3 && (
                <motion.div key="s3" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-4">
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                    <div>
                      <label className="label-luxe" htmlFor="iss-value">Property value (USD)</label>
                      <input id="iss-value" type="number" min={100000} className="input-luxe" placeholder="5,000,000" value={f.totalValueUsd} onChange={(e) => set('totalValueUsd', e.target.value)} />
                    </div>
                    <div>
                      <label className="label-luxe" htmlFor="iss-price">Token price (USD)</label>
                      <input id="iss-price" type="number" min={1} className="input-luxe" value={f.tokenPriceUsd} onChange={(e) => set('tokenPriceUsd', e.target.value)} />
                    </div>
                    <div>
                      <label className="label-luxe" htmlFor="iss-min">Min tokens per order</label>
                      <input id="iss-min" type="number" min={1} className="input-luxe" value={f.minTokens} onChange={(e) => set('minTokens', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 rounded-xl bg-cream p-4 sm:grid-cols-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gold-700">Token supply</p>
                      <p className="mt-1 text-lg font-bold text-ink">{fmtNum(totalTokens)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gold-700">Entry minimum</p>
                      <p className="mt-1 text-lg font-bold text-ink">{fmtUsd(num(f.minTokens) * num(f.tokenPriceUsd))}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gold-700">Underlying / token</p>
                      <p className="mt-1 text-lg font-bold text-ink">{fmtUsd(num(f.tokenPriceUsd), 0)}</p>
                    </div>
                  </div>
                  <p className="text-[12px] leading-relaxed text-ink-muted">
                    Example: a $10M property at $10 per token becomes 1,000,000 tokens — each a provable,
                    auditable unit of fractional ownership.
                  </p>
                </motion.div>
              )}

              {/* 4 — income */}
              {step === 4 && (
                <motion.div key="s4" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-4">
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <div>
                      <label className="label-luxe" htmlFor="iss-income">Annual net income (USD)</label>
                      <input id="iss-income" type="number" min={1} className="input-luxe" placeholder="350,000" value={f.annualNetIncomeUsd} onChange={(e) => set('annualNetIncomeUsd', e.target.value)} />
                    </div>
                    <div>
                      <label className="label-luxe" htmlFor="iss-freq">Distribution frequency</label>
                      <select id="iss-freq" className="input-luxe" value={f.distributionFreq} onChange={(e) => set('distributionFreq', e.target.value as 'MONTHLY' | 'QUARTERLY')}>
                        <option value="QUARTERLY">Quarterly</option>
                        <option value="MONTHLY">Monthly</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                    <div>
                      <label className="label-luxe" htmlFor="iss-app">Target appreciation % p.a.</label>
                      <input id="iss-app" type="number" step="0.5" className="input-luxe" value={f.appreciationPct} onChange={(e) => set('appreciationPct', e.target.value)} />
                    </div>
                    <div>
                      <label className="label-luxe" htmlFor="iss-occ">Occupancy %</label>
                      <input id="iss-occ" type="number" min={0} max={100} className="input-luxe" value={f.occupancyPct} onChange={(e) => set('occupancyPct', e.target.value)} />
                    </div>
                    <div className="flex flex-col justify-center rounded-xl bg-cream p-3 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gold-700">Net yield</p>
                      <p className={`mt-1 text-lg font-bold ${yieldPct > 25 ? 'text-red-600' : 'text-emerald-700'}`}>
                        {yieldPct.toFixed(1)}%
                      </p>
                      <p className="text-[10px] text-ink-faint">ceiling 25%</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 5 — compliance */}
              {step === 5 && (
                <motion.div key="s5" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-3">
                  <div className="rounded-xl border border-gold-200 bg-gold-50 p-4 text-[12.5px] leading-relaxed text-gold-700">
                    <Landmark className="mr-1.5 inline h-4 w-4" />
                    Kenya's CMA runs a regulatory sandbox in which real estate tokenization platforms are
                    tested. A production offering requires CMA engagement, licensed custody and legal
                    counsel in every relevant jurisdiction.
                  </div>
                  {[
                    { k: 'valuationReport' as const, label: 'An independent valuation report exists for this property (≤ 6 months old).' },
                    { k: 'titleSearch' as const, label: 'A title search has been completed on Ardhisasa and the title is unencumbered.' },
                    { k: 'kycGating' as const, label: 'Only KYC/AML-verified investors will be able to purchase tokens (mandatory).' },
                    { k: 'cmaAck' as const, label: 'I understand regulatory approval (e.g. CMA sandbox) is required before any real-world offering, and this console is a demonstration.' },
                  ].map((c) => (
                    <label key={c.k} className="flex cursor-pointer items-start gap-3 rounded-xl border border-gold-100 p-3.5">
                      <input
                        type="checkbox"
                        className="mt-0.5 accent-gold-600"
                        checked={f[c.k]}
                        onChange={(e) => set(c.k, e.target.checked)}
                      />
                      <span className="text-[12.5px] leading-relaxed text-ink-muted">{c.label}</span>
                    </label>
                  ))}
                </motion.div>
              )}

              {/* 6 — review & issue */}
              {step === 6 && (
                <motion.div key="s6" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                  <div className="grid grid-cols-2 gap-3 rounded-xl border border-gold-100 bg-cream p-4 text-[13px] sm:grid-cols-3">
                    {[
                      { l: 'Asset', v: f.title },
                      { l: 'Type', v: TYPE_OPTIONS.find((t) => t.v === f.propertyType)?.label ?? '—' },
                      { l: 'Location', v: `${f.location}, ${f.city}` },
                      { l: 'SPV', v: f.spvName },
                      { l: 'Value', v: fmtUsd(num(f.totalValueUsd)) },
                      { l: 'Supply', v: `${fmtNum(totalTokens)} tokens` },
                      { l: 'Price / token', v: `$${f.tokenPriceUsd}` },
                      { l: 'Net yield', v: `${yieldPct.toFixed(1)}%` },
                      { l: 'Distributions', v: f.distributionFreq === 'MONTHLY' ? 'Monthly' : 'Quarterly' },
                    ].map((r) => (
                      <div key={r.l}>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gold-700">{r.l}</p>
                        <p className="mt-0.5 truncate font-semibold text-ink">{r.v}</p>
                      </div>
                    ))}
                  </div>
                  {issuing ? (
                    <div className="mt-6 flex flex-col items-center gap-3 py-8">
                      <Loader2 className="h-10 w-10 animate-spin text-gold-600" />
                      <p className="text-[13px] font-semibold text-ink">Minting tokens on the Keja Ledger…</p>
                      <p className="text-[12px] text-ink-muted">Signing issuance transaction · reserving token symbol</p>
                    </div>
                  ) : (
                    <button className="btn-gold mt-6 !h-12 w-full !text-[15px]" onClick={issue}>
                      <Sparkles className="h-4 w-4" /> Issue {fmtNum(totalTokens)} tokens
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* nav */}
            <div className="mt-6 flex gap-2 border-t border-gold-50 pt-5">
              <button className="btn-outline flex-1" disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1))}>
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              {step < 6 && (
                <button className="btn-gold flex-[2]" disabled={!stepValid[step - 1]} onClick={() => setStep((s) => Math.min(6, s + 1))}>
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
            {step < 6 && !stepValid[step - 1] && (
              <p className="mt-2 text-center text-[11.5px] text-ink-faint">
                Complete the required fields above to continue.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
