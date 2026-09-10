#!/usr/bin/env python3
"""Doc 2 — Keja AI Marketing Playbook (body + cover + merge)."""
import sys
sys.path.insert(0, "/home/z/my-project/scripts/keja-docs")
from keja_pdf_kit import (  # noqa: E402
    S, body, bullets, build_doc, callout_row, h1_block, h2_block, lead,
    make_table, mark_body_start, quote_box, Spacer, write_cover, render_cover,
    merge_cover,
)

BODY = "/home/z/my-project/download/keja-marketing-body.pdf"
FINAL = "/home/z/my-project/download/keja-marketing-playbook.pdf"
story = []

# 1 ─ Market snapshot
p = lead(
    "Keja AI sells trust in a market famous for the absence of it. This playbook translates "
    "that positioning into segments, messages, channels and a 90-day launch calendar that a "
    "small team can actually execute. It assumes the product surface documented in the "
    "engineering dossier: nine products, verified listings with explainable Trust Scores, "
    "trilingual AI advisory, and an installable app that works on the low-end Android "
    "devices that dominate Kenya.")
story += h1_block("Market Snapshot", "1", p)
story.append(body(
    "Kenya's property market is large, urbanising and chronically opaque. Nairobi alone "
    "absorbs the majority of formal housing demand while an estimated majority of urban "
    "land transactions still occur through informal channels with weak paper trails. "
    "Buying or renting typically means trusting a broker you met once, a title you cannot "
    "readily verify, and a price negotiated without data. The diaspora layer makes it "
    "harder still: Kenyans abroad send billions of dollars home every year — remittances "
    "have long been among the country's top foreign-exchange inflows — and real estate is "
    "consistently one of their top intended uses, yet distance multiplies every "
    "verification problem. These are structural facts, not marketing inventions, and every "
    " Keja AI message grows from one of them."))
story.append(body(
    "The competitive set splits into three groups. Listing portals (BuyRentKenya, Jiji, "
    "PigiaMe) monetise attention and leave trust to the buyer. Agency and data houses "
    "(Hass Consult, Knight Frank) publish indices and serve institutional clients at "
    "institutional prices. And the informal channel — brokers, word of mouth, family — "
    "moves most volume with zero tooling. Nobody currently owns the trust layer across "
    "all three. That is the gap this playbook attacks: not more listings, but listings "
    "you can act on."))
story += make_table(
    ["Audience truth", "Marketing consequence"],
    [
        ["Trust is the #1 unmet need — buyers fear fake titles, ghost listings, price gouging",
         "Lead every message with verification and evidence, never with listing counts"],
        ["Mobile-first, data-sensitive users on mid-range Android",
         "The PWA install story and offline mode are features to advertise, not footnotes"],
        ["WhatsApp is the default communication rail",
         "Shareable Property Passports and WhatsApp-first support beat email funnels"],
        ["Diaspora has money and anxiety in equal measure",
         "Timezone-aware service, remote verification, and 'invest from anywhere' messaging"],
        ["Swahili and English coexist; French reaches the region",
         "Trilingual product is a differentiator worth saying out loud"],
    ],
    ratios=[0.52, 0.48],
    caption="Table 1.1 — Five audience truths and what each one demands of the message.")

# 2 ─ Positioning
story += h1_block("Positioning and Value Proposition", "2", lead(
    "Positioning statement: for every stakeholder in Kenyan real estate who is tired of "
    "guessing, Keja AI is the trust infrastructure that verifies properties, scores them "
    "transparently and guides the money — because a home is too expensive to buy on faith."))
story.append(body(
    "The core value proposition compresses into one sentence per audience. For buyers and "
    "tenants: every listing carries an explainable Trust Score and a Property Passport, so "
    "you can see what you are buying before you fall in love with it. For owners and "
    "landlords: verified listings earn attention and price discipline, and the management "
    "tools collect rent and chase arrears for you. For investors and the diaspora: "
    "analysis, yields and deal screening in one workspace, with documents processed "
    "on-device. For professionals: a verification and data layer your clients can audit. "
    "The through-line is always the same — evidence over promises — and it is enforceable "
    "because the product's own claims register keeps the company honest about what is "
    "live, pilot or planned."))
