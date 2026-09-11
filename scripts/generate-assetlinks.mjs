#!/usr/bin/env node
/**
 * generate-assetlinks.mjs — Android App Links verification file
 * (audit F-17 / P1-9).
 *
 * Chrome only opens keja.app links directly in the Capacitor app when the
 * site serves `/.well-known/assetlinks.json` listing the app's signing
 * certificate SHA-256 fingerprint. Debug builds are signed with the
 * machine-local debug keystore; release builds with the upload key — so
 * this file must be (re)generated per signing identity and committed.
 *
 * Usage:
 *   node scripts/generate-assetlinks.mjs                     # debug keystore
 *   KEYSTORE=release.jks STORE_PASS=... ALIAS=upload \
 *     node scripts/generate-assetlinks.mjs                   # release key
 *
 * Requires `keytool` (any JDK). Run after every new signing certificate,
 * then commit the regenerated public/.well-known/assetlinks.json.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const KEYSTORE = process.env.KEYSTORE ?? resolve(ROOT, 'android/app/debug.keystore');
const STORE_PASS = process.env.STORE_PASS ?? 'android';
const ALIAS = process.env.ALIAS ?? 'androiddebugkey';
const PACKAGE = 'com.chacadom.keja';

if (!existsSync(KEYSTORE)) {
  console.error(
    `[assetlinks] keystore not found: ${KEYSTORE}\n` +
      'Build the Android project once (bun run mobile:android) to generate the debug keystore,\n' +
      'or pass KEYSTORE=/path/to/release.jks for a release signing key.',
  );
  process.exit(1);
}

let out;
try {
  out = execFileSync(
    'keytool',
    ['-list', '-v', '-keystore', KEYSTORE, '-storepass', STORE_PASS, '-alias', ALIAS],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
} catch (e) {
  console.error(`[assetlinks] keytool failed: ${e.stderr ?? e.message}`);
  process.exit(1);
}

const match = out.match(/SHA256:\s*([0-9A-Fa-f:]+)/);
if (!match) {
  console.error('[assetlinks] no SHA256 certificate fingerprint found in keytool output');
  process.exit(1);
}
const fingerprint = match[1].replace(/:/g, '').toLowerCase();

const statement = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: PACKAGE,
      sha256_cert_fingerprints: [fingerprint],
    },
  },
];

const target = resolve(ROOT, 'public/.well-known/assetlinks.json');
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify(statement, null, 2) + '\n', 'utf8');
console.log(`[assetlinks] wrote ${target}`);
console.log(`[assetlinks] package ${PACKAGE}, fingerprint ${fingerprint}`);
console.log('[assetlinks] commit the file, redeploy, then verify: https://developers.google.com/digital-asset-links/tools/generator');
