#!/usr/bin/env python3
"""Doc 5 — Resolving the keja.app Netlify Domain Conflict (fix guide)."""
import sys
sys.path.insert(0, "/home/z/my-project/scripts/keja-docs")
from keja_pdf_kit import (  # noqa: E402
    body, bullets, build_doc, code_block, h1_block, h2_block, lead, make_table,
    mark_body_start, quote_box, Spacer, write_cover, render_cover, merge_cover,
)

BODY = "/home/z/my-project/download/keja-domain-body.pdf"
FINAL = "/home/z/my-project/download/keja-domain-conflict-fix.pdf"
story = []

# 1 ─ What the error means
p = lead(
    "When adding keja.app to the Netlify site, verification fails with: <i>'keja.app or "
    "one of its subdomains is already managed by Netlify DNS on another team.'</i> This "
    "guide explains exactly what that means in your case, walks both resolution paths, "
    "and finishes with attaching the domain and verifying the result. It is written "
    "against the verified state of 10 September 2026—nothing here is hypothetical.")
story += h1_block("What the Error Actually Means", "1", p)
story.append(body(
    "The message says a <b>different Netlify team</b> already holds a claim on keja.app. "
    "Netlify enforces a one-zone rule: an apex domain can exist as a managed domain or "
    "DNS zone in only one team at a time, no matter who owns the registrar account. The "
    "claim is an internal Netlify record—most often left behind when the domain was once "
    "added to a site in another team, registered through Netlify under another account, "
    "or given a Netlify DNS zone that was later abandoned. Crucially, the claim does not "
    "need active nameservers to keep blocking you: it lives in Netlify's database, not "
    "in the DNS system."))
story.append(body(
    "Important context from the verified state: your domain is <b>not</b> delegated to "
    "Netlify DNS today. The nameservers of record are Spaceship's (launch1 and "
    "launch2.spaceship.net), and the apex A record already points to 75.2.60.5—"
    "Netlify's load balancer. In other words, the DNS side is already correctly "
    "configured for a Netlify site; the only thing standing between you and keja.app "
    "is the stale team claim inside Netlify. That is an administrative fix, not a "
    "technical one, and it has exactly two resolution paths."))
story += make_table(
    ["Record", "Current value", "Meaning"],
    [
        ["NS (nameservers)", "launch1/launch2.spaceship.net", "Registrar is Spaceship; DNS is NOT on Netlify"],
        ["A @ (apex)", "75.2.60.5", "Already pointed at Netlify's load balancer"],
        ["Site", "keja-ai.netlify.app", "Live and deploying green from main"],
        ["Blocker", "Netlify team claim on keja.app", "Internal Netlify record held by another team"],
    ],
    ratios=[0.24, 0.34, 0.42],
    caption="Table 1.1 — Verified state of the domain as of 10 September 2026.")

# 2 ─ Path A
story += h1_block("Path A — You Control the Other Team", "2", lead(
    "If keja.app was ever added to a Netlify site you or a colleague created—under a "
    "different account, an old workspace, or a client team you can access—this path "
    "takes about ten minutes and needs nobody's permission."))
story += bullets([
    "<b>Step 1 — Find the team.</b> Log in to app.netlify.com and check the team "
    "switcher (top-left). Old or forgotten teams appear there. If you cannot see one, "
    "check other email accounts you may have used—the claim belongs to whichever "
    "account first added the domain.",
    "<b>Step 2 — Remove the domain from any site.</b> In the old team, open the site "
    "that has keja.app attached: Site configuration → Domain management → Domains. "
    "Open the keja.app entry and choose Options → Remove domain. Do the same for "
    "www.keja.app if listed separately.",
    "<b>Step 3 — Delete the DNS zone.</b> Still in the old team: Domains (team-level) "
    "→ select keja.app → Options/Manage → Delete DNS zone. This is the step people "
    "miss: removing a domain from a site does not delete the team-level zone, and the "
    "zone alone keeps the claim alive.",
    "<b>Step 4 — Wait, then verify.</b> Zone deletion is usually effective within "
    "minutes. Return to the keja-ai team and proceed to Chapter 4 to attach keja.app.",
])
story.append(quote_box(
    "If Step 3 shows the domain was purchased through Netlify on the old team, do not "
    "delete the zone—transfer the registration instead (Domain settings → Transfer), "
    "or the domain could end up locked to a team you cannot reach."))

# 3 ─ Path B
story += h1_block("Path B — You Do Not Control the Other Team", "3", lead(
    "If the claim belongs to a team you cannot log into—a former agency, a previous "
    "collaborator, a lost account—Netlify support must release it. This is a routine "
    "request for them; domains get claimed and abandoned constantly, and they have a "
    "defined process for exactly this situation."))
