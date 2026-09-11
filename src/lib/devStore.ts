/**
 * Developer Console store + feasibility engine (Task 8-a).
 *
 * Land / development screening math for property developers:
 *  - computeFeasibility: units, GFA, cost stack, GDV, margin, break-even,
 *    absorption and an optional "land-banking shield" (undeveloped land
 *    value) when a per-acre comp price is supplied.
 *  - computeCashflow: month-by-month drawdown with a quadratic (S-curve-lite)
 *    construction ramp over 70% of the absorption window, finance interest
 *    on the drawn balance, peak funding and payback month.
 *  - sensitivity: 5×5 build-cost vs sales-price grid of gross margins.
 *
 * HONESTY: every figure this module produces is ESTIMATE-class screening
 * math. Area land prices are medians of live marketplace land comps only —
 * when there are no comps the shield is skipped rather than invented.
 *
 * Projects persist in localStorage under 'keja:dev-projects' via the shared
 * store (useStore / 'keja-store-change' event), so no new persistence
 * machinery is introduced.
 */
import { areaInsights } from '@/data/properties';
import { isRentalPrice } from '@/lib/finance';
import { marketInventory } from '@/lib/inventory';
import { store, useStore } from '@/lib/store';
import { newId } from '@/lib/uuid';

/** Storage key (the shared store prefixes 'keja:' → 'keja:dev-projects'). */
export const DEV_PROJECTS_KEY = 'dev-projects';

export interface DevProject {
  id: string;
  name: string;
  createdAt: string;
  inputs: DevFeasibilityInputs;
}

export interface DevFeasibilityInputs {
  landCostKes: number;
  landAcres: number;
  plotRatio: number; // units per acre
  buildCostPerSqmKes: number;
  avgUnitSizeSqm: number;
  efficiencyPct: number; // sellable GFA share
  unitMix: { type: 'apartment' | 'townhouse' | 'villa'; count: number; priceKes: number }[];
  monthlySalesRate: number; // units sold per month
  softCostPct: number;
  marketingPct: number;
  financeRatePct: number; // annual
}

/** Kenyan screening defaults: 5 acres at KES 50M, 24-unit mixed scheme. */
export const DEFAULT_DEV_INPUTS: DevFeasibilityInputs = {
  landCostKes: 50_000_000,
  landAcres: 5,
  plotRatio: 24,
  buildCostPerSqmKes: 45_000,
  avgUnitSizeSqm: 85,
  efficiencyPct: 75,
  unitMix: [
    { type: 'apartment', count: 20, priceKes: 9_500_000 },
    { type: 'townhouse', count: 4, priceKes: 14_000_000 },
  ],
  monthlySalesRate: 2,
  softCostPct: 12,
  marketingPct: 3,
  financeRatePct: 14,
};

/** Contingency applied to construction-side costs (hard + soft). */
export const CONTINGENCY_PCT = 5;

const round = (v: number): number => Math.round(v);

/* ------------------------------------------------------------------ */
/* Feasibility                                                         */
/* ------------------------------------------------------------------ */

export interface FeasibilityResult {
  totalUnits: number;
  /** LandAcres × plotRatio — the density the plot could carry (screening). */
  densityCapUnits: number;
  /** Saleable floor area (what buyers purchase): units × avg unit size. */
  sellableGfaSqm: number;
  /** Constructed GFA incl. common areas: sellable ÷ efficiency share. */
  grossGfaSqm: number;
  landCostKes: number;
  hardCostKes: number;
  softCostKes: number;
  marketingKes: number;
  contingencyKes: number;
  totalCostKes: number;
  gdvKes: number;
  grossMarginPct: number;
  profitKes: number;
  costPerUnitKes: number;
  /** GDV ÷ units — the weighted average selling price across the mix. */
  avgPriceKes: number;
  breakEvenUnits: number;
  absorptionMonths: number;
  /** Undeveloped-land value (acres × comp price) — only when comps exist. */
  landBankingKes?: number;
}

/**
 * Screening feasibility. Construction rate is applied to the constructed
 * GFA (units × avg sellable size ÷ efficiency share) — the share of the
 * building that is saleable; common areas still have to be built.
 */
