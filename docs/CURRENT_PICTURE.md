# Keja AI — Current Picture

**Snapshot date: 11 September 2026 · repo `gadda00/keja-ai` · this document is the post-implementation state of the platform after the Phase-2 engineering engagement (plus the Phase-2.5 access-and-auth hardening, the Phase-3 intelligence layer, and the Phase-3.5 Google-only + 2FA hardening below).**

This is the honest, complete picture after: (1) the Phase-1 build (Aug–Sep 2026), (2) the ~100-page Phase-2 technical audit (`scripts/phase2_audit/final.pdf`), (3) the implementation of the audit's Phase-2 workstreams described below, (4) the Phase-2.5 additions — real Google Sign-In, valid `.well-known` app associations, and the operator site guide, (5) the Phase-3 additions — the governed events/data-quality layer, release-correctness fixes, the intelligence gateway, and Google Sign-In activation in production, and (6) the Phase-3.5 additions — Google-only accounts, Google Authenticator two-factor (RFC 6238), and the public administrator contact. It replaces `REPO_PICTURE.md` (the pre-audit snapshot) as the authoritative "where are we" document. `src/lib/api/storeTwin.ts` points readers here for the local/remote persistence story.

---

## 1. Live state

| Surface | URL | Status |
| --- | --- | --- |
| Canonical domain | **https://keja.app** | live (Vercel) |
| Production alias | https://keja-ai-rho.vercel.app | live (Vercel) |
| Repo | https://github.com/gadda00/keja-ai | `main` = production, every push deploys |
| Native shells | `android/`, `ios/` (Capacitor 8) | buildable via `npm run mobile:apk` / `mobile:ios` |

- Hosting is **Vercel** (project `keja-ai`, API-driven deploys from GitHub Actions — the account has no GitHub app integration; the `VERCEL_TOKEN` secret + prebuilt-deploy pattern is the runbook in `docs/DEPLOYMENT.md`).
- The Netlify configuration is fully retired; the keja.app domain points at Vercel's nameservers.
- Build output: static export (`out/`, 95 prerendered pages + 111 sitemap URLs at last build) behind a SPA rewrite, with per-path cache/security headers from `vercel.json`.
- `/.well-known/assetlinks.json` and `/.well-known/apple-app-site-association` now serve **valid JSON** with `application/json` headers (previously the SPA rewrite answered them with HTML + HTTP 200). They carry empty statements until release signing keys exist — then `scripts/generate-assetlinks.mjs` fills in the real fingerprints.
- Monitoring: hourly `production-check.yml` smoke test (availability, `sw.js` cache headers, manifest, security headers) plus a post-deploy smoke test inside `deploy-vercel.yml`.

## 2. What Phase 2 shipped

The audit's findings were implemented in five workstreams (commit `feat(phase2): implement the Phase-2 audit workstreams`, plus the test-suite and docs commits that follow it).

### 2.1 Security & integrity

- **Password hashing (audit F-01, Critical):** unsalted DJB2 is gone. `src/lib/password.ts` implements PBKDF2-SHA-256 (100k iterations, 16-byte random salt) via WebCrypto, stored as `k2$iter$salt$hash`. Legacy `k1$…` hashes still verify and are transparently re-hashed to `k2` on sign-in. *Verification of this surface caught a real bug — see §4.*
- **Boundary validation (F-19/F-20):** `src/lib/boundaries.ts` puts zod schemas at every persistence read: auth users/sessions, the tokenize store, and the Auto-Pilot's `auto-listings.json` (5,600+ bot-written lines) — invalid entries drop loudly, never crash the marketplace.
- **Identifiers (F-37):** `src/lib/uuid.ts` — RFC-4122 v4 IDs with prefixed, collision-safe `newId()` replacing the 30+ `Date.now()` id sites.
- **Auth surface:** new `AuthModal` and admin `AdminGate` with explicit demo boundaries; demo credentials are PBKDF2 specimens committed in `password.ts`.

