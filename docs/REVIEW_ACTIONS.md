# Review Actions — Independent Product Review (31 Aug 2026)

An external product review ("Chacadom Investments and Keja AI — Deep Product,
UX, Technology, Trust, and Growth Review") examined both repositories and the
deployed demos. This tracker maps every recommendation to what we did about
it: **implemented**, **partially implemented**, **deferred (needs owner/legal
input)**, or **rejected (with reason)**. The goal is that no external
recommendation is silently ignored.

Status legend: ✅ implemented · 🟡 partial · ⏸️ deferred (owner decision) · ❌ rejected

## Keja AI — P0 items

| #    | Recommendation                                             | Status | What we did                                                                                                                                                                                                                                                                 |
| ---- | ---------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-1 | Make demo status unavoidable at sensitive touchpoints      | ✅     | Persistent demo banner (`DemoBanner`) that re-asserts on /tokenize, /admin, /account, /dashboard; demo-boundary copy added to the auth modal; tokenization surfaces carry explicit simulation notices.                                                                      |
| P0-2 | Replace client-side auth and RBAC before real accounts     | ⏸️     | Requires a backend host + secrets + cost — cannot be automated honestly inside a static demo. The boundary is now unavoidable in UI, documented in the claims register (`accounts` claim), and the Phase-2 migration path is documented in `src/lib/adminStore.ts`.         |
| P0-3 | Reframe verification as evidence with timestamps and scope | ✅     | New evidence model (`src/lib/verification.ts`): every check carries scope, method, check date, expiry (90-day policy) and freshness state; `EvidencePanel` renders it per listing with report-an-issue and request-human-review actions.                                    |
| P0-4 | Remove or gate tokenization transaction language           | ✅     | Homepage tokenize section rewritten education-first ("simulated offering · demo", net yield labelled `sim.`); CTAs renamed to demo framing; simulation notice block links to the claims register; engine and sidebar copy de-claim M-Pesa escrow (now "roadmap, not live"). |

## Keja AI — P1 items

| #    | Recommendation                                                    | Status | What we did                                                                                                                                                                                                                                                                   |
| ---- | ----------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1-1 | Claims register: every public promise, status, owner, review date | ✅     | `src/data/claims.ts` (18 claims: live / simulated / partner-dependent / planned, each with evidence + path-to-live + last-reviewed date), rendered verbatim on the Trust Center and integrity-tested.                                                                         |
| P1-2 | Listing freshness and correction workflows                        | ✅     | Freshness chips on listing cards/detail; report-an-issue dialog feeds `listing-reports` store; admin adjudication queue with resolve/dismiss + audit trail (`AdminListings → UserReportsPanel`).                                                                              |
| P1-3 | AI evaluation and safety controls                                 | ✅     | Escalation guard in the engine for suitability / legal / tax / lending / valuation questions (refuses to improvise, offers human handoff); 12-case golden test set with false-positive guards (`escalation.test.ts`). Demo credentials removed from chat answers.             |
| P1-4 | First-run role selection ("what are you trying to do?")           | ✅     | `RoleGate` first-visit picker (buy / rent / invest / list / manage) with focus trap, skip path and change-anytime control; home hero renders a tailored CTA strip.                                                                                                            |
| P1-5 | Instrument CTA and conversion                                     | 🟡     | Privacy-first local event bus (`src/lib/analytics.ts`) with an 11-event taxonomy wired into search, result view, save, compare, calculator, viewing request, human handoff, role choice and issue reporting. Attribution dashboards/CRM integration need the Phase-2 backend. |
| P1-6 | Narrow the first-run journey to one job                           | ✅     | Role gate + role-aware hero (above).                                                                                                                                                                                                                                          |
| P1-7 | Verified buyer-to-human handoff                                   | 🟡     | WhatsApp handoff exists and is tracked; full lead routing with SLAs and CRM needs backend + staff.                                                                                                                                                                            |

## Keja AI — P2 items

| #    | Recommendation                  | Status | What we did                                                                                                  |
| ---- | ------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| P2-1 | Diaspora workflows              | 🟡     | Articles exist; dedicated time-zone scheduling / POA checklist surfaces are roadmap.                         |
| P2-2 | Agent quality and response SLAs | ⏸️     | Needs operational telemetry (no real agents in the demo).                                                    |
| P2-3 | API and partner feed contracts  | 🟡     | Feed adapters + Auto-Pilot quality gates exist in code; versioned partner contracts are a business artefact. |

## Cross-cutting engineering items (our own findings)

| Item                                        | Status | What we did                                                                                                                                                                                                                                                              |
| ------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Deep routes returned HTTP 404 (soft-404s)   | ✅     | Ported the chacadom prerender pipeline: every sitemap route (static + property detail + articles — 109 at last count, grows with inventory) emits real `dist/<route>/index.html` with per-page titles/canonicals; wired into CI with a Playwright Chromium install step. |
| `security.txt`                              | ✅     | `public/.well-known/security.txt` with contact, expiry, policy links.                                                                                                                                                                                                    |
| Service-worker cache staleness after deploy | ✅     | SW version bumped (v4).                                                                                                                                                                                                                                                  |

## Explicitly deferred (cannot be automated by code)

- **Real contact details, entity registration, licensing, named leadership** —
  owner must supply real values; inventing them would be worse than the
  placeholder. The README flags them as launch blockers.
- **Server-side identity, MFA, session revocation** — requires a hosted
  backend (Phase 2).
- **M-Pesa escrow / payments** — requires a licensed PSP and a legal opinion
  on the platform's payment role; copy now says "roadmap, not live".
- **CMA classification of tokenization** — requires Kenyan counsel; module is
  education-only until then.
- **Response-time SLAs, complaint databases, agent reputation telemetry** —
  require live operations.

## Rejected (with reasons)

- _None of the review's technical recommendations were rejected._ The only
  pushback: the review's scorecard (4.x/5 dimensions) is not actionable and is
  not tracked here; and its suggestion to "add case studies with client
  references" is owner-gated for chacadom (we refuse to fabricate
  permissioned case studies — see the chacadom tracker).