export function computeFeasibility(
  inputs: DevFeasibilityInputs,
  landPriceKesPerAcre?: number
): FeasibilityResult {
  const totalUnits = inputs.unitMix.reduce((s, u) => s + u.count, 0);
  const gdvKes = round(inputs.unitMix.reduce((s, u) => s + u.count * u.priceKes, 0));

  const sellableGfaSqm = totalUnits * inputs.avgUnitSizeSqm;
  const efficiency = inputs.efficiencyPct > 0 ? inputs.efficiencyPct / 100 : 1;
  const grossGfaSqm = sellableGfaSqm / efficiency;

  const hardCostKes = round(inputs.buildCostPerSqmKes * grossGfaSqm);
  const softCostKes = round((inputs.softCostPct / 100) * hardCostKes);
  const marketingKes = round((inputs.marketingPct / 100) * gdvKes);
  const contingencyKes = round((CONTINGENCY_PCT / 100) * (hardCostKes + softCostKes));
  const totalCostKes = round(
    inputs.landCostKes + hardCostKes + softCostKes + marketingKes + contingencyKes
  );

  const profitKes = gdvKes - totalCostKes;
  const grossMarginPct = gdvKes > 0 ? (profitKes / gdvKes) * 100 : 0;
  const avgPriceKes = totalUnits > 0 ? gdvKes / totalUnits : 0;
  const breakEvenUnits = avgPriceKes > 0 ? Math.ceil(totalCostKes / avgPriceKes) : totalUnits;
  const absorptionMonths =
    inputs.monthlySalesRate > 0 ? totalUnits / inputs.monthlySalesRate : Infinity;

  const result: FeasibilityResult = {
    totalUnits,
    densityCapUnits: inputs.landAcres * inputs.plotRatio,
    sellableGfaSqm: round(sellableGfaSqm),
    grossGfaSqm: round(grossGfaSqm),
    landCostKes: round(inputs.landCostKes),
    hardCostKes,
    softCostKes,
    marketingKes,
    contingencyKes,
    totalCostKes,
    gdvKes,
    grossMarginPct,
    profitKes,
    costPerUnitKes: totalUnits > 0 ? round(totalCostKes / totalUnits) : 0,
    avgPriceKes,
    breakEvenUnits,
    absorptionMonths,
  };

  // Land-banking shield: only when a real comp-derived per-acre price exists.
  if (landPriceKesPerAcre !== undefined && landPriceKesPerAcre > 0 && inputs.landAcres > 0) {
    result.landBankingKes = round(inputs.landAcres * landPriceKesPerAcre);
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* Cashflow                                                            */
/* ------------------------------------------------------------------ */

export interface CashflowMonth {
  month: number;
  /** Units sold this month (linear absorption — may be fractional). */
  unitsSold: number;
  revenueKes: number;
  /** Construction + marketing cost this month (land is month 0; interest separate). */
  costKes: number;
  interestKes: number;
  /** Cumulative net position incl. land, all costs, revenue and interest. */
  cumNetKes: number;
}

export interface CashflowResult {
  /** Month 0 is the land draw; then months 1..ceil(absorption). */
  months: CashflowMonth[];
  /** Deepest cumulative outflow (positive number, incl. accrued interest). */
  peakFundingKes: number;
  /** First month the cumulative net turns ≥ 0 — null if it never does. */
  paybackMonth: number | null;
  absorptionMonths: number;
}

/**
 * Monthly drawdown: land lands in month 0; hard + soft + contingency ramp
 * quadratically over the first 70% of the absorption window (S-curve-lite,
 * construction completes before sell-out); marketing tracks revenue;
 * interest accrues monthly on the drawn (negative) balance.
 */
export function computeCashflow(inputs: DevFeasibilityInputs): CashflowResult {
  const feas = computeFeasibility(inputs);
  const { totalUnits, gdvKes, avgPriceKes, marketingKes } = feas;
  const constructionKes = feas.hardCostKes + feas.softCostKes + feas.contingencyKes;
  const monthlyRate = inputs.financeRatePct / 100 / 12;

  const months: CashflowMonth[] = [];
  let cumNet = -inputs.landCostKes;
  let peakFunding = Math.max(0, inputs.landCostKes);
  let paybackMonth: number | null = inputs.landCostKes <= 0 ? 0 : null;

  months.push({
    month: 0,
    unitsSold: 0,
    revenueKes: 0,
    costKes: round(inputs.landCostKes),
    interestKes: 0,
    cumNetKes: round(cumNet),
  });

  const absorption = inputs.monthlySalesRate > 0 ? totalUnits / inputs.monthlySalesRate : Infinity;
  // A zero sales rate never absorbs: return just the land draw (no infinite loop).
  const salesMonths = totalUnits > 0 && Number.isFinite(absorption) ? Math.ceil(absorption) : 0;
  const buildMonths = Math.max(1, 0.7 * (salesMonths > 0 ? salesMonths : 1));

  const cumUnits = (m: number) => Math.min(totalUnits, m * inputs.monthlySalesRate);
  const cumConstruction = (m: number) => constructionKes * Math.min(1, (m / buildMonths) ** 2);
  const cumMarketing = (m: number) => (gdvKes > 0 ? (marketingKes * cumUnits(m)) / totalUnits : 0);

  for (let m = 1; m <= salesMonths; m++) {
    const units = cumUnits(m) - cumUnits(m - 1);
    const revenue = units * avgPriceKes;
    const cost =
      cumConstruction(m) - cumConstruction(m - 1) + (cumMarketing(m) - cumMarketing(m - 1));
    const balanceBefore = cumNet + revenue - cost;
    const interest = Math.max(0, -balanceBefore) * monthlyRate;
    cumNet = balanceBefore - interest;
    if (paybackMonth === null && cumNet >= 0) paybackMonth = m;
    peakFunding = Math.max(peakFunding, -cumNet);
    months.push({
      month: m,
      unitsSold: units,
      revenueKes: round(revenue),
      costKes: round(cost),
      interestKes: round(interest),
      cumNetKes: round(cumNet),
    });
  }

  return {
    months,
    peakFundingKes: round(peakFunding),
    paybackMonth,
    absorptionMonths: absorption,
  };
}

/* ------------------------------------------------------------------ */
/* Sensitivity                                                         */
/* ------------------------------------------------------------------ */

export const SENSITIVITY_DELTAS = [-20, -10, 0, 10, 20];

export interface SensitivityGrid {
  /** Percent changes applied to the build cost per sqm (rows). */
  buildCostDeltas: number[];
  /** Percent changes applied to every unit price in the mix (columns). */
  priceDeltas: number[];
  /** cells[i][j] = gross margin % at buildCostDeltas[i] / priceDeltas[j]. */
  cells: number[][];
}

/** 2-way gross-margin grid: build cost ±10/±20% vs sales price ±10/±20%. */
export function sensitivity(inputs: DevFeasibilityInputs): SensitivityGrid {
  const cells = SENSITIVITY_DELTAS.map((buildDelta) =>
    SENSITIVITY_DELTAS.map(
      (priceDelta) =>
        computeFeasibility({
          ...inputs,
          buildCostPerSqmKes: inputs.buildCostPerSqmKes * (1 + buildDelta / 100),
          unitMix: inputs.unitMix.map((u) => ({
            ...u,
            priceKes: u.priceKes * (1 + priceDelta / 100),
          })),
        }).grossMarginPct
    )
  );
  return { buildCostDeltas: [...SENSITIVITY_DELTAS], priceDeltas: [...SENSITIVITY_DELTAS], cells };
}

/* ------------------------------------------------------------------ */
/* Area context (real data only)                                        */
/* ------------------------------------------------------------------ */

const SQM_PER_ACRE = 4046.8564224;

/**
 * Median undeveloped-land price per acre for an area, derived ONLY from live
 * marketplace land comps (type 'land' with a size and sale price). Returns
 * null when the area is unknown to areaInsights or has no comps — the
 * land-banking shield is skipped rather than invented.
 */
export function areaLandPriceKesPerAcre(area: string): number | null {
  if (!areaInsights[area]) return null;
  const comps = marketInventory().filter(
    (p) =>
      p.area === area &&
      p.type === 'land' &&
      p.price > 0 &&
      p.sizeSqm > 0 &&
      !isRentalPrice(p.price)
  );
  if (comps.length === 0) return null;
  const perAcre = comps.map((p) => (p.price / p.sizeSqm) * SQM_PER_ACRE).sort((a, b) => a - b);
  const mid = Math.floor(perAcre.length / 2);
  const median = perAcre.length % 2 ? perAcre[mid] : (perAcre[mid - 1] + perAcre[mid]) / 2;
  return round(median);
}

/* ------------------------------------------------------------------ */
/* Project persistence                                                  */
/* ------------------------------------------------------------------ */

/** Read the saved project list (empty array when nothing/corrupt stored). */
export function getDevProjects(): DevProject[] {
  return store.get<DevProject[]>(DEV_PROJECTS_KEY, []);
}

/** Pure factory: stamps id + createdAt; the caller appends it to the store. */
export function newDevProject(name: string, inputs: DevFeasibilityInputs): DevProject {
  return {
    id: newId('dev'),
    name: name.trim() || 'Untitled scheme',
    createdAt: new Date().toISOString(),
    inputs,
  };
}

/** React hook over the saved projects (shared store + change events). */
export function useDevProjects() {
  return useStore<DevProject[]>(DEV_PROJECTS_KEY, []);
}
