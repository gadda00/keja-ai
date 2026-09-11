# -*- coding: utf-8 -*-
"""Content module 3: Code Quality, Components, State (Ch 7-9)."""

CHAPTERS = []

# =====================================================================
CHAPTERS.append({
    "part": "Part III - Code-Level Analysis",
    "title": "TypeScript and Code Quality",
    "blocks": [
        ("h2", "The paradox of the type system"),
        ("body", "The most striking quality result in this audit is a paradox. On paper, the configuration has "
                 "been weakened in three separate places: tsconfig sets strict true but disables "
                 "noImplicitAny and enables allowJs; next.config.ts sets ignoreBuildErrors true; and the ESLint "
                 "flat config turns off twenty-six rules including the TypeScript hygiene set. And yet the "
                 "actual code contains <b>zero uses of the any type, zero as-any casts, zero @ts-ignore and "
                 "zero @ts-expect-error</b> across all 33,253 lines - a discipline level the audit team rarely "
                 "sees even in teams that enforce these rules with CI. The paradox resolves into a simple "
                 "judgment: the code is clean, but the guardrails are off, which means the cleanliness is a "
                 "property of the current authors rather than of the repository. The first contributor who "
                 "leans on any, or the first refactor done under time pressure, will meet no resistance. "
                 "Re-arming the configuration is therefore not remediation of a present defect - it is "
                 "insurance on an asset that currently exists only by convention."),
        ("stats", [("0", "uses of any / as any"), ("0", "@ts-ignore / expect-error"),
                   ("13", "non-null assertions"), ("26", "ESLint rules disabled")]),
        ("h2", "Escape hatches in use"),
        ("body", "The audit catalogued the remaining type escape hatches. Thirteen non-null assertions exist, "
                 "clustered in the comparison feature (CompareBar, CompareView) and one in the AI chat view; "
                 "each is guarded by a length check before the assertion, so they are low-risk today, but a "
                 "small Property-or-undefined narrowing helper would eliminate the entire class. Two "
                 "as-unknown-as double casts exist: one in the dead db.ts file, and one in "
                 "src/lib/autoListings.ts line 86, where a 5,630-line JSON import is trusted blindly as typed "
                 "state - the only genuinely risky cast in the codebase, since a malformed generated file would "
                 "type-check happily and fail at runtime in front of users. Zod, which would solve exactly "
                 "this, sits unused in the dependency list. The audit rates the JSON cast Medium and pairs it "
                 "with a recommendation to validate generated data at the boundary in Chapter 26."),
        ("h2", "Patterns that carry the codebase"),
        ("body", "Several recurring patterns deserve explicit credit because they do disproportionate work. "
                 "The <b>store primitive</b> (src/lib/store.ts) is a single generic useStore hook - localStorage "
                 "read/write with a keja: prefix, a CustomEvent broadcast for cross-hook synchronisation, and "
                 "seed fallbacks - reused by all nine domain stores; this is composition, not copy-paste. The "
                 "<b>magic-number discipline</b> is real: the exchange peg (FX_KES_PER_USD = 129), the rental "
                 "price floor, verification validity windows, trial wallet balances, and trust floors are all "
                 "hoisted, named, and commented at their definition sites. The <b>header-comment culture</b> - "
                 "module headers that explain why localStorage, why hash routing, why the trust caps exist - "
                 "turns the codebase into its own documentation. And the finance module (src/lib/finance.ts, "
                 "270 lines) is genuinely well-built: correct amortisation and affordability mathematics with "
                 "named Kenyan cost constants, and previously covered by the now-deleted test suite."),
        ("h2", "Smells and their severity"),
        ("body", "The smell census came back unusually clean on the classics - zero TODO/FIXME/HACK markers, "
                 "two dev-only console statements, no commented-out code blocks - and concentrated instead on "
                 "structural issues. Twelve functions exceed 150 lines, with ManageView's component function "
                 "at 523 lines and the engine's respond routine near 850 including its data tables; these "
                 "monoliths are the primary reason the codebase is hard to test incrementally. Thirty-plus "
                 "call sites use Date.now() as a unique identifier where a single uuid helper (uuid is already "
                 "installed, unused) would prevent collision-prone rapid actions. The useStore effect closes "
                 "over its fallback argument with a [key] dependency list, so callers passing inline default "
                 "objects get stale references - latent, harmless today, confusing later. And the cross-tab "
                 "storage listener that keeps authentication coherent across tabs is implemented manually in "
                 "auth.tsx rather than living in the shared primitive where every store could benefit."),
        ("table", {
            "cols": [0.30, 0.14, 0.14, 0.42],
            "align": ['l', 'c', 'c', 'l'],
            "caption": "Code smell census by category, with audit severity and disposition.",
            "header": ["Category", "Count", "Severity", "Disposition"],
            "rows": [
                ["any / as any / ts-ignore", "0", "-", "None to remediate; guard by re-arming config (Ch. 26)"],
                ["Non-null assertions", "13", "Low", "Add a narrowing helper in compare feature"],
                ["as unknown as casts", "2", "Medium", "One dead (db.ts); one live - validate auto-listings JSON"],
                ["Functions over 150 lines", "~12", "Medium", "Refactor ManageView, DealAnalyst, engine respond()"],
                ["Date.now() identifiers", "30+", "Low", "Central uuid helper (uuid already installed)"],
                ["Dead UI components", "30 files", "High", "Delete in the Ch. 26 purge"],
                ["Dead modules / deps", "1 + ~20", "High", "Delete db.ts; prune package.json"],
                ["Inline format helpers", "~10 files", "Low", "Consolidate on src/lib/format.ts"],
                ["console statements", "2", "Low", "Both dev-guarded by design"],
            ],
        }),
        ("h2", "Git history as a quality signal"),
        ("body", "History quality is adequate but thin on process. Commit messages follow conventional-commit "
                 "prefixes with 38 honest Auto-Pilot chore commits declaring their listing counts. Two legacy "
                 "subjects break the convention; one earlier stray UUID-message commit was properly reset "
                 "before it ever reached origin. The structural weaknesses are the absence of pull-request "
                 "review (everything lands on main directly, so the pr-check workflow has never exercised its "
                 "intended path) and the eight distinct author identities, including automated identities "
                 "committing as the platform owner to satisfy Vercel Hobby plan attribution rules - a "
                 "documented, understandable workaround that nonetheless weakens the audit trail separating "
                 "human decisions from machine ones. The single-branch, no-review pattern is defensible at "
                 "one maintainer; Chapter 26 recommends lightweight PR discipline beginning with the first "
                 "multi-contributor change."),
    ],
})

