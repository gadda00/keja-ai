# -*- coding: utf-8 -*-
"""Content module 8: Excellence Plan, 90-Day Plan, Risk Register, Appendices (Ch 23-25 + A-E)."""

CHAPTERS = []

# =====================================================================
CHAPTERS.append({
    "title": "Engineering Excellence Plan",
    "blocks": [
        ("h2", "Guardrails back on"),
        ("body", "The excellence plan begins where Chapter 8 ended: restoring the configuration the "
                 "code's actual quality already earns. The sequence is incremental so nothing breaks at "
                 "once. First, set noImplicitAny true and remove ignoreBuildErrors from next.config "
                 "(CI already runs tsc, so the local-build risk is theatre anyway); fix whatever the "
                 "compiler finds - the audit expects little, given zero explicit-any usage. Second, "
                 "re-arm the ESLint correctness rules (no-undef, no-unreachable, no-fallthrough, "
                 "no-redeclare) immediately and the hygiene rules (no-explicit-any, no-unused-vars, "
                 "prefer-const) over the following month as warnings-then-errors. Third, restore the "
                 "composite verify gate from the pre-rebuild era - typecheck, lint with zero warnings, "
                 "tests, build - as the merge condition, enforced by the PR workflow that has never yet "
                 "run on a real PR. Fourth, re-enable reactStrictMode and fix the double-render "
                 "assumptions it surfaces while the codebase is young enough for that to be cheap."),
        ("h2", "The purge"),
        ("body", "Subtraction is the highest-leverage week available. Delete the 30 never-imported "
                 "shadcn files (4,243 lines) and the four dependencies that exist only for them "
                 "(embla-carousel, react-day-picker, react-resizable-panels, and the react-hook-form "
                 "stack). Delete src/lib/db.ts, the Prisma scaffold (or replace it with the authored "
                 "schema, per Chapter 24 - the audit's preference), and the ~16 remaining unused "
                 "dependencies (zustand, next-auth, both TanStack packages until the seam needs them, "
                 "zod until the boundary validation lands, dnd-kit, next-intl, date-fns, uuid - "
                 "re-adding it when the id helper lands - react-syntax-highlighter, the MDX editor, "
                 "@reactuses/core, z-ai-web-dev-sdk). Delete the dead tailwind.config.ts, the orphaned "
                 "tests/*.sh scripts, and the Vite-era prerender.mjs in favour of its modernised "
                 "successor. The measurable outcomes: a lockfile that shrinks by hundreds of packages, "
                 "CI installs that speed up, a security-scanner surface that reflects reality, and a "
                 "package.json that stops telling newcomers lies about the stack."),
        ("h2", "Refactoring with intent"),
        ("body", "The refactoring agenda is narrow and test-driven - each extraction lands alongside "
                 "the tests it enables. ManageView's 523-line closure splits into a pure "
                 "landlord-metrics module, an alert-rule evaluator, and a thinner view; DealAnalyst "
                 "follows the same cut; the AI engine's respond routine separates its intent tables "
                 "from its decision logic so the escalation guard becomes directly testable. The store "
                 "primitive absorbs the cross-tab listener currently living in auth.tsx, and its "
                 "fallback-dependency hazard is fixed with a ref-stable default pattern. The "
                 "auto-listings JSON gains a zod validation step at the read boundary. None of this is "
                 "cosmetic restructuring; every extraction is chosen because Chapter 22's test "
                 "priorities need the seam it creates."),
        ("h2", "Craft standards to adopt"),
        ("bullet", [
            "<b>One uuid helper</b> (crypto.randomUUID) replacing 30+ Date.now() identifier sites - one module, one grep, done in an hour.",
            "<b>Format consolidation:</b> every money/percentage formatter lives in src/lib/format.ts; the ten local variants delete.",
            "<b>Reduced motion:</b> a global MotionConfig respects prefers-reduced-motion across the framer-motion surface.",
            "<b>Contrast token:</b> a light-mode-safe gold variant for text usage; the WCAG check joins the verify gate as an axe pass on the shell.",
            "<b>Commit conventions:</b> conventional prefixes stay; add a lightweight PR norm (even self-review) from the first second contributor, and move workflow constants to repo variables.",
            "<b>Docs currency:</b> REVIEW_ACTIONS.md updates to reflect the deleted-test reality; REPO_PICTURE.md's live-URL claim re-points at the verified production domain.",
        ]),
        ("h2", "What deliberately stays"),
        ("body", "Excellence also means refusing fashionable churn. The audit recommends <b>against</b>: "
                 "migrating the custom router to react-router before the prerendering decision "
                 "constrains it properly; adopting react-query wholesale before there is an API to "
                 "query (the store seam will pick its own server-state library when it needs one); "
                 "rewriting the AI engine as an LLM integration before its regression tests exist "
                 "and its guard behaviour is pinned; and any move off the static-first shell that "
                 "does not come through the Chapter 24 seam. The platform's best engineering "
                 "qualities - coherence, honesty, uniformity - are exactly what churn erodes first."),
    ],
})

