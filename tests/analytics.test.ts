/**
 * Privacy-first analytics bus — taxonomy enforcement + ring-buffer policy.
 *
 * The promise under test (review P1-5): an 11-event taxonomy, a capped
 * local-only ring buffer, and hard refusal of anything outside the
 * taxonomy — no network, no silent growth.
 */
import { clearEvents, EVENT_TAXONOMY, recentEvents, track } from '@/lib/analytics';

const KEY = 'keja.analytics.v1';

describe('taxonomy', () => {
  it('is the documented 11-event set', () => {
    expect(EVENT_TAXONOMY).toHaveLength(11);
    expect([...EVENT_TAXONOMY]).toEqual(
      expect.arrayContaining(['search', 'result_view', 'save', 'human_handoff', 'role_selected']),
    );
  });

  it('every taxonomy entry is unique', () => {
    expect(new Set(EVENT_TAXONOMY).size).toBe(EVENT_TAXONOMY.length);
  });
});

describe('track', () => {
  beforeEach(() => {
    clearEvents();
  });

  it('stores a valid event with a timestamp', () => {
    track({ event: 'search', query: '2br kilimani', results: 7 });
    const events = recentEvents();
    expect(events).toHaveLength(1);
    expect(events[0].e).toEqual({ event: 'search', query: '2br kilimani', results: 7 });
    expect(new Date(events[0].t).toString()).not.toBe('Invalid Date');
  });

  it('accepts every event kind in the taxonomy', () => {
    track({ event: 'search', query: 'q', results: 0 });
    track({ event: 'result_view', propertyId: 'KJA-001' });
    track({ event: 'save', propertyId: 'KJA-001' });
    track({ event: 'compare_add', propertyId: 'KJA-001' });
    track({ event: 'calculator_complete', calculator: 'roi' });
    track({ event: 'chat_qualified', intent: 'buy' });
    track({ event: 'viewing_request', propertyId: 'KJA-001' });
    track({ event: 'human_handoff', channel: 'whatsapp' });
    track({ event: 'role_selected', role: 'invest' });
    track({ event: 'issue_reported', propertyId: 'KJA-001', reason: 'stale' });
    track({ event: 'evidence_reviewed', propertyId: 'KJA-001' });
    expect(recentEvents()).toHaveLength(11);
  });

  it('refuses events outside the taxonomy', () => {
    track({ event: 'not_a_real_event' } as unknown as Parameters<typeof track>[0]);
    expect(recentEvents()).toHaveLength(0);
    expect(localStorage.getItem(KEY)).toBe('[]');
  });

  it('caps the ring buffer at 200 entries', () => {
    for (let i = 0; i < 230; i++) {
      track({ event: 'result_view', propertyId: `KJA-${i}` });
    }
    const events = recentEvents();
    expect(events).toHaveLength(200);
    // the newest 200 survive — the first 30 were evicted
    expect(events[0].e).toEqual({ event: 'result_view', propertyId: 'KJA-30' });
    expect(events[199].e).toEqual({ event: 'result_view', propertyId: 'KJA-229' });
  });

  it('persists through localStorage', () => {
    track({ event: 'save', propertyId: 'KJA-001' });
    const raw = localStorage.getItem(KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw as string)).toHaveLength(1);
  });

  it('survives a corrupted stored buffer (resets to empty)', async () => {
    track({ event: 'save', propertyId: 'KJA-001' }); // populate the module cache
    localStorage.setItem(KEY, '{not json'); // corrupt the persisted copy
    // simulate a page reload: fresh module instance must survive the bad read
    vi.resetModules();
    const fresh = await import('@/lib/analytics');
    expect(fresh.recentEvents()).toEqual([]);
    fresh.track({ event: 'save', propertyId: 'KJA-002' });
    expect(fresh.recentEvents()).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(KEY) as string)).toHaveLength(1);
  });

  it('clearEvents empties the buffer and storage', () => {
    track({ event: 'save', propertyId: 'KJA-001' });
    clearEvents();
    expect(recentEvents()).toHaveLength(0);
    expect(localStorage.getItem(KEY)).toBe('[]');
  });
});
