/**
 * Keja Tokenize — secondary market (trial) + distributions calendar.
 * Two-sided trading against the deterministic walking book from the trial
 * store (buildOrderBook / marketSeries / seedMidPrice). Everything shown
 * before an order executes is a labelled ESTIMATE — the store is the money
 * authority and records the executed fills.
 */
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CandlestickChart,
  Info,
  PlusCircle,
  Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import type { BookLevel } from '@/lib/tokenizeStore';
import {
  buildOrderBook,
  marketSeries,
  seedMidPrice,
  TRIAL_TOPUP_USD,
  useTokenize,
} from '@/lib/tokenizeStore';

import { fmtNum, fmtUsd, useToast } from './shared';

/**
 * Display-only fill estimate: walks the same deterministic levels the store
 * matches against and returns the VWAP plus where the mid settles after the
 * trade's impact. Estimates only — the store records executed fills.
 */
function estimateFill(
  side: 'buy' | 'sell',
  size: number,
  book: { bids: BookLevel[]; asks: BookLevel[] }
): { filled: number; avgPriceUsd: number; totalUsd: number; newMid: number } {
  const levels = [...(side === 'buy' ? book.asks : book.bids)].sort((a, b) =>
    side === 'buy' ? a.price - b.price : b.price - a.price
  );
  let remaining = Math.max(0, size);
  let cost = 0;
  let filled = 0;
  let lastPrice = 0;
  for (const lvl of levels) {
    if (remaining <= 0) break;
    const take = Math.min(lvl.size, remaining);
    cost += take * lvl.price;
    filled += take;
    remaining -= take;
    lastPrice = lvl.price;
  }
  return {
    filled,
    avgPriceUsd: filled > 0 ? cost / filled : 0,
    totalUsd: cost,
    newMid: filled > 0 ? lastPrice * (side === 'buy' ? 1.0015 : 0.9985) : 0,
  };
}

