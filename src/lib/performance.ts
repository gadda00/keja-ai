/**
 * Keja AI Performance Utilities
 * 
 * A collection of performance optimization utilities for the Keja platform.
 * This module provides tools for:
 * - Debouncing and throttling
 * - Memoization
 * - Lazy loading
 * - Performance monitoring
 * - Virtual scrolling
 */

/**
 * Debounce a function to prevent it from being called too frequently.
 * Useful for search inputs, window resize, etc.
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number = 300
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, wait);
  };
}

/**
 * Throttle a function to ensure it's called at most once per specified time period.
 * Useful for scroll handlers, animations, etc.
 */
export function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  limit: number = 100
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          func(...lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  };
}

/**
 * Memoize a function to cache its results.
 * Useful for expensive computations with pure inputs.
 */
export function memoize<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  keyFn?: (...args: Parameters<T>) => string
): (...args: Parameters<T>) => ReturnType<T> {
  const cache = new Map<string, ReturnType<T>>();

  return (...args: Parameters<T>) => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    const result = func(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Create a memoized version of a function with a TTL (time-to-live).
 * Useful for caching API responses or computed values that need periodic refresh.
 */
export function memoizeWithTTL<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  ttl: number = 5 * 60 * 1000, // 5 minutes default
  keyFn?: (...args: Parameters<T>) => string
): (...args: Parameters<T>) => ReturnType<T> {
  const cache = new Map<string, { value: ReturnType<T>; timestamp: number }>();

  return (...args: Parameters<T>) => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    const cached = cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.value;
    }
    
    const result = func(...args);
    cache.set(key, { value: result, timestamp: Date.now() });
    return result;
  };
}

/**
 * Lazy load a component or resource.
 * Useful for code splitting and performance optimization.
 */
export function lazyLoad<T>(
  importFunc: () => Promise<{ default: T }>,
  loading?: T
): Promise<T> {
  let cached: T | null = null;
  let promise: Promise<T> | null = null;

  return new Promise((resolve) => {
    if (cached) {
      resolve(cached);
      return;
    }

    if (!promise) {
      promise = importFunc()
        .then((module) => {
          cached = module.default;
          return cached;
        })
        .catch((error) => {
          promise = null;
          throw error;
        });
    }

    promise.then(resolve);
  });
}

/**
 * Performance monitoring utilities using the Web Vitals API.
 * Tracks key performance metrics and reports them.
 */

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta?: number;
}

interface PerformanceReport {
  metrics: PerformanceMetric[];
  timestamp: number;
  url: string;
}

const performanceReports: PerformanceReport[] = [];

/**
 * Track a performance metric and store it for analysis.
 */
export function trackPerformanceMetric(
  name: string,
  value: number,
  thresholds: { good: number; poor: number }
): PerformanceMetric {
  const rating = value <= thresholds.good 
    ? 'good' 
    : value <= thresholds.poor 
      ? 'needs-improvement' 
      : 'poor';

  const metric: PerformanceMetric = { name, value, rating };
  
  // Calculate delta from previous report if available
  const lastReport = performanceReports.length > 0 
    ? performanceReports[performanceReports.length - 1] 
    : null;
  
  if (lastReport) {
    const lastMetric = lastReport.metrics.find(m => m.name === name);
    if (lastMetric) {
      metric.delta = value - lastMetric.value;
    }
  }

  return metric;
}

/**
 * Generate a performance report for the current page.
 */
export function generatePerformanceReport(): PerformanceReport {
  const metrics: PerformanceMetric[] = [];
  
  // Get standard Web Vitals if available
  if (typeof window !== 'undefined') {
    // First Contentful Paint
    const fcp = window.performance?.getEntriesByName?.('first-contentful-paint')?.[0];
    if (fcp) {
      metrics.push(trackPerformanceMetric(
        'FCP',
        fcp.startTime,
        { good: 1800, poor: 3000 } // 1.8s good, 3s poor
      ));
    }

    // Largest Contentful Paint
    const lcp = window.performance?.getEntriesByName?.('largest-contentful-paint')?.[0];
    if (lcp) {
      metrics.push(trackPerformanceMetric(
        'LCP',
        lcp.startTime,
        { good: 2500, poor: 4000 } // 2.5s good, 4s poor
      ));
    }

    // First Input Delay
    const fid = window.performance?.getEntriesByName?.('first-input')?.[0];
    if (fid) {
      metrics.push(trackPerformanceMetric(
        'FID',
        fid.startTime,
        { good: 100, poor: 300 } // 100ms good, 300ms poor
      ));
    }

    // Cumulative Layout Shift
    const clsEntries = window.performance?.getEntriesByName?.('layout-shift');
    if (clsEntries && clsEntries.length > 0) {
      const clsValue = clsEntries.reduce(
        (sum, entry: any) => sum + (entry.value || 0),
        0
      );
      metrics.push(trackPerformanceMetric(
        'CLS',
        clsValue,
        { good: 0.1, poor: 0.25 }
      ));
    }

    // Time to Interactive
    const tti = window.performance?.timing?.domInteractive - window.performance?.timing?.navigationStart;
    if (tti) {
      metrics.push(trackPerformanceMetric(
        'TTI',
        tti,
        { good: 3800, poor: 7300 } // 3.8s good, 7.3s poor
      ));
    }
  }

  const report: PerformanceReport = {
    metrics,
    timestamp: Date.now(),
    url: typeof window !== 'undefined' ? window.location.href : 'server',
  };

  performanceReports.push(report);
  
  // Keep only the last 100 reports
  if (performanceReports.length > 100) {
    performanceReports.shift();
  }

  return report;
}