### 2.2 Data foundation (audit Ch. 24, F-30 / P2-1)

- `prisma/schema.prisma` is the **real Phase-2 domain schema**: 18 models (User, Session, Property, PropertyEvidence, ListingSubmission, TenancyApplication, Viewing, Lead, Unit, TenantRecord, RentPayment, MaintenanceTicket, Claim, KycRecord, AuditEntry, SavedSearch, Profile, Area) with enums, `unique(unitId, period)` double-entry guards, cascade/RESTRICT delete rules, and opaque session tokens. SQLite for dev/CI, deliberately portable to Postgres.
- `.env.example` documents `DATABASE_URL`; `db:push`/`db:generate`/`db:migrate` scripts wired; `@prisma/client` is a declared dependency (lockfile synced).

### 2.3 API seam (audit Ch. 23, P2-2)

- `src/lib/api/client.ts`: the one place that knows how to talk to a backend. With `NEXT_PUBLIC_API_URL` unset (today) every call rejects `ApiUnavailable` and the platform runs exactly as before.
- `src/lib/api/storeTwin.ts`: `useStoreTwin` exposes the `useStore` interface with local/remote duality — localStorage today, REST collection hydration + optimistic writes when the seam is configured. Migration waves swap domains one line at a time.

### 2.4 Performance

- **WebP everywhere:** the photo catalog ships `-w480`/`-w960` variants (avg ~60% smaller); `src/lib/responsive-images.ts` builds srcset/sizes; PropertyCard / PropertyDetailView / CompareBar render srcset-aware. All `.jpg` references were migrated out of the datasets (verified by test).
- Old `.jpg` originals, 36 unused shadcn/ui components, `tailwind.config.ts` (Tailwind v4 CSS-first), `Caddyfile`, `mini-services/`, and `src/lib/db.ts` were deleted.

### 2.5 SEO & shell

- `src/lib/seo.ts`: per-route title/description/OG/Twitter/canonical with idempotent upserts + route-scoped JSON-LD. *Writing its tests caught the malformed `og:image` URL bug — see §4.*
- Sitemap pipeline (`scripts/generate-sitemap.mjs`) + TypeScript prerender (`scripts/prerender.ts`): every listing, article and area guide emits real static HTML (95 pages) so deep routes are crawlable — no soft-404s.
- `MapPanel` (Leaflet) + `src/data/areaCoords.ts` gazetteer power the clustered results map; `telemetry.ts` provides the cookieless event mirror.

## 3. Quality gates — the test suite

The audit's Ch. 22 demanded a real test suite before any LLM work. `npm test` runs **vitest, 233 tests across 18 files** (jsdom + Node webcrypto), and is now a gate in **both** `pr-check.yml` and `deploy-vercel.yml` (typecheck → lint → **test** → build).

