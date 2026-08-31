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
| P1-1 | Claims register: every public promise, status, owner, review date | ✅     | `src/data/claims.ts` (20 claims: live / simulated / partner-dependent / planned, each with evidence + path-to-live + last-reviewed date), rendered verbatim on the Trust Center and integrity-tested.                                                                         |
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

| Item                                        | Status | What we did                                                                                                                                                                                                         |
| ------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deep routes returned HTTP 404 (soft-404s)   | ✅     | Ported the chacadom prerender pipeline: 61 routes (static + property detail + articles) emit real `dist/<route>/index.html` with per-page titles/canonicals; wired into CI with a Playwright Chromium install step. |
| `security.txt`                              | ✅     | `public/.well-known/security.txt` with contact, expiry, policy links.                                                                                                                                               |
| Service-worker cache staleness after deploy | ✅     | SW version bumped (v4).                                                                                                                                                                                             |

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
