#!/usr/bin/env python3
"""Doc 10 — Keja AI Strategy v2 (trust-infrastructure thesis, register-grounded)."""
import sys
sys.path.insert(0, "/home/z/my-project/scripts/keja-docs")
from keja_pdf_kit import (  # noqa: E402
    S, body, bullets, build_doc, callout_row, h1_block, h2_block, lead,
    make_table, mark_body_start, quote_box, Spacer, write_cover, render_cover,
    merge_cover,
)

BODY = "/home/z/my-project/download/keja-strategy-body-v2.pdf"
FINAL = "/home/z/my-project/download/keja-strategy-v2.pdf"
story = []

# ═══════════════════════════ 1. THESIS ═══════════════════════════
p = lead(
    "This is the second edition of the Keja AI strategy, rewritten from the position of "
    "strength the platform has actually reached: an auditable trust engine, a nine-product "
    "surface, and a public claims register that keeps the company honest about what is live, "
    "what is simulated, and what is planned. The strategy that follows does not chase "
    "listings volume or blitzscale growth. It builds the trust infrastructure African real "
    "estate lacks, and lets every other business line grow from that root.")
story += h1_block("The Strategic Thesis", "1", p)
story.append(body(
    "African real estate does not primarily lack supply, demand or even capital — it "
    "licks trust. Titles are hard to verify, prices are negotiated blind, the "
    "diaspora sends five billion dollars a year home through channels that cannot "
    "vouch for a single listing, and the informal channel that moves most volume "
    "runs entirely on word of mouth. Every existing player monetises one symptom: "
    "portals sell attention, agencies sell access, data houses sell reports. Nobody "
    "owns the layer under all of them — the verifiable truth about a property."))
story.append(body(
    "Keja's thesis is that the trust layer is the platform, and everything else — "
    "search, finance, tokenization, management — is an application built on it. This "
    "is why the engineering investment has gone where competitors cannot easily "
    "follow: deterministic, versioned Trust and Investment Score engines whose "
    "every factor is labelled FACT, ESTIMATE or ASSUMPTION; a build-time trust "
    "anchor that freezes published scores into an auditable manifest; a claims "
    "register that legally and technically prevents the marketing from drifting "
    "from the product. These are not features. They are the moat, and they are "
    "already built."))
story.append(callout_row([
    ("9", "products on one trust spine"),
    ("538", "automated tests green in CI"),
    ("25+", "capability claims publicly registered"),
    ("0", "fabricated-verification incidents tolerated"),
]))

# ═══════════════════════════ 2. WHERE WE ARE ═══════════════════════════
p = lead(
    "Strategy built on false premises is decoration. This chapter states exactly where "
    "the platform stands today, in the same three registers the claims register uses — "
    "live, simulated, planned — because the sequencing decisions in later chapters "
    "depend on knowing which is which.")
story += h1_block("Where We Are — The Honest State", "2", p)
story += make_table(
    ["Layer", "Status", "What exists today"],
    [
        ["Trust & verification UX", "Live",
         "Twelve-factor Trust Score engine (versioned), Investment Score with FACT/ESTIMATE "
         "labels, evidence panels with 90-day freshness, report-to-desk workflow, "
         "trust-anchor manifest shipped per release"],
        ["Search & advisory", "Live",
         "Natural-language parser (unit-tested), deterministic Ask Keja engine with "
         "escalation policy, saved searches with alert sweeps, notifications"],
        ["Pro & stakeholder tools", "Live",
         "KEJA PRO (CMA, listing writer, CRM), Landlord Studio, Tenant Hub, Valuation Desk, "
         "Developer Console, Diaspora Hub — all pure-function math, unit-tested"],
        ["Inventory", "Trial",
         "87 curated listings plus Auto-Pilot ingest pipeline with dedupe, price-anomaly "
         "screening and honest pending-review stamping; no partner feeds contracted yet"],
        ["Accounts & security", "Trial-grade",
         "Google sign-in, allowlisted admin roles, TOTP 2FA with hashed recovery codes, "
         "brute-force throttling, audit trail — client-side only until a backend lands"],
        ["Payments / escrow / tokenize", "Simulated / planned",
         "Regulator-ready gates exist in code: payments and tokenization cannot flip "
         "\u201clive\u201d without a committed legal-approval artifact"],
    ],
    ratios=[0.22, 0.13, 0.65],
    caption="Table 2.1 — The honest state, in the register's own three registers.")
