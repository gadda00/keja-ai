#!/usr/bin/env python3
"""Doc 11 — Keja AI Partner Proposals v2 (researched, six partnership tracks)."""
import sys
sys.path.insert(0, "/home/z/my-project/scripts/keja-docs")
from keja_pdf_kit import (  # noqa: E402
    S, body, bullets, build_doc, callout_row, h1_block, h2_block, lead,
    make_table, mark_body_start, quote_box, Spacer, write_cover, render_cover,
    merge_cover,
)

BODY = "/home/z/my-project/download/keja-partners-body-v2.pdf"
FINAL = "/home/z/my-project/download/keja-kenya-partner-proposals-v2.pdf"
story = []


def partner(name, who, why, proposal, ask, model):
    story.extend(h2_block(name, body(f"<b>Who they are.</b> {who}")))
    story.append(body(f"<b>Why Keja fits.</b> {why}"))
    story.append(body(f"<b>The proposal.</b> {proposal}"))
    story.append(body(f"<b>The ask.</b> {ask}"))
    story.append(body(f"<b>Commercial model.</b> {model}"))


# ═══════════════════════════ 1. HOW TO USE ═══════════════════════════
p = lead(
    "This document is the second edition of the Keja AI partner proposals, rebuilt on "
    "fresh market research and a product that now demonstrably exists. It contains six "
    "concrete, researchable partnership tracks — each with named targets, a specific "
    "proposal, a clear ask and a commercial model. It is written to be carried into a "
    "meeting and answered in the room: every claim about the platform is verifiable at "
    "keja.app within ninety seconds.")
story += h1_block("How to Use This Document", "1", p)
story.append(body(
    "Each track in Chapters 2 through 7 follows the same five-part structure: who "
    "the partners are, why Keja fits their strategy, the proposal in operational "
    "terms, the ask, and the commercial model. Chapter 8 consolidates the pilot "
    "scopes and sequences the outreach calendar. The consistent thesis across all "
    "six tracks: Keja does not ask partners to trust it — it asks partners to "
    "audit it. The claims register, the versioned Trust Score engine, the "
    "per-release audit manifest and the 538-test engineering gate are the "
    "credential. Partners gain a trust layer their competitors lack; Keja gains "
    "the supply, distribution and rails it cannot build alone."))
story.append(callout_row([
    ("6", "partnership tracks"),
    ("20+", "named target organisations"),
    ("90s", "to verify any claim at keja.app"),
    ("0", "payments before legal gates open"),
]))

# ═══════════════════════════ 2. MORTGAGE LENDERS ═══════════════════════════
p = lead(
    "Kenya's mortgage market is structurally shallow — roughly 3 percent of GDP, "
    "with only about one in nine Kenyans able to afford a standard mortgage — "
    "which means lenders compete fiercely for a thin pool of qualified borrowers. "
    "The Kenya Mortgage Refinance Company and the Treasury-backed Kenya Mortgage "
    "Guarantee Trust (capitalised with a further EUR 4 million commitment in "
    "September 2025) exist precisely to widen that pool. Lenders' binding "
    "constraint is qualified demand; Keja's verified inventory plus its "
    "affordability calculators are a qualified-demand machine.")
