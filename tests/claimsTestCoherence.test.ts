/**
 * Claims-register ↔ test coherence guard.
 *
 * Wave 12 pinned register↔engine coherence for the TRUST score; this guard
 * extends the same discipline to every claim whose evidence mentions unit
 * tests. A "live" claim that cites tests must be backed by a test file that
 * actually imports the implementing module — the exact drift class found in
 * review: six stakeholder-tool claims said "covered by unit tests" while no
 * test file imported their modules.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CAPABILITY_CLAIMS } from '@/data/claims';

const TESTS_DIR = resolve(__dirname);

/** module specifiers (as imported by tests) keyed by claim id — the modules
 *  whose unit-test coverage each test-citing claim relies on. */
const CLAIM_TEST_MODULES: Record<string, string[]> = {
  'duplicate-detection': ['@/lib/queryParser', '@/lib/boundaries', 'scripts/auto-listings'],
  'pricing-anomaly': ['@/lib/boundaries', 'scripts/auto-listings'],
  search: ['@/lib/queryParser'],
  calculators: ['@/lib/finance'],
  'ai-advisor': ['@/lib/ai/engine', '@/lib/ai/gateway'],
  'landlord-studio': ['@/lib/landlordStore'],
  'tenant-hub': ['@/lib/tenantStore'],
  'keja-pro': ['@/lib/proStore'],
  'valuation-desk': ['@/lib/valuationStore'],
  'developer-console': ['@/lib/devStore'],
  'diaspora-hub': ['@/lib/diasporaStore'],
};

/** Concatenated source of every test file (cheap single read per file,
 *  resolved once per run). */
function allTestSources(): string {
  return readdirSync(TESTS_DIR)
    .filter((f) => f.endsWith('.test.ts') || f.endsWith('.test.tsx'))
    .map((f) => readFileSync(resolve(TESTS_DIR, f), 'utf8'))
    .join('\n');
}

describe('claims register ↔ test coherence', () => {
  const sources = allTestSources();

  it('every "live" claim citing unit tests has a mapped module list', () => {
    for (const claim of CAPABILITY_CLAIMS) {
      if (claim.status !== 'live') continue;
      if (!/unit tests?/i.test(claim.evidence)) continue;
      const modules = CLAIM_TEST_MODULES[claim.id];
      expect(
        modules,
        `claim '${claim.id}' cites unit tests — map its implementing modules in CLAIM_TEST_MODULES`
      ).toBeDefined();
    }
  });

  it('every mapped claim cites unit tests in its evidence (no stale mappings)', () => {
    for (const [id] of Object.entries(CLAIM_TEST_MODULES)) {
      const claim = CAPABILITY_CLAIMS.find((c) => c.id === id);
      expect(claim, `claim '${id}' not found in the register`).toBeDefined();
      expect(
        claim!.status,
        `claim '${id}' is mapped for test coverage but is not 'live'`
      ).toBe('live');
      expect(
        /unit tests?|finance unit tests/i.test(claim!.evidence),
        `claim '${id}' is mapped for test coverage but its evidence does not cite unit tests`
      ).toBe(true);
    }
  });

  it('at least one test file imports each mapped module', () => {
    for (const [claimId, modules] of Object.entries(CLAIM_TEST_MODULES)) {
      for (const moduleSpec of modules) {
        // scripts/* coverage lives in CI-checked script tests; src modules
        // must be imported by a test file directly.
        if (moduleSpec.startsWith('scripts/')) continue;
        expect(
          sources.includes(`from '${moduleSpec}'`),
          `claim '${claimId}' cites unit tests, but no test file imports '${moduleSpec}' — the register would be drifting from reality`
        ).toBe(true);
      }
    }
  });

  it('the evidence describes only surfaces that exist (spot-check the sweep claim)', () => {
    const pricing = CAPABILITY_CLAIMS.find((c) => c.id === 'pricing-anomaly')!;
    // after the 2026-09-13 correction the evidence names the ingest pipeline
    // and the wizard boundary — not an admin sweep that never mounts.
    expect(pricing.evidence).not.toMatch(/admin anomaly sweep/);
  });
});
