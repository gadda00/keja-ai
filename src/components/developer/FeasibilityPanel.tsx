'use client';
/**
 * FeasibilityPanel — the developer's scheme screening desk (wave 17).
 *
 * src/lib/devStore.ts shipped a complete feasibility engine (units, GDV,
 * cost stack, margin, cashflow, sensitivity) that NO component ever
 * imported — dead code while the developer portal was a static brochure.
 * This panel wires that engine to a real working surface:
 *
 *  - create / rename / delete schemes (persisted via the shared store);
 *  - live input editing (land, density, build cost, unit mix, finance) with
 *    metrics recomputing on every keystroke;
 *  - cashflow summary (peak funding, payback) and the ±10/±20% sensitivity
 *    grid;
 *  - the land-banking shield when the scheme's area has live land comps.
 *
 * Every figure remains ESTIMATE-grade screening math — labelled as such.
 */
import { useMemo, useState } from 'react';
import { Calculator, Layers, MapPin, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { areaInsights } from '@/data/areaInsights';
import {
  DEFAULT_DEV_INPUTS,
  areaLandPriceKesPerAcre,
  computeCashflow,
  computeFeasibility,
  newDevProject,
  sensitivity,
  useDevProjects,
  type DevFeasibilityInputs,
  type DevProject,
} from '@/lib/devStore';
import { formatKES } from '@/lib/format';
import { cn } from '@/lib/utils';

const AREAS = Object.keys(areaInsights).sort();

/** One labelled numeric input bound to a slice of the inputs object. */
function NumField({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  suffix?: string;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="relative">
        <Input
          type="number"
          min={min}
          step={step}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-8 pr-10 text-xs tabular-nums"
          aria-label={label}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">
            {suffix}
          </span>
        )}
      </span>
    </label>
  );
}

function MetricCell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-accent/50 p-3">
      <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn('mt-0.5 text-sm font-black tabular-nums', tone)}>{value}</p>
    </div>
  );
}

