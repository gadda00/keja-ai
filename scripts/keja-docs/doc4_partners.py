#!/usr/bin/env python3
"""Doc 4 — Kenya Partner Proposals: 20 targets with tailored proposals."""
import sys
sys.path.insert(0, "/home/z/my-project/scripts/keja-docs")
from keja_pdf_kit import (  # noqa: E402
    body, build_doc, h1_block, h2_block, lead, make_table, mark_body_start,
    quote_box, Spacer, write_cover, render_cover, merge_cover, Paragraph, S,
)

BODY = "/home/z/my-project/download/keja-partners-body.pdf"
FINAL = "/home/z/my-project/download/keja-kenya-partner-proposals.pdf"
story = []


def partner(name, who, why, proposal, ask):
    story.extend(h2_block(name, body(f"<b>Who they are.</b> {who}")))
    story.append(body(f"<b>Why Keja fits.</b> {why}"))
    story.append(body(f"<b>The proposal.</b> {proposal}"))
    story.append(body(f"<b>The ask.</b> {ask}"))
    story.append(Spacer(1, 6))


# ── 1. Framework ────────────────────────────────────────────────────────────
p = lead(
    "Keja AI grows through partnerships before it grows through budget. This document "
    "names twenty Kenyan institutions we intend to approach first, and for each one "
    "states who they are, why the fit is structural rather than cosmetic, the specific "
    "partnership we propose, and the ask that starts the conversation. Every proposal "
    "follows the same discipline as the product itself: it must be true, auditable and "
    "mutually profitable.")
story += h1_block("Partnership Philosophy and Tier Model", "1", p)
story.append(body(
    "The thesis is that trust infrastructure is a network good: it is valuable to each "
    "participant roughly in proportion to how many others participate. A bank gains more "
    "from verified listings when the valuers, the developers and the diaspora channels are "
    "on the same rail. We therefore prioritise partnerships that compound—each signed "
    "institution strengthens the case for the next—and we sequence them so early partners "
    "get founder-level access and pricing in exchange for the credibility they lend."))
story += make_table(
    ["Tier", "What it means", "What partners contribute", "What Keja contributes"],
    [
        ["Tier 1 — Anchor", "Co-branded flagship integration",
         "Brand credibility, distribution reach, data or capital",
         "Priority product roadmap, co-branded trust surfaces, exclusive category for a defined period"],
        ["Tier 2 — Revenue", "Referral and licensing economics",
         "Qualified customer flow or underwriting volume",
         "Verified pipeline, eligibility tooling, per-deal reporting"],
        ["Tier 3 — Ecosystem", "Data and standards collaboration",
         "Authoritative data, professional standards, research reach",
         "Anonymised market intelligence, joint publications, engineering integration"],
    ],
    ratios=[0.14, 0.24, 0.30, 0.32],
    caption="Table 1.1 — The three partnership tiers.")
story.append(body(
    "Outreach follows a fixed sequence: a one-page written proposal (the relevant chapter "
    "below), a warm introduction wherever the network allows, a 30-minute working session "
    "rather than a pitch, and a scoped 90-day pilot with named success metrics before any "
    "commercial commitment. We lead with what the partner can verify—live product, public "
    "claims register, working deployments—and we never propose what the engineering cannot "
    "yet deliver."))

# ── 2. Banks ────────────────────────────────────────────────────────────────
story += h1_block("Banking and Mortgage Partners", "2", lead(
    "Kenya's mortgage market is small relative to the size of the property market—"
    "precisely because origination is expensive when the underlying assets are hard to "
    "trust. Keja AI's verified inventory, eligibility tooling and CBK-aligned affordability "
    "mathematics give banks a cheaper origination funnel and a cleaner risk view. Six "
    "institutions lead the target list."))

partner("KCB Bank Kenya",
    "Kenya's largest mortgage book and one of its most digitally aggressive banks, with a "
    "strong diaspora banking franchise and an established appetite for housing-finance "
    "ecosystem plays.",
    "KCB's mortgage growth is throttled by origination cost and collateral uncertainty. "
    "Keja's Property Passports and valuation bands give loan officers a standardised "
    "pre-screening layer, and our diaspora portal reaches exactly the customers KCB's "
    "diaspora desks court.",
    "A 90-day pilot: Keja surfaces KCB mortgage products inside the Finance product for "
    "qualifying users (eligibility pre-matched to KCB criteria), and KCB loan officers "
    "receive Keja-verified property files with pre-computed affordability. Co-branded "
    "verification badge on partner listings after the pilot converts.",
    "A named pilot sponsor in mortgage origination and two working sessions with the "
    "digital and diaspora teams.")

