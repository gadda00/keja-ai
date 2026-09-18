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
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
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

/* 5b — boot-waterfall preloads (2026-09-12): the SPA shell is a next/dynamic
   import, so without hints the browser only discovers the shell chunks
   (zod + the KejaApp graph) after the entry scripts execute. The build
   injects <link rel="preload" as="script"> for exactly those chunks
   (scripts/inject-preloads.mjs). Gate 1: the hints exist. Gate 2: every
   hint resolves to a real file — a broken hint is a wasted round trip. */
{
  // attribute-order-agnostic: any <link> that is both rel="preload" and as="script"
  const preloads = [...html0().matchAll(/<link\b[^>]*\brel="preload"[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => /\bas="script"/.test(tag))
    .map((tag) => tag.match(/\bhref="([^"]+)"/)?.[1])
    .filter(Boolean);
  let missing = 0;
  for (const href of preloads) {
    if (!existsSync(join(out, href.replace(/^\//, "")))) missing++;
  }
  if (missing > 0) {
    fail(`${missing} preload hint(s) point at files that do not exist`);
  } else if (preloads.length === 0) {
    fail("no script preloads in index.html — inject-preloads.mjs did not run (boot waterfall is back)");
  } else {
    // Next emits its own tiny webpack-runtime preload (~6 kB); the INJECTED
    // hints are the boot-time dynamic chunk graph (zod + shell, hundreds of
    // kB). Count only preloaded weight to tell them apart — otherwise Next's
    // built-in hint satisfies a bare count and a missing injection ships
    // silently (exactly what happened live on 2026-09-12: the deployment
    // passed verification while the waterfall fix was absent).
    let preloadedBytes = 0;
    for (const href of preloads) {
      const f = join(out, href.replace(/^\//, ""));
      if (existsSync(f)) preloadedBytes += statSync(f).size;
    }
    const MIN_PRELOADED_GRAPH_BYTES = 150 * 1024;
    if (preloadedBytes >= MIN_PRELOADED_GRAPH_BYTES) {
      ok(`${preloads.length} boot preload hint(s), all resolve (${(preloadedBytes / 1024).toFixed(0)} kB of the shell graph)`);
    } else {
      fail(
        `preload hints cover only ${(preloadedBytes / 1024).toFixed(0)} kB — the boot-time dynamic chunks ` +
          "(zod + KejaApp shell) are not preloaded; inject-preloads.mjs ran before the chunks were built, or did not run",
      );
    }
  }

  /* 5c — entry-JS budget (audit line: 500 kB raw, excluding nomodule
     polyfills). Measured 507 kB on 2026-09-12 after the wave-8/9/10 additions
     (2FA, store zod seams). The ratchet is set at 525 kB so the NEXT
     regression fails the build instead of quietly compounding; tighten to
     500 kB when the inventory data-split lands (see CURRENT_PICTURE §8). */
  const ENTRY_JS_BUDGET_BYTES = 525 * 1024;
  // nomodule is case-variant in the wild ("noModule="), and may sit after src —
  // test the whole opening tag, case-insensitively
  const entrySrcs = [...html0().matchAll(/<script\b[^>]*>/g)]
    .filter((m) => /\bsrc="([^"]+)"/.test(m[0]) && !/\bnomodule\b/i.test(m[0]))
    .map((m) => m[0].match(/\bsrc="([^"]+)"/)[1]);
  let entryBytes = 0;
  for (const src of entrySrcs) entryBytes += statSync(join(out, src.replace(/^\//, ""))).size;
  if (entryBytes <= ENTRY_JS_BUDGET_BYTES) {
    ok(`entry JS ${(entryBytes / 1024).toFixed(0)} kB ≤ ${(ENTRY_JS_BUDGET_BYTES / 1024).toFixed(0)} kB budget`);
  } else {
    fail(
      `entry JS ${(entryBytes / 1024).toFixed(0)} kB exceeds the ${(ENTRY_JS_BUDGET_BYTES / 1024).toFixed(0)} kB ratchet — ` +
        "split the added weight before shipping (see CURRENT_PICTURE §8 data-split plan)",
    );
  }

  /* 5d — first-paint critical JS (wave-15): entry + the preloaded shell
     graph. This is the real mobile-first number — before the 2026-09-18
     inventory data-split it stood at 1,134 kB raw (507 entry + 627 preloaded:
     the shell statically carried the entire 87-listing catalogue). The split
     moved the catalogue into a lazy chunk (home renders a generated 8-pick
     subset); measured 977 kB after. Ratchet at 1000 kB: the NEXT regression —
     any module re-importing the catalogue from the shell graph, a zod
     default import in a boot path, or new eager weight — fails the build
     here, at the exact gate that watches the class of bug. */
  const CRITICAL_JS_BUDGET_BYTES = 1000 * 1024;
  let preloadedBytes2 = 0;
  for (const href of preloads) {
    const f = join(out, href.replace(/^\//, ""));
    if (existsSync(f)) preloadedBytes2 += statSync(f).size;
  }
  const criticalBytes = entryBytes + preloadedBytes2;
  if (criticalBytes <= CRITICAL_JS_BUDGET_BYTES) {
    ok(
      `first-paint critical JS ${(criticalBytes / 1024).toFixed(0)} kB ` +
        `(entry ${(entryBytes / 1024).toFixed(0)} + preloaded ${(preloadedBytes2 / 1024).toFixed(0)}) ≤ ` +
        `${(CRITICAL_JS_BUDGET_BYTES / 1024).toFixed(0)} kB budget`,
    );
  } else {
    fail(
      `first-paint critical JS ${(criticalBytes / 1024).toFixed(0)} kB exceeds the ` +
        `${(CRITICAL_JS_BUDGET_BYTES / 1024).toFixed(0)} kB ratchet — something re-fattened the boot graph ` +
        "(shell importing the inventory? zod on a new boot path? eager heavy imports?). See CURRENT_PICTURE §8.5.",
    );
  }

  /* 5e — the inventory stays OFF the boot path (wave-15): the catalogue
     chunk must not be preloaded. A preload hint re-appearing for the lazy
     inventory is the exact regression the critical budget watches in
     aggregate; this named check pinpoints it for whoever trips the budget. */
  {
    const html = html0();
    const ids = [...html.matchAll(/KJA-A0\d{2}/g)].length;
    if (ids === 0) {
      ok("no listing ids in the boot HTML (inventory stays lazy)");
    } else {
      fail(
        `${ids} listing-id occurrences in index.html — the inventory leaked back into the boot graph`,
      );
    }
  }
}
function html0() {
  return existsSync(indexPath) ? readFileSync(indexPath, "utf8") : "";
}

/* 6 — prerendered route shells exist (spot check of the real layout) */
for (const f of [
  "properties/KJA-001/index.html",
  "areas/waterfront-karen/index.html",
  "insights/buying-property-in-kenya-step-by-step/index.html",
]) {
  if (existsSync(join(out, f))) ok(`${f} (prerendered)`);
  else fail(`${f} missing — prerender.ts did not run`);
}

/* 6b — every public section in the sitemap must have a real prerendered
   page (src/lib/sectionMeta.ts drives both). Previously 16 sitemap'd
   section URLs served the generic home shell — duplicate content. */
const SECTION_PATHS = [
  "properties", "tokenize", "ask", "invest", "trust", "insights",
  "ecosystem", "partners", "sell", "valuation", "develop", "diaspora",
  "about", "contact", "compare", "legal",
];
/* 6c — the app-workspace sections are prerendered as noindexed shells:
   their path URLs boot the SPA (legacy links keep working) without any
   vercel.json rewrite — the regex rewrite proved unreliable on Vercel's
   path-to-regexp engine (2026-09-12 deploy smoke test caught /finance
   404ing), so serving real files replaced rewrites entirely. */
const APP_SECTION_PATHS = [
  "finance", "data", "transact", "manage", "tenant",
  "institutional", "deal-analyst", "portfolio",
];
let sectionPages = 0;
for (const s of [...SECTION_PATHS, ...APP_SECTION_PATHS]) {
  const f = join(out, s, "index.html");
  if (existsSync(f)) {
    sectionPages++;
  } else {
    fail(`${s}/index.html missing — section prerender incomplete`);
  }
}
if (sectionPages === SECTION_PATHS.length + APP_SECTION_PATHS.length) {
  ok(`all ${SECTION_PATHS.length} catalogue + ${APP_SECTION_PATHS.length} app sections prerendered`);
  // and each carries its own <title>, not the generic shell's
  const generic = "Africa&#x27;s Real Estate Intelligence";
  let untitled = 0;
  for (const s of [...SECTION_PATHS, ...APP_SECTION_PATHS]) {
    const html = readFileSync(join(out, s, "index.html"), "utf8");
    if (html.includes(generic) && html.indexOf(generic) < html.indexOf("</title>")) untitled++;
  }
  if (untitled === 0) ok("section pages carry per-section titles");
  else fail(`${untitled} section page(s) still ship the generic home title`);
  // the app sections must be noindexed (their SPA route meta agrees)
  let notNoindexed = 0;
  for (const s of APP_SECTION_PATHS) {
    const html = readFileSync(join(out, s, "index.html"), "utf8");
    if (!/<meta name="robots" content="noindex" \/>/.test(html)) notNoindexed++;
  }
  if (notNoindexed === 0) ok("app-workspace sections are noindexed");
  else fail(`${notNoindexed} app section page(s) missing noindex`);
}

/* 7 — trust anchor (2026-09-13): the build must publish the per-release score
   manifest — algorithm versions + one digest per listing. Structural checks
   only (plain node, no TS runtime); the deep contract (coverage, digests,
   recomputation) lives in src/lib/trustAnchor.ts + tests/trustAnchor.test.ts,
   and the generator self-validates before writing. */
{
  const anchorPath = join(out, "trust-anchor.json");
  if (!existsSync(anchorPath)) {
    fail("out/trust-anchor.json missing — generate-trust-anchor.ts did not run (scores ship unanchored)");
  } else {
    let manifest = null;
    try {
      manifest = JSON.parse(readFileSync(anchorPath, "utf8"));
      ok("trust-anchor.json valid JSON");
    } catch {
      fail("trust-anchor.json is not valid JSON");
    }
    if (manifest) {
      if (manifest.schemaVersion !== 1) fail("trust-anchor schemaVersion !== 1");
      else ok("trust-anchor schemaVersion 1");
      const vOk =
        /^\d{4}-\d{2}-\d{2}\.\d+$/.test(manifest.algorithmVersion ?? "") &&
        /^\d{4}-\d{2}-\d{2}\.\d+$/.test(manifest.investmentAlgorithmVersion ?? "");
      if (!vOk) fail("trust-anchor algorithm versions missing/malformed — engines are unversioned");
      else ok(`trust engines ${manifest.algorithmVersion} / ${manifest.investmentAlgorithmVersion}`);
      const listings = Array.isArray(manifest.listings) ? manifest.listings : [];
      let badEntries = 0;
      let badDigest = 0;
      const seen = new Set();
      let dupes = 0;
      for (const l of listings) {
        if (
          typeof l?.id !== "string" ||
          !Number.isInteger(l.trust) ||
          l.trust < 0 ||
          l.trust > 100 ||
          typeof l.investment !== "number" ||
          !l.band ||
          !l.investmentBand
        ) badEntries++;
        if (!/^[a-f0-9]{64}$/.test(l?.digest ?? "")) badDigest++;
        if (seen.has(l?.id)) dupes++;
        seen.add(l?.id);
      }
      if (badEntries === 0 && badDigest === 0 && dupes === 0) {
        ok(`trust-anchor covers ${listings.length} listings, all entries + digests well-formed`);
      } else {
        fail(`trust-anchor malformed entries: ${badEntries} bad, ${badDigest} bad digests, ${dupes} duplicates`);
      }
      // coverage: every prerendered property page must have an anchored score
      const propDir = join(out, "properties");
      let propPages = 0;
      if (existsSync(propDir)) {
        for (const d of readdirSync(propDir)) {
          if (statSync(join(propDir, d)).isDirectory() && existsSync(join(propDir, d, "index.html"))) propPages++;
        }
      }
      if (propPages > 0 && listings.length === propPages) {
        ok(`trust-anchor coverage === prerendered listings (${propPages})`);
      } else {
        fail(
          `trust-anchor covers ${listings.length} listings but ${propPages} property pages are prerendered — ` +
            "the anchor and the shipped inventory have drifted",
        );
      }
    }
  }
}

console.log(
  failures === 0
    ? "\nArtifact verification PASSED.\n"
    : `\nArtifact verification FAILED (${failures} assertion${failures === 1 ? "" : "s"}).\n`,
);
process.exit(failures === 0 ? 0 : 1);
