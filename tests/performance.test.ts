/**
 * Performance utilities (2026-09-11).
 *
 * Locks the behaviour of the pure helpers shipped with the Phase-4
 * performance library: debounce/throttle timing semantics, memoization
 * (incl. TTL expiry), virtual-scroll windowing math, batch chunking, and
 * the SSR guards on the browser-only helpers.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  batchUpdates,
  calculateVisibleRange,
  debounce,
  getAdaptiveImageUrl,
  lazyLoad,
  memoize,
  memoizeWithTTL,
  throttle,
  trackPerformanceMetric,
} from '@/lib/performance';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces rapid calls into a single trailing invocation', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced('a');
    debounced('b');
    debounced('c');

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(299);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('c');
  });

  it('restarts the window on every call', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(90);
    debounced();
    vi.advanceTimersByTime(90);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(10);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('uses the 300ms default wait', () => {
    const fn = vi.fn();
    const debounced = debounce(fn);

    debounced();
    vi.advanceTimersByTime(299);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires the leading call immediately', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(1);
  });

  it('buffers at most one trailing call with the latest args', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled('first');
    throttled('second');
    throttled('third');

    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('third');
  });

  it('does not fire a trailing call when nothing was buffered', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    vi.advanceTimersByTime(1000);

    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('memoize', () => {
  it('caches by serialized arguments', () => {
    const fn = vi.fn((a: number, b: number) => a + b);
    const memoized = memoize(fn);

    expect(memoized(1, 2)).toBe(3);
    expect(memoized(1, 2)).toBe(3);
    expect(fn).toHaveBeenCalledTimes(1);

    expect(memoized(2, 2)).toBe(4);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('supports a custom key function', () => {
    const fn = vi.fn((n: number) => n * 2);
    const memoized = memoize(fn, (n) => `n:${n}`);

    expect(memoized(21)).toBe(42);
    expect(memoized(21)).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('memoizeWithTTL', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-11T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the cached value inside the TTL window', () => {
    const fn = vi.fn(() => 'fresh');
    const memoized = memoizeWithTTL(fn, 1000);

    expect(memoized()).toBe('fresh');
    vi.advanceTimersByTime(999);
    expect(memoized()).toBe('fresh');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('recomputes after the TTL expires', () => {
    const fn = vi.fn(() => 'fresh');
    const memoized = memoizeWithTTL(fn, 1000);

    memoized();
    vi.advanceTimersByTime(1001);
    memoized();

    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('lazyLoad', () => {
  it('resolves with the default export and caches it', async () => {
    let imports = 0;
    const loader = lazyLoad(async () => {
      imports += 1;
      return { default: 'module-value' };
    });

    expect(await loader).toBe('module-value');
    expect(await loader).toBe('module-value');
    expect(imports).toBe(1);
  });
});

describe('calculateVisibleRange', () => {
  it('computes a buffered window for a mid-list offset', () => {
    const result = calculateVisibleRange(1000, {
      itemHeight: 50,
      bufferItems: 3,
      containerHeight: 600,
      totalItems: 500,
    });

    // scrollTop 1000 / itemHeight 50 = row 20; minus buffer 3 = 17
    expect(result.visibleRange.start).toBe(17);
    // visible count = ceil(600 / 50) = 12; 17 + 12 + 6 = 35 (clamped by total)
    expect(result.visibleRange.end).toBe(35);
    expect(result.totalHeight).toBe(500 * 50);
  });

  it('clamps to the list bounds', () => {
    const result = calculateVisibleRange(0, {
      itemHeight: 100,
      bufferItems: 5,
      containerHeight: 400,
      totalItems: 3,
    });

    expect(result.visibleRange.start).toBe(0);
    expect(result.visibleRange.end).toBe(2);
    expect(result.totalHeight).toBe(300);
  });

  it('clamps a start scrolled past the end of the list', () => {
    const result = calculateVisibleRange(10_000, {
      itemHeight: 100,
      bufferItems: 2,
      containerHeight: 400,
      totalItems: 5,
    });

    // floor(10000/100) - 2 = 98 → beyond totalItems - 1
    expect(result.visibleRange.start).toBe(98);
    expect(result.visibleRange.end).toBe(4);
  });
});

describe('trackPerformanceMetric', () => {
  it('rates values against the good/poor thresholds', () => {
    expect(trackPerformanceMetric('FCP', 1500, { good: 1800, poor: 3000 }).rating).toBe('good');
    expect(trackPerformanceMetric('FCP', 2000, { good: 1800, poor: 3000 }).rating).toBe('needs-improvement');
    expect(trackPerformanceMetric('FCP', 4000, { good: 1800, poor: 3000 }).rating).toBe('poor');
  });
});

describe('getAdaptiveImageUrl', () => {
  it('picks the medium variant on normal connections', () => {
    expect(
      getAdaptiveImageUrl('base.jpg', {
        full: 'full.jpg',
        medium: 'medium.jpg',
        small: 'small.jpg',
      }),
    ).toBe('medium.jpg');
  });

  it('falls back to the base URL when a variant is missing', () => {
    expect(
      getAdaptiveImageUrl('base.jpg', { full: 'full.jpg', medium: '', small: '' }),
    ).toBe('base.jpg');
  });
});

describe('batchUpdates', () => {
  it('invokes the callback once per chunk with the chunk contents', () => {
    const seen: number[][] = [];
    batchUpdates([1, 2, 3, 4, 5, 6, 7], 3, (batch) => {
      seen.push([...batch]);
    });

    expect(seen).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });

  it('handles an empty input without invoking the callback', () => {
    const cb = vi.fn();
    batchUpdates([], 10, cb);
    expect(cb).not.toHaveBeenCalled();
  });
});

describe('SSR guards', () => {
  // The vitest environment is node-only, so these helpers must degrade
  // gracefully instead of touching `window` / `document`.
  it('prefersReducedMotion / isSlowConnection return false without a DOM', async () => {
    const { prefersReducedMotion, isSlowConnection, preloadImages } =
      await import('@/lib/performance');

    expect(prefersReducedMotion()).toBe(false);
    expect(isSlowConnection()).toBe(false);
    expect(() => preloadImages(['a.jpg', 'b.jpg'])).not.toThrow();
  });
});
