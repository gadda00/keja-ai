/**
 * Telemetry — production error tracking + cookieless event mirroring
 * (audit F-10 / F-11, P0-6 + P1-5).
 *
 * Zero-dependency by design: instead of bundling a full Sentry SDK into a
 * static export, this module speaks the Sentry **envelope protocol** directly
 * (~120 lines) and degrades to a local ring buffer when no DSN is configured.
 *
 * Configuration (build-time env, inlined by Next):
 *   NEXT_PUBLIC_SENTRY_DSN          — e.g. https://key@o123.ingest.sentry.io/456
 *   NEXT_PUBLIC_ANALYTICS_ENDPOINT  — any cookieless collector that accepts
 *                                     POST JSON {name, data, ts, release}
 *
 * Privacy posture (unchanged from the local-only bus):
 *   - no cookies, no fingerprinting, no PII in events
 *   - errors carry stack traces + route, never localStorage contents
 *   - both channels no-op silently when their env var is unset, so the
 *     platform stays 100% local until the operator opts in
 *   - release tag = the service-worker version stamped into index.html by
 *     scripts/sw-version.mjs (<meta name="keja-release">), so every report
 *     maps 1:1 to a deployable artifact hash
 */

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN ?? '';
const ANALYTICS_ENDPOINT = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT ?? '';

const ERRORS_KEY = 'keja.errors.v1';
const ERRORS_MAX = 50;

export interface TelemetryErrorRecord {
  message: string;
  stack?: string;
  route?: string;
  ts: string;
  release?: string;
}

/** Current release, read from the meta stamped at build time. */
export function currentRelease(): string | undefined {
  try {
    const el = document.querySelector<HTMLMetaElement>('meta[name="keja-release"]');
    return el?.content || undefined;
  } catch {
    return undefined;
  }
}

/* ------------------------------ local buffer ------------------------------ */

function readBuffer(): TelemetryErrorRecord[] {
  try {
    const raw = localStorage.getItem(ERRORS_KEY);
    return raw ? (JSON.parse(raw) as TelemetryErrorRecord[]) : [];
  } catch {
    return [];
  }
}

function appendLocal(rec: TelemetryErrorRecord) {
  try {
    const next = [...readBuffer(), rec].slice(-ERRORS_MAX);
    localStorage.setItem(ERRORS_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — telemetry must never throw */
  }
}

/** Inspect the on-device error ring buffer (Admin console / support flows). */
export function localErrors(): TelemetryErrorRecord[] {
  return readBuffer();
}

/* --------------------------- Sentry envelope client ------------------------ */

interface ParsedDsn {
  url: string;
  publicKey: string;
}

function parseDsn(dsn: string): ParsedDsn | null {
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.replace(/\//g, '');
    if (!projectId || !u.host) return null;
    return {
      url: `${u.protocol}//${u.host}/api/${projectId}/envelope/`,
      publicKey: u.username,
    };
  } catch {
    return null;
  }
}

function eventId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function serializeError(err: unknown): { type: string; value: string; stacktrace?: { frames: unknown[] } } {
  const e = err instanceof Error ? err : new Error(String(err));
  return {
    type: e.name,
    value: e.message,
    ...(e.stack
      ? {
          stacktrace: {
            frames: e.stack
              .split('\n')
              .filter((l) => l.trim().startsWith('at'))
              .map((line) => {
                const m = line.match(/at\s+(?:(.*?)\s+\()?(.*?):(\d+):(\d+)\)?/);
                return m
                  ? { filename: m[2], function: m[1] ?? '<anonymous>', lineno: Number(m[3]), colno: Number(m[4]) }
                  : { raw: line.trim() };
              }),
          },
        }
      : {}),
  };
}

/**
 * Report an error to the configured Sentry project (envelope protocol).
 * Falls back to the local ring buffer when no DSN is set.
 */
export function captureError(err: unknown, context?: { componentStack?: string; route?: string; extras?: Record<string, unknown> }) {
  const route = context?.route ?? (typeof window !== 'undefined' ? window.location.hash || '/' : undefined);
  const rec: TelemetryErrorRecord = {
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    route,
    ts: new Date().toISOString(),
    release: currentRelease(),
  };
  appendLocal(rec);

  const dsn = parseDsn(DSN);
  if (!dsn) return;

  const event = {
    event_id: eventId(),
    timestamp: new Date().toISOString(),
    platform: 'javascript',
    environment: process.env.NODE_ENV,
    release: currentRelease(),
    level: 'error',
    logger: 'keja.telemetry',
    exception: {
      values: [
        {
          ...serializeError(err),
          ...(context?.componentStack ? { value: `${rec.message}\n\nComponent stack:\n${context.componentStack}` } : {}),
        },
      ],
    },
    tags: { route: route ?? '/' },
    ...(context?.extras ? { extra: context.extras } : {}),
  };

  // Sentry envelope: JSON-lines — envelope header, item header, item payload.
  const envelope = `${JSON.stringify({
    event_id: event.event_id,
    sent_at: event.timestamp,
    dsn: DSN,
  })}\n${JSON.stringify({ type: 'event', length: undefined })}\n${JSON.stringify(event)}\n`;

  try {
    void fetch(dsn.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${dsn.publicKey}, sentry_client=keja-telemetry/1.0`,
      },
      body: envelope,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* network unavailable — record already in the local buffer */
  }
}

/* --------------------------- analytics event mirror ------------------------ */

let sessionId: string | null = null;
function session(): string {
  if (sessionId) return sessionId;
  try {
    sessionId = sessionStorage.getItem('keja.tel.sid') ?? '';
    if (!sessionId) {
      const bytes = new Uint8Array(8);
      crypto.getRandomValues(bytes);
      sessionId = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      sessionStorage.setItem('keja.tel.sid', sessionId);
    }
    return sessionId;
  } catch {
    return 'nosession';
  }
}

/**
 * Mirror a product-analytics event to a cookieless collector. Payload is
 * limited to the event name + its (already PII-free) taxonomy data, a random
 * session id and the release tag. Uses sendBeacon so it survives page
 * unload; falls back to keepalive fetch.
 */
export function captureEvent(name: string, data?: Record<string, unknown>) {
  if (!ANALYTICS_ENDPOINT) return;
  const payload = JSON.stringify({
    name,
    data: data ?? {},
    ts: new Date().toISOString(),
    session: session(),
    release: currentRelease() ?? null,
  });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ANALYTICS_ENDPOINT, new Blob([payload], { type: 'application/json' }));
    } else {
      void fetch(ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => undefined);
    }
  } catch {
    /* never throw from telemetry */
  }
}

/** Install global handlers for uncaught errors + rejections. */
export function installGlobalErrorHandlers() {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (e) => {
    captureError(e.error ?? e.message, { extras: { source: 'window.onerror' } });
  });
  window.addEventListener('unhandledrejection', (e) => {
    captureError(e.reason instanceof Error ? e.reason : new Error(String(e.reason)), {
      extras: { source: 'unhandledrejection' },
    });
  });
}
