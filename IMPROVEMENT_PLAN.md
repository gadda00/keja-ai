# Keja.ai — Improvement Status & Roadmap

> This document replaced the original improvement plan after an internal audit
> found it stale and partly inaccurate: it claimed 45 unit tests (the suite was
> 85 at the time, 108 after this wave), left a literal `$(date)` placeholder in
> its footer, and listed already-shipped work (ESLint, Prettier, lint-staged,
> husky) as future TODOs. It also recommended migrations (Zustand, a live API
> layer, server auth) that contradict the demo's deliberately client-side,
> static-hosted architecture. This version states verified facts, records what
> each improvement wave actually changed, and keeps a realistic roadmap.

## Current state (verified, not aspirational)

| Dimension    | Status                                                                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typecheck    | strict `tsc -b` — 0 errors                                                                                                                                                |
| Tests        | 124 passing (16 files: finance, search, scoring, autopilot, escalation, claims, verification, analytics, anomaly, stores, markdown renderer, role gate, SEO URL contract) |
| Lint         | oxlint + ESLint (flat config, `--max-warnings 0`) + Prettier — all clean                                                                                                  |
| Build        | Vite 8 production build, route-level code splitting, recharts isolated to a lazy chunk                                                                                    |
| Static-first | every sitemap route prerendered to status-200 HTML incl. a real 404 page                                                                                                  |
| CI           | deploy on main + PR-check workflow (full verification incl. prerender)                                                                                                    |
| Auto-Pilot   | scheduled ingestion pipeline, quality-gated, Prettier-formatted commits                                                                                                   |

## Wave 5 (this audit) — what changed and why

1. **Auto-Pilot Prettier drift eliminated.** The publisher wrote raw
   `JSON.stringify` output while Prettier collapses short arrays, so
   `lint:prettier` failed on `src/data/auto-listings.json` and the drift
   compounded with every scheduled ingest. `saveState()` now formats through
   Prettier when it is importable; the zero-dependency CI ingest job formats
   via the exact locked `prettier` version before committing; the data file
   was reformatted once to reset the baseline.
2. **Mechanical service-worker cache versioning.** `scripts/sw-version.mjs`
   stamps the SW cache version from a content hash of `dist/` in the deploy
   pipeline — the v3→v4→v4 hand-edits could not be relied on forever. SW
   robustness fixes: asset-cache writes now survive SW termination
   (`event.waitUntil`), and navigations race an 8s timeout so lie-fi
   connections fall back to cache instead of hanging.
3. **Real 404 page.** The deploy used to copy Home's HTML as `404.html`, so
   dead links flashed Home's content and meta. Prerender now captures the
   router's NotFound page (noindex, neutral copy).
4. **Prerendered HTML is visible to no-JS clients.** Framer-motion initial
   states (`opacity: 0` + `translateY`) were baked into the static HTML,
   hiding ~33 below-fold elements on Home from crawlers and no-JS visitors;
   the capture step now strips exactly that inline-style pair.
5. **Meta hygiene.** `og:image`/`twitter:image` reset to the site default on
   routes without their own image (previously a stale leak); `index.html`
   loads Google Fonts non-blockingly (print-media swap + `noscript`).
6. **Quality gates widened.** Both deploy workflows and the new
   `pr-check.yml` (PRs and non-main pushes) run the full pipeline —
   typecheck, tests, oxlint, ESLint, Prettier, sitemap, build, prerender,
   SW stamping.
7. **Robustness + coverage.** `getRole()` validates the persisted role
   against the taxonomy; 23 new tests (format/investment-score/inventory
   engines, roleStore incl. corrupted-storage cases, Markdown renderer with
   an XSS pin). Netlify config brought to parity (Node 22 + prerender).

## Deliberate non-goals (same reasoning as the claims register)

- **Zustand / API service layer / server auth / JWT** — these assume a hosted
  backend. The demo is intentionally client-side; the honest boundary (demo
  auth, simulated payments) is disclosed in-app, in the claims register and in
  the README launch blockers. Introducing a fake "real-looking" backend would
  _reduce_ trust, not increase it.
- **Dark mode, Storybook, canary deploys** — polish, not substance, for a
  static demo at this stage.

## Remaining roadmap (ordered)

1. ~~**Bundle:** the eager index chunk is ~558 kB raw~~ **DONE (wave 7):**
   `LazyMotion` + `m` migration across all animated files (engine now an async
   `motionFeatures` chunk), `Properties` route and `AuthModal` lazy-split,
   and the `TokenizeProvider` moved inside the lazy `/tokenize` + `/admin`
   boundaries (write-through localStorage makes route-level providers safe).
   Entry chunk: **~491 kB raw / ~131 kB gzipped** — under the 500 kB budget,
   verified visually in a headless browser (hero animates to opacity 1).
2. **Admin console breadth:** `adminStore`/`seo.ts`/`auth.tsx` still lack
   direct unit tests (they are exercised indirectly through app tests).
3. **Insights library provenance:** article front-matter (author, reviewed-at,
   sources) is a content task for the owner; the data layer renders whatever
   is provided.
4. **Analytics egress:** the privacy-first local event bus is complete; any
   dashboard/CRM export waits for the Phase-2 backend.

## Wave 7 — live client mandates + performance budget

Two more **real client mandates** joined the marketplace with owner-supplied
photography: KJA-024 Daykio Kiragu executive 5BR (asking KES 67M,
direct-owner mandate) and KJA-025 Kantafu 30 acres (KES 5.5M/acre, ready
title, direct owner transaction) — both honestly labelled `titleCheck:
pending` until the verification desk completes independent searches, with a
new Kantafu area insight. The entry bundle was brought back under the 500 kB
performance budget (see roadmap item 1).

Document version: 2.0.0 — maintained in-repo; update with every improvement
wave (see `docs/REVIEW_ACTIONS.md` for the external-review tracker).

## Wave 6 — The Waterfront Karen flagship location

The client's major selling point now carries its weight across the site:
`/areas/waterfront-karen` neighbourhood guide (photos, click-to-load sandboxed
YouTube tour, FACT/REPORTED/ESTIMATE-labelled investment thesis, live Karen
inventory join, Place JSON-LD), homepage spotlight section, Waterfront badge
on Karen listing cards, Ask-Keja engine intent with area aliases, sitemap
entry and 8 new tests. Reported media figures (KES 9B transaction, 50.6-acre
expansion) are labelled REPORTED — distinct from verified listing facts.
