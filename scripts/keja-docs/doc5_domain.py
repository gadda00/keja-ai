#!/usr/bin/env python3
"""Doc 5 — Resolving the keja.app Netlify Domain Conflict (fix guide, v2 with API forensics)."""
import sys
sys.path.insert(0, "/home/z/my-project/scripts/keja-docs")
from keja_pdf_kit import (  # noqa: E402
    body, bullets, build_doc, code_block, h1_block, h2_block, lead, make_table,
    mark_body_start, quote_box, Spacer, write_cover, render_cover, merge_cover,
)

BODY = "/home/z/my-project/download/keja-domain-body.pdf"
FINAL = "/home/z/my-project/download/keja-domain-conflict-fix.pdf"
story = []

# 1 ─ What the error means + confirmed diagnosis
p = lead(
    "When adding keja.app to the Netlify site, verification fails with: <i>'keja.app or "
    "one of its subdomains is already managed by Netlify DNS on another team.'</i> This "
    "guide now carries a confirmed, API-level diagnosis of exactly which account holds "
    "the claim, the five-minute self-service release path, and the one-command automated "
    "finish. It is written against the verified state of 10 September 2026.")
story += h1_block("What the Error Means — and the Confirmed Diagnosis", "1", p)
story.append(body(
    "The message says a <b>different Netlify account</b> already holds a claim on "
    "keja.app. Netlify enforces a one-owner rule: an apex domain can be claimed by only "
    "one Netlify account at a time, no matter who owns the registrar account. The claim "
    "is an internal Netlify record—most often left behind when the domain was once added "
    "to a site or DNS zone in another account. Crucially, the claim does not need active "
    "nameservers to keep blocking you: it lives in Netlify's database, not in the DNS "
    "system. Your DNS side is already perfect—nameservers are Spaceship's (launch1 and "
    "launch2.spaceship.net), the apex A record points to 75.2.60.5 (Netlify's load "
    "balancer), and www is a CNAME to keja-ai.netlify.app."))
story += h2_block("The API forensics (what was checked and found)")
story.append(body(
    "A full sweep was run through the Netlify API with the deploy token of the account "
    "that owns keja-ai (login torv54@gmail.com, team 'Victor' / gadda00, account id "
    "68331ef7ea60d8e7aedec052). Every team, every site, every domain-bearing field on "
    "each site object, every DNS zone and the account audit trail were enumerated. The "
    "account contains four sites—keja-ai, chacadom, ecoawardsafrica and busara-ai—and "
    "<b>none of them claims keja.app</b>: chacadom holds only chacadom.com, busara-ai "
    "holds only busaraai.com, and no keja.app DNS zone exists in this account. The "
    "attach attempt itself returned the decisive answer:"))
story.append(code_block(
    "PATCH /api/v1/sites/{keja-ai}  { \"custom_domain\": \"keja.app\" }\n"
    "422 Unprocessable Entity\n"
    "{ \"custom_domain\": [ \"is owned by another account\",\n"
    "    \"must be unique (keja.app, fb3b99bc-55cd-4552-a3a4-4b378448aa47)\" ] }"))
story.append(body(
    "Netlify itself names the owner: keja.app is claimed by account "
    "<b>fb3b99bc-55cd-4552-a3a4-4b378448aa47</b>—a different login from the one that "
    "owns keja-ai. This is almost certainly a <b>second account of yours</b>: GitHub "
    "OAuth, Google and email/password sign-ins each create separate Netlify accounts, "
    "even for the same email address. When the domain was first being linked, the "
    "'Add domain' step ran while the browser was logged into that other identity, "
    "creating a zone there. The table below summarises the verified state."))
story += make_table(
    ["Check", "Result"],
    [
        ["Sites visible to the deploy token", "4: keja-ai, chacadom, ecoawardsafrica, busara-ai"],
        ["keja.app on any site (custom_domain, aliases, branch/preview)", "None — chacadom only holds chacadom.com"],
        ["Netlify DNS zones in this account", "Only busaraai.com — no keja.app zone"],
        ["DNS for keja.app (registrar side)", "NS launch1/launch2.spaceship.net; A 75.2.60.5; www CNAME keja-ai.netlify.app"],
        ["Claiming account (from the 422 error)", "fb3b99bc-55cd-4552-a3a4-4b378448aa47 — a second login"],
    ],
    ratios=[0.42, 0.58],
    caption="Table 1.1 — Confirmed state as of 10 September 2026.")

# 2 ─ Path A
story += h1_block("Path A — Release It Yourself (~5 minutes)", "2", lead(
    "Because the claiming account is almost certainly your own second login, this is "
    "the recommended path and needs nobody's permission but yours."))