/**
 * Get the average performance metrics across all reports.
 */
export function getAveragePerformanceMetrics(): PerformanceMetric[] {
  if (performanceReports.length === 0) {
    return [];
  }

  const metricMap = new Map<string, { sum: number; count: number; ratings: string[] }>();

  for (const report of performanceReports) {
    for (const metric of report.metrics) {
      if (!metricMap.has(metric.name)) {
        metricMap.set(metric.name, { sum: 0, count: 0, ratings: [] });
      }
      const entry = metricMap.get(metric.name)!;
      entry.sum += metric.value;
      entry.count += 1;
      entry.ratings.push(metric.rating);
    }
  }

  const averages: PerformanceMetric[] = [];
  
  for (const [name, data] of metricMap) {
    const averageValue = data.sum / data.count;
    // Determine overall rating based on majority
    const ratingCounts: Record<string, number> = {};
    for (const rating of data.ratings) {
      ratingCounts[rating] = (ratingCounts[rating] || 0) + 1;
    }
    const worstRating = Object.keys(ratingCounts).sort((a, b) => 
      ratingCounts[b] - ratingCounts[a]
    )[0] as 'good' | 'needs-improvement' | 'poor';
    
    averages.push({ name, value: averageValue, rating: worstRating });
  }

  return averages;
}

/**
 * Virtual scrolling utilities for long lists.
 * Improves performance by only rendering visible items.
 */

export interface VirtualScrollOptions {
  itemHeight: number;
  bufferItems: number;
  containerHeight: number;
  totalItems: number;
}

export interface VirtualScrollResult {
  visibleRange: { start: number; end: number };
  scrollTop: number;
  totalHeight: number;
}

/**
 * Calculate which items should be visible in a virtualized list.
 */
export function calculateVisibleRange(
  scrollTop: number,
  options: VirtualScrollOptions
): VirtualScrollResult {
  const { itemHeight, bufferItems, containerHeight, totalItems } = options;

  // Calculate the start index
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferItems);
  
  // Calculate the end index
  const visibleItemsCount = Math.ceil(containerHeight / itemHeight);
  const endIndex = Math.min(
    totalItems - 1,
    startIndex + visibleItemsCount + bufferItems * 2
  );

  const totalHeight = totalItems * itemHeight;

  return {
    visibleRange: { start: startIndex, end: endIndex },
    scrollTop,
    totalHeight,
  };
}

/**
 * Preload images that are about to become visible.
 * Improves perceived performance for image-heavy pages.
 */
export function preloadImages(
  imageUrls: string[],
  buffer: number = 5
): void {
  if (typeof window === 'undefined') return;

  const imagesToPreload = imageUrls.slice(0, Math.min(imageUrls.length, buffer));
  
  for (const url of imagesToPreload) {
    const img = new Image();
    img.src = url;
  }
}

/**
 * Check if the current device has reduced motion preference.
 * Useful for accessibility and performance optimizations.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if the current connection is slow (save-data or slow network).
 * Useful for adaptive loading strategies.
 */
export function isSlowConnection(): boolean {
  if (typeof window === 'undefined') return false;
  
  const navigatorConnection = (window.navigator as any).connection;
  if (navigatorConnection) {
    return (
      navigatorConnection.saveData ||
      navigatorConnection.effectiveType === 'slow-2g' ||
      navigatorConnection.effectiveType === '2g'
    );
  }
  
  return false;
}

/**
 * Adaptive image loading based on network conditions.
 * Returns the appropriate image URL based on connection speed.
 */
export function getAdaptiveImageUrl(
  baseUrl: string,
  sizes: { full: string; medium: string; small: string }
): string {
  if (isSlowConnection()) {
    return sizes.small || baseUrl;
  }
  
  // Default to medium for most connections
  return sizes.medium || baseUrl;
}

/**
 * Batch operations to reduce re-renders and improve performance.
 */
export function batchUpdates<T>(
  items: T[],
  batchSize: number = 50,
  callback: (batch: T[]) => void
): void {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    callback(batch);
  }
}

/**
 * Optimize CSS animations by using requestAnimationFrame.
 * Ensures smooth animations without jank.
 */
export function optimizeAnimation(
  callback: (timestamp: number) => void
): () => void {
  let running = false;
  let lastTimestamp = 0;

  function run(timestamp: number) {
    if (running) {
      const delta = timestamp - lastTimestamp;
      if (delta >= 16) { // ~60fps
        callback(timestamp);
        lastTimestamp = timestamp;
      }
      requestAnimationFrame(run);
    }
  }

  running = true;
  lastTimestamp = performance.now();
  requestAnimationFrame(run);

  return () => {
    running = false;
  };
}
