#!/usr/bin/env python3
"""Doc 9 — Keja AI Marketing Playbook v2 (product-anchored, live-screenshot edition)."""
import sys
sys.path.insert(0, "/home/z/my-project/scripts/keja-docs")
from keja_pdf_kit import (  # noqa: E402
    S, body, bullets, build_doc, callout_row, h1_block, h2_block, lead,
    make_table, mark_body_start, quote_box, Spacer, write_cover, render_cover,
    merge_cover, Image, AVAIL_W,
)

BODY = "/home/z/my-project/download/keja-marketing-body-v2.pdf"
FINAL = "/home/z/my-project/download/keja-marketing-playbook-v2.pdf"
SHOTS = "/home/z/my-project/ad_build/shots"
story = []


def figure(png, caption, width=AVAIL_W):
    """Full-width block-level product screenshot with caption (block-level iron rule)."""
    img = Image(f"{SHOTS}/{png}", width=width, height=width * 1080.0 / 1920.0)
    img.hAlign = "CENTER"
    return [Spacer(1, 10), img, Spacer(1, 4),
            __import__("reportlab").platypus.Paragraph(caption, S["caption"]),
            Spacer(1, 8)]


# ═══════════════════════════ 1. THE MARKET, IN NUMBERS ═══════════════════════════
p = lead(
    "This is the second edition of the Keja AI marketing playbook, rewritten for one reason: "
    "the product now demonstrably exists, and every claim in these pages is anchored to a "
    "screen you can open today at keja.app. Marketing a trust product means the marketing "
    "itself must be trustworthy — so this playbook cites only verifiable market data, shows "
    "the real interface, and treats the platform's honest trial-status disclosure as a "
    "strength to be communicated, not a caveat to be hidden.")
story += h1_block("The Market, In Numbers", "1", p)

story.append(body(
    "Kenya's property market is large, urbanising and chronically opaque — the three "
    "conditions that make a trust layer valuable. The Central Bank of Kenya counted "
    "KES 674 billion (about USD 5 billion) in diaspora remittances in 2024, a 14 percent "
    "rise on the prior year, and projects roughly USD 5.24 billion for 2026; the twelve "
    "months to June 2025 alone set a record at USD 5.08 billion. Real estate is "
    "consistently among the top intended uses of that money, and distance multiplies "
    "every verification problem the money is meant to solve. On the supply side, sale "
    "prices in Nairobi rose about 8.2 percent year-on-year, led by detached homes and "
    "suburban land, while the luxury apartment segment in areas like Kilimani sits in "
    "oversupply with compressed yields — buyers there need exactly the price evidence "
    "and area intelligence Keja publishes. And the structural deficit is unchanged: a "
    "housing shortfall above two million units, urbanisation near 4.4 percent a year, "
    "and a mortgage market so shallow (roughly 3 percent of GDP) that only about one in "
    "nine Kenyans can realistically service a mortgage. Cash-and-trust, not credit, is "
    "how this market actually transacts."))
story.append(callout_row([
    ("$5.08B", "diaspora remittances, 12 months to Jun 2025 (CBK)"),
    ("+8.2%", "Nairobi sale prices, year-on-year"),
    ("2M+", "national housing deficit"),
    ("~11%", "of Kenyans can afford a mortgage"),
]))
story.append(body(
    "The competitive set has not moved. Listing portals — BuyRentKenya (East Africa's "
    "most-trafficked dedicated property portal, backed by ROAM Group), Jiji, "
    "Property24 — monetise attention and leave trust to the buyer. Agency and data "
    "houses (Hass Consult, Knight Frank) publish respected indices and serve "
    "institutional clients at institutional prices. The informal channel — brokers, "
    "word of mouth, family — still moves most volume with zero tooling. Nobody owns "
    "the trust layer across all three. That is the gap this playbook attacks: not "
    "more listings, but listings you can act on."))

# ═══════════════════════════ 2. THE PRODUCT, PROVEN ═══════════════════════════
p = lead(
    "The strongest marketing asset Keja has is the product itself. This chapter is the "
    "evidence base: the live interface, photographed from the production site, with the "
    "claims register — the platform's public honesty contract — quoted exactly as "
    "users see it. Every screenshot below was captured from keja.app in September 2026.")
story += h1_block("The Product, Proven", "2", p)

story.append(body(
    "Keja AI is a nine-product ecosystem on one installable app: Discover, Verify "
    "(Trust Score and evidence panels), Ask Keja AI (a deterministic, honesty-labelled "
    "advisory engine), the Deal Analyst, the Investment Calculator suite, Finance "
    "centre, Keja Tokenize (a clearly-labelled simulation), Landlord Studio and "
    "Tenant Hub, and the diaspora corridor tools. The marketing story writes itself "
    "when the product does the demonstrating — so the first rule of this playbook is "
    "that demo content must come from the real interface, never from stock imagery."))
