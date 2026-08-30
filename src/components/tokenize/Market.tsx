/**
 * Keja Tokenize — secondary market (simulated) + distributions calendar.
 * Order books and price drift are deterministic per property id, so the demo
 * is stable between reloads while clearly labelled as simulation.
 */
import { useMemo, useState } from 'react'
import { CandlestickChart, CalendarDays, ArrowDownRight, ArrowUpRight, Info } from 'lucide-react'
import { useTokenize } from '@/lib/tokenizeStore'
import type { TokenizedProperty } from '@/data/tokenize'
import { useToast } from './shared'

/* deterministic pseudo-random from string seed */
function seeded(seed: string): () => number {
  let h = 2166136261
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

function marketSeries(p: TokenizedProperty) {
  const rnd = seeded(p.id)
  const points: { i: number; price: number }[] = []
  let price = p.tokenPriceUsd
  for (let i = 0; i < 30; i++) {
    price = Math.max(0.5 * p.tokenPriceUsd, price * (1 + (rnd() - 0.48) * 0.02))
    points.push({ i, price })
  }
  return points
}

function orderBook(p: TokenizedProperty) {
  const rnd = seeded(p.id + 'book')
  const series = marketSeries(p)
  const mid = series[series.length - 1].price
  const bids = [1, 2, 3].map((k) => ({ price: mid * (1 - k * 0.004), size: Math.round(200 + rnd() * 1800) }))
  const asks = [1, 2, 3].map((k) => ({ price: mid * (1 + k * 0.004), size: Math.round(200 + rnd() * 1800) }))
  return { mid, bids, asks, volume24h: Math.round(4000 + rnd() * 26000) }
}

function Sparkline({ points, up }: { points: { i: number; price: number }[]; up: boolean }) {
  const w = 120
  const h = 36
  const min = Math.min(...points.map((p) => p.price))
  const max = Math.max(...points.map((p) => p.price))
  const x = (i: number) => (i / (points.length - 1)) * w
  const y = (v: number) => h - ((v - min) / (max - min || 1)) * (h - 4) - 2
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.price).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-[120px]" aria-hidden="true">
      <path d={d} fill="none" stroke={up ? '#0E7A5F' : '#B42318'} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}

