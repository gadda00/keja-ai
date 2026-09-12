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

## 2026-09-12 — wave 10: second-factor hardening + data boundaries (cycle 3)

One observe→identify→plan→implement→verify cycle over five impact-ranked
defects (security first, then data quality, then crash resilience). Every
fix is test-pinned; the four code fixes ship as one coherent change set.

| Finding | Severity | What was done |
| --- | --- | --- |
| 2FA recovery codes were stored **in plaintext** in localStorage — contradicting the documented "single-use, hashed" contract in `totp.ts`; anyone reading the device storage saw every remaining code, defeating the recovery feature's own threat model | P0 (security) | Recovery codes are now hashed with SHA-256 at enrolment (`hashRecoveryCode`); verification compares hashes; single-use semantics unchanged. Enrolments written before the change are migrated in place on provider mount (`hashLegacyRecoveryCodes`), so codes the user saved on paper keep working while storage stops leaking them. Pinned by `tests/recoveryCodes.test.ts` + the provider-level `tests/twoFactorFlow.test.tsx` |
| No attempt limit on 2FA verification — unlimited 6-digit guesses (3 valid codes per 90 s window) is a viable guessing channel for exactly the "casual use of a borrowed session" the claims register names | P0 (security) | New pure policy module `src/lib/twoFactorGuard.ts`: consecutive failures escalate into timed lockouts (5 → 30 s, 10 → 5 min, 20 → 15 min ceiling), persisted per account inside the enrolment record and audit-logged as `auth.2fa.lockout`; a correct code (or recovery code) resets the counter. Applies to verify **and** disable paths; the lock rejects even a correct code until it expires. Pinned by `tests/twoFactorGuard.test.ts` (injected clock) + integration cases |
| The listing wizard published its form state verbatim — an empty title, a `Number('')`=0/NaN price, or uncapped text flowed straight into the marketplace merge (`useAllProperties`), home stats and the AI corpus | P1 (data/product) | New publish boundary: `listingFormSchema` (zod) in `boundaries.ts` — title 8–120 chars, positive integer price with an upper bound, sane bedroom/bathroom/size caps, purpose ≥ 1, description 20–5,000 chars, phone cap. Invalid submissions are refused with per-field inline errors (aria-invalid/describedby, error clears on edit) and the stepper jumps to the first offending step; only the cleaned value is stored. Pinned by `tests/listingForm.test.ts` |
| Every-visitor stores trusted `JSON.parse(raw) as T` — one corrupted write (partial write, quota hit, stale shape, devtools edit) crashed the view behind the ErrorBoundary with no self-repair (audit F-19 had only covered auth/tokenize/auto-listings) | P1 (reliability) | New `useValidatedStore` in `store.ts`: zod schema at the read seam — invalid roots fall back to defaults, junk array elements are dropped element-wise (the auto-listings policy), and repairs are written back so reads stabilise. Wired into the keys the main surfaces read: favorites, compare, chat-history, saved-searches, notifications, user-listings. Shared hooks (`useFavorites`, `useCompareList`, `useChatHistory`) replace the scattered `useStore<string[]>` call sites. The stale `ChatMessage.meta: string[]` in `store.ts` was corrected to the real gateway shape (meta/sources/action). Pinned by `tests/storeValidation.test.tsx` |
| Working-tree hygiene: the local `.gitignore` had been gutted to two lines, leaving `.env`, `db/custom.db`, `upload/`, `dev.log` and `.next/` one `git add -A` away from the public repo; `next-env.d.ts` had drifted to the dev variant (would break CI typecheck if committed) | P0 (process, local only) | Restored the committed 49-line `.gitignore` (verified: every sensitive path matches an ignore rule again) and reset `next-env.d.ts`; the workspace-only `skills/` entry moved to `.git/info/exclude` so it never enters a commit. No repo change — the committed files were already correct |

Evidence: 378 tests across 29 files (52 new); typecheck + lint clean; the
full build passes artifact verification (118 static pages, 111 sitemap
URLs); live smoke of keja.app green before and after.

## 2026-09-12 — wave 11: the delivery pipeline gets gates (cycle 4)

