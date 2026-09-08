// @vitest-environment jsdom
/**
 * Tokenize store — the money-flow simulation. Regression coverage for:
 *  - buy cap must NOT double-count soldDelta (the memo already folds it in —
 *    the old code subtracted the user's own purchases twice, blocking
 *    legitimate buyers and inflating funded %)
 *  - FIFO sell accounting
 *  - loadDemoPortfolio keeps marketplace funding % consistent with holdings
 *  - TRIAL MODE: wallet debit/credit, secondary order matching with market
 *    impact, distribution accrual on the trial clock, lifecycle transitions
 *    (FUNDING → FUNDED → LIVE), mark-to-market
 */
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { TOKENIZED_PROPERTIES } from '@/data/tokenize';
import {
  buildOrderBook,
  computeAccruedDistributions,
  matchMarketOrder,
  perCycleDistributionUsd,
  portfolioMarkToMarket,
  TokenizeProvider,
  TRIAL_START_BALANCE_USD,
  useTokenize,
} from '@/lib/tokenizeStore';

function wrapper({ children }: { children: ReactNode }) {
  return <TokenizeProvider>{children}</TokenizeProvider>;
}

const getStore = () => {
  const { result } = renderHook(() => useTokenize(), { wrapper });
  return result;
};

/** A seeded (non-custom) offering that still has tokens available. */
const openOffering = (r: { current: ReturnType<typeof useTokenize> }) => {
  const p = r.current.properties.find((x) => !x.custom && x.tokensSold < x.totalTokens);
  if (!p) throw new Error('no open offering available for test');
  return p;
};

/** Pre-seed a generous trial wallet so supply-cap tests aren't wallet-bound. */
const seedDeepWallet = (walletUsd = 50_000_000) => {
  localStorage.setItem('keja-tokenize-v1', JSON.stringify({ walletUsd }));
};

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('tokenizeStore buy/sell accounting', () => {
  it('does not double-count the buyer\u2019s own purchases against availability', () => {
    const r = getStore();
    const target = openOffering(r);
    const before = target.tokensSold;

    // Buy 10 tokens as the (first) investor.
    act(() => {
      r.current.completeKyc({
        email: 't@keja.ai',
        fullName: 'Test Investor',
        phone: '+254700000000',
        country: 'Kenya',
        idType: 'PASSPORT',
        idNumber: 'A123456',
        sourceOfFunds: 'salary',
      });
    });
    act(() => {
      r.current.buyTokens(target.id, 10);
    });

    // The properties memo folds soldDelta into tokensSold exactly once:
    // after buying 10, sold must be before + 10 — not before + 20.
    const after = r.current.properties.find((p) => p.id === target.id)!;
    expect(after.tokensSold).toBe(Math.min(target.totalTokens, before + 10));
  });

  it('second purchase still sees correct availability (double-count regression)', () => {
    // Pins the soldDelta fix: the OLD code recomputed sold = tokensSold +
    // soldDelta inside buyTokens even though the properties memo already
    // folds the delta in — from the SECOND purchase on, availability was
    // understated by everything the investor already owned.
    seedDeepWallet();
    const r = getStore();
    const target = openOffering(r);
    const seed = target.tokensSold;
    const initialAvailable = target.totalTokens - seed;

    act(() => {
      r.current.completeKyc({
        email: 't@keja.ai',
        fullName: 'Test Investor',
        phone: '+254700000000',
        country: 'Kenya',
        idType: 'PASSPORT',
        idNumber: 'A123456',
        sourceOfFunds: 'salary',
      });
    });

    // buy #1: takes 10 off the market
    act(() => {
      r.current.buyTokens(target.id, 10);
    });
    // buy #2: the REMAINING supply must still be purchasable in one order —
    // with the double-count bug this throws "Only N-10 tokens remain"
    expect(() => act(() => r.current.buyTokens(target.id, initialAvailable - 10))).not.toThrow();

    // and the offering reports fully funded exactly once
    const after = r.current.properties.find((p) => p.id === target.id)!;
    expect(after.tokensSold).toBe(target.totalTokens);
  });

  it('rejects orders exceeding the remaining supply exactly at the cap', () => {
    seedDeepWallet();
    const r = getStore();
    const target = openOffering(r);
    act(() => {
      r.current.completeKyc({
        email: 't@keja.ai',
        fullName: 'Test Investor',
        phone: '+254700000000',
        country: 'Kenya',
        idType: 'PASSPORT',
        idNumber: 'A123456',
        sourceOfFunds: 'salary',
      });
    });

    const available = target.totalTokens - target.tokensSold;
    expect(() => act(() => r.current.buyTokens(target.id, available + 1))).toThrow(/tokens remain/);
    // and the exact remainder still fits (proves availability was not
    // understated by double-counting)
    expect(() => act(() => r.current.buyTokens(target.id, available))).not.toThrow();
  });

  it('sells FIFO and refuses to sell more than held', () => {
    const r = getStore();
    const target = openOffering(r);
    act(() => {
      r.current.completeKyc({
        email: 't@keja.ai',
        fullName: 'Test Investor',
        phone: '+254700000000',
        country: 'Kenya',
        idType: 'PASSPORT',
        idNumber: 'A123456',
        sourceOfFunds: 'salary',
      });
    });
    act(() => {
      r.current.buyTokens(target.id, 50);
    });
    expect(r.current.investments).toHaveLength(1);

    act(() => {
      r.current.sellTokens(target.id, 50, target.tokenPriceUsd);
    });
    expect(r.current.investments.filter((i) => i.propertyId === target.id)).toHaveLength(0);
    expect(() => act(() => r.current.sellTokens(target.id, 1, target.tokenPriceUsd))).toThrow(
      /Insufficient/
    );
  });

  it('loadDemoPortfolio folds demo holdings into marketplace funding', () => {
    const r = getStore();
    const seeded = r.current.properties.find((p) => !p.custom)!;
    const before = seeded.tokensSold;

    act(() => {
      r.current.loadDemoPortfolio();
    });

    const demoHeld = r.current.investments
      .filter((i) => i.propertyId === seeded.id)
      .reduce((s, i) => s + i.tokenAmount, 0);
    if (demoHeld > 0) {
      const after = r.current.properties.find((p) => p.id === seeded.id)!;
      expect(after.tokensSold).toBe(Math.min(seeded.totalTokens, before + demoHeld));
    }
  });
});