---

## Internal audit wave 5 (31 Aug 2026, post-review hardening)

A second skeptical pass over the repo (not the external review) found and
fixed engineering issues the review never surfaced. Tracked here so the
pattern — external recommendations AND internal findings — stays auditable.

| Finding                                                                                                    | Severity | What was done                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auto-Pilot wrote unformatted JSON; `lint:prettier` failed and CI never ran it                              | P1       | `saveState()` formats via Prettier when importable; CI ingest job formats with the locked version before committing; data file reformatted; Prettier is now a blocking gate in both deploy workflows |
| No PR-time verification — breakage surfaced only at deploy                                                 | P1       | New `pr-check.yml`: full pipeline (typecheck, tests, lint, prettier, sitemap, build, prerender, SW stamp) on PRs and non-main pushes                                                                 |
| 404.html was a copy of Home (wrong meta + content flash on dead links)                                     | P1       | Prerender captures the real NotFound page (noindex, neutral copy)                                                                                                                                    |
| SW cache version bumped by hand (v3→v4→…)                                                                  | P1       | `scripts/sw-version.mjs` stamps the version from a content hash of `dist/` in every deploy                                                                                                           |
| SW asset-cache writes fire-and-forget (killable mid-put); no network timeout on navigations                | P2       | writes wrapped in `event.waitUntil`; navigations race an 8s timeout                                                                                                                                  |
| ~33 prerendered Home elements shipped `opacity: 0` inline (invisible to no-JS/crawlers)                    | P2       | capture strips the framer initial-hide style pair only                                                                                                                                               |
| `og:image` leaked from route to route                                                                      | P2       | resets to the site default when a route has none                                                                                                                                                     |
| Google Fonts render-blocking                                                                               | P2       | print-media swap + `noscript` fallback                                                                                                                                                               |
| `getRole()` blind-cast persisted role (tampered/corrupt values reach UI)                                   | P2       | validates against the role taxonomy                                                                                                                                                                  |
| Netlify path: Node 20 (engines say 22), no prerender                                                       | P2       | parity: Node 22, prerender in the build command                                                                                                                                                      |
| Test blind spots: format/investmentScore/inventory/roleStore/Markdown                                      | P2       | 23 new tests (incl. a Markdown XSS pin) — suite 85 → 108                                                                                                                                             |
| `IMPROVEMENT_PLAN.md` was stale/dishonest (wrong counts, `$(date)` placeholder, done items listed as TODO) | P2       | rewritten as an honest status + roadmap document                                                                                                                                                     |

## 2026-09-02 — wave 7 additions

