#!/usr/bin/env node
/**
 * inject-preloads.mjs — parallelize the SPA boot waterfall.
 *
 * Problem this solves: the app shell is a next/dynamic import
 * (`dynamic(() => import("@/components/shell/KejaApp"), { ssr: false })`).
 * The browser cannot know about those chunks until the entry scripts have
 * downloaded AND executed, so first paint waits on a serial chain:
 *
 *   index.html → entry scripts (507 kB) → [execute] → shell chunks
 *   (zod 274 kB + shell 336 kB) → [execute] → React mounts
 *
 * On real Kenyan mobile networks that serial discovery costs 1–2 extra
 * round trips before the first content paint. This script walks the
 * webpack runtime's own chunk map, resolves the chunks the boot-time
 * dynamic import needs, and injects `<link rel="preload" as="script">`
 * hints into out/index.html — the browser then fetches entry and shell
 * chunks in parallel. Preload hints never change behaviour; the worst
 * case is a warmed cache the webpack loader then reuses.
 *
 * Run BEFORE scripts/prerender.ts so every prerendered route page clones
 * the injected template (the waterfall applies to every entry URL).
 *
 * Usage:  node scripts/inject-preloads.mjs   (expects out/ to exist)
 */
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, process.env.OUT_DIR ?? "out");

/* ---------- pure helpers (unit-tested in tests/injectPreloads.test.ts) ---------- */

/** All <script src> URLs in the HTML, excluding nomodule (legacy polyfill) tags. */
export function parseEntryScripts(html) {
  const scripts = [];
  // nomodule is case-variant in the wild ("noModule=") and may sit before OR
  // after src — test the whole opening tag, case-insensitively
  for (const m of html.matchAll(/<script\b([^>]*)>/g)) {
    const tag = m[0];
    const src = tag.match(/\bsrc="([^"]+)"/)?.[1];
    if (!src) continue;
    if (/\bnomodule\b/i.test(tag)) continue;
    scripts.push({ src, raw: tag });
  }
  return scripts;
}

/** Chunk ids referenced by webpack dynamic imports (`.e(id)`) in a chunk's source. */
export function parseDynamicChunkIds(chunkSource) {
  const ids = new Set();
  for (const m of chunkSource.matchAll(/\.e\((\d{1,7})\)/g)) ids.add(m[1]);
  return [...ids];
}

/**
 * The webpack runtime's chunk-URL function (`s.u`), reversed into an
 * id → URL map. Observed shape (webpack 5, Next 16):
 *
 *   s.u=e=>6509===e?"static/chunks/6509-2b8ab353db82af4c.js"
 *        :4831===e?"static/chunks/4831-8d8d8c9f639934fb.js"
 *        :"static/chunks/"+(1761===e?"d0deef33":e)+"."
 *          +({213:"00a57d68090acd16",...}[e]||e)+".js"
 *
 * Returns { byId: Map<id, url>, unresolvable: id[] } — every id either maps
 * to a URL or is reported, never guessed.
 */
export function parseChunkUrlMap(runtimeSource) {
  const byId = new Map();
  // explicit special cases:  1234===e?"static/chunks/…"
  for (const m of runtimeSource.matchAll(/(\d+)===e\?"(static\/chunks\/[^"]+)"/g)) {
    byId.set(m[1], m[2]);
  }
  // general hash map:  ({213:"00a57d68090acd16",…})[e]  (observed wrapped in parens;
  // accept both the wrapped and the bare `[e]` indexing forms)
  const hashEntries = new Map();
  const mapBlock = runtimeSource.match(
    /\{(\d+:"[a-f0-9]+"(?:,\d+:"[a-f0-9]+")*)\}/,
  );
  if (mapBlock) {
    for (const m of mapBlock[1].matchAll(/(\d+):"([a-f0-9]+)"/g)) hashEntries.set(m[1], m[2]);
  }
  // named-base special case:  (1761===e?"d0deef33":e)
  const namedBases = new Map();
  for (const m of runtimeSource.matchAll(/(\d+)===e\?"([a-f0-9]+)":e\)/g)) {
    namedBases.set(m[1], m[2]);
  }
  const resolve = (id) => {
    if (byId.has(id)) return byId.get(id);
    const hash = hashEntries.get(id);
    if (!hash) return undefined;
    const base = namedBases.get(id) ?? id;
    return `static/chunks/${base}.${hash}.js`;
  };
  return { resolve };
}