| File | Covers |
| --- | --- |
| `tests/password.test.ts` | PBKDF2 format/salting/round-trip, k1 legacy + migration, DoS iteration guard, committed demo-credential specimens |
| `tests/boundaries.test.ts` | safeParse fallbacks, auth schemas, Auto-Pilot payload salvage (per-entry drop counting) |
| `tests/escalation.test.ts` | the Ask-Keja guard: 12 escalation cases (suitability, fraud, legal, tax, lending, valuation) + 5 false-positive guards |
| `tests/finance.test.ts` | ROI engine, mortgage annuity + amortisation + extra payments, affordability DTI cap — hand-computed values |
| `tests/trustScore.test.ts` | 12-factor composite: weights sum to 1, bounds, band thresholds, adverse-signal behaviour |
| `tests/investmentScore.test.ts` | 7-factor 0–10 scale, band mapping, honest basis labels |
| `tests/data-integrity.test.ts` | every listing (authored + bot) passes schema, **every image path resolves to a real file**, unique ids, sane prices/sizes |
| `tests/claims.test.ts` | the 24-claim register: unique ids, valid statuses, disclosure rules, path-to-live for non-live claims |
| `tests/verification.test.ts` | 90-day freshness policy incl. exact boundary days, evidence derivation |
| `tests/seo.test.ts` | meta idempotency, absolute OG URLs, default-image reset, JSON-LD replacement |
| `tests/analytics.test.ts` | governed-layer contracts — envelope validation, safeText redaction, unknown-key stripping, 500-entry ring cap, corruption recovery, quality verdicts, metric computation |
| `tests/api-client.test.ts` | unconfigured-seam rejection contract, token custody |
| `tests/uuid.test.ts`, `tests/format.test.ts`, `tests/areaCoords.test.ts`, `tests/responsive-images.test.ts` | identifiers, KES formatting/trust tiers/time-ago, Kenya bounding-box gazetteer, srcset construction |
| `tests/googleAuth.test.ts` | GIS ID-token decoder round-trip + malformed rejections, claim validation (issuer/audience/expiry/email_verified), admin-allowlist mapping, Google-photo vs demo-colour pictures |
| `tests/aiGateway.test.ts` | 11-category escalation catalogue + factual-exception guards, provider-seam redaction, retrieval (area boost/gibberish/sufficiency), corpus integrity (real inventory refs, freshness windows), gateway outcomes with governed-event assertions, post-generation review controls |

## 4. Bugs the verification caught (and fixed)

1. **`verifyPassword` double-skip destructuring (Critical):** `const [, , iterStr, saltB64, hashB64] = stored.split('$')` skipped two elements of a four-field format — the salt was read as the iteration count, `Number(salt)` = NaN, and **every k2 password verification returned false** (demo email sign-in was silently broken). Fixed in `src/lib/password.ts`; pinned by the specimen tests.
2. **Malformed `og:image` URLs:** `absoluteImage` stripped the leading slash while `SITE_URL` has no trailing slash → `https://keja.appimages/…` on every per-route share card. Fixed in `src/lib/seo.ts`; pinned by the SEO tests.
3. **Rebase hygiene:** the implementation was re-applied cleanly on top of the Auto-Pilot's 2026-09-11 ingest (newer listing data kept; image references migrated to `.webp`), with the bot's data validated end-to-end rather than trusted.

## 4.5 Phase-2.5 additions (same-day hardening)

