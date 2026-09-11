# -*- coding: utf-8 -*-
"""Content modules 1: Executive Summary, Methodology, Product Overview."""

CHAPTERS = []

# =====================================================================
CHAPTERS.append({
    "part": "Part I - Executive Summary and Engagement Context",
    "title": "Executive Summary",
    "blocks": [
        ("lead", "This report is the Phase 2 deliverable for the Keja AI platform: a full-depth technical audit of the "
                 "<b>gadda00/keja-ai</b> repository, conducted from the perspective of a senior, multi-disciplinary "
                 "engineering team. Phase 1 (August-September 2026) took the platform from concept to a production "
                 "deployment on Vercel serving keja.app, with a working PWA, a CI/CD pipeline, and a self-growing "
                 "listing inventory. Phase 2 is the moment to slow down, read every corner of the codebase honestly, "
                 "and decide what must be true of this platform before it can accept real money, real identity "
                 "documents, and real landlords. This document is that read, in full."),
        ("h2", "The platform in one paragraph"),
        ("body", "Keja AI is a rental-property marketplace for Kenya, named after the Swahili word for home. It is "
                 "implemented as a Next.js 16 static-export single-page application: one HTML shell, 52 hashed asset "
                 "chunks, a custom hash router driving 32 views, and a complete absence of any server-side runtime. "
                 "All state - authentication, listings, landlord ledgers, tenant applications, a tokenization sandbox "
                 "with KYC forms - persists in browser localStorage under namespaced keys. The deployment pipeline is "
                 "genuinely strong for a project of this maturity: GitHub Actions gates every push with typecheck, "
                 "lint, and a static build; Vercel serves the artifact with hardened security headers; an hourly "
                 "monitor verifies liveness; and a cron-driven Auto-Pilot pipeline grows the listing inventory four "
                 "times a day through audited, quality-gated commits. The codebase is 33,253 lines of TypeScript "
                 "across 136 source files, supported by 435 tracked files including full Android and iOS Capacitor "
                 "shells and an unusually complete documentation suite."),
        ("stats", [("435", "files tracked in git"), ("33,253", "lines of TS/TSX in src/"),
                   ("32", "hash-routed views"), ("0", "server-side endpoints")]),
        ("h2", "Headline conclusions"),
        ("body", "The audit team reached five conclusions with high confidence. First, <b>the platform is an excellent "
                 "demo and a credible seed, but it is not yet a product</b>: every feature that implies a transaction - "
                 "bookings, messages, payments, KYC, escrow - is a browser-local simulation that never leaves the "
                 "device. Second, <b>the engineering discipline visible in the code is well above average for this "
                 "stage</b>: zero uses of <i>any</i> and <i>@ts-ignore</i> across the entire source tree, a coherent "
                 "documented store architecture, honest data-labelling conventions, and strong accessibility "
                 "hygiene. Third, <b>the platform's largest technical debts are invisible to users but decisive for "
                 "the business</b>: hash routing makes all 87 property pages invisible to search engines, the "
                 "production build ships with no sitemap despite robots.txt declaring one, and there is no error "
                 "tracking or product analytics in production at all. Fourth, <b>the testing story regressed "
                 "catastrophically during the Next.js rebuild</b>: 23 test suites totalling 3,039 lines existed in "
                 "early September and were deleted in the migration commit, leaving the platform with zero automated "
                 "tests today. Fifth, <b>two security exposures become critical the moment real users arrive</b>: "
                 "passwords are stored with a reversible, unsalted DJB2 hash in localStorage, and the KYC form "
                 "collects national ID numbers and source-of-funds declarations into the same plaintext store - a "
                 "combination that would fall foul of the Kenya Data Protection Act 2019 if exercised with real "
                 "data."),
        ("callout", "<b>The core strategic judgment of this audit:</b> Keja AI's static-first architecture was the "
                    "right call for Phase 1 - it produced an offline-capable, installable, cheap-to-run platform in "
                    "weeks. The same architecture is the wrong call for Phase 2. The platform now needs one "
                    "well-defined seam - a typed API layer in front of PostgreSQL, Prisma, and M-Pesa - while "
                    "keeping the entire existing client surface. The store abstraction already in the codebase "
                    "makes this migration incremental rather than a rewrite."),
        ("h2", "The ten findings that matter most"),
        ("table", {
            "cols": [0.09, 0.14, 0.49, 0.28],
            "align": ['c', 'c', 'l', 'l'],
            "caption": "The audit's top ten findings, ranked by consequence (full register: Chapter 23).",
            "header": ["Rank", "Severity", "Finding", "Primary chapter"],
            "rows": [
                ["1", "Critical", "Passwords stored with reversible DJB2 hash; open registration accepts real credentials", "Ch. 12 Security"],
                ["2", "Critical", "KYC collects national ID and source-of-funds into plaintext client storage", "Ch. 12, 12"],
                ["3", "Critical", "All 87 listing pages, articles, and guides invisible to search engines", "Ch. 17 SEO"],
                ["4", "Critical", "Zero automated tests; the pre-rebuild safety net was deleted in the migration", "Ch. 22 Testing"],
                ["5", "High", "Admin console renders without any authentication check", "Ch. 12 Security"],
                ["6", "High", "No Content-Security-Policy on an otherwise well-hardened edge", "Ch. 12 Security"],
                ["7", "High", "sitemap.xml missing while robots.txt declares it; serves HTML at 200", "Ch. 17 SEO"],
                ["8", "High", "No production error tracking or analytics of any kind", "Ch. 21 Observability"],
                ["9", "High", "recharts shipped twice (~300 KB) plus ~5 MB dead imagery on the CDN", "Ch. 16 Performance"],
                ["10", "High", "Primary conversion CTAs are toast stubs; only WhatsApp is real", "Ch. 18 UX"],
            ],
        }),
        ("h2", "What is working well"),
        ("body", "It is worth stating clearly, before the findings register fills the next hundred pages, how much of "
                 "this repository is genuinely good engineering. The service worker implementation is in the top "
                 "tier of what the audit team sees in production PWAs: content-hash versioning stamped into the "
                 "file at build time, a three-tier caching strategy with an eight-second network timeout, a real "
                 "offline fallback page, and seventeen iOS launch screens covering every device class. The "
                 "accessibility work - 393 ARIA attributes, a focus-trap utility with stacked-dialog awareness, a "
                 "skip link, labelled forms, and consistent icon semantics - exceeds what most commercial "
                 "marketplaces ship. The honesty system (a machine-readable claims register, FACT/ESTIMATE/"
                 "ASSUMPTION labelling in the AI engine, trust ceilings that cap synthetic listings below verified "
                 "ones) is a genuine differentiator in a market where listing fraud is the primary user complaint. "
                 "And the operational documentation - deployment runbooks, a domain migration forensic record, a "
                 "data dictionary, twenty partner proposals - would be the envy of teams ten times this size."),
        ("h2", "What must change"),
        ("body", "The audit registers 47 findings across seven domains: 4 Critical, 13 High, 22 Medium, and 8 Low. "
                 "The Critical findings cluster around credential storage, KYC data exposure, search invisibility, "
                 "and the absence of any regression safety net. The High findings include an ungated administration "
                 "console, a missing Content-Security-Policy, a sitemap that returns HTML with a 200 status, zero "
                 "production observability, duplicated charting code shipping roughly 300 KB of redundant "
                 "JavaScript, and five megabytes of dead WebP imagery deployed to the CDN. None of these are "
                 "difficult fixes in isolation; the risk is compounding. A platform that cannot see its own errors, "
                 "cannot be found by search, and cannot verify that a refactor did not break the mortgage "
                 "calculator is a platform whose iteration speed is borrowed against future incident cost."),
        ("table", {
            "cols": [0.16, 0.34, 0.28, 0.22],
            "align": ['c', 'l', 'l', 'l'],
            "caption": "Top-level audit scorecard by domain (1 = weak, 5 = strong).",
            "header": ["Domain", "Verdict", "Score", "Defining evidence"],
            "rows": [
                ["Architecture", "Coherent, honest, and at its ceiling; needs the Phase 2 seam", "3.5",
                 "Static export + hash router + localStorage; mini-services empty"],
                ["Code quality", "Clean surface, weakened gates, heavy deadwood", "3.0",
                 "0 any/@ts-ignore; 26 lint rules disabled; 4,243 LOC dead UI"],
                ["Security", "No server attack surface; client-side trust is decorative", "2.0",
                 "DJB2 password hash; #/admin ungated; no CSP"],
                ["Data and persistence", "Well-modelled locally; no persistence layer exists", "2.0",
                 "Prisma scaffold untouched; 28 localStorage keys"],
                ["PWA and mobile", "Top-tier implementation", "4.5",
                 "SW versioning; 17 iOS splashes; Capacitor shells"],
                ["Performance", "Acceptable today, wasteful under the hood", "3.0",
                 "611 KB initial JS; recharts shipped twice"],
                ["SEO", "Effectively dark to search engines", "1.5",
                 "Hash routing; sitemap 404-as-HTML; no JSON-LD"],
                ["Testing", "Zero automated tests today", "1.0",
                 "3,039 LOC of suites deleted in rebuild commit"],
                ["DevOps and CI/CD", "Strong gates, no previews, blind in production", "3.5",
                 "tsc+lint+build gates; hourly monitor; no Sentry"],
            ],
        }),
        ("h2", "How to read this report"),
        ("body", "The report is organised in six parts. Part I (this summary, the engagement context, and the "
                 "product overview) frames what was audited and how. Part II assesses the system as built: "
                 "architecture, technology stack, and source inventory. Part III reads the code closely: "
                 "TypeScript quality, component architecture, and the state layer. Part IV covers security, data "
                 "modelling, and regulatory exposure under the Kenya Data Protection Act. Part V evaluates every "
                 "user-facing and operational discipline: PWA, performance, SEO, accessibility, mobile, DevOps, "
                 "observability, and testing. Part VI consolidates the findings register and delivers the "
                 "recommendations: a Phase 2 target architecture, an engineering excellence plan, a sequenced "
                 "90-day action plan, and a risk register. Five appendices provide the raw inventories - routes, "
                 "storage keys, dependencies, documents, and methodology - so that every claim in the body of this "
                 "report can be traced to something countable in the repository."),
    ],
})

