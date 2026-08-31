/**
 * Privacy-first analytics event bus.
 *
 * Review feedback: define an event taxonomy for search, result view,
 * calculator completion, save, compare, chat qualification, viewing request
 * and human handoff — so growth learning is possible from day one. The
 * constraint: this build has no backend and no third-party trackers, and it
 * should stay that way. So the bus is local-only:
 *
 *   - dev:   events print to the console for debugging
 *   - prod:  events append to an in-device ring buffer (capped, inspectable)
 *   - never: no network calls, no cookies, no fingerprinting
 *
 * The taxonomy below is the single source of truth; `track()` refuses events
 * outside it (compile-time via the union, runtime via console warning in dev).
 */

export type AnalyticsEvent =
  | { event: 'search'; query: string; results: number }
  | { event: 'result_view'; propertyId: string }
  | { event: 'save'; propertyId: string }
  | { event: 'compare_add'; propertyId: string }
  | { event: 'calculator_complete'; calculator: 'roi' | 'mortgage' | 'affordability' }
  | { event: 'chat_qualified'; intent: string }
  | { event: 'viewing_request'; propertyId: string }
  | { event: 'human_handoff'; channel: 'whatsapp' | 'contact'; context?: string }
  | { event: 'role_selected'; role: string }
  | { event: 'issue_reported'; propertyId: string; reason: string }
  | { event: 'evidence_reviewed'; propertyId: string };

export const EVENT_TAXONOMY = [
  'search',
  'result_view',
  'save',
  'compare_add',
  'calculator_complete',
  'chat_qualified',
  'viewing_request',
  'human_handoff',
  'role_selected',
  'issue_reported',
  'evidence_reviewed',
] as const;

export const EVENT_TAXONOMY_DOC: Record<string, string> = {
  search: 'A search query completed with its result count.',
  result_view: 'A listing detail page was opened.',
  save: 'A listing was saved to favourites.',
  compare_add: 'A listing was added to the compare tray.',
  calculator_complete: 'A calculator produced a full result.',
  chat_qualified: 'Keja AI identified transaction intent in conversation.',
  viewing_request: 'A viewing request flow was started or submitted.',
  human_handoff: 'A user was routed to a human (WhatsApp / contact form).',
  role_selected: 'A first-visit role was chosen (buy / rent / invest / list / manage).',
  issue_reported: 'A listing issue was reported for adjudication.',
  evidence_reviewed: 'A user expanded the evidence panel on a listing.',
};

const BUFFER_KEY = 'keja.analytics.v1';
const BUFFER_MAX = 200;

interface StoredEvent {
  t: string; // ISO timestamp
  e: AnalyticsEvent;
}

let buffer: StoredEvent[] | null = null;

function loadBuffer(): StoredEvent[] {
  if (!buffer) {
    try {
      const raw = localStorage.getItem(BUFFER_KEY);
      buffer = raw ? (JSON.parse(raw) as StoredEvent[]) : [];
    } catch {
      buffer = [];
    }
  }
  return buffer;
}

function persist(next: StoredEvent[]) {
  buffer = next;
  try {
    localStorage.setItem(BUFFER_KEY, JSON.stringify(next));
  } catch {
    /* storage full or blocked — analytics must never break the app */
  }
}

/** Record an analytics event. Fire-and-forget; total failure is acceptable. */
export function track(payload: AnalyticsEvent): void {
  if (typeof window === 'undefined') return;
  if (!EVENT_TAXONOMY.includes(payload.event as never)) {
    if (import.meta.env.DEV) console.warn('[analytics] unknown event', payload);
    return;
  }
  const entry: StoredEvent = { t: new Date().toISOString(), e: payload };
  const next = [...loadBuffer(), entry].slice(-BUFFER_MAX);
  persist(next);
}

/** Read-only access for debugging / future dashboards. */
export function recentEvents(): readonly StoredEvent[] {
  return loadBuffer();
}

export function clearEvents(): void {
  persist([]);
}