story += figure("01-home-hero.png",
                "Figure 2.1 — The live homepage at keja.app: \u201cDiscover. Verify. Analyse. "
                "Finance. Invest. Transact. Manage.\u201d One intelligent ecosystem.")
story.append(body(
    "Natural-language search is the product's most quotable capability, and it is "
    "live: the parser behind it is covered by unit tests, and the claims register "
    "says so. Marketing demonstrations should always use the platform's own "
    "advertised example — \u201c2BR Kilimani under 15M\u201d — because it is the query "
    "reviewers will try first when they check the claims."))
story += figure("05-nl-search.png",
                "Figure 2.2 — Natural-language search in production: \u201c2BR Kilimani under "
                "15M\u201d parsed into structured filters, with Trust Scores surfaced on every card.")
story.append(body(
    "Every listing carries two zero-to-ten dials — the Trust Score and the Investment "
    "Score — each computed by a versioned, deterministic engine whose factors carry "
    "FACT, ESTIMATE and ASSUMPTION labels. When an area has thin comparable data, the "
    "platform says so instead of inventing decimal precision. This honesty system is "
    "the differentiator every other portal lacks, and it is the spine of all "
    "messaging."))
story += figure("07-trust-score.png",
                "Figure 2.3 — A live listing: the Trust Score breakdown with labelled factors, "
                "alongside price, area intelligence and the Investment Score.")
story.append(quote_box(
    "The register is the machine-readable answer: every capability claim the product "
    "makes is declared with a status, an evidence pointer, and the date it was last "
    "reviewed. The public site can never silently drift from this list without a "
    "code change that reviewers can see. — Keja AI claims register, Trust Center"))
story.append(body(
    "Ask Keja AI is the third screenshot every campaign should carry. It answers "
    "property questions with citations and epistemic labels, and it escalates legal, "
    "tax, valuation and suitability questions to humans instead of guessing. In a "
    "market where the alternative is a WhatsApp forward from a cousin, a labelled, "
    "traceable answer is a category of one."))
story += figure("10-ask-answer.png",
                "Figure 2.4 — Ask Keja AI answering a live investment question with labelled "
                "guidance and follow-up actions.")

# ═══════════════════════════ 3. POSITIONING ═══════════════════════════
p = lead(
    "Positioning is a decision about which fight to pick. Keja does not fight portals "
    "for listing volume; it fights the market's trust deficit. The one-line position: "
    "\u201cKeja AI is Africa's real-estate trust and intelligence layer — every listing "
    "carries evidence, every number carries its label, every question gets an honest "
    "answer.\u201d")
story += h1_block("Positioning and Message Architecture", "3", p)

story += make_table(
    ["Pillar", "Message", "Proof to show"],
    [
        ["Trust you can see",
         "\u201cEvery listing carries a Trust Score you can open, question and "
         "challenge — twelve labelled factors, published weights, no black box.\u201d",
         "Trust dial screenshot; Trust Center; claims register"],
        ["Numbers that admit what they are",
         "\u201cFACT, ESTIMATE, ASSUMPTION — every figure says which. Thin data "
         "shows the band, not a false decimal.\u201d",
         "Investment Score factors; thin-data confidence chips"],
        ["Answers, not guesses",
         "\u201cAsk in plain English or Kiswahili; get a cited, deterministic answer "
         "that escalates legal questions to humans.\u201d",
         "Ask Keja AI transcript; escalation copy"],
        ["Built for how Kenya transacts",
         "\u201cWorks on low-end Android, installs as an app, WhatsApp-first sharing, "
         "offline-capable.\u201d",
         "PWA install flow; WhatsApp float; Property Passport share cards"],
    ],
    ratios=[0.18, 0.47, 0.35],
    caption="Table 3.1 — Message architecture: four pillars, each anchored to a live proof surface.")
story.append(body(
    "Tone of voice follows the product's own register: confident, plain-spoken, "
    "evidence-first, never breathless. Kenyan English with Kiswahili where it lands "
    "naturally — \u201ckeja\u201d is already the word for home. The trial-platform "
    "disclosure is stated once, plainly, in every asset: demo inventory, real "
    "engineering. That sentence converts skeptics precisely because competitors "
    "cannot say it."))

# ═══════════════════════════ 4. AUDIENCES ═══════════════════════════
p = lead(
    "Seven segments, three of which are launch-critical. Each persona below is "
    "paired with the exact product surface that converts it and the channel where "
    "it is reachable — so every campaign maps a real person to a real screen.")
