// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import {
  computeCashflow,
  computeFeasibility,
  DEFAULT_DEV_INPUTS,
  type DevFeasibilityInputs,
  getDevProjects,
  newDevProject,
  sensitivity,
} from '@/lib/devStore';
import { store } from '@/lib/store';

/** 4-unit profitable scheme: land 4M, hard 20M, soft 2M, contingency 1.1M,
 * marketing 0.8M → total 27.9M vs GDV 40M. */
const SYNTHETIC_PROFITABLE: DevFeasibilityInputs = {
  landCostKes: 4_000_000,
  landAcres: 2,
  plotRatio: 8,
  buildCostPerSqmKes: 50_000,
  avgUnitSizeSqm: 80,
  efficiencyPct: 80,
  unitMix: [{ type: 'apartment', count: 4, priceKes: 10_000_000 }],
  monthlySalesRate: 1,
  softCostPct: 10,
  marketingPct: 2,
  financeRatePct: 14,
};

/** Same scheme, half the prices and half the sales pace: a loss-maker whose
 * deepest draw lands mid-build (peak funding > land) with no payback. */
const SYNTHETIC_SLOW: DevFeasibilityInputs = {
  ...SYNTHETIC_PROFITABLE,
  unitMix: [{ type: 'apartment', count: 4, priceKes: 6_000_000 }],
  monthlySalesRate: 0.5,
};

describe('computeFeasibility — default Kenyan screening inputs', () => {
  const r = computeFeasibility(DEFAULT_DEV_INPUTS);

  it('totals units, GFA and the density cap', () => {
    expect(r.totalUnits).toBe(24);
    expect(r.densityCapUnits).toBe(120);
    expect(r.sellableGfaSqm).toBe(2040);
    expect(r.grossGfaSqm).toBe(2720);
  });

  it('builds the cost stack exactly (hard × constructed GFA, 5% contingency)', () => {
    expect(r.hardCostKes).toBe(122_400_000);
    expect(r.softCostKes).toBe(14_688_000);
    expect(r.marketingKes).toBe(7_380_000);
    expect(r.contingencyKes).toBe(6_854_400);
    expect(r.gdvKes).toBe(246_000_000);
    expect(r.totalCostKes).toBe(201_322_400);
  });

  it('derives margin, profit and per-unit economics', () => {
    expect(r.profitKes).toBe(44_677_600);
    expect(r.grossMarginPct).toBeCloseTo(18.16, 2);
    expect(r.costPerUnitKes).toBe(8_388_433);
    expect(r.avgPriceKes).toBe(10_250_000);
    expect(r.breakEvenUnits).toBe(20);
    expect(r.absorptionMonths).toBe(12);
  });

  it('skips the land-banking shield when no comp price is supplied', () => {
    expect(r.landBankingKes).toBeUndefined();
  });

  it('multiplies acres by the comp price when one is supplied', () => {
    const withComps = computeFeasibility(DEFAULT_DEV_INPUTS, 10_000_000);
    expect(withComps.landBankingKes).toBe(50_000_000);
    // the shield is informational — it must not move the project economics
    expect(withComps.totalCostKes).toBe(r.totalCostKes);
  });
});

