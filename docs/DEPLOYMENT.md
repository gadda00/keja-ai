# Keja AI Deployment — Vercel Runbook

> Canonical deployment: **https://keja.app** · platform: **Vercel** (project `keja-ai`,
> team `victors-projects-37d86841`) · migrated from Netlify on 10 September 2026.
> PDF companion: `docs/pdf/keja-domain-setup-guide.pdf` (Vercel edition).

## 1. Architecture at a glance

| Layer | What runs it | Notes |
|---|---|---|
| Hosting / CDN | Vercel edge network | Static export — no server functions |
| Build & deploy | GitHub Actions → `vercel` CLI prebuilt deploys | `.github/workflows/deploy-vercel.yml` on every push to `main` |
| Production URLs | **`keja-ai-rho.vercel.app`** (public) · `keja-ai-victors-projects-37d86841.vercel.app` (team alias — behind Vercel Authentication on Hobby) | keja.app attaches via DNS (§4) |
| Install | `bun install --frozen-lockfile` | Lockfile is `bun.lock` — never `npm ci` |
| Build command | `NEXT_STATIC=1 npx next build && node scripts/sw-version.mjs` | Emits `out/` + stamps the service-worker cache version |
| Runtime | 100% client-side SPA | Hash routing (`#/properties/KJA-001`), localStorage, offline shell |
| Routing / headers | `vercel.json` | SPA rewrite, cache policy, security headers |
| Domains | `keja.app` (primary) + `www.keja.app` (308 → apex) | DNS hosted at Spaceship |

The project deliberately uses the **static builder** (`"framework": null` in `vercel.json`)
rather than the Next.js framework preset: the app is a static export, and the static builder
gives deterministic, first-class control of `vercel.json` rewrites and headers. Project-level
settings in the Vercel dashboard mirror `vercel.json` — keep the two in sync if either changes.

**Why CLI deploys, not the Vercel Git integration:** the Vercel account
(`victors-projects-37d86841`) has no GitHub account connected — the GitHub link lives on a
second Vercel login (the same identity that holds the `keja-ai.vercel.app` alias and held
the Netlify keja.app claim). The GitHub Actions workflow therefore builds the static export
and ships it with `vercel pull → build --prod → deploy --prebuilt --prod`, authenticated by
the `VERCEL_TOKEN` repo secret. `vercel build` compiles `vercel.json` (rewrites + headers)
into `.vercel/output/config.json`, so the deployed routing is exactly what the repo declares.
If the GitHub App is ever connected to this Vercel account, the workflow can be dropped in
favour of automatic Git deploys.

## 2. vercel.json — what each block does

- **`rewrites`** — `/(.*) → /index.html`: the SPA fallback (parity with the old Netlify
  `/* /index.html 200` rule). Vercel checks the filesystem first, so real assets
  (`/sw.js`, `/manifest.json`, `/icons/*`, hashed build files) are served directly;
  only unmatched paths fall through to the app shell. Unknown hash routes render the
  in-app 404 view.
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
2. `.github/workflows/deploy-vercel.yml` runs the quality gates (typecheck + lint), then
   `bun install --frozen-lockfile`, then the Vercel CLI prebuilt flow:
   `vercel pull` (fetch project settings) → `vercel build --prod` (runs the static build +
   SW stamp, compiles `vercel.json` routing) → `vercel deploy --prebuilt --prod`
   (uploads the bundle — unchanged files are skipped via content hashing).
3. The workflow prints the deployment URL and smoke-tests the public production alias
   (`keja-ai-rho.vercel.app`): HTTP 200, manifest, `sw.js` no-cache header, security
   headers. (Raw deployment URLs are Vercel-auth-gated on Hobby — never test those.)
4. `.github/workflows/production-check.yml` re-runs that smoke test hourly against the
   production alias.

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