# =====================================================================
CHAPTERS.append({
    "title": "90-Day Action Plan",
    "blocks": [
        ("h2", "Sequencing logic"),
        ("body", "The plan sequences the register by dependency, not merely by severity: security "
                 "gates land before growth spending, instrumentation lands before the optimisations it "
                 "would measure, the safety net lands before the refactors that need it, and every "
                 "Phase 2 structural item follows the hygiene it depends on. P0 items belong to the "
                 "first fortnight; P1 items to the first month; P2 items to the quarter. Nothing in "
                 "the plan requires more than one engineer, and the totals are honest: the audit "
                 "estimates the P0 set at one focused week, the P1 set at two to three weeks, and the "
                 "P2 set as the beginning of the Phase 2 proper rather than its completion."),
        ("chart", "chart_roadmap.png",
         "The 90-day action plan: twelve workstreams sequenced by dependency, coloured by priority.", 300),
        ("table", {
            "cols": [0.08, 0.40, 0.14, 0.38],
            "align": ['c', 'l', 'c', 'l'],
            "caption": "P0 - first fortnight (safety and truth).",
            "header": ["Ref", "Action", "Effort", "Definition of done"],
            "rows": [
                ["P0-1", "Gate #/admin behind isAdmin; add demo-credential warning to real registrations", "0.5 day", "Console renders sign-in gate for anonymous visitors"],
                ["P0-2", "Stop persisting KYC identifiers in demo; add collection notices", "0.5 day", "KYC form discards or blocks identifier persistence; notice text present"],
                ["P0-3", "Wire generate-sitemap.mjs into build; XML content-type ahead of SPA rewrite", "0.5 day", "keja.app/sitemap.xml returns valid XML, 200"],
                ["P0-4", "Add usePageMeta hook; per-route titles and descriptions", "1 day", "Deep-link shares unfurl with listing titles"],
                ["P0-5", "Restore P0 test set from git history (finance, escalation guard) + verify gate in CI", "2-3 days", "vitest green in CI; merge blocked without it"],
                ["P0-6", "Sentry browser init in ErrorBoundary; release tag from SW version", "0.5 day", "Test error visible in Sentry with artifact hash"],
                ["P0-7", "Deploy CSP report-only, then enforce default-src 'self'", "0.5 day", "Header live; report endpoint quiet under normal use"],
            ],
        }),
        ("table", {
            "cols": [0.08, 0.40, 0.14, 0.38],
            "align": ['c', 'l', 'c', 'l'],
            "caption": "P1 - first month (excellence and instrumentation).",
            "header": ["Ref", "Action", "Effort", "Definition of done"],
            "rows": [
                ["P1-1", "Re-arm noImplicitAny, ignoreBuildErrors off, ESLint correctness rules", "1 day", "Verify gate passes with strict flags"],
                ["P1-2", "Dead-code purge: 30 ui files, db.ts, ~20 deps, dead configs", "1 day", "Lockfile shrinks; imports unchanged; build green"],
                ["P1-3", "Image diet: WebP references, delete unreferenced assets, srcset", "2 days", "Listing card transfer drops 30%+"],
                ["P1-4", "recharts shared chunk; lazy Home", "1 day", "Lazy chunks no longer duplicate charting lib"],
                ["P1-5", "Cookieless analytics destination mirroring local taxonomy", "1 day", "Events visible off-device; no cookies set"],
                ["P1-6", "Extend P1 test set: search matching, tokenize invariants, store primitive", "3 days", "Critical-logic coverage restored"],
                ["P1-7", "Conversion honesty: WhatsApp intent links on both stub CTAs", "0.5 day", "Every CTA either captures or hands off truthfully"],
                ["P1-8", "Rollback-promotion workflow on smoke failure; smoke covers sitemap + deep listing", "1 day", "Auto-revert observable in a drill"],
                ["P1-9", "assetlinks.json for Android deep-link verification; offline page rebrand; orientation unlock", "1 day", "Links open the app directly; landscape usable"],
            ],
        }),
        ("table", {
            "cols": [0.08, 0.40, 0.14, 0.38],
            "align": ['c', 'l', 'c', 'l'],
            "caption": "P2 - the quarter (Phase 2 proper begins).",
            "header": ["Ref", "Action", "Effort", "Definition of done"],
            "rows": [
                ["P2-1", "Author real Prisma schema from data dictionary; migrations + seeds", "1 week", "Schema reviewable; demo data seeded from dictionary"],
                ["P2-2", "API seam skeleton: auth service + tenant domain behind store twins", "2 weeks", "Registration server-side; tenant app crosses devices"],
                ["P2-3", "Prerender public catalog at path URLs; hash-to-path redirect map; JSON-LD", "2 weeks", "Listing pages indexable; Search Console verifies"],
                ["P2-4", "Leaflet clustered results map, lazy-loaded", "3 days", "Map panel on results; no first-load cost"],
                ["P2-5", "M-Pesa Daraja sandbox behind PSP track; escrow ledger model", "2-3 weeks", "Sandbox STK push round-trips; idempotent webhooks"],
                ["P2-6", "ODPC registration; privacy notices live at collection points", "1 week + processing", "Registration certificate; notices shipped"],
                ["P2-7", "Preview environment; native debug-APK CI; store-track preparation", "1 week", "PRs get URLs; APK artifact per merge"],
                ["P2-8", "Monolith refactors driven by restored tests (Manage, DealAnalyst, engine)", "ongoing", "Pure modules extracted; views thin"],
            ],
        }),
        ("h2", "Effort and impact matrix"),
        ("body", "For a small team deciding where an afternoon goes, the matrix below ranks the "
                 "highest-leverage actions from the register by effort against expected impact. Its "
                 "shape is the plan's thesis in miniature: the upper-left quadrant (high impact, low "
                 "effort) is crowded - a genuinely fortunate situation that will not persist once "
                 "Phase 2 begins - while the expensive items are few and mostly structural. Working "
                 "the quadrant in order is the audit's final, practical advice."),
        ("table", {
            "cols": [0.34, 0.14, 0.14, 0.38],
            "align": ['l', 'c', 'c', 'l'],
            "caption": "Highest-leverage actions by effort and impact.",
            "header": ["Action", "Effort", "Impact", "Why it ranks here"],
            "rows": [
                ["Wire sitemap into build", "Hours", "High", "Closes a High finding; prerequisite for any SEO work"],
                ["Gate #/admin + KYC demo mode", "Hours", "High", "Defuses both Critical security exposures' near-term risk"],
                ["usePageMeta per-route metadata", "Day", "High", "Every shared link unfurls correctly; cheap credibility"],
                ["Sentry + release tags", "Hours", "High", "Converts production from mute to observable"],
                ["Dead-code and dependency purge", "Day", "Medium", "Faster CI, honest package.json, smaller audit surface"],
                ["Restore P0 test suites + verify gate", "Days", "High", "The safety net everything else depends on"],
                ["Image diet (WebP + srcset)", "Days", "Medium", "30%+ transfer cut on every listing-bearing page"],
                ["Prerender public catalog", "Weeks", "Critical", "Opens the organic acquisition channel (Strategy B)"],
                ["API seam + auth migration", "Weeks", "Critical", "The Phase 2 unlock; every transactional feature waits on it"],
                ["M-Pesa sandbox behind PSP", "Weeks", "High", "Revenue rail; gated on licensing as much as code"],
            ],
        }),
        ("h2", "Cadence and verification"),
        ("body", "The plan's verification cadence is weekly and cheap: the verify gate must stay green "
                 "(it becomes the heartbeat), the production check gains the sitemap and deep-listing "
                 "assertions, Sentry's release health becomes the morning read, and the findings "
                 "register in Chapter 23 is re-scored at day 30, 60, and 90 with every closed item "
                 "cited to its commit. The audit's definition of success for the 90 days is precise: "
                 "all four Critical findings closed, all thirteen High findings closed or in P2 "
                 "flight, the test count above the pre-rebuild watermark, and the first Phase 2 seam "
                 "(authentication plus tenant applications) live behind a preview environment - at "
                 "which point this document's successor should be a much shorter health check rather "
                 "than another hundred-page recovery plan."),
    ],
})

