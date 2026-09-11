# -*- coding: utf-8 -*-
"""Content module 2: Architecture, Technology Stack, Source Inventory (Ch 4-6)."""

CHAPTERS = []

# =====================================================================
CHAPTERS.append({
    "part": "Part II - System Assessment",
    "title": "Architecture Assessment",
    "blocks": [
        ("h2", "The architectural pattern"),
        ("body", "Keja AI is a <b>static-export single-page application with a build-time data pipeline</b>. The "
                 "Next.js build produces a directory of static assets (out/, 21 MB) with one HTML shell; a custom "
                 "hash router (src/lib/router.tsx) implements navigation over hashchange events; and every "
                 "view, store, and AI routine executes in the browser. There are no API routes, no server "
                 "actions, no middleware, and no serverless functions: the mini-services directory contains only "
                 "a .gitkeep placeholder. Vercel's configuration confirms the intent - framework is null, every "
                 "path rewrites to index.html, and the build command stamps the service worker before deploy. "
                 "This is a deliberate architecture, documented in the repository's own engineering dossier, and "
                 "it was chosen for reasons that hold up well: it yields an offline-capable PWA, an installable "
                 "app on both mobile platforms from a single bundle, near-zero hosting cost, and a trivially "
                 "auditable security surface (no server to attack)."),
        ("chart", "diagram_current.png",
         "Current system architecture: four phases from authored data to client runtime, plus the Auto-Pilot growth loop.",
         330),
        ("h2", "Data flow"),
        ("body", "Data enters the system at build time through two authored sources: the seed catalog "
                 "(src/data/properties.ts, 27 richly-typed listings with verification blocks, trust signals, and "
                 "yield data) and the Auto-Pilot output (src/data/auto-listings.json, 5,630 lines carrying 60 "
                 "synthetic listings produced by 40 quality-gated pipeline runs). Editorial content - articles, "
                 "area guides, the claims register, tokenization assets - is authored in TypeScript alongside. "
                 "At runtime, an inventory layer (src/lib/inventory.ts) merges these sources with admin-approved "
                 "user submissions from localStorage into a single collection, applying the trust rules that cap "
                 "synthetic listings below verified ones. From there, nine domain stores own their slices of "
                 "user state. The growth loop closes the circle: a GitHub Actions cron job runs the Auto-Pilot "
                 "scanner four times daily, and when it finds new listings, it commits them to main, which "
                 "re-triggers the build and deploy. The marketplace literally grows through its own CI."),
        ("h2", "The hash router decision"),
        ("body", "The custom hash router deserves its own treatment because it is the highest-leverage "
                 "architectural decision in the repository. Hash routing (#/properties/KJA-001) works offline, "
                 "requires no server rewrite rules, behaves identically inside Capacitor shells and on the open "
                 "web, and never produces a 404. Those are real virtues for the Phase 1 constraints. The cost is "
                 "equally real and lands on the business rather than the code: search engines discard URL "
                 "fragments, so every property page, every article, and every area guide is invisible to organic "
                 "search; social shares unfurl as the generic home page because there is no per-route metadata; "
                 "and the sitemap - even if it were generated - would point at fragment URLs that Google will "
                 "not index as distinct pages. For a listings marketplace whose primary competitors (BuyRentKenya, "
                 "the most-trafficked dedicated property portal in East Africa, and Jiji with its enormous "
                 "classifieds footprint) acquire users predominantly through search, this is an existential "
                 "channel decision, not a technical preference. Chapter 24 frames the two honest options: accept "
                 "a PWA-first, WhatsApp-distributed product, or reintroduce path-based routes with prerendering "
                 "while keeping the SPA shell."),
        ("h2", "Strengths of the architecture"),
        ("bullet", [
            "<b>Single-concern clarity.</b> Everything the client needs ships in one immutable artifact; there is no API versioning, no partial deployment, no server state to reason about.",
            "<b>Offline and install parity.</b> The same bundle serves keja.app over the CDN and the Android/iOS Capacitor shells from disk, so the PWA and native tracks cannot drift.",
            "<b>Auditable security surface.</b> With no endpoints, the OWASP server-side categories simply do not apply; the audit confirmed zero network egress from the client bundle.",
            "<b>CI-native data operations.</b> Listing changes arrive through reviewed, attributable commits with quality gates - arguably safer than an admin UI backed by a database at this team size.",
            "<b>Honest boundaries.</b> Module headers state the localStorage ceiling (5 MB, single-device, client-mutable) rather than hiding it; the demo surfaces label themselves.",
        ]),
        ("h2", "Where the architecture has hit its ceiling"),
        ("body", "Three ceilings are now load-bearing. The first is <b>persistence</b>: localStorage cannot "
                 "cross devices, cannot exceed roughly five megabytes, cannot be backed up, and is trivially "
                 "mutable by any user - which is fine for favourites and fatal for rent ledgers, KYC records, "
                 "and authentication. The second is <b>truth</b>: with no server, there is no shared fact "
                 "between a landlord and a tenant, which is the definition of a marketplace. The third is "
                 "<b>trust in computation</b>: financial calculations and authorization decisions execute in the "
                 "client, where they can be inspected and altered; a payments-relevant platform eventually needs "
                 "its arithmetic and its permissions to live somewhere a user cannot edit. None of these "
                 "ceilings argues for abandoning the SPA - they argue for the single seam described in Chapter "
                 "22, behind which PostgreSQL, real authentication, and M-Pesa can live while the client surface "
                 "stays recognisably itself."),
        ("table", {
            "cols": [0.26, 0.37, 0.37],
            "align": ['l', 'l', 'l'],
            "caption": "Architectural forces: what the static-first design wins and what it costs.",
            "header": ["Force", "Static-first wins", "Static-first costs"],
            "rows": [
                ["Offline capability", "Full offline shell with cached listings; SW three-tier strategy", "Conflicts with future live-inventory freshness"],
                ["Hosting economics", "CDN-only cost near zero on Hobby tier", "Any backend addition reintroduces server budgeting"],
                ["SEO / acquisition", "No infrastructure to scale; deploys are atomic", "Fragment URLs unindexable; channel effectively closed (see Ch. 17)"],
                ["Security surface", "Nothing to attack server-side; no secrets in bundle", "All trust decisions client-side and mutable; no CSP yet"],
                ["Data integrity", "Nothing to corrupt centrally; per-device isolation", "No shared truth; ledgers and KYC are suggestions, not records"],
                ["Delivery speed", "One artifact, one pipeline, no environments", "No preview environments possible on current Hobby setup"],
            ],
        }),
        ("h2", "Assessment"),
        ("body", "Scored as a Phase 1 architecture, this design earns strong marks: it is coherent, documented, "
                 "honest about its limits, and it shipped. Scored as a foundation for the business the product "
                 "narrative describes - verified rentals, managed payments, tokenized assets - it is a seed "
                 "stage. The audit's judgment is that the architecture should be <b>extended, not replaced</b>: "
                 "the store abstraction (one generic useStore primitive feeding nine domain hooks) is precisely "
                 "the interface a server-backed persistence layer needs, and the route layer's isolation behind "
                 "a custom router means the router itself can evolve without touching views. The worst outcome "
                 "would be a rewrite; the second worst would be pretending the ceilings are further away than "
                 "they are. The recommendations in Part VI are sequenced to avoid both."),
    ],
})