story.append(body(
    "The strategic significance of this table is its last row. The platform has "
    "deliberately pre-built the regulatory gate: the code structurally prevents "
    "payments or tokenization from being represented as live until a legal-approval "
    "artifact is committed. Most startups bolt compliance on after the violation. "
    "Keja's sequencing problem is therefore not technical discipline but partner "
    "and regulatory execution — the work of Chapters 5 through 7."))

# ═══════════════════════════ 3. MARKET & COMPETITION ═══════════════════════════
p = lead(
    "The market context is quantified in the marketing playbook (Edition 2, Chapter 1); "
    "this chapter converts it into strategic geometry: where value pools sit, who "
    "defends them, and which positions are structurally indefensible against a "
    "trust-native entrant.")
story += h1_block("Market Structure and Competition", "3", p)
story += make_table(
    ["Player", "Their economics", "Structural weakness vs a trust layer"],
    [
        ["Listing portals (BuyRentKenya, Jiji, Property24)",
         "Attention arbitrage; agencies pay for placement",
         "Their revenue depends on listing volume, not listing truth — verification "
         "would cut inventory and offend their paying customers"],
        ["Agency data houses (Hass, Knight Frank)",
         "Subscription indices; institutional consulting",
         "High-cost human research that cannot cover the mass market; no "
         "per-listing, per-consumer product"],
        ["Informal broker channel",
         "Commission on opacity; information asymmetry is the product",
         "Has no answer to portable evidence a buyer can carry between brokers"],
        ["Government registry (Ardhisasa)",
         "Public service; official title searches",
         "A registry, not a marketplace: it tells you who owns land, not whether "
         "a listing is honest, priced fairly, or worth buying"],
    ],
    ratios=[0.26, 0.30, 0.44],
    caption="Table 3.1 — The competitive field: every incumbent profits from a gap Keja fills.")
story.append(body(
    "The defensibility question inverts at this point. Portals must spend to reach "
    "Keja's honesty level because their business model resists it; Keja must spend "
    "to reach their inventory level, which their own customers (agencies) are "
    "willing to supply to a channel that makes buyers trust them more. The "
    "strategic race is therefore: can Keja sign enough supply partners before a "
    "portal decides to burn its own margins on verification? The answer is speed, "
    "and Chapter 6 sequences accordingly."))

# ═══════════════════════════ 4. BUSINESS MODEL ═══════════════════════════
p = lead(
    "Revenue follows trust, not the reverse. The model below is sequenced so no line "
    "turns on before the trust that justifies it exists — the same discipline the "
    "claims register enforces on features.")
story += h1_block("Business Model and Revenue Lines", "4", p)
story += make_table(
    ["Line", "What buyers pay for", "When it turns on", "Shape"],
    [
        ["KEJA PRO subscriptions",
         "Agent workspaces: CMA engine, listing copywriter, lead CRM, viewings",
         "Now — live, free while in trial",
         "Freemium → KES 2,500–7,500/mo tiers"],
        ["Verification desk services",
         "Expedited evidence packs, human-verified badges, diaspora closing support",
         "Phase 2 (advocate network signed)",
         "Per-report fee + subscription"],
        ["Partner API / syndication",
         "Trust scores and evidence embedded in portals and lender apps",
         "Phase 2–3 (data partnerships)",
         "Per-call / per-seat licensing"],
        ["Transaction rails",
         "Viewing-fee escrow, deposit custody via licensed PSP",
         "Phase 3 (legal opinion + PSP licence)",
         "Take-rate on guarded flows"],
        ["Capital markets (tokenize)",
         "Fractional ownership under CMA sandbox → REIT-style products",
         "Phase 4 (sandbox admission, offering docs)",
         "Management/performance fees"],
    ],
    ratios=[0.20, 0.34, 0.24, 0.22],
    caption="Table 4.1 — Five revenue lines, each gated on the trust prerequisite that "
            "justifies charging for it.")
story.append(body(
    "The near-term engine is KEJA PRO: it monetises the side of the marketplace that "
    "benefits immediately from buyer trust, requires no regulatory permission, and "
    "generates the agent relationships that later supply inventory. The far-term "
    "engine is the capital-markets line, where the CMA has already admitted "
    "real-estate tokenization projects to its regulatory sandbox — but it only "
    "becomes reachable after the verification desk is real, because no regulator "
    "permits fractional ownership of unverified assets."))

