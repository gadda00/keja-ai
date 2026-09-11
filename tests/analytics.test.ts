/**
 * Governed analytics layer — taxonomy enforcement, envelope contract,
 * redaction-by-design and ring-buffer policy (audit Sprint 1+2).
 *
 * The promise under test: versioned events with strict schemas, envelopes
 * carrying session/request/release lineage, mechanical redaction of free
 * text, a capped append-only local buffer, and hard refusal of anything
 * outside the taxonomy — no network, no silent growth.
 */
import { clearEvents, EVENT_TAXONOMY, recentEvents, track } from '@/lib/analytics';
import { dataQualityReport } from '@/lib/events/quality';
import { computeMetrics, METRIC_REGISTRY } from '@/lib/events/metrics';
import { TAXONOMY } from '@/lib/events/taxonomy';

const KEY = 'keja.events.v2';

describe('taxonomy', () => {
  it('maps every legacy name to a governed versioned event', () => {
    expect(EVENT_TAXONOMY).toHaveLength(11);
    for (const legacy of EVENT_TAXONOMY) {
      expect(legacy).toBeTruthy();
    }
  });

  it('every governed event is namespaced and versioned', () => {
    for (const name of Object.keys(TAXONOMY)) {
      expect(name).toMatch(/^[a-z]+(\.[a-z_]+)+\.v\d+$/);
    }
  });

  it('every taxonomy entry declares a privacy class and schema', () => {
    for (const def of Object.values(TAXONOMY)) {
      expect(['public', 'pseudonymous', 'confidential']).toContain(def.privacy);
      expect(def.schema).toBeTruthy();
      expect(def.description.length).toBeGreaterThan(10);
    }
  });
});

describe('track (governed facade)', () => {
  beforeEach(() => {
    clearEvents();
  });

  it('stores a valid event as a full envelope', () => {
    track({ event: 'search', query: '2br kilimani', results: 7 });
    const events = recentEvents();
    expect(events).toHaveLength(1);
    const e = events[0];
    expect(e.event).toBe('search.performed.v1');
    expect(e.props).toEqual({ query: '2br kilimani', results: 7 });
    expect(e.v).toBe(1);
    expect(e.sid).toMatch(/^[0-9a-f-]{36}$/i);
    expect(e.rid).toMatch(/^[0-9a-f-]{36}$/i);
    expect(e.ts).toBeTruthy();
    expect(['web', 'android', 'ios']).toContain(e.plat);
    expect(e.actor).toBe('anonymous');
  });

  it('redacts free text mechanically (control chars + length cap)', () => {
    track({ event: 'search', query: 'a\u0000b\u0007c   \u001fd', results: 0 });
    const e = recentEvents()[0];
    expect(e.props.query).toBe('a b c d');
    track({
      event: 'search',
      query: 'x'.repeat(300),
      results: 0,
    });
    expect(recentEvents()[1].props.query).toHaveLength(120);
  });

  it('drops payloads with unknown fields is repaired, not stored raw', () => {
    track({ event: 'result_view', propertyId: 'KJA-001', sneaky: 'pii' } as unknown as Parameters<typeof track>[0]);
    const e = recentEvents()[0];
    // unknown keys never reach storage
    expect(e.props).toEqual({ propertyId: 'KJA-001' });
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

  it('caps the ring buffer at 500 entries', () => {
    for (let i = 0; i < 530; i++) {
      track({ event: 'result_view', propertyId: `KJA-${i}` });
    }
    const events = recentEvents();
    expect(events).toHaveLength(500);
    // the newest 500 survive — the first 30 were evicted
    expect(events[0].props).toEqual({ propertyId: 'KJA-30' });
    expect(events[499].props).toEqual({ propertyId: 'KJA-529' });
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

describe('data quality report', () => {
  it('reports an empty verdict on an empty log', () => {
    const r = dataQualityReport([], Object.keys(TAXONOMY));
    expect(r.verdict).toBe('empty');
    expect(r.totalEvents).toBe(0);
  });

  it('passes all checks on a clean governed log', () => {
    track({ event: 'search', query: 'kilimani', results: 5 });
    track({ event: 'result_view', propertyId: 'KJA-001' });
    track({ event: 'evidence_reviewed', propertyId: 'KJA-001' });
    const r = dataQualityReport(recentEvents() as unknown as Parameters<typeof dataQualityReport>[0], Object.keys(TAXONOMY));
    expect(r.verdict).toBe('pass');
    expect(r.totalEvents).toBe(3);
    expect(r.checks.length).toBeGreaterThan(6);
  });

  it('fails validity when unknown events appear in the log', () => {
    const bad = [{ v: 1, event: 'rogue.event.v1', ts: new Date().toISOString(), sid: 's', rid: 'r', rel: 'x', plat: 'web', actor: 'anonymous', props: {} }];
    const r = dataQualityReport(bad, Object.keys(TAXONOMY));
    expect(r.verdict).toBe('fail');
    expect(r.checks.find((c) => c.name === 'known_events')?.status).toBe('fail');
  });
});

describe('metric registry', () => {
  it('documents owner, formula, sources and privacy class for every metric', () => {
    expect(METRIC_REGISTRY.length).toBeGreaterThanOrEqual(9);
    for (const m of METRIC_REGISTRY) {
      expect(m.formula).toBeTruthy();
      expect(m.sources.length).toBeGreaterThan(0);
      expect(['public', 'pseudonymous', 'confidential']).toContain(m.privacyClass);
      expect(m.limitations).toBeTruthy();
      expect(['product', 'operations', 'trust']).toContain(m.owner);
    }
  });

  it('computes search success and engagement from a governed log', () => {
    const log = [
      { event: 'search.performed.v1', ts: '2026-09-11T10:00:00Z', sid: 's1', props: { query: 'a', results: 5 } },
      { event: 'search.performed.v1', ts: '2026-09-11T10:01:00Z', sid: 's1', props: { query: 'b', results: 0 } },
      { event: 'listing.viewed.v1', ts: '2026-09-11T10:02:00Z', sid: 's1', props: { propertyId: 'KJA-001' } },
      { event: 'listing.evidence_reviewed.v1', ts: '2026-09-11T10:03:00Z', sid: 's1', props: { propertyId: 'KJA-001' } },
      { event: 'ai.answer.generated.v1', ts: '2026-09-11T10:04:00Z', sid: 's1', props: { surface: 'ask-keja', intent: 'buy', citations: 2, confidence: 'high', outcome: 'answered', latencyMs: 40, provider: 'local-deterministic' } },
    ];
    const m = Object.fromEntries(computeMetrics(log).map((x) => [x.name, x]));
    expect(m.search_success_rate.value).toBeCloseTo(0.5);
    expect(m.listing_engagement_rate.value).toBeCloseTo(0.5);
    expect(m.evidence_review_rate.value).toBeCloseTo(1);
    expect(m.ai_grounded_answer_rate.value).toBeCloseTo(1);
  });

  it('reports insufficient data instead of inventing values', () => {
    const m = computeMetrics([]);
    const ssr = m.find((x) => x.name === 'search_success_rate');
    expect(ssr?.insufficientData).toBe(true);
    expect(ssr?.value).toBeNull();
  });
});