/** Preload links for dynamic chunks that are not already <script> entries. */
export function buildPreloadLinks(dynamicIds, resolveUrl, entrySrcs, existingLinks = new Set()) {
  const links = [];
  const entrySet = new Set(entrySrcs);
  for (const id of dynamicIds) {
    const url = resolveUrl(id);
    if (!url) continue; // unresolvable ids are surfaced by the CLI, not here
    const href = `/_next/${url}`;
    if (entrySet.has(href)) continue; // already a boot <script> — nothing to warm
    if (existingLinks.has(href)) continue; // idempotent
    links.push(`<link rel="preload" as="script" href="${href}" />`);
  }
  return links;
}

/* ---------- CLI (pure helpers above are unit-tested directly) ---------- */

const isMain =
  process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isMain) {
  const indexHtml = join(OUT, "index.html");
  if (!existsSync(indexHtml)) {
    console.error("[inject-preloads] out/index.html not found — run the build first");
    process.exit(1);
  }

  let html = readFileSync(indexHtml, "utf8");
  const entryScripts = parseEntryScripts(html);
  if (entryScripts.length === 0) {
    console.error("[inject-preloads] no entry scripts found in index.html — unexpected build shape");
    process.exit(1);
  }

  // Boot-time dynamic imports live in the entry chunks (today: only app/page-*.js).
  const chunksDir = join(OUT, "_next", "static", "chunks");
  const dynamicIds = new Set();
  let sawDynamicImport = false;
  for (const s of entryScripts) {
    const file = join(OUT, s.src.replace(/^\//, ""));
    if (!existsSync(file)) continue;
    const ids = parseDynamicChunkIds(readFileSync(file, "utf8"));
    if (ids.length > 0) sawDynamicImport = true;
    ids.forEach((id) => dynamicIds.add(id));
  }

  if (!sawDynamicImport) {
    // Not an error: a future build shape without boot-time dynamic imports has
    // nothing to preload. Log loudly so the silence is visible.
    console.log("[inject-preloads] no boot-time dynamic imports found — nothing to inject");
    process.exit(0);
  }

  // The webpack runtime holds the authoritative id → URL map.
  const runtimeScript = entryScripts.find((s) =>
    /\/_next\/static\/chunks\/webpack-[\w-]+\.js$/.test(s.src),
  );
  if (!runtimeScript) {
    console.error("[inject-preloads] webpack runtime chunk not found among entry scripts");
    process.exit(1);
  }
  const runtimeSrc = readFileSync(join(OUT, runtimeScript.src.replace(/^\//, "")), "utf8");
  const { resolve: resolveUrl } = parseChunkUrlMap(runtimeSrc);

  // Every dynamic id must resolve to a real file — a miss is a build-shape
  // change we refuse to paper over with a partial preload set.
  const unresolvable = [];
  for (const id of dynamicIds) {
    const url = resolveUrl(id);
    if (!url || !existsSync(join(chunksDir, url.replace(/^static\/chunks\//, "")))) {
      unresolvable.push(id);
    }
  }
  if (unresolvable.length > 0) {
    console.error(
      `[inject-preloads] cannot resolve chunk id(s) ${unresolvable.join(", ")} — ` +
        "the webpack runtime shape changed; update parseChunkUrlMap()",
    );
    process.exit(1);
  }

  const existingLinks = new Set(
    [...html.matchAll(/<link[^>]*rel="preload"[^>]*href="([^"]+)"/g)].map((m) => m[1]),
  );
  const links = buildPreloadLinks(
    [...dynamicIds],
    resolveUrl,
    entryScripts.map((s) => s.src),
    existingLinks,
  );

  if (links.length === 0) {
    console.log("[inject-preloads] all boot-time dynamic chunks already preloaded");
    process.exit(0);
  }

  html = html.replace("</head>", `${links.join("\n    ")}\n  </head>`);
  writeFileSync(indexHtml, html, "utf8");

  for (const l of links) {
    const href = l.match(/href="([^"]+)"/)[1];
    const size = Math.round(statSync(join(OUT, href.replace(/^\//, ""))).size / 1024);
    console.log(`[inject-preloads] preload ${href} (${size} kB)`);
  }
  console.log(
    `[inject-preloads] injected ${links.length} preload hint(s) — shell chunks now fetch in parallel with entry execution`,
  );
}