- **Real Google Sign-In (Google Identity Services):** `src/lib/googleAuth.ts` (GIS loader, base64url JWT decoder, claim validation, role mapping — pure and unit-tested) + `loginWithGoogleCredential()` in `auth.tsx` (find-or-create, profile refresh, admin allowlist that upgrades but never downgrades) + the real Google button in `AuthModal` whenever `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set. CSP in `vercel.json` was extended for `accounts.google.com` (script/frame/connect) and `*.googleusercontent.com` profile photos. Activation runbook: `docs/GOOGLE_AUTH_SETUP.md`; the demo accounts remain for QA.
- **Well-known app associations:** valid empty `assetlinks.json` + `apple-app-site-association` with forced `application/json` headers (fixes the HTML-behind-200 responses).
- **Operator documentation:** `.env.example` documenting every `NEXT_PUBLIC_*` var, and the designed site guide `docs/pdf/keja-site-guide.pdf` (HTML source: `scripts/keja-docs/doc6_site_guide.html`) — access map, demo credentials, admin console, Android/iOS PWA install, ops pipeline, credential custody and rotation checklist.

## 4.6 Phase-3 additions (the intelligence layer + Google activation)

- **Intelligence gateway (audit ch.9–11):** every Ask Keja turn now flows through one governed pipeline — `src/lib/ai/gateway.ts`: CLASSIFY (versioned 11-category escalation catalogue with factual-exception guards, `src/lib/ai/policy.ts`) → REDACT (at the provider *egress* seam only — the on-device engine and local corpus never leave the device, so budget figures keep parsing) → RETRIEVE (authorization-first, freshness-gated BM25-lite over the approved public corpus — `corpus.ts` + `retrieval.ts`, every property entry cross-referenced to a real inventory id) → GENERATE (local deterministic provider by default; the DeepSeek tier is import-guarded and armed server-side only) → REVIEW (prohibited-advice language + citation requirement) → AUDIT (`ai.answer.generated.v1` / `ai.answer.escalated.v1` governed events). The chat now renders **source chips** — corpus citations with as-of dates under every grounded answer.
- **Governed events + data quality (audit ch.7–8):** `src/lib/events/` — the strict envelope + 15-event taxonomy (privacy-classed, redaction-repaired, ring-buffered) behind `emit()`, with a 10-metric registry and a data-quality report over the local buffer; `analytics.ts` is now a typed façade over the governed layer.
- **Release correctness (audit SEC-201/202/203):** `useSyncExternalStore` migration (no setState-in-effect), the unconditional single static-export contract with `verify-artifacts.mjs` gating every build, dependency tree bumped audit-clean (next 16.3.4, recharts 3.10.1, prisma 6.19.3 + overrides), and CI actions pinned to immutable SHAs.
- **Google Sign-In is ACTIVE in production:** `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set in Vercel (production/preview/development) — the real Google button renders in the Auth modal on keja.app. Admin mapping via `ADMIN_EMAILS` allowlist (see `docs/GOOGLE_AUTH_SETUP.md`); the demo/QA accounts remain.
- **Test suite:** 233 tests across 18 files — the AI gateway golden set (45 cases) now pins the escalation catalogue, redaction, retrieval, corpus integrity, gateway outcomes and post-generation review.

## 4.7 Phase-3.5 additions (Google-only accounts + Google Authenticator)

- **Demo accounts retired — Google is the only sign-in method.** The one-tap demo accounts, email/password sign-in and client-side registration are removed from the codebase (`src/lib/auth.tsx`, `AuthModal.tsx`, `AccountView.tsx`); `src/lib/password.ts` is deleted. Browsers holding legacy records are migrated on load: `@demo.keja.app` accounts and provider `email` entries are dropped (the schema now only admits `provider: 'google'`), and the retired `keja:pw` / `keja:login-fails` keys are purged. Sessions are schema-versioned with `mfaVerified` defaulting to `false`.
- **Two-factor authentication (Google Authenticator, RFC 6238):** `src/lib/totp.ts` — a dependency-free TOTP implementation (base32 RFC 4648, HMAC-SHA1 via WebCrypto, ±1-step drift, timing-safe compare, `otpauth://` Key-Uri Format builder) pinned by 22 tests against the RFC 6238 appendix-B vectors. Admins **must** enrol (first admin visit routes through the QR wizard); every account can opt in from `#/account → Preferences & security`. Enrolment mints 8 single-use `XXXXX-XXXXX` recovery codes (shown once). Every fresh session starts `mfaVerified: false`; a valid code (or recovery code) flips it. The shared challenge component (`TwoFactorChallenge.tsx`) renders the QR via a dynamic `qrcode` import so the library stays out of the main bundle. All 2FA events land in the audit trail (`auth.2fa.enrolled / verified / failed / recovery_used / disabled`).
- **Admin gate is now three walls:** Google sign-in → allowlist role → per-session 2FA. `AdminGate.tsx` renders the challenge inline; there is no demo admin account anymore.
- **Public administrator contact:** `torv54@gmail.com` — `SITE.adminEmail` (`src/config/index.ts`), shown in the footer, on the admin gate and in the Trust Center; it is also the default `NEXT_PUBLIC_ADMIN_EMAILS` allowlist when the env var is unset. A real `/.well-known/security.txt` (RFC 9116) now publishes the disclosure contacts — previously the Trust Center referenced it without the file existing.
- **Honest scope (unchanged discipline):** the 2FA secret and enrolment state are device-local in this static build — a real second factor against casual use of a borrowed session on the device, not yet a server-side policy. The same RFC 6238 module moves verbatim server-side with the Phase-2 auth service.
- **Test suite:** 241 tests across 18 files (22 new TOTP tests; 14 password-module tests retired with the module).