story.append(quote_box(
    "Brand line: Discover. Verify. Analyse. Finance. Invest. Transact. Manage. "
    "The tagline for consumers: 'See the truth before you buy.'"))
story.append(body(
    "Tone of voice: calm, evidence-led, quietly confident — the anti-hype property brand. "
    "We never say 'revolutionary', never use urgency countdowns, never promise returns. We "
    "show the Trust Score factors, the sample sizes behind every statistic, and the "
    "evidence panels. In a market where competitors shout, restraint reads as strength, "
    "and it is a tone the engineering can actually back."))

# 3 ─ Segments
story += h1_block("Target Segments and Personas", "3", lead(
    "Seven personas cover the revenue surface. Each is defined by a trigger moment, the "
    "Keja products that serve it, and the single message that converts."))
story += make_table(
    ["Persona", "Trigger moment", "Keja products", "Converting message"],
    [
        ["First-time buyer (28-38)", "Saved a deposit; terrified of being conned",
         "Home, Verify, Finance", "Know the title is clean before you visit"],
        ["Tenant (22-35)", "Moving to Nairobi; deposits at risk",
         "Home, Verify, Tenant Hub", "Rent a home that actually exists"],
        ["Landlord (35-60)", "Arrears, empty units, agent mistrust",
         "Manage, Verify", "Rent collected, arrears chased, no surprises"],
        ["Investor (30-55)", "Idle cash; yield opacity",
         "Invest, Data, portfolio", "See the yield before the money moves"],
        ["Diaspora (25-60)", "Wants property back home; cannot inspect",
         "Diaspora portal, Verify, Deal Analyst", "Invest in Kenya from anywhere, verified"],
        ["Agent / broker", "Needs credible inventory and tools",
         "Pro workspace, listings", "Clients trust your listings because we verify them"],
        ["Developer", "Selling off-plan into scepticism",
         "Developer portal, Verify", "A Development Score buyers can audit"],
    ],
    ratios=[0.16, 0.27, 0.20, 0.37],
    caption="Table 3.1 — Persona map: trigger, product fit, and the one message that lands.")

# 4 ─ Messaging
story += h1_block("Messaging Framework", "4", lead(
    "Three message pillars, each backed by a product fact the claims register can defend. "
    "Every campaign, post and landing page maps to exactly one pillar."))
story += bullets([
    "<b>Pillar 1 — Proof.</b> 'Every property, verified.' Trust Scores from twelve labelled "
    "factors, Property Passports with ownership, title, encumbrance, rates and zoning "
    "status, evidence panels with 90-day freshness. The proof point: users can drill from "
    "any score to its factors.",
    "<b>Pillar 2 — Clarity.</b> 'Numbers you can interrogate.' Investment Scores, yield "
    "answers from live inventory with sample sizes declared, mortgage eligibility against "
    "the CBK 33% rule, and a Deal Analyst that returns Proceed / Negotiate / Investigate / "
    "High-Risk instead of vibes.",
    "<b>Pillar 3 — Reach.</b> 'Kenya's property app, in your pocket.' Installable on "
    "Android and iOS without an app store, works offline on poor connections, speaks "
    "English, Swahili and French — built for how Kenya actually gets online.",
])
story.append(body(
    "Message hierarchy by funnel stage: awareness creative leads with the emotional truth "
    "('Would you buy a house you cannot verify?'), consideration content shows the product "
    "(Property Passport walkthroughs, Deal Analyst screen recordings), and conversion "
    "moments are friction-removals (install the app in one tap; ask the AI in Swahili). "
    "Proof assets — the claims register, the trust center, the methodology pages — sit "
    "one click below every claim so scepticism converts rather than bounces."))

# 5 ─ Channels
story += h1_block("Channel Plan", "5", lead(
    "Channels are chosen for Kenya's actual media behaviour: WhatsApp first, short video "
    "second, radio still surprisingly strong, and search that is increasingly voice and "
    "Swahili-adjacent. Owned channels outrank paid throughout the launch year."))
