/**
 * Data-quality reporting (audit ch.7 "Data quality dimensions"): a
 * mechanical check of the governed event log against the six dimensions —
 * completeness, validity, uniqueness, consistency, timeliness and lineage.
 *
 * Runs on demand (admin console "Data quality" panel, or a future cron).
 * Pure: takes the log as data; never mutates; safe to run anywhere.
 */

export interface QualityCheck {
  dimension: 'completeness' | 'validity' | 'uniqueness' | 'consistency' | 'timeliness' | 'lineage';
  name: string;
  /** pass = within policy; warn = watch; fail = data is not trustworthy. */
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}

export interface QualityReport {
  generatedAt: string;
  totalEvents: number;
  checks: QualityCheck[];
  /** Overall verdict — the strictest check status. */
  verdict: 'pass' | 'warn' | 'fail' | 'empty';
}

interface LogLike {
  v?: number;
  event?: string;
  ts?: string;
  sid?: string;
  rid?: string;
  rel?: string;
  plat?: string;
  actor?: string;
  props?: Record<string, unknown>;
  _q?: 'ok' | 'repaired';
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/** Run all quality checks over an event log (as loaded from storage). */
export function dataQualityReport(
  log: readonly LogLike[],
  knownEvents: readonly string[],
): QualityReport {
  const checks: QualityCheck[] = [];
  const n = log.length;

  if (n === 0) {
    return {
      generatedAt: new Date().toISOString(),
      totalEvents: 0,
      checks: [
        {
          dimension: 'completeness',
          name: 'buffer_nonempty',
          status: 'warn',
          detail: 'No events recorded yet — nothing to check.',
        },
      ],
      verdict: 'empty',
    };
  }

  /* ---- completeness: every envelope field present ---- */
  const missing = log.filter(
    (e) =>
      !e.event || !e.ts || !e.sid || !e.rid || !e.rel || !e.plat || !e.actor || e.props === undefined,
  ).length;
  checks.push({
    dimension: 'completeness',
    name: 'envelope_fields',
    status: missing === 0 ? 'pass' : missing / n < 0.05 ? 'warn' : 'fail',
    detail: `${missing}/${n} events missing envelope fields`,
  });

  /* ---- validity: events in the taxonomy, ids/timestamps well-formed ---- */
  const known = new Set(knownEvents);
  const unknown = log.filter((e) => !known.has(e.event ?? '')).length;
  checks.push({
    dimension: 'validity',
    name: 'known_events',
    status: unknown === 0 ? 'pass' : unknown / n < 0.05 ? 'warn' : 'fail',
    detail: `${unknown}/${n} events outside the taxonomy`,
  });

  const malformedTs = log.filter((e) => !ISO_RE.test(e.ts ?? '') || Number.isNaN(Date.parse(e.ts ?? ''))).length;
  checks.push({
    dimension: 'validity',
    name: 'iso_timestamps',
    status: malformedTs === 0 ? 'pass' : malformedTs / n < 0.05 ? 'warn' : 'fail',
    detail: `${malformedTs}/${n} malformed timestamps`,
  });

  const malformedIds = log.filter((e) => !UUID_RE.test(e.rid ?? '')).length;
  checks.push({
    dimension: 'validity',
    name: 'request_ids',
    status: malformedIds === 0 ? 'pass' : malformedIds / n < 0.05 ? 'warn' : 'fail',
    detail: `${malformedIds}/${n} request ids not RFC-4122`,
  });

  /* ---- uniqueness: request ids never repeat ---- */
  const seen = new Set<string>();
  let dupes = 0;
  for (const e of log) {
    if (seen.has(e.rid ?? '')) dupes++;
    else seen.add(e.rid ?? '');
  }
  checks.push({
    dimension: 'uniqueness',
    name: 'unique_request_ids',
    status: dupes === 0 ? 'pass' : 'fail',
    detail: `${dupes} duplicate request ids`,
  });

  /* ---- consistency: one envelope version; one release per burst ---- */
  const versions = new Set(log.map((e) => e.v));
  checks.push({
    dimension: 'consistency',
    name: 'envelope_version',
    status: versions.size === 1 ? 'pass' : 'warn',
    detail: `versions seen: ${[...versions].join(', ') || 'none'}`,
  });

  const releases = new Set(log.map((e) => e.rel));
  checks.push({
    dimension: 'lineage',
    name: 'release_lineage',
    status: releases.size <= 3 ? 'pass' : 'warn',
    detail: `${releases.size} releases in buffer (${[...releases].slice(0, 3).join(', ')}${releases.size > 3 ? '…' : ''})`,
  });

  const repaired = log.filter((e) => e._q === 'repaired').length;
  checks.push({
    dimension: 'consistency',
    name: 'redaction_repairs',
    status: repaired / n < 0.02 ? 'pass' : 'warn',
    detail: `${repaired}/${n} payloads needed mechanical redaction on ingest`,
  });

  /* ---- timeliness: ordered timestamps, sane clock ---- */
  let outOfOrder = 0;
  for (let i = 1; i < log.length; i++) {
    const a = Date.parse(log[i - 1].ts ?? '');
    const b = Date.parse(log[i].ts ?? '');
    if (!Number.isNaN(a) && !Number.isNaN(b) && b < a - 1000) outOfOrder++;
  }
  checks.push({
    dimension: 'timeliness',
    name: 'chronological_order',
    status: outOfOrder === 0 ? 'pass' : outOfOrder / n < 0.05 ? 'warn' : 'fail',
    detail: `${outOfOrder} timestamps out of order (>1s skew)`,
  });

  const sessions = new Set(log.map((e) => e.sid));
  checks.push({
    dimension: 'consistency',
    name: 'session_attribution',
    status: sessions.size > 0 ? 'pass' : 'fail',
    detail: `${sessions.size} session(s) in buffer`,
  });

  const rank = { fail: 0, warn: 1, pass: 2 } as const;
  const verdict = checks.reduce<'fail' | 'warn' | 'pass'>(
    (worst, c) => (rank[c.status] < rank[worst] ? c.status : worst),
    'pass',
  );

  return { generatedAt: new Date().toISOString(), totalEvents: n, checks, verdict };
}