story += bullets([
    "<b>Step 1 — Find the other login.</b> At app.netlify.com, log out, then try each "
    "identity you own: Continue with GitHub, Continue with Google, and any other "
    "email/password. In each, check the Teams you land in—you are looking for one "
    "that is <b>not</b> 'Victor' (the keja-ai team). Team settings → General shows the "
    "account id; the claiming one ends in 8448aa47.",
    "<b>Step 2 — Delete the DNS zone there.</b> In the claiming account: team → "
    "Domains (the team-level DNS page). If keja.app is listed, open it → Options → "
    "<b>Delete DNS zone</b>. The zone is dormant—live nameservers are Spaceship's—so "
    "deleting it breaks nothing.",
    "<b>Step 3 — Check that account's sites too.</b> If any site there lists keja.app "
    "or www.keja.app in Site configuration → Domain management, remove those entries "
    "(Options → Remove domain).",
    "<b>Step 4 — Run the automated finish.</b> Repo → Actions → <b>Fix keja.app "
    "domain (Netlify)</b> → Run workflow → mode <b>fix</b>. It attaches keja.app "
    "(primary) + www.keja.app, provisions the Let's Encrypt certificate, enables "
    "Force HTTPS and polls until https://keja.app answers 200.",
])
story.append(quote_box(
    "Fully automated alternative for Step 1-3: create a Netlify personal access token "
    "in the claiming account, add it as the NETLIFY_CLAIM_TOKEN secret in the repo, "
    "then run the same workflow with use_claim_token + release_only checked (it "
    "releases the claim via API), and finally re-run with mode=fix using the normal "
    "token. No browser needed."))

# 3 ─ Path B
story += h1_block("Path B — Netlify Support Releases It", "3", lead(
    "If the claiming account turns out not to be yours—cannot be found among your "
    "logins—Netlify support must release it. This is a routine request with a defined "
    "process."))
story += bullets([
    "<b>Step 1 — Open a support ticket.</b> From the app: Support → contact form. "
    "Subject: 'Domain claimed by another account — release request for keja.app'. "
    "Include the claiming account id fb3b99bc-55cd-4552-a3a4-4b378448aa47 so support "
    "can locate the stale claim instantly.",
    "<b>Step 2 — Prove registrar ownership.</b> The WHOIS/RDAP registrant information "
    "for keja.app (registered 8 September 2026 at Spaceship), the purchase date and "
    "method, and a screenshot of the Spaceship dashboard showing the domain in your "
    "account.",
    "<b>Step 3 — Demonstrate live DNS control.</b> Offer to add a temporary TXT record "
    "Netlify specifies at your Spaceship DNS panel on request. Being able to change "
    "DNS at will is conclusive ownership evidence and typically shortens the process "
    "to a few business days.",
    "<b>Step 4 — Ask for the release explicitly.</b> Netlify will attempt to contact "
    "the claiming account, then release the claim if they do not respond or cannot "
    "justify it.",
])
story.append(body(
    "While you wait, nothing is blocked operationally: the site serves correctly on "
    "keja-ai.netlify.app, deploys run green on every push, and the DNS A record is "
    "already aimed at Netlify's load balancer. The moment the claim is released, "
    "Chapter 4 completes in under ten minutes. If support stalls beyond a week, "
    "escalate by replying on the same thread and cite the verified DNS state in "
    "Table 1.1."))

# 4 ─ Attaching the domain
story += h1_block("Attaching keja.app After the Release", "4", lead(
    "The automated route is one click: Actions → Fix keja.app domain (Netlify) → mode "
    "fix. It performs every step below, retries with backoff, and verifies the result. "
    "The manual equivalent:"))
story += bullets([
    "<b>Step 1 — Add the apex domain.</b> Netlify → keja-ai site → Site configuration "
    "→ Domain management → Add a domain → keja.app. Accept the prompt to make it the "
    "primary domain.",
    "<b>Step 2 — Add www.</b> Add www.keja.app to the same site, then in Domain "
    "management set www to redirect to the apex (apex-primary is recommended for a "
    "brand like keja.app).",
    "<b>Step 3 — Confirm DNS records at Spaceship.</b> Keep the apex A record "
    "75.2.60.5, and set www as a CNAME to keja-ai.netlify.app. Green checks appear "
    "within minutes for the A record, up to an hour for the CNAME.",
    "<b>Step 4 — HTTPS.</b> Let's Encrypt certificates are provisioned automatically "
    "once the domain verifies; then force HTTPS (Domain management → HTTPS → Force "
    "HTTPS).",
])
story.append(code_block(
    "# Verification commands (any terminal):\n"
    "dig NS keja.app +short          # launch1/launch2.spaceship.net\n"
    "dig A keja.app +short           # 75.2.60.5\n"
    "dig CNAME www.keja.app +short   # keja-ai.netlify.app\n"
    "curl -I https://keja.app        # HTTP/2 200 + netlify edge headers"))