export default function SecondaryMarket() {
  const { properties, investments, sellTokens, investor, openKyc } = useTokenize()
  const { toast } = useToast()
  const [sellId, setSellId] = useState<string | null>(null)
  const [sellAmount, setSellAmount] = useState(0)

  const tradable = useMemo(() => properties.filter((p) => p.status === 'LIVE' || p.status === 'FUNDING'), [properties])
  const books = useMemo(() => new Map(tradable.map((p) => [p.id, orderBook(p)])), [tradable])
  const series = useMemo(() => new Map(tradable.map((p) => [p.id, marketSeries(p)])), [tradable])

  const holdings = useMemo(() => {
    return investments.reduce<Record<string, number>>((acc, i) => {
      acc[i.propertyId] = (acc[i.propertyId] ?? 0) + i.tokenAmount
      return acc
    }, {})
  }, [investments])

  /* distributions calendar: next 12 months, projected per holding */
  const calendar = useMemo(() => {
    const months: { label: string; date: Date; entries: { symbol: string; title: string; estUsd: number }[] }[] = []
    const now = new Date()
    for (let m = 1; m <= 12; m++) {
      const d = new Date(now.getFullYear(), now.getMonth() + m, 1)
      months.push({ label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), date: d, entries: [] })
    }
    for (const p of properties) {
      const held = holdings[p.id]
      if (!held) continue
      const freq = p.distributionFreq === 'MONTHLY' ? 1 : 3
      const perToken = p.annualNetIncomeUsd / p.totalTokens / (12 / freq)
      months.forEach((m, idx) => {
        if ((idx + 1) % freq === 0) {
          m.entries.push({ symbol: p.tokenSymbol, title: p.title, estUsd: Math.round(held * perToken) })
        }
      })
    }
    return months
  }, [properties, holdings])

  const annualProjected = calendar.reduce((acc, m) => acc + m.entries.reduce((a, e) => a + e.estUsd, 0), 0)

  return (
    <div className="space-y-8">
      <section className="card-luxe p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Simulation</p>
            <h2 className="mt-1 flex items-center gap-2 font-display text-2xl font-bold text-ink">
              <CandlestickChart className="h-6 w-6 text-gold-600" /> Secondary market
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
              A regulated secondary market is where tokenized property gets its liquidity — owners exit without
              selling a whole building. This simulated book shows how Keja Tokenize will surface price discovery,
              depth and distributions once licensed venues approve KPT trading. No real orders are matched.
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <caption className="sr-only">Simulated order books per tokenized property</caption>
            <thead>
              <tr className="border-b border-gold-100 text-[11px] uppercase tracking-wider text-ink-muted">
                <th scope="col" className="py-2.5 pr-4 font-bold">Token</th>
                <th scope="col" className="py-2.5 pr-4 font-bold">Last</th>
                <th scope="col" className="py-2.5 pr-4 font-bold">30d</th>
                <th scope="col" className="py-2.5 pr-4 font-bold">Best bid</th>
                <th scope="col" className="py-2.5 pr-4 font-bold">Best ask</th>
                <th scope="col" className="py-2.5 pr-4 font-bold">24h vol</th>
                <th scope="col" className="py-2.5 font-bold">You hold</th>
              </tr>
            </thead>
            <tbody>
              {tradable.map((p) => {
                const book = books.get(p.id)!
                const pts = series.get(p.id)!
                const first = pts[0].price
                const last = book.mid
                const up = last >= first
                const change = ((last - first) / first) * 100
                const held = holdings[p.id]
                return (
                  <tr key={p.id} className="border-b border-gold-50 hover:bg-gold-50/40">
                    <td className="py-3 pr-4">
                      <p className="font-bold text-ink">{p.tokenSymbol}</p>
                      <p className="text-[11px] text-ink-muted">{p.title.slice(0, 34)}…</p>
                    </td>
                    <td className="py-3 pr-4 font-semibold text-ink">${last.toFixed(2)}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${up ? 'text-emerald-700' : 'text-red-700'}`}>
                        {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {change.toFixed(1)}%
                      </span>
                      <Sparkline points={pts} up={up} />
                    </td>
                    <td className="py-3 pr-4 text-emerald-700">${book.bids[0].price.toFixed(2)}</td>
                    <td className="py-3 pr-4 text-red-700">${book.asks[0].price.toFixed(2)}</td>
                    <td className="py-3 pr-4 text-ink-soft">{book.volume24h.toLocaleString()}</td>
                    <td className="py-3">
                      {held ? (
                        <button
                          onClick={() => {
                            if (!investor) return openKyc('portfolio')
                            setSellId(p.id)
                            setSellAmount(Math.min(held, 100))
                          }}
                          className="rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-gold-300 transition hover:bg-ink-soft"
                        >
                          {held.toLocaleString()} · Sell
                        </button>
                      ) : (
                        <span className="text-xs text-ink-muted">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* sell ticket */}
      {sellId && (
        <section className="card-luxe border-2 border-gold-300 p-6" role="region" aria-label="Sell tokens">
          {(() => {
            const p = properties.find((x) => x.id === sellId)!
            const book = books.get(sellId)!
            const max = holdings[sellId] ?? 0
            const proceeds = sellAmount * book.bids[0].price
            return (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex-1">
                  <p className="font-display text-lg font-bold text-ink">
                    Sell {p.tokenSymbol} <span className="text-sm font-medium text-ink-muted">· best bid ${book.bids[0].price.toFixed(2)}</span>
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {[25, 50, 100].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => setSellAmount(Math.max(1, Math.floor((max * pct) / 100)))}
                        className="rounded-lg border border-gold-200 px-3 py-1.5 text-xs font-bold text-gold-700 hover:bg-gold-50"
                      >
                        {pct}%
                      </button>
                    ))}
                    <input
                      type="number"
                      min={1}
                      max={max}
                      value={sellAmount}
                      onChange={(e) => setSellAmount(Math.min(max, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="input-luxe !w-32"
                      aria-label="Tokens to sell"
                    />
                    <span className="text-xs text-ink-muted">of {max.toLocaleString()} held</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl font-bold text-ink">${proceeds.toLocaleString()}</p>
                  <p className="text-[11px] uppercase tracking-wider text-ink-muted">Est. proceeds</p>
                  <button
                    onClick={() => {
                      try {
                        const r = sellTokens(sellId, sellAmount, book.bids[0].price)
                        toast({ title: `Sold ${r.tokens.toLocaleString()} ${p.tokenSymbol}`, description: `Proceeds $${r.proceedsUsd.toLocaleString()} · tx ${r.txHash.slice(0, 10)}… (simulated)` })
                        setSellId(null)
                      } catch {
                        toast({ title: 'Order failed', description: 'Check your token balance.' })
                      }
                    }}
                    className="btn-gold mt-2 !px-6 !py-2.5"
                  >
                    Place sell order
                  </button>
                </div>
              </div>
            )
          })()}
        </section>
      )}

      {/* distributions calendar */}
      <section className="card-luxe p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
            <CalendarDays className="h-6 w-6 text-gold-600" /> Distributions calendar
          </h2>
          {annualProjected > 0 && (
            <p className="rounded-full bg-ink px-4 py-1.5 text-sm font-bold text-gold-300">
              Next 12 months ≈ ${annualProjected.toLocaleString()}
            </p>
          )}
        </div>
        {Object.keys(holdings).length === 0 ? (
          <p className="mt-4 rounded-xl bg-gold-50 p-4 text-sm leading-relaxed text-ink-soft">
            Your projected distribution schedule appears here once you hold tokens. Monthly properties pay every
            month; quarterly properties pay in March, June, September and December.
          </p>
        ) : (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {calendar.map((m) => (
                <div key={m.label} className={`rounded-xl p-3.5 ring-1 ${m.entries.length ? 'bg-cream ring-gold-200' : 'bg-white ring-gold-50'}`}>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{m.label}</p>
                  {m.entries.length ? (
                    m.entries.map((e) => (
                      <p key={e.symbol} className="mt-1.5 text-sm font-bold text-gold-700">
                        ${e.estUsd.toLocaleString()} <span className="text-[10px] font-semibold text-ink-muted">{e.symbol}</span>
                      </p>
                    ))
                  ) : (
                    <p className="mt-1.5 text-xs text-ink-muted/60">—</p>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-ink-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-600" />
              Projections use current holdings and each SPV's declared net income at 100% occupancy of the rent roll —
              actual distributions follow the SPV's bank statements after vacancies, fees and withholding tax (demo data).
            </p>
          </>
        )}
      </section>
    </div>
  )
}