# =====================================================================
CHAPTERS.append({
    "title": "Technology Stack Assessment",
    "blocks": [
        ("h2", "Stack inventory"),
        ("body", "The declared stack is modern and, at its core, correctly chosen. Next.js 16.1.3 (locked) on "
                 "React 19.2.3 provides the build; TypeScript 5 with strict mode compiles it; Tailwind CSS 4 "
                 "with the CSS-first @theme configuration styles it; and a shadcn/ui new-york component layer "
                 "with 27 Radix primitives supplies interaction patterns. Animation is framer-motion 12, "
                 "charting is recharts 2.15, fonts are self-hosted Geist families via next/font, and the native "
                 "track is Capacitor 8.5.1 with splash-screen and status-bar plugins. Tooling is Bun-first: "
                 "bun.lock governs installs (1,022 packages deep), Node 22 is pinned by .nvmrc and CI, and the "
                 "deploy pipeline runs on GitHub Actions with the Vercel CLI prebuilt flow."),
        ("table", {
            "cols": [0.24, 0.16, 0.14, 0.46],
            "align": ['l', 'c', 'c', 'l'],
            "caption": "Core dependency posture (locked versions at commit 86e2a66).",
            "header": ["Layer", "Package", "Version", "Audit note"],
            "rows": [
                ["Framework", "next", "16.1.3", "Current major; static export path exercised daily by CI"],
                ["Runtime UI", "react / react-dom", "19.2.3", "React 19 stable line; no concurrent-feature misuse found"],
                ["Language", "typescript", "^5.x", "strict: true but noImplicitAny: false - see Ch. 8"],
                ["Styling", "tailwindcss", "4.1.18", "v4 CSS-first config in globals.css; tailwind.config.ts is dead v3 legacy"],
                ["Components", "@radix-ui/* (27)", "mixed", "18 of 48 generated shadcn files actually imported; 30 are dead weight"],
                ["Motion", "framer-motion", "12.23.2", "Used in 14 files; no prefers-reduced-motion strategy"],
                ["Charts", "recharts", "2.15.4", "Used in 6 files; duplicated into two async chunks (~300 KB waste)"],
                ["Native", "@capacitor/*", "8.5.1", "Full Android/iOS projects tracked; app id com.chacadom.keja"],
                ["Dormant", "prisma + @prisma/client", "6.19.2", "In dependencies; zero runtime importers; starter schema only"],
                ["Dormant", "next-auth", "4.24.13", "EOL v4 line, never imported; should be removed (audit trail noise)"],
                ["Dormant", "z-ai-web-dev-sdk", "0.0.18", "Declared, never imported; no AI key exists in the bundle"],
            ],
        }),
        ("h2", "The deadwood problem"),
        ("body", "The stack assessment's most material finding is that roughly twenty declared dependencies are "
                 "never imported anywhere in src/: zustand, next-auth, both TanStack packages (react-query and "
                 "react-table), zod, the dnd-kit trio, next-intl, date-fns, uuid, react-syntax-highlighter, "
                 "the MDX editor, and the z-ai SDK among them. These are scaffold carryovers from the platform "
                 "that generated the original project. Each one costs install time in CI (the lockfile is 345 "
                 "KB), inflates the audit surface for security scanners, and - more subtly - misleads any "
                 "engineer or investor reading package.json into believing the platform uses react-query, zod, "
                 "and NextAuth when it uses none of them. The pattern extends to code: 30 of 48 shadcn UI "
                 "components (4,243 lines, including the two largest UI files in the repository) have zero "
                 "importers, and src/lib/db.ts instantiates a Prisma client that nothing consumes. Chapter 26 "
                 "prescribes the purge; it is the single cheapest high-impact action available to the team."),
        ("chart", "chart_deadcode.png",
         "shadcn/ui primitives by import status: 30 of 48 generated files are never imported by application code.",
         240),
        ("h2", "Configuration posture"),
        ("body", "Build configuration mixes good discipline with quietly disabled guardrails. On the disciplined "
                 "side: vercel.json pins the toolchain (Bun frozen installs), sets correct cache headers "
                 "(service worker at max-age=0 must-revalidate; imagery on seven-day), and ships a full security "
                 "header set including HSTS with a one-year max-age. On the disabled side: next.config.ts sets "
                 "typescript.ignoreBuildErrors to true (compensated only because CI runs tsc separately), "
                 "reactStrictMode is false, tsconfig weakens strict mode with noImplicitAny: false and "
                 "allowJs: true, and the ESLint flat config explicitly turns off twenty-six rules - including "
                 "correctness rules (no-undef, no-unreachable, no-fallthrough) that no team should ever "
                 "surrender. The lint gate, as configured, passes by construction rather than by quality. The "
                 "audit treats the configuration layer as a High-severity trust issue: the repository tells its "
                 "tools to look away, and a future contributor has no signal telling them so."),
        ("code", "// eslint.config.mjs (excerpt) - rules disabled from the recommended sets\n"
                 "\"@typescript-eslint/no-explicit-any\": \"off\",\n"
                 "\"@typescript-eslint/no-unused-vars\": \"off\",\n"
                 "\"react-hooks/exhaustive-deps\": \"off\",\n"
                 "\"no-console\": \"off\", \"no-undef\": \"off\", \"no-unreachable\": \"off\",\n"
                 "// tsconfig.json\n"
                 "\"strict\": true, \"noImplicitAny\": false, \"allowJs\": true,\n"
                 "// next.config.ts\n"
                 "typescript: { ignoreBuildErrors: true }, reactStrictMode: false"),
        ("h2", "Version currency and risk"),
        ("body", "Everything on the critical path is current: Next.js 16.1.3, React 19.2.3, Tailwind 4.1.18, "
                 "Prisma 6.19.2 (dormant but modern), Capacitor 8.5.1 with targetSdk 36 on Android. The risk "
                 "concentrates in the unused tail: next-auth 4 sits on the end-of-life v4 line with known 2024 "
                 "CVE history (patched in this patch release, and unreachable in production since it is never "
                 "imported - but it should not be in the tree at all), and the 0.x z-ai SDK is unaudited "
                 "third-party code that the platform does not actually use. The deeper version risk is "
                 "structural rather than per-package: with 81 declared dependencies and 1,022 installed "
                 "packages, a static-export SPA is carrying a supply chain sized for a serverful application. "
                 "Chapter 26's dependency purge reduces both the real and the perceived exposure."),
    ],
})