# =====================================================================
CHAPTERS.append({
    "title": "Risk Register",
    "blocks": [
        ("h2", "How the register was built"),
        ("body", "The audit closed by translating its findings into forward-looking risks - events, not "
                 "conditions - scored on likelihood and business impact, each with a mitigation already "
                 "present in this report's recommendations. Likelihood reflects the audit's judgment of "
                 "probability over the next two quarters if no remediation occurs; impact reflects "
                 "consequence to the platform's users, reputation, or viability. The ten risks below "
                 "are the ones that move: the long tail of Low findings is deliberately excluded, and "
                 "every risk maps to at least one action in the Chapter 27 plan so that closing the "
                 "plan closes the register."),
        ("chart", "chart_risk.png",
         "Risk matrix: likelihood versus impact, with R1-R10 keyed to the register below.", 280),
        ("table", {
            "cols": [0.08, 0.30, 0.34, 0.28],
            "align": ['c', 'l', 'l', 'l'],
            "caption": "The risk register with mitigations mapped to the action plan.",
            "header": ["ID", "Risk", "Driver (evidence)", "Mitigation (plan refs)"],
            "rows": [
                ["R1", "A real user's real password is exposed through client-side storage", "F-01; open registration + DJB2 + reuse norms", "P0-1 demo gating; P2-2 server auth"],
                ["R2", "Organic acquisition stays at zero while spend substitutes for search", "F-03/F-07/F-08; hash routing", "P0-3/P0-4 metadata; P2-3 prerendering"],
                ["R3", "A silent regression in money math ships to users", "F-04; zero tests on finance module", "P0-5 restored suites; verify gate"],
                ["R4", "Regulatory action on KYC collection without registration", "F-02; DPA 2019 obligations", "P0-2 gating; P2-6 ODPC path"],
                ["R5", "Platform hits the multi-device wall mid-growth (landlord-tenant data never meets)", "Architecture ceiling (Ch. 5, Ch. 10)", "P2-2 seam; domain-by-domain migration"],
                ["R6", "Production incidents stay invisible until users report them", "F-10/F-11; no telemetry", "P0-6 Sentry; P1-5 analytics"],
                ["R7", "Dead code and disabled gates erode contributor trust and onboarding", "F-14/F-15; scaffold inheritance", "P1-1/P1-2 purge and re-arming"],
                ["R8", "Tokenization marketing outruns CMA sandbox reality", "Ch. 14 sequencing; claims register honesty", "Keep claims register current; gate KYC (P0-2)"],
                ["R9", "A supply-chain incident rides the oversized dependency tree", "1,022 packages; unused risky deps", "P1-2 purge; CSP (P0-7) as blast limiter"],
                ["R10", "Single-maintainer concentration halts delivery", "Solo history; 8 author identities, 1 human", "Docs, tests, runbooks (this report); PR norms at second contributor"],
            ],
        }),
        ("h2", "Closing statement"),
        ("body", "Audits are easy to write as indictments and hard to write as instruments, and the "
                 "difference is evidence. This one has tried to hold its standard to what the repository "
                 "actually contains: a platform that in thirteen days went from an idea to a deployed, "
                 "installable, monitored, self-growing marketplace with the best honesty infrastructure "
                 "in its regional class - and that carries, on the other side of the ledger, four "
                 "critical omissions whose fixes are all known, sized, and sequenced. The audit team's "
                 "parting judgment is deliberately plain: the codebase deserves the Phase 2 it is being "
                 "prepared for. The store layer was built with its server twin in mind; the claims "
                 "register was built to survive regulatory scrutiny; the service worker was built to "
                 "survive Kenyan connectivity; and the documentation was built to survive its author. "
                 "Those are the properties that compound. Execute Chapter 27's first month, and the "
                 "platform's next audit should read as a health check - shorter, duller, and "
                 "considerably more profitable."),
        ("h2", "The register's shape"),
        ("body", "Read as a shape rather than a list, the register says something encouraging: the "
                 "platform's worst risks are not scattered - they concentrate in the gap between what "
                 "the product claims and what the architecture currently delivers (R1, R4, R5, R8), "
                 "and that gap is precisely what the Chapter 24 seam closes. The second cluster is "
                 " blindness (R3, R6) - closed by a week of instrumentation and restored tests. Only "
                 "R10, the human factor, has no technical mitigation; it is addressed by exactly the "
                 "kind of artefact this report represents. The audit's closing judgment is therefore "
                 "the one it opened with, now earned by a hundred pages of evidence: this is a "
                 "well-built seed with a small number of load-bearing omissions, every one of which "
                 "has a known, sized, sequenced fix - and a team that reads this document and executes "
                 "its first month will have converted the audit's severity counts into a moat."),
    ],
})

