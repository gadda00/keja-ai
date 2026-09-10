# Resolving the keja.app Netlify Domain Conflict

> PDF edition: `docs/pdf/keja-domain-conflict-fix.pdf`. Companion: `docs/pdf/keja-domain-setup-guide.pdf` (general setup). State verified 10 September 2026.

## 1. What the Error Actually Means

Netlify verification fails with:

> "keja.app or one of its subdomains is already managed by Netlify DNS on another team."

Netlify enforces a **one-zone rule**: an apex domain can exist as a managed domain/DNS zone in only one team at a time. The claim is an internal Netlify record — usually left behind when the domain was once added to a site in another team, registered through Netlify under another account, or given a Netlify DNS zone that was later abandoned. **The claim does not need active nameservers to keep blocking you.**

Verified current state:

| Record | Current value | Meaning |
|---|---|---|
| NS | launch1/launch2.spaceship.net | Registrar is Spaceship; DNS is NOT on Netlify |
| A @ | 75.2.60.5 | Already pointed at Netlify's load balancer |
| Site | keja-ai.netlify.app | Live, deploying green from main |
| Blocker | Netlify team claim on keja.app | Internal Netlify record, another team |

DNS is already correctly configured. The only blocker is the stale team claim inside Netlify — an administrative fix with two resolution paths.

## 2. Path A — You Control the Other Team (~10 minutes)

1. **Find the team.** Check the team switcher at app.netlify.com; check other email accounts you may have used.
2. **Remove the domain from any site.** Old team → site → Site configuration → Domain management → Domains → keja.app → Options → Remove domain. Same for www if listed.
3. **Delete the DNS zone.** Old team → team-level Domains → keja.app → Options → **Delete DNS zone**. This is the step people miss: removing a domain from a site does not delete the team-level zone, and the zone alone keeps the claim alive.
4. **Wait, then verify.** Usually effective within minutes → proceed to Chapter 4.

> If the domain was **purchased through Netlify** on the old team, do not delete the zone — transfer the registration instead (Domain settings → Transfer), or the domain could get locked to a team you cannot reach.

## 3. Path B — You Do Not Control the Other Team

1. **Open a support ticket.** Support → contact form. Subject: "Domain claimed by another team — release request for keja.app".
2. **Prove registrar ownership.** WHOIS registrant info, purchase date/method, screenshot of the Spaceship dashboard showing the domain in your account. With WHOIS privacy, the dashboard screenshot + ability to make on-demand DNS changes is the standard proof.
3. **Demonstrate live DNS control.** Offer to add any TXT record Netlify specifies (e.g. `netlify-challenge=...`) at your Spaceship panel on request — conclusive ownership evidence that typically shortens the process to a few business days.
4. **Ask for the release explicitly.** Netlify contacts the other team holder, then releases the claim if they do not respond or cannot justify it.

While waiting, nothing is blocked: the site serves on keja-ai.netlify.app, deploys run green, and the A record already targets Netlify. Escalate after a week by replying on the same thread, citing the verified DNS state in the table above.

## 4. Attaching keja.app After the Release

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
