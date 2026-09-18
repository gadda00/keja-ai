/**
 * generate-trust-anchor.ts — publish the per-release score manifest.
 *
 * Runs under Bun (like prerender.ts) so it can import the TypeScript scoring
 * engines directly. Computes the Trust Score and Investment Score for every
 * platform-catalogue listing (seed stock + Auto-Pilot inventory — the data
 * the build ships), and writes the manifest to:
 *
 *   public/trust-anchor.json  — committed copy: git history becomes the
 *                               audit trail of what was published when
 *   out/trust-anchor.json     — the deployed copy for this build (included
 *                               in the sw-version release hash, so the
 *                               release id attests the anchor it shipped)
 *
 * The script self-checks: manifest must cover exactly the catalogue ids with
 * valid structure, or the build fails (defense against silently shipping an
 * anchor that stopped matching the data).
 *
 * Usage:  bun scripts/generate-trust-anchor.ts
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PROPERTIES } from '../src/data/properties';
import { AUTO_PROPERTIES } from '../src/lib/autoListings';
import { buildTrustAnchor, validateTrustAnchor } from '../src/lib/trustAnchor';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NOW = new Date().toISOString();

// The platform catalogue: deterministic build-time data (user-submitted
// listings live only in visitors' browsers and cannot be anchored).
const inventory = [...AUTO_PROPERTIES, ...PROPERTIES];
const expectedIds = inventory.map((p) => p.id);

const manifest = buildTrustAnchor(inventory, NOW);

/* self-check — full coverage and valid structure before anything is written */
const violations = validateTrustAnchor(manifest, expectedIds);
if (violations.length > 0) {
  console.error('[trust-anchor] manifest failed self-validation:');
  for (const v of violations.slice(0, 10)) console.error(`  ✗ ${v.id}: ${v.why}`);
  process.exit(1);
}

const json = JSON.stringify(manifest, null, 2) + '\n';

const publicPath = join(ROOT, 'public', 'trust-anchor.json');
mkdirSync(dirname(publicPath), { recursive: true });
writeFileSync(publicPath, json);
console.log(
  `[trust-anchor] wrote public/trust-anchor.json — ${manifest.inventoryCount} listings, ` +
    `trust engine ${manifest.algorithmVersion}, investment engine ${manifest.investmentAlgorithmVersion}`,
);

// The deployed copy (the build's out/ may already exist — next build copies
// public/ itself, but this build needs the file now so sw-version.mjs folds
// it into the release hash).
const outPath = join(ROOT, 'out', 'trust-anchor.json');
if (existsSync(dirname(outPath))) {
  writeFileSync(outPath, json);
  console.log('[trust-anchor] wrote out/trust-anchor.json (included in the release hash)');
} else {
  console.log('[trust-anchor] out/ not present yet — next build will carry public/trust-anchor.json');
}