# =====================================================================
CHAPTERS.append({
    "title": "Component Architecture",
    "blocks": [
        ("h2", "The shape of the component tree"),
        ("body", "The application mounts through a disciplined shell: KejaApp composes the hash router, a "
                 "global error boundary, a Suspense layer, the authentication and tokenization providers, and "
                 "then the route outlet - surrounded by the navbar, demo banner, footer, floating WhatsApp "
                 "entry, mobile tab bar, and install prompt. Below the shell sit 44 product views across 18 "
                 "feature folders (property, trust, shell, ai, finance, invest, manage, common, admin, data, "
                 "developer, diaspora, institutional, partners, tokenize, home, and the theme provider), with "
                 "31 of the 32 routes lazy-loaded for route-level code splitting. The only statically imported "
                 "view is Home - a choice that puts Home, the framework, and framer-motion into the first-load "
                 "critical path, examined further in Chapter 16."),
        ("body", "Consistency across views is a real strength. Every view follows the same anatomy - a badge "
                 "and title block, a max-width container, Lucide icons marked aria-hidden, Tailwind design "
                 "tokens rather than ad-hoc values - which makes navigation between features feel like one "
                 "product rather than a federation of experiments. Prop drilling is essentially absent: views "
                 "pull state directly from the domain hooks (useAllProperties, useLandlordStore, useAuth, "
                 "useTokenize, useSavedSearches), and the context layer is reserved for the four concerns that "
                 "genuinely need it (router, auth, tokenization, internationalisation)."),
        ("h2", "Monoliths"),
        ("body", "The component layer's principal weakness is a handful of views that grew into single-closure "
                 "monoliths. ManageView renders one 523-line component function; DealAnalystView reaches 418; "
                 "InvestorDashboardView 370; the properties browsing inner component 349. What these share is "
                 "not just length but the mixing of four concerns in one closure: derived-metric computation, "
                 "alert-rule evaluation, dialog state, and rendering. The cost is paid in testability (there is "
                 "no seam to exercise the alert rules without mounting the world), in review friction, and in "
                 "re-render scope - every state change in a 500-line closure re-runs the whole render "
                 "function. The audit's refactoring prescription in Chapter 26 is deliberately narrow: extract "
                 "the pure computation (metrics, alert evaluation, filters) into testable modules first, and "
                 "leave visual restructuring alone until the extraction lands."),
        ("h2", "The shadcn layer"),
        ("body", "The generated primitive layer tells a story of ambition outpacing usage. Of 48 shadcn/ui "
                 "files, application code imports 18 - dominated by button (37 files), badge (32), input (18), "
                 "label (15), tabs (10), and progress (9). The remaining 30 files (4,243 lines) have zero "
                 "importers: the entire sidebar system, the chart wrapper, cards, tables, dropdown menus, "
                 "calendars, carousels, drawers, command palettes, and more. Meanwhile the team hand-rolls "
                 "cards and menus with Tailwind classes in the views - competently, but outside the installed "
                 "component system. The pattern is classic generated-scaffold inheritance: the scaffold "
                 "assumed an admin-dashboard shape; the product that grew is a marketing-and-portal shape. The "
                 "correct response is subtraction (delete the unused 30, and the four dependencies that exist "
                 "only to serve them - embla-carousel, react-day-picker, react-resizable-panels, and the "
                 "react-hook-form stack used only by the dead form.tsx), not guilt-driven adoption."),
        ("chart", "chart_loc_by_area.png",
         "Component code dominates the source tree at 45.9 percent - appropriate for a client-side marketplace.",
         215),
        ("h2", "Cross-cutting components worth studying"),
        ("body", "Several components merit mention as exemplars for the team's own future work. ErrorBoundary "
                 "wraps the route outlet with a user-facing retry UI and correct dev-only logging (its lack of "
                 "production reporting is an observability gap, not a component defect). The focus-trap hook "
                 "implements stacked-dialog-aware focus management with escape handling and focus restoration - "
                 "genuinely sophisticated accessibility engineering. InstallPrompt implements the full "
                 "beforeinstallprompt choreography with an iOS Share-menu walkthrough, dismissal cooldowns, and "
                 "standalone-context suppression. CompareBar demonstrates the right way to lift shared "
                 "interaction state into a hook with a floating tray. These are the patterns to replicate when "
                 "building the Phase 2 surfaces; they are also the components that most deserve the first "
                 "regression tests."),
        ("h2", "Assessment"),
        ("body", "The component architecture scores well on consistency, composition, and accessibility, "
                 "adequately on performance-sensitive structure (lazy loading is in place; render-scope "
                 "discipline is not), and poorly on inventory hygiene. Nothing in this layer blocks Phase 2 "
                 "work. The priorities that emerge are: delete the dead 30 primitives and their four sole-user "
                 "dependencies; extract pure logic from the four monolith views to make the upcoming test "
                 "restoration meaningful; and hold the existing view anatomy conventions as law when new "
                 "server-backed surfaces arrive, because the codebase's uniformity is the asset most easily "
                 "lost and hardest to rebuild."),
    ],
})