# ═══════════════════════════ 5. THE MOAT ═══════════════════════════
p = lead(
    "Moats are compounding asymmetries. Keja's is a data flywheel with an honesty "
    "constraint: every verification decision, every report adjudication, and every "
    "partner feed entry makes the trust engine smarter while the register keeps "
    "its outputs honest — and only Keja is willing to publish the constraints.")
story += h1_block("The Moat and the Data Flywheel", "5", p)
story += bullets([
    "<b>Evidence accumulation.</b> Every adjudicated report and desk review adds "
    "labelled training truth for verification heuristics — data competitors cannot "
    "buy because their users do not trust them enough to file reports.",
    "<b>Anchored auditability.</b> The per-release trust-anchor manifest makes "
    "historical scores provable after the fact — the precondition for the "
    "partner API business, and impossible to retrofit cheaply.",
    "<b>Honesty as switching cost.</b> Partners who integrate a Keja trust layer "
    "into their listings cannot silently downgrade; their users inherit the "
    "register's expectations.",
    "<b>Corridor depth.</b> Diaspora tooling (timezone-accurate scheduling, PoA "
    "workflows, remittance math) creates workflow lock-in before any payment "
    "rail exists.",
    "<b>Talent signalling.</b> A public, auditable honesty system recruits "
    "engineers and partners who want to work nowhere else.",
])

# ═══════════════════════════ 6. ROADMAP ═══════════════════════════
p = lead(
    "Four phases, each with an unambiguous exit criterion drawn from the claims "
    "register's own vocabulary. The rule throughout: a phase may only begin when "
    "the previous phase's claims have actually flipped from simulated to live.")
story += h1_block("Roadmap: Four Phases to Rails", "6", p)
story += make_table(
    ["Phase", "Mission", "Exit criterion (register terms)"],
    [
        ["1 — Trial (now)",
         "Prove the trust UX on curated inventory; ship the honesty system; seed "
         "demand with content and WhatsApp distribution",
         "5,000 weekly actives; PRO workspaces in daily use; zero register "
         "drift incidents"],
        ["2 — Real supply",
         "Contract agencies, developers and portal feeds; stand up the human "
         "verification desk with an advocate network",
         "\u201ccross-agency\u201d and \u201ctitle-check\u201d claims flip to "
         "partner-dependent→live with recorded search references"],
        ["3 — Money flows",
         "PSP partnership for viewing-fee escrow and deposits; lender "
         "integrations (KMRC-aligned)",
         "\u201cpayments\u201d and \u201cmpesa-escrow\u201d claims flip live with "
         "the legal-approval artifact committed"],
        ["4 — Capital markets",
         "CMA sandbox admission for tokenized fractional ownership; offering "
         "documents; licensed custody",
         "\u201ctokenize\u201d and \u201ckyc\u201d claims flip live under "
         "regulatory supervision"],
    ],
    ratios=[0.14, 0.44, 0.42],
    caption="Table 6.1 — Phase gates are claims-register flips, not dates. The register is "
            "the roadmap's source of truth.")

# ═══════════════════════════ 7. REGULATORY STRATEGY ═══════════════════════════
p = lead(
    "Regulation is not a risk to be managed later; it is the sequencing backbone of "
    "the strategy. Kenya's institutions have already built the rails Keja intends "
    "to ride — the job is to be the trustworthy demand layer they lack.")
story += h1_block("Regulatory Strategy", "7", p)
story.append(body(
    "Three institutions matter. The Ministry of Lands' Ardhisasa platform provides "
    "official digital title searches — the authoritative source the verification "
    "desk will cite once an access partnership is in place. The Capital Markets "
    "Authority regulates REITs and has admitted real-estate tokenization projects "
    "to its regulatory sandbox, establishing a lawful path for Phase 4. And any "
    "payment rail runs through a licensed PSP under Central Bank of Kenya "
    "supervision, with the platform's legal role defined in writing before a "
    "shilling moves. In each case Keja's posture is the same: integrate, never "
    "arbitrage; document, never imply. The claims register already enforces this "
    "in code — the payments and tokenization gates cannot open without committed "
    "legal artifacts, so the regulator's questions and the platform's engineering "
    "constraints point the same direction."))
story.append(quote_box(
    "Structural guarantees beat good intentions: the gate is in the code, and the "
    "code is public. That is the regulatory pitch — audit us before you license "
    "us, and you already know what you will find."))