# ------------------------- APPENDICES -------------------------

CHAPTERS.append({
    "type": "appendix",
    "title": "Route Inventory",
    "blocks": [
        ("body", "The complete URL surface of the application as implemented by the hash router at "
                 "commit 86e2a66. All views are lazy-loaded except Home, which is statically imported "
                 "into the shell chunk. The fallback route renders the NotFound view."),
        ("table", {
            "cols": [0.30, 0.34, 0.36],
            "align": ['l', 'l', 'l'],
            "caption": "Hash route table (32 routes plus fallback).",
            "header": ["Route", "View component", "Function"],
            "rows": [
                ["#/", "Home", "Hero, search entry, featured listings, product navigation"],
                ["#/properties", "PropertiesView", "Faceted browsing: area, type, purpose, beds, price, trust"],
                ["#/properties/:id", "PropertyDetailView", "Gallery, trust breakdown, passport, mortgage calc, agent"],
                ["#/compare", "CompareView", "Side-by-side comparison of saved listings"],
                ["#/sell", "ListPropertyView", "Landlord listing submission wizard (14 labelled fields)"],
                ["#/ask", "AskKejaView", "Trilingual AI advisor with escalation guard"],
                ["#/deal-analyst", "DealAnalystView", "On-device document pre-screening"],
                ["#/invest", "InvestmentCalculatorView", "Yield and affordability calculators"],
                ["#/portfolio", "InvestorDashboardView", "Positions, metrics, alerts (recharts)"],
                ["#/data", "MarketDataView", "Market statistics dashboards (recharts)"],
                ["#/finance", "FinanceView", "Mortgage products and payment modelling"],
                ["#/transact", "TransactView", "Transaction flow (presentational)"],
                ["#/account", "AccountView", "Profile, sessions, preferences (auth-gated)"],
                ["#/pro", "ProWorkspaceView", "Agent professional workspace"],
                ["#/tokenize", "TokenizeView", "Tokenization trial: KYC, wallet, order book"],
                ["#/manage", "ManageView", "Landlord units, tenants, ledger, tickets"],
                ["#/tenant", "TenantHubView", "Tenant applications and status"],
                ["#/diaspora", "DiasporaHubView", "Diaspora investor briefs"],
                ["#/develop", "DeveloperPortalView", "Developer project listings"],
                ["#/institutional", "InstitutionalPortalView", "Institutional investor surface"],
                ["#/partners", "PartnersView", "Partner programme and applications"],
                ["#/trust", "TrustCenterView", "Public claims register and honesty standard"],
                ["#/ecosystem", "EcosystemView", "Nine-product overview"],
                ["#/insights", "InsightsView", "Editorial articles index"],
                ["#/insights/:slug", "ArticleDetailView", "Individual article"],
                ["#/areas/:slug", "AreaGuideView", "Neighbourhood guides (21 areas)"],
                ["#/about", "AboutView", "Company story"],
                ["#/contact", "ContactView", "Contact channels"],
                ["#/legal", "LegalView", "Terms and policies"],
                ["#/admin", "AdminView", "Moderation console (ungated - finding F-05)"],
                ["#/valuation", "ValuationDeskView", "Valuation request surface"],
                ["(fallback)", "NotFoundView", "404 experience"],
            ],
        }),
    ],
})