story += h1_block("Mortgage Lenders and Housing Finance", "2", p)
partner(
    "Primary targets",
    "Kenya's retail mortgage writers: Equity Bank, KCB, NCBA, Housing Finance "
    "(HF Group), I&amp;M Bank, Stanbic — the institutions that originate the "
    "majority of the country's ~27,000 active mortgage accounts — plus the "
    "Kenya Mortgage Refinance Company (KMRC) as the wholesale refinancing "
    "layer whose mandate is expanding primary-lender capacity.",
    "Every Keja listing already carries the inputs a lender needs to "
    "pre-qualify interest: verified asking prices against area bands, "
    "rent-estimate evidence for buy-to-let underwriting, and an affordability "
    "calculator (FACT/ESTIMATE-labelled) users run before they ever speak to a "
    "loan officer. Keja's diaspora users — sending home a record USD 5.08 "
    "billion in the year to June 2025 — are exactly the non-resident "
    "applicants lenders find hardest to qualify and most want to reach.",
    "A co-branded 'Keja Verified' financing pathway: qualified buyers exit the "
    "Investment Calculator into a lender's pre-qualification flow, carrying "
    "their evidence pack (listing, area band, trust factors) with them. The "
    "lender gets pre-structured, pre-verified applications; the buyer gets a "
    "financing decision grounded in the same numbers they used to choose the "
    "property. Start as a referral and data-sharing pilot with one lender "
    "before any deeper integration.",
    "One product owner and one pilot cohort: 8 weeks, 200 pre-qualified "
    "leads from Keja's calculator funnel, measured on application-completion "
    "and approval rates versus the lender's walk-in baseline.",
    "Referral fee per completed mortgage at pilot; per-seat licensing of "
    "the evidence-pack API when the deeper integration lands. No platform "
    "fee on the buyer's side — Keja stays on the trust side of the "
    "transaction.")

# ═══════════════════════════ 3. LAW FIRMS ═══════════════════════════
p = lead(
    "Title verification in Kenya is now digitally possible — Ardhisasa, the "
    "Ministry of Lands' official platform, lets parties verify ownership, run "
    "official searches and process transfers online — but it remains a "
    "registry, not a consumer product. The official search (Form RL26, "
    "KES 500–1,000 per search) is the authoritative step; everything around "
    "it — interpreting the result, chain-of-title review, encumbrance "
    "analysis, Powers of Attorney for absent buyers — is advocate work. "
    "Keja's verification desk needs exactly that capability as a service.")
story += h1_block("Law Firms and the Verification Desk", "3", p)
partner(
    "Primary targets",
    "Nairobi conveyancing practices with diaspora caseloads — the mid-size "
    "firms that already handle remote closings — plus the property arms of the "
    "large commercial firms. The right first partner is one firm with an "
    "existing Ardhisasa workflow and appetite for productised consumer "
    "conveyancing.",
    "Keja's evidence panels are designed around the honesty principle that "
    "simulated checks are labelled simulated: the claims register openly "
    "states that no live Ardhisasa connection exists yet. That is the "
    "partnership. The platform supplies structured demand — buyers who "
    "arrive with a property chosen, evidence organised and questions "
    "prepared — and the firm supplies the authoritative title step and "
    "closing. The diaspora corridor multiplies this: Keja's PoA checklist "
    "and scheduling tools already walk a remote buyer through exactly the "
    "documents the advocate will need.",
    "A 'Keja Verification Desk' service tier: partner-firm advocates run "
    "official Ardhisasa searches and chain-of-title reviews for Keja "
    "listings, with results recorded into the evidence panel (scope, method, "
    "check date — the panel's existing schema). Verified listings earn the "
    "title-check flip in the claims register — from simulated to live, in "
    "public, with the partner's name on the method line. Diaspora closings "
    "bundle into a fixed-price product: PoA, search, escrow-style holding "
    "instructions and completion report.",
    "A named partner and a per-search rate card; a 12-week pilot covering "
    "50 official searches on the curated inventory, plus a fixed-fee "
    "diaspora closing product priced and listed on the platform.",
    "Keja collects the consumer fee; the firm bills the search and closing "
    "work at agreed rates. Revenue splits on bundled products; the "
    "register flip itself is not for sale — it happens only when the "
    "evidence genuinely exists.")

# ═══════════════════════════ 4. DEVELOPERS ═══════════════════════════
p = lead(
    "Nairobi's sale prices rose roughly 8.2 percent year-on-year, led by detached "
    "homes and suburban land, while the luxury apartment segment — Kilimani "
    "included — sits in oversupply with compressed yields and high vacancy. "
    "Developers in that market are squeezed between buyers who demand evidence "
    "and marketing channels that cannot provide it. Off-plan selling survives "
    "on trust; Keja is a trust product with a Developer Console already built.")
