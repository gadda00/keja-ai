// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import {
  type AnalyticsEvent,
  clearEvents,
  EVENT_TAXONOMY,
  EVENT_TAXONOMY_DOC,
  recentEvents,
  track,
} from '@/lib/analytics';

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('analytics event bus', () => {
  afterEach(() => clearEvents());

  it('accepts only taxonomy events and stores them locally', async () => {
    const e: AnalyticsEvent = { event: 'search', query: '2br kilimani', results: 5 };
    track(e);
    await flush();
    expect(recentEvents().length).toBe(1);
    expect(recentEvents()[0].e).toEqual(e);
    expect(recentEvents()[0].t).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('drops events outside the taxonomy', async () => {
    track({ event: 'telemetry_pii_leak' } as unknown as AnalyticsEvent);
    await flush();
    expect(recentEvents().length).toBe(0);
  });

  it('caps the ring buffer', async () => {
    for (let i = 0; i < 250; i++) {
      track({ event: 'save', propertyId: `KJA-${i}` });
    }
    await flush();
    expect(recentEvents().length).toBe(200);
    expect(recentEvents()[0].e).toEqual({ event: 'save', propertyId: 'KJA-50' });
  });

  it('documents every taxonomy event', () => {
    expect(EVENT_TAXONOMY.length).toBeGreaterThan(8);
    for (const name of EVENT_TAXONOMY) {
      expect(EVENT_TAXONOMY_DOC[name]?.length ?? 0).toBeGreaterThan(10);
    }
  });

  it('never throws when storage is unavailable', () => {
    const original = localStorage.setItem;
    localStorage.setItem = () => {
      throw new Error('quota exceeded');
    };
    expect(() => track({ event: 'compare_add', propertyId: 'KJA-001' })).not.toThrow();
    localStorage.setItem = original;
  });
});
