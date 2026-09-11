/**
 * Privacy-first analytics event bus — now the typed façade over the
 * governed event layer (audit Sprint 1+2).
 *
 * Review feedback: define an event taxonomy for search, result view,
 * calculator completion, save, compare, chat qualification, viewing request
 * and human handoff — so growth learning is possible from day one. The
 * constraint: this build has no backend and no third-party trackers, and it
 * should stay that way. So the bus is local-only:
 *
 *   - dev:   events print to the console for debugging
 *   - prod: events append to an in-device ring buffer (capped, inspectable)
 *   - never: no network calls, no cookies, no fingerprinting
 *
 * Every call now flows through src/lib/events (the governed layer): the
 * legacy unversioned names below map to versioned `namespace.verb.v1`
 * events, payloads are validated against strict Zod schemas, free text is
 * mechanically redacted, and the stored records carry the full envelope
 * (session id, request id, release, platform, actor class) so the
 * data-quality report and metric registry stay executable.
 */

import {
  emit,
  eventLog,
  clearEventLog,
  type EventName,
  LEGACY_NAMES,
} from '@/lib/events';

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

/** @deprecated — use the versioned names from '@/lib/events' in new code. */
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

/** @deprecated — documentation moved to the governed taxonomy. */
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

/** Record an analytics event through the governed layer.
 *
 *  Fire-and-forget; total failure is acceptable and counted. Local ring
 *  buffer always; when NEXT_PUBLIC_ANALYTICS_ENDPOINT is set the same
 *  event is mirrored off-device through the cookieless telemetry channel
 *  (audit F-11 / P1-5) — sendBeacon, no cookies, no PII, tagged with the
 *  build release. */
export function track(payload: AnalyticsEvent): void {
  if (typeof window === 'undefined') return;
  const { event: legacy, ...props } = payload;
  const governed: EventName | undefined = LEGACY_NAMES[legacy];
  if (!governed) {
    if (process.env.NODE_ENV === 'development') console.warn('[analytics] unknown event', legacy);
    return;
  }
  emit(governed, props);
}

/** Read-only access for debugging / dashboards (governed envelopes). */
export function recentEvents(): readonly ReturnType<typeof eventLog>[number][] {
  return eventLog();
}

export function clearEvents(): void {
  clearEventLog();
}