story += h1_block("Property Developers", "4", p)
partner(
    "Primary targets",
    "Mid-size Nairobi residential developers (the 30–300 unit segment) with "
    "off-plan or newly-completed stock in oversupplied areas — the firms for "
    "whom differentiated, evidence-backed marketing is now existential — plus "
    "land-assembly specialists in the suburban growth corridors where prices "
    "are rising fastest.",
    "The Developer Console gives them screening-grade feasibility (units, "
    "GFA, cost stack, GDV, margin, absorption, sensitivity grid), month-by-"
    "month cashflow with interest drawdown, and land-banking shields derived "
    "from live marketplace comps — all unit-tested, all labelled ESTIMATE. "
    "Keja listings give their finished stock what no portal offers: a Trust "
    "Score with published factors, an Investment Score with honest "
    "confidence bands, and completion-date plus payment-plan fields designed "
    "for off-plan disclosure.",
    "A 'Verified Launch' package: the developer's inventory on Keja with "
    "full evidence panels, the firm's feasibility model run in the Console "
    "under NDA, and co-branded Passport Cards for their sales team — every "
    "unit marketed with the same labelled trust factors. In oversupplied "
    "areas, 'the listing you can audit' is a category-killer pitch.",
    "Two pilot developers, one oversupplied-submarket launch each, 10 "
    "weeks, measured on enquiry quality (viewings requested per 1,000 "
    "impressions) versus their existing portal spend.",
    "Launch-package fee plus per-listing verification services; the Console "
    "converts to the KEJA PRO enterprise tier once usage sticks.")

# ═══════════════════════════ 5. DIASPORA ORGANISATIONS ═══════════════════════════
p = lead(
    "The UK, US and UAE corridors dominate Kenya's remittance inflows — a record "
    "USD 5.08 billion in the twelve months to June 2025, with the Central Bank "
    "projecting around USD 5.24 billion for 2026 — and real estate is "
    "consistently among the top intended uses. Diaspora associations, "
    "professional bodies, churches' welfare networks and the remittance "
    "companies themselves aggregate exactly this audience, and they hear the "
    "same story every December: money sent home for a house that was never "
    "built, sold to someone else, or encumbered by a relative's loan.")
story += h1_block("Diaspora Organisations and Remittance Partners", "5", p)
partner(
    "Primary targets",
    "Kenyan diaspora associations and professional chapters in the UK "
    "(Kenya Community in the UK, professional societies), the US "
    "(state-level Kenyan associations, harambee networks) and the UAE; plus "
    "the remittance specialists serving those corridors — WorldRemit, "
    "Sendwave, Wise and M-Pesa Global — for whom property is the stickiest "
    "use case and the highest-value transfers.",
    "The Diaspora Hub is purpose-built corridor tooling that no remitter "
    "or association offers: timezone-accurate viewing scheduling with "
    "cross-day warnings, the PoA checklist, remittance cost comparison "
    "across bank, specialist and stablecoin models, and journey tracking "
    "from search to completion. Keja's trust spine answers the fear the "
    "associations hear every Christmas: every listing's evidence is "
    "inspectable from abroad, and reports from the diaspora enter the same "
    "adjudication queue as everyone else's.",
    "A co-marketed 'Build Home Safely' programme: Keja provides the Hub, "
    "the evidence system and monthly live walkthrough webinars; the "
    "association provides community trust and reach; the remittance "
    "partner provides a transparent cost comparator integration and "
    "event presence. Members get a verified pathway from dollars in "
    "London to a titled, evidenced property in Nairobi.",
    "Three associations (one per corridor) for a 90-day programme with a "
    "named coordinator each; one remittance partner signed to the "
    "comparison integration with an honest-label agreement (ESTIMATE "
    "band until live rates are contractually available).",
    "Free for associations and members during the pilot — Keja's take is "
    "corridor depth and feedback. The remittance integration carries a "
    "referral arrangement only when it flips to live rates; until then "
    "the comparator stays honestly labelled as typical models.")