# =====================================================================
CHAPTERS.append({
    "title": "Engagement, Scope and Methodology",
    "blocks": [
        ("h2", "Engagement context"),
        ("body", "Keja AI reached its Phase 1 conclusion on 10 September 2026, with commit 86e2a66 promoted to "
                 "production on Vercel under the keja.app domain, the Netlify infrastructure retired, and all four "
                 "GitHub Actions workflows green. The platform owner then commissioned this Phase 2 engagement "
                 "with a deliberately broad mandate: return to the repository as a highly skilled team of "
                 "professionals would, analyse everything, and produce a detailed technical report - including "
                 "deeply researched recommendations and improvements - that could serve as the engineering agenda "
                 "for the next phase of the product. This document is that report. It is written to be actionable: "
                 "every finding cites files and line ranges, every recommendation is sequenced and sized, and the "
                 "closing chapters provide a 90-day plan that a small team can execute without further discovery."),
        ("h2", "Scope"),
        ("body", "The audit covers the entire git-tracked surface of the repository at commit 86e2a66: 435 files "
                 "spanning the Next.js application source, the build and deployment configuration, the GitHub "
                 "Actions workflows, the Prisma schema, the Capacitor Android and iOS projects, the public assets "
                 "including the service worker and manifest, the operational scripts including the Auto-Pilot "
                 "listing pipeline, and the documentation suite. The production build artifact (the 21 MB static "
                 "export) was sampled to measure real bundle composition. Git history - all 106 commits - was "
                 "read to reconstruct decisions and identify regressions, most significantly the loss of the "
                 "pre-rebuild test suite. Out of scope: load testing, penetration testing, user research, and "
                 "financial modelling of the business itself. The audit examined the code as deployed, not merely "
                 "as written; where the two differ (for example, the sitemap generator that exists as a script "
                 "but never runs in CI), the deployed behaviour is treated as the truth."),
        ("h2", "Method"),
        ("body", "The audit was executed as four parallel workstreams, mirroring how a professional platform team "
                 "would divide a review: architecture and technology stack; code quality and implementation; "
                 "security, data model, and backend; and frontend experience, PWA, performance, SEO, and DevOps. "
                 "Each workstream combined automated measurement (git inventory, line counts, bundle analysis, "
                 "targeted greps for vulnerability patterns such as dangerouslySetInnerHTML, hardcoded secrets, "
                 "and disabled compiler flags) with close reading of the significant files - the 1,049-line "
                 "conversational engine, the 556-line authentication layer, the service worker, the deploy "
                 "workflow, and the Prisma schema among them. Findings were then cross-verified between "
                 "workstreams, consolidated into a single register with severities, and mapped to a remediation "
                 "roadmap. External research - current Next.js rendering guidance, Safaricom Daraja integration "
                 "requirements, Kenya Data Protection Act registration obligations, and 2026 testing-stack "
                 "conventions - grounds the recommendations in present-day practice rather than audit-team "
                 "preference."),
        ("table", {
            "cols": [0.22, 0.44, 0.34],
            "align": ['l', 'l', 'l'],
            "caption": "Audit workstreams, techniques, and primary outputs.",
            "header": ["Workstream", "Techniques applied", "Primary outputs"],
            "rows": [
                ["A - Architecture and stack",
                 "git ls-files inventory; config forensics (next.config.ts, vercel.json, tsconfig, eslint); route table extraction; dependency usage analysis",
                 "Route inventory; dead dependency list; architecture assessment; repo hygiene findings"],
                ["B - Code quality and testing",
                 "LOC metrics; pattern greps (any, ts-ignore, non-null assertions, console, TODO); component import graph; git archaeology of the deleted test suites; lint configuration review",
                 "Quality findings with file:line citations; testing gap analysis; dead component register"],
                ["C - Security and data",
                 "Full Prisma schema read; secrets sweep across all 106 commits; OWASP 2021 mapping; localStorage key enumeration; XSS vector grep; workflow script-injection review",
                 "Findings table with OWASP categories; data model gap analysis; Kenya DPA exposure points"],
                ["D - Frontend and operations",
                 "Bundle measurement from out/; PWA checklist against current installability criteria; SEO surface inspection (metadata, sitemap, JSON-LD); a11y attribute census; workflow and header analysis",
                 "Bundle tables; PWA pass/fail matrix; SEO and observability findings; DevOps maturity notes"],
            ],
        }),
        ("h2", "Severity model"),
        ("body", "Findings are rated on a four-point scale anchored to business consequence rather than code "
                 "aesthetics. <b>Critical</b> findings either expose real users to concrete harm if the platform "
                 "scales as intended, or block a primary business channel outright. <b>High</b> findings "
                 "materially degrade security, growth, velocity, or reliability, and will predictably become "
                 "incidents if unaddressed. <b>Medium</b> findings waste effort, budget, or user patience, and "
                 "compound quietly. <b>Low</b> findings are hygiene: they matter to craftspeople and to anyone "
                 "who inherits this code, but they will not decide the fate of the platform. Severity is assigned "
                 "to the finding as it stands today, not as it might become; where a latent issue turns critical "
                 "only upon a specific trigger (for example, the first real user entering a real password), the "
                 "register says so explicitly."),
        ("h2", "Limitations"),
        ("body", "Three limitations bound this audit. First, it is a static analysis: no dynamic testing, "
                 "penetration testing, or user observation was performed, and runtime behaviours are inferred from "
                 "code and build artifacts rather than instrumented sessions. Second, the audit deliberately did "
                 "not modify the repository; every recommendation in Part VI remains to be implemented, and "
                 "effort estimates are therefore planning-grade rather than committed. Third, market and "
                 "regulatory judgements - competitor positioning, CMA sandbox prospects, ODPC enforcement risk - "
                 "rely on published sources current as of September 2026 and should be re-validated with local "
                 "counsel before being relied upon in investment or launch decisions. None of these limitations "
                 "materially softens the code-level findings, which rest on direct evidence in the repository."),
    ],
})

