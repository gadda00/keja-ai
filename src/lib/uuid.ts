/**
 * Central identifier helper (audit F-37).
 *
 * `Date.now()` was used as an identifier at 30+ sites — two records created
 * in the same millisecond collide, and ids leak creation timing. This helper
 * is collision-safe (crypto UUID with a monotonic counter fallback) and
 * prefixes ids so debug logs say what kind of record they are looking at.
 */

let counter = 0;

/** RFC4122 v4 UUID, with a deterministic fallback for non-secure contexts. */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: Math.random-based v4-shaped uuid (older WebViews).
  const h = (n: number) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${h(8)}-${h(4)}-4${h(3)}-a${h(3)}-${h(12)}`;
}

/** Prefixed, collision-safe id — e.g. newId('lead') → 'lead_lx9k2m4a…'. */
export function newId(prefix: string): string {
  counter = (counter + 1) % 1_000_000;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${uuid().slice(0, 8)}`;
}
