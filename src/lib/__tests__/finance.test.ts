import { describe, it, expect } from 'vitest'
import {
  analyzeInvestment,
  calculateMortgage,
  calculateAffordability,
  estimateMonthlyExpenses,
  isRentalPrice,
} from '@/lib/finance'
import { formatKES, timeAgo, trustTier } from '@/lib/format'

describe('analyzeInvestment', () => {
  const base = {
    price: 10_000_000,
    furnishingCost: 400_000,
    monthlyRent: 100_000,
    occupancyPct: 85,
    monthlyExpenses: 30_000,
    appreciationPct: 7,
    rentGrowthPct: 5,
  }

  it('computes gross and net yields correctly', () => {
    const r = analyzeInvestment(base)
    expect(r.annualGrossIncome).toBeCloseTo(1_020_000, -4)
    expect(r.grossYield).toBeGreaterThan(9.7)
    expect(r.grossYield).toBeLessThan(9.9)
    expect(r.netYield).toBeGreaterThan(6.3)
    expect(r.netYield).toBeLessThan(6.4)
  })

  it('payback is finite with positive net income and Infinity when negative', () => {
    expect(analyzeInvestment(base).paybackYears).toBeLessThan(20)
    const bad = analyzeInvestment({ ...base, monthlyExpenses: 95_000 })
    expect(bad.paybackYears).toBe(Infinity)
    expect(bad.monthlyCashflow).toBeLessThan(0)
  })

  it('projects 5 and 10 year horizons monotonically', () => {
    const r = analyzeInvestment(base)
    expect(r.year5).toHaveLength(5)
    expect(r.year10).toHaveLength(10)
    expect(r.year10[9].propertyValue).toBeGreaterThan(r.year5[4].propertyValue)
    expect(r.year10[9].cumulativeNet).toBeGreaterThan(r.year10[4].cumulativeNet)
  })
})

describe('calculateMortgage', () => {
  it('matches the standard annuity formula', () => {
    const m = calculateMortgage({ propertyPrice: 10_000_000, depositPct: 20, annualRatePct: 13.5, termYears: 15 })
    expect(m.principal).toBe(8_000_000)
    expect(m.monthlyRepayment).toBeGreaterThan(103_000)
    expect(m.monthlyRepayment).toBeLessThan(105_000)
    expect(m.totalInterest).toBeGreaterThan(10_000_000)
  })

  it('handles zero interest and clamps the schedule at zero', () => {
    const m = calculateMortgage({ propertyPrice: 6_000_000, depositPct: 50, annualRatePct: 0, termYears: 5 })
    expect(m.monthlyRepayment).toBeCloseTo(50_000, 5)
    expect(m.schedule[m.schedule.length - 1].balance).toBe(0)
  })

  it('extra payments save interest and months', () => {
    const base = calculateMortgage({ propertyPrice: 10_000_000, depositPct: 20, annualRatePct: 13.5, termYears: 15 })
    const extra = calculateMortgage({ propertyPrice: 10_000_000, depositPct: 20, annualRatePct: 13.5, termYears: 15, extraMonthly: 20_000 })
    expect(extra.extra).toBeDefined()
    expect(extra.extra!.monthsSaved).toBeGreaterThan(24)
    expect(extra.extra!.interestSaved).toBeGreaterThan(1_000_000)
    expect(base.totalInterest).toBeGreaterThan(extra.extra!.interestSaved)
  })
})

describe('calculateAffordability', () => {
  it('caps instalment at 33% DTI minus obligations', () => {
    const a = calculateAffordability({ netMonthlyIncome: 300_000, otherMonthlyObligations: 30_000, annualRatePct: 13.5, termYears: 15, depositPct: 20 })
    expect(a.maxInstalment).toBeCloseTo(69_000, 5)
    expect(a.maxPropertyPrice).toBeGreaterThan(a.maxPrincipal)
    expect(a.requiredDeposit).toBeCloseTo(a.maxPropertyPrice * 0.2, 0)
  })

  it('never returns negative capacity', () => {
    const a = calculateAffordability({ netMonthlyIncome: 50_000, otherMonthlyObligations: 40_000, annualRatePct: 14, termYears: 10, depositPct: 10 })
    expect(a.maxInstalment).toBeLessThanOrEqual(50_000 * 0.33)
    expect(a.maxPropertyPrice).toBeGreaterThanOrEqual(0)
  })
})

describe('estimateMonthlyExpenses', () => {
  it('scales with size, rent and value', () => {
    const small = estimateMonthlyExpenses(5_000_000, 50_000, 80)
    const big = estimateMonthlyExpenses(20_000_000, 200_000, 200)
    expect(small).toBeGreaterThan(7_000)
    expect(big).toBeGreaterThan(small * 2)
  })
})

describe('isRentalPrice', () => {
  it('treats sub-500k as rental', () => {
    expect(isRentalPrice(65_000)).toBe(true)
    expect(isRentalPrice(499_999)).toBe(true)
    expect(isRentalPrice(500_000)).toBe(false)
    expect(isRentalPrice(12_000_000)).toBe(false)
  })
})

describe('format utils', () => {
  it('formats KES with M/B suffixes and monthly marker', () => {
    expect(formatKES(14_500_000)).toBe('KES 14.5M')
    expect(formatKES(2_400_000_000)).toBe('KES 2.4B')
    expect(formatKES(850_000, { monthly: true })).toBe('KES 850,000/mo')
  })

  it('timeAgo uses the live clock, not a frozen date', () => {
    const fresh = new Date(Date.now() - 3600_000).toISOString()
    expect(timeAgo(fresh)).toBe('today')
    const old = new Date(Date.now() - 40 * 86400000).toISOString()
    expect(timeAgo(old)).toBe('1 month ago')
  })

  it('maps trust scores to tiers', () => {
    expect(trustTier(95).tone).toBe('high')
    expect(trustTier(80).tone).toBe('good')
    expect(trustTier(65).tone).toBe('watch')
    expect(trustTier(40).tone).toBe('avoid')
  })
})