story += h1_block("Audiences and Personas", "4", p)
story += make_table(
    ["Persona", "Pain", "Keja surface", "Channel"],
    [
        ["First-time Nairobi buyer",
         "Fears fake titles, price gouging",
         "Trust Score + evidence panel + Deal Analyst",
         "WhatsApp, TikTok, radio"],
        ["Upgrading family",
         "Needs school-run math, not hype",
         "Area guides + Investment Calculator",
         "Search, Facebook, school networks"],
        ["Diaspora buyer (UK/US/UAE)",
         "Cannot view, verify or close at distance",
         "Diaspora Hub: scheduling, PoA, remit math",
         "Diaspora orgs, YouTube, WhatsApp"],
        ["Renting professional",
         "Ghost listings, opaque deposits",
         "Tenant Hub + verified rentals",
         "Instagram, WhatsApp, workplace"],
        ["Landlord / small portfolio",
         "Arrears, statements, vacancies",
         "Landlord Studio",
         "WhatsApp business groups, radio"],
        ["Agent / broker",
         "Wants credibility and leads",
         "KEJA PRO: CMA, listing writer, CRM",
         "Direct outreach, associations"],
        ["Developer",
         "Needs pre-sale evidence and feasibility",
         "Developer Console + off-plan listings",
         "Direct, industry events"],
    ],
    ratios=[0.20, 0.27, 0.29, 0.24],
    caption="Table 4.1 — Seven personas, their pain, the converting surface, and the channel.")
story.append(body(
    "The launch-critical three are the first-time buyer, the diaspora buyer and the "
    "agent. The first-time buyer supplies volume and word-of-mouth; the diaspora "
    "supplies intent and dollar budgets; agents supply inventory and credibility. "
    "The other four segments are harvest-ready but should not fragment the launch "
    "calendar, which is why they appear only in the always-on channel plan."))

# ═══════════════════════════ 5. CHANNELS ═══════════════════════════
p = lead(
    "Channels are chosen for cost-per-trust, not cost-per-impression. Kenya's "
    "default communication rail is WhatsApp; the plan treats it as the primary "
    "distribution network, with search-engine-optimised content pages as the "
    "compounding asset and paid media as the accelerant that is only switched on "
    "after the funnel proves itself.")
story += h1_block("Channel Plan", "5", p)
story += h2_block("WhatsApp-first distribution", body(
    "Every Property Passport, Trust Score breakdown and Ask Keja transcript is "
    "shareable as a link that opens correctly on a low-end Android browser — and "
    "the platform ships a WhatsApp deep-link float on every page. The playbook's "
    "first campaign is a set of ten shareable \u201cPassport Cards\u201d — one image, "
    "one Trust Score, one QR link to the live evidence page — designed to be "
    "forwarded in the family groups where property decisions actually happen. "
    "Distribution cost: the craft of making them worth forwarding."))
story += h2_block("Search and the content moat", body(
    "The site pre-renders over one hundred static pages — listing passports, area "
    "guides, insights articles — precisely so search engines can index them. The "
    "content calendar in Chapter 6 feeds this: every insight article targets a "
    "question a real buyer types (\u201chow to verify a title deed in Kenya\u201d, "
    "\u201cKilimani vs Kileleshwa for investment\u201d), and every article ends at a "
    "live product surface. SEO is the only channel whose cost falls as its output "
    "accumulates."))
story += h2_block("Paid media, gated on evidence", body(
    "A modest paid layer — boosted WhatsApp cards, targeted search ads on "
    "verification-intent keywords, and short-form video of the product in use — is "
    "budgeted but gated: it switches on only when organic funnel data establishes "
    "a repeatable cost-per-install. Until then the budget sits in content and "
    "partnerships, which compound."))

# ═══════════════════════════ 6. 90-DAY CALENDAR ═══════════════════════════
p = lead(
    "The calendar is sequenced so that every phase ends with a measurable gate, and "
    "no phase starts until the previous gate has been met. Ninety days, three "
    "phases, each with its own definition of done.")
story += h1_block("The Ninety-Day Launch Calendar", "6", p)
story += make_table(
    ["Phase", "Focus", "Ships", "Gate to pass"],
    [
        ["Days 1–30\nSeed",
         "Content engine + WhatsApp cards + onboarding polish",
         "10 Passport Cards; 6 insight articles; founder video walkthrough of the "
         "Trust Score; press one-pager",
         "200 organic sessions/day; 3% of visitors open a Trust Score panel"],
        ["Days 31–60\nProof",
         "Diaspora corridor + agent outreach",
         "UK/US corridor campaign; 25 agent onboarding calls; first 10 PRO "
         "workspaces; demo events",
         "50 saved searches; 10 agents actively listing; CAC on paid test ≤ KES 150"],
        ["Days 61–90\nScale",
         "Paid amplification + partnerships",
         "Paid layer on; partner co-marketing (see proposals document); "
         "radio segment; case studies",
         "1,000 weekly actives; 30% week-4 retention; NPS ≥ 40"],
    ],
    ratios=[0.13, 0.25, 0.34, 0.28],
    caption="Table 6.1 — Ninety days, three gates. No phase begins until the prior gate is met.")