CHAPTERS.append({
    "type": "appendix",
    "title": "localStorage Registry",
    "blocks": [
        ("body", "Every browser-storage key the application reads or writes, enumerated by domain. "
                 "All keys use the keja: prefix (the tokenization blob and analytics buffer use "
                 "versioned names). This registry is the complete inventory of platform state as of "
                 "commit 86e2a66, and doubles as the migration checklist for the Phase 2 store "
                 "twins described in Chapter 24."),
        ("table", {
            "cols": [0.30, 0.44, 0.26],
            "align": ['l', 'l', 'l'],
            "caption": "localStorage key registry (28 keys).",
            "header": ["Key", "Contents", "Owner"],
            "rows": [
                ["keja:session", "Active session token, expiry, user snapshot", "auth context"],
                ["keja:users", "Registered user records (client-side)", "auth context"],
                ["keja:pw", "DJB2-hashed passwords (finding F-01)", "auth context"],
                ["keja:login-fails", "Throttle counters per email", "auth context"],
                ["keja:favorites", "Saved listing ids", "core store"],
                ["keja:leads", "Captured lead stubs", "core store"],
                ["keja:profile", "Local profile settings", "core store"],
                ["keja:chat-history", "AI advisor conversations", "core store"],
                ["keja:language", "UI language (en/sw/fr)", "i18n"],
                ["keja:recently-viewed", "Recent listing trail", "core store"],
                ["keja:saved-searches", "Search criteria + alerts", "searchStore"],
                ["keja:compare-list", "Comparison tray members", "searchStore"],
                ["keja:notifications", "Alert sweep results", "searchStore"],
                ["keja:audit", "Admin audit trail (bounded 500)", "adminStore"],
                ["keja:submissions", "Listing submissions queue", "adminStore"],
                ["keja:partners", "Partner applications", "adminStore"],
                ["keja:feeds", "Feed connection registry", "adminStore"],
                ["keja:settings", "Platform settings", "adminStore"],
                ["keja:listing-reports", "User reports (bounded 200)", "adminStore"],
                ["keja:user-listings", "User-created listings", "adminStore"],
                ["keja:tenant", "Rental applications incl. income data", "tenantStore"],
                ["keja:landlord", "Units, tenants, payments, tickets", "landlordStore"],
                ["keja:valuations", "Valuation requests", "valuationStore"],
                ["keja:pro", "Professional workspace state", "proStore"],
                ["keja:diaspora", "Diaspora briefs", "diasporaStore"],
                ["keja:dev-projects", "Developer projects", "devStore"],
                ["investor-portfolio", "Watchlists and positions", "investorStore"],
                ["keja-tokenize-v1", "KYC records, wallet, ledger, orders (finding F-02)", "tokenize context"],
                ["keja.analytics.v1", "200-event analytics ring", "analytics"],
                ["keja:listing-sigs", "Listing signature cache (bounded 200)", "autoListings"],
            ],
        }),
    ],
})

