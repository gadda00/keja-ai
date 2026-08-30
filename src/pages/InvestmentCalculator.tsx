import { usePageMeta } from '@/lib/seo'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'
import { Calculator, TrendingUp, Info, Bot, Globe2 } from 'lucide-react'
import { analyzeInvestment } from '@/lib/finance'
import { formatKES } from '@/lib/format'
import { PROPERTIES } from '@/data/properties'

const PRESETS = PROPERTIES.filter((p) => p.rentEstimate && p.price > 500000).slice(0, 6)

export default function InvestmentCalculator() {
  usePageMeta(
    'Investment Calculator — Yields, Mortgages & Projections',
    'Model rental yields, mortgage payments, expenses and 10-year projections for Kenyan property — in KES or USD.',
  )
  const [price, setPrice] = useState(14500000)
  const [furnishing, setFurnishing] = useState(580000)
  const [rent, setRent] = useState(110000)
  const [occupancy, setOccupancy] = useState(85)
  const [expenses, setExpenses] = useState(32000)
  const [appreciation, setAppreciation] = useState(7.5)
  const [rentGrowth, setRentGrowth] = useState(5)
  const [horizon, setHorizon] = useState<5 | 10>(10)
  const [usdMode, setUsdMode] = useState(false)
  const fx = 129

  const result = useMemo(
    () =>
      analyzeInvestment({
        price,
        furnishingCost: furnishing,
        monthlyRent: rent,
        occupancyPct: occupancy,
        monthlyExpenses: expenses,
        appreciationPct: appreciation,
        rentGrowthPct: rentGrowth,
      }),
    [price, furnishing, rent, occupancy, expenses, appreciation, rentGrowth],
  )

  const money = (v: number, opts?: { monthly?: boolean }) =>
    usdMode
      ? `$${(v / fx / (opts?.monthly ? 1 : 1)).toLocaleString('en-US', { maximumFractionDigits: 0 })}${opts?.monthly ? '/mo' : ''}`
      : formatKES(v, opts)

  const chartData = result[`year${horizon}`].map((p) => ({
    year: `Y${p.year}`,
    value: Math.round(p.propertyValue / 1_000_000),
    net: Math.round(p.cumulativeNet / 1_000_000),
    total: Math.round(p.equityPlusIncome / 1_000_000),
  }))
  const finalPoint = result[`year${horizon}`][result[`year${horizon}`].length - 1]

  const Slider = ({
    label, value, onChange, min, max, step, display, hint,
  }: {
    label: string
    value: number
    onChange: (v: number) => void
    min: number
    max: number
    step: number
    display: string
    hint?: string
  }) => (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="label-luxe !mb-0">{label}</label>
        <span className="text-sm font-bold text-gold-700">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-2 w-full accent-gold-600"
      />
      {hint && <p className="mt-1 text-[11px] text-ink-faint">{hint}</p>}
    </div>
  )

  return (
    <div className="bg-cream/60">
      <div className="container-luxe py-10 sm:py-14">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">Built for diaspora & investor buyers</p>
          <h1 className="heading-display mt-3 text-3xl sm:text-5xl">
            Investment <span className="gold-text">calculator</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">
            The same engine Keja uses in conversation: gross & net yield, payback period, and full 5/10-year
            projections. Every input is yours to question — no black boxes.
          </p>
        </div>

        {/* presets */}
        <div className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Load a real listing:</span>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setPrice(p.price)
                setFurnishing(p.type === 'apartment' ? Math.round(p.price * 0.04) : 0)
                setRent(p.rentEstimate!)
                setAppreciation(p.appreciationForecast ?? 7)
                setExpenses(Math.round((p.sizeSqm * 25 + p.rentEstimate! * 0.08 + (p.price * 0.005) / 12) || 20000))
              }}
              className="rounded-full border border-gold-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gold-700 transition hover:border-gold-400 hover:bg-gold-50"
            >
              {p.area} · {p.id}
            </button>
          ))}
        </div>

        <div className="mx-auto mt-8 grid max-w-6xl gap-8 lg:grid-cols-[1fr_1.2fr]">
          {/* inputs */}
          <div className="card-luxe space-y-6 p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
                <Calculator className="h-5 w-5 text-gold-600" /> Your assumptions
              </h2>
              <button
                onClick={() => setUsdMode(!usdMode)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  usdMode ? 'bg-gold-gradient text-white shadow-gold-sm' : 'bg-gold-50 text-gold-700'
                }`}
              >
                <Globe2 className="h-3.5 w-3.5" />
                {usdMode ? 'USD' : 'KES'}
              </button>
            </div>

            <Slider label="Purchase price" value={price} onChange={setPrice} min={1000000} max={90000000} step={100000}
              display={money(price)} />
            <Slider label="Furnishing cost" value={furnishing} onChange={setFurnishing} min={0} max={5000000} step={50000}
              display={money(furnishing)} hint="Typical 4% of price for new apartments" />
            <Slider label="Monthly rent" value={rent} onChange={setRent} min={10000} max={500000} step={1000}
              display={money(rent, { monthly: true })} />
            <Slider label="Occupancy" value={occupancy} onChange={setOccupancy} min={40} max={100} step={5}
              display={`${occupancy}%`} hint="Nairobi apartments typically run 80–90%" />
            <Slider label="Monthly expenses" value={expenses} onChange={setExpenses} min={0} max={200000} step={1000}
              display={money(expenses, { monthly: true })}
              hint="Service charge + 8% management + insurance + rates" />
            <Slider label="Capital appreciation / yr" value={appreciation} onChange={setAppreciation} min={0} max={15} step={0.5}
              display={`${appreciation}%`} hint="Growth corridors: 9–12%; established suburbs: 6–8%" />
            <Slider label="Rent growth / yr" value={rentGrowth} onChange={setRentGrowth} min={0} max={12} step={0.5}
              display={`${rentGrowth}%`} />

            <div className="rounded-xl bg-gold-50 p-4 text-xs leading-relaxed text-ink-soft">
              <Info className="mb-1 h-4 w-4 text-gold-600" />
              These are <b>your assumptions</b> — Keja shows the math transparently so you can stress-test any deal.
              Presets load real verified listings. Want Keja to fill these in conversationally with market bands?{' '}
              <Link to="/ask" className="font-semibold text-gold-700">Ask Keja →</Link>
            </div>
          </div>

          {/* results */}
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: 'Gross yield', value: `${result.grossYield.toFixed(1)}%`, good: result.grossYield >= 7 },
                { label: 'Net yield', value: `${result.netYield.toFixed(1)}%`, good: result.netYield >= 5 },
                { label: 'Monthly cashflow', value: money(Math.max(result.monthlyCashflow, 0), { monthly: true }), good: result.monthlyCashflow > 0 },
                { label: 'Payback', value: `${result.paybackYears.toFixed(1)} yrs`, good: result.paybackYears < 15 },
              ].map((s) => (
                <div key={s.label} className={`rounded-2xl p-4 text-center shadow-card ring-1 ${s.good ? 'bg-ink ring-gold-600/40' : 'bg-white ring-gold-100'}`}>
                  <p className={`font-display text-xl font-bold sm:text-2xl ${s.good ? 'text-gold-300' : 'text-ink'}`}>{s.value}</p>
                  <p className={`mt-1 text-[10px] font-semibold uppercase tracking-wider ${s.good ? 'text-white/50' : 'text-ink-faint'}`}>{s.label}</p>
                </div>
              ))}
            </div>

            <div className="card-luxe p-6">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
                  <TrendingUp className="h-5 w-5 text-gold-600" />
                  {horizon}-year projection
                </h3>
                <div className="flex rounded-lg bg-gold-50 p-1 text-xs font-bold">
                  {([5, 10] as const).map((h) => (
                    <button
                      key={h}
                      onClick={() => setHorizon(h)}
                      className={`rounded-md px-3 py-1 transition ${horizon === h ? 'bg-gold-gradient text-white' : 'text-ink-muted'}`}
                    >
                      {h}Y
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C6A34F" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#C6A34F" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gNet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0E7A5F" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#0E7A5F" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0E8D5" />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#8F887C' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#8F887C' }} tickFormatter={(v) => `${v}M`} />
                    <Tooltip
                      formatter={(value, name) => [`${Number(value).toLocaleString()}M`, String(name)]}
                      contentStyle={{ borderRadius: 12, border: '1px solid #EAD8A0', fontSize: 12 }}
                    />
                    <ReferenceLine y={Math.round((price + furnishing) / 1_000_000)} stroke="#8F887C" strokeDasharray="4 4"
                      label={{ value: 'Invested', fontSize: 10, fill: '#8F887C', position: 'insideTopRight' }} />
                    <Area type="monotone" dataKey="value" name="Property value" stroke="#A88430" strokeWidth={2} fill="url(#gValue)" />
                    <Area type="monotone" dataKey="net" name="Cumulative net rent" stroke="#0E7A5F" strokeWidth={2} fill="url(#gNet)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 grid gap-3 rounded-xl bg-cream/70 p-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Value at Y{horizon}</p>
                  <p className="mt-0.5 font-bold text-ink">{money(finalPoint.propertyValue)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Net rent collected</p>
                  <p className="mt-0.5 font-bold text-ink">{money(finalPoint.cumulativeNet)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Total gain</p>
                  <p className="mt-0.5 font-bold text-gold-700">{money(finalPoint.equityPlusIncome)}</p>
                </div>
              </div>
            </div>

            <div className="card-luxe flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold-gradient shadow-gold-sm">
                <Bot className="h-6 w-6 text-white" />
              </span>
              <div className="flex-1">
                <p className="font-display text-lg font-bold text-ink">Want this analysed against real listings?</p>
                <p className="mt-1 text-sm text-ink-muted">
                  Ask Keja to run these numbers on verified inventory — with market bands, comparable deals and a
                  written investment verdict.
                </p>
              </div>
              <Link to="/ask" className="btn-gold shrink-0">Ask Keja</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
