/**
 * Developer Console (/develop) — land & development feasibility workspace.
 *
 * Screening-grade math (ESTIMATE class): input form → live feasibility
 * (cost stack, GDV, margin, break-even) → monthly cashflow chart with a
 * peak-funding reference line → 5×5 build-cost vs price sensitivity grid →
 * demand snapshot + land-banking shield from live marketplace comps.
 * Projects persist locally under 'keja:dev-projects'.
 */
import { m } from 'framer-motion';
import {
  Building2,
  Calculator,
  Coins,
  FolderOpen,
  Grid3x3,
  HardHat,
  Info,
  Landmark,
  MapPin,
  Printer,
  Save,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { areaInsights } from '@/data/properties';
import {
  areaLandPriceKesPerAcre,
  computeCashflow,
  computeFeasibility,
  DEFAULT_DEV_INPUTS,
  type DevFeasibilityInputs,
  type DevProject,
  newDevProject,
  sensitivity,
  useDevProjects,
} from '@/lib/devStore';
import { isRentalPrice } from '@/lib/finance';
import { formatKES, formatNumber } from '@/lib/format';
import { marketInventory } from '@/lib/inventory';
import { usePageMeta } from '@/lib/seo';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6 },
};

/** Verdict bands for gross margin on GDV (screening thresholds, ESTIMATE). */
function verdictFor(margin: number): { label: string; tone: string } {
  if (margin >= 25) {
    return {
      label: 'Attractive — ESTIMATE',
      tone: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    };
  }
  if (margin >= 18) {
    return { label: 'Feasible — ESTIMATE', tone: 'bg-gold-100 text-ink ring-1 ring-gold-300' };
  }
  return { label: 'Marginal — ESTIMATE', tone: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200' };
}

/** Sensitivity cell tones: green ≥25%, gold 18–25%, red <18%. No blue. */
function marginTone(margin: number): string {
  if (margin >= 25) return 'bg-emerald-50 text-emerald-700';
  if (margin >= 18) return 'bg-gold-100 text-ink';
  return 'bg-red-50 text-red-700';
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  display,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  display: string;
  hint?: string;
}) {
  return (
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
        aria-label={label}
      />
      {hint ? <p className="mt-1 text-[11px] text-ink-faint">{hint}</p> : null}
    </div>
  );
}

