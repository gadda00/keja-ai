#!/usr/bin/env python3
"""Doc 3 — Keja AI Strategy (body + cover + merge)."""
import sys
sys.path.insert(0, "/home/z/my-project/scripts/keja-docs")
from keja_pdf_kit import (  # noqa: E402
    body, bullets, build_doc, callout_row, h1_block, h2_block, lead, make_table,
    mark_body_start, quote_box, Spacer, write_cover, render_cover, merge_cover,
)

BODY = "/home/z/my-project/download/keja-strategy-body.pdf"
FINAL = "/home/z/my-project/download/keja-strategy.pdf"
story = []

# 1 ─ Executive summary
p = lead(
    "Keja AI exists to solve one problem: in African real estate, the person with the money "
    "knows the least about the asset. This strategy sets out how a small, capital-efficient "
    "team turns verified-property infrastructure into the trust layer through which Kenyan "
    "real estate is discovered, financed and transacted—and how it defends that position "
    "once incumbents notice.")
story += h1_block("Executive Summary", "1", p)
story.append(body(
    "The company thesis is structural. Property is Kenya's largest store of household "
    "wealth, its transaction volume is enormous, and its information environment is "
    "pre-digital: unverified titles, unexplainable prices, informal brokers, and a diaspora "
    "that sends money home hoping for the best. Portals solved advertising; nobody has "
    "solved verification, analysis and transaction support as one continuous, explainable "
    "layer. Keja AI is built to be that layer. The product already spans the full "
    "lifecycle—discover, verify, analyse, finance, invest, transact, manage—with an "
    "honesty mechanism (the public claims register) that keeps the company's promises "
    "auditable."))
story.append(body(
    "The strategy proceeds in three phases: prove the trust product with consumers and "
    "agents on top of a self-growing inventory; monetise the professionals and institutions "
    "who benefit most from verified demand; then become transactional infrastructure, "
    "earning fees where trust converts directly into completed deals. Each phase has "
    "explicit gates—no phase begins until its predecessor's metrics clear—and the "
    "engine is already unusually cheap to run: a static, edge-deployed application with an "
    "automated listing pipeline, no servers to babysit and no inventory to hand-key."))

# 2 ─ Vision & mission
story += h1_block("Vision, Mission and Operating Principles", "2", lead(
    "Vision: a continent where any property can be trusted from a phone. Mission: verify "
    "every property, explain every number, and guide every transaction in African real "
    "estate."))
story += bullets([
    "<b>Evidence over promises.</b> Every score is drillable to its factors; every "
    "statistic declares its sample size; the claims register keeps the product honest "
    "about its own capabilities.",
    "<b>Small surface, deep integrity.</b> Nine products, one trust engine—features ship "
    "only when they strengthen the spine, never as disconnected stunts.",
    "<b>Capital efficiency as strategy.</b> Static edge deployment, automated inventory "
    "growth and founder-led distribution mean the runway is measured in years, not months.",
    "<b>Local by default.</b> Trilingual product (English, Swahili, French), offline-"
    "capable installation for mid-range Android, WhatsApp-native sharing, and pricing "
    "denominated in shillings.",
])

# 3 ─ Problem & opportunity
story += h1_block("Problem and Opportunity", "3", lead(
    "Three structural failures define the opportunity. Each is a tax on every transaction, "
    "and each is an information problem—exactly the kind software fixes."))
story += make_table(
    ["Structural failure", "What it costs", "Keja's wedge"],
    [
        ["Title and identity opacity",
         "Due diligence is manual, slow and expert-gated; fraud and disputes are endemic",
         "Property Passport with verification status, encumbrances, rates and zoning in one identity document"],
        ["Price and yield opacity",
         "Buyers negotiate blind; investors cannot compare opportunities credibly",
         "Valuation bands, Investment Scores and yield answers computed live from inventory with sample sizes"],
        ["Distance risk (diaspora)",
         "Billions in annual remittances meet zero inspection ability",
         "Remote verification, timezone-aware service, Deal Analyst screening with on-device document processing"],
    ],
    ratios=[0.22, 0.34, 0.44],
    caption="Table 3.1 — The three failures, their cost, and the product wedge for each.")
story.append(body(
    "The addressable market is layered. Consumer transactions (buying, renting, managing) "
    "supply volume and habit. Professional supply (agents, landlords, developers, valuers) "
    "supplies recurring revenue. Institutional demand (banks, SACCOs, pension funds, "
    "insurers) supplies contracts, data licensing and mortgage-scale economics. Kenya is "
    "the beachhead because it combines deep digital payments rails, an active diaspora, a "
    "mortgage market small enough to be upgradeable, and land-records digitisation "
    "momentum at government level. The regional expansion logic (Rwanda, Tanzania, "
    "Uganda, Nigeria) reuses the entire engine—only the data and the partners change."))

# 4 ─ Competitive landscape
story += h1_block("Competitive Landscape and Moat", "4", lead(
    "Incumbents are strong at what they already do. The moat is that none of them are "
    "structurally able to do what Keja does without becoming a different company."))