partner("Equity Bank Kenya",
    "The region's retail-banking giant, with deep diaspora remittance rails, an extensive "
    "branch network and a stated housing-finance agenda under its financial-inclusion "
    "franchise.",
    "Equity's remittance customers are Keja's diaspora personas—the overlap is nearly "
    "total. Remittances that today flow into construction and purchase without inspection "
    "could flow through verified, remotely-screened channels.",
    "Integration of Keja's diaspora verification journey with Equity's remittance "
    "journey: a 'verify before you send' step, co-marketed through diaspora banking "
    "channels, plus mortgage referral flow for completed verifications.",
    "A joint working session with the diaspora banking and partnerships teams, and a "
    "scoped pilot agreement for the remittance-verification step.")

partner("NCBA Bank Kenya",
    "A digitally-led commercial bank with strong asset-finance DNA and an active "
    "innovation-partnership practice.",
    "NCBA's asset-finance discipline—underwriting against verified collateral—maps "
    "directly onto property verification. Their digital-first posture suits a PWA-native "
    "integration that requires no branch retooling.",
    "Embed Keja verification inside NCBA's property-backed lending workflow: verified "
    "collateral files, valuation bands and Trust Scores attached to applications, with "
    "per-file licensing rather than platform fees for the pilot.",
    "A sandbox integration agreement and a joint 90-day success-metric definition "
    "(file completeness, time-to-approval, early-default signals).")

partner("Co-operative Bank of Kenya",
    "The SACCO-movement bank, with unmatched reach into co-operative savings pools that "
    "finance much of Kenya's actual housing construction.",
    "Co-operative housing finance is relationship-based and collateral-averse for good "
    "reason. Keja gives co-operative committees an auditable verification layer for "
    "member-funded projects and a tool their members can self-serve.",
    "A members' verification programme: Keja Property Passports for co-op-funded "
    "developments, group dashboards for committee oversight, and education content "
    "co-branded for the movement.",
    "A pilot with two housing co-operatives in the bank's orbit, sponsored by the "
    "co-operative banking division.")

partner("Stanbic Bank Kenya",
    "The Standard Bank Group's Kenyan franchise—institutional depth, a corporate and "
    "affluent client base, and regional reach into the group's wider African network.",
    "Stanbic's clients buy property as an asset class, not just shelter; Keja's investor "
    "workspaces, yield analytics and institutional portal speak that language. Regional "
    "expansion aligns with the group's footprint.",
    "A private-client offering: Keja investor dashboards and Deal Analyst screening "
    "wrapped for Stanbic wealth clients, with anonymised portfolio-level market "
    "intelligence for the bank's research desk.",
    "A working session with wealth and partnerships, and agreement on a private-client "
    "pilot cohort.")

partner("HF Group (Housing Finance)",
    "Kenya's specialist housing-finance institution, with a developer-lending legacy, a "
    "property-development arm and an explicit affordable-housing mission.",
    "HF Group's specialist position means every part of Keja's lifecycle map is relevant: "
    "developer verification, buyer eligibility, and post-purchase management. The "
    "affordable-housing agenda matches Keja's cost-light distribution.",
    "A full-lifecycle partnership spanning three fronts: verified profiles for "
    "HF-financed developments, embedded mortgage eligibility in Keja Finance under an "
    "HF-branded flow, and Keja Manage onboarding for HF's landlord and tenant customers.",
    "An anchor-partner conversation: category exclusivity in specialist housing finance "
    "for a defined period, in exchange for co-branding and joint distribution.")

# ── 3. Mortgage liquidity & payments ────────────────────────────────────────
story += h1_block("Mortgage Liquidity and Payments Infrastructure", "3", lead(
    "Two institutions sit at the plumbing layer of Kenyan housing finance and payments. "
    "Partnerships here make every downstream integration cheaper."))

