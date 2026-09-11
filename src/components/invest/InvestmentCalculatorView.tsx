'use client';
/**
 * KEJA INVEST — investment calculator (proposal §2): purchase price, furnishing,
 * rent, occupancy → gross/net yield, payback, 5 & 10-year projections, plus
 * buying costs and mortgage integration. All inputs labelled FACT/ESTIMATE.
 */
import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, } from '@/components/charts/reexports';
import { Calculator, Home, LineChart, PiggyBank, Receipt, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { analyzeInvestment, estimateMonthlyExpenses } from '@/lib/finance';
import { formatKES } from '@/lib/format';
import { navigate } from '@/lib/router';
import { useStore } from '@/lib/store';
import { useAllProperties } from '@/lib/inventory';
import { cn } from '@/lib/utils';

export default function InvestmentCalculatorView() {
  const all = useAllProperties();
  const [favorites] = useStore<string[]>('favorites', []);
  const [price, setPrice] = useState(12_000_000);
  const [furnishing, setFurnishing] = useState(600_000);
  const [rent, setRent] = useState(95_000);
  const [occupancy, setOccupancy] = useState(92);
  const [expenses, setExpenses] = useState(28_000);
  const [appreciation, setAppreciation] = useState(7);
  const [rentGrowth, setRentGrowth] = useState(5);

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
  );

  const pick = (p: (typeof all)[number]) => {
    setPrice(p.price);
    if (p.rentEstimate) setRent(p.rentEstimate);
    if (p.sizeSqm) setExpenses(estimateMonthlyExpenses(p.price, p.rentEstimate ?? rent, p.sizeSqm));
  };

  const y10 = result.year10[9];
  const totalReturn = y10 ? y10.equityPlusIncome - result.totalInvestment : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="max-w-2xl">
        <Badge variant="outline" className="border-primary/40 font-bold text-primary">Keja Invest</Badge>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">The investment calculator</h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Model the whole thesis before you commit: yield, payback, cash flow and 10-year
          projections with rent growth and vacancy assumptions you control. Everything computes
          live; every output is an ESTIMATE until your own diligence confirms it.
        </p>
      </div>

      {favorites.length > 0 && (
        <div className="mt-6 rounded-2xl border bg-card p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Load from your saved properties</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {all
              .filter((p) => favorites.includes(p.id))
              .slice(0, 6)
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => pick(p)}
                  className="rounded-full border px-3 py-1.5 text-xs font-bold hover:border-primary"
                >
                  {p.title.slice(0, 28)} · {p.priceOnApplication ? 'POA' : formatKES(p.price)}
                </button>
              ))}
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* inputs */}
        <div className="space-y-5 rounded-3xl border bg-card p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
            <Calculator className="h-4 w-4 text-gold" aria-hidden /> Deal inputs
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="ic-price">Purchase price (KES)</Label>
              <Input id="ic-price" type="number" step={250_000} value={price || ''} onChange={(e) => setPrice(Number(e.target.value))} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ic-furn">Furnishing (KES)</Label>
              <Input id="ic-furn" type="number" step={50_000} value={furnishing || ''} onChange={(e) => setFurnishing(Number(e.target.value))} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ic-rent">Monthly rent (KES)</Label>
              <Input id="ic-rent" type="number" step={5_000} value={rent || ''} onChange={(e) => setRent(Number(e.target.value))} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ic-exp">Monthly expenses (KES)</Label>
              <Input id="ic-exp" type="number" step={1_000} value={expenses || ''} onChange={(e) => setExpenses(Number(e.target.value))} />
            </div>
          </div>
          <div className="grid gap-4">
            {[
              { label: `Occupancy — ${occupancy}%`, value: occupancy, set: setOccupancy, min: 50, max: 100, step: 1 },
              { label: `Capital appreciation — ${appreciation}%/yr`, value: appreciation, set: setAppreciation, min: 0, max: 15, step: 0.5 },
              { label: `Rent growth — ${rentGrowth}%/yr`, value: rentGrowth, set: setRentGrowth, min: 0, max: 12, step: 0.5 },
            ].map((s) => (
              <div key={s.label} className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label>{s.label}</Label>
                </div>
                <Slider min={s.min} max={s.max} step={s.step} value={[s.value]} onValueChange={([v]) => s.set(v)} aria-label={s.label} />
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-accent/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
            Expenses include service charge, management, insurance and rates — estimate with{' '}
            <strong className="text-foreground">estimateMonthlyExpenses()</strong> defaults or override with your own figures.
          </div>
        </div>

        {/* outputs */}
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {[
              { l: 'Gross yield', v: `${result.grossYield.toFixed(1)}%`, icon: TrendingUp },
              { l: 'Net yield', v: `${result.netYield.toFixed(1)}%`, icon: PiggyBank },
              { l: 'Payback period', v: Number.isFinite(result.paybackYears) ? `${result.paybackYears.toFixed(1)} yrs` : 'n/a', icon: Receipt },
              { l: 'Monthly cash flow', v: formatKES(Math.round(result.monthlyCashflow)), icon: Home },
            ].map((m) => (
              <div key={m.l} className="card-lift rounded-2xl border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">{m.l}</p>
                  <m.icon className="h-4 w-4 text-gold" aria-hidden />
                </div>
                <p className={cn('mt-2 text-xl font-black tabular-nums sm:text-2xl', m.l.includes('yield') && Number.parseFloat(m.v) >= 7 ? 'text-primary' : '')}>{m.v}</p>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
                <LineChart className="h-4 w-4 text-gold" aria-hidden /> 10-year projection
              </h2>
              <Badge variant="secondary" className="text-[10px] font-bold">ESTIMATE</Badge>
            </div>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.year10}>
                  <defs>
                    <linearGradient id="icV" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="icI" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(y: number) => `Y${y}`} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v: number) => `${Math.round(v / 1e6)}M`} />
                  <Tooltip
                    formatter={(v: number, n: string) => [formatKES(v), n === 'propertyValue' ? 'Property value' : 'Cumulative net income']}
                    labelFormatter={(y) => `Year ${y}`}
                    contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
                  />
                  <Legend formatter={(v: string) => (v === 'propertyValue' ? 'Property value' : 'Cumulative net income')} wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="propertyValue" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#icV)" />
                  <Area type="monotone" dataKey="cumulativeNet" stroke="var(--chart-2)" strokeWidth={2} fill="url(#icI)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {[
                ['Total invested', formatKES(result.totalInvestment)],
                ['10-yr equity + income', y10 ? formatKES(y10.equityPlusIncome) : '—'],
                ['10-yr total return', `${totalReturn >= 0 ? '+' : ''}${((totalReturn / Math.max(result.totalInvestment, 1)) * 100).toFixed(0)}%`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-accent/50 p-3">
                  <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">{k}</p>
                  <p className="mt-0.5 text-sm font-black tabular-nums">{v}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button className="font-bold" onClick={() => navigate('/portfolio')}>Open the investor dashboard</Button>
            <Button variant="outline" className="font-bold" onClick={() => navigate('/finance?price=' + price)}>Model the mortgage</Button>
            <Button variant="outline" className="font-bold" onClick={() => navigate('/data')}>Check market intelligence</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