CHAPTERS.append({
    "type": "appendix",
    "title": "Dependency Audit",
    "blocks": [
        ("body", "The declared dependency list (69 dependencies, 12 dev dependencies) audited against "
                 "actual imports in src/ at commit 86e2a66. The audit recommends deletion of every "
                 "package in the unused list except where the Chapter 24 seam will adopt it "
                 "deliberately (marked)."),
        ("table", {
            "cols": [0.34, 0.18, 0.48],
            "align": ['l', 'l', 'l'],
            "caption": "Unused dependencies (zero imports in src/).",
            "header": ["Package", "Version", "Disposition"],
            "rows": [
                ["zustand", "5.0.6", "Delete (re-evaluate at server-state seam)"],
                ["next-auth", "4.24.13", "Delete (EOL line; do not revive for Phase 2)"],
                ["@tanstack/react-query", "5.82.0", "Delete (adopt at seam if chosen)"],
                ["@tanstack/react-table", "8.21.3", "Delete"],
                ["zod", "4.0.2", "Keep (needed for F-19/F-20 boundary validation) or delete until then"],
                ["@hookform/resolvers", "3.10.0", "Delete (serves only dead form.tsx)"],
                ["react-hook-form", "7.62.0", "Delete (sole importer is dead ui/form.tsx)"],
                ["@dnd-kit/core, sortable, utilities", "6.x", "Delete (3 packages)"],
                ["next-intl", "4.3.4", "Delete (custom i18n in use)"],
                ["uuid", "11.1.0", "Keep for the id helper (P1 craft item) or delete until adopted"],
                ["date-fns", "4.1.0", "Delete"],
                ["@reactuses/core", "2.2.0", "Delete"],
                ["react-syntax-highlighter", "15.6.6", "Delete"],
                ["@mdxeditor/editor", "3.7.0", "Delete"],
                ["z-ai-web-dev-sdk", "0.0.18", "Delete (never imported; no key in bundle)"],
                ["embla-carousel-react", "8.6.0", "Delete (dead ui/carousel.tsx)"],
                ["react-day-picker", "9.8.0", "Delete (dead ui/calendar.tsx)"],
                ["react-resizable-panels", "3.0.0", "Delete (dead layout primitives)"],
                ["prisma + @prisma/client", "6.19.2", "Replace scaffold with authored schema (Ch. 24)"],
                ["sonner", "2.0.5", "Verify: toast usage consolidates on it - audit found mixed toast paths"],
            ],
        }),
        ("table", {
            "cols": [0.40, 0.20, 0.40],
            "align": ['l', 'c', 'l'],
            "caption": "Load-bearing dependencies in active use.",
            "header": ["Package", "Importers", "Role"],
            "rows": [
                ["next", "build", "Framework, static export, metadata"],
                ["react, react-dom", "all views", "Runtime"],
                ["tailwindcss 4 + postcss", "styles", "Design tokens (CSS-first)"],
                ["@radix-ui/* (subset)", "18 ui files", "Dialog/menu/tabs primitives in active use"],
                ["lucide-react", "44 files", "Icon system"],
                ["framer-motion", "14 files", "Entrance/stagger motion"],
                ["recharts", "6 files", "Charts (dedup finding F-13)"],
                ["class-variance-authority, clsx, tailwind-merge", "ui layer", "Class composition"],
                ["next-themes", "theme provider", "Dark mode"],
                ["@capacitor/core + splash + status", "native shells", "Android/iOS runtime"],
            ],
        }),
    ],
})