partner("Kenya Mortgage Refinance Company (KMRC)",
    "The liquidity facility created to grow affordable mortgages by refinancing "
    "participating lenders against standardised criteria.",
    "KMRC's mandate succeeds when primary lenders originate more, cheaper, "
    "better-documented mortgages. Keja's eligibility engine and verification files "
    "reduce origination friction exactly where KMRC needs volume: the affordable segment.",
    "A pipeline programme: Keja-verified, pre-screened applicant-plus-property files "
    "routed to KMRC participating lenders, with Keja's affordability mathematics aligned "
    "to KMRC criteria and reporting on conversion by cohort.",
    "A technical alignment session with the lending-partnerships team and approval to "
    "route pilot files to two participating lenders.")

partner("Safaricom (M-Pesa)",
    "The rails on which Kenyan money moves, with a payments API ecosystem and a "
    "distribution reach no financial partner can match.",
    "Every Keja transaction surface—listing fees, professional subscriptions, milestone "
    "payments, rent collections—runs better on M-Pesa. Conversely, property is one of "
    "the largest unmoved categories in the ecosystem's commerce ambitions.",
    "Native M-Pesa integration across the Keja product line with a co-marketed "
    "'verified property payments' story: tenants pay verified landlords, buyers pay "
    "verified milestones, professionals pay subscriptions—all inside the rails Kenyans "
    "already trust.",
    "A developer-tier API agreement and a joint go-to-market conversation with the "
    "payments ecosystem team.")

# ── 4. Data, standards & government ─────────────────────────────────────────
story += h1_block("Data, Standards and Government Alignment", "4", lead(
    "Keja's verification layer is only as authoritative as its sources. These four "
    "collaborations make the Trust Score progressively harder to replicate."))

partner("Kenya National Bureau of Statistics (KNBS)",
    "The national statistical authority, whose price indices and housing data anchor "
    "both policy and private analysis.",
    "Keja's yield answers and valuation bands want authoritative macro anchors; KNBS "
    "methodology wants ground-truth price observations from live transactions. The "
    "exchange is structurally two-way.",
    "A data-collaboration memorandum: Keja contributes anonymised listing and "
    "transaction-level observations with declared sample sizes; KNBS methodology and "
    "indices anchor Keja's market-intelligence outputs with formal citation.",
    "An exploratory session with the statistics and methodology divisions to scope a "
    "mutually auditable exchange.")

partner("Ministry of Lands, Public Works, Housing and Urban Development",
    "The custodian of land records and the digitisation agenda that will eventually make "
    "title verification a government API call.",
    "Keja is the consumer-facing layer the digitisation effort needs for its benefits to "
    "reach citizens: records without products do not reduce fraud for a buyer holding a "
    "phone. Alignment also future-proofs the Trust Score as official data deepens.",
    "An alignment framework recognising Keja's verification methodology as a "
    "citizen-facing complement to official records, with declared data provenance and "
    "graceful degradation when records are pending—never simulated certainty.",
    "A stakeholder engagement with the lands digitisation programme to define "
    "provenance standards and a phased data roadmap.")

partner("Institution of Surveyors of Kenya (ISK)",
    "The professional body for valuers, land surveyors and property managers—the human "
    "infrastructure of Kenyan property due diligence.",
    "Keja's verification evidence chain needs licensed valuers and surveyors as the "
    "professional layer behind stamps; ISK members need digital demand for exactly those "
    "services. The professional panel in Keja Transact is designed as their channel.",
    "A professional-panel programme: ISK members listed as Keja-verified service "
    "providers, member rates on verification work routed through the platform, and "
    "co-developed standards for digital evidence packages.",
    "A standards co-development session and agreement on a pilot panel of member firms.")

# ── 5. Agencies & portals ───────────────────────────────────────────────────
story += h1_block("Agencies, Data Houses and Portals", "5", lead(
    "The incumbents who own inventory and attention. For them, Keja is not a competitor "
    "to displace but a trust layer to adopt—provided the economics respect their "
    "business model."))

partner("Hass Consult",
    "The firm behind Kenya's best-known property index, with deep valuation and "
    "research credibility and a strong agency arm.",
    "Hass's authority is research-led—exactly Keja's own language of sample sizes and "
    "methodology. Their index gains live-inventory granularity; Keja's valuations gain "
    "the anchor of the market's reference brand.",
    "A data-and-brand alliance: co-branded market intelligence combining Hass index "
    "methodology with Keja live-inventory analytics, joint quarterly publications, and "
    "Hass-verified badges flowing into Keja's professional panel.",
    "A research collaboration session and agreement on the first co-branded quarterly "
    "release.")