| Finding                                                                       | Priority | Action taken                                                                                                                                                                             |
| ----------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entry bundle grew to ~611 kB (wave-5/6 features) — over the 500 kB audit line | P1       | LazyMotion+`m` migration (async motionFeatures chunk), Properties route + AuthModal lazy-split, TokenizeProvider moved inside lazy /tokenize and /admin route boundaries → entry ~491 kB |
| Client desk holds two further live mandates not represented in inventory      | P1       | KJA-024 Daykio Bustani 5BR (KES 67M, Kiganjo Road, Ruiru) + KJA-025 Kantafu 30 acres (KES 5.5M/acre) added with owner photos; verification honestly `pending`                            |
| Kantafu absent from area insights                                             | P3       | Added Kangundo-corridor land-banking insight                                                                                                                                             |

## 2026-09-12 — wave 8: crawler & share correctness (observe–fix–verify cycle)

A full observe→identify→plan→implement→verify cycle over the built artifact (not
just the code) found three defects in how search engines and share scrapers see
the platform. Every fix is test-pinned.

| Finding | Severity | What was done |
| --- | --- | --- |
| Hydrated canonical + og:url + breadcrumb JSON-LD URLs were malformed (`https://keja.appproperties/…`) — the same missing-slash class as the previously-fixed og:image bug, surviving in the two remaining `SITE_URL` concatenations in `seo.ts` | P1 (SEO) | New `absoluteUrl()` helper builds the trailing-slash canonical form the prerender and sitemap use; canonical, og:url and `breadcrumbJsonLd` items all route through it; regression tests pin the exact URL forms (glued-host guard included) |
| The sitemap advertised 17 static routes but only `/properties` had prerendered HTML — 16 sitemap'd section URLs served the generic home shell (duplicate content, wasted crawl budget) | P1 (SEO) | New shared section catalogue `src/lib/sectionMeta.ts` (title / description / sitemap fields / noscript summary per section) is now the single source for (1) the SPA's `RouteMeta`, (2) `scripts/prerender.ts` — 16 new prerendered section pages, 110 static pages total, (3) `scripts/generate-sitemap.mjs` (now runs under Bun to import the TS catalogue). `verify-artifacts.mjs` asserts all 16 sections exist and carry per-section titles; 9 parity tests pin the catalogue contract |
| `vercel.json`'s catch-all rewrite served HTTP 200 + the home shell for **every** unknown path (soft-404s across an infinite URL space; dead links looked like the homepage) | P1 (SEO/UX) | **All rewrites deleted.** The 8 app-workspace sections (`finance`, `data`, `transact`, `manage`, `tenant`, `institutional`, `deal-analyst`, `portfolio`) are now prerendered as **noindexed shells** (their legacy path URLs boot the SPA via the existing inline boot script — no rewrite needed), and every other unknown path falls through to `out/404.html`. The 404 page was also fixed up (one honest title instead of the home title, `noindex` with the conflicting `googlebot` meta removed, a "Back to Keja AI" link). The deploy smoke test asserts: unknown path → 404, `/tokenize/` → 200 with its own title, `/finance/` → 200 + noindexed |
| First attempt used a `^/(data\|finance\|…)` regex rewrite source — the deploy smoke test caught it dead (`/finance` → 404: Vercel's rewrite engine did not treat the `^…` source as a regex) | P1 (process) | Fixed by prerendering the app sections instead (filesystem precedence always works); the failed deploy's production state was detected and repaired within one cycle — the smoke test did its job |

Evidence: 318 tests pass (16 new); typecheck + lint clean; artifact verification
green ("all 16 catalogue sections prerendered"); the hydrated `#/properties/KJA-001`
DOM was verified in-browser — canonical, og:url and breadcrumb items all read
`https://keja.app/…/` post-fix. The 404-vs-rewrite behaviour on Vercel is
asserted by the post-deploy smoke test (a local static server always rewrites
to the shell, so it cannot reproduce that behaviour).

## 2026-09-12 — wave 9: route-scoped sign-in modal (cycle 2)

| Finding | Severity | What was done |
| --- | --- | --- |
| The sign-in modal — a full-screen overlay that intercepts every click — followed the user across route navigation indefinitely, keeping its stale "sign in to continue: X" intent until manually closed. Observed live: it blocked the contact form's Send button three routes later. | P1 (UX) | `AuthModal` is now route-scoped: navigating away closes it and clears the pending intent (the gated action belongs to the route that opened it; the Google popup flow is unaffected — no route change during OAuth). Backdrop click now dismisses too (same as Escape / Close). Pinned by `tests/authModal.test.tsx` (3 cases, incl. the jsdom async-hashchange flush the tests taught us about). |

Verified in a fresh browser session against the rebuilt artifact (an earlier
false negative came from the long-lived test session's stale chunk cache —
recorded as a testing lesson: verify DOM behavior against a fresh context
after a rebuild).