describe('trial mode — wallet, matching, distributions, lifecycle', () => {
  const kyc = (r: { current: ReturnType<typeof useTokenize> }) =>
    act(() => {
      r.current.completeKyc({
        email: 't@keja.ai',
        fullName: 'Test Investor',
        phone: '+254700000000',
        country: 'Kenya',
        idType: 'PASSPORT',
        idNumber: 'A123456',
        sourceOfFunds: 'salary',
      });
    });

  it('starts with trial credits, debits buys, credits sells', () => {
    const r = getStore();
    expect(r.current.walletUsd).toBe(TRIAL_START_BALANCE_USD);
    const target = openOffering(r);
    kyc(r);
    act(() => {
      r.current.buyTokens(target.id, 100);
    });
    expect(r.current.walletUsd).toBeCloseTo(TRIAL_START_BALANCE_USD - 100 * target.tokenPriceUsd);
    act(() => {
      r.current.sellTokens(target.id, 100, target.tokenPriceUsd);
    });
    expect(r.current.walletUsd).toBeCloseTo(TRIAL_START_BALANCE_USD);
  });

  it('rejects primary orders the trial wallet cannot cover', () => {
    const r = getStore();
    const target = openOffering(r);
    kyc(r);
    const tooMany = Math.floor(r.current.walletUsd / target.tokenPriceUsd) + 1;
    expect(() => act(() => r.current.buyTokens(target.id, tooMany))).toThrow(/Trial wallet/);
  });

  it('matchMarketOrder walks levels, averages price and moves the mid', () => {
    const bids = [
      { price: 9.96, size: 500 },
      { price: 9.92, size: 500 },
      { price: 9.88, size: 500 },
    ];
    const asks = [
      { price: 10.04, size: 500 },
      { price: 10.08, size: 500 },
      { price: 10.12, size: 500 },
    ];
    // small buy fills entirely on level 1
    const small = matchMarketOrder('buy', 200, bids, asks);
    expect(small.filled).toBe(200);
    expect(small.avgPriceUsd).toBeCloseTo(10.04);
    expect(small.newMid).toBeGreaterThan(10.04);
    // large buy eats two levels: average between them, mid above the deepest
    const large = matchMarketOrder('buy', 900, bids, asks);
    expect(large.filled).toBe(900);
    expect(large.avgPriceUsd).toBeGreaterThan(10.04);
    expect(large.avgPriceUsd).toBeLessThan(10.08);
    expect(large.newMid).toBeGreaterThan(10.08);
    // oversized buy partially fills to the full depth
    const partial = matchMarketOrder('buy', 5000, bids, asks);
    expect(partial.filled).toBe(1500);
    // sell walks bids downward
    const sell = matchMarketOrder('sell', 900, bids, asks);
    expect(sell.avgPriceUsd).toBeLessThan(9.96);
    expect(sell.newMid).toBeLessThan(9.92);
  });

  it('buildOrderBook centres levels around the live mid override', () => {
    const p = TOKENIZED_PROPERTIES[0];
    const book = buildOrderBook(p.id, 10, 11);
    expect(book.mid).toBe(11);
    expect(book.asks[0].price).toBeGreaterThan(book.mid);
    expect(book.bids[0].price).toBeLessThan(book.mid);
    const fallback = buildOrderBook(p.id, 9.5, undefined);
    expect(fallback.mid).toBe(9.5);
  });

  it('secondary buy debits the wallet and moves the live price', () => {
    seedDeepWallet();
    const r = getStore();
    const live = r.current.properties.find(
      (p) => !p.custom && (p.status === 'LIVE' || p.status === 'FUNDING')
    )!;
    kyc(r);
    const walletBefore = r.current.walletUsd;
    const priceBefore = r.current.marketPrice(live.id);
    act(() => {
      r.current.buySecondary(live.id, 1500);
    });
    expect(r.current.walletUsd).toBeLessThan(walletBefore);
    expect(r.current.marketPrice(live.id)).toBeGreaterThan(priceBefore);
    expect(r.current.trades[0].side).toBe('BUY');
    expect(r.current.trades[0].tokens).toBe(1500);
  });

  it('secondary sell credits the wallet, reduces holdings and moves the price down', () => {
    seedDeepWallet();
    const r = getStore();
    const live = r.current.properties.find(
      (p) => !p.custom && (p.status === 'LIVE' || p.status === 'FUNDING')
    )!;
    kyc(r);
    act(() => {
      r.current.buySecondary(live.id, 2000);
    });
    const priceAfterBuy = r.current.marketPrice(live.id);
    const walletBefore = r.current.walletUsd;
    act(() => {
      r.current.sellSecondary(live.id, 2000);
    });
    expect(r.current.walletUsd).toBeGreaterThan(walletBefore);
    expect(r.current.marketPrice(live.id)).toBeLessThan(priceAfterBuy);
    expect(r.current.investments.filter((i) => i.propertyId === live.id)).toHaveLength(0);
  });

  it('distributions accrue per cycle for LIVE holdings only', () => {
    const live = TOKENIZED_PROPERTIES.find(
      (p) => p.status === 'LIVE' && p.distributionFreq === 'MONTHLY'
    )!;
    const funding = TOKENIZED_PROPERTIES.find((p) => p.status === 'FUNDING')!;
    const quarterlyLive = TOKENIZED_PROPERTIES.find(
      (p) => p.status === 'LIVE' && p.distributionFreq === 'QUARTERLY'
    )!;
    const inv = [
      {
        id: 'i1',
        propertyId: live.id,
        tokenAmount: 1000,
        pricePerTokenUsd: live.tokenPriceUsd,
        totalCostUsd: 1000 * live.tokenPriceUsd,
        txHash: '0x1',
        blockNumber: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'i2',
        propertyId: funding.id,
        tokenAmount: 1000,
        pricePerTokenUsd: funding.tokenPriceUsd,
        totalCostUsd: 1000 * funding.tokenPriceUsd,
        txHash: '0x2',
        blockNumber: 2,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const monthMs = 30 * 24 * 60 * 60 * 1000;
    const t0 = Date.parse('2026-06-01T00:00:00.000Z');
    // less than a full monthly cycle: nothing owed
    expect(
      computeAccruedDistributions(inv, TOKENIZED_PROPERTIES, t0, t0 + monthMs - 1)
    ).toHaveLength(0);
    // exactly one monthly cycle: the LIVE holding is owed one cycle, FUNDING none
    const one = computeAccruedDistributions(inv, TOKENIZED_PROPERTIES, t0, t0 + monthMs);
    expect(one).toHaveLength(1);
    expect(one[0].propertyId).toBe(live.id);
    expect(one[0].amountUsd).toBeCloseTo(1000 * perCycleDistributionUsd(live));
    // two quarterly cycles for a quarterly LIVE asset
    {
      const qInv = [{ ...inv[0], propertyId: quarterlyLive.id }];
      const qMs = 91 * 24 * 60 * 60 * 1000;
      const two = computeAccruedDistributions(qInv, TOKENIZED_PROPERTIES, t0, t0 + 2 * qMs + 1000);
      const entry = two.find((e) => e.propertyId === quarterlyLive.id);
      expect(entry?.amountUsd).toBeCloseTo(1000 * perCycleDistributionUsd(quarterlyLive) * 2);
    }
  });

  it('advanceTrialCycle credits the wallet and records distributions', () => {
    seedDeepWallet();
    const r = getStore();
    // LIVE offerings are fully funded (sold out) — take a position via the
    // secondary market, which is exactly what a trial user would do.
    const live = r.current.properties.find(
      (p) => !p.custom && p.status === 'LIVE' && p.distributionFreq === 'MONTHLY'
    )!;
    kyc(r);
    act(() => {
      r.current.buySecondary(live.id, 500);
    });
    const walletBefore = r.current.walletUsd;
    let res: ReturnType<typeof r.current.advanceTrialCycle> | undefined;
    act(() => {
      res = r.current.advanceTrialCycle();
    });
    // first advance only sets the accrual baseline (no free money on day one)
    expect(res?.creditedUsd).toBe(0);
    // second advance crosses a full monthly cycle
    let res2: ReturnType<typeof r.current.advanceTrialCycle> | undefined;
    act(() => {
      res2 = r.current.advanceTrialCycle();
    });
    expect(res2?.creditedUsd).toBeGreaterThan(0);
    expect(r.current.walletUsd).toBeGreaterThan(walletBefore);
    expect(r.current.receivedDistributions.length).toBeGreaterThan(0);
  });

  it('FUNDING offering that sells out becomes FUNDED, then opens trading', () => {
    seedDeepWallet();
    const r = getStore();
    const target = r.current.properties.find((p) => p.status === 'FUNDING')!;
    const available = target.totalTokens - target.tokensSold;
    kyc(r);
    act(() => {
      r.current.buyTokens(target.id, available);
    });
    const funded = r.current.properties.find((p) => p.id === target.id)!;
    expect(['FUNDED', 'LIVE']).toContain(funded.status);
    act(() => {
      r.current.openTrading(target.id);
    });
    const trading = r.current.properties.find((p) => p.id === target.id)!;
    expect(trading.status).toBe('LIVE');
  });

  it('mark-to-market values holdings at live prices', () => {
    seedDeepWallet();
    const r = getStore();
    const live = r.current.properties.find(
      (p) => !p.custom && (p.status === 'LIVE' || p.status === 'FUNDING')
    )!;
    kyc(r);
    act(() => {
      r.current.buySecondary(live.id, 1000);
    });
    const mtm = portfolioMarkToMarket(
      r.current.investments,
      r.current.properties,
      JSON.parse(localStorage.getItem('keja-tokenize-v1') ?? '{}').marketPrices ?? {}
    );
    expect(mtm.totalCostUsd).toBeGreaterThan(0);
    expect(mtm.currentValueUsd).toBeGreaterThan(0);
  });

  it('resetTrial restores fresh credits and clears holdings', () => {
    const r = getStore();
    const target = openOffering(r);
    kyc(r);
    act(() => {
      r.current.buyTokens(target.id, 10);
    });
    act(() => {
      r.current.resetTrial();
    });
    expect(r.current.walletUsd).toBe(TRIAL_START_BALANCE_USD);
    expect(r.current.investments).toHaveLength(0);
    expect(r.current.trades).toHaveLength(0);
  });
});