partner("Knight Frank Kenya",
    "The global property consultancy's Kenyan practice, strong in prime residential, "
    "commercial and institutional mandates.",
    "Knight Frank's prime-market clients increasingly demand digital evidence trails; "
    "Keja's Passport and score surfaces give their mandates a verifiable consumer face "
    "without displacing their advisory relationship.",
    "A prime-listing verification partnership: Knight Frank Kenya listings carry Keja "
    "Property Passports, and Keja's institutional portal surfaces Knight Frank research "
    "and mandates to qualified investors.",
    "A pilot covering one prime residential portfolio, with the residential team.")

partner("Pam Golding Properties Kenya",
    "The premium residential brand with strong diaspora recognition and an "
    "international referral network.",
    "Pam Golding's diaspora referrals are the exact persona Keja's diaspora portal "
    "serves remotely. Verification closes the distance-trust gap their buyers feel most.",
    "A diaspora-facing alliance: co-branded remote-verification journeys for Pam Golding "
    "Kenya listings, joint diaspora webinars, and referral flow into Keja's Deal Analyst "
    "for their international buyers.",
    "A joint diaspora-campaign pilot with the international marketing team.")

partner("BuyRentKenya",
    "Kenya's leading property portal—the incumbent whose listing flywheel Keja "
    "complements rather than replaces.",
    "Portals monetise breadth; verification depth is a new SKU they can sell to serious "
    "listers without slowing their core engine. Keja gains inventory reach; the portal "
    "gains a trust product it did not have to build.",
    "A verification-layer partnership: BuyRentKenya premium listings opt into Keja "
    "verification and carry the Trust Score with a link to the full Passport; revenue "
    "shared per verification with the portal's agent network.",
    "A commercial conversation with the product and partnerships leads, scoped to an "
    "opt-in badge pilot.")

# ── 6. Developers ───────────────────────────────────────────────────────────
story += h1_block("Developer Partners", "6", lead(
    "Developers sell trust above all—off-plan purchases are leaps of faith. Keja's "
    "Development Score and verified project profiles convert that faith into evidence, "
    "which is why developers are the supply side most motivated to engage."))

partner("Superior Homes Kenya",
    "The pioneer of gated-community development in Kenya, with a brand built on "
    "delivered promises and a legacy buyer base.",
    "A developer whose entire brand is 'we delivered what we drew' should own the "
    "verified-development story first. Their delivered projects are the perfect training "
    "and proof set for the Development Score.",
    "An anchor verification case study: Superior Homes' portfolio profiled with Keja "
    "Development Scores, delivery-history evidence panels and Passport-backed units, "
    "co-marketed as the category's trust benchmark.",
    "An anchor-developer agreement covering one flagship community, with joint "
    "case-study rights.")

partner("Optiven Limited",
    "The value-added land specialist with an investor-first sales model and a "
    "substantial opt-in client base.",
    "Optiven's buyers purchase land as an investment, sight-unseen in many cases, on "
    "the strength of the company's promises. Keja's yield analytics and verification "
    "surfaces are a natural extension of their value-add story.",
    "An investor-verification programme: Optiven projects listed with Keja Passports, "
    "Investment Score integrations for their client advisors, and joint "
    "investor-education content.",
    "A pilot on two active projects with the sales and marketing leadership.")

partner("Karibu Homes",
    "The affordable-housing developer whose model—standardised, repeated, "
    "finance-ready housing—is the closest Kenya has to production housing.",
    "Affordable-housing buyers are the most fraud-sensitive and the least served by "
    "professional due diligence; a verified, financing-ready digital pathway is "
    "tailor-made for the segment Karibu serves.",
    "A buyer-journey partnership: every Karibu unit ships with a Keja Passport, "
    "eligibility pre-matching to partner lenders, and a co-branded buyer portal that "
    "replaces anxiety with a trackable verification journey.",
    "A pilot on the next sales release, with success metrics defined jointly with the "
    "finance partners involved.")

# ── 7. Insurance & community ────────────────────────────────────────────────
story += h1_block("Insurance and Community Organisations", "7", lead(
    "Two partnerships complete the trust perimeter: risk transfer for the assets, and "
    "distribution through the communities that already move money home."))