story += bullets([
    "<b>Step 1 — Open a support ticket.</b> From the app: Support → contact form (or "
    "support@netlify.com). Subject: 'Domain claimed by another team — release "
    "request for keja.app'.",
    "<b>Step 2 — Prove registrar ownership.</b> Attach or state: the WHOIS registrant "
    "information for keja.app (Spaceship account in your name), the date and method of "
    "purchase, and a screenshot of your Spaceship dashboard showing the domain in your "
    "account. If WHOIS privacy redacts the record, the registrar dashboard screenshot "
    "plus the ability to make on-demand DNS changes is the standard proof.",
    "<b>Step 3 — Demonstrate live DNS control.</b> Offer to add a temporary TXT record "
    "Netlify specifies (e.g. netlify-challenge=...) at your Spaceship DNS panel on "
    "request. Being able to change DNS at will is conclusive ownership evidence and "
    "typically shortens the process to a few business days.",
    "<b>Step 4 — Ask for the release.</b> Request explicitly: 'Please release the "
    "keja.app zone / domain claim held by the other team so I can add it to my site "
    "in my current team.' Netlify will attempt to contact the other team holder, then "
    "release the claim if they do not respond or cannot justify it.",
])
story.append(body(
    "While you wait, nothing is blocked operationally: the site serves correctly on "
    "keja-ai.netlify.app, deploys run green on every push, and the DNS A record is "
    "already aimed at Netlify's load balancer. The moment the claim is released, "
    "Chapter 4 completes in under ten minutes. If support stalls beyond a week, "
    "escalate by replying on the same thread—threads keep the context—and cite the "
    "verified DNS state in Table 1.1, which shows the domain already pointing at "
    "Netlify infrastructure under your control."))

# 4 ─ Attaching the domain
story += h1_block("Attaching keja.app After the Release", "4", lead(
    "With the claim gone, adding the domain is routine. Your DNS is already 90% "
    "correct—only the www record and the Netlify-side configuration remain."))
story += bullets([
    "<b>Step 1 — Add the apex domain.</b> Netlify → keja-ai site → Site configuration "
    "→ Domain management → Add a domain → keja.app. Accept the prompt to make it the "
    "primary domain.",
    "<b>Step 2 — Add www.</b> Add www.keja.app to the same site, then in Domain "
    "management set www to redirect to the apex (or vice versa, if you prefer www "
    "as primary—apex is recommended for a brand like keja.app).",
    "<b>Step 3 — Confirm DNS records at Spaceship.</b> Keep the apex A record "
    "75.2.60.5, and set www as a CNAME to keja-ai.netlify.app. Netlify's DNS-check "
    "panel will show green checks as each record verifies—usually within minutes for "
    "A records, up to an hour for the CNAME.",
    "<b>Step 4 — HTTPS.</b> Let's Encrypt certificates are provisioned automatically "
    "once the domain verifies. Do not upload custom certificates; wait for the "
    "automatic ones, then force HTTPS (Domain management → HTTPS → ensure 'Force "
    "HTTPS' is enabled).",
])
story.append(code_block(
    "# Verification commands (any terminal):\n"
    "dig NS keja.app +short          # launch1/launch2.spaceship.net\n"
    "dig A keja.app +short           # 75.2.60.5\n"
    "dig CNAME www.keja.app +short   # keja-ai.netlify.app\n"
    "curl -I https://keja.app        # HTTP/2 200 + netlify edge headers"))
story.append(body(
    "One subtlety worth knowing: because you are staying on Spaceship nameservers "
    "(Path B-style DNS) rather than delegating to Netlify DNS, the Netlify DNS-check "
    "screen may show a gentle recommendation to 'use Netlify DNS'. That is optional. "
    "Keeping Spaceship DNS with A and CNAME records is fully supported, keeps your "
    "registrar independence, and matches the already-verified configuration in "
    "Table 1.1. Change nothing unless you have a reason."))

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

mark_body_start(story)
build_doc(story, BODY,
          "Resolving the keja.app Netlify Domain Conflict",
          "Fix guide: releasing the stale Netlify team claim and launching the canonical domain")

HTML = "/home/z/my-project/scripts/keja-docs/doc5_cover.html"
COVER_PDF = "/home/z/my-project/scripts/keja-docs/doc5_cover.pdf"
write_cover(
    HTML,
    kicker="Operations Guide · Domain Release and Launch",
    hero="KEJA APP",
    summary="The stale Netlify team claim on keja.app: what the error means given the "
            "verified DNS state, the two release paths, the ten-minute attach procedure, "
            "and the eight checks that prove the canonical launch.",
    meta="Operations guide<br>"
         "<span class='lbl'>A Chacadom Investments venture</span><br>"
         "<span class='lbl'>10 September 2026</span>",
)
render_cover(HTML, COVER_PDF)
merge_cover(COVER_PDF, BODY, FINAL,
            "Resolving the keja.app Netlify Domain Conflict",
            "Fix guide: releasing the stale Netlify team claim and launching the canonical domain")
print("FINAL:", FINAL)
