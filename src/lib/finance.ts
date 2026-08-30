/**
 * Keja.ai Investment Mathematics Engine
 * Implements the roadmap Step 5 investment calculator:
 * purchase price, furnishing, rent, occupancy → gross/net yield, payback,
 * 5-year and 10-year projections. Plus mortgage amortisation.
 */

export interface InvestmentInput {
  price: number;
  furnishingCost: number;
  monthlyRent: number;
  occupancyPct: number; // 0-100
  monthlyExpenses: number; // service charge, management, insurance, rates
  appreciationPct: number; // annual capital growth 0-100
  rentGrowthPct: number; // annual rent growth 0-100
  currency?: 'KES' | 'USD';
}

export interface InvestmentResult {
  totalInvestment: number;
  annualGrossIncome: number;
  vacancyAllowance: number;
  annualExpenses: number;
  annualNetIncome: number;
  grossYield: number;
  netYield: number;
  paybackYears: number;
  year5: ProjectionPoint[];
  year10: ProjectionPoint[];
  monthlyCashflow: number;
}

export interface ProjectionPoint {
  year: number;
  propertyValue: number;
  cumulativeRent: number;
  cumulativeNet: number;
  equityPlusIncome: number;
}

export function analyzeInvestment(input: InvestmentInput): InvestmentResult {
  const {
    price,
    furnishingCost,
    monthlyRent,
    occupancyPct,
    monthlyExpenses,
    appreciationPct,
    rentGrowthPct,
  } = input;

  const totalInvestment = price + furnishingCost;
  const occupancy = Math.min(Math.max(occupancyPct, 0), 100) / 100;
  const annualGrossIncome = monthlyRent * 12 * occupancy;
  const vacancyAllowance = monthlyRent * 12 * (1 - occupancy);
  const annualExpenses = monthlyExpenses * 12;
  const annualNetIncome = annualGrossIncome - annualExpenses;
  const grossYield = totalInvestment > 0 ? (annualGrossIncome / totalInvestment) * 100 : 0;
  const netYield = totalInvestment > 0 ? (annualNetIncome / totalInvestment) * 100 : 0;
  const paybackYears = annualNetIncome > 0 ? totalInvestment / annualNetIncome : Infinity;

  const buildProjection = (years: number): ProjectionPoint[] => {
    const points: ProjectionPoint[] = [];
    let propertyValue = price;
    let currentMonthlyRent = monthlyRent;
    let cumulativeRent = 0;
    let cumulativeNet = 0;
    for (let y = 1; y <= years; y++) {
      propertyValue *= 1 + appreciationPct / 100;
      currentMonthlyRent *= 1 + rentGrowthPct / 100;
      const grossYear = currentMonthlyRent * 12 * occupancy;
      // expenses grow ~60% of rent growth (management % scales with rent; fixed costs grow slower)
      const expensesYear = annualExpenses * (1 + (rentGrowthPct * 0.6) / 100) ** (y - 1);
      cumulativeRent += grossYear;
      cumulativeNet += grossYear - expensesYear;
      points.push({
        year: y,
        propertyValue: Math.round(propertyValue),
        cumulativeRent: Math.round(cumulativeRent),
        cumulativeNet: Math.round(cumulativeNet),
        equityPlusIncome: Math.round(propertyValue - price + cumulativeNet),
      });
    }
    return points;
  };

  return {
    totalInvestment,
    annualGrossIncome,
    vacancyAllowance,
    annualExpenses,
    annualNetIncome,
    grossYield,
    netYield,
    paybackYears,
    year5: buildProjection(5),
    year10: buildProjection(10),
    monthlyCashflow: annualNetIncome / 12,
  };
}

export interface MortgageInput {
  propertyPrice: number;
  depositPct: number; // 0-100
  annualRatePct: number; // e.g. 13.5
  termYears: number;
}

export interface MortgageResult {
  deposit: number;
  principal: number;
  monthlyRepayment: number;
  totalInterest: number;
  totalRepayment: number;
  schedule: { year: number; balance: number; paid: number }[];
}