# ═══════════════════════════ 8. RISKS ═══════════════════════════
p = lead(
    "The register's honesty rules apply to this chapter too: each risk is stated "
    "with its actual severity, its early-warning signal, and the mitigation "
    "already in place or deliberately deferred.")
story += h1_block("Risk Register", "8", p)
story += make_table(
    ["Risk", "Severity", "Early signal", "Mitigation"],
    [
        ["A portal builds a trust layer faster than Keja signs supply",
         "High", "Agency churn in PRO workspaces",
         "Speed on Chapter 6 Phase 2; verification depth they cannot match "
         "without adopting the register themselves"],
        ["Backend never lands; client-side security ceiling reached",
         "Medium", "Account-related support tickets",
         "Phase 3 architecture is Prisma-ready; claims register already labels "
         "accounts 'simulated'"],
        ["Regulatory timeline slips (CMA sandbox, PSP licence)",
         "Medium", "Sandbox cohort announcements",
         "Revenue does not depend on Phase 4; PRO and desk services fund the "
         "wait"],
        ["Trust incident on curated inventory (bad listing slips through)",
         "High", "Issues-reported metric (published)",
         "Report→adjudication→anchor pipeline already live; incident "
         "postmortems publish into the Trust Center"],
        ["Single-maintainer engineering concentration",
         "Medium", "Bus-factor audit",
         "538 tests + artifact gates make the repo operable by a successor; "
         "documentation debt retired each wave"],
    ],
    ratios=[0.30, 0.10, 0.24, 0.36],
    caption="Table 8.1 — Risks stated honestly, mirroring the register's discipline.")

# ═══════════════════════════ 9. METRICS TREE ═══════════════════════════
p = lead(
    "One tree, rooted in trust, branching into revenue. Every branch has an owner, "
    "a target, and a guardrail — because a trust company that games its own metrics "
    "has already lost.")
story += h1_block("The Metrics Tree and 24-Month Milestones", "9", p)
story += make_table(
    ["Horizon", "Trust root", "Growth branch", "Revenue branch"],
    [
        ["6 months",
         "Zero register-drift incidents; 100% of listings carry labelled evidence",
         "5,000 weekly actives; 25 agent workspaces",
         "First 50 paying PRO seats"],
        ["12 months",
         "Advocate-network title checks on 90% of new urban listings",
         "25,000 WAU; diaspora corridor live in UK/US",
         "PRO ARR covers engineering costs; first partner API pilot"],
        ["18 months",
         "Verification desk SLA < 48h at volume; escrow rails live under PSP",
         "60,000 WAU; two portal syndication deals",
         "Verification services + API at 30% of revenue"],
        ["24 months",
         "CMA sandbox cohort admission for tokenization",
         "100,000 WAU; brand recognition as 'the trust layer'",
         "Transaction take-rate contributing; capital-markets prep funded"],
    ],
    ratios=[0.12, 0.32, 0.28, 0.28],
    caption="Table 9.1 — Twenty-four months, four checkpoints, one root: trust.")
story.append(body(
    "The discipline that governs this tree is the same one that governs the code: "
    "a metric that cannot be defended in a Trust Center postmortem does not go on "
    "the dashboard. That is the strategy. Everything else is execution."))

mark_body_start(story)
build_doc(story, BODY,
          "Keja AI Strategy — Edition 2",
          "Trust-infrastructure strategy for Keja AI: honest state, four-phase roadmap to "
          "transaction rails, moat analysis and a trust-rooted metrics tree")

HTML = "/home/z/my-project/scripts/keja-docs/doc10_cover.html"
COVER_PDF = "/home/z/my-project/scripts/keja-docs/doc10_cover.pdf"
write_cover(
    HTML,
    kicker="Corporate Strategy · Edition 2",
    hero="KEJA AI",
    summary="Africa's real-estate trust infrastructure: the honest state of the platform, "
            "a four-phase roadmap whose gates are claims-register flips, and a metrics "
            "tree rooted in trust. The register is the roadmap's source of truth.",
    meta="Corporate strategy · Nairobi<br>"
         "<span class='lbl'>A Chacadom Investments venture</span><br>"
         "<span class='lbl'>September 2026 · Edition 2</span>",
)
render_cover(HTML, COVER_PDF)
merge_cover(COVER_PDF, BODY, FINAL,
            "Keja AI Strategy — Edition 2",
            "Trust-infrastructure strategy for Keja AI: honest state, four-phase roadmap to "
            "transaction rails, moat analysis and a trust-rooted metrics tree")
print("FINAL:", FINAL)