CHAPTERS.append({
    "type": "appendix",
    "title": "Document and Asset Inventory",
    "blocks": [
        ("body", "The documentation suite (18 files) and notable asset classes tracked in the "
                 "repository, with the audit's currency notes. The suite is unusually complete for a "
                 "platform of this size and its quality materially assisted this audit; three items "
                 "require freshness corrections noted in Chapter 26."),
        ("table", {
            "cols": [0.34, 0.66],
            "align": ['l', 'l'],
            "caption": "Documentation inventory.",
            "header": ["Document", "Summary"],
            "rows": [
                ["README.md", "Product, stack, deploy overview; nine-product table; doc index"],
                ["docs/REPO_PICTURE.md", "Engineering dossier (source of several audit baselines; live-URL claim needs update)"],
                ["docs/DEPLOYMENT.md", "Canonical Vercel runbook: architecture, CLI flow, DNS, quirks"],
                ["docs/DOMAIN_CONFLICT_FIX.md", "Superseded Netlify-era forensic record (historical)"],
                ["docs/MOBILE.md", "Capacitor build and sync runbook"],
                ["docs/STRATEGY.md", "Three-phase Kenya-first strategy with gates"],
                ["docs/MARKETING_PLAYBOOK.md", "Market snapshot, competitors, positioning, launch"],
                ["docs/KENYA_PARTNER_PROPOSALS.md", "Twenty named partner targets with tier model"],
                ["docs/DATA_DICTIONARY.md", "Field-level dataset documentation (auto-generated)"],
                ["docs/REVIEW_ACTIONS.md", "External review tracker (cites deleted test - update needed)"],
                ["docs/pdf/ (6 files)", "Rendered PDF editions of the primary documents"],
                ["docs/cma/ (3 files)", "CMA sandbox: testing plan, safeguards, tokenization quotation"],
            ],
        }),
        ("table", {
            "cols": [0.30, 0.20, 0.50],
            "align": ['l', 'c', 'l'],
            "caption": "Asset classes under public/ and native trees.",
            "header": ["Class", "Count", "Audit note"],
            "rows": [
                ["Property images (jpg+webp pairs)", "84 subjects", "WebP set unreferenced (~5 MB dead - F-23)"],
                ["iOS splash screens", "17", "2.2 MB; complete device-class coverage"],
                ["Icons and brand", "6 + 6", "Maskable variants generated deterministically"],
                ["Screenshots", "2", "Manifest screenshot entries (narrow + wide)"],
                ["SW, manifest, offline, robots", "4", "sitemap.xml missing from output (F-07)"],
                ["Android resources", "77 files", "Adaptive icons, splash drawables, intent filters"],
                ["iOS resources", "26 files", "Asset catalogs, AppDelegate, CapApp-SPM"],
                ["Auto-Pilot scripts", "8", "Scanner, enrich, dedupe, quality, publish, commit, verify"],
                ["Doc/PDF build scripts", "18", "keja-docs sources; committed artifacts"],
            ],
        }),
    ],
})

CHAPTERS.append({
    "type": "appendix",
    "title": "Glossary",
    "blocks": [
        ("body", "Terms used in this report, defined as the audit uses them. Platform-specific coinages "
                 "are marked; general terms are defined narrowly to their sense here."),
        ("table", {
            "cols": [0.26, 0.74],
            "align": ['l', 'l'],
            "caption": "Glossary of terms.",
            "header": ["Term", "Definition"],
            "rows": [
                ["Ardhisasa", "Kenya's national land information system; the reference point for genuine title verification claims"],
                ["Auto-Pilot (platform)", "The cron-driven pipeline that grows listing inventory through quality-gated commits to main"],
                ["BFF / API seam", "The single backend-for-frontend boundary this report recommends: typed API routes in front of persistence, auth, and payments"],
                ["Claims register", "The machine-readable inventory (src/data/claims.ts) of what the platform asserts about itself, surfaced in the Trust Center"],
                ["CMA sandbox", "Capital Markets Authority regulatory sandbox; the admission path contemplated for the tokenization ambitions"],
                ["Daraja", "Safaricom's developer platform for M-Pesa APIs (STK push, C2B, B2C)"],
                ["DJB2", "A 1997 non-cryptographic string hash; unsuitable for password storage (finding F-01)"],
                ["DPA 2019 / ODPC", "Kenya Data Protection Act 2019 and its regulator, the Office of the Data Protection Commissioner"],
                ["Escalation guard", "Engine behaviour routing legal, tax, and valuation questions to human handoff"],
                ["FACT / ESTIMATE / ASSUMPTION / REPORTED", "The AI engine's answer-labelling taxonomy underpinning the honesty system"],
                ["Hash routing", "URL navigation via the fragment (#/...) - offline-friendly, search-invisible"],
                ["Hobby plan attribution", "Vercel's requirement that Hobby deploys attribute to the team owner; workaround: commits authored as the owner"],
                ["keja:* keys", "The localStorage namespace for all platform state (28 keys; Appendix B)"],
                ["localStorage", "Browser-origin storage: ~5 MB, single-device, client-mutable - the platform's entire persistence layer today"],
                ["Maskable icon", "PWA icon variant with a safe zone that survives Android adaptive masking"],
                ["PSP", "Payment service provider; the licensed intermediary recommended for M-Pesa integration"],
                ["Prerendering", "Emitting static HTML per route at build time so crawlers and shares see real content"],
                ["Property Passport", "The per-listing identity block (KEJA-XXX) tying a listing to its evidence trail"],
                ["RUM", "Real-user monitoring of field performance (Core Web Vitals)"],
                ["Store twin (platform)", "A server-backed counterpart behind an existing domain-store hook signature, retaining localStorage as offline cache"],
                ["STK push", "M-Pesa online payment initiation that prompts the payer on their handset"],
                ["Trust ceiling", "Hard cap on computed trust scores, capping synthetic listings below verified ones"],
                ["Vercel prebuilt flow", "CLI sequence (pull, build, deploy --prebuilt) decoupling build from deploy"],
                ["WCAG AA", "Web Content Accessibility Guidelines conformance level; 4.5:1 contrast threshold for body text"],
                ["WhatsApp-first", "The product's reliance on WhatsApp as the primary communication and conversion rail"],
            ],
        }),
    ],
})

