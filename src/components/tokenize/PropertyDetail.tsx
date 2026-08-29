/**
 * Keja Tokenize — property detail: investment case, structure & compliance,
 * distribution history and the sticky investment calculator.
 */
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft, MapPin, ShieldCheck, Scale, FileText, CalendarClock, Landmark, Percent,
  CheckCircle2, Copy, BellRing, Info, TrendingUp,
} from 'lucide-react'
import { useTokenize } from '@/lib/tokenizeStore'
import { fundedPct, tokensAvailable, yieldPct } from '@/data/tokenize'
import type { TokenizedProperty } from '@/data/tokenize'
import { StatusBadge, TypeIcon, propertyTypeLabel, useToast, fmtNum, fmtUsd, fmtDate, img } from './shared'

export function PropertyDetail({ property }: { property: TokenizedProperty }) {
  const { setView, openInvest, investor, openKyc, joinWaitlist, waitlist } = useTokenize()
  const { toast } = useToast()
  const [tokens, setTokens] = useState<number | null>(null)

  const p = property
  const maxBuy = Math.max(p.minTokens, Math.min(tokensAvailable(p), 2000))
  const buyAmount = Math.min(Math.max(tokens ?? Math.min(p.minTokens * 5, maxBuy), p.minTokens), Math.max(maxBuy, p.minTokens))

  const incomePerToken = p.totalTokens > 0 ? p.annualNetIncomeUsd / p.totalTokens : 0
  const annualIncome = buyAmount * incomePerToken
  const cost = buyAmount * p.tokenPriceUsd
  const year5 = cost * Math.pow(1 + p.appreciationPct / 100, 5)
  const income5yr = annualIncome * 5

  const soldOut = tokensAvailable(p) <= 0
  const canBuy = (p.status === 'FUNDING' || p.status === 'LIVE') && !soldOut
  const upcoming = p.status === 'UPCOMING'
  const onWaitlist = waitlist.includes(p.id)

  const quickTokens = useMemo(
    () => [p.minTokens, 100, 500, 1000].map((t) => Math.max(p.minTokens, Math.min(t, maxBuy))),
    [p.minTokens, maxBuy]
  )

  return (
    <div className="bg-cream">
      <div className="container-luxe py-8 lg:py-12">
        <button
          onClick={() => setView('marketplace')}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gold-700 transition-all hover:gap-2.5"
        >
          <ArrowLeft className="h-4 w-4" /> Back to marketplace
        </button>

        <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1fr_380px]">
          {/* ─── left column ─── */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-2xl border border-gold-200 shadow-gold-md"
            >
              <img src={img(p.imageUrl)} alt={p.title} className="h-[280px] w-full object-cover sm:h-[380px]" />
              <div className="absolute inset-x-4 top-4 flex items-start justify-between">
                <StatusBadge status={p.status} />
                <span className="rounded-full bg-ink/85 px-3 py-1 text-[11px] font-bold text-emerald-300 backdrop-blur">
                  {yieldPct(p).toFixed(1)}% net yield
                </span>
              </div>
            </motion.div>

            <div className="mt-6">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-gold-600">
                <TypeIcon type={p.propertyType} className="h-3.5 w-3.5" />
                {propertyTypeLabel(p.propertyType)} · {p.tokenSymbol} · {p.city.toUpperCase()}, {p.country.toUpperCase()}
              </div>
              <h1 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">{p.title}</h1>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-muted">
                <MapPin className="h-4 w-4 text-gold-600" /> {p.location}, {p.city} · {p.tagline}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Property value', value: fmtUsd(p.totalValueUsd) },
                  { label: 'Token price', value: `$${p.tokenPriceUsd}` },
                  { label: 'Net yield', value: `${yieldPct(p).toFixed(1)}%` },
                  { label: 'Distributions', value: p.distributionFreq === 'MONTHLY' ? 'Monthly' : 'Quarterly' },
                ].map((m) => (
                  <div key={m.label} className="rounded-xl border border-gold-100 bg-white p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gold-700">{m.label}</p>
                    <p className="mt-1 text-lg font-bold text-ink">{m.value}</p>
                  </div>
                ))}
              </div>

              <h2 className="mt-8 text-lg font-bold text-ink">The investment case</h2>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">{p.description}</p>

              <ul className="mt-5 space-y-2.5">
                {p.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[14px] text-ink-soft">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                    {h}
                  </li>
                ))}
              </ul>

              <h2 className="mt-8 text-lg font-bold text-ink">Structure & compliance</h2>
              <div className="mt-3 grid gap-3 grid-cols-1 sm:grid-cols-2">
                <div className="rounded-xl border border-gold-100 bg-white p-4">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                    <Scale className="h-4 w-4 text-gold-600" /> Legal structure
                  </div>
                  <p className="mt-2 text-[13px] text-ink-muted">{p.legalStructure}</p>
                  <p className="mt-1 text-[12px] text-gold-700">Jurisdiction: {p.jurisdiction}</p>
                </div>
                <div className="rounded-xl border border-gold-100 bg-white p-4">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                    <ShieldCheck className="h-4 w-4 text-gold-600" /> Verification
                  </div>
                  <p className="mt-2 text-[13px] text-ink-muted">
                    Title searched &amp; verified on Ardhisasa Land Registry.
                  </p>
                  <p className="mt-1 text-[12px] text-gold-700">
                    Occupancy {p.occupancyPct}% · Mgmt fee {p.managementFeePct}%
                  </p>
                </div>
                <div className="rounded-xl border border-gold-100 bg-white p-4">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                    <Landmark className="h-4 w-4 text-gold-600" /> Token contract
                  </div>
                  <button
                    className="mt-2 flex items-center gap-1.5 font-mono text-[12px] text-gold-700 hover:text-ink"
                    onClick={() => {
                      navigator.clipboard?.writeText(p.contractAddress)
                      toast({ title: 'Contract address copied' })
                    }}
                  >
                    {p.contractAddress.slice(0, 18)}…{p.contractAddress.slice(-6)}
                    <Copy className="h-3 w-3" />
                  </button>
                  <p className="mt-1 text-[12px] text-gold-700">Keja Ledger — Regulated Simulation</p>
                </div>
                <div className="rounded-xl border border-gold-100 bg-white p-4">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                    <FileText className="h-4 w-4 text-gold-600" /> Offering documents
                  </div>
                  <p className="mt-2 text-[13px] text-ink-muted">SPA · Independent valuation · Lease schedules</p>
                  <p className="mt-1 text-[12px] text-gold-700">Available to KYC-verified investors</p>
                </div>
              </div>

              {p.distributions.length > 0 && (
                <>
                  <h2 className="mt-8 text-lg font-bold text-ink">Distribution history</h2>
                  <div className="mt-3 overflow-hidden rounded-xl border border-gold-100 bg-white">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="border-b border-gold-100 bg-cream text-left text-[11px] font-bold uppercase tracking-wider text-gold-700">
                          <th className="px-4 py-2.5">Period</th>
                          <th className="px-4 py-2.5">Paid</th>
                          <th className="px-4 py-2.5 text-right">Per token</th>
                          <th className="px-4 py-2.5 text-right">Total pool</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.distributions.map((d) => (
                          <tr key={d.id} className="border-b border-gold-50 last:border-0">
                            <td className="px-4 py-2.5 font-semibold text-ink">{d.periodLabel}</td>
                            <td className="px-4 py-2.5 text-ink-muted">{fmtDate(d.payDate)}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-ink">${d.perTokenUsd.toFixed(4)}</td>
                            <td className="px-4 py-2.5 text-right text-ink-muted">{fmtUsd(d.amountUsd)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ─── right sticky: invest card ─── */}
          <motion.aside initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-2xl border border-gold-200 bg-white shadow-gold-md">
              <div className="bg-gold-gradient px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide2 text-white/80">Investment calculator</p>
                    <p className="font-display text-xl font-bold text-white">{p.tokenSymbol}</p>
                  </div>
                  <Percent className="h-8 w-8 text-white/70" />
                </div>
              </div>

              <div className="p-5">
                {canBuy && (
                  <>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-semibold text-ink">{fmtNum(buyAmount)} tokens</span>
                      <span className="text-ink-muted">max {fmtNum(Math.min(maxBuy, tokensAvailable(p)))}</span>
                    </div>
                    <input
                      type="range"
                      min={p.minTokens}
                      max={Math.max(maxBuy, p.minTokens + 1)}
                      step={Math.max(1, Math.round(p.minTokens / 2))}
                      value={buyAmount}
                      onChange={(e) => setTokens(parseInt(e.target.value, 10))}
                      aria-label="Number of tokens to buy"
                      className="mt-3 w-full accent-gold-600"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      {quickTokens.map((t) => (
                        <button
                          key={t}
                          onClick={() => setTokens(t)}
                          className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                            buyAmount === t
                              ? 'border-gold-600 bg-gold-50 text-gold-700'
                              : 'border-gold-100 text-ink-muted hover:border-gold-300'
                          }`}
                        >
                          {fmtNum(t)} tokens
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {!canBuy && !upcoming && (
                  <div className="rounded-xl border border-gold-200 bg-gold-50 p-3.5 text-[12.5px] leading-relaxed text-gold-700">
                    <strong>Fully funded.</strong> All {fmtNum(p.totalTokens)} tokens are held by
                    investors and the asset is income-paying. Explore assets currently in the funding
                    phase — secondary trading is on the Keja roadmap.
                  </div>
                )}

                <div className="mt-5 space-y-3 rounded-xl bg-cream p-4">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-ink-muted">Total cost</span>
                    <span className="font-bold text-ink">{fmtUsd(cost)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-ink-muted">Projected annual income</span>
                    <span className="font-bold text-emerald-700">{fmtUsd(annualIncome, 2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-ink-muted">Per {p.distributionFreq === 'MONTHLY' ? 'month' : 'quarter'}</span>
                    <span className="font-semibold text-ink">
                      {fmtUsd(p.distributionFreq === 'MONTHLY' ? annualIncome / 12 : annualIncome / 4, 2)}
                    </span>
                  </div>
                  <div className="border-t border-gold-100 pt-3">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-ink-muted">5-yr value @ {p.appreciationPct}% p.a.</span>
                      <span className="font-semibold text-ink">{fmtUsd(year5)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[13px]">
                      <span className="text-ink-muted">5-yr cumulative income</span>
                      <span className="font-semibold text-ink">{fmtUsd(income5yr)}</span>
                    </div>
                  </div>
                </div>

                {upcoming ? (
                  <button
                    className="mt-5 h-12 w-full rounded-lg border border-gold-300 bg-white text-[14px] font-semibold text-gold-700 transition hover:bg-gold-50"
                    onClick={() => {
                      joinWaitlist(p.id)
                      toast({
                        title: onWaitlist ? 'Already on the waitlist' : 'Added to waitlist',
                        description: `You will be notified when ${p.tokenSymbol} opens for funding.`,
                      })
                    }}
                  >
                    <BellRing className="mr-2 inline h-4 w-4" /> {onWaitlist ? 'You are on the waitlist' : 'Join waitlist'}
                  </button>
                ) : !canBuy ? (
                  <button
                    disabled
                    className="mt-5 h-12 w-full cursor-not-allowed rounded-lg bg-ink-muted text-[14px] font-semibold text-white"
                  >
                    Fully funded — secondary trading coming soon
                  </button>
                ) : (
                  <button
                    className="btn-gold mt-5 !h-12 w-full !text-[14px]"
                    onClick={() => {
                      if (!investor) {
                        openInvest(p.id)
                        openKyc('invest')
                      } else {
                        openInvest(p.id)
                      }
                    }}
                  >
                    Invest {fmtUsd(cost)} in {p.tokenSymbol}
                  </button>
                )}

                <div className="mt-4 flex items-start gap-2 rounded-lg bg-gold-50 p-3 text-[11.5px] leading-relaxed text-gold-700">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Projections are illustrative, not guaranteed. Minimum {fmtNum(p.minTokens)} tokens
                  ({fmtUsd(p.minTokens * p.tokenPriceUsd)}). Tokens represent economic rights in the SPV,
                  subject to the offering documents.
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-gold-100 bg-white p-5">
              <div className="flex items-center gap-2 text-[13px] font-bold text-ink">
                <TrendingUp className="h-4 w-4 text-gold-600" /> Funding progress
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-gold-100">
                <div
                  className="h-full rounded-full bg-gold-gradient"
                  style={{ width: `${Math.max(fundedPct(p), 2)}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[12px] text-ink-muted">
                <span>
                  <strong className="text-ink">{fundedPct(p)}%</strong> funded
                </span>
                <span>
                  {fmtNum(tokensAvailable(p))} of {fmtNum(p.totalTokens)} tokens left
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[12px] text-ink-muted">
                <CalendarClock className="h-3.5 w-3.5 text-gold-600" />
                {p.status === 'LIVE'
                  ? 'Income-paying — distributions on schedule'
                  : p.status === 'FUNDING'
                    ? `First distribution projected Q1 2027 (${p.distributionFreq.toLowerCase()})`
                    : 'Offering opens Q4 2026'}
              </div>
            </div>
          </motion.aside>
        </div>
      </div>
    </div>
  )
}