# ═══════════════════════════ 6. PORTALS & DATA PARTNERS ═══════════════════════════
p = lead(
    "BuyRentKenya — East Africa's most-trafficked dedicated property portal, "
    "backed by ROAM Group — together with Jiji and Property24 Kenya defines the "
    "attention layer of the market. Their structural problem, as Chapter 3 of "
    "the strategy document argues, is that listing volume is their product and "
    "verification cuts volume. Keja's proposal inverts the threat: the trust "
    "layer as an embeddable service that makes their inventory more "
    "transactable, not smaller.")
story += h1_block("Portals and Data Partners", "6", p)
partner(
    "Primary targets",
    "BuyRentKenya (ROAM Group) and Jiji Kenya as the volume portals; "
    "Property24 Kenya as the listings-syndication case; institutional data "
    "buyers (insurers, researchers, lenders' risk teams) as the second "
    "audience for the same API.",
    "Keja's Auto-Pilot pipeline already ingests, deduplicates and "
    "anomaly-screens external feeds — it was built for exactly this "
    "integration — and the trust anchor makes every published score "
    "auditable after the fact. A portal that embeds Keja scores gains the "
    "trust story it cannot build without offending its listing customers; "
    "it can adopt verification incrementally, listing by listing, exactly "
    "as the register's per-claim status permits.",
    "A syndication-and-scoring pilot: the portal feeds a bounded "
    "subcategory (say, 500 Nairobi apartment listings) through Keja's "
    "ingest pipeline; Keja returns labelled trust factors, price-band "
    "positions and duplicate flags; the portal displays what it chooses "
    "with Keja's evidence links. Measure engagement lift on scored versus "
    "unscored listings. The data-buyer track runs the same API in the "
    "other direction: honest, anchored market data for risk and research "
    "desks.",
    "One portal, one subcategory, 8 weeks, engagement-measured — scored "
    "listings versus control at matched impressions. In parallel, one "
    "institutional data pilot with a research or insurance desk.",
    "Per-call API pricing on the scoring service; syndication earns the "
    "portal better engagement at zero cost during pilot. Data licences "
    "priced per seat for institutional desks.")

# ═══════════════════════════ 7. REGULATORS & CAPITAL MARKETS ═══════════════════════════
p = lead(
    "The Capital Markets Authority regulates REITs (Income, Development and "
    "Islamic structures alike) and, as of September 2025, has admitted "
    "real-estate tokenization projects into its regulatory sandbox. The "
    "Ministry of Lands' Ardhisasa platform is the authoritative registry. "
    "These institutions are not customers; they are the rails Keja's Phase 4 "
    "depends on, and the correct posture is early, documented engagement "
    "built on the platform's existing structural guarantees.")
story += h1_block("Regulators, Registry and the Capital-Markets Path", "7", p)
partner(
    "Engagement targets",
    "The Capital Markets Authority's sandbox and innovation functions; the "
    "Ministry of Lands' Ardhisasa programme office; the Central Bank of "
    "Kenya's payments supervision for the eventual PSP partnership; and, at "
    "Phase 4, licensed REIT managers and trustees as co-sponsors of any "
    "tokenization offering.",
    "Keja's regulatory posture is already structural: the code prevents "
    "payments, tokenization, KYC or M-Pesa escrow claims from flipping "
    "live without a committed legal-approval artifact — the gate is in "
    "the build, not in a policy PDF. The claims register gives a "
    "regulator a live, public map of exactly what the platform does and "
    "does not do. That is the pitch: audit us and you already know what "
    "you will find.",
    "A structured pre-application dialogue: present the register, the "
    "trust anchor, the regulatory gates and the honest-state document; "
    "agree the evidence the sandbox application will need (verification "
    "desk SLAs, advocate-network search references, PSP partnership "
    "terms); and sequence Ardhisasa access through the verification-desk "
    "partnership rather than around it. No application is filed before "
    "Phase 2's real-supply exit criteria are met — the regulator sees a "
    "company that arrives when it says it will.",
    "Named engagement contacts and a written pre-application meeting "
    "with CMA's innovation function within the Phase 2 window; Ardhisasa "
    "access terms explored through the Chapter 3 law-firm partnership.",
    "No commercial model with regulators — the deliverable is a "
    "documented path to the Phase 4 sandbox application, with Keja "
    "funding its own compliance work from PRO and desk revenue.")