# ═══════════════════════════ 7. METRICS ═══════════════════════════
p = lead(
    "A trust product must measure trust, not just traffic. The metric tree pairs "
    "every growth number with the honesty number that keeps it credible.")
story += h1_block("Metrics That Matter", "7", p)
story += make_table(
    ["Layer", "Metric", "Target (90 days)", "Guardrail"],
    [
        ["Acquisition", "Organic sessions/day", "1,000", "Bounce < 55%"],
        ["Engagement", "Trust Score panels opened", "30% of listing views", "—"],
        ["Engagement", "Ask Keja questions/session", "≥ 2", "Escalation rate healthy (5–15%)"],
        ["Retention", "Week-4 return", "30%", "Notification opt-in ≥ 40%"],
        ["Trust", "Issues reported per 100 listings", "tracked, published", "Response SLA 48h"],
        ["Supply", "Active agent workspaces", "25", "Zero fabricated-verification incidents"],
    ],
    ratios=[0.16, 0.30, 0.24, 0.30],
    caption="Table 7.1 — Growth metrics paired with trust guardrails. Publishing the trust "
            "metrics is itself a marketing act.")

# ═══════════════════════════ 8. CREATIVE ASSETS ═══════════════════════════
p = lead(
    "The asset library exists to keep every touchpoint on-register: one film, one "
    "founder video, ten cards, one press kit. All product imagery comes from the "
    "live site — the screenshots in Chapter 2 are the source of truth and the "
    "brand's only permitted \u201cstock\u201d.")
story += h1_block("Creative Assets", "8", p)
story += bullets([
    "<b>The launch film (75–90 s).</b> Built entirely from real product screens — the "
    "natural-language search answering \u201c2BR Kilimani under 15M\u201d, the Trust Score "
    "opening, the evidence panel, Ask Keja answering a question. Voiceover in plain "
    "Kenyan English; music licensed; end-card on the keja.app URL.",
    "<b>Founder video (3 min).</b> Unscripted walkthrough of one listing's evidence "
    "panel, ending on the claims register. Trust products are sold by faces, not "
    "logo animations.",
    "<b>Ten Passport Cards.</b> Static, WhatsApp-forwardable, each ending in a QR to "
    "the live evidence page.",
    "<b>Press kit.</b> The platform review PDF, three screenshots, the claims "
    "register as a one-pager, and the founder bio.",
    "<b>Radio script (60 s).</b> One pain (fake listings), one promise (evidence "
    "you can open), one URL.",
])

# ═══════════════════════════ 9. THE HONEST EDGE ═══════════════════════════
p = lead(
    "Most marketing playbooks end with a budget. This one ends with the discipline "
    "that makes the budget work: never claim what the register cannot back. The "
    "trial platform says so plainly, and so does every asset.")
story += h1_block("The Honest Edge", "9", p)
story.append(body(
    "Every competitor can buy billboards. None of them can publish a claims "
    "register that says which of their features are live, which are simulated, and "
    "which are planned — because none of them have built the engineering honesty "
    "to survive it. That is Keja's defensible marketing position: the platform "
    "whose marketing is subject to the same audits as its product. When the "
    "campaign says \u201cTrust you can open\u201d, the register is what makes it true, "
    "and the ninety-day calendar is how Kenya finds out."))
story.append(quote_box(
    "Demo inventory, real engineering. Say it once, plainly, in every asset — "
    "and let the evidence panels do the rest."))

mark_body_start(story)
build_doc(story, BODY,
          "Keja AI Marketing Playbook v2",
          "Product-anchored marketing strategy for Keja AI — evidence-first positioning, "
          "seven personas, WhatsApp-first channels and a gated 90-day calendar")

HTML = "/home/z/my-project/scripts/keja-docs/doc9_cover.html"
COVER_PDF = "/home/z/my-project/scripts/keja-docs/doc9_cover.pdf"
write_cover(
    HTML,
    kicker="Go-To-Market · Marketing Playbook · Edition 2",
    hero="KEJA AI",
    summary="The product-anchored edition: live screenshots, verifiable market data, four "
            "message pillars, seven personas, WhatsApp-first channels and a gated "
            "ninety-day calendar for a platform whose marketing is audited like its code.",
    meta="Marketing and growth · Kenya launch<br>"
         "<span class='lbl'>A Chacadom Investments venture</span><br>"
         "<span class='lbl'>September 2026 · Edition 2</span>",
)
render_cover(HTML, COVER_PDF)
merge_cover(COVER_PDF, BODY, FINAL,
            "Keja AI Marketing Playbook v2",
            "Product-anchored marketing strategy for Keja AI — evidence-first positioning, "
            "seven personas, WhatsApp-first channels and a gated 90-day calendar")
print("FINAL:", FINAL)
