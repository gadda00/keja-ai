// @vitest-environment jsdom
/**
 * Tokenize store — the money-flow simulation. Regression coverage for:
 *  - buy cap must NOT double-count soldDelta (the memo already folds it in —
 *    the old code subtracted the user's own purchases twice, blocking
 *    legitimate buyers and inflating funded %)
 *  - FIFO sell accounting
 *  - loadDemoPortfolio keeps marketplace funding % consistent with holdings
 */
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { TokenizeProvider, useTokenize } from '@/lib/tokenizeStore';

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

  it('rejects orders exceeding the remaining supply exactly at the cap', () => {
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