story += make_table(
    ["Channel", "Role", "Cadence", "First-90-days tactics"],
    [
        ["WhatsApp", "Conversion + retention rail", "Daily",
         "Property Passport share cards; broadcast lists by area; click-to-chat support"],
        ["TikTok / Reels", "Awareness with 22-35s", "4-5x weekly",
         "'Scam or legit?' series; Trust Score explainers in Swahili; agent myth-busting"],
        ["Instagram", "Proof + brand", "3-4x weekly",
         "Passport carousel posts; area guides; diaspora storytelling"],
        ["Search / SEO", "Compounding intent capture", "Weekly articles",
         "Insights articles already in-product; target 'verify title Kenya' style queries"],
        ["Radio + community", "Older buyers + upcountry", "2 slots monthly",
         "Drive-time trust segments; partner with a conveyancing firm for credibility"],
        ["Agent network", "Supply + word of mouth", "Ongoing",
         "Free verified-listing tier for the first 100 partnering agents"],
        ["Diaspora orgs", "High-value acquisition", "Monthly",
         "Webinars with Kenya Diaspora Alliance chapters; timezone-friendly sessions"],
    ],
    ratios=[0.15, 0.22, 0.13, 0.50],
    caption="Table 5.1 — Channel roles and launch-quarter tactics.")

# 6 ─ 90-day launch calendar
story += h1_block("Ninety-Day Launch Calendar", "6", lead(
    "Three phases, each with a single dominant metric. The calendar assumes keja.app is "
    "live on the canonical domain and the PWA install experience is verified on real "
    "devices — both were completed in the September 2026 engineering pass."))
story += make_table(
    ["Phase", "Weeks", "Focus", "Key actions", "North-star metric"],
    [
        ["Prove", "1-4", "Make the trust story visible",
         "Publish methodology pages; ship 20 SEO articles from existing Insights content; "
         "seed the 'Scam or legit?' video series; onboarding offer for the first 100 agents",
         "Verified-listing views"],
        ["Convert", "5-8", "Turn attention into installs",
         "PWA install campaign with the offline angle; WhatsApp broadcast lists by "
         "neighbourhood; first radio slots; Deal Analyst demo days for investor groups",
         "PWA installs / weekly actives"],
        ["Compound", "9-12", "Loops and partners",
         "Saved-search alerts driving return visits; referral programme with waived "
         "verification fees; two bank or developer partnership pilots from the partner "
         "programme; begin PR with the claims register as the hook",
         "Weekly returning users"],
    ],
    ratios=[0.10, 0.08, 0.20, 0.44, 0.18],
    caption="Table 6.1 — Launch quarter: prove, convert, compound.")

# 7 ─ Growth loops
story += h1_block("Growth Loops and Retention", "7", lead(
    "Paid acquisition buys attention once; loops are what make a marketplace cheap to "
    "grow. Three loops, ranked by leverage."))
story += bullets([
    "<b>The Passport loop.</b> Every property detail page renders a shareable Property "
    "Passport card built for WhatsApp. A buyer shares it with family or a lawyer; the "
    "recipient lands on a verified listing and discovers the trust layer for themselves. "
    "Sharing is the product doing the marketing.",
    "<b>The alert loop.</b> Saved searches and Auto-Pilot inventory growth pair naturally: "
    "new listings keep arriving (the pipeline runs every six hours), alerts bring users "
    "back, and return visits deepen saved searches further. Inventory growth is already "
    "automated — the marketing only has to switch the notifications on.",
    "<b>The professional loop.</b> Agents and landlords who list verified inventory get "
    "enquiries from better-qualified buyers; the enquiry quality attracts more "
    "professional supply; more verified supply is exactly what buyers came for. The free "
    "verification tier for early agents is the seed capital for this loop.",
])
story.append(body(
    "Retention mechanics follow the same honesty principle: onboarding shows the claims "
    "register rather than hiding it, the install prompt is dismissible for fourteen days "
    "rather than nagging, and emails or WhatsApp broadcasts carry one useful thing — a "
    "new verified listing in the user's saved area, a yield answer with its sample size — "
    "never pure hype. Churn analysis starts once product analytics instrumentation lands "
    "(a tracked item in the engineering risk register), so the first quarter measures "
    "behaviour through install counts, alert engagement and share-card click-throughs "
    "rather than vanity dashboards."))