story += make_table(
    ["Player class", "Examples", "Their strength", "Their structural gap"],
    [
        ["Listing portals", "BuyRentKenya, Jiji, PigiaMe",
         "Traffic, inventory breadth, brand familiarity",
         "Monetise attention; verification would slow their listing flywheel and cannibalise ad revenue"],
        ["Agency / data houses", "Hass Consult, Knight Frank",
         "Institutional trust, proprietary indices, prime-mandate deal flow",
         "Serve the top of the market at bespoke prices; no consumer-grade self-serve trust product"],
        ["Government rails", "Lands ministry records, eCitizen",
         "Authoritative source data as digitisation proceeds",
         "Records, not products: no scoring, no analysis, no transaction guidance"],
        ["Informal channel", "Brokers, family networks",
         "Distribution reach and cultural embeddedness",
         "Zero tooling, zero accountability, zero scale economics"],
    ],
    ratios=[0.16, 0.20, 0.28, 0.36],
    caption="Table 4.1 — Competitor map: why the trust layer stays open.")
story.append(body(
    "Keja's defensible assets compound: the verification methodology and its evidence "
    "trail (hard to fake, slow to copy), the Auto-Pilot inventory pipeline that grows "
    "supply while the team sleeps, the explainable-scoring engine whose outputs partners "
    "can audit, the claims-register discipline that converts honesty into brand, and a "
    "distribution cost structure near zero. Where portals must keep listing volume "
    "frictionless, Keja's revenue depends on listing quality—verification depth is not a "
    "feature we can quietly drop, which is precisely why it can become our identity."))

# 5 ─ Business model
story += h1_block("Business Model and Revenue Streams", "5", lead(
    "Revenue follows trust depth: consumers pay little, professionals pay monthly, "
    "institutions pay for capability. The sequence matters—each stream funds and "
    "de-risks the next."))
story += make_table(
    ["Stream", "Who pays", "Model", "Phase"],
    [
        ["Verified listing fees", "Owners, agents, developers",
         "Per-listing verification fee; volume tiers for agents", "Phase 1-2"],
        ["Pro workspace SaaS", "Agents, valuers, property managers",
         "Monthly subscription for pipelines, analytics and branded passports", "Phase 2"],
        ["Finance referrals", "Banks, KMRC-originated lenders",
         "Commission on qualified mortgage introductions from the eligibility engine", "Phase 2-3"],
        ["Transaction services", "Buyers and sellers",
         "Fee on milestone-managed transactions (escrow-adjacent, partner-operated)", "Phase 3"],
        ["Data licensing", "Banks, insurers, researchers, development institutions",
         "Subscription to aggregated, anonymised market intelligence", "Phase 3"],
        ["Institutional verification API", "Lenders, REITs, insurers",
         "Per-call verification and scoring for underwriting workflows", "Phase 3"],
    ],
    ratios=[0.22, 0.24, 0.38, 0.16],
    caption="Table 5.1 — Revenue streams, payers and the phase each activates.")
story.append(body(
    "Two disciplines govern monetisation. First, the consumer experience never payswalls "
    "trust basics—the Trust Score and Passport remain free because they are the growth "
    "engine, not the product. Second, anything touching client money operates through "
    "licensed partners (banks, conveyancers, escrow providers) in Phase 3; Keja sells "
    "coordination and verification, not unregulated custody. The tokenization module "
    "remains in trial mode with fictional assets until Capital Markets Authority "
    "engagement defines a compliant path."))

# 6 ─ Go-to-market
story += h1_block("Go-To-Market Strategy", "6", lead(
    "Three phases with explicit gates. The companion marketing playbook and partner "
    "proposals document execute the details; this chapter fixes the logic."))
story += make_table(
    ["Phase", "Thesis", "Gate to advance"],
    [
        ["1 — Prove (months 0-6)",
         "Consumers and early agents adopt the trust layer; supply grows through the "
         "free verification tier and Auto-Pilot inventory; WhatsApp-native sharing "
         "compounds reach",
         "3,000 installs; 100 partnering agents; 20% month-over-month verified-listing view growth"],
        ["2 — Monetise (months 6-15)",
         "Pro subscriptions, listing fees and the first bank referral pilots convert "
         "proven attention into recurring revenue; two institutional data pilots begin",
         "150 paying pros; first referral revenue; churn under 5% monthly"],
        ["3 — Institutionalise (months 15-24)",
         "Verification API and data licensing embed Keja in underwriting and research "
         "workflows; transaction services launch with licensed partners",
         "Two signed institutional contracts; transaction revenue live"],
    ],
    ratios=[0.16, 0.52, 0.32],
    caption="Table 6.1 — Phase theses and advancement gates.")

# 7 ─ Technology moat
story += h1_block("Technology as Strategy", "7", lead(
    "The engineering choices are not overhead—they are the strategy. Three choices carry "
    "the business logic."))
