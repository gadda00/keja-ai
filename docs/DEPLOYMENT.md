# Keja AI Deployment — Vercel Runbook

> Canonical deployment: **https://keja.app** · platform: **Vercel** (project `keja-ai`,
> team `victors-projects-37d86841`) · migrated from Netlify on 10 September 2026.
> PDF companion: `docs/pdf/keja-domain-setup-guide.pdf` (Vercel edition).

## 1. Architecture at a glance

| Layer | What runs it | Notes |
|---|---|---|
| Hosting / CDN | Vercel edge network | Static export — no server functions |
| Build | Vercel Git integration (GitHub App) | Every push to `main` auto-deploys |
| Install | `bun install --frozen-lockfile` | Lockfile is `bun.lock` — never `npm ci` |
| Build command | `NEXT_STATIC=1 npx next build && node scripts/sw-version.mjs` | Emits `out/` + stamps the service-worker cache version |
| Runtime | 100% client-side SPA | Hash routing (`#/properties/KJA-001`), localStorage, offline shell |
| Routing / headers | `vercel.json` | SPA rewrite, cache policy, security headers |
| Domains | `keja.app` (primary) + `www.keja.app` (308 → apex) | DNS hosted at Spaceship |

The project deliberately uses the **static builder** (`"framework": null` in `vercel.json`)
rather than the Next.js framework preset: the app is a static export, and the static builder
gives deterministic, first-class control of `vercel.json` rewrites and headers. Project-level
settings in the Vercel dashboard mirror `vercel.json` — keep the two in sync if either changes.

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
2. GitHub Actions runs the quality gates: **PR check** workflow logic (typecheck + lint +
   static build) applies on PRs; on `main`, Vercel's Git integration builds and deploys
   and reports the result as a status check on the commit.
3. Vercel build: `bun install --frozen-lockfile` → `NEXT_STATIC=1 npx next build` →
   `node scripts/sw-version.mjs` (content-hashed SW cache version) → `out/` goes live.
4. `.github/workflows/production-check.yml` smoke-tests the live site (HTTP 200,
   manifest, `sw.js` with no-cache header, security headers) after every push and hourly.

No deployment secrets are stored in GitHub — the Vercel Git integration handles auth.
(The legacy `NETLIFY_AUTH_TOKEN` / `NETLIFY_SITE_ID` secrets were removed during the
migration.)

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

## 5. Verification checklist (already completed during migration)

- [x] Project `keja-ai` created, Git-integrated with `github.com/gadda00/keja-ai`
- [x] Production build green on Vercel (static export + SW stamp)
- [x] `keja.app` + `www.keja.app` attached; www configured as 308 redirect
- [x] Live smoke test on the production alias: 200, manifest, `sw.js` no-cache,
      security headers present
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
  (Vercel reads routing/headers from `vercel.json` at the project level — nothing needs
  to ship inside `out/`).
- Removed `.github/workflows/deploy-netlify.yml` and `.github/workflows/fix-domain.yml`
  (deployment is now Vercel's Git integration; the domain-fix tooling is moot).
- Removed `scripts/netlify-domain-fix.mjs`.
- Added `.github/workflows/production-check.yml` (live smoke test).
- `docs/DOMAIN_CONFLICT_FIX.md` marked superseded; this runbook replaces it.

What was **not** deleted: the other Netlify sites on the account (`chacadom`,
`ecoawardsafrica`, `busara-ai`) are unrelated projects and were left untouched.