describe('computeCashflow', () => {
  it('month 0 is the land draw; months run to absorption', () => {
    const c = computeCashflow(DEFAULT_DEV_INPUTS);
    expect(c.months).toHaveLength(13);
    expect(c.months[0]).toMatchObject({
      month: 0,
      unitsSold: 0,
      revenueKes: 0,
      costKes: 50_000_000,
      interestKes: 0,
      cumNetKes: -50_000_000,
    });
  });

  it('default scheme: sells out, books interest, peaks at the land cheque', () => {
    const c = computeCashflow(DEFAULT_DEV_INPUTS);
    expect(c.months.reduce((s, row) => s + row.unitsSold, 0)).toBe(24);
    expect(c.months.reduce((s, row) => s + row.interestKes, 0)).toBeGreaterThan(0);
    expect(c.peakFundingKes).toBe(50_000_000);
    expect(c.paybackMonth).not.toBeNull();
    expect(c.paybackMonth ?? 0).toBeLessThanOrEqual(12);
  });

  it('fast profitable project: peak funding is the land and payback is month 1', () => {
    const c = computeCashflow(SYNTHETIC_PROFITABLE);
    expect(c.months).toHaveLength(5);
    expect(c.peakFundingKes).toBe(4_000_000);
    expect(c.paybackMonth).toBe(1);
    expect(c.months[4].cumNetKes).toBeGreaterThan(0);
  });

  it('slow loss-making project: peak funding exceeds land and payback never comes', () => {
    const c = computeCashflow(SYNTHETIC_SLOW);
    expect(c.months).toHaveLength(9);
    expect(c.peakFundingKes).toBeGreaterThan(4_000_000);
    expect(c.paybackMonth).toBeNull();
    expect(c.months[c.months.length - 1].cumNetKes).toBeLessThan(0);
  });

  it('books every unit and the full GDV across the rows', () => {
    const c = computeCashflow(SYNTHETIC_SLOW);
    expect(c.months.reduce((s, row) => s + row.unitsSold, 0)).toBe(4);
    expect(c.months.reduce((s, row) => s + row.revenueKes, 0)).toBeCloseTo(24_000_000, -3);
  });

  it('degenerate input (zero sales rate) still returns the land row', () => {
    const c = computeCashflow({ ...SYNTHETIC_PROFITABLE, monthlySalesRate: 0 });
    expect(c.months).toHaveLength(1);
    expect(c.peakFundingKes).toBe(4_000_000);
    expect(c.paybackMonth).toBeNull();
  });
});

describe('sensitivity', () => {
  const grid = sensitivity(DEFAULT_DEV_INPUTS);

  it('is a 5×5 grid over ±10/±20% moves', () => {
    expect(grid.buildCostDeltas).toEqual([-20, -10, 0, 10, 20]);
    expect(grid.priceDeltas).toEqual([-20, -10, 0, 10, 20]);
    expect(grid.cells).toHaveLength(5);
    for (const row of grid.cells) expect(row).toHaveLength(5);
  });

  it('the centre cell equals the base margin', () => {
    expect(grid.cells[2][2]).toBeCloseTo(computeFeasibility(DEFAULT_DEV_INPUTS).grossMarginPct, 6);
  });

  it('margin falls with build cost and rises with price in every cell', () => {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 5; j++) {
        expect(grid.cells[i][j]).toBeGreaterThan(grid.cells[i + 1][j]);
      }
    }
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 4; j++) {
        expect(grid.cells[i][j]).toBeLessThan(grid.cells[i][j + 1]);
      }
    }
  });

  it('bounds: best cell is cheap-build / high-price, worst the opposite', () => {
    const flat = grid.cells.flat();
    expect(grid.cells[0][4]).toBeCloseTo(Math.max(...flat), 6);
    expect(grid.cells[4][0]).toBeCloseTo(Math.min(...flat), 6);
  });
});

describe('dev project store', () => {
  it('round-trips a project through localStorage under keja:dev-projects', () => {
    localStorage.clear();
    expect(getDevProjects()).toEqual([]);
    const project = newDevProject('Syokimau scheme', SYNTHETIC_PROFITABLE);
    store.set('dev-projects', [project]);
    expect(getDevProjects()).toEqual([project]);
    expect(localStorage.getItem('keja:dev-projects')).toContain('Syokimau scheme');
  });

  it('returns an empty list when the slot is corrupt', () => {
    localStorage.clear();
    localStorage.setItem('keja:dev-projects', '{not json');
    expect(getDevProjects()).toEqual([]);
  });

  it('stamps id, createdAt and a fallback name on new projects', () => {
    const project = newDevProject('  ', SYNTHETIC_PROFITABLE);
    expect(project.id.startsWith('dev-')).toBe(true);
    expect(project.name).toBe('Untitled scheme');
    expect(Number.isNaN(Date.parse(project.createdAt))).toBe(false);
    expect(project.inputs).toEqual(SYNTHETIC_PROFITABLE);
  });
});