/** The 5×5 build-cost vs price sensitivity grid (gross margin %). */
function SensitivityGrid({ inputs }: { inputs: DevFeasibilityInputs }) {
  const grid = useMemo(() => sensitivity(inputs), [inputs]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[26rem] text-[11px]">
        <caption className="sr-only">Gross margin sensitivity — build cost vs sales price</caption>
        <thead>
          <tr>
            <th className="p-1.5 text-left text-[9px] font-black uppercase tracking-wider text-muted-foreground">
              Build ↓ / Price →
            </th>
            {grid.priceDeltas.map((d) => (
              <th key={d} className="p-1.5 text-center font-bold tabular-nums">
                {d > 0 ? `+${d}` : d}%
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.cells.map((row, i) => (
            <tr key={i}>
              <th className="p-1.5 text-left font-bold tabular-nums">
                {grid.buildCostDeltas[i] > 0 ? `+${grid.buildCostDeltas[i]}` : grid.buildCostDeltas[i]}%
              </th>
              {row.map((margin, j) => (
                <td
                  key={j}
                  className={cn(
                    'p-1.5 text-center font-black tabular-nums',
                    margin < 0
                      ? 'text-destructive'
                      : margin < 15
                        ? 'text-gold-foreground'
                        : 'text-primary',
                  )}
                >
                  {margin.toFixed(0)}%
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FeasibilityPanel() {
  const [projects, setProjects] = useDevProjects();
  const [selectedId, setSelectedId] = useState<string | null>(projects[0]?.id ?? null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const selected = projects.find((p) => p.id === selectedId) ?? projects[0];

  const patchInputs = (patch: Partial<DevFeasibilityInputs>) => {
    if (!selected) return;
    setProjects(
      projects.map((p) => (p.id === selected.id ? { ...p, inputs: { ...p.inputs, ...patch } } : p)),
    );
  };

  const patchMix = (index: number, patch: Partial<DevFeasibilityInputs['unitMix'][number]>) => {
    if (!selected) return;
    patchInputs({
      unitMix: selected.inputs.unitMix.map((u, i) => (i === index ? { ...u, ...patch } : u)),
    });
  };

  const createScheme = () => {
    const project = newDevProject(newName, DEFAULT_DEV_INPUTS, 'Kilimani');
    setProjects([project, ...projects]);
    setSelectedId(project.id);
    setNewName('');
    setCreating(false);
  };

  const deleteScheme = (id: string) => {
    const next = projects.filter((p) => p.id !== id);
    setProjects(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
  };

  const feasibility = useMemo(
    () =>
      selected
        ? computeFeasibility(
            selected.inputs,
            selected.area ? areaLandPriceKesPerAcre(selected.area) ?? undefined : undefined,
          )
        : null,
    [selected],
  );
  const cashflow = useMemo(() => (selected ? computeCashflow(selected.inputs) : null), [selected]);

  if (projects.length === 0 && !creating) {
    return (
      <div className="rounded-2xl border border-dashed bg-card/60 p-8 text-center">
        <Calculator className="mx-auto h-8 w-8 text-muted-foreground/40" aria-hidden />
        <p className="mt-3 text-sm font-bold">No schemes under screening yet</p>
        <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
          Model a development before capital meets concrete — units, GDV, cost stack, margin,
          peak funding and a ±10/±20% sensitivity grid, all estimate-grade screening math.
        </p>
        <Button className="mt-4 font-bold" onClick={() => setCreating(true)}>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden /> Screen a scheme
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {/* scheme tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {projects.map((p: DevProject) => (
          <button
            key={p.id}
            onClick={() => setSelectedId(p.id)}
            className={cn(
              'group flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors',
              selected?.id === p.id
                ? 'border-primary bg-primary/10 text-primary'
                : 'hover:border-primary/40',
            )}
            aria-current={selected?.id === p.id ? 'true' : undefined}
          >
            {p.name}
            <Trash2
              className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
              aria-label={`Delete ${p.name}`}
              onClick={(e) => {
                e.stopPropagation();
                deleteScheme(p.id);
              }}
            />
          </button>
        ))}
        {creating ? (
          <span className="flex items-center gap-1.5">
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && newName.trim() && createScheme()}
              placeholder="Scheme name — e.g. Ridgeways Court"
              className="h-8 w-52 text-xs"
              maxLength={60}
            />
            <Button size="sm" className="h-8 px-3 text-xs font-bold" onClick={createScheme} disabled={!newName.trim()}>
              Create
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs font-bold"
              onClick={() => {
                setCreating(false);
                setNewName('');
              }}
            >
              Cancel
            </Button>
          </span>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1 rounded-full border border-dashed px-3.5 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <Plus className="h-3 w-3" aria-hidden /> New scheme
          </button>
        )}
      </div>

      {selected && feasibility && cashflow && (
        <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
          {/* results */}
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-black">{selected.name}</h3>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" aria-hidden />
                  <select
                    value={selected.area ?? ''}
                    onChange={(e) =>
                      setProjects(
                        projects.map((p) =>
                          p.id === selected.id ? { ...p, area: e.target.value } : p,
                        ),
                      )
                    }
                    className="h-6 rounded border bg-background px-1.5 text-xs"
                    aria-label="Scheme area"
                  >
                    {AREAS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  'font-black tabular-nums',
                  feasibility.grossMarginPct >= 20
                    ? 'border-primary/40 text-primary'
                    : feasibility.grossMarginPct >= 10
                      ? 'border-gold/50 text-gold-foreground'
                      : 'border-destructive/40 text-destructive',
                )}
              >
                {feasibility.grossMarginPct.toFixed(1)}% gross margin
              </Badge>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <MetricCell label="Units" value={String(feasibility.totalUnits)} />
              <MetricCell label="GDV" value={formatKES(feasibility.gdvKes)} />
              <MetricCell label="Total cost" value={formatKES(feasibility.totalCostKes)} />
              <MetricCell
                label="Profit"
                value={formatKES(feasibility.profitKes)}
                tone={feasibility.profitKes >= 0 ? 'text-primary' : 'text-destructive'}
              />
              <MetricCell label="Break-even" value={`${feasibility.breakEvenUnits} units`} />
              <MetricCell
                label="Absorption"
                value={
                  Number.isFinite(feasibility.absorptionMonths)
                    ? `${feasibility.absorptionMonths.toFixed(0)} mo`
                    : '—'
                }
              />
              <MetricCell label="Peak funding" value={formatKES(cashflow.peakFundingKes)} />
              <MetricCell
                label="Payback"
                value={cashflow.paybackMonth === null ? 'never' : `month ${cashflow.paybackMonth}`}
                tone={cashflow.paybackMonth === null ? 'text-destructive' : 'text-primary'}
              />
              <MetricCell label="Cost / unit" value={formatKES(feasibility.costPerUnitKes)} />
            </div>

            {feasibility.landBankingKes && (
              <p className="mt-3 rounded-xl border border-gold/30 bg-gold-soft px-3.5 py-2.5 text-[11px] leading-relaxed text-gold-foreground">
                Land-banking shield: {selected.area} live land comps value the undeveloped plot at{' '}
                <strong>{formatKES(feasibility.landBankingKes)}</strong> — the downside case if the
                scheme never proceeds.
              </p>
            )}

            <div className="mt-4 border-t pt-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Sensitivity — gross margin %
              </p>
              <div className="mt-2">
                <SensitivityGrid inputs={selected.inputs} />
              </div>
            </div>

            <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
              ESTIMATE-grade screening math on your inputs. Area land prices are medians of live
              marketplace land comps only — no comps, no shield.
            </p>
          </div>

          {/* inputs editor */}
          <div className="rounded-2xl border bg-card p-5">
            <h3 className="flex items-center gap-1.5 text-sm font-black">
              <Layers className="h-4 w-4 text-primary" aria-hidden /> Scheme inputs
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <NumField
                label="Land cost"
                value={selected.inputs.landCostKes / 1e6}
                step={0.5}
                suffix="M"
                onChange={(v) => patchInputs({ landCostKes: v * 1e6 })}
              />
              <NumField
                label="Land area"
                value={selected.inputs.landAcres}
                step={0.5}
                suffix="ac"
                onChange={(v) => patchInputs({ landAcres: v })}
              />
              <NumField
                label="Density"
                value={selected.inputs.plotRatio}
                suffix="u/ac"
                onChange={(v) => patchInputs({ plotRatio: v })}
              />
              <NumField
                label="Build cost"
                value={selected.inputs.buildCostPerSqmKes / 1e3}
                step={1}
                suffix="k/m²"
                onChange={(v) => patchInputs({ buildCostPerSqmKes: v * 1e3 })}
              />
              <NumField
                label="Avg unit size"
                value={selected.inputs.avgUnitSizeSqm}
                suffix="m²"
                onChange={(v) => patchInputs({ avgUnitSizeSqm: v })}
              />
              <NumField
                label="Efficiency"
                value={selected.inputs.efficiencyPct}
                suffix="%"
                onChange={(v) => patchInputs({ efficiencyPct: v })}
              />
              <NumField
                label="Sales rate"
                value={selected.inputs.monthlySalesRate}
                step={0.5}
                suffix="u/mo"
                onChange={(v) => patchInputs({ monthlySalesRate: v })}
              />
              <NumField
                label="Finance rate"
                value={selected.inputs.financeRatePct}
                suffix="%"
                onChange={(v) => patchInputs({ financeRatePct: v })}
              />
              <NumField
                label="Soft costs"
                value={selected.inputs.softCostPct}
                suffix="%"
                onChange={(v) => patchInputs({ softCostPct: v })}
              />
              <NumField
                label="Marketing"
                value={selected.inputs.marketingPct}
                suffix="%"
                onChange={(v) => patchInputs({ marketingPct: v })}
              />
            </div>

            <div className="mt-5 border-t pt-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Unit mix
              </p>
              <div className="mt-2 grid gap-2">
                {selected.inputs.unitMix.map((u, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      value={u.type}
                      onChange={(e) =>
                        patchMix(i, { type: e.target.value as typeof u.type })
                      }
                      className="h-8 w-28 rounded-lg border bg-background px-2 text-xs capitalize"
                      aria-label={`Unit ${i + 1} type`}
                    >
                      {['apartment', 'townhouse', 'villa'].map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      min={0}
                      value={u.count}
                      onChange={(e) => patchMix(i, { count: Number(e.target.value) })}
                      className="h-8 w-20 text-xs tabular-nums"
                      aria-label={`Unit ${i + 1} count`}
                    />
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={u.priceKes / 1e6}
                      onChange={(e) => patchMix(i, { priceKes: Number(e.target.value) * 1e6 })}
                      className="h-8 flex-1 text-xs tabular-nums"
                      aria-label={`Unit ${i + 1} price in millions`}
                    />
                    <span className="text-[10px] font-bold text-muted-foreground">M KES</span>
                    <button
                      onClick={() =>
                        patchInputs({ unitMix: selected.inputs.unitMix.filter((_, j) => j !== i) })
                      }
                      aria-label={`Remove unit ${i + 1}`}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-fit text-xs font-bold"
                  onClick={() =>
                    patchInputs({
                      unitMix: [
                        ...selected.inputs.unitMix,
                        { type: 'apartment', count: 10, priceKes: 8_000_000 },
                      ],
                    })
                  }
                >
                  <Plus className="mr-1 h-3 w-3" aria-hidden /> Add unit type
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
