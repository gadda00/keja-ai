/**
 * TokenizeProvider render smoke — the React #185 regression (wave 18).
 *
 * The live smoke test on the investor dashboard caught a production-killing
 * loop that pre-dated the wave: TokenizeProvider read its "live trial clock"
 * through useSyncExternalStore with `getSnapshot: () => Date.now()` — an
 * UNCACHED snapshot. React requires getSnapshot to return a stable value
 * between notifications; a fresh Date.now() on every call makes React
 * re-render to reconcile, forever, until "Maximum update depth exceeded"
 * (error #185) killed the view behind the error boundary. /portfolio was
 * dead for every visitor since the recharts 3.10 bump (the chart effects
 * gave the loop enough render rounds to blow the limit).
 *
 * The fix: the clock was REMOVED from the store entirely — trialNowMs was
 * dead API (no component ever consumed it), so the store now subscribes to
 * nothing and forces no re-renders of its own. This test mounts the
 * provider and PROVES the render settles: if the uncached snapshot ever
 * comes back, the mount itself throws error #185 under act().
 */
import { render, screen } from '@testing-library/react';

import { TokenizeProvider } from '@/lib/tokenizeStore';

describe('TokenizeProvider render stability (wave 18, React #185 fix)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('mounts and settles without the infinite snapshot reconciliation loop', () => {
    expect(() =>
      render(
        <TokenizeProvider>
          <div>tokenize-smoke-child</div>
        </TokenizeProvider>,
      ),
    ).not.toThrow();
    expect(screen.getByText('tokenize-smoke-child')).toBeTruthy();
  });
});
