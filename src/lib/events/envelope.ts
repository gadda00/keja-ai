/**
 * Event envelope + identity primitives (audit ch.7–8, Sprint 1 data contracts).
 *
 * Every analytics event in Keja AI carries the same envelope: a schema
 * version, a namespaced+versioned event name, the time it occurred, the
 * session and request ids that correlate it, the release that produced it,
 * the platform it ran on and the actor class. Payloads are validated
 * allowlist-only (see taxonomy.ts) so an envelope can never smuggle
 * uncontracted fields — redaction by construction, not by review.
 *
 * Conventions follow the audit's guidance: OpenTelemetry-style common
 * attributes for technical telemetry, a governed product-event schema on
 * top (namespace . verb . version), and no PII beyond pseudonymous ids.
 */

export type ActorClass = 'anonymous' | 'user' | 'operator';
export type Platform = 'web' | 'android' | 'ios';

/** Envelope schema version — bump only with a documented migration. */
export const ENVELOPE_VERSION = 1 as const;

export interface EventEnvelope<P = Record<string, unknown>> {
  /** Envelope contract version. */
  v: typeof ENVELOPE_VERSION;
  /** Namespaced, versioned event name — e.g. `search.performed.v1`. */
  event: string;
  /** ISO-8601 timestamp of occurrence (client clock). */
  ts: string;
  /** Session id — one per browser session, rotated per visit. */
  sid: string;
  /** Request id — unique per event; correlates with logs/errors. */
  rid: string;
  /** Release stamp (service-worker version stamped at build time). */
  rel: string;
  /** Runtime platform. */
  plat: Platform;
  /** Coarse actor class — never a user id. */
  actor: ActorClass;
  /** Validated, allowlisted payload. */
  props: P;
}

const SID_KEY = 'keja.session.v1';

/** Read the current release stamp stamped by scripts/sw-version.mjs. */
export function currentReleaseTag(): string {
  try {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="keja-release"]');
    return meta?.content || 'unknown';
  } catch {
    return 'unknown';
  }
}

/** Session id — created once per browser session (sessionStorage scoped). */
export function sessionId(): string {
  try {
    let sid = sessionStorage.getItem(SID_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    // private mode / storage blocked — a per-call id still correlates
    return crypto.randomUUID();
  }
}

/** Request (event) id — unique per event. */
export function newRequestId(): string {
  return crypto.randomUUID();
}

/** Coarse platform detection (Capacitor shells vs browser). */
export function detectPlatform(): Platform {
  try {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'android';
    if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  } catch {
    /* non-browser context */
  }
  return 'web';
}

/**
 * Redaction-safe string: what every free-text-ish payload field passes
 * through before it may enter an event. Strips control characters,
 * collapses whitespace and caps length — the audit's "never place
 * free-form text in default analytics payloads" rule, made mechanical.
 */
export function safeText(value: string, max = 120): string {
  return value
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}