export function calculateMortgage(
  input: MortgageInput & { extraMonthly?: number }
): MortgageResult & {
  extra?: { monthsSaved: number; interestSaved: number; payoffMonths: number };
} {
  const { propertyPrice, depositPct, annualRatePct, termYears, extraMonthly = 0 } = input;
  const deposit = (propertyPrice * depositPct) / 100;
  const principal = propertyPrice - deposit;
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  const monthly = r === 0 ? principal / n : (principal * r) / (1 - (1 + r) ** -n);
  const totalRepayment = monthly * n;
  const totalInterest = totalRepayment - principal;

  const schedule: { year: number; balance: number; paid: number }[] = [];
  let balance = principal;
  for (let y = 1; y <= termYears; y++) {
    for (let m = 0; m < 12; m++) {
      const interest = balance * r;
      balance = balance + interest - monthly;
      if (balance < 0) balance = 0;
    }
    schedule.push({ year: y, balance: Math.round(balance), paid: Math.round(monthly * 12 * y) });
  }

  // with extra monthly payments
  let extra: { monthsSaved: number; interestSaved: number; payoffMonths: number } | undefined;
  if (extraMonthly > 0) {
    let bal = principal;
    let months = 0;
    const payment = monthly + extraMonthly;
    while (bal > 0 && months < n) {
      bal = bal + bal * r - payment;
      months++;
    }
    const payoffMonths = Math.min(months, n);
    const interestWithExtra = payment * payoffMonths - principal;
    extra = {
      payoffMonths,
      monthsSaved: Math.max(0, n - payoffMonths),
      interestSaved: Math.max(0, totalInterest - interestWithExtra),
    };
  }

  return {
    deposit,
    principal,
    monthlyRepayment: monthly,
    totalInterest,
    totalRepayment,
    schedule,
    extra,
  };
}

export interface AffordabilityInput {
  netMonthlyIncome: number;
  otherMonthlyObligations: number;
  annualRatePct: number;
  termYears: number;
  depositPct: number;
  /** Bank stress ratio: max share of income for the instalment (CBK guidance ≈ 33%) */
  maxDtiPct?: number;
}

export interface AffordabilityResult {
  maxInstalment: number;
  maxPrincipal: number;
  maxPropertyPrice: number;
  requiredDeposit: number;
  totalCashNeeded: number;
  dtiPct: number;
}

/** Reverse mortgage math: income → maximum supportable property price. */
export function calculateAffordability(input: AffordabilityInput): AffordabilityResult {
  const {
    netMonthlyIncome,
    otherMonthlyObligations,
    annualRatePct,
    termYears,
    depositPct,
    maxDtiPct = 33,
  } = input;
  const maxInstalment = Math.max(0, (netMonthlyIncome * maxDtiPct) / 100 - otherMonthlyObligations);
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  // P = M * (1 - (1+r)^-n) / r
  const maxPrincipal = r === 0 ? maxInstalment * n : (maxInstalment * (1 - (1 + r) ** -n)) / r;
  const maxPropertyPrice = depositPct < 100 ? maxPrincipal / (1 - depositPct / 100) : maxPrincipal;
  const requiredDeposit = (maxPropertyPrice * depositPct) / 100;
  return {
    maxInstalment,
    maxPrincipal,
    maxPropertyPrice,
    requiredDeposit,
    totalCashNeeded: requiredDeposit, // + stamp duty & legal shown at UI level
    dtiPct: maxDtiPct,
  };
}

/** Indicative KES→USD rate used across the app (single source of truth). */
export const FX_KES_PER_USD = 129;

/** Listings priced below this floor are rentals (monthly pricing). Single source of truth. */
export const RENTAL_PRICE_FLOOR = 500_000;

/** Rentals in this marketplace are priced below the 500k sale floor. */
export function isRentalPrice(price: number): boolean {
  return price < RENTAL_PRICE_FLOOR;
}

/** Kenyan buyer cost stack (statutory + typical professional fees, % of price). */
export const BUYING_COSTS = [
  { label: 'Stamp duty (4% urban)', pct: 4, statutory: true },
  { label: 'Legal fees (~1.5%)', pct: 1.5, statutory: false },
  { label: 'Valuation (~0.25%)', pct: 0.25, statutory: false },
  { label: 'Registration & misc.', pct: 0.15, statutory: false },
];

/** Kenyan mortgage market context (typical 2026 levels, for guidance only) */
export const MORTGAGE_MARKET = {
  typicalRate: 13.5,
  rateRange: [10.5, 16.5] as [number, number],
  typicalTerm: 15,
  maxTerm: 25,
  minDepositPct: 10,
  typicalDepositPct: 20,
  banks: ['KCB', 'Stanbic', 'Absa', 'NCBA', 'I&M', 'Co-op Bank', 'Standard Chartered'],
  note: 'Indicative rates for guidance only. Keja can connect you with mortgage partners for current offers.',
};

export const DEFAULT_EXPENSES = {
  serviceCharge: 25, // per sqm per month, typical Nairobi apartments
  managementPct: 8, // of collected rent
  insurance: 0.35, // % of value annually
  rates: 0.15, // % of value annually (land rates)
};

export function estimateMonthlyExpenses(
  propertyPrice: number,
  monthlyRent: number,
  sizeSqm?: number
): number {
  const service = sizeSqm ? sizeSqm * DEFAULT_EXPENSES.serviceCharge : monthlyRent * 0.1;
  const management = monthlyRent * (DEFAULT_EXPENSES.managementPct / 100);
  const insurance = (propertyPrice * (DEFAULT_EXPENSES.insurance / 100)) / 12;
  const rates = (propertyPrice * (DEFAULT_EXPENSES.rates / 100)) / 12;
  return Math.round(service + management + insurance + rates);
}