# =====================================================================
CHAPTERS.append({
    "title": "State Management and Data Layer",
    "blocks": [
        ("h2", "The state architecture"),
        ("body", "State management in Keja AI is a three-layer design that fits its constraints precisely. "
                 "Layer one is build-time authored data: the seed catalog, Auto-Pilot JSON, and editorial "
                 "modules, merged at runtime by the inventory layer into the property collection the views "
                 "browse. Layer two is the generic persistence primitive: useStore in src/lib/store.ts, which "
                 "gives any domain a namespaced localStorage slot, seed defaults, JSON serialisation, and a "
                 "CustomEvent (keja-store-change) that keeps every hook consumer in sync within a tab. Layer "
                 "three is the nine domain stores built on that primitive - landlord, tenant, admin, search, "
                 "investor, developer, diaspora, professional, and valuation - plus two React contexts for "
                 "authentication and the tokenization sandbox, and a small set of feature hooks (saved "
                 "searches, notifications, alerts, compare) layered above the search store."),
        ("chart", "chart_storage.png",
         "Indicative persisted footprint by domain store: the tokenization, admin, and landlord domains carry the heaviest client-side state.", 250),
        ("h2", "Why this design works - and where it strains"),
        ("body", "The design works because it is honest about being single-device and single-tab-origin. The "
                 "stores are documented as such in their headers; the demo surfaces declare their nature; "
                 "bounded ring buffers (audit log at 500 entries, analytics at 200 events, listing signatures "
                 "at 200) show real quota awareness. The design strains in three specific places the audit "
                 "verified. First, the shared read() helper parses unvalidated JSON on every access - a "
                 "corrupted or truncated write silently falls back to seed data, which surfaces as mysterious "
                 "data loss and, in the admin or landlord domains, as quietly unreliable records. Second, "
                 "cross-tab coherence exists only for authentication; a landlord with the dashboard open in "
                 "two tabs will diverge state between them on every mutation. Third, the useStore effect "
                 "dependency pattern ([key] only, fallback closed over) produces stale defaults for callers "
                 "who pass inline seed objects - latent today, a trap for the next store author."),
        ("h2", "The data dictionary discipline"),
        ("body", "One practice in this layer deserves explicit praise because it quietly determines the cost "
                 "of Phase 2: the platform maintains a data dictionary (docs/DATA_DICTIONARY.md, "
                 "auto-generated from the source modules by a regeneration script) that documents every "
                 "persisted shape - fields, types, semantics - across the datasets. Combined with the fact "
                 "that every domain store's TypeScript interfaces already model what its server counterpart "
                 "would need (a RentalApplication with income and references; a landlord ledger with payments "
                 "and channels; a KYC record with document type and status), this means the Phase 2 migration "
                 "is a mapping exercise, not a discovery exercise. The audit's Phase 2 schema recommendations "
                 "in Chapter 24 were drafted directly against these interfaces; that is only possible because "
                 "the client layer kept its contracts typed and documented."),
        ("h2", "The server-shaped gap"),
        ("body", "The gap between this layer and a real marketplace backend is exactly one seam wide, and it "
                 "is worth enumerating what does not exist today: no fetch calls anywhere in src/ (verified - "
                 "zero network egress), no API client module, no query cache, no mutation queue, no "
                 "optimistic-update reconciliation, no conflict model for the day two devices edit the same "
                 "landlord ledger. The declared-but-unused react-query and zod packages are the scaffold's "
                 "ghost of this future. The audit's position, developed fully in Chapter 24, is that the seam "
                 "should be introduced at the store boundary: each domain hook gains an API-backed twin behind "
                 "the same call signature, with localStorage retained as the offline cache that the service "
                 "worker strategy already understands. That choice converts today's limitation (state lives "
                 "in the browser) into tomorrow's feature (state works offline and syncs when online) - which "
                 "is, not coincidentally, the right product promise for the Kenyan connectivity context the "
                 "platform was designed for."),
        ("table", {
            "cols": [0.24, 0.38, 0.38],
            "align": ['l', 'l', 'l'],
            "caption": "The nine domain stores and their Phase 2 server counterparts.",
            "header": ["Domain store (client)", "Owns today (localStorage)", "Phase 2 counterpart (server)"],
            "rows": [
                ["auth context", "Users, sessions, lockout counters, demo accounts", "Auth service: HttpOnly sessions, argon2, OIDC"],
                ["landlordStore", "Units, tenants, rent ledger, maintenance tickets", "Listings, tenancies, payments (M-Pesa reconciled), tickets"],
                ["tenantStore", "Applications with income, employer, references", "Application API + landlord notification pipeline"],
                ["adminStore", "Submissions, audit log, feeds, settings, reports", "Moderation queue, audit service, feed registry"],
                ["searchStore", "Saved searches, alerts, area coordinates, compare", "Per-user saved searches, server-side alert matching"],
                ["investorStore", "Portfolio positions, watchlists", "Portfolio service with market data feed"],
                ["tokenize context", "KYC records, trial wallet, ledger, orders", "CMA-sandboxed custody and settlement service"],
                ["diaspora / dev / pro", "Diaspora briefs, developer projects, pro workspace", "Portal APIs gated by role"],
                ["analytics (local)", "200-event ring buffer, taxonomy-typed", "Privacy-preserving product analytics (Plausible-class)"],
            ],
        }),
        ("h2", "Assessment"),
        ("body", "This is the layer the audit scores highest on design-for-purpose and highest on migration "
                 "readiness. The store primitive is clean, the domain decomposition is sensible, the contracts "
                 "are typed and documented, and the quota discipline shows forethought. The Medium findings "
                 "(unvalidated reads, single-tab events, stale-fallback hazard) are real but bounded. The "
                 "strategic point is that nothing here needs to be thrown away: the layer that was built to "
                 "work without a server is, properly extended, also the layer that makes the arrival of a "
                 "server safe - provided the introduction is done one domain at a time with the offline story "
                 "preserved deliberately rather than accidentally."),
    ],
})