function Sparkline({ points, up }: { points: { i: number; price: number }[]; up: boolean }) {
  const w = 120;
  const h = 36;
  const min = Math.min(...points.map((p) => p.price));
  const max = Math.max(...points.map((p) => p.price));
  const x = (i: number) => (i / (points.length - 1)) * w;
  const y = (v: number) => h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.price).toFixed(1)}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-[120px]" aria-hidden="true">
      <path
        d={d}
        fill="none"
        stroke={up ? '#0E7A5F' : '#B42318'}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function SecondaryMarket() {
  const {
    properties,
    investments,
    investor,
    openKyc,
    trades,
    walletUsd,
    topUpTrial,
    buySecondary,
    sellSecondary,
    marketPrice,
  } = useTokenize();
  const { toast } = useToast();

  const [tradeId, setTradeId] = useState<string | null>(null);
  const [tradeSide, setTradeSide] = useState<'buy' | 'sell'>('buy');
  const [tradeAmount, setTradeAmount] = useState(0);

  const tradable = useMemo(
    () => properties.filter((p) => p.status === 'LIVE' || p.status === 'FUNDING'),
    [properties]
  );
  // Books mirror the store exactly: seed mid unless a trial trade has moved
  // it — then the store's live marketPrice wins (liveMid ?? seedMid).
  const books = useMemo(
    () =>
      new Map(
        tradable.map((p) => [p.id, buildOrderBook(p.id, seedMidPrice(p), marketPrice(p.id))])
      ),
    [tradable, marketPrice]
  );
  const series = useMemo(() => new Map(tradable.map((p) => [p.id, marketSeries(p)])), [tradable]);

  const holdings = useMemo(() => {
    return investments.reduce<Record<string, number>>((acc, i) => {
      acc[i.propertyId] = (acc[i.propertyId] ?? 0) + i.tokenAmount;
      return acc;
    }, {});
  }, [investments]);

  /* historical trades + estimated post-impact mid (reconstructed from the
   * deterministic seed book — labelled as an estimate) */
  const tradeRows = useMemo(
    () =>
      trades.map((t) => {
        const prop = properties.find((p) => p.id === t.propertyId);
        const estMid = prop
          ? estimateFill(
              t.side === 'BUY' ? 'buy' : 'sell',
              t.tokens,
              buildOrderBook(t.propertyId, seedMidPrice(prop), undefined)
            ).newMid
          : 0;
        return { trade: t, estMid };
      }),
    [trades, properties]
  );

  /* distributions calendar: next 12 months, projected per holding */
  const calendar = useMemo(() => {
    const months: {
      label: string;
      date: Date;
      entries: { symbol: string; title: string; estUsd: number }[];
    }[] = [];
    const now = new Date();
    for (let m = 1; m <= 12; m++) {
      const d = new Date(now.getFullYear(), now.getMonth() + m, 1);
      months.push({
        label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
        date: d,
        entries: [],
      });
    }
    for (const p of properties) {
      const held = holdings[p.id];
      if (!held) continue;
      const freq = p.distributionFreq === 'MONTHLY' ? 1 : 3;
      const perToken = p.annualNetIncomeUsd / p.totalTokens / (12 / freq);
      months.forEach((m, idx) => {
        if ((idx + 1) % freq === 0) {
          m.entries.push({
            symbol: p.tokenSymbol,
            title: p.title,
            estUsd: Math.round(held * perToken),
          });
        }
      });
    }
    return months;
  }, [properties, holdings]);

  const annualProjected = calendar.reduce(
    (acc, m) => acc + m.entries.reduce((a, e) => a + e.estUsd, 0),
    0
  );

  function openTicket(id: string, side: 'buy' | 'sell', amount: number) {
    setTradeId(id);
    setTradeSide(side);
    setTradeAmount(Math.max(1, amount));
  }

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
              A regulated secondary market is where tokenized property gets its liquidity — owners
              exit without selling a whole building. In trial mode your orders match against this
              simulated book using trial credits, with visible price impact as they walk the levels.
              No real orders, real money or real securities are involved.
            </p>
          </div>
        </div>

        {/* trial wallet summary strip */}
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[12px] font-bold text-amber-800 ring-1 ring-amber-200">
            <Wallet className="h-3.5 w-3.5" /> Trial wallet {fmtUsd(walletUsd)}
          </span>
          <span className="text-[11.5px] text-amber-700">
            Simulated credits — buys debit the wallet; sales and distributions credit it.
          </span>
          <button
            onClick={() => {
              topUpTrial();
              toast({
                title: 'Trial credits added — simulated money',
                description: `+${fmtUsd(TRIAL_TOPUP_USD)} in virtual trial credits.`,
              });
            }}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white/70 px-3.5 py-2 text-[12px] font-bold text-amber-800 transition hover:bg-amber-100"
          >
            <PlusCircle className="h-3.5 w-3.5" /> Top up +{fmtUsd(TRIAL_TOPUP_USD)} trial credits
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <caption className="sr-only">Simulated order books per tokenized property</caption>
            <thead>
              <tr className="border-b border-gold-100 text-[11px] uppercase tracking-wider text-ink-muted">
                <th scope="col" className="py-2.5 pr-4 font-bold">
                  Token
                </th>
                <th scope="col" className="py-2.5 pr-4 font-bold">
                  Last
                </th>
                <th scope="col" className="py-2.5 pr-4 font-bold">
                  30d
                </th>
                <th scope="col" className="py-2.5 pr-4 font-bold">
                  Best bid
                </th>
                <th scope="col" className="py-2.5 pr-4 font-bold">
                  Best ask
                </th>
                <th scope="col" className="py-2.5 pr-4 font-bold">
                  24h vol
                </th>
                <th scope="col" className="py-2.5 font-bold">
                  You hold
                </th>
              </tr>
            </thead>
            <tbody>
              {tradable.map((p) => {
                const book =
                  books.get(p.id) ?? buildOrderBook(p.id, seedMidPrice(p), marketPrice(p.id));
                const pts = series.get(p.id) ?? marketSeries(p);
                const first = pts[0].price;
                const last = book.mid;
                const up = last >= first;
                const change = ((last - first) / first) * 100;
                const held = holdings[p.id];
                return (
                  <tr key={p.id} className="border-b border-gold-50 hover:bg-gold-50/40">
                    <td className="py-3 pr-4">
                      <p className="font-bold text-ink">{p.tokenSymbol}</p>
                      <p className="text-[11px] text-ink-muted">{p.title.slice(0, 34)}…</p>
                    </td>
                    <td className="py-3 pr-4 font-semibold text-ink">${last.toFixed(2)}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex items-center gap-0.5 text-xs font-bold ${up ? 'text-emerald-700' : 'text-red-700'}`}
                      >
                        {up ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {change.toFixed(1)}%
                      </span>
                      <Sparkline points={pts} up={up} />
                    </td>
                    <td className="py-3 pr-4 text-emerald-700">${book.bids[0].price.toFixed(2)}</td>
                    <td className="py-3 pr-4 text-red-700">${book.asks[0].price.toFixed(2)}</td>
                    <td className="py-3 pr-4 text-ink-soft">{book.volume24h.toLocaleString()}</td>
                    <td className="py-3">
                      <button
                        onClick={() =>
                          openTicket(p.id, held ? 'sell' : 'buy', held ? Math.min(held, 100) : 100)
                        }
                        className="rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-gold-300 transition hover:bg-ink-soft"
                      >
                        {held ? `${held.toLocaleString()} · Trade` : 'Trade'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-ink-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-600" />
          30-day sparklines are an illustrative deterministic walk from the issuance price; Last,
          bid and ask come from the live trial book (the store&apos;s market price after your
          trades).
        </p>
      </section>

      {/* trade ticket */}
      {tradeId ? (
        <section className="card-luxe border-2 border-gold-300 p-6" aria-label="Trade tokens">
          {(() => {
            const p = properties.find((x) => x.id === tradeId);
            if (!p) return null;
            const book =
              books.get(p.id) ?? buildOrderBook(p.id, seedMidPrice(p), marketPrice(p.id));
            const held = holdings[p.id] ?? 0;
            const est = estimateFill(tradeSide, tradeAmount, book);
            const kycNeeded = tradeSide === 'buy' && !investor;
            const sellBlocked = tradeSide === 'sell' && held <= 0;
            return (
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex-1">
                  <p className="font-display text-lg font-bold text-ink">
                    Trade {p.tokenSymbol}{' '}
                    <span className="text-sm font-medium text-ink-muted">
                      · mid ${book.mid.toFixed(2)} · best bid ${book.bids[0].price.toFixed(2)} ·
                      best ask ${book.asks[0].price.toFixed(2)}
                    </span>
                  </p>
                  {/* side toggle */}
                  <div
                    className="mt-3 inline-flex rounded-lg border border-gold-200 bg-cream p-1"
                    role="group"
                    aria-label="Order side"
                  >
                    {(['buy', 'sell'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setTradeSide(s);
                          if (s === 'sell' && held > 0)
                            setTradeAmount((a) => Math.min(a, held) || Math.min(held, 100));
                        }}
                        aria-pressed={tradeSide === s}
                        className={`rounded-md px-4 py-2 text-[13px] font-bold capitalize transition ${
                          tradeSide === s
                            ? s === 'buy'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-red-600 text-white'
                            : 'text-ink-muted hover:text-ink'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {tradeSide === 'sell' && held > 0
                      ? [25, 50, 100].map((pct) => (
                          <button
                            key={pct}
                            onClick={() =>
                              setTradeAmount(Math.max(1, Math.floor((held * pct) / 100)))
                            }
                            className="rounded-lg border border-gold-200 px-3 py-1.5 text-xs font-bold text-gold-700 hover:bg-gold-50"
                          >
                            {pct}%
                          </button>
                        ))
                      : null}
                    {tradeSide === 'buy'
                      ? [100, 500, 1000].map((t) => (
                          <button
                            key={t}
                            onClick={() => setTradeAmount(t)}
                            className="rounded-lg border border-gold-200 px-3 py-1.5 text-xs font-bold text-gold-700 hover:bg-gold-50"
                          >
                            {fmtNum(t)}
                          </button>
                        ))
                      : null}
                    <input
                      type="number"
                      min={1}
                      max={tradeSide === 'sell' && held > 0 ? held : undefined}
                      value={tradeAmount}
                      onChange={(e) => {
                        const raw = Math.max(1, parseInt(e.target.value) || 1);
                        setTradeAmount(
                          tradeSide === 'sell' && held > 0 ? Math.min(held, raw) : raw
                        );
                      }}
                      className="input-luxe !w-32"
                      aria-label={tradeSide === 'buy' ? 'Tokens to buy' : 'Tokens to sell'}
                    />
                    <span className="text-xs text-ink-muted">
                      {tradeSide === 'sell' ? `of ${fmtNum(held)} held` : 'tokens (market order)'}
                    </span>
                  </div>

                  <p className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-muted">
                    <span
                      className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 ring-1 ring-amber-200"
                      title="Display estimate — the executed fill is recorded by the trial engine"
                    >
                      Estimate
                    </span>
                    {est.filled > 0 ? (
                      <span>
                        Est. fill ~{fmtNum(est.filled)} token{est.filled === 1 ? '' : 's'} @ $
                        {est.avgPriceUsd.toFixed(2)} (VWAP, walking the book)
                        {est.filled < tradeAmount ? (
                          <strong className="text-amber-700"> · partial — book depth</strong>
                        ) : null}
                      </span>
                    ) : (
                      <span>No depth on this side of the book for that size.</span>
                    )}
                  </p>
                </div>

                <div className="text-left lg:text-right">
                  <p className="font-display text-xl font-bold text-ink">
                    {est.filled > 0 ? fmtUsd(est.totalUsd, 2) : '—'}
                  </p>
                  <p className="text-[11px] uppercase tracking-wider text-ink-muted">
                    {tradeSide === 'buy' ? 'Est. total cost' : 'Est. proceeds'}
                  </p>
                  <p className="mt-1 text-[12px] text-ink-muted">
                    Trial wallet: <strong className="text-ink">{fmtUsd(walletUsd)}</strong>{' '}
                    available
                  </p>
                  <button
                    onClick={() => {
                      if (kycNeeded) {
                        openKyc('portfolio');
                        return;
                      }
                      try {
                        const r =
                          tradeSide === 'buy'
                            ? buySecondary(p.id, tradeAmount)
                            : sellSecondary(p.id, tradeAmount);
                        toast({
                          title: `${tradeSide === 'buy' ? 'Bought' : 'Sold'} ${fmtNum(r.tokens)} ${r.symbol} (trial)`,
                          description: `Avg $${r.avgPriceUsd.toFixed(2)} · total ${fmtUsd(r.totalUsd)} · market impact moved the mid to $${r.newMid.toFixed(2)}`,
                        });
                        setTradeId(null);
                      } catch (e) {
                        toast({
                          title: 'Order failed',
                          description:
                            e instanceof Error ? e.message : 'Order could not be placed.',
                        });
                      }
                    }}
                    disabled={sellBlocked || tradeAmount <= 0}
                    className="btn-gold mt-2 !px-6 !py-2.5"
                  >
                    {kycNeeded ? 'Complete KYC to place order' : 'Place market order'}
                  </button>
                  {sellBlocked ? (
                    <p className="mt-1 text-[11px] text-ink-muted">
                      You hold no {p.tokenSymbol} tokens to sell.
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })()}
        </section>
      ) : null}

      {/* your trial trades */}
      {trades.length > 0 ? (
        <section className="card-luxe p-6 sm:p-8">
          <h2 className="flex flex-wrap items-center gap-2 font-display text-2xl font-bold text-ink">
            Your trial trades
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 ring-1 ring-amber-200">
              (trial)
            </span>
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <caption className="sr-only">Executed secondary-market trades in trial mode</caption>
              <thead>
                <tr className="border-b border-gold-100 text-[11px] uppercase tracking-wider text-ink-muted">
                  <th scope="col" className="py-2.5 pr-4 font-bold">
                    Time
                  </th>
                  <th scope="col" className="py-2.5 pr-4 font-bold">
                    Asset
                  </th>
                  <th scope="col" className="py-2.5 pr-4 font-bold">
                    Side
                  </th>
                  <th scope="col" className="py-2.5 pr-4 font-bold">
                    Tokens
                  </th>
                  <th scope="col" className="py-2.5 pr-4 font-bold">
                    Avg price
                  </th>
                  <th scope="col" className="py-2.5 pr-4 font-bold">
                    Total
                  </th>
                  <th scope="col" className="py-2.5 font-bold">
                    Mid after impact
                  </th>
                </tr>
              </thead>
              <tbody>
                {tradeRows.map(({ trade, estMid }) => (
                  <tr key={trade.id} className="border-b border-gold-50 last:border-0">
                    <td className="py-2.5 pr-4 text-ink-muted">{fmtTime(trade.timestamp)}</td>
                    <td className="py-2.5 pr-4 font-bold text-ink">{trade.symbol}</td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          trade.side === 'BUY'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {trade.side}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-ink-soft">{fmtNum(trade.tokens)}</td>
                    <td className="py-2.5 pr-4 text-ink-soft">${trade.avgPriceUsd.toFixed(2)}</td>
                    <td className="py-2.5 pr-4 font-semibold text-ink">{fmtUsd(trade.totalUsd)}</td>
                    <td className="py-2.5 text-ink-soft">
                      {estMid > 0 ? `$${estMid.toFixed(2)}` : '—'}{' '}
                      <span className="text-[10px] text-ink-muted">(est.)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-ink-muted">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-600" />
            Mid after impact is an estimate reconstructed from the deterministic book; executed
            fills, wallet debits and credits are recorded by the trial engine.
          </p>
        </section>
      ) : null}

      {/* distributions calendar */}
      <section className="card-luxe p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
            <CalendarDays className="h-6 w-6 text-gold-600" /> Projected distributions calendar
            (trial)
          </h2>
          {annualProjected > 0 && (
            <p className="rounded-full bg-ink px-4 py-1.5 text-sm font-bold text-gold-300">
              Next 12 months ≈ ${annualProjected.toLocaleString()}
            </p>
          )}
        </div>
        {Object.keys(holdings).length === 0 ? (
          <p className="mt-4 rounded-xl bg-gold-50 p-4 text-sm leading-relaxed text-ink-soft">
            Your projected distribution schedule appears here once you hold tokens. Monthly
            properties pay every month; quarterly properties pay every third month from the cycle
            start.
          </p>
        ) : (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {calendar.map((m) => (
                <div
                  key={m.label}
                  className={`rounded-xl p-3.5 ring-1 ${m.entries.length ? 'bg-cream ring-gold-200' : 'bg-white ring-gold-50'}`}
                >
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                    {m.label}
                  </p>
                  {m.entries.length ? (
                    m.entries.map((e) => (
                      <p key={e.symbol} className="mt-1.5 text-sm font-bold text-gold-700">
                        ${e.estUsd.toLocaleString()}{' '}
                        <span className="text-[10px] font-semibold text-ink-muted">{e.symbol}</span>
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
              Projections use current holdings and each SPV&apos;s declared net income at 100%
              occupancy of the rent roll — actual distributions follow the SPV&apos;s bank
              statements after vacancies, fees and withholding tax (demo data).
            </p>
          </>
        )}
      </section>
    </div>
  );
}