# =====================================================================
CHAPTERS.append({
    "title": "Product and Platform Overview",
    "blocks": [
        ("h2", "What Keja AI is"),
        ("body", "Keja AI positions itself as an AI-assisted rental platform for Kenya - a marketplace where "
                 "tenants find verified homes, landlords manage units and rent, and investors analyse yields, "
                 "with a WhatsApp-first communication culture and an explicit design bias toward the constraints "
                 "of the Kenyan market: intermittent connectivity, Android-dominant devices, M-Pesa as the "
                 "payment rail, and deep-seated distrust of listing fraud. The product umbrella is broad for a "
                 "platform this young: the marketing surface describes nine products across four portals, from "
                 "the core property search through a deal-analyst document screener, an investment calculator "
                 "and portfolio dashboard, a tenant hub, a diaspora hub, a developer portal, an institutional "
                 "portal, a valuation desk, and a tokenization sandbox aimed eventually at the CMA regulatory "
                 "sandbox. This breadth is strategically deliberate - the STRATEGY.md document argues a "
                 "Kenya-first, trust-first wedge - but it means the audit must repeatedly distinguish between "
                 "surfaces that are real, surfaces that are honest simulations, and surfaces that are aspiration "
                 "wearing a UI."),
        ("table", {
            "cols": [0.20, 0.12, 0.34, 0.34],
            "align": ['l', 'c', 'l', 'l'],
            "caption": "The nine-product surface, classified by implementation reality as of commit 86e2a66.",
            "header": ["Product surface", "Route", "Implementation reality", "Server dependency required next"],
            "rows": [
                ["Property search", "#/properties", "Real: 87 merged listings, facets, sorting, compare, saved searches with local alert matching", "None (data freshness only)"],
                ["Listing detail", "#/properties/:id", "Real: gallery, trust breakdown, passport, inline mortgage calculator", "Lead capture form"],
                ["Ask Keja (AI advisor)", "#/ask", "Offline rule-based engine, 1,049 LOC, EN/SW/FR, escalation guard to WhatsApp", "Optional LLM upgrade path"],
                ["Deal Analyst", "#/deal-analyst", "On-device document pre-screening heuristics", "Server-side parsing and persistence"],
                ["Investor tools", "#/invest, #/portfolio", "Full calculators, portfolio dashboard, recharts visualisations - all client-side", "Real market data feeds"],
                ["Landlord management", "#/manage", "Units, tenants, payment ledger, maintenance tickets - localStorage only", "Multi-device sync, M-Pesa reconciliation"],
                ["Tenant hub", "#/tenant", "Applications with income/employer data - localStorage only", "Submission API, landlord notification"],
                ["Tokenization trial", "#/tokenize", "Trial wallet (USD 25,000 credits), KYC form, order book simulation", "CMA sandbox, custody, real ledger"],
                ["Finance / transact", "#/finance, #/transact", "Mortgage and affordability calculators; transaction flow is presentational", "PSP integration, escrow model"],
            ],
        }),
        ("h2", "User journeys as built"),
        ("body", "The primary tenant journey is fully functional as a client-side experience: search by area, "
                 "type, price, and trust score; open a listing with a verification evidence panel and freshness "
                 "chips; save favourites and comparisons; then either start a WhatsApp conversation with a "
                 "prefilled listing reference or hit the book-a-viewing button - which, today, shows a toast and "
                 "nothing else. The landlord journey mirrors property-management software: register units, "
                 "record tenants and rent payments against an M-Pesa/cash/bank channel ledger, raise maintenance "
                 "tickets, and read dashboard metrics computed on-device. The investor journey provides yield "
                 "mathematics honest enough to be useful - correct amortisation, named Kenyan cost constants, a "
                 "KES/USD peg - with every number derived from the seeded catalog rather than live market data. "
                 "The critical structural fact across all journeys is that <b>no data crosses devices</b>: a "
                 "landlord on one phone sees nothing a tenant did on another. This is the single largest "
                 "functional gap between the product narrative and the shipped reality, and it defines the Phase 2 "
                 "agenda."),
        ("h2", "The honesty system"),
        ("body", "The platform's most distinctive engineering artefact is its honesty infrastructure, and the "
                 "audit wants to name it explicitly because it materially raises the platform's trust ceiling. "
                 "The claims register (src/data/claims.ts) is a machine-readable inventory of what the platform "
                 "asserts about itself, consumed by a public Trust Center view. The AI engine labels every "
                 "material statement as FACT, ESTIMATE, ASSUMPTION, or REPORTED, with documented thresholds. "
                 "Auto-Pilot listings are capped below verified listings in trust scoring and are forbidden from "
                 "claiming Ardhisasa verification. Demo surfaces carry a persistent banner. Verification records "
                 "mark their own method as simulated. In a market where the incumbent portals' biggest weakness "
                 "is phantom listings, this discipline is not decoration - it is the product's most defensible "
                 "differentiator, and every Phase 2 recommendation in this report is constrained to preserve it."),
        ("h2", "User personas and jobs-to-be-done"),
        ("body", "The platform's surfaces map onto five personas the audit inferred from the product "
                 "decisions (and which the strategy documents corroborate). Rendering them explicit "
                 "matters for the recommendations that follow, because each persona is exposed to a "
                 "different subset of the findings register - the renter meets the conversion theatre "
                 "and SEO darkness; the landlord meets the single-device ceiling; the diaspora "
                 "investor meets the KYC exposure; the agent meets the lead-capture gap; and the "
                 "regulator meets the claims register, for better and occasionally for worse."),
        ("table", {
            "cols": [0.16, 0.28, 0.28, 0.28],
            "align": ['l', 'l', 'l', 'l'],
            "caption": "Personas, their jobs-to-be-done, and the findings that gate them.",
            "header": ["Persona", "Primary job-to-be-done", "Current experience", "Gating findings"],
            "rows": [
                ["Urban renter", "Find a trustworthy home fast, within budget, in a known area", "Search + trust scores strong; WhatsApp handoff real; viewing booking theatrical", "F-03 SEO, F-26 CTAs, F-12 no map"],
                ["Landlord", "Fill units, collect rent, track arrears without spreadsheets", "Full console that works on one device only", "Ch. 10 ceiling, F-05 admin gate, P2-4 payments"],
                ["Diaspora investor", "Buy and oversee Kenyan property remotely with verified evidence", "Evidence panels + investor tools; tokenization trial simulated", "F-02 KYC exposure, R8 CMA sequencing"],
                ["Agent", "Receive qualified leads, convert in chat", "WhatsApp deep links with listing references; no lead form", "F-26, F-09 share unfurls"],
                ["Regulator / partner", "Assess whether the platform's claims are true", "Claims register is best-in-class; test-claim citations stale", "F-04 doc currency, Ch. 14 posture"],
            ],
        }),
        ("h2", "Delivery history"),
        ("body", "The repository compresses an unusual amount of history into 13 days: 106 commits between 28 "
                 "August and 10 September 2026, on a single main branch, from eight author identities reflecting "
                 "a blend of human and automated work. The defining event is commit ae0b2e3, the Next.js 16 "
                 "rebuild: 254 files changed, 19,783 lines added and 40,887 deleted, replacing an earlier Vite "
                 "SPA wholesale - and, with it, deleting 23 test suites and the entire quality tooling layer "
                 "(vitest configuration, coverage scripts, husky hooks, prettier) that the previous iteration "
                 "had assembled. Since that commit, 38 more commits have shipped, 34 of them Auto-Pilot listing "
                 "ingestions. The velocity is impressive; the deleted safety net is the subject of Chapter 22. "
                 "What follows in this report is a portrait of a codebase that is simultaneously young, "
                 "well-tended in places, and carrying a small number of very load-bearing omissions."),
    ],
})