# =====================================================================
CHAPTERS.append({
    "title": "AI Capability Assessment",
    "blocks": [
        ("h2", "What the AI actually is"),
        ("body", "The platform's most important naming decision - and its most dangerous expectation gap - "
                 "is the phrase <b>Ask Keja</b>. The AI advisor is not a language model. It is a 1,049-line "
                 "deterministic conversational engine (src/lib/ai/engine.ts) that classifies user intent "
                 "against a taxonomy, resolves entities (approximately fifty Nairobi-area aliases and "
                 "colloquialisms), performs investment mathematics over the live inventory, and composes "
                 "responses from parameterised templates - in English, Kiswahili, and French - with a "
                 "simulated 420-650 millisecond latency so the experience feels conversational rather than "
                 "instantaneous. A companion module (marketIntel.ts) answers natural-language questions over "
                 "the merged property collection. No LLM is called, no SDK is imported, no key exists in the "
                 "bundle. This is, the audit stresses, a defensible and even clever architecture for Phase 1: "
                 "it is free, offline-capable, latency-free, hallucination-free by construction, and its "
                 "answers are auditable line by line - properties a Kenya-market trust product should value "
                 "over conversational glamour."),
        ("h2", "The engine's architecture"),
        ("body", "Internally the engine is a pipeline: normalisation and language detection; intent "
                 "classification across a rule set covering search, affordability, investment math, area "
                 "questions, process questions (deposits, leases, Ardhisasa), and platform questions; entity "
                 "extraction against the alias tables; response composition with the labelling system "
                 "(FACT for verified data, ESTIMATE for computed figures with stated assumptions, ASSUMPTION "
                 "for user-supplied premises, REPORTED for third-party claims); and a closing layer that can "
                 "attach live property cards inline. The most safety-relevant component is the <b>escalation "
                 "guard</b>: legal, tax, and valuation questions are detected and routed to human handoff "
                 "with WhatsApp escalation rather than answered - the exact behaviour a rental platform "
                 "needs to avoid giving legal advice. This guard previously had a dedicated test suite "
                 "(escalation.test.ts, 58 lines) that was deleted in the rebuild and is first in line for "
                 "restoration in Chapter 22, because it is the single behaviour in the AI surface whose "
                 "silent regression would carry real user harm."),
        ("table", {
            "cols": [0.26, 0.37, 0.37],
            "align": ['l', 'l', 'l'],
            "caption": "Ask Keja capability inventory as implemented.",
            "header": ["Capability", "Implementation", "Assessment"],
            "rows": [
                ["Intent classification", "Rule-based taxonomy, trilingual", "Deterministic; needs regression table tests"],
                ["Area entity resolution", "~50 Nairobi aliases incl. colloquial forms", "Strong localisation moat; brittle to typos by design"],
                ["Investment mathematics", "Shared with finance module (single source)", "Correct per Ch. 8 review; untested (Ch. 22)"],
                ["Answer labelling", "FACT / ESTIMATE / ASSUMPTION / REPORTED", "Rare, trust-building; keep under any LLM upgrade"],
                ["Escalation guard", "Legal/tax/valuation to human handoff", "Safety-critical; restore tests first"],
                ["Property card attachment", "Inline results from merged inventory", "Good grounding behaviour"],
                ["Language support", "EN / SW / FR dictionaries", "UI-level depth varies; content mostly EN"],
                ["Memory", "Chat history in localStorage per user", "Single-device by architecture"],
            ],
        }),
        ("h2", "The expectation gap and how to close it"),
        ("body", "The risk is not the engine; it is the label. A product named and marketed as AI that "
                 "answers with template determinism will read as search-with-a-chatbox to the first "
                 "sophisticated user, while a product that quietly swaps in an LLM inherits every "
                 "hallucination and liability risk the current architecture elegantly avoids. The audit's "
                 "recommendation is a two-sided honesty play: in the near term, let the UI say what the "
                 "engine is (a rules-plus-data assistant with cited labels - the claims register already "
                 "provides the vocabulary); in Phase 2, when and only when the escalation guard has "
                 "regression tests and the server seam exists, integrate an LLM <b>behind the existing "
                 "engine interface</b> - the engine's contract (intent in, labelled response out) is "
                 "precisely the adapter shape an LLM needs, with the rule engine retained as the "
                 "deterministic fallback for offline use and for the question classes where the answer "
                 "must never vary. That sequencing preserves every property that makes the current "
                 "design trustworthy while opening the capability path the brand implies."),
        ("h2", "Adjacent AI surfaces"),
        ("body", "Two further surfaces carry the AI branding and deserve the same honesty treatment. The "
                 "<b>Deal Analyst</b> performs on-device document pre-screening - heuristic checks on "
                 "uploaded documents against expected patterns, with results framed as screening rather "
                 "than verdicts; it is genuine logic, modestly scoped, and correctly labelled. The "
                 "<b>trust scoring</b> that colours every listing card is deterministic arithmetic over "
                 "verification evidence and listing attributes with hard caps (synthetic listings capped "
                 "at 94, verified floors enforced) - this is arguably the platform's most valuable "
                 "\"AI\" asset precisely because it is explainable to a sceptical landlord, and the "
                 "audit's Phase 2 schema keeps its inputs first-class so the explanation survives the "
                 "database migration."),
    ],
})