CHAPTERS.append({
    "type": "appendix",
    "title": "Methodology Notes and Reproduction",
    "blocks": [
        ("h2", "Reproducing the audit"),
        ("body", "Every quantitative claim in this report is reproducible from the repository at commit "
                 "86e2a66 with the following commands. File counts: git ls-files | wc -l. Source "
                 "inventory and line counts: git ls-files 'src/**' | xargs wc -l. Bundle composition: "
                 "build with NEXT_STATIC=1 and list out/_next/static/chunks with sizes, then cross-"
                 "reference the script tags in out/index.html for first-load membership. Dead-code "
                 "census: for each src/components/ui/*.tsx, grep its import path across src/ excluding "
                 "itself. Type-escape census: grep for ': any', 'as any', '@ts-ignore', "
                 "'@ts-expect-error', non-null assertion patterns in expressions. Deleted-test "
                 "archaeology: git show ae0b2e3^ --stat -- 'src/**/*.test.*' and read the pre-rebuild "
                 "package.json scripts. Secrets sweep: pattern grep across git log -p for token "
                 "prefixes, plus --diff-filter=A on .env paths. LocalStorage census: grep for the "
                 "storage accessor and key constants across src/lib."),
        ("h2", "Tooling and standards referenced"),
        ("body", "External references grounding the recommendations: Next.js documentation on rendering "
                 "strategies (static generation ranked first for SEO); Safaricom Daraja developer "
                 "documentation and 2026 integration guides (STK push flow, C2B callbacks, merchant "
                 "provisioning timeline of roughly five weeks, escrow patterns via B2C and reversal); "
                 "Kenya Data Protection Act 2019 as implemented by the Office of the Data Protection "
                 "Commissioner (controller/processor registration, sensitive-data obligations); "
                 "current testing-stack practice for React SPAs (Vitest with React Testing Library for "
                 "unit and component layers, Playwright for end-to-end and PWA contexts); WCAG 2.1 AA "
                 "for the contrast and motion findings; OWASP Top 10 (2021) for the security register "
                 "categories. Market context drew on 2025-2026 coverage of the Kenyan proptech "
                 "landscape including BuyRentKenya's position as the region's most-trafficked "
                 "dedicated portal and the M-Pesa-integrated property-management trend."),
        ("h2", "Confidence and freshness"),
        ("body", "Code-level findings carry high confidence: each was verified directly against the "
                 "repository state at the audited commit, and the audit's reproduction commands "
                 "re-derive them. Bundle and asset measurements describe the build artifact sampled "
                 "during the engagement and will drift as deploys continue; the findings they support "
                 "(duplication, dead imagery) are structural and will persist until remediated. "
                 "Regulatory and integration guidance reflects sources current as of September 2026 "
                 "and should be re-validated with counsel and the relevant institutions before "
                 "binding decisions. This report should be read alongside the repository's own claims "
                 "register: where the two disagree, this report's evidence citations govern, and the "
                 "disagreement itself is a documentation-freshness finding to close in the Chapter 26 "
                 "craft items."),
    ],
})