# =====================================================================
CHAPTERS.append({
    "title": "Market and Competitive Context",
    "blocks": [
        ("h2", "Why a technical audit opens with the market"),
        ("body", "Engineering priorities for a marketplace cannot be set in a vacuum: the disciplines "
                 "this report scores - SEO, PWA installability, M-Pesa readiness, trust infrastructure - "
                 "are precisely the axes on which the Kenyan property-technology market is currently "
                 "competing. This chapter therefore fixes the competitive frame that the rest of the "
                 "report's recommendations assume, so that when Chapter 24 ranks prerendering above "
                 "refactoring or payments behind authentication, the ranking is legible as a market "
                 "judgment and not merely an engineering preference."),
        ("h2", "The incumbent field"),
        ("body", "The Kenyan rental discovery market is dominated by three classes of player. "
                 "<b>BuyRentKenya</b>, backed by ROAM Group (Ringier One Africa Media), is the most "
                 "trafficked dedicated property portal in East Africa and the direct comparator for "
                 "Keja's browse-and-enquire flow - its strengths are inventory depth and years of SEO "
                 "authority; its documented weaknesses are the classic portal ills: stale and phantom "
                 "listings, unverified agents, and a lead-capture experience that resells enquiries. "
                 "<b>Jiji</b> operates the horizontal-classifieds model at enormous scale, with pricing "
                 "power and aggressive distribution but minimal property-specific structure - no trust "
                 "scoring, no verification evidence, no financing surfaces. <b>Property24</b> and the "
                 "agency-owned portals occupy the premium-listing tier. Around the portals sits a "
                 "fast-professionalising <b>property-management software</b> segment - local platforms "
                 "marketing M-Pesa-integrated rent collection, invoicing automation, and increasingly "
                 "AI-flavoured tenant screening - which is exactly the landlord-side surface Keja's "
                 "#/manage console sketches. The structural gap in the field is the one Keja's strategy "
                 "documents already target: nobody owns verified trust, and nobody owns the "
                 "tenant-landlord transaction end to end with local payment rails."),
        ("table", {
            "cols": [0.20, 0.20, 0.20, 0.20, 0.20],
            "align": ['l', 'l', 'l', 'l', 'l'],
            "caption": "Capability positioning: Keja AI (as shipped) versus the incumbent field (audit synthesis, 2026).",
            "header": ["Capability", "BuyRentKenya", "Jiji", "PM software segment", "Keja AI (shipped)"],
            "rows": [
                ["Inventory depth", "Deep", "Deepest", "n/a (B2B)", "87 listings (60 synthetic)"],
                ["Listing verification", "Partial", "None", "n/a", "Designed, simulated (F-02 adjacent)"],
                ["Trust scoring / evidence", "None public", "None", "n/a", "Strongest in class (offline)"],
                ["SEO authority", "High", "High", "Low-mid", "Zero (Critical F-03)"],
                ["PWA / installable app", "Store apps", "Store apps", "Varies", "Top-tier PWA, shells dormant"],
                ["M-Pesa integration", "Lead-gen only", "Lead-gen only", "Core product", "Modelled, not integrated"],
                ["AI surfaces", "Marketing claim", "None", "Emerging (screening)", "Real rule-based engine, offline"],
                ["Cost to tenant", "Free + agent fees", "Free", "SaaS for landlords", "Free"],
            ],
        }),
        ("h2", "Demand-side realities"),
        ("body", "Three demand-side realities shape what Phase 2 should optimise. First, search remains "
                 "the primary discovery channel for serious renters - portal-industry practice and the "
                 "platform's own marketing analysis agree that high-intent users arrive via search "
                 "queries for areas, budgets, and configurations, which is what makes the SEO finding "
                 "existential rather than cosmetic. Second, WhatsApp is the transaction rail of trust: "
                 "Kenyans enquire, negotiate, and follow through in chat, which is why the platform's "
                 "WhatsApp-first handoff is a genuine market fit rather than a stopgap - provided the "
                 "CTAs never pretend to be more than they are (finding F-26). Third, mobile data "
                 "economics reward the offline-capable PWA: a listing app that re-serves its shell and "
                 "imagery from cache respects budgets that incumbent portals' ad-laden pages do not - "
                 "an installability story that only pays while the installed experience stays flawless "
                 "(Chapter 15's gaps matter here)."),
        ("h2", "Supply-side dynamics"),
        ("body", "On the landlord side, the professionalising segment signals where willingness-to-pay "
                 "sits: rent collection with M-Pesa reconciliation, arrears visibility, and maintenance "
                 "ticketing - the exact feature set of the #/manage console, currently localStorage-only. "
                 "The diaspora-investor segment, which Keja explicitly courts with a dedicated hub and "
                 "tokenization ambitions, values verified representation from afar - the trust register "
                 "and evidence panels are the right instruments, and the KYC exposure (finding F-02) is "
                 "the regulatory toll that segment charges. The audit's market read, consolidated: the "
                 "platform's differentiation (honesty infrastructure, offline PWA, AI-laboured "
                 "assistance) is real and rare; its deficits (inventory, SEO, transactions) are exactly "
                 "the ones incumbents cannot quickly copy culture around - and exactly the ones the "
                 "Phase 2 roadmap in Part VI sequences."),
    ],
})