story.append(body(
    "One subtlety worth knowing: because you are staying on Spaceship nameservers "
    "rather than delegating to Netlify DNS, the Netlify DNS-check screen may show a "
    "gentle recommendation to 'use Netlify DNS'. That is optional. Keeping Spaceship "
    "DNS with A and CNAME records is fully supported, keeps registrar independence, "
    "and matches the already-verified configuration in Table 1.1. Change nothing "
    "unless you have a reason."))

# 5 ─ Post-launch checklist
story += h1_block("Post-Launch Verification Checklist", "5", lead(
    "Run through this once keja.app answers. Every item is a one-command or one-click "
    "check, and together they prove the launch end-to-end."))
story += make_table(
    ["#", "Check", "Expected result"],
    [
        ["1", "curl -I https://keja.app", "HTTP/2 200 with Netlify edge headers"],
        ["2", "curl -I https://www.keja.app", "301 redirect to https://keja.app"],
        ["3", "Manifest at https://keja.app/manifest.webmanifest", "Serves JSON; PWA installs from the canonical domain"],
        ["4", "Service worker at https://keja.app/sw.js", "VERSION stamped (content hash), Cache-Control must-revalidate"],
        ["5", "Security headers on https://keja.app", "X-Frame-Options DENY and X-Content-Type-Options nosniff present"],
        ["6", "Install on a real Android (Chrome)", "Beforeinstallprompt fires; app installs full-screen with maskable icon"],
        ["7", "Install on a real iPhone (Safari)", "Share → Add to Home Screen; branded launch screen on cold start"],
        ["8", "Offline behaviour", "Airplane mode after first load: app shell and visited views still open"],
    ],
    ratios=[0.06, 0.38, 0.56],
    caption="Table 5.1 — Eight checks that prove the canonical launch.")
story.append(body(
    "If any check fails, the likely culprits are narrow and checkable: DNS propagation "
    "(items 1-2 — re-run dig after thirty minutes), missing www CNAME (item 2), or a "
    "stale service worker on a previously-visited device (items 4 and 8 — a hard "
    "refresh and one re-open clears it, because the cache version is content-hashed "
    "and self-evicts on the next activate). Everything else already passed the same "
    "checks on the keja-ai.netlify.app domain during the September 2026 verification "
    "pass, so the canonical domain inherits a known-good bundle."))

# 6 ─ Tooling reference
story += h1_block("Tooling Reference", "6", lead(
    "Everything described above is wired into the repository as repeatable tooling—no "
    "step depends on tribal knowledge or a one-off terminal session."))
story += make_table(
    ["Artifact", "Purpose"],
    [
        ["scripts/netlify-domain-fix.mjs", "Zero-dependency Node script. MODE=discover inventories teams, sites, zones and claims (read-only). MODE=fix releases stale claims, attaches keja.app + www, provisions SSL and verifies. MODE=probe dumps raw endpoint diagnostics. RELEASE_ONLY=1 releases without attaching, for use with the claiming account's token."],
        [".github/workflows/fix-domain.yml", "Manual workflow runner exposing the modes above, with optional NETLIFY_CLAIM_TOKEN secret for the cross-account release flow."],
        ["docs/DOMAIN_CONFLICT_FIX.md", "This guide in markdown, kept current with the repo."],
    ],
    ratios=[0.32, 0.68],
    caption="Table 6.1 — Domain tooling shipped in the repository.")

mark_body_start(story)
build_doc(story, BODY,
          "Resolving the keja.app Netlify Domain Conflict",
          "Fix guide v2: confirmed API-level diagnosis, self-service release, and the automated finish")

HTML = "/home/z/my-project/scripts/keja-docs/doc5_cover.html"
COVER_PDF = "/home/z/my-project/scripts/keja-docs/doc5_cover.pdf"
write_cover(
    HTML,
    kicker="Operations Guide · Domain Release and Launch",
    hero="KEJA APP",
    summary="The keja.app domain claim, confirmed at the API level: which Netlify "
            "account holds it, the five-minute self-service release, the support "
            "fallback, and the one-command automated finish.",
    meta="Operations guide (v2 — confirmed diagnosis)<br>"
         "<span class='lbl'>A Chacadom Investments venture</span><br>"
         "<span class='lbl'>10 September 2026</span>",
)
render_cover(HTML, COVER_PDF)
merge_cover(COVER_PDF, BODY, FINAL,
            "Resolving the keja.app Netlify Domain Conflict",
            "Fix guide v2: confirmed API-level diagnosis, self-service release, and the automated finish")
print("FINAL:", FINAL)