# 8 ─ KPIs
story += h1_block("KPIs and Measurement", "8", lead(
    "A small set of funnel metrics, each with a launch-quarter target that is ambitious "
    "but honest for a bootstrapped team. Targets assume the canonical domain is live and "
    "the partnership pipeline in the companion document has begun."))
story += make_table(
    ["Funnel stage", "Metric", "90-day target", "Measurement"],
    [
        ["Awareness", "Video views (TikTok/Reels)", "250,000 cumulative", "Channel analytics"],
        ["Interest", "Verified-listing views", "40,000", "On-site analytics"],
        ["Consideration", "Trust Score detail opens", "8,000", "On-site analytics"],
        ["Acquisition", "PWA installs (Android + iOS)", "3,000", "Install events"],
        ["Engagement", "Weekly returning users", "15% of installs", "Analytics events"],
        ["Supply", "Partnering agents / landlords", "100", "Account records"],
        ["Revenue signal", "Pro workspace signups", "150", "Account records"],
    ],
    ratios=[0.20, 0.30, 0.22, 0.28],
    caption="Table 8.1 — Launch-quarter funnel targets.")
story.append(body(
    "Reporting rhythm is weekly and public inside the team: one page, the seven numbers "
    "above, and a written note on the single biggest blocker. Numbers that miss two "
    "weeks running trigger a channel or message change, not a target change — the "
    "discipline that keeps a small budget honest."))

# 9 ─ Budget
story += h1_block("Budget Scenarios", "9", lead(
    "Three operating scenarios for the launch quarter. All figures are planning ranges in "
    "Kenya shillings, excluding salaries, and assume founder-led execution with "
    "contractor support rather than a hired marketing team."))
story += make_table(
    ["Line", "Lean (KSh/month)", "Standard", "Aggressive"],
    [
        ["Content production (video + design)", "40,000", "120,000", "300,000"],
        ["Paid social + search", "25,000", "100,000", "350,000"],
        ["Radio + community events", "0", "60,000", "180,000"],
        ["Tools (analytics, scheduling, CRM)", "10,000", "25,000", "60,000"],
        ["Contingency", "10,000", "30,000", "80,000"],
        ["Total", "85,000", "335,000", "970,000"],
    ],
    ratios=[0.40, 0.20, 0.20, 0.20],
    caption="Table 9.1 — Monthly budget scenarios for the launch quarter.")
story.append(body(
    "The lean scenario is deliberately viable: the product's own surfaces — Property "
    "Passports, Insights articles, the claims register — carry most of the message, and "
    "organic WhatsApp distribution costs nothing but craft. The standard scenario adds "
    "consistent paid amplification and radio credibility. The aggressive scenario only "
    "makes sense once the funnel metrics from Chapter 8 show a repeatable "
    "cost-per-install, and it should be gated on that evidence rather than optimism."))

mark_body_start(story)
build_doc(story, BODY,
          "Keja AI Marketing Playbook",
          "Marketing strategy, segments, channels and launch plan for Keja AI in Kenya")

# Cover + merge
HTML = "/home/z/my-project/scripts/keja-docs/doc2_cover.html"
COVER_PDF = "/home/z/my-project/scripts/keja-docs/doc2_cover.pdf"
write_cover(
    HTML,
    kicker="Go-To-Market · Marketing Playbook",
    hero="KEJA AI",
    summary="How Keja AI wins attention and trust in Kenya: seven personas, three message "
            "pillars, WhatsApp-first channels, a ninety-day launch calendar and honest "
            "funnel targets for a team that measures everything it claims.",
    meta="Marketing and growth · Kenya launch<br>"
         "<span class='lbl'>A Chacadom Investments venture</span><br>"
         "<span class='lbl'>September 2026</span>",
)
render_cover(HTML, COVER_PDF)
merge_cover(COVER_PDF, BODY, FINAL,
            "Keja AI Marketing Playbook",
            "Marketing strategy, segments, channels and launch plan for Keja AI in Kenya")
print("FINAL:", FINAL)
