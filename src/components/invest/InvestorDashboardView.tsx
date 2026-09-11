'use client';
/**
 * KEJA INVESTOR DASHBOARD (proposal §6) — the whole-portfolio desk:
 * value, holdings, rental income, appreciation, ROI, yields, occupancy,
 * cash flow, financing, and a downloadable investor report.
 */
import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, } from '@/components/charts/reexports';
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Coins,
  Download,
  Landmark,
  PieChart as PieIcon,
  Plus,
  RotateCcw,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePortfolio, type Holding } from '@/lib/investorStore';
import { useTokenize } from '@/lib/tokenizeStore';
import { formatKES } from '@/lib/format';
import { navigate } from '@/lib/router';
import { cn } from '@/lib/utils';

function Metric({
  label,
  value,
  sub,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  trend?: number;
}) {
  return (
    <div className="card-lift rounded-2xl border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-gold" aria-hidden />
      </div>
      <p className="mt-2 text-xl font-black tabular-nums tracking-tight sm:text-2xl">{value}</p>
      <div className="mt-1 flex items-center gap-1.5">
        {trend !== undefined && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-[11px] font-black',
              trend >= 0 ? 'text-primary' : 'text-destructive',
            )}
          >
            {trend >= 0 ? <ArrowUpRight className="h-3 w-3" aria-hidden /> : <ArrowDownRight className="h-3 w-3" aria-hidden />}
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
        )}
        {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

/** Project portfolio value + cumulative net income 5 years forward. */
function projection(hs: Holding[], appreciationPct: number) {
  const value0 = hs.reduce((s, h) => s + h.currentValue, 0);
  const net0 = hs.reduce((s, h) => s + (h.monthlyRent * h.occupancyPct) / 100 - h.monthlyExpenses - h.mortgageMonthly, 0);
  const g = appreciationPct / 100;
  return Array.from({ length: 6 }, (_, y) => ({
    year: `Y${y}`,
    value: Math.round(value0 * (1 + g) ** y),
    income: Math.round(net0 * 12 * y),
  }));
}

export default function InvestorDashboardView() {
  const portfolio = usePortfolio();
  const tokenize = useTokenize();
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Holding>>({});

  const m = portfolio.metrics;

  const holdingRows = useMemo(
    () =>
      portfolio.holdings.map((h) => {
        const yieldPct = h.currentValue ? ((h.monthlyRent * 12) / h.currentValue) * 100 : 0;
        const appreciationPct = h.purchasePrice ? ((h.currentValue - h.purchasePrice) / h.purchasePrice) * 100 : 0;
        return { ...h, yieldPct, appreciationPct };
      }),
    [portfolio.holdings],
  );

  const areaMix = useMemo(() => {
    const byArea = new Map<string, number>();
    for (const h of portfolio.holdings) byArea.set(h.area, (byArea.get(h.area) ?? 0) + h.currentValue);
    const palette = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
    return [...byArea.entries()].map(([name, value], i) => ({ name, value, fill: palette[i % palette.length] }));
  }, [portfolio.holdings]);

  const series = useMemo(() => projection(portfolio.holdings, 7.2), [portfolio.holdings]);

  // tokenized holdings join (trial wallet positions)
  const tokenPositions = tokenize.investments.map((inv) => {
    const asset = tokenize.properties.find((p) => p.id === inv.propertyId);
    const price = tokenize.marketPrice(inv.propertyId);
    return { inv, asset, price };
  });
  const tokenValueUsd = tokenPositions.reduce((s, t) => s + t.inv.tokenAmount * t.price, 0);

  const downloadReport = () => {
    const rows = holdingRows
      .map(
        (h) =>
          `<tr><td>${h.label}</td><td style="text-align:right">${formatKES(h.currentValue)}</td><td style="text-align:right">${formatKES(h.monthlyRent)}/mo</td><td style="text-align:right">${h.yieldPct.toFixed(1)}%</td><td style="text-align:right">${h.appreciationPct >= 0 ? '+' : ''}${h.appreciationPct.toFixed(1)}%</td><td style="text-align:right">${h.occupancyPct}%</td></tr>`,
      )
      .join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Keja Investor Report</title>
<style>
  body{font-family:Georgia,serif;max-width:760px;margin:40px auto;color:#1a2b24;padding:0 24px}
  h1{font-size:26px;margin:0}h2{font-size:15px;margin:28px 0 10px;text-transform:uppercase;letter-spacing:.08em}
  .brand{color:#0e7a4e;font-weight:800}
  .sub{color:#6b7a72;font-size:13px;margin-top:4px}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:16px}
  .cell{border:1px solid #e3e8e4;border-radius:10px;padding:10px}
  .cell b{display:block;font-size:17px;margin-top:3px}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}
  th{text-align:left;border-bottom:2px solid #1a2b24;padding:6px 4px;font-size:11px;text-transform:uppercase;letter-spacing:.06em}
  td{border-bottom:1px solid #e9ede9;padding:7px 4px}
  .note{font-size:11px;color:#6b7a72;margin-top:28px;line-height:1.6}
</style></head><body>
<h1><span class="brand">Keja AI</span> — Investor Report</h1>
<p class="sub">Portfolio performance · generated ${new Date().toLocaleDateString('en-KE', { dateStyle: 'long' })} · trial platform, illustrative data</p>
<div class="grid">
  <div class="cell">Portfolio value<b>${formatKES(m.totalValue)}</b></div>
  <div class="cell">Invested capital<b>${formatKES(m.totalInvested)}</b></div>
  <div class="cell">Capital appreciation<b>+${m.appreciationPct.toFixed(1)}%</b></div>
  <div class="cell">Net rental yield<b>${m.netYield.toFixed(1)}% p.a.</b></div>
  <div class="cell">Gross rental yield<b>${m.grossYield.toFixed(1)}% p.a.</b></div>
  <div class="cell">Average occupancy<b>${m.occupancy.toFixed(0)}%</b></div>
  <div class="cell">Monthly net cash flow<b>${formatKES(Math.round(m.netMonthly))}</b></div>
  <div class="cell">Portfolio equity<b>${formatKES(m.equity)}</b></div>
  <div class="cell">Loan-to-value<b>${m.ltv.toFixed(0)}%</b></div>
</div>
<h2>Holdings</h2>
<table><thead><tr><th>Property</th><th style="text-align:right">Value</th><th style="text-align:right">Rent</th><th style="text-align:right">Yield</th><th style="text-align:right">Appreciation</th><th style="text-align:right">Occupancy</th></tr></thead>
<tbody>${rows}</tbody></table>
<h2>Tokenized positions (trial)</h2>
<p class="sub">${tokenPositions.length} positions · virtual value $${tokenValueUsd.toLocaleString()} · simulated ledger</p>
<h2>Notes</h2>
<p class="note">Figures marked as estimates derive from area intelligence and user inputs on the trial platform. This report is decision support only and does not constitute valuation, financial, legal or tax advice. Data Protection Act compliant: generated locally on your device.</p>
</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keja-investor-report-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Badge variant="outline" className="border-primary/40 font-bold text-primary">Keja Invest · Investor Dashboard</Badge>
          <h1 className="mt-2.5 text-3xl font-black tracking-tight sm:text-4xl">Your portfolio, fully instrumented</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {portfolio.holdings.length} holdings · demo portfolio on the trial platform — every figure editable.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="font-bold" onClick={downloadReport}>
            <Download className="mr-1.5 h-4 w-4" aria-hidden /> Download investor report
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="font-bold"><Plus className="mr-1.5 h-4 w-4" aria-hidden /> Add holding</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add a holding</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ['label', 'Label'], ['area', 'Area'], ['purchasePrice', 'Purchase price'], ['currentValue', 'Current value'],
                  ['monthlyRent', 'Monthly rent'], ['monthlyExpenses', 'Monthly expenses'],
                ] as const).map(([k, l]) => (
                  <div key={k} className="grid gap-1">
                    <Label htmlFor={`h-${k}`}>{l}</Label>
                    <Input
                      id={`h-${k}`}
                      type={k === 'label' || k === 'area' ? 'text' : 'number'}
                      value={(draft[k] as string | number | undefined) ?? ''}
                      onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
              <Button
                className="mt-2 font-bold"
                onClick={() => {
                  portfolio.add({
                    label: draft.label || 'New holding',
                    area: draft.area || 'Nairobi',
                    purchasePrice: Number(draft.purchasePrice) || 0,
                    currentValue: Number(draft.currentValue) || Number(draft.purchasePrice) || 0,
                    purchaseDate: new Date().toISOString().slice(0, 10),
                    monthlyRent: Number(draft.monthlyRent) || 0,
                    monthlyExpenses: Number(draft.monthlyExpenses) || 0,
                    mortgageBalance: 0,
                    mortgageMonthly: 0,
                    occupancyPct: 90,
                    sizeSqm: 0,
                    propertyId: '',
                  });
                  setDraft({});
                  setAddOpen(false);
                }}
              >
                Add to portfolio
              </Button>
            </DialogContent>
          </Dialog>
          <Button variant="ghost" size="icon" aria-label="Reset demo portfolio" onClick={portfolio.reset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* headline metrics */}
      <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Portfolio value" value={formatKES(m.totalValue)} sub={`equity ${formatKES(m.equity)}`} icon={Wallet} trend={m.appreciationPct} />
        <Metric label="Rental income" value={`${formatKES(Math.round(m.grossMonthly))}/mo`} sub={`net ${formatKES(Math.round(m.netMonthly))}/mo`} icon={Coins} />
        <Metric label="Net rental yield" value={`${m.netYield.toFixed(1)}%`} sub={`gross ${m.grossYield.toFixed(1)}%`} icon={TrendingUp} />
        <Metric label="Occupancy" value={`${m.occupancy.toFixed(0)}%`} sub={`LTV ${m.ltv.toFixed(0)}%`} icon={Building2} />
      </div>

      {/* charts row */}
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-3xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider">5-year projection</h2>
            <Badge variant="secondary" className="text-[10px] font-bold">Estimate · 7.2% p.a. growth</Badge>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="gValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="year" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickFormatter={(v: number) => `${Math.round(v / 1_000_000)}M`}
                />
                <Tooltip
                  formatter={(v, n) => [formatKES(Number(v ?? 0)), n === 'value' ? 'Portfolio value' : 'Cumulative net income']}
                  contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="value" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#gValue)" />
                <Area type="monotone" dataKey="income" stroke="var(--chart-2)" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
            <PieIcon className="h-4 w-4 text-gold" aria-hidden /> Allocation by area
          </h2>
          <div className="mt-2 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={areaMix} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={3} strokeWidth={0}>
                  {areaMix.map((e) => (
                    <Cell key={e.name} fill={e.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => formatKES(Number(v ?? 0))}
                  contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            {areaMix.map((e) => (
              <span key={e.name} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: e.fill }} aria-hidden /> {e.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* holdings table */}
      <div className="mt-6 overflow-hidden rounded-3xl border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-sm font-black uppercase tracking-wider">Property holdings</h2>
          <span className="text-[11px] font-semibold text-muted-foreground">editable · stored on this device</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-accent/40 text-left text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3">Property</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3 text-right">Rent/mo</th>
                <th className="px-4 py-3 text-right">Yield</th>
                <th className="px-4 py-3 text-right">Appreciation</th>
                <th className="px-4 py-3">Occupancy</th>
                <th className="px-4 py-3 text-right">Loan balance</th>
                <th className="px-4 py-3" aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {holdingRows.map((h) => (
                <tr key={h.id} className="border-b transition-colors last:border-0 hover:bg-accent/30">
                  <td className="px-5 py-3.5">
                    <p className="font-bold">{h.label}</p>
                    <p className="text-xs text-muted-foreground">{h.area} · bought {new Date(h.purchaseDate).getFullYear()}</p>
                  </td>
                  <td className="px-4 py-3.5 text-right font-black tabular-nums">{formatKES(h.currentValue)}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums">{formatKES(h.monthlyRent)}</td>
                  <td className="px-4 py-3.5 text-right font-bold tabular-nums text-primary">{h.yieldPct.toFixed(1)}%</td>
                  <td className="px-4 py-3.5 text-right tabular-nums">
                    <span className={cn('font-bold', h.appreciationPct >= 0 ? 'text-primary' : 'text-destructive')}>
                      {h.appreciationPct >= 0 ? '+' : ''}{h.appreciationPct.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <Progress value={h.occupancyPct} className="h-1.5 w-16" aria-label={`${h.occupancyPct}% occupancy`} />
                      <span className="text-xs font-bold tabular-nums">{h.occupancyPct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums">{h.mortgageBalance ? formatKES(h.mortgageBalance) : '—'}</td>
                  <td className="px-4 py-3.5 text-right">
                    <Button variant="ghost" size="sm" aria-label={`Remove ${h.label}`} onClick={() => portfolio.remove(h.id)}>
                      ✕
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* financing + tokenized */}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
            <Landmark className="h-4 w-4 text-gold" aria-hidden /> Financing snapshot
          </h2>
          <div className="mt-4 space-y-3">
            {[
              ['Total debt', formatKES(m.debtBalance)],
              ['Portfolio equity', formatKES(m.equity)],
              ['Loan-to-value', `${m.ltv.toFixed(1)}%`],
              ['Debt service / month', formatKES(portfolio.holdings.reduce((s, h) => s + h.mortgageMonthly, 0))],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between border-b border-dashed border-border pb-2.5 text-sm last:border-0">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-black tabular-nums">{v}</span>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
              <span>Equity</span><span>Debt</span>
            </div>
            <div className="mt-1 flex h-3 overflow-hidden rounded-full">
              <div className="bg-primary" style={{ width: `${100 - m.ltv}%` }} aria-hidden />
              <div className="bg-gold" style={{ width: `${m.ltv}%` }} aria-hidden />
            </div>
          </div>
          <Button variant="outline" size="sm" className="mt-4 w-full font-bold" onClick={() => navigate('/finance')}>
            Refinance or compare lenders →
          </Button>
        </div>

        <div className="rounded-3xl border border-gold/40 bg-gold-soft p-5">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-gold-foreground">
            <Coins className="h-4 w-4" aria-hidden /> Tokenized positions · trial
          </h2>
          {tokenPositions.length === 0 ? (
            <div className="mt-4 text-center">
              <p className="text-sm font-semibold text-gold-foreground/80">
                No token positions yet — the trial wallet holds ${tokenize.walletUsd.toLocaleString()}.
              </p>
              <Button size="sm" className="mt-3 bg-gold font-black text-gold-foreground hover:bg-gold/90" onClick={() => navigate('/tokenize')}>
                Browse tokenized assets
              </Button>
            </div>
          ) : (
            <>
              <p className="mt-2 text-2xl font-black tabular-nums text-gold-foreground">
                ${tokenValueUsd.toLocaleString()}
                <span className="text-sm font-bold text-gold-foreground/60"> virtual value</span>
              </p>
              <div className="mt-3 space-y-2">
                {tokenPositions.slice(0, 4).map(({ inv, asset }) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-xl bg-card/70 px-3 py-2 text-xs">
                    <span className="font-bold">{asset?.title ?? inv.propertyId}</span>
                    <span className="tabular-nums">{inv.tokenAmount.toLocaleString()} tokens</span>
                  </div>
                ))}
              </div>
              <Button size="sm" variant="outline" className="mt-3 w-full border-gold/50 font-bold" onClick={() => navigate('/tokenize?tab=portfolio')}>
                Open token portfolio →
              </Button>
            </>
          )}
        </div>
      </div>

      {/* rental income bar */}
      <div className="mt-6 rounded-3xl border bg-card p-5">
        <h2 className="text-sm font-black uppercase tracking-wider">Monthly rental income by holding</h2>
        <div className="mt-4 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={holdingRows.map((h) => ({ name: h.label.split('·')[0].trim(), rent: Math.round((h.monthlyRent * h.occupancyPct) / 100) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
              <Tooltip
                formatter={(v) => [formatKES(Number(v ?? 0)), 'Effective rent']}
                contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
              />
              <Bar dataKey="rent" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
