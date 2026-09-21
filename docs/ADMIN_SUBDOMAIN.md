# Admin subdomain runbook — admin.keja.app

**Wave 19 (2026-09-19).** The admin console moved to its own territory:
`admin.keja.app` serves the same static build, but the app shell detects
the hostname and swaps the entire experience — no public navbar, footer,
marketing floats or install prompts; a minimal `AdminShell` (wordmark,
territory label, administrator chip, "Back to site", sign out) around the
2FA-gated console. Every route on that host is `#/admin`: stray hashes
snap back, the console is the whole site, and the pages are noindexed.

This file is the operational checklist for making the territory live in
production. **The code is done and shipped — only hosting/OAuth steps
remain.**

---

## Wave 21 — the door now probes before it swings (resilience)

**What was wrong:** until Step 1 below is done, `admin.keja.app` does not
resolve (NXDOMAIN) — but the main site blindly redirected every `#/admin`
visit (and the `/admin` path via a Vercel edge redirect) straight onto the
missing subdomain. Admins landed on the browser's DNS error page instead
of the console.

**What changed (shipped):**

- `keja.app/#/admin` now **probes the territory first** — a `no-cors`
  fetch to `https://admin.keja.app/favicon.ico` with a 1.75 s ceiling,
  cached per browser tab for 10 minutes (`src/lib/adminHost.ts`,
  `probeAdminReachability`). NXDOMAIN rejects in milliseconds.
- **Territory reachable →** nothing changes: the 90-second session
  envelope crosses as designed (a brief "Connecting to the admin
  console…" splash covers the handoff).
- **Territory unreachable →** the console **runs inline on the main
  site** — the same gated console (`AdminGate`: Google sign-in, admin
  role, TOTP 2FA) that dev and preview deployments have always used —
  plus a dismissible amber note explaining the subdomain isn't attached
  yet. The CSP (`vercel.json`) now allows the probe
  (`connect-src … https://admin.keja.app`).
- The `/admin` **path-level edge redirect** no longer points at the
  subdomain (it can't probe): it lands on the SPA shell (`/#/admin`),
  where the same probe decides. Wiring the subdomain later changes
  nothing in the code — the handoff takes over the moment DNS answers.

**Net effect:** the console is usable on keja.app *today*, and upgrades
itself to the dedicated subdomain the moment Step 1 + Step 2 are
completed — no deploy, no code change.

---

## What already works (no action needed)

- **Host detection** — `src/lib/adminHost.ts` recognises `admin.keja.app`
  (env-overridable: `NEXT_PUBLIC_ADMIN_HOST`) and any `admin.*` host, so
  `admin.localhost` works in dev.
- **Territory routing** — `KejaApp` renders `AdminShell` on the admin
  host and forces `#/admin`; the public marketplace never renders there.
  The canonical-origin redirect that squashes `.keja.app` mirrors to the
  apex explicitly exempts the admin host (without that exemption every
  admin-host visit would bounce straight back to keja.app).
- **The door on the main site** — `keja.app/#/admin` hands off to
  `admin.keja.app` (production hosts only; localhost and preview
  deployments keep the local console so test flows never depend on DNS).
  A path-level `/admin` also redirects at the edge (`vercel.json`).
- **Session handoff** — localStorage is per-origin, so sessions on
  keja.app are invisible on admin.keja.app. When an admin crosses, the
  redirect carries a one-time envelope (`?handoff=…`, 90-second TTL,
  base64url, admin-only, 2FA-verified-sessions-only) that is validated
  against the account + session schemas on arrival, installed, stripped
  from the address bar, and the page reloads booted into the console.
  Tampered or expired envelopes fall to the sign-in wall. This is the
  same trust level as the existing localStorage sessions (static build,
  no server-side authority — see the AdminGate scope note).
- **Direct sign-in on the territory** — the sign-in wall works on
  admin.keja.app and renders the Google button once the OAuth client
  lists the origin (step 2 below).

## Step 1 — attach the domain (Vercel)

The build is a static export; the same deployment serves every domain
attached to the project.

1. Vercel → the keja-ai project → **Settings → Domains**.
2. Add `admin.keja.app`.
3. Vercel shows the DNS record to create — a `CNAME` to
   `cname.vercel-dns.com` (or the A record `76.76.21.21` if the DNS
   provider rejects apex/subdomain CNAME flattening) in the keja.app DNS
   zone (wherever keja.app's records live).
4. Wait for the certificate to provision (minutes).

Verify: `https://admin.keja.app` shows the "Keja Admin" bar with the
`admin.keja.app` territory label and the sign-in wall.

## Step 2 — Google OAuth origin

The OAuth client is registered for `https://keja.app`. Add the territory:

1. Google Cloud Console → APIs & Services → Credentials → the OAuth
   client used by `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
2. **Authorised JavaScript origins** → add `https://admin.keja.app`.
3. Save (propagation is usually minutes).

See `docs/GOOGLE_AUTH_SETUP.md` for the full auth runbook. Until this
step is done, the Google button on the territory may render without
completing — the modal surfaces a note explaining exactly this, and
admins can always cross from keja.app, where the session hands over
automatically.

## Step 3 — smoke the crossing (2 minutes)

1. Sign in on `https://keja.app` (admin account, 2FA verified).
2. Click the shield in the navbar (or visit `keja.app/#/admin`).
3. Expect a redirect to `https://admin.keja.app/#/admin`, address bar
   clean (no `?handoff=` left behind), console booted with the admin
   email chip in the top bar.
4. Click "Back to site" → keja.app.
5. Tamper check: reload `admin.keja.app/?handoff=garbage#/admin` — the
   envelope is dropped, the sign-in wall shows.

## Notes

- **Why `?handoff=` lives in the search string, not the hash:** the
  router owns the hash; the envelope is consumed exactly once on boot
  and removed with `history.replaceState` before the reload — it never
  lands in shared history or logs of subsequent navigation.
- **Preview deployments:** the door and the handoff only fire on the
  production hosts (`keja.app`, `www.keja.app`). Previews keep the local
  console at `#/admin` — CI and dev never depend on DNS or the attached
  domain. To exercise the territory on a preview host, set
  `NEXT_PUBLIC_ADMIN_HOST` to the preview hostname.
- **Budget note (§8.5):** the territory machinery cost +15 kB on the
  first-paint critical JS (993 kB of the 1,000 kB ratchet). One earlier
  draft cost +39 kB — a `Buffer.from` fallback in the base64 codec made
  webpack ship a ~24 kB buffer polyfill for a branch that can never run
  in a browser. The codec is now pure `btoa/atob + TextEncoder/TextDecoder`
  (works in Node tests too). Lesson recorded for every future client
  lib: no Node builtins, not even in "dead" fallbacks.