## 4.8 Phase-3.6 additions (login fix + registration + account-backed posting)

- **Google login fixed — the `gsi/transform` stall:** the site served `Cross-Origin-Opener-Policy: same-origin`, which severs `window.opener` inside the GIS popup so Google can never hand the credential back (the user sits on `accounts.google.com/gsi/transform` forever). `vercel.json` now sends `same-origin-allow-popups`; the CSP gains defensive gstatic/googleapis allowances. The sign-in modal shows an origin-mismatch hint (non-canonical mirrors) and a "window not completing?" troubleshooter, and the app redirects `*.keja.app` mirrors to the canonical `keja.app` so the OAuth origin is always the registered one. Runbook: `docs/GOOGLE_AUTH_SETUP.md` §Troubleshooting.
- **Registration (the account section, reworked):** first-time Google sign-ins continue to a one-screen registration — account group (renter / landlord / developer / agent / investor), phone, company (professional groups) — stamped as `accountType`/`onboardedAt` on the account (`src/lib/accountTypes.ts`, schema-extended in `boundaries.ts`). Completing it lands the member on the surface built for their group. The account page is rebuilt around it: a guest registration hero with per-group value cards, and a member view with Overview (workspace quick actions, profile editor, membership), Saved homes, Saved searches, My listings and Preferences & security tabs.
- **Account-backed property posting:** the listing wizard prefills from the signed-in account, shows a "posting as" chip, and requires sign-in on submit (guests pass through `requireAuth` → sign-in/registration → publish under the fresh account via a ref-refreshed closure). Every submission is stamped `ownerEmail`/`ownerName`; published listings appear under **My listings** in the account page, and the Developer Portal + Landlord console gained "Post a property" CTAs.
- **Test suite:** 251 tests across 19 files (10 new: the account-type catalogue, the posting-permission predicate, and listing-ownership attribution).

## 4.9 Phase-3.7 additions (full-team platform review — search, hydrated SEO, mobile)

