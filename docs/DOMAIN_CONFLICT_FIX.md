# Resolving the keja.app Netlify Domain Conflict

> PDF edition: `docs/pdf/keja-domain-conflict-fix.pdf`. Companion: `docs/pdf/keja-domain-setup-guide.pdf` (general setup). State re-verified 10 September 2026 with API-level forensics — see the diagnosis below.

## 1. What the Error Actually Means — and the Confirmed Diagnosis

Netlify verification fails with:

> "keja.app or one of its subdomains is already managed by Netlify DNS on another team."

Netlify enforces a **one-owner rule**: an apex domain can be claimed by only one Netlify account at a time. The claim is an internal Netlify record — usually left behind when the domain was once added to a site in another account, or given a Netlify DNS zone that was later abandoned. **The claim does not need active nameservers to keep blocking you.**

### What the API forensics found (10 Sep 2026)

A full API sweep (every team, site, site field, DNS zone and audit entry reachable by the deploy token `torv54@gmail.com`, team "Victor"/`gadda00`, account `68331ef7ea60d8e7aedec052`) confirmed:

| Check | Result |
|---|---|
| Sites visible to the token | 4: keja-ai, chacadom, ecoawardsafrica, busara-ai |
| keja.app on any site (`custom_domain`, `domain_aliases`, branch/preview fields) | **None** — chacadom only holds `chacadom.com`; busara-ai only `busaraai.com` |
| Netlify DNS zones in this account | Only `busaraai.com` — no keja.app zone |
| Attaching keja.app via `PATCH /sites/{id}` | `422 — "is owned by another account", "must be unique (keja.app, fb3b99bc-55cd-4552-a3a4-4b378448aa47)"` |

**Conclusion:** keja.app is claimed by Netlify account **`fb3b99bc-55cd-4552-a3a4-4b378448aa47`** — a *different Netlify login* from the one that owns the keja-ai site. This is almost certainly a second account of yours: GitHub-OAuth, Google and email/password sign-ins each create **separate Netlify accounts even for the same email address**. The domain (registered 8 Sep 2026 at Spaceship, NS `launch1/launch2.spaceship.net`, A → `75.2.60.5`, www CNAME → `keja-ai.netlify.app`) is otherwise fully configured — DNS is ready; only the Netlify-side claim needs releasing.

## 2. Path A — Release It Yourself (~5 minutes, recommended)

1. **Find the other login.** At app.netlify.com log out, then try each identity you own: *Continue with GitHub*, *Continue with Google*, and any other email/password. In each, check Teams — you are looking for the account whose team is **not** "Victor". (Team settings → General shows the account ID; the claiming one ends in `…8448aa47`.)
2. **Check that account's DNS zones.** In the claiming account: team → **Domains** (app.netlify.com/dns or Teams → *your team* → DNS). If `keja.app` is listed, open it → Options → **Delete DNS zone**. The zone is dormant (live NS are Spaceship's), so deleting it breaks nothing.
3. **Check that account's sites too.** If any site there lists `keja.app` or `www.keja.app` in Domain management → Domains → Options → **Remove domain**.
4. **Re-run the fix workflow.** Repo → Actions → **Fix keja.app domain (Netlify)** → Run workflow → mode `fix`. It attaches `keja.app` (primary) + `www.keja.app`, provisions the Let's Encrypt certificate, enables Force HTTPS and polls until https://keja.app answers 200. (Steps 1–2 there are the same removals, automated — it can also be run with a token from the claiming account: set a `NETLIFY_CLAIM_TOKEN` secret, run with `use_claim_token` + `release_only`, then re-run normally.)

If you cannot find the other login (or it turns out not to be yours), continue to Path B.

## 3. Path B — Netlify Support Releases It (a few business days)

1. **Open a support ticket.** app.netlify.com/support → contact form. Subject: *"Domain claimed by another account — release request for keja.app"*. Include the claiming account id `fb3b99bc-55cd-4552-a3a4-4b378448aa47` — it lets support locate the stale claim instantly.
2. **Prove registrar ownership.** Spaceship dashboard screenshot showing keja.app in your account, purchase date (8 Sep 2026), and WHOIS/RDAP registrant info.
3. **Demonstrate live DNS control.** Offer to add any TXT record Netlify specifies at Spaceship on request — conclusive ownership evidence that typically shortens the process.
4. **Ask for the release explicitly.** Netlify contacts the claiming account, then releases the claim if there is no justification.

While waiting, nothing is blocked: the site serves on keja-ai.netlify.app, deploys run green, and DNS already targets Netlify.

## 4. Attaching keja.app After the Release

Prefer the automated route — Actions → **Fix keja.app domain (Netlify)** → mode `fix` — or do it manually:

1. **Add the apex.** keja-ai site → Site configuration → Domain management → Add a domain → `keja.app` → make primary.
2. **Add www.** Add `www.keja.app`; set it to redirect to the apex.
3. **Confirm DNS at Spaceship.** Keep apex A → `75.2.60.5`; set www CNAME → `keja-ai.netlify.app`. Green checks within minutes (A) / up to an hour (CNAME).
4. **HTTPS.** Let's Encrypt provisions automatically once verified. Enable Force HTTPS.

```bash
# Verification (any terminal)
dig NS keja.app +short          # launch1/launch2.spaceship.net
dig A keja.app +short           # 75.2.60.5
dig CNAME www.keja.app +short   # keja-ai.netlify.app
curl -I https://keja.app        # HTTP/2 200 + netlify edge headers
```

Staying on Spaceship nameservers is fully supported and keeps registrar independence. Netlify's "use Netlify DNS" recommendation is optional — change nothing unless you have a reason.

## 5. Post-Launch Verification Checklist

| # | Check | Expected |
|---|---|---|
| 1 | `curl -I https://keja.app` | HTTP/2 200 + Netlify edge headers |
| 2 | `curl -I https://www.keja.app` | 301 → https://keja.app |
| 3 | `https://keja.app/manifest.webmanifest` | Serves JSON; PWA installs from canonical domain |
| 4 | `https://keja.app/sw.js` | Content-hashed VERSION; `Cache-Control: must-revalidate` |
| 5 | Security headers | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` |
| 6 | Android (Chrome) install | beforeinstallprompt fires; full-screen install with maskable icon |
| 7 | iPhone (Safari) install | Share → Add to Home Screen; branded launch screen |
| 8 | Offline after first load | App shell and visited views still open in airplane mode |

If items 1-2 fail: DNS propagation — re-run dig after 30 minutes. Item 4/8 on a previously-visited device: hard refresh + one re-open (cache version is content-hashed and self-evicts). Everything else already passed the same checks on keja-ai.netlify.app during the September 2026 verification pass.

## 6. Tooling Reference

| Artifact | Purpose |
|---|---|
| `scripts/netlify-domain-fix.mjs` | Zero-dep Node script: `MODE=discover` (read-only inventory), `MODE=fix` (release → attach → SSL → verify), `MODE=probe` (raw endpoint diagnostics), `RELEASE_ONLY=1` (release without attaching, for the claiming account's token) |
| `.github/workflows/fix-domain.yml` | Manual runner with the above modes; uses `NETLIFY_AUTH_TOKEN` / `NETLIFY_SITE_ID`, optional `NETLIFY_CLAIM_TOKEN` for cross-account release |
