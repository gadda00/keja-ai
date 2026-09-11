'use client';
/**
 * Investor portfolio store (proposal §6) — holdings, purchase economics,
 * financing and performance, persisted locally. Seeded with a demo portfolio
 * on first visit (trial platform) and fully editable.
 */
import { useCallback, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { newId } from '@/lib/uuid';

export interface Holding {
  id: string;
  propertyId: string; // marketplace listing id
  label: string;
  area: string;
  purchasePrice: number;
  purchaseDate: string; // ISO
  currentValue: number;
  monthlyRent: number;
  monthlyExpenses: number;
  mortgageBalance: number;
  mortgageMonthly: number;
  occupancyPct: number; // 0-100
  sizeSqm: number;
}

export interface PortfolioState {
  holdings: Holding[];
  currency: 'KES';
}

export const DEMO_PORTFOLIO: Holding[] = [
  {
    id: 'h1',
    propertyId: 'KJA-001',
    label: '3BR Apartment · Kilimani',
    area: 'Kilimani',
    purchasePrice: 12_800_000,
    purchaseDate: '2024-03-14',
    currentValue: 14_600_000,
    monthlyRent: 110_000,
    monthlyExpenses: 28_000,
    mortgageBalance: 8_100_000,
    mortgageMonthly: 128_000,
    occupancyPct: 92,
    sizeSqm: 145,
  },
  {
    id: 'h2',
    propertyId: 'KJA-004',
    label: '4BR Villa · Runda',
    area: 'Runda',
    purchasePrice: 28_500_000,
    purchaseDate: '2023-08-02',
    currentValue: 33_900_000,
    monthlyRent: 210_000,
    monthlyExpenses: 52_000,
    mortgageBalance: 15_400_000,
    mortgageMonthly: 236_000,
    occupancyPct: 100,
    sizeSqm: 380,
  },
  {
    id: 'h3',
    propertyId: 'KJA-009',
    label: 'Studio flat · Madaraka',
    area: 'Madaraka',
    purchasePrice: 3_900_000,
    purchaseDate: '2025-01-20',
    currentValue: 4_350_000,
    monthlyRent: 38_000,
    monthlyExpenses: 7_500,
    mortgageBalance: 0,
    mortgageMonthly: 0,
    occupancyPct: 88,
    sizeSqm: 42,
  },
];

export function usePortfolio() {
  const [state, setState] = useStore<PortfolioState>('investor-portfolio', {
    holdings: DEMO_PORTFOLIO,
    currency: 'KES',
  });

  const add = useCallback(
    (h: Omit<Holding, 'id'>) =>
      setState((prev) => ({ ...prev, holdings: [...prev.holdings, { ...h, id: newId('h') }] })),
    [setState],
  );

  const update = useCallback(
    (id: string, patch: Partial<Holding>) =>
      setState((prev) => ({
        ...prev,
        holdings: prev.holdings.map((h) => (h.id === id ? { ...h, ...patch } : h)),
      })),
    [setState],
  );

  const remove = useCallback(
    (id: string) => setState((prev) => ({ ...prev, holdings: prev.holdings.filter((h) => h.id !== id) })),
    [setState],
  );

  const reset = useCallback(
    () => setState({ holdings: DEMO_PORTFOLIO, currency: 'KES' }),
    [setState],
  );

  const metrics = useMemo(() => {
    const hs = state.holdings;
    const totalValue = hs.reduce((s, h) => s + h.currentValue, 0);
    const totalInvested = hs.reduce((s, h) => s + h.purchasePrice, 0);
    const grossMonthly = hs.reduce((s, h) => s + (h.monthlyRent * h.occupancyPct) / 100, 0);
    const expensesMonthly = hs.reduce((s, h) => s + h.monthlyExpenses, 0);
    const debtMonthly = hs.reduce((s, h) => s + h.mortgageMonthly, 0);
    const netMonthly = grossMonthly - expensesMonthly - debtMonthly;
    const appreciation = totalValue - totalInvested;
    const yearsHeld = (iso: string) =>
      // intentional "now" snapshot: holding-period maths are display-only
      // eslint-disable-next-line react-hooks/purity
      Math.max(0.1, (Date.now() - new Date(iso).getTime()) / (365.25 * 24 * 3600 * 1000));
    const avgYears = hs.length ? hs.reduce((s, h) => s + yearsHeld(h.purchaseDate), 0) / hs.length : 0;
    const equity = totalValue - hs.reduce((s, h) => s + h.mortgageBalance, 0);
    return {
      totalValue,
      totalInvested,
      appreciation,
      appreciationPct: totalInvested ? (appreciation / totalInvested) * 100 : 0,
      grossMonthly,
      netMonthly,
      grossAnnual: grossMonthly * 12,
      netAnnual: netMonthly * 12,
      grossYield: totalValue ? ((grossMonthly * 12) / totalValue) * 100 : 0,
      netYield: totalValue ? ((netMonthly * 12) / totalValue) * 100 : 0,
      occupancy: hs.length ? hs.reduce((s, h) => s + h.occupancyPct, 0) / hs.length : 0,
      roi: totalInvested ? (appreciation + netMonthly * 12 * avgYears) / totalInvested * 100 : 0,
      debtBalance: hs.reduce((s, h) => s + h.mortgageBalance, 0),
      equity,
      ltv: totalValue ? (hs.reduce((s, h) => s + h.mortgageBalance, 0) / totalValue) * 100 : 0,
      avgYears,
    };
  }, [state.holdings]);

  return { ...state, metrics, add, update, remove, reset };
}