- **Natural-language search (P1 fix):** the hero invites “2BR Kilimani under 15M”, but the results page matched the whole query as a literal substring — the product's own advertised example returned **0 results** while KJA-A0162 (2BR Kilimani, KES 10.1M, sale) sat in inventory. New `src/lib/queryParser.ts` parses free text into structured intent (bedroom counts, price ceilings with M/k/absolute units, purpose, type, known areas) + AND-token matching; wired into `PropertiesView` and into saved-search alert matching (`searchStore`) so alerts and results can never diverge. 25 tests incl. a real-inventory regression that fails if the hero example ever returns empty. Verified live: the hero query now returns the two qualifying Kilimani listings.
- **Hydrated detail SEO (P1 fix):** prerendered entity meta reverted to the generic shell after hydration — the three detail views (property, article, area guide) never called `usePageMeta`, contrary to the comment in `KejaApp.tsx`, so titles became “Keja AI” and the JSON-LD was stripped post-mount. New shared `src/lib/detailMeta.ts` is the single derivation used by **both** the live views and `scripts/prerender.ts` — static HTML and hydrated DOM cannot drift. Verified live: hydrated title reads “Elegant 2-Bedroom Residence in Kilimani — Kilimani, Nairobi · Keja AI” and the RealEstateListing JSON-LD persists.
- **Mobile overflow (P1 fix):** 67px horizontal overflow at 390px on `/properties` (the header actions row couldn't wrap); fixed with flex-wrap + a flexible sort width. All 27 routes re-scanned at 390px: zero overflow.
- **Earlier in the session:** the Phase-4 performance-library push (from the Vibe Nuage agent) had failed three consecutive deploys at Typecheck; commit a8edc4f repaired it (invalid csstype casts, chicken-and-egg image loading, fake WebP detection, invalid `<picture>` markup) and added `tests/performance.test.ts` (20 tests). `docs/IMPLEMENTATION_LOG.md` carries the honest remediation record (IMP-005).
- **Gates:** 302 tests across 22 files · typecheck clean · lint clean · artifact verification PASSED · dependency audit triaged (14 advisories, all dev-tool chains, none in the shipped bundle) · secret scan clean (tree + history). Full findings, fixes and roadmap: `docs/pdf/keja-platform-review.pdf` (Edition 1).

## 4.10 Phase-3.8 additions (wave 8 — crawler & share correctness)

- **Malformed URL class eliminated:** the hydrated canonical, og:url and breadcrumb JSON-LD read `https://keja.appproperties/…` (SITE_URL glued to the path — the same missing-slash bug previously fixed for og:image, surviving in the two remaining concatenations in `src/lib/seo.ts`). New `absoluteUrl()` builds the trailing-slash canonical form; canonical, og:url and every `breadcrumbJsonLd` item route through it. Verified in-browser on the hydrated listing DOM; regression-pinned in `tests/seo.test.ts`.
- **Every sitemap'd section is now a real page:** a shared section catalogue (`src/lib/sectionMeta.ts`) is the single source for the SPA's `RouteMeta`, the prerender pipeline (16 new prerendered section pages — 110 static pages total, up from 95) and the sitemap generator (which now runs under Bun to import the TS catalogue). Previously 16 of the 17 sitemap'd static URLs served the generic home shell.
- **Real 404s — all rewrites removed:** the `vercel.json` catch-all rewrite (which answered *every* unknown path with HTTP 200 + the home shell) is gone. The 8 app-workspace sections (`finance`, `data`, `transact`, `manage`, `tenant`, `institutional`, `deal-analyst`, `portfolio`) are prerendered as noindexed shells so their legacy path URLs still boot the SPA (a first attempt used a regex rewrite source; the deploy smoke test caught it dead — `/finance` 404'd — so real files replaced rewrites entirely). Unknown paths fall through to `out/404.html`, which the prerender pass re-titles ("Page not found · Keja AI", `noindex` with the conflicting googlebot meta stripped, and a back-to-home link). The deploy smoke test pins the contract: unknown → 404, `/tokenize/` → 200 with its own title, `/finance/` → 200 + noindexed.
- **Gates:** 323 tests across 23 files (21 new: canonical/breadcrumb URL forms, section-catalogue and app-shell parity, no-routing-config contract) · typecheck + lint clean · artifact verification green incl. the new "all 16 catalogue sections prerendered" assertion.

### 4.11 Wave-10 additions (second-factor hardening + data boundaries)

- **Recovery codes are hashed at rest.** The 8 single-use `XXXXX-XXXXX` codes shown once at enrolment are now stored only as SHA-256 hashes (`hashRecoveryCode` in `src/lib/totp.ts`); verification compares by hash, and enrolments written before the change are migrated in place on load — the paper copies keep working. The documented "single-use, hashed" contract is finally true of the storage.
- **2FA brute-force throttle.** `src/lib/twoFactorGuard.ts` (pure, clock-injected, server-portable) escalates consecutive failed verifications into timed lockouts — 5 failures → 30 s, 10 → 5 min, 20 → 15 min — persisted per account, audit-logged as `auth.2fa.lockout`, reset by any successful verification. The lock applies to code, recovery-code and disable-2FA paths; a correct code is rejected while locked.
- **The listing publish boundary.** `listingFormSchema` (zod, `boundaries.ts`) stands between the wizard and the marketplace merge: empty titles, NaN/0/negative prices, absurd sizes, empty purposes and uncapped text are refused with per-field inline errors (aria-wired) instead of entering inventory, home stats and the AI corpus.
- **Validated reads for every-visitor stores.** `useValidatedStore` (`store.ts`) puts zod schemas at the localStorage read seam for favorites, compare, chat-history, saved-searches, notifications and user-listings — invalid roots fall back, junk array elements drop element-wise, repairs persist, function-updaters seed from the validated value. The stale `ChatMessage.meta: string[]` was corrected to the real gateway shape (meta/sources/action).
- **Gates:** 378 tests across 29 files (52 new: throttle policy + format/lockout integration, recovery hashing + migration, the listing gate, store corruption resilience + schema round-trips) · typecheck + lint clean · artifact verification green (118 pages).

## 5. Architecture — current state

- **Shape:** Next.js 16 App Router mounting a single-route client SPA (`/` + hash deep links) — one codebase serves the Vercel CDN and the Capacitor shells, works offline via the service worker. React 19, TypeScript strict, Tailwind 4, Radix/shadcn primitives (trimmed to what is used), recharts, Leaflet.
- **Persistence (local mode — today):** nine domain stores over localStorage with zod boundary validation; cross-tab sync; seeded defaults. The claims register calls this exactly what it is (`docs/claims` → "simulated" claims disclose their basis).
- **Persistence (remote mode — dormant, config-only):** the API seam + store twins above; the Prisma schema is the server contract, ready for the first real route handler.
- **Data:** 27 authored properties + ~60 live Auto-Pilot listings (6-hour cron with quality gates: dedupe, price-band screens, evidence-model enrichment — never invents trust facts); 24-claim register; area gazetteer; article/area-guide content.
- **Auto-Pilot:** `scripts/auto-listings/` (scanner → feeds → enrich → quality → publish) runs on GitHub Actions, commits listing data, and its output is now **boundary-validated at runtime and data-integrity-tested in CI**.

## 6. CI/CD

| Workflow | Trigger | What it does |
| --- | --- | --- |
| `pr-check.yml` | PRs + non-main pushes | bun frozen install → typecheck → lint → **unit tests** → static build |
| `deploy-vercel.yml` | push to `main` | same gates → `vercel build --prod` → prebuilt deploy → smoke-test the production alias |
| `auto-listings.yml` | 6-hour cron | ingest → quality gates → commit (triggers deploy) |
| `production-check.yml` | hourly | live smoke test: `/`, `sw.js` headers, manifest, security headers |

## 7. Honest limitations (unchanged from the audit, by design)

- Auth/RBAC is **Google-gated and 2FA-gated but still client-side** — Google verifies identity, the TOTP module verifies the device-bound second factor, and both move server-side with the Phase-2 auth service (that is the roadmap's first backend milestone).
- No real payments, escrow, or M-Pesa integration; tokenization is a labelled simulation (CMA sandbox track lives in `docs/cma/`).
- Verification checks are simulated evidence on seeded data; Ardhisasa integration is partner-dependent.
- Analytics is a local ring buffer; the remote mirror activates only when `NEXT_PUBLIC_ANALYTICS_ENDPOINT` is set.
- The API seam is deployed but dormant — no server exists to answer it yet.

## 8. What's next (from the audit's 90-day plan)

1. Stand up the API service on the Prisma schema (auth first — register/login/me), swap `AuthModal` to the seam, then migrate stores to twins wave by wave (leads → viewings → applications → properties).
2. M-Pesa sandbox behind a PSP, gated on licensing as much as code.
3. Turn the hourly production check into the operational baseline; add error telemetry when the backend exists.
4. Keep the audit's honesty standard: every new capability enters the claims register with a status and evidence before it ships.

*The full findings, scoring and sequencing live in `scripts/phase2_audit/final.pdf`; the document suite (deployment runbook, Google Sign-In activation, strategy, marketing, partner proposals, operator site guide) is under `docs/`.*
