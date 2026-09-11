/**
 * The event SDK (audit ch.8 "Implementation sequence"): one typed `emit()`
 * that validates against the taxonomy, redacts by construction, appends
 * immutably to a capped local ring buffer, and mirrors cookielessly to the
 * telemetry endpoint when one is configured.
 *
 * Failure policy: analytics must never break the product. Every failure
 * path (storage blocked, invalid payload, unknown event) drops or
 * degrades silently in production and counts itself in `eventStats()`
 * so the data-quality report (quality.ts) can see it.
 */
import type { z } from 'zod';
import { captureEvent } from '@/lib/telemetry';
import {
  type ActorClass,
  type EventEnvelope,
  detectPlatform,
  currentReleaseTag,
  newRequestId,
  sessionId,
} from './envelope';
import { TAXONOMY, type EventName } from './taxonomy';

const BUFFER_KEY = 'keja.events.v2';
const BUFFER_MAX = 500;

/* ------------------------------ ring buffer ----------------------------- */

interface StoredEnvelope extends EventEnvelope {
  /** Ingestion outcome — kept for the data-quality report. */
  _q?: 'ok' | 'repaired';
}

let cache: StoredEnvelope[] | null = null;

function load(): StoredEnvelope[] {
  if (!cache) {
    try {
      const raw = localStorage.getItem(BUFFER_KEY);
      cache = raw ? (JSON.parse(raw) as StoredEnvelope[]) : [];
    } catch {
      cache = [];
    }
  }
  return cache;
}

function persist(next: StoredEnvelope[]) {
  cache = next;
  try {
    localStorage.setItem(BUFFER_KEY, JSON.stringify(next));
  } catch {
    /* storage full / private mode — analytics must never break the app */
  }
}

/* -------------------------------- stats --------------------------------- */

interface SdkStats {
  emitted: number;
  droppedInvalid: number;
  droppedUnknown: number;
  repaired: number;
}

const stats: SdkStats = { emitted: 0, droppedInvalid: 0, droppedUnknown: 0, repaired: 0 };

/** In-memory ingestion counters (per page load) for the quality report. */
export function eventStats(): Readonly<SdkStats> {
  return { ...stats };
}

/* --------------------------------- emit --------------------------------- */

export type EmitResult =
  | { ok: true; envelope: EventEnvelope }
  | { ok: false; reason: 'unknown-event' | 'invalid-payload' };

/**
 * Emit a governed event. The payload is validated against the taxonomy's
 * strict schema; a payload that fails validation once is retried after
 * mechanical redaction (safeText transform) and dropped if it still fails.
 */
export function emit(
  event: EventName,
  props: Record<string, unknown>,
  opts: { actor?: ActorClass } = {},
): EmitResult {
  const def = TAXONOMY[event];
  if (!def) {
    stats.droppedUnknown++;
    if (process.env.NODE_ENV === 'development') console.warn('[events] unknown event', event);
    return { ok: false, reason: 'unknown-event' };
  }

  const parsed = def.schema.safeParse(props);
  let validated: Record<string, unknown>;
  if (parsed.success) {
    validated = parsed.data as Record<string, unknown>;
  } else {
    // One mechanical repair pass: strip unknown keys, re-validate with
    // redaction transforms. If it still fails, the payload is out of
    // contract — drop it and count it.
    const stripped = Object.fromEntries(
      Object.entries(props).filter(([k]) => shapeOf(def.schema).has(k)),
    );
    const retry = def.schema.safeParse(stripped);
    if (!retry.success) {
      stats.droppedInvalid++;
      if (process.env.NODE_ENV === 'development') {
        console.warn('[events] payload out of contract, dropped', event, retry.error.issues);
      }
      return { ok: false, reason: 'invalid-payload' };
    }
    validated = retry.data as Record<string, unknown>;
    stats.repaired++;
  }

  const envelope: StoredEnvelope = {
    v: 1,
    event,
    ts: new Date().toISOString(),
    sid: sessionId(),
    rid: newRequestId(),
    rel: currentReleaseTag(),
    plat: detectPlatform(),
    actor: opts.actor ?? 'anonymous',
    props: validated,
    _q: parsed.success ? 'ok' : 'repaired',
  };

  // Append-only: the stored array is never mutated in place.
  persist([...load(), envelope].slice(-BUFFER_MAX));
  stats.emitted++;

  // Cookieless mirror (no-op without NEXT_PUBLIC_ANALYTICS_ENDPOINT).
  captureEvent(event, { ...(envelope.props as Record<string, unknown>), ts: envelope.ts, rid: envelope.rid });

  return { ok: true, envelope };
}

/** Read-only access for dashboards / the data-quality report. */
export function eventLog(): readonly StoredEnvelope[] {
  return load();
}

export function clearEventLog(): void {
  persist([]);
}

/* ------------------------------- helpers -------------------------------- */

/** Extract the declared field names from a zod strictObject schema (public API). */
function shapeOf(schema: z.ZodType): Set<string> {
  const maybe = schema as unknown as { shape?: Record<string, unknown> };
  return new Set(maybe.shape ? Object.keys(maybe.shape) : []);
}
