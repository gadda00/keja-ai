/**
 * Finance engine — hand-computed regression values.
 *
 * These functions feed every calculator the product ships (ROI, mortgage,
 * affordability) AND the AI engine's answers. The audit (Ch. 22) demanded
 * regression tests before any LLM work touches this surface — a silent
 * formula regression would corrupt every number the platform shows.
 */
import { analyzeInvestment, calculateAffordability, calculateMortgage, isRentalPrice } from '@/lib/finance';

describe('analyzeInvestment', () => {
  const base = {
    price: 10_000_000,
    furnishingCost: 500_000,
    monthlyRent: 80_000,
    occupancyPct: 90,
    monthlyExpenses: 15_000,
    appreciationPct: 6,
    rentGrowthPct: 4,
  };

  it('computes total investment and annual incomes exactly', () => {
    const r = analyzeInvestment(base);
    expect(r.totalInvestment).toBe(10_500_000);
    // 80,000 × 12 × 0.9 = 864,000
    expect(r.annualGrossIncome).toBeCloseTo(864_000, 6);
    // vacancy allowance = 80,000 × 12 × 0.1 = 96,000
    expect(r.vacancyAllowance).toBeCloseTo(96_000, 6);
    expect(r.annualExpenses).toBe(180_000);
    expect(r.annualNetIncome).toBeCloseTo(684_000, 6);
  });

  it('computes yields against total investment', () => {
    const r = analyzeInvestment(base);
    expect(r.grossYield).toBeCloseTo((864_000 / 10_500_000) * 100, 6);
    expect(r.netYield).toBeCloseTo((684_000 / 10_500_000) * 100, 6);
  });

  it('computes payback and monthly cashflow', () => {
    const r = analyzeInvestment(base);
    expect(r.paybackYears).toBeCloseTo(10_500_000 / 684_000, 6);
    expect(r.monthlyCashflow).toBeCloseTo(684_000 / 12, 6);
  });

  it('clamps occupancy into 0-100 (garbage input never inflates yield)', () => {
    const inflated = analyzeInvestment({ ...base, occupancyPct: 150 });
    expect(inflated.annualGrossIncome).toBe(80_000 * 12); // 100% cap
    const negative = analyzeInvestment({ ...base, occupancyPct: -20 });
    expect(negative.annualGrossIncome).toBe(0);
  });

  it('payback is Infinity when the asset loses money monthly', () => {
    const r = analyzeInvestment({ ...base, monthlyExpenses: 90_000 });
    expect(r.annualNetIncome).toBeLessThan(0);
    expect(r.paybackYears).toBe(Infinity);
  });

  it('projections compound value and rent and stay internally consistent', () => {
    const r = analyzeInvestment(base);
    expect(r.year5).toHaveLength(5);
    expect(r.year10).toHaveLength(10);
    // year 1 value: 10,000,000 × 1.06
    expect(r.year5[0].propertyValue).toBe(10_600_000);
    // year 5 value: 10,000,000 × 1.06^5
    expect(r.year5[4].propertyValue).toBe(Math.round(10_000_000 * 1.06 ** 5));
    // cumulative rent grows monotonically
    for (let i = 1; i < r.year10.length; i++) {
      expect(r.year10[i].cumulativeRent).toBeGreaterThan(r.year10[i - 1].cumulativeRent);
      expect(r.year10[i].cumulativeNet).toBeGreaterThan(r.year10[i - 1].cumulativeNet);
    }
  });
});

describe('calculateMortgage', () => {
  it('matches the standard annuity formula on a worked example', () => {
    // 10M price, 20% deposit, 13.5% p.a., 10 years
    const r = calculateMortgage({
      propertyPrice: 10_000_000,
      depositPct: 20,
      annualRatePct: 13.5,
      termYears: 10,
    });
    expect(r.deposit).toBe(2_000_000);
    expect(r.principal).toBe(8_000_000);
    const m = 13.5 / 100 / 12;
    const n = 120;
    const expected = (8_000_000 * m) / (1 - (1 + m) ** -n);
    expect(r.monthlyRepayment).toBeCloseTo(expected, 4);
    expect(r.totalRepayment).toBeCloseTo(expected * n, 2);
    expect(r.totalInterest).toBeCloseTo(expected * n - 8_000_000, 2);
  });

  it('handles a 0% rate as a straight-line split', () => {
    const r = calculateMortgage({ propertyPrice: 6_000_000, depositPct: 10, annualRatePct: 0, termYears: 5 });
    expect(r.monthlyRepayment).toBeCloseTo(5_400_000 / 60, 6);
    expect(r.totalInterest).toBe(0);
  });

  it('amortises to a zero balance by the final year', () => {
    const r = calculateMortgage({ propertyPrice: 10_000_000, depositPct: 20, annualRatePct: 13.5, termYears: 10 });
    expect(r.schedule).toHaveLength(10);
    expect(r.schedule[9].balance).toBe(0);
    expect(r.schedule[0].paid).toBe(Math.round(r.monthlyRepayment * 12));
  });

  it('extra monthly payments shorten the loan and save interest', () => {
    const r = calculateMortgage({
      propertyPrice: 10_000_000,
      depositPct: 20,
      annualRatePct: 13.5,
      termYears: 10,
      extraMonthly: 20_000,
    });
    expect(r.extra).toBeDefined();
    expect(r.extra!.payoffMonths).toBeLessThan(120);
    expect(r.extra!.monthsSaved).toBeGreaterThan(0);
    expect(r.extra!.interestSaved).toBeGreaterThan(0);
  });
});

describe('isRentalPrice (market heuristic)', () => {
  it('treats sub-floor prices as monthly rents', () => {
    expect(isRentalPrice(65_000)).toBe(true);
    expect(isRentalPrice(450_000)).toBe(true);
  });

  it('treats at-or-above-floor prices as sale prices', () => {
    expect(isRentalPrice(500_000)).toBe(false);
    expect(isRentalPrice(8_500_000)).toBe(false);
  });

  it('treats zero as the price-on-application sentinel, not a rental', () => {
    expect(isRentalPrice(0)).toBe(false);
  });
});

describe('calculateAffordability', () => {
  it('caps the instalment at the CBK-style DTI guard net of obligations', () => {
    const r = calculateAffordability({
      netMonthlyIncome: 200_000,
      otherMonthlyObligations: 20_000,
      annualRatePct: 13.5,
      termYears: 15,
      depositPct: 20,
    });
    // 33% of 200k minus 20k obligations = 46,000
    expect(r.maxInstalment).toBe(46_000);
    expect(r.maxInstalment).toBeLessThanOrEqual(200_000 - 20_000);
    // principal from the annuity formula, price grossed up for the deposit
    const m = 13.5 / 100 / 12;
    const n = 180;
    expect(r.maxPrincipal).toBeCloseTo((46_000 * (1 - (1 + m) ** -n)) / m, 0);
    expect(r.maxPropertyPrice).toBeCloseTo(r.maxPrincipal / 0.8, 0);
    expect(r.requiredDeposit).toBeCloseTo(r.maxPropertyPrice * 0.2, 0);
  });

  it('returns zero capacity when obligations consume the income', () => {
    const r = calculateAffordability({
      netMonthlyIncome: 100_000,
      otherMonthlyObligations: 100_000,
      annualRatePct: 13.5,
      termYears: 10,
      depositPct: 10,
    });
    expect(r.maxInstalment).toBe(0);
    expect(r.maxPrincipal).toBe(0);
    expect(r.maxPropertyPrice).toBe(0);
  });
});