partner("Britam Kenya",
    "The insurance and asset-management group with a home-cover franchise and an "
    "institutional investor base.",
    "Verified properties are better insurance risks—documented, valued, and "
    "title-clean. Conversely, embedded home cover is a natural add-on at the moment of "
    "verified purchase, and Britam's asset-management arm is a future Phase-3 data "
    "customer.",
    "An embedded-insurance programme: Keja-verified transactions offer Britam home "
    "cover at the point of trust, with risk-scored pricing informed by verification "
    "depth and co-branded protection for Passport holders.",
    "A product-partnership session with the general insurance and digital teams.")

partner("Kenya Diaspora Alliance",
    "The umbrella body uniting Kenyan diaspora organisations globally—the trust network "
    "through which home-bound money and information actually flows.",
    "The Alliance's mandate is protecting diaspora interests at home; Keja's remote "
    "verification and Deal Analyst screening are precisely the protection tools its "
    "members ask for. Distribution through chapters beats paid media at diaspora "
    "acquisition economics.",
    "A community programme: chapter-level webinars on verified home investment, "
    "member access to Keja's diaspora portal with prioritised verification slots, and "
    "a joint annual 'state of diaspora property trust' report.",
    "A programme agreement with the secretariat and a first chapter webinar within 60 "
    "days.")

# ── 8. Outreach sequence ────────────────────────────────────────────────────
story += h1_block("Outreach Sequence and Governance", "8", lead(
    "Twenty targets, one disciplined motion. The sequence is tiered so credibility "
    "compounds: standards bodies and data collaborations first (they make every "
    "commercial conversation easier), anchor commercial partners second, volume "
    "partners as the pilot evidence lands."))
story += make_table(
    ["Wave", "Partners", "Timing", "Success metric"],
    [
        ["Wave 1 — credibility", "KNBS, ISK, Ministry alignment, KMRC, Kenya Diaspora Alliance",
         "Weeks 1-6", "Two memoranda or programmes in motion"],
        ["Wave 2 — anchors", "HF Group, KCB, Safaricom, Superior Homes, Hass Consult",
         "Weeks 4-12", "One signed anchor pilot"],
        ["Wave 3 — volume", "Equity, NCBA, Co-op, Stanbic, remaining agencies and developers, Britam, BuyRentKenya",
         "Weeks 10-24", "Three active pilots; one converting to commercial terms"],
    ],
    ratios=[0.18, 0.44, 0.14, 0.24],
    caption="Table 8.1 — Three outreach waves with compounding credibility.")
story.append(body(
    "Governance is deliberately lightweight: a single partnerships ledger tracking every "
    "conversation against the four questions each proposal answers (who, why, what, "
    "ask), a weekly review of movement, and a rule that no partnership promise may "
    "exceed what the claims register already declares live. Pilots are scoped for "
    "ninety days with pre-agreed success metrics and a default-to-sunset clause, so "
    "that neither party accumulates zombie collaborations. Every signed partner is "
    "announced through the product itself—badges, passports and co-branded "
    "surfaces—because the partnership's marketing value should ship as code, not as "
    "press releases."))

mark_body_start(story)
build_doc(story, BODY,
          "Kenya Partner Proposals — Twenty Targets",
          "Tailored partnership proposals for twenty Kenyan institutions")

HTML = "/home/z/my-project/scripts/keja-docs/doc4_cover.html"
COVER_PDF = "/home/z/my-project/scripts/keja-docs/doc4_cover.pdf"
write_cover(
    HTML,
    kicker="Partnership Programme · Twenty Kenyan Institutions",
    hero="KEJA AI",
    summary="Twenty named partners across banking, mortgage liquidity, payments, data, "
            "standards, agencies, development, insurance and community—each with the "
            "structural fit, the specific proposal and the opening ask, sequenced so "
            "credibility compounds.",
    meta="Partnership programme document<br>"
         "<span class='lbl'>A Chacadom Investments venture</span><br>"
         "<span class='lbl'>September 2026</span>",
)
render_cover(HTML, COVER_PDF)
merge_cover(COVER_PDF, BODY, FINAL,
            "Kenya Partner Proposals — Twenty Targets",
            "Tailored partnership proposals for twenty Kenyan institutions")
print("FINAL:", FINAL)
