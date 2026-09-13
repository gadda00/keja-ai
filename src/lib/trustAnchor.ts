/**
 * Trust Anchor — the published, per-release record of every score the
 * platform has issued (brief Q1: "can a score be audited after the fact?").
 *
 * Keja ships as a static export, so there is no runtime server to attest
 * scores. The build pipeline is therefore the authority: every build computes
 * the Trust Score and Investment Score for the full platform catalogue and
 * emits a manifest (public/trust-anchor.json → served at /trust-anchor.json,
 * committed to git so the repository history becomes the audit trail).
 *
 * The manifest gives each published score three properties it did not have:
 *   1. PROVENANCE — the exact algorithm version that produced it
 *   2. TAMPER-EVIDENCE — a digest over factors + weights + outcome, so any
 *      engine change or data drift shows up as a manifest diff
 *   3. REPRODUCIBILITY — anyone can recompute today's scores from the same
 *      committed data and compare against the manifest
 *
 * Runtime code does NOT import this module — it pulls in node:crypto for the
 * digests. It is consumed by scripts/generate-trust-anchor.ts (bun) and by
 * tests. The client-side engines remain the single source of truth for what
 * a score IS; the anchor records what was PUBLISHED.
 */
import { createHash } from 'node:crypto';

import type { Property } from '@/data/properties';
import { INVESTMENT_ALGORITHM_VERSION, investmentScore } from '@/lib/investmentScore';
import { TRUST_ALGORITHM_VERSION, trustScore } from '@/lib/trustScore';

export const TRUST_ANCHOR_SCHEMA_VERSION = 1;

export interface TrustAnchorEntry {
  id: string;
  trust: number;
  band: string;
  investment: number;
  investmentBand: string;
  /** sha256 over the canonical factor/outcome record — tamper evidence */
  digest: string;
}

export interface TrustAnchorManifest {
  schemaVersion: number;
  algorithmVersion: string;
  investmentAlgorithmVersion: string;
  generatedAt: string;
  inventoryCount: number;
  /** sha256 over the inventory inputs the scores were computed from */
  inputSnapshot: string;
  listings: TrustAnchorEntry[];
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/**
 * Digest of one listing's published outcome. Covers factor keys, scores and
 * weights (not notes) plus both composites and bands — any engine change
 * that moves a published number or weight changes the digest.
 */
export function anchorDigest(entry: {
  id: string;
  trust: number;
  band: string;
  investment: number;
  investmentBand: string;
  trustFactors: { key: string; score: number; weight: number }[];
  investmentFactors: { key: string; score: number }[];
}): string {
  const canonical = JSON.stringify({
    id: entry.id,
    trust: entry.trust,
    band: entry.band,
    investment: entry.investment,
    investmentBand: entry.investmentBand,
    trustFactors: entry.trustFactors.map((f) => [f.key, f.score, f.weight]),
    investmentFactors: entry.investmentFactors.map((f) => [f.key, f.score]),
  });
  return sha256(canonical);
}

/** Digest of the inventory inputs — identifies the data state the scores saw. */
export function inputSnapshotDigest(inventory: Property[]): string {
  const perListing = inventory
    .map((p) => sha256(JSON.stringify([p.id, p.price, p.rentEstimate ?? 0, p.area, p.agency, p.verification])))
    .sort();
  return sha256(perListing.join('\n'));
}

/** Compute the manifest for an inventory. Deterministic except `now`. */
export function buildTrustAnchor(inventory: Property[], now = new Date().toISOString()): TrustAnchorManifest {
  const listings: TrustAnchorEntry[] = inventory.map((p) => {
    const ts = trustScore(p);
    const inv = investmentScore(p);
    return {
      id: p.id,
      trust: ts.composite,
      band: ts.band,
      investment: inv.overall,
      investmentBand: inv.band,
      digest: anchorDigest({
        id: p.id,
        trust: ts.composite,
        band: ts.band,
        investment: inv.overall,
        investmentBand: inv.band,
        trustFactors: ts.factors.map((f) => ({ key: f.key, score: f.score, weight: f.weight })),
        investmentFactors: inv.factors.map((f) => ({ key: f.key, score: f.score })),
      }),
    };
  });
  return {
    schemaVersion: TRUST_ANCHOR_SCHEMA_VERSION,
    algorithmVersion: TRUST_ALGORITHM_VERSION,
    investmentAlgorithmVersion: INVESTMENT_ALGORITHM_VERSION,
    generatedAt: now,
    inventoryCount: listings.length,
    inputSnapshot: inputSnapshotDigest(inventory),
    listings,
  };
}

/* ------------------------------- validation -------------------------------- */

export interface AnchorViolation {
  id: string;
  why: string;
}

/**
 * Structural validation of a manifest against the ids it must cover.
 * Returns violations (empty = valid). Used by tests and callable from CI
 * tooling; verify-artifacts.mjs re-implements the structural subset it can
 * check in plain node without a TS runtime.
 */
export function validateTrustAnchor(
  manifest: TrustAnchorManifest,
  expectedIds: string[],
): AnchorViolation[] {
  const violations: AnchorViolation[] = [];
  const push = (id: string, why: string) => violations.push({ id, why });

  if (manifest.schemaVersion !== TRUST_ANCHOR_SCHEMA_VERSION) {
    push('manifest', `schemaVersion ${manifest.schemaVersion} !== ${TRUST_ANCHOR_SCHEMA_VERSION}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}\.\d+$/.test(manifest.algorithmVersion ?? '')) {
    push('manifest', 'algorithmVersion missing or malformed');
  }
  if (!/^\d{4}-\d{2}-\d{2}\.\d+$/.test(manifest.investmentAlgorithmVersion ?? '')) {
    push('manifest', 'investmentAlgorithmVersion missing or malformed');
  }
  if (Number.isNaN(Date.parse(manifest.generatedAt ?? ''))) {
    push('manifest', 'generatedAt is not a parseable date');
  }

  const ids = manifest.listings?.map((l) => l.id) ?? [];
  const expected = new Set(expectedIds);
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) push(id, 'duplicate entry');
    seen.add(id);
  }
  for (const id of expected) {
    if (!seen.has(id)) push(id, 'missing from manifest');
  }
  for (const l of manifest.listings ?? []) {
    if (!Number.isInteger(l.trust) || l.trust < 0 || l.trust > 100) push(l.id, `trust ${l.trust} out of range`);
    if (typeof l.investment !== 'number' || l.investment < 0 || l.investment > 10) {
      push(l.id, `investment ${l.investment} out of range`);
    }
    if (!l.band || !l.investmentBand) push(l.id, 'missing band');
    if (!/^[a-f0-9]{64}$/.test(l.digest ?? '')) push(l.id, 'digest is not sha256 hex');
  }
  if ((manifest.listings?.length ?? 0) !== expectedIds.length) {
    push(
      'manifest',
      `covers ${manifest.listings?.length ?? 0} listings, expected ${expectedIds.length}`,
    );
  }
  return violations;
}