# =====================================================================
CHAPTERS.append({
    "title": "Source Inventory and Code Metrics",
    "blocks": [
        ("h2", "What is actually in the repository"),
        ("body", "The tracked tree contains 435 files. The application source (src/) is 136 files and 33,253 "
                 "lines: 92 components (48 shadcn primitives plus 44 product views across 18 feature folders), "
                 "32 library modules, 6 authored data modules, 3 app-router files, 2 hooks, and 1 config. "
                 "Around it live 122 public assets (84 property photographs with jpg/webp pairs, 17 iOS splash "
                 "screens, 6 icons, brand imagery, the service worker, the manifest, the offline page), complete "
                 "Capacitor Android (77 files) and iOS (26 files) projects, 32 operational scripts (the "
                 "Auto-Pilot pipeline, the sitemap generator, PWA asset generation, PDF document builders), 18 "
                 "documentation files with rendered PDF editions, and the four GitHub Actions workflows. The "
                 "repository pack weighs 23.4 MB - reasonable for the content, though Chapter 16 identifies "
                 "roughly five megabytes of deployed imagery that no code references."),
        ("chart", "chart_files_by_dir.png",
         "Distribution of the 435 tracked files across top-level directories.", 235),
        ("h2", "Where the lines are"),
        ("body", "Line-count distribution tells the architecture's story at a glance. Components hold 45.9 "
                 "percent of source lines and the authored data modules 26.6 percent - together nearly "
                 "three-quarters of the codebase is presentation and content, which is exactly what a "
                 "client-side marketplace should look like. The library layer (25.4 percent) carries the "
                 "platform's real engineering: the router, the store primitive, the nine domain stores, the "
                 "finance mathematics, the AI engine, verification, analytics, and CSV export. Within that "
                 "layer, the largest files are also the most consequential - the conversational engine at 1,049 "
                 "lines, the tokenization store context at 1,041, the authentication layer at 556 - and the "
                 "audit's file-level findings in Part III concentrate there."),
        ("chart", "chart_loc_by_area.png",
         "Lines of TypeScript/TSX by source area (33,253 total).", 220),
        ("chart", "chart_top_files.png",
         "The twelve largest source files by line count; the dead sidebar component is flagged in red.",
         290),
        ("h2", "Size hotspots and what they mean"),
        ("body", "The hotspot list rewards a careful read. src/data/auto-listings.json at 5,630 lines is "
                 "generated output committed to the repository - acceptable for a static pipeline, but it will "
                 "grow linearly with inventory and Chapter 24 recommends a strategy before it reaches ten "
                 "thousand lines. The seed catalog (1,927 lines) is authored content with real domain modelling "
                 "in its types. The remaining hotspots split into two classes: files that are legitimately "
                 "complex domains (the engine, the tokenization context, the property detail view, the landlord "
                 "and admin stores) and files that are simply monolithic - ManageView renders a 523-line "
                 "component function mixing metrics, alerts, dialogs, and tables in one closure. Chapter 26 "
                 "sets a refactoring agenda for the second class, sized to the places where complexity actually "
                 "hurts (re-testability and change confidence) rather than to a cosmetic line budget."),
        ("table", {
            "cols": [0.30, 0.12, 0.58],
            "align": ['l', 'c', 'l'],
            "caption": "The ten largest hand-written modules and their audit disposition.",
            "header": ["File", "Lines", "Disposition"],
            "rows": [
                ["src/lib/ai/engine.ts", "1,049", "Complex but cohesive; needs regression tests before any Phase 2 LLM work (Ch. 22)"],
                ["src/lib/tokenizeStore.tsx", "1,041", "Monolithic context; KYC persistence is a Critical finding (Ch. 12)"],
                ["src/components/tokenize/TokenizeView.tsx", "744", "Split presentation from order-book simulation"],
                ["src/components/ui/sidebar.tsx", "726", "Dead code - delete (Ch. 26)"],
                ["src/components/property/PropertyDetailView.tsx", "657", "Good structure; add lead-capture reality (Ch. 18)"],
                ["src/lib/adminStore.ts", "642", "Sound; admin surface itself is ungated (Ch. 12)"],
                ["src/lib/landlordStore.ts", "622", "Clean store pattern; ledger needs server truth in Phase 2"],
                ["src/components/manage/ManageView.tsx", "588", "Refactor priority one: 523-line component function"],
                ["src/components/home/Home.tsx", "564", "Static import inflates initial bundle (Ch. 16)"],
                ["src/lib/auth.tsx", "556", "Contains the Critical DJB2 finding; Phase 2 auth seam"],
            ],
        }),
        ("h2", "Repository hygiene"),
        ("body", "Hygiene is mixed but improving. The .gitignore correctly excludes the sandbox's working "
                 "directories, no .env file was ever committed (verified across all 106 commits), and the "
                 "worklog discipline of the operating team is visible in the commit history. Against that: the "
                 "tests directory contains three orphaned shell scripts that test a .zscripts platform "
                 "directory which does not exist in the repository - dead weight that misrepresents the test "
                 "story to any reader; scripts/prerender.mjs is a leftover from the Vite era referencing a "
                 "dist/ directory that no longer exists; the dead tailwind.config.ts v3 file contradicts the "
                 "actual v4 CSS-first configuration; and binary weight is carried in the form of six duplicate "
                 "939 KB iOS splash PNGs and committed PDF build artifacts under scripts/keja-docs. None of "
                 "these is urgent; all of them are one afternoon of cleanup that materially raises the "
                 "repository's credibility with outside engineers."),
    ],
})