story += bullets([
    "<b>Zero marginal cost of distribution.</b> A statically exported PWA installs on any "
    "Android or iOS device without app-store friction and works offline—a decisive "
    "advantage where data is metered and devices are mid-range. Every user can hold the "
    "entire product for the cost of one page load.",
    "<b>Self-growing inventory.</b> The Auto-Pilot pipeline ingests, enriches, dedupes and "
    "quality-gates listings every six hours without human effort, so supply scales with "
    "compute, not headcount— and every ingested listing strengthens the data asset that "
    "Phase 3 monetises.",
    "<b>Honesty as an architecture.</b> The claims register, sample-size declarations and "
    "drillable scores are product features, not legal disclaimers. They make trust "
    "auditable by users and partners alike, which is the precondition for the "
    "institutional revenue phase.",
])

# 8 ─ Roadmap
story += h1_block("Twenty-Four-Month Roadmap", "8", lead(
    "The roadmap sequences capability behind the phase gates—no feature outruns its "
    "monetisation logic."))
story += make_table(
    ["Horizon", "Product", "Commercial", "Infrastructure"],
    [
        ["0-6 months",
         "Trust Score refinements from user feedback; saved-search alerts; Deal Analyst "
         "language coverage; partner-branded passports",
         "Free agent verification tier; first 100 agents; referral programme",
         "Product analytics instrumentation; keja.app domain live; PWA polish on real devices"],
        ["6-12 months",
         "Pro workspace GA; landlord tooling depth; area-guide coverage to 25 neighbourhoods",
         "Pro subscriptions; listing fees; two bank referral pilots",
         "Backend graduation: accounts API, server-side profiles, real-time inventory writes"],
        ["12-24 months",
         "Verification API; institutional dashboards; transaction milestones with licensed "
         "escrow partners",
         "Data licensing; institutional contracts; transaction fee revenue",
         "Regional readiness: multi-currency, multi-jurisdiction data model, francophone entry"],
    ],
    ratios=[0.11, 0.34, 0.27, 0.28],
    caption="Table 8.1 — Capability roadmap aligned to phase gates.")

# 9 ─ Risks
story += h1_block("Risk Register", "9", lead(
    "The strategy's honest failure modes, each with a designed mitigation rather than a "
    "hope."))
story += make_table(
    ["Risk", "Severity", "Mitigation"],
    [
        ["Portal copies verification claims", "High",
         "They can copy the words, not the evidence trail; audit-ability and the claims register become the comparison test"],
        ["Title-verification partnerships stall", "High",
         "Evidence panels degrade gracefully (declared status, not fake certainty); professional panel fills the gap commercially"],
        ["Consumer monetisation lags", "Medium",
         "Cost structure tolerates long consumer runway; professional revenue does not depend on consumer conversion"],
        ["Regulatory reclassification (tokenization)", "Medium",
         "Trial mode with fictional assets until CMA engagement concludes; module isolation means the rest of the product is unaffected"],
        ["Key-person concentration", "Medium",
         "Documented engineering dossier, CI-gated quality, this strategy document and the repo itself reduce bus factor"],
        ["Data quality drift in Auto-Pilot", "Medium",
         "Quality gate plus human review queue already in the pipeline; pending-review queue exists in the data model"],
    ],
    ratios=[0.30, 0.12, 0.58],
    caption="Table 9.1 — Strategic risks and designed mitigations.")

# 10 ─ Operations
story += h1_block("Team and Operations", "10", lead(
    "Keja AI operates as a Chacadom Investments venture with a deliberately small "
    "permanent team: product-engineering, trust operations (verification and partner "
    "evidence), and growth. Verification specialists are contracted per-relation as "
    "volume scales, which keeps fixed costs flat while trust capacity flexes. The "
    "operating cadence is weekly against the marketing playbook's metrics, monthly "
    "against the phase gates, and quarterly against this document—each review asks one "
    "question: did the evidence change? Strategy here is a living constraint system, "
    "not a slide deck, and its two enforcement mechanisms are the claims register the "
    "product carries and the phase gates the finance function respects."))

mark_body_start(story)
build_doc(story, BODY, "Keja AI Strategy",
          "Business strategy: positioning, business model, phases and roadmap")

HTML = "/home/z/my-project/scripts/keja-docs/doc3_cover.html"
COVER_PDF = "/home/z/my-project/scripts/keja-docs/doc3_cover.pdf"
write_cover(
    HTML,
    kicker="Business Strategy · Kenya First, Africa Next",
    hero="KEJA AI",
    summary="The strategy for turning verified-property infrastructure into the trust layer "
            "of African real estate: structural problems, layered revenue, three gated "
            "phases and a technology base whose costs shrink as its moat deepens.",
    meta="Strategy document<br>"
         "<span class='lbl'>A Chacadom Investments venture</span><br>"
         "<span class='lbl'>September 2026</span>",
)
render_cover(HTML, COVER_PDF)
merge_cover(COVER_PDF, BODY, FINAL,
            "Keja AI Strategy",
            "Business strategy: positioning, business model, phases and roadmap")
print("FINAL:", FINAL)
