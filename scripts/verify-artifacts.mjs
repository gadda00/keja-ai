#!/usr/bin/env node
/**
 * verify-artifacts.mjs — release-artifact assertions (audit SEC-202).
 *
 * The old `build` script compiled fine and then failed copying files that
 * didn't exist; deploys were green while artifacts were wrong. This gate
 * makes the artifact itself the contract: after a build, every file the
 * deployment depends on must exist, parse and carry the stamped release.
 *
 * Exits non-zero on the first failed assertion class, printing what was
 * expected vs. what was found. Run automatically as the last step of
 * `npm run build` (and therefore in CI + the Vercel build).
 */
import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const OUT = process.env.OUT_DIR || "out";
const root = process.cwd();
const out = join(root, OUT);

let failures = 0;
const fail = (msg) => {
  console.error(`  ✗ ${msg}`);
  failures++;
};
const ok = (msg) => console.log(`  ✓ ${msg}`);

console.log(`Verifying build artifacts in ${OUT}/ …`);

/* 1 — the shell exists and references the stamped release */
const indexPath = join(out, "index.html");
if (!existsSync(indexPath)) {
  fail("out/index.html missing — the static export did not run");
} else {
  const html = readFileSync(indexPath, "utf8");
  ok("out/index.html present");
  const release = html.match(/<meta name="keja-release" content="([^"]+)"/);
  if (release) {
    ok(`release stamp: ${release[1]}`);
  } else {
    fail("index.html has no <meta name=keja-release> — sw-version stamp did not run");
  }
}

/* 2 — service worker whose stamped version matches the HTML release stamp */
const swPath = join(out, "sw.js");
const releaseMatch = () =>
  existsSync(indexPath)
    ? readFileSync(indexPath, "utf8").match(/<meta name="keja-release" content="([^"]+)"/)?.[1]
    : undefined;
if (!existsSync(swPath)) {
  fail("out/sw.js missing — PWA offline shell will not register");
} else {
  const sw = readFileSync(swPath, "utf8");
  ok("out/sw.js present");
  const v = sw.match(/const VERSION = '([^']+)'/)?.[1];
  if (!v) {
    fail("sw.js has no stamped VERSION — sw-version.mjs did not run");
  } else {
    const rel = releaseMatch();
    if (rel && v === rel) ok(`service-worker VERSION === release stamp (${v})`);
    else fail(`sw VERSION '${v}' !== release stamp '${rel}' — cache/deploy version mismatch`);
  }
}

/* 3 — PWA install surface */
for (const f of [
  "manifest.webmanifest",
  "offline.html",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
]) {
  if (existsSync(join(out, f))) ok(`${f}`);
  else fail(`${f} missing — PWA install/offline degraded`);
}

/* 4 — well-known association files parse as real JSON */
for (const f of [".well-known/assetlinks.json", ".well-known/apple-app-site-association"]) {
  const p = join(out, f);
  if (!existsSync(p)) {
    fail(`${f} missing`);
    continue;
  }
  try {
    JSON.parse(readFileSync(p, "utf8"));
    ok(`${f} valid JSON`);
  } catch {
    fail(`${f} is not valid JSON`);
  }
}

/* 5 — SEO surface */
const sitemapPath = join(out, "sitemap.xml");
if (!existsSync(sitemapPath)) {
  fail("sitemap.xml missing");
} else if (statSync(sitemapPath).size < 200) {
  fail("sitemap.xml suspiciously small (<200 bytes)");
} else {
  const urls = (readFileSync(sitemapPath, "utf8").match(/<loc>/g) || []).length;
  ok(`sitemap.xml present (${urls} URLs)`);
  if (urls < 10) fail(`sitemap.xml only has ${urls} URLs — prerender step did not run?`);
}

if (existsSync(join(out, "robots.txt"))) ok("robots.txt");
else fail("robots.txt missing");

/* 6 — prerendered route shells exist (spot check of the real layout) */
for (const f of [
  "properties/KJA-001/index.html",
  "areas/waterfront-karen/index.html",
  "insights/buying-property-in-kenya-step-by-step/index.html",
]) {
  if (existsSync(join(out, f))) ok(`${f} (prerendered)`);
  else fail(`${f} missing — prerender.ts did not run`);
}

console.log(
  failures === 0
    ? "\nArtifact verification PASSED.\n"
    : `\nArtifact verification FAILED (${failures} assertion${failures === 1 ? "" : "s"}).\n`,
);
process.exit(failures === 0 ? 0 : 1);
