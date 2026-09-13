/**
 * Developer Console — unit tests for the screening math the claims
 * register's 'developer-console' claim cites (feasibility, cashflow,
 * sensitivity). The register previously said "pure functions with unit
 * tests" while no test file imported this module.
 */
import { describe, expect, it } from 'vitest';

import {
  computeCashflow,
  computeFeasibility,
  DEFAULT_DEV_INPUTS,
  sensitivity,
  SENSITIVITY_DELTAS,
  type DevFeasibilityInputs,
} from '@/lib/devStore';

const inputs = (overrides: Partial<DevFeasibilityInputs> = {}): DevFeasibilityInputs => ({
  ...DEFAULT_DEV_INPUTS,
  ...overrides,
});

describe('computeFeasibility', () => {
  it('computes units, GDV and density from the mix', () => {
    const f = computeFeasibility(inputs());
    expect(f.totalUnits).toBe(24); // 20 apartments + 4 townhouses
    expect(f.gdvKes).toBe(20 * 9_500_000 + 4 * 14_000_000);
    expect(f.densityCapUnits).toBe(5 * 24);
    expect(f.avgPriceKes).toBe(f.gdvKes / 24);
  });

  it('scales gross GFA by the efficiency share (common areas are built but not sold)', () => {
    const f = computeFeasibility(inputs());
    expect(f.sellableGfaSqm).toBe(24 * 85);
    expect(f.grossGfaSqm).toBe(Math.round((24 * 85) / 0.75));
    expect(f.hardCostKes).toBe(45_000 * Math.round((24 * 85) / 0.75));
  });

  it('stacks soft cost on hard, marketing on GDV, contingency on hard+soft', () => {
    const f = computeFeasibility(inputs());
    expect(f.softCostKes).toBe(Math.round(0.12 * f.hardCostKes));
    expect(f.marketingKes).toBe(Math.round(0.03 * f.gdvKes));
    expect(f.contingencyKes).toBe(Math.round(0.05 * (f.hardCostKes + f.softCostKes)));
    expect(f.totalCostKes).toBe(
      f.landCostKes + f.hardCostKes + f.softCostKes + f.marketingKes + f.contingencyKes
    );
  });

  it('derives profit, margin, cost per unit and break-even coherently', () => {
    const f = computeFeasibility(inputs());
    expect(f.profitKes).toBe(f.gdvKes - f.totalCostKes);
    expect(f.grossMarginPct).toBeCloseTo((f.profitKes / f.gdvKes) * 100, 5);
    expect(f.costPerUnitKes).toBe(Math.round(f.totalCostKes / f.totalUnits));
    expect(f.breakEvenUnits).toBe(Math.ceil(f.totalCostKes / f.avgPriceKes));
    expect(f.absorptionMonths).toBe(12); // 24 units ÷ 2 per month
  });

  it('adds the land-banking shield only when a comp price exists', () => {
    const noShield = computeFeasibility(inputs());
    expect(noShield.landBankingKes).toBeUndefined();
    const shield = computeFeasibility(inputs(), 15_000_000);
    expect(shield.landBankingKes).toBe(5 * 15_000_000);
  });

  it('degrades safely on a zero-GDV scheme (no division by zero)', () => {
    const f = computeFeasibility(
      inputs({ unitMix: [{ type: 'apartment', count: 0, priceKes: 0 }] })
    );
    expect(f.grossMarginPct).toBe(0);
    expect(f.breakEvenUnits).toBe(0);
    expect(f.avgPriceKes).toBe(0);
  });
});

describe('computeCashflow', () => {
  it('month 0 is the land draw', () => {
    const c = computeCashflow(inputs());
    expect(c.months[0]).toMatchObject({
      month: 0,
      unitsSold: 0,
      revenueKes: 0,
      costKes: inputs().landCostKes,
      interestKes: 0,
      cumNetKes: -inputs().landCostKes,
    });
  });

  it('sells every unit exactly once across the window', () => {
    const c = computeCashflow(inputs());
    const units = c.months.reduce((s, m) => s + m.unitsSold, 0);
    expect(units).toBeCloseTo(24, 5);
    expect(c.months.length).toBe(1 + 12); // land month + 12 sales months
  });

  it('accrues interest only on a drawn (negative) balance', () => {
    const c = computeCashflow(inputs());
    for (const m of c.months) {
      expect(m.interestKes).toBeGreaterThanOrEqual(0);
    }
    // early months are deep in drawdown — interest must be material there
    expect(c.months[2].interestKes).toBeGreaterThan(0);
  });

  it('reports peak funding as the deepest cumulative outflow', () => {
    const c = computeCashflow(inputs());
    const deepest = Math.min(...c.months.map((m) => m.cumNetKes));
    expect(c.peakFundingKes).toBe(Math.max(0, -deepest));
  });

  it('pays back within the window on the default scheme', () => {
    const c = computeCashflow(inputs());
    expect(c.paybackMonth).not.toBeNull();
    const payback = c.months.find((m) => m.month === c.paybackMonth)!;
    expect(payback.cumNetKes).toBeGreaterThanOrEqual(0);
    const before = c.months.find((m) => m.month === c.paybackMonth! - 1)!;
    expect(before.cumNetKes).toBeLessThan(0);
  });

  it('returns only the land month when the sales rate is zero (no infinite loop)', () => {
    const c = computeCashflow(inputs({ monthlySalesRate: 0 }));
    expect(c.months).toHaveLength(1);
    expect(c.paybackMonth).toBeNull();
    expect(c.absorptionMonths).toBe(Infinity);
  });
});

describe('sensitivity', () => {
  it('is a 5×5 grid over the published deltas', () => {
    const g = sensitivity(inputs());
    expect(g.buildCostDeltas).toEqual(SENSITIVITY_DELTAS);
    expect(g.priceDeltas).toEqual(SENSITIVITY_DELTAS);
    expect(g.cells).toHaveLength(5);
    for (const row of g.cells) expect(row).toHaveLength(5);
  });

  it('margin rises with price and falls with build cost', () => {
    const g = sensitivity(inputs());
    const mid = 2;
    // cheaper build (row 0) beats dearer build (row 4) at any price column
    for (let j = 0; j < 5; j++) {
      expect(g.cells[0][j]).toBeGreaterThan(g.cells[4][j]);
    }
    // higher price column beats lower, at any build row
    for (let i = 0; i < 5; i++) {
      expect(g.cells[i][4]).toBeGreaterThan(g.cells[i][0]);
    }
    // centre cell equals the base case margin
    const base = computeFeasibility(inputs());
    expect(g.cells[mid][mid]).toBeCloseTo(base.grossMarginPct, 5);
  });
});