# ═══════════════════════════ 8. CONSOLIDATION ═══════════════════════════
p = lead(
    "Six tracks, one calendar. The table below consolidates every pilot into a "
    "single ninety-day execution grid, sequenced so that supply and trust "
    "partnerships (law firms, developers) land before distribution and "
    "capital ones (lenders, diaspora, portals) scale them, and regulatory "
    "engagement runs continuously as the documented backdrop.")
story += h1_block("Pilot Grid and Ninety-Day Outreach Calendar", "8", p)
story += make_table(
    ["Weeks", "Lenders", "Law firms", "Developers", "Diaspora", "Portals", "Regulators"],
    [
        ["1–2", "Target list + one-pagers", "Shortlist 5 firms", "Target 8 firms",
         "Brief 3 associations", "Open intro with ROAM", "Pre-application letter"],
        ["3–4", "First lender meeting", "First partner meeting", "Console demos",
         "Webinar #1", "Scope memo", "CMA intro meeting"],
        ["5–8", "Pilot cohort (200 leads)", "50-search pilot", "2 launches live",
         "Corridor programme live", "500-listing scoring pilot", "Ardhisasa via law firm"],
        ["9–12", "Measure + renew", "Register flip: title-check", "Case studies",
         "Remitter integration", "Engagement report", "Sandbox criteria agreed"],
    ],
    ratios=[0.08, 0.16, 0.16, 0.16, 0.16, 0.14, 0.14],
    caption="Table 8.1 — The consolidated ninety-day partnership grid. Each cell is a "
            "deliverable with an owner.", font=8.5)
story.append(body(
    "The calendar's rule mirrors the product's: no track advances on claimed "
    "interest — only on the named commitment in the prior cell. And the "
    "document's closing rule mirrors the register's: any partner who cannot "
    "verify a claim in this document at keja.app should decline the meeting, "
    "because the entire proposal rests on being the platform that survives "
    "its own audit."))
story.append(quote_box(
    "Keja does not ask partners to trust it. It asks partners to audit it — "
    "and then to build on what they find."))

mark_body_start(story)
build_doc(story, BODY,
          "Keja AI Partner Proposals — Edition 2",
          "Six researched partnership tracks for Keja AI: mortgage lenders, law firms, "
          "developers, diaspora organisations, portals and regulators — each with "
          "targets, proposals, asks and commercial models")

HTML = "/home/z/my-project/scripts/keja-docs/doc11_cover.html"
COVER_PDF = "/home/z/my-project/scripts/keja-docs/doc11_cover.pdf"
write_cover(
    HTML,
    kicker="Partnerships · Proposals · Edition 2",
    hero="KEJA AI",
    summary="Six researched partnership tracks — mortgage lenders, verification-desk law "
            "firms, developers, diaspora corridors, portals and regulators — each with "
            "named targets, operational proposals, clear asks and honest commercial "
            "models. Verify every claim at keja.app in ninety seconds.",
    meta="Partnership development · Kenya &amp; corridors<br>"
         "<span class='lbl'>A Chacadom Investments venture</span><br>"
         "<span class='lbl'>September 2026 · Edition 2</span>",
)
render_cover(HTML, COVER_PDF)
merge_cover(COVER_PDF, BODY, FINAL,
            "Keja AI Partner Proposals — Edition 2",
            "Six researched partnership tracks for Keja AI: mortgage lenders, law firms, "
            "developers, diaspora organisations, portals and regulators — each with "
            "targets, proposals, asks and commercial models")
print("FINAL:", FINAL)
