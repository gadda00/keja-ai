'use client';
/**
 * KEJA DATA — market intelligence console (proposal §7).
 * Ask the market anything; answers are computed live from platform inventory
 * with sample sizes and sourcing declared. Includes a downloadable
 * market snapshot report.
 */
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, } from '@/components/charts/reexports';
import { BarChart3, Database, Download, Search, ShieldCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { answerMarketQuestion, SAMPLE_QUESTIONS, type MarketAnswer } from '@/lib/marketIntel';
import { useAllProperties } from '@/lib/inventory';
import { formatKES } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function MarketDataView() {
  const all = useAllProperties();
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState<MarketAnswer | null>(null);
  const [asked, setAsked] = useState('');

  const ask = (question?: string) => {
    const text = (question ?? q).trim();
    if (!text) return;
    setAsked(text);
    setAnswer(answerMarketQuestion(text, all));
  };

  const countyStats = useMemo(() => {
    const byCounty = new Map<string, { n: number; value: number }>();
    for (const p of all) {
      if (p.priceOnApplication) continue;
      const cur = byCounty.get(p.county) ?? { n: 0, value: 0 };
      byCounty.set(p.county, { n: cur.n + 1, value: cur.value + (p.purpose.includes('rent') ? 0 : p.price) });
    }
    return [...byCounty.entries()]
      .map(([county, { n, value }]) => ({ county, n, avg: n ? value / n : 0 }))
      .sort((a, b) => b.n - a.n);
  }, [all]);

  const downloadSnapshot = () => {
    const rows = countyStats
      .map(
        (c) =>
          `<tr><td>${c.county}</td><td style="text-align:right">${c.n}</td><td style="text-align:right">${c.avg ? formatKES(Math.round(c.avg)) : '—'}</td></tr>`,
      )
      .join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Keja Market Snapshot</title>
<style>body{font-family:Georgia,serif;max-width:680px;margin:40px auto;color:#1a2b24;padding:0 24px}
h1{font-size:24px;margin:0}.brand{color:#0e7a4e;font-weight:800}
.sub{color:#6b7a72;font-size:13px;margin-top:4px}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:14px}
th{text-align:left;border-bottom:2px solid #1a2b24;padding:6px 4px;font-size:11px;text-transform:uppercase}
td{border-bottom:1px solid #e9ede9;padding:7px 4px}
.note{font-size:11px;color:#6b7a72;margin-top:22px;line-height:1.6}</style></head><body>
<h1><span class="brand">Keja AI</span> — Market Snapshot</h1>
<p class="sub">${all.length} live listings · generated ${new Date().toLocaleDateString('en-KE', { dateStyle: 'long' })} · trial platform, illustrative data</p>
<table><thead><tr><th>County</th><th style="text-align:right">Live listings</th><th style="text-align:right">Avg sale price</th></tr></thead><tbody>${rows}</tbody></table>
<p class="note">Computed from live platform inventory at generation time. Averages exclude rental-priced and price-on-application listings. Decision support only — not a valuation.</p>
</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keja-market-snapshot-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="max-w-2xl">
        <Badge variant="outline" className="border-primary/40 font-bold text-primary">Keja Data · Market Intelligence</Badge>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Ask the market anything</h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Price bands, yields, rents, supply momentum and budget allocations — computed live from
          platform inventory, with every sample size and source declared. This is the layer that
          turns Keja from a marketplace into a <strong className="text-foreground">data and intelligence company</strong>.
        </p>
      </div>

      {/* ask bar */}
      <form
        className="mt-7 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask();
        }}
        role="search"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. Where should I invest KSh 5 million?"
            aria-label="Ask a market question"
            className="h-12 rounded-xl pl-10"
          />
        </div>
        <Button type="submit" size="lg" className="h-12 rounded-xl px-6 font-bold">
          <BarChart3 className="mr-1.5 h-4 w-4" aria-hidden /> Ask
        </Button>
      </form>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {SAMPLE_QUESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setQ(s);
              ask(s);
            }}
            className="rounded-full border px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>

      {/* answer */}
      {answer && (
        <motion.div
          key={asked}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mt-7 space-y-5 rounded-3xl border bg-card p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              <span className="text-foreground">Q:</span> {asked}
            </p>
            <Badge variant="secondary" className="text-[10px] font-bold capitalize">{answer.kind.replace(/-/g, ' ')}</Badge>
          </div>

          <div className="text-[15px] leading-relaxed [&_p]:m-0 [&_strong]:font-bold">
            <ReactMarkdown>{answer.text}</ReactMarkdown>
          </div>

          {answer.chart && answer.chart.length > 0 && (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={answer.chart} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis type="category" dataKey="label" stroke="var(--muted-foreground)" fontSize={11} width={110} />
                  <Tooltip
                    contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
                  />
                  <Bar dataKey="value" fill="var(--chart-1)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {answer.table && (
            <div className="overflow-x-auto rounded-2xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-accent/40 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    {answer.table.columns.map((c) => (
                      <th key={c} className="px-4 py-2.5">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {answer.table.rows.map((row, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-accent/30">
                      {row.map((cell, j) => (
                        <td key={j} className={cn('px-4 py-2.5', typeof cell === 'number' && 'text-right tabular-nums font-semibold')}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="flex items-start gap-2 border-t pt-3 text-[11px] leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            {answer.sourceNote}
          </p>
        </motion.div>
      )}

      {/* county snapshot */}
      <div className="mt-10 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
              <Database className="h-4 w-4 text-gold" aria-hidden /> County snapshot
            </h2>
            <Button variant="outline" size="sm" className="font-bold" onClick={downloadSnapshot}>
              <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Market report
            </Button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2.5">County</th>
                  <th className="pb-2.5 text-right">Live listings</th>
                  <th className="pb-2.5 text-right">Avg sale price</th>
                </tr>
              </thead>
              <tbody>
                {countyStats.map((c) => (
                  <tr key={c.county} className="border-b last:border-0">
                    <td className="py-2.5 font-bold">{c.county}</td>
                    <td className="py-2.5 text-right tabular-nums">{c.n}</td>
                    <td className="py-2.5 text-right tabular-nums">{c.avg ? formatKES(Math.round(c.avg)) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border bg-gradient-to-b from-accent/50 to-card p-5">
          <h2 className="text-sm font-black uppercase tracking-wider">Methodology</h2>
          <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-muted-foreground">
            {[
              'Every metric is computed from live platform inventory at question time — no stale caches.',
              'Sample sizes are always shown; thin samples are flagged, never silently smoothed.',
              'Yields and value bands are ESTIMATES from area research and listing inputs, labelled as such.',
              'Coverage grows with inventory: new areas enter the intelligence set as listings arrive.',
            ].map((li) => (
              <li key={li} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden /> {li}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
