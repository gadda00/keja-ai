# Keja AI Deployment — Vercel Runbook

> Canonical deployment: **https://keja.app** · platform: **Vercel** (project `keja-ai`,
> team `victors-projects-37d86841`) · migrated from Netlify on 10 September 2026.
> PDF companion: `docs/pdf/keja-domain-setup-guide.pdf` (Vercel edition).

## 1. Architecture at a glance

| Layer | What runs it | Notes |
|---|---|---|
| Hosting / CDN | Vercel edge network | Static export — no server functions |
| Build & deploy — **primary** | **Vercel Git integration** (`vercel[bot]`) | Builds & promotes every push to main within ~1 min — including the Auto-Pilot's GITHUB_TOKEN pushes (which can never trigger workflows). Verified live 2026-09-12 (see below) |
| Build & deploy — **fallback** | GitHub Actions → `vercel` CLI prebuilt deploys | `.github/workflows/deploy-vercel.yml` — gates + smoke for human pushes; skips its own deploy when the integration already shipped the SHA (deploy-guard), falls back to the CLI when it did not |
| Production URLs | **`keja-ai-rho.vercel.app`** (public) · **`keja.app`** (canonical — required in the hourly check) | keja.app attaches via DNS (§4) |
| Install | `bun install --frozen-lockfile` | Lockfile is `bun.lock` — never `npm ci` |
| Build command | `npx next build --webpack && node scripts/inject-preloads.mjs && bun scripts/generate-sitemap.mjs && bun scripts/prerender.ts && node scripts/sw-version.mjs && node scripts/verify-artifacts.mjs` | Emits `out/` + boot preloads + sitemap/prerender + SW stamp + artifact verification (same command on both deploy paths) |
| Runtime | 100% client-side SPA | Hash routing (`#/properties/KJA-001`), localStorage, offline shell |
| Routing / headers | `vercel.json` | Cache policy, security headers (rewrites removed 2026-09-12 — filesystem wins) |
| Domains | `keja.app` (primary) + `www.keja.app` (308 → apex) | DNS hosted at Spaceship |

The project deliberately uses the **static builder** (`"framework": null` in `vercel.json`)
rather than the Next.js framework preset: the app is a static export, and the static builder
gives deterministic, first-class control of `vercel.json` rewrites and headers. Project-level
settings in the Vercel dashboard mirror `vercel.json` — keep the two in sync if either changes.

**Two deploy paths, verified 2026-09-12 (was previously believed to be one):**
the Vercel **Git integration is connected** to this repo and deploys every
push to `main` — the historical comment below was wrong by then, and every
PAT push was double-deploying (integration + CLI). Evidence: commit
`1e4f473` (Auto-Pilot, GITHUB_TOKEN, 00:11 UTC) has **zero** workflow runs —
GitHub's recursion-prevention rule — yet `vercel[bot]` deployed it 37 s
later and its listings went live on keja.app. The workflow now checks the
GitHub deployments API (`scripts/deploy-guard.mjs`) before deploying:

- **integration deployed this SHA** → the CLI deploy is skipped (gates +
  smoke still run — the integration has neither);
- **integration failed or is absent** → the CLI prebuilt flow runs as before
  (`vercel pull → build --prod → deploy --prebuilt --prod`, authenticated by
  the `VERCEL_TOKEN` repo secret), keeping the deploy pipeline alive even
  if the integration is ever disconnected;
- API trouble fails **open** (duplicate deploy), never closed.

`vercel build` compiles `vercel.json` (headers + routing) into
`.vercel/output/config.json`, so the deployed routing is exactly what the
repo declares. If the Git integration is ever *disconnected*, the workflow
quietly becomes the only deploy path again — for the Auto-Pilot that would
be a gap (its GITHUB_TOKEN pushes cannot trigger workflows), covered by the
hourly production check's freshness assertion (see §3).

## 2. vercel.json — what each block does

- **`rewrites`** — **empty since 2026-09-12** (wave 8). The old catch-all
  `/(.*) → /index.html` rewrite answered every unknown path with HTTP 200 +
  the home shell (soft-404s across an infinite URL space). Now the 8
  app-workspace sections are prerendered as noindexed shells, every public
  route is a real file, and unknown paths fall through to `out/404.html` —
  a real 404. Vercel serves the filesystem first, so assets
  (`/sw.js`, `/manifest.webmanifest`, `/icons/*`, hashed build files) are
  unaffected.