One observe→identify→plan→implement→verify cycle over **how code reaches
production**, prompted by the Auto-Pilot's 00:11 UTC ingest shipping to
keja.app with zero workflow runs against it. Forensic evidence (Actions
runs API + deployments API) drove every fix. No app-runtime behaviour
changed except additive preload hints.

| Finding | Severity | What was done |
| --- | --- | --- |
| **Bot data reached production having never been unit-tested.** The Auto-Pilot pushes with GITHUB_TOKEN, which can never trigger `deploy-vercel.yml` (GitHub recursion-prevention) — its `1e4f473` commit had 0 workflow runs yet went live within 37 s. The autopilot's own `verify` job ran only typecheck + lint + `next build` — **not `npm test`**, i.e. not the data-integrity suite (every listing passes schema, every image path resolves, unique ids, sane prices) that exists precisely to police bot-written data. | P0 (data/quality) | The verify job now runs the full gate suite: typecheck → lint → **unit tests** → the complete `npm run build` (sitemap, prerender, preload injection, SW stamp, artifact verification — the same chain the deployment builds run). If it fails, the new **revert-if-broken** job `git revert`s the ingest commit — guarded: only if HEAD is still the ingest commit (a human push in between means history is left alone and the job fails loudly instead) — and the Vercel Git integration redeploys the last good state. The marketplace self-heals. |
| **Every PAT push deployed twice** — the Vercel Git integration (connected, contra the documented "no GitHub integration" claim — `vercel[bot]` production deployments exist for every commit since `99f8eee`) AND the CLI workflow, racing the production alias and burning duplicate builds. | P1 (reliability) | New `scripts/deploy-guard.mjs` (13 unit tests: decision table, polling semantics, fail-open): the workflow asks the GitHub deployments API whether `vercel[bot]` already shipped the exact SHA; **skip** the CLI deploy when it succeeded, **fall back** to the CLI when it failed or is absent, **fail open** (duplicate deploy, never missing deploy) on API errors. Gates + the (now dual-URL) smoke test still run on every push — the integration has neither. |
| **The canonical domain was optional in monitoring.** `production-check.yml` required only the vercel alias; `keja.app` was `required: false` behind a stale "needs DNS switch at Spaceship" note — the switch happened 2026-09-10 and keja.app is the domain real users type. A keja.app-only outage (DNS drift, domain re-verification, SSL) passed the hourly check silently. | P0 (monitoring) | `keja.app` is now `required: true` (the alias too, as the secondary surface), and the deploy smoke test gained a canonical-domain leg (availability, PWA, security headers, real 404s). |
| **A failed deployment = stale-but-healthy production, and nothing noticed.** If the integration's build fails (e.g. bad data), the alias serves the last good build; the hourly smoke only checks "200 + headers" — it stayed green forever. | P1 (reliability) | The hourly check gained a **freshness assertion**: the newest listing in the committed repo data must exist as a live prerendered page on keja.app (one 300 s retry covers the mid-deploy window). Stale production goes red within the hour, with an error message that names the symptom and where to look. |
| **Critical-JS boot waterfall + entry over the audit line.** Entry 507 kB raw (audit line 500 kB, wave-7 result 491 kB) discovered the shell chunks (zod 274 kB + shell-with-all-87-listings 336 kB) only after executing the entry — ~1.12 MB raw serial before first paint. | P1 (performance) | `scripts/inject-preloads.mjs` (13 tests): walks the webpack runtime's own chunk map (inline special cases, paren-wrapped hash map, named-base ids — byte-verified shapes) and injects `<link rel="preload" as="script">` for exactly the boot-time dynamic chunks into `out/index.html` **before** the prerender clones it; `verify-artifacts.mjs` now asserts the hints exist and resolve, and enforces an **entry-JS budget ratchet** (525 kB, tightening to 500 kB when the planned inventory data-split lands — CURRENT_PICTURE §8.5). |

Evidence: 404 tests / 31 files (26 new) · typecheck + lint clean · artifact
verification green (118 pages, 2 injected preloads, 507 kB ≤ 525 kB budget) ·
live walkthrough clean (home, NL search, listing detail, Ask Keja escalation,
account — zero console errors, no 390 px overflow) · all four workflow files
YAML-validated.
