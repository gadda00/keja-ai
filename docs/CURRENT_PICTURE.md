# Keja AI — Current Picture

**Snapshot date: 11 September 2026 · repo `gadda00/keja-ai` · this document is the post-implementation state of the platform after the Phase-2 engineering engagement.**

This is the honest, complete picture after: (1) the Phase-1 build (Aug–Sep 2026), (2) the ~100-page Phase-2 technical audit (`scripts/phase2_audit/final.pdf`), and (3) the implementation of the audit's Phase-2 workstreams described below. It replaces `REPO_PICTURE.md` (the pre-audit snapshot) as the authoritative "where are we" document. `src/lib/api/storeTwin.ts` points readers here for the local/remote persistence story.

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

The audit's Ch. 22 demanded a real test suite before any LLM work. `npm test` runs **vitest, 161 tests across 16 files** (jsdom + Node webcrypto), and is now a gate in **both** `pr-check.yml` and `deploy-vercel.yml` (typecheck → lint → **test** → build).

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
| `tests/analytics.test.ts` | 11-event taxonomy enforcement, 200-entry ring buffer, corruption recovery |
| `tests/api-client.test.ts` | unconfigured-seam rejection contract, token custody |
| `tests/uuid.test.ts`, `tests/format.test.ts`, `tests/areaCoords.test.ts`, `tests/responsive-images.test.ts` | identifiers, KES formatting/trust tiers/time-ago, Kenya bounding-box gazetteer, srcset construction |

## 4. Bugs the verification caught (and fixed)

1. **`verifyPassword` double-skip destructuring (Critical):** `const [, , iterStr, saltB64, hashB64] = stored.split('$')` skipped two elements of a four-field format — the salt was read as the iteration count, `Number(salt)` = NaN, and **every k2 password verification returned false** (demo email sign-in was silently broken). Fixed in `src/lib/password.ts`; pinned by the specimen tests.
2. **Malformed `og:image` URLs:** `absoluteImage` stripped the leading slash while `SITE_URL` has no trailing slash → `https://keja.appimages/…` on every per-route share card. Fixed in `src/lib/seo.ts`; pinned by the SEO tests.
3. **Rebase hygiene:** the implementation was re-applied cleanly on top of the Auto-Pilot's 2026-09-11 ingest (newer listing data kept; image references migrated to `.webp`), with the bot's data validated end-to-end rather than trusted.

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

- Auth/RBAC is still **client-side** (demo-grade by declaration); the PBKDF2 layer is an interim fix, not server security. The Phase-2 auth service is the roadmap's first backend milestone.
- No real payments, escrow, or M-Pesa integration; tokenization is a labelled simulation (CMA sandbox track lives in `docs/cma/`).
- Verification checks are simulated evidence on seeded data; Ardhisasa integration is partner-dependent.
- Analytics is a local ring buffer; the remote mirror activates only when `NEXT_PUBLIC_ANALYTICS_ENDPOINT` is set.
- The API seam is deployed but dormant — no server exists to answer it yet.

## 8. What's next (from the audit's 90-day plan)

1. Stand up the API service on the Prisma schema (auth first — register/login/me), swap `AuthModal` to the seam, then migrate stores to twins wave by wave (leads → viewings → applications → properties).
2. M-Pesa sandbox behind a PSP, gated on licensing as much as code.
3. Turn the hourly production check into the operational baseline; add error telemetry when the backend exists.
4. Keep the audit's honesty standard: every new capability enters the claims register with a status and evidence before it ships.

*The full findings, scoring and sequencing live in `scripts/phase2_audit/final.pdf`; the document suite (deployment runbook, strategy, marketing, partner proposals) is under `docs/`.*