- **`headers`** — mirrors the old `public/_headers` exactly, plus HSTS:
  - `/sw.js` → `Cache-Control: public, max-age=0, must-revalidate` (the service worker
    must never be edge-cached, or updates take up to a day to reach installed clients);
  - `/icons/*`, `/images/*`, `/splash/*`, `/screenshots/*` → 1-week cache;
  - everything → `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
    `Referrer-Policy: strict-origin-when-cross-origin`,
    `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`,
    `Strict-Transport-Security: max-age=31536000; includeSubDomains` (new in the Vercel
    migration — `.app` is an HSTS-preloaded TLD, so HTTPS-only is enforced by browsers
    anyway; the header makes it explicit for non-browser clients).

## 3. Deploy pipeline

1. Push to `main` (human or Auto-Pilot cron commit).
2. The **Vercel Git integration** starts building at once (~1 min start,
   ~4 min total) and promotes a production deployment on success. Its
   `buildCommand` (from `vercel.json`) runs the full gate chain — sitemap,
   prerender, preload injection, SW stamp, `verify-artifacts.mjs` — so a
   failed gate fails the deployment and the alias stays on the last good
   build.
3. `deploy-vercel.yml` (PAT pushes only — GITHUB_TOKEN pushes cannot trigger
   it) runs the source gates (typecheck → lint → **unit tests**), then the
   deploy guard: skip its CLI deploy if the integration already shipped the
   SHA; otherwise `vercel pull` (fetch project settings) → `vercel build
   --prod` (runs the static build + SW stamp, compiles `vercel.json`
   routing) → `vercel deploy --prebuilt --prod` (uploads the bundle —
   unchanged files are skipped via content hashing).
4. The workflow then smoke-tests **both** public surfaces — the production
   alias (full routing contract: real 404s, prerendered sections, noindexed
   app shells) and the canonical `keja.app` (availability, PWA, headers,
   real 404s). Raw deployment URLs are Vercel-auth-gated on Hobby — never
   test those.
5. For Auto-Pilot pushes: `auto-listings.yml`'s **verify** job runs the full
   gate suite against the committed data (unit tests — including the
   data-integrity checks over every bot listing — plus the complete build).
   If it fails, the guarded **revert-if-broken** job undoes the ingest commit
   (only if it is still HEAD), which the integration redeploys — production
   self-heals to the last good state within minutes.
6. `production-check.yml` re-runs the smoke hourly against **both** URLs
   (both required), and — on the canonical domain — asserts **freshness**:
   the newest committed listing must be live, so a stale production (failed
   deployment, lost push) goes red within the hour instead of serving an
   old build forever.

One repo secret is required: `VERCEL_TOKEN` (a Vercel personal access token with deploy
scope). The legacy `NETLIFY_AUTH_TOKEN` / `NETLIFY_SITE_ID` secrets were removed during the
migration.

## 4. keja.app DNS — the one manual step (Spaceship)

DNS for keja.app lives at the registrar, **Spaceship** (nameservers
`launch1.spaceship.net` / `launch2.spaceship.net`). Vercel does not host DNS, so the
records are edited in the Spaceship dashboard → keja.app → DNS:

| Type | Host | Value | Replaces |
|---|---|---|---|
| `A` | `@` | `76.76.21.21` | old `75.2.60.5` (Netlify load balancer) |
| `CNAME` | `www` | `cname.vercel-dns.com` | old `keja-ai.netlify.app` |

Both domains (`keja.app` primary, `www.keja.app` → 308 redirect to the apex) are already
attached to the Vercel project, so the moment the two records above are saved, Vercel
serves keja.app with automatic Let's Encrypt certificates. Propagation is typically
minutes (TTL-permitting). Verify:

```bash
dig +short keja.app A            # expect: 76.76.21.21
dig +short www.keja.app CNAME    # expect: cname.vercel-dns.com
curl -I https://keja.app         # expect: HTTP 2xx + x-vercel-id header (served by Vercel)
curl -I https://www.keja.app     # expect: 308 → https://keja.app
```

## 5. Verification checklist (state at migration, 10 Sep 2026)

- [x] Project `keja-ai` created on Vercel (static builder, bun install, SW-stamped build)
- [x] First production deployment READY + PROMOTED via CLI prebuilt flow
- [x] Live smoke test on `keja-ai-rho.vercel.app`: 200, manifest, `sw.js` no-cache,
      security headers, SPA rewrite — all green
- [x] `keja.app` + `www.keja.app` attached; www configured as 308 redirect
- [x] `deploy-vercel.yml` + `production-check.yml` workflows in place
- [x] Netlify `keja-ai` site deleted; Netlify repo secrets removed
- [ ] **DNS records switched at Spaceship** (§4 — the only remaining step)
- [ ] Post-switch check: `curl -I https://keja.app` serves from Vercel

## 6. Rollback

Vercel keeps every production deployment (10 recent + instant rollback target). From the
dashboard → `keja-ai` → Deployments → any previous green build → **Promote to Production**.
DNS-level rollback is not needed — the domain stays attached to the project.

## 7. Netlify → Vercel migration notes (10 September 2026)

Why the move: two Netlify-side blockers — the keja.app apex was claimed by a second
Netlify login (see `docs/DOMAIN_CONFLICT_FIX.md` for the forensics), and the account was
hit by Netlify's stuck operational-credits flag (Jul–Sep 2026 platform bug) that paused
production deploys. Vercel needs neither the claim released nor a support ticket: the
domain simply points at Vercel's edge via DNS.

What changed in the repo:

- Added `vercel.json`; removed `netlify.toml`, `public/_redirects`, `public/_headers`
  (Vercel reads routing/headers from `vercel.json`, compiled at `vercel build` time —
  nothing needs to ship inside `out/`).
- Replaced `.github/workflows/deploy-netlify.yml` with `deploy-vercel.yml` (same gate →
  build → deploy → verify shape, shipping prebuilt output instead of a Netlify zip).
- Removed `.github/workflows/fix-domain.yml` and `scripts/netlify-domain-fix.mjs`
  (domain lifecycle is now two DNS records at Spaceship — §4).
- Added `.github/workflows/production-check.yml` (hourly live smoke test).
- `docs/DOMAIN_CONFLICT_FIX.md` marked superseded; this runbook replaces it.

**Known quirk:** the bare `keja-ai.vercel.app` alias is owned by a *different* Vercel
account (the same second login that held the Netlify keja.app claim and that carries the
GitHub connection). It serves an unrelated/older deployment and is not used by this
project — the public production URL is **`keja-ai-rho.vercel.app`** (the project's assigned
production domain), and the canonical domain is keja.app. The `{project}-{team}.vercel.app`
team alias and all raw deployment URLs sit behind Vercel Authentication (standard Hobby
behaviour); use `keja-ai-rho.vercel.app` or keja.app for public access.

What was **not** deleted: the other Netlify sites on the account (`chacadom`,
`ecoawardsafrica`, `busara-ai`) are unrelated projects and were left untouched.