export default function DeveloperConsole() {
  usePageMeta(
    'Developer Console — Land & Development Feasibility',
    'Screen Kenyan development deals before you buy the land: cost stack, GDV, margin, peak funding, payback and a build-cost vs price sensitivity grid — clearly labelled estimates.'
  );

  const [name, setName] = useState('Riverside scheme — screening');
  const [inputs, setInputs] = useState<DevFeasibilityInputs>(DEFAULT_DEV_INPUTS);
  const [area, setArea] = useState('Kilimani');
  const [projects, setProjects] = useDevProjects();
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 2600);
    return () => window.clearTimeout(t);
  }, [flash]);

  const MARKET = useMemo(() => marketInventory(), []);
  const areas = useMemo(
    () => Array.from(new Set([...Object.keys(areaInsights), ...MARKET.map((p) => p.area)])).sort(),
    [MARKET]
  );

  const landPrice = useMemo(() => areaLandPriceKesPerAcre(area), [area]);
  const feas = useMemo(
    () => computeFeasibility(inputs, landPrice ?? undefined),
    [inputs, landPrice]
  );
  const cash = useMemo(() => computeCashflow(inputs), [inputs]);
  const grid = useMemo(() => sensitivity(inputs), [inputs]);

  const patch = (p: Partial<DevFeasibilityInputs>) => setInputs((prev) => ({ ...prev, ...p }));
  const updateMix = (idx: number, key: 'type' | 'count' | 'priceKes', value: number | string) =>
    setInputs((prev) => ({
      ...prev,
      unitMix: prev.unitMix.map((u, i) => (i === idx ? { ...u, [key]: value } : { ...u })),
    }));
  const addMixRow = () =>
    setInputs((prev) => ({
      ...prev,
      unitMix: [...prev.unitMix, { type: 'villa', count: 4, priceKes: 20_000_000 }],
    }));
  const removeMixRow = (idx: number) =>
    setInputs((prev) => ({ ...prev, unitMix: prev.unitMix.filter((_, i) => i !== idx) }));

  const save = () => {
    const project = newDevProject(name, inputs);
    setProjects((prev) => [project, ...prev]);
    setFlash(`Saved “${project.name}” to this device (demo store).`);
  };
  const load = (project: DevProject) => {
    setInputs(project.inputs);
    setName(project.name);
    setFlash(`Loaded “${project.name}”.`);
  };
  const remove = (id: string) => setProjects((prev) => prev.filter((p) => p.id !== id));

  // Demand snapshot (live inventory only — no invented figures)
  const areaListings = MARKET.filter((p) => p.area === area);
  const salePrices = areaListings
    .filter((p) => p.price > 0 && !isRentalPrice(p.price))
    .map((p) => p.price);
  const medianAsking = median(salePrices);
  const insight = areaInsights[area];
  const demandLabel =
    areaListings.length >= 8
      ? 'Deep market — strong comparable depth (ESTIMATE)'
      : areaListings.length >= 3
        ? 'Active market — healthy comparable depth (ESTIMATE)'
        : areaListings.length >= 1
          ? 'Thin market — few live comparables (ESTIMATE)'
          : 'No live comparables — verify demand independently';

  const verdict = verdictFor(feas.grossMarginPct);

  const stats: { label: string; value: string; good?: boolean }[] = [
    { label: 'Total cost', value: formatKES(feas.totalCostKes) },
    { label: 'GDV', value: formatKES(feas.gdvKes), good: feas.gdvKes > 0 },
    { label: 'Profit', value: formatKES(feas.profitKes), good: feas.profitKes > 0 },
    {
      label: 'Gross margin',
      value: `${feas.grossMarginPct.toFixed(1)}%`,
      good: feas.grossMarginPct >= 18,
    },
    { label: 'Peak funding', value: formatKES(cash.peakFundingKes) },
    {
      label: 'Payback',
      value: cash.paybackMonth !== null ? `Month ${cash.paybackMonth}` : '—',
      good: cash.paybackMonth !== null,
    },
    {
      label: 'Absorption',
      value: Number.isFinite(feas.absorptionMonths)
        ? `${feas.absorptionMonths.toFixed(1)} mo`
        : '—',
    },
    {
      label: 'Break-even units',
      value: `${formatNumber(feas.breakEvenUnits)} of ${formatNumber(feas.totalUnits)}`,
      good: feas.breakEvenUnits <= feas.totalUnits,
    },
  ];

  // Pure cumulative series (no render-time mutation — React Compiler friendly)
  const cumRevenueM = cash.months.map((_, i) =>
    Math.round(cash.months.slice(0, i + 1).reduce((s, r) => s + r.revenueKes, 0) / 1_000_000)
  );
  const chartData = cash.months.map((row, i) => ({
    m: `M${row.month}`,
    rev: cumRevenueM[i],
    net: Math.round(row.cumNetKes / 1_000_000),
  }));
  const totalInterest = cash.months.reduce((s, row) => s + row.interestKes, 0);

  return (
    <div className="bg-cream/60">
      <section className="bg-ink py-16 sm:py-20">
        <div className="container-luxe max-w-3xl text-center">
          <p className="eyebrow !text-gold-400">For land developers & housing builders</p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
            Developer <span className="gold-text">console</span>
          </h1>
          <p className="mt-6 leading-relaxed text-white/65">
            Screen the deal before you buy the land. Units, sellable GFA, cost stack, gross
            development value, margin, peak funding and payback — with the assumptions on the table,
            not in a black box.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {['Feasibility', 'Cashflow', 'Sensitivity', 'Demand snapshot'].map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-gold-500/40 px-3 py-1 text-xs font-semibold text-gold-200"
              >
                {chip}
              </span>
            ))}
            <span className="rounded-full bg-gold-gradient px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-gold-sm">
              ESTIMATE math
            </span>
          </div>
        </div>
      </section>

      <div className="container-luxe py-10 sm:py-14">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          {/* ------------------------------ inputs ------------------------------ */}
          <m.div {...fadeUp} className="card-luxe space-y-6 p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
                <Calculator className="h-5 w-5 text-gold-600" /> Feasibility inputs
              </h2>
              <span className="chip">ESTIMATE — screening</span>
            </div>

            <div>
              <label htmlFor="dev-name" className="label-luxe">
                Project name
              </label>
              <input
                id="dev-name"
                className="input-luxe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Syokimau courtyard scheme"
              />
            </div>

            <div className="space-y-5 rounded-xl bg-cream/70 p-4">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold-700">
                <Landmark className="h-4 w-4" /> Land
              </h3>
              <Slider
                label="Land cost"
                value={inputs.landCostKes}
                onChange={(v) => patch({ landCostKes: v })}
                min={1_000_000}
                max={500_000_000}
                step={1_000_000}
                display={formatKES(inputs.landCostKes)}
              />
              <Slider
                label="Land size"
                value={inputs.landAcres}
                onChange={(v) => patch({ landAcres: v })}
                min={0.5}
                max={50}
                step={0.5}
                display={`${inputs.landAcres} acres`}
              />
              <Slider
                label="Plot ratio (density)"
                value={inputs.plotRatio}
                onChange={(v) => patch({ plotRatio: v })}
                min={4}
                max={100}
                step={1}
                display={`${inputs.plotRatio} units/acre`}
                hint="Allowed units per acre — the density cap your mix must fit inside"
              />
            </div>

            <div className="space-y-5 rounded-xl bg-cream/70 p-4">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold-700">
                <HardHat className="h-4 w-4" /> Construction
              </h3>
              <Slider
                label="Build cost"
                value={inputs.buildCostPerSqmKes}
                onChange={(v) => patch({ buildCostPerSqmKes: v })}
                min={20_000}
                max={120_000}
                step={500}
                display={`${formatKES(inputs.buildCostPerSqmKes)}/sqm`}
                hint="Applied to constructed GFA (sellable ÷ efficiency share)"
              />
              <Slider
                label="Avg unit size"
                value={inputs.avgUnitSizeSqm}
                onChange={(v) => patch({ avgUnitSizeSqm: v })}
                min={40}
                max={250}
                step={5}
                display={`${inputs.avgUnitSizeSqm} sqm`}
                hint="Saleable area per unit across the mix"
              />
              <Slider
                label="Efficiency (sellable share)"
                value={inputs.efficiencyPct}
                onChange={(v) => patch({ efficiencyPct: v })}
                min={50}
                max={95}
                step={1}
                display={`${inputs.efficiencyPct}%`}
                hint="Sellable GFA share — corridors and common areas must still be built"
              />
            </div>

            <div className="space-y-3 rounded-xl bg-cream/70 p-4">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold-700">
                <Building2 className="h-4 w-4" /> Unit mix
              </h3>
              {inputs.unitMix.map((u, i) => (
                <div
                  key={i}
                  className="grid gap-2 rounded-xl bg-white p-3 ring-1 ring-gold-100 sm:grid-cols-[9rem_5.5rem_1fr_2.75rem]"
                >
                  <div>
                    <label htmlFor={`mix-type-${i}`} className="label-luxe !mb-1 !text-[10px]">
                      Type
                    </label>
                    <select
                      id={`mix-type-${i}`}
                      className="input-luxe !py-2"
                      value={u.type}
                      onChange={(e) => updateMix(i, 'type', e.target.value)}
                    >
                      <option value="apartment">Apartment</option>
                      <option value="townhouse">Townhouse</option>
                      <option value="villa">Villa</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`mix-count-${i}`} className="label-luxe !mb-1 !text-[10px]">
                      Units
                    </label>
                    <input
                      id={`mix-count-${i}`}
                      type="number"
                      min={0}
                      step={1}
                      className="input-luxe !py-2"
                      value={u.count}
                      onChange={(e) =>
                        updateMix(i, 'count', Math.max(0, Number(e.target.value) || 0))
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor={`mix-price-${i}`} className="label-luxe !mb-1 !text-[10px]">
                      Price (KES)
                    </label>
                    <input
                      id={`mix-price-${i}`}
                      type="number"
                      min={0}
                      step={100_000}
                      className="input-luxe !py-2"
                      value={u.priceKes}
                      onChange={(e) =>
                        updateMix(i, 'priceKes', Math.max(0, Number(e.target.value) || 0))
                      }
                    />
                    <p className="mt-1 text-[10px] text-ink-faint">{formatKES(u.priceKes)} each</p>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeMixRow(i)}
                      disabled={inputs.unitMix.length <= 1}
                      aria-label={`Remove ${u.type} row`}
                      className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-muted transition hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-gold-300 disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addMixRow}
                className="btn-outline !px-4 !py-2.5 !text-xs"
              >
                + Add unit type
              </button>
            </div>

            <div className="space-y-5 rounded-xl bg-cream/70 p-4">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold-700">
                <Coins className="h-4 w-4" /> Sales & finance
              </h3>
              <Slider
                label="Sales rate"
                value={inputs.monthlySalesRate}
                onChange={(v) => patch({ monthlySalesRate: v })}
                min={0.5}
                max={10}
                step={0.5}
                display={`${inputs.monthlySalesRate}/mo`}
                hint="Units sold per month — drives absorption and the cashflow curve"
              />
              <Slider
                label="Soft costs"
                value={inputs.softCostPct}
                onChange={(v) => patch({ softCostPct: v })}
                min={5}
                max={25}
                step={0.5}
                display={`${inputs.softCostPct.toFixed(1)}%`}
                hint="Fees, approvals, design — share of hard cost"
              />
              <Slider
                label="Marketing"
                value={inputs.marketingPct}
                onChange={(v) => patch({ marketingPct: v })}
                min={1}
                max={10}
                step={0.5}
                display={`${inputs.marketingPct.toFixed(1)}%`}
                hint="Share of GDV"
              />
              <Slider
                label="Finance rate"
                value={inputs.financeRatePct}
                onChange={(v) => patch({ financeRatePct: v })}
                min={8}
                max={25}
                step={0.25}
                display={`${inputs.financeRatePct.toFixed(2)}% p.a.`}
                hint="Charged monthly on the drawn balance (ESTIMATE)"
              />
            </div>

            <p className="text-[11px] leading-relaxed text-ink-muted">
              Contingency is fixed at 5% of hard + soft costs. Every figure here is screening math —
              validate assumptions with your QS and lender.
            </p>
          </m.div>

          {/* ------------------------------ results ------------------------------ */}
          <div className="space-y-6">
            <m.div {...fadeUp} className="card-luxe p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
                  <TrendingUp className="h-5 w-5 text-gold-600" /> Live feasibility
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold ${verdict.tone}`}
                >
                  {verdict.label}
                </span>
              </div>

              {feas.totalUnits > feas.densityCapUnits ? (
                <p className="mt-4 rounded-xl bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-800 ring-1 ring-amber-200">
                  The mix ({formatNumber(feas.totalUnits)} units) exceeds the density cap of{' '}
                  {formatNumber(feas.densityCapUnits)} units ({inputs.landAcres} acres ×{' '}
                  {inputs.plotRatio}/acre). ESTIMATE screening only — confirm zoning with a physical
                  planner before spending anything.
                </p>
              ) : null}

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className={`rounded-2xl p-4 text-center shadow-card ring-1 ${s.good ? 'bg-ink ring-gold-600/40' : 'bg-white ring-gold-100'}`}
                  >
                    <p
                      className={`font-display text-lg font-bold sm:text-xl ${s.good ? 'text-gold-300' : 'text-ink'}`}
                    >
                      {s.value}
                    </p>
                    <p
                      className={`mt-1 text-[10px] font-semibold uppercase tracking-wider ${s.good ? 'text-white/50' : 'text-ink-faint'}`}
                    >
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-3 rounded-xl bg-cream/70 p-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                    Sellable GFA
                  </p>
                  <p className="mt-0.5 font-bold text-ink">
                    {formatNumber(feas.sellableGfaSqm)} sqm
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                    Constructed GFA
                  </p>
                  <p className="mt-0.5 font-bold text-ink">{formatNumber(feas.grossGfaSqm)} sqm</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                    Cost per unit
                  </p>
                  <p className="mt-0.5 font-bold text-ink">{formatKES(feas.costPerUnitKes)}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-ink-muted">
                <span className="chip">Land {formatKES(feas.landCostKes)}</span>
                <span className="chip">Hard {formatKES(feas.hardCostKes)}</span>
                <span className="chip">Soft {formatKES(feas.softCostKes)}</span>
                <span className="chip">Marketing {formatKES(feas.marketingKes)}</span>
                <span className="chip">Contingency {formatKES(feas.contingencyKes)}</span>
              </div>
            </m.div>

            {/* cashflow chart */}
            <m.div {...fadeUp} className="card-luxe p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
                  <Coins className="h-5 w-5 text-gold-600" /> Monthly cashflow — ESTIMATE
                </h3>
                <span className="text-[11px] font-semibold text-ink-muted">
                  {formatNumber(cash.months.length - 1)} sales months · S-curve build
                </span>
              </div>

              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gDevRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C6A34F" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#C6A34F" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gDevNet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0E7A5F" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#0E7A5F" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0E8D5" />
                    <XAxis dataKey="m" tick={{ fontSize: 11, fill: '#8F887C' }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#8F887C' }}
                      tickFormatter={(v) => `${v}M`}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        `${Number(value).toLocaleString()}M`,
                        String(name),
                      ]}
                      contentStyle={{ borderRadius: 12, border: '1px solid #EAD8A0', fontSize: 12 }}
                    />
                    <ReferenceLine
                      y={Math.round(-cash.peakFundingKes / 1_000_000)}
                      stroke="#8F887C"
                      strokeDasharray="4 4"
                      label={{
                        value: 'Peak funding',
                        fontSize: 10,
                        fill: '#8F887C',
                        position: 'insideTopRight',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="rev"
                      name="Cumulative revenue"
                      stroke="#A88430"
                      strokeWidth={2}
                      fill="url(#gDevRev)"
                    />
                    <Area
                      type="monotone"
                      dataKey="net"
                      name="Cumulative net"
                      stroke="#0E7A5F"
                      strokeWidth={2}
                      fill="url(#gDevNet)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 grid gap-3 rounded-xl bg-cream/70 p-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                    Peak funding
                  </p>
                  <p className="mt-0.5 font-bold text-ink">{formatKES(cash.peakFundingKes)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                    Finance interest
                  </p>
                  <p className="mt-0.5 font-bold text-ink">{formatKES(totalInterest)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                    Payback
                  </p>
                  <p className="mt-0.5 font-bold text-ink">
                    {cash.paybackMonth !== null ? `Month ${cash.paybackMonth}` : 'Never — re-model'}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">
                Land lands in month 0; construction ramps over the first 70% of the absorption
                window; interest accrues on the drawn balance. Phasing is a screening model — your
                QS&rsquo;s programme governs.
              </p>
            </m.div>

            {/* sensitivity grid */}
            <m.div {...fadeUp} className="card-luxe p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
                  <Grid3x3 className="h-5 w-5 text-gold-600" /> Sensitivity — margin
                </h3>
                <span className="chip">ESTIMATE</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                Gross margin if build cost and sales prices move ±10/±20%. Green ≥25% · gold 18–25%
                · red &lt;18%.
              </p>
              <div className="mt-4 overflow-x-auto rounded-xl ring-1 ring-gold-100">
                <table className="w-full min-w-[26rem] border-collapse text-center text-xs">
                  <caption className="sr-only">
                    Gross margin percentage by build-cost and sales-price change
                  </caption>
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="px-2 py-2 text-[10px] uppercase tracking-wider text-ink-muted"
                      >
                        Build ↓ / Price →
                      </th>
                      {grid.priceDeltas.map((d) => (
                        <th
                          scope="col"
                          key={d}
                          className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted"
                        >
                          {d > 0 ? `+${d}%` : `${d}%`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {grid.cells.map((row, i) => (
                      <tr key={grid.buildCostDeltas[i]}>
                        <th
                          scope="row"
                          className="border-t border-gold-50 px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted"
                        >
                          {grid.buildCostDeltas[i] > 0
                            ? `+${grid.buildCostDeltas[i]}%`
                            : `${grid.buildCostDeltas[i]}%`}
                        </th>
                        {row.map((cell, j) => (
                          <td
                            key={j}
                            className={`border-t border-gold-50 px-2 py-2 font-semibold tabular-nums ${marginTone(cell)} ${
                              i === 2 && j === 2 ? 'ring-2 ring-inset ring-gold-400' : ''
                            }`}
                          >
                            {cell.toFixed(1)}%
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </m.div>

            {/* demand snapshot */}
            <m.div {...fadeUp} className="card-luxe p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
                  <MapPin className="h-5 w-5 text-gold-600" /> Demand snapshot
                </h3>
                <span className="chip">ESTIMATE</span>
              </div>

              <div className="mt-4 max-w-xs">
                <label htmlFor="dev-area" className="label-luxe">
                  Area
                </label>
                <select
                  id="dev-area"
                  className="input-luxe"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                >
                  {areas.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  {
                    label: 'Active listings',
                    value: formatNumber(areaListings.length),
                    note: 'live on Keja',
                  },
                  {
                    label: 'Median asking',
                    value: medianAsking !== null ? formatKES(medianAsking) : '—',
                    note: 'sale listings',
                  },
                  {
                    label: 'Yield band',
                    value: insight ? insight.yield : '—',
                    note: 'area insight',
                  },
                  {
                    label: 'Price / sqm band',
                    value: insight ? insight.avgPricePerSqm : '—',
                    note: 'area insight',
                  },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-cream/70 p-3.5 text-center">
                    <p className="text-sm font-bold text-ink">{s.value}</p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                      {s.label}
                    </p>
                    <p className="text-[10px] text-ink-faint">{s.note}</p>
                  </div>
                ))}
              </div>

              <p className="mt-4 rounded-xl bg-gold-50 p-3.5 text-xs leading-relaxed text-ink-soft">
                <b>{area}:</b> {demandLabel}. {insight ? insight.note : ''}
              </p>

              <p className="mt-3 rounded-xl bg-cream/70 p-3.5 text-xs leading-relaxed text-ink-soft">
                {landPrice !== null ? (
                  <>
                    <b>Land-banking shield (ESTIMATE):</b> your {inputs.landAcres} acres are worth ≈{' '}
                    {formatKES(feas.landBankingKes ?? 0)} as undeveloped land at{' '}
                    {formatKES(landPrice)}
                    /acre — the median of live land comps in {area}. If the scheme margin is thin,
                    doing nothing still holds this value.
                  </>
                ) : (
                  <>
                    <b>Land-banking shield:</b> no live land comps in {area} — the undeveloped-land
                    view is skipped rather than invented. Browse land listings to build comps.
                  </>
                )}
              </p>
            </m.div>
          </div>
        </div>

        {/* ------------------------------ projects ------------------------------ */}
        <m.div {...fadeUp} className="card-luxe mx-auto mt-6 max-w-4xl p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
              <Save className="h-5 w-5 text-gold-600" /> Saved projects
            </h2>
            <span className="chip">DEMO — stored on this device</span>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={save} className="btn-gold sm:w-auto">
              <Save className="h-4 w-4" /> Save current inputs
            </button>
            {flash ? (
              <p
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700"
                role="status"
              >
                {flash}
              </p>
            ) : null}
          </div>

          {projects.length === 0 ? (
            <p className="mt-4 rounded-xl bg-cream/70 p-4 text-sm text-ink-muted">
              No saved projects yet — tune the inputs above and save a screening to compare schemes
              later.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {projects.map((p) => {
                const pf = computeFeasibility(p.inputs);
                return (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl bg-cream/70 p-3.5 ring-1 ring-gold-100"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{p.name}</p>
                      <p className="mt-0.5 text-[11px] text-ink-muted">
                        {formatNumber(pf.totalUnits)} units · margin {pf.grossMarginPct.toFixed(1)}%
                        · {formatKES(pf.totalCostKes)} · saved{' '}
                        {new Date(p.createdAt).toLocaleDateString('en-KE')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => load(p)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gold-500/60 px-3.5 py-2 text-xs font-semibold text-gold-700 transition hover:bg-gold-50 focus-visible:ring-2 focus-visible:ring-gold-300"
                      >
                        <FolderOpen className="h-3.5 w-3.5" /> Load
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(p.id)}
                        aria-label={`Delete ${p.name}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-gold-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </m.div>

        {/* ------------------------------ notice + print ------------------------------ */}
        <m.div
          {...fadeUp}
          className="card-luxe mx-auto mt-6 flex max-w-4xl flex-col gap-4 p-6 sm:flex-row sm:items-center"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-gradient shadow-gold-sm">
            <Info className="h-5 w-5 text-white" />
          </span>
          <p className="flex-1 text-xs leading-relaxed text-ink-muted">
            All figures are <b>ESTIMATE</b>-class feasibility math for screening only — not
            investment advice. Area context and land values come from live Keja listings (comp
            medians); band thresholds are screening heuristics. Validate with a QS, valuer and
            lender before committing capital.
          </p>
          <button type="button" onClick={() => window.print()} className="btn-outline shrink-0">
            <Printer className="h-4 w-4" /> Print summary
          </button>
        </m.div>

        <m.div
          {...fadeUp}
          className="card-luxe mx-auto mt-6 flex max-w-4xl flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold-gradient shadow-gold-sm">
            <Building2 className="h-6 w-6 text-white" />
          </span>
          <div className="flex-1">
            <p className="font-display text-lg font-bold text-ink">
              Want this deal stress-tested on real inventory?
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              Ask Keja to compare your scheme against live land comps, area yield bands and verified
              listings — with every assumption labelled.
            </p>
          </div>
          <Link to="/ask" className="btn-gold shrink-0">
            Ask Keja
          </Link>
        </m.div>
      </div>
    </div>
  );
}
