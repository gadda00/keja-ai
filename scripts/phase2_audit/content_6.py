# -*- coding: utf-8 -*-
"""Content module 6: Mobile, DevOps, Observability, Testing (Ch 17-20)."""

CHAPTERS = []

# =====================================================================
CHAPTERS.append({
    "title": "Mobile and Capacitor Strategy",
    "blocks": [
        ("h2", "A real strategy, not scaffolding"),
        ("body", "The mobile story is unusually complete for a web-first platform. The Android directory "
                 "is a full Gradle project (77 tracked files), not a generated stub: applicationId "
                 "com.chacadom.keja, minSdk 24 targeting the long Android tail, targetSdk 36 on current "
                 "policy, adaptive icons across densities, splash drawables in every bucket, singleTask "
                 "launch mode, and - the detail that proves intent - deep-link intent filters for "
                 "https://keja.app with autoVerify plus the keja:// custom scheme. The iOS project (26 "
                 "files) carries the Xcode workspace, a Swift AppDelegate, the URL scheme in Info.plist, "
                 "and asset catalogs. The Capacitor configuration points webDir at the static export "
                 "itself, so the native shells consume the exact artifact the web deploys - one build, "
                 "three runtimes, zero drift."),
        ("h2", "What ships and what is missing"),
        ("body", "What exists is the packaging layer; what is missing is the release engineering around "
                 "it. The package scripts (mobile:sync, mobile:android, mobile:ios, mobile:apk) and a "
                 "credible runbook (docs/MOBILE.md) cover local builds, but there is no native CI - no "
                 "workflow builds an APK or archive, despite the deploy pipeline being otherwise strong. "
                 "There is no signing configuration, no versionCode bump automation (it sits at 1), no "
                 "store listings, no TestFlight or Play internal-track pipeline, and no crash reporting "
                 "layer (the shell would host Sentry's native SDK naturally). The deep-link autoVerify "
                 "declaration, notably, requires an assetlinks.json served from keja.app to actually "
                 "verify - currently absent, so Android links fall back to the disambiguation dialog."),
        ("table", {
            "cols": [0.34, 0.16, 0.50],
            "align": ['l', 'c', 'l'],
            "caption": "Mobile release-engineering readiness.",
            "header": ["Capability", "Status", "Gap to store-ready"],
            "rows": [
                ["Android project", "Ready", "Signing keystore + versionCode automation"],
                ["iOS project", "Ready", "Developer account, provisioning, Podfile via cap sync"],
                ["Deep links (Android)", "Declared", "Serve assetlinks.json from keja.app/.well-known to activate autoVerify"],
                ["Deep links (iOS)", "Declared", "Associated-domains entitlement at build time"],
                ["Native CI", "Absent", "GitHub Actions matrix building debug APK on merge"],
                ["Distribution", "Absent", "Play internal track + TestFlight; store listings"],
                ["Crash reporting", "Absent", "Sentry native (pairs with web SDK from Ch. 21)"],
                ["Push notifications", "Absent", "Requires Phase 2 backend; FCM plugin when it lands"],
            ],
        }),
        ("h2", "Strategic value"),
        ("body", "The audit's judgment is that the Capacitor track is worth completing, and worth "
                 "completing before it rots: native shell projects decay quickly when unexercised (Gradle "
                 "and Xcode toolchains move; a year-old untested project is a rebuild). The economics "
                 "favour it - the marginal cost of an installed Android presence is one signing key, one "
                 "workflow, and one internal-track submission, on top of an artifact that already "
                 "exists. The distribution logic favours it too: in a market where app-store presence "
                 "signals legitimacy to landlords and agents, the store listing is a trust asset as much "
                 "as an acquisition channel. The one caution is sequencing: push notifications and any "
                 "native payment flow belong behind the Phase 2 backend, so the first store release "
                 "should ship as the browse-and-WhatsApp product it currently is, not a simulated one."),
        ("h2", "Assessment"),
        ("body", "Mobile readiness is genuine but dormant: 4 of 5 on packaging, 2 of 5 on release "
                 "engineering. The audit schedules the assetlinks.json activation (which also completes "
                 "the deep-link story for the PWA's shared URLs) inside the first 30 days, and the "
                 "signing-and-internal-track work as a day-60 milestone contingent on the Phase 2 "
                 "decision, since the value of a store presence compounds with real data flows behind it."),
    ],
})

# =====================================================================
CHAPTERS.append({
    "title": "DevOps, CI/CD and Delivery",
    "blocks": [
        ("h2", "Pipeline inventory"),
        ("body", "Four GitHub Actions workflows govern delivery, and their design is coherent with the "
                 "static architecture. The deploy pipeline (deploy-vercel.yml) runs on pushes to main: "
                 "Bun frozen install, the tsc gate, the lint gate, the Vercel CLI prebuilt flow (pull, "
                 "build with the SW stamp, deploy), and then a live smoke test - five-retry GET on the "
                 "production URL, verification of the service-worker cache header, the frame-options "
                 "header, the manifest, and the SPA rewrite on a deep link. The PR pipeline (pr-check.yml) "
                 "runs the same gates without deploying. The production check (production-check.yml) "
                 "runs hourly on a matrix - the deployment URL as required, keja.app as warning-only "
                 "until DNS fully propagates. And the Auto-Pilot (auto-listings.yml) runs four times "
                 "daily: scan, enrich, dedupe, quality-gate, publish JSON, prettier, commit as the owner "
                 "identity (the documented Vercel Hobby attribution workaround), push, verify."),
        ("h2", "What the pipeline gets right"),
        ("bullet", [
            "<b>Gates that mean something (almost):</b> typecheck and a real static build on every path to production - the two checks that catch the classes of error this codebase can produce.",
            "<b>Post-deploy verification:</b> the smoke test checks behaviour (rewrite, headers, manifest) rather than mere reachability - rare discipline at this stage.",
            "<b>Concurrency control:</b> deploy groups prevent overlapping production deployments.",
            "<b>Toolchain pinning:</b> Node 22 via nvmrc, Bun 1.3.14 in CI, frozen lockfile installs - reproducible builds in practice, not just in theory.",
            "<b>Secrets hygiene:</b> a single VERCEL_TOKEN remains after the Netlify migration cleanly removed both Netlify secrets; org and project IDs are public non-secrets.",
            "<b>Honest failure semantics:</b> the Auto-Pilot defines exit-code contracts (including a nothing-to-do code) and writes step summaries a human can read later.",
        ]),
        ("h2", "Gaps in the delivery system"),
        ("body", "The gaps cluster around environments and rollback. There is <b>no staging or preview "
                 "environment</b>: every merge to main reaches production, and the PR workflow's build "
                 "never produces a URL a human could click (a Vercel Hobby-plan consequence of the "
                 "prebuilt-CLI flow, but also an unexamined choice - GitHub Pages or a second project "
                 "could serve previews). <b>Rollback is manual</b>: the Vercel dashboard offers instant "
                 "promotion of any prior deployment, and DEPLOYMENT.md documents this, but nothing "
                 "automates it - the smoke test can fail while the bad deploy stays live until a human "
                 "notices GitHub's email. <b>Attribution is a standing compromise:</b> commits authored "
                 "as the owner identity to satisfy Hobby-plan rules blur the audit trail between human "
                 "and machine decisions. And the <b>unwired sitemap</b> (Chapter 17) is at root a DevOps "
                 "gap - a generator that exists but that no pipeline invokes, which is the delivery "
                 "system's version of a smoke detector in a drawer."),
        ("table", {
            "cols": [0.30, 0.16, 0.54],
            "align": ['l', 'c', 'l'],
            "caption": "DevOps maturity assessment.",
            "header": ["Capability", "Maturity", "Notes and next step"],
            "rows": [
                ["Build gates (tsc, lint, build)", "Good", "Real gates on every path; lint itself neutered by config (Ch. 8)"],
                ["Deployment automation", "Good", "CLI prebuilt flow, deterministic; depends on one token"],
                ["Post-deploy smoke testing", "Good", "Behavioural checks with retries; extend to sitemap and a listing URL"],
                ["Monitoring / alerting", "Basic", "Hourly synthetic check; no alert routing beyond GitHub notifications"],
                ["Preview environments", "Absent", "Add a preview target (second project or branch aliasing) before team growth"],
                ["Rollback automation", "Absent", "Vercel API promote on smoke-failure is a one-workflow addition"],
                ["Release management", "Absent", "No tags, changelogs, or versioning discipline for the app itself"],
                ["Native CI", "Absent", "Covered in Ch. 19"],
            ],
        }),
        ("h2", "The Auto-Pilot as a delivery pattern"),
        ("body", "Worth isolating for a moment: the Auto-Pilot is the repository's most original piece of "
                 "engineering culture. It treats inventory growth as a delivery problem - commits with "
                 "quality gates, attributable history, verification jobs, and a promotion path through "
                 "the same pipeline that ships code - rather than as an admin-UI-and-database problem. "
                 "For a solo-maintained platform this is the correct trade: the audit trail is the "
                 "review. Its risks are the ones it documents about itself: synthetic enrichment must "
                 "never masquerade as verification (enforced by trust caps and claim rules today), and "
                 "commit volume (34 of the last 38) can drown human history (mitigated by conventional "
                 "chore prefixes and step summaries). The pattern deserves preservation into Phase 2 - "
                 "as a feed-ingestion service with the same gates, rather than being discarded in "
                 "favour of manual listing entry."),
        ("h2", "Workflow-by-workflow breakdown"),
        ("table", {
            "cols": [0.20, 0.16, 0.64],
            "align": ['l', 'l', 'l'],
            "caption": "deploy-vercel.yml - the production path, step by step.",
            "header": ["Step", "Tooling", "What it proves (and does not)"],
            "rows": [
                ["Credentials guard", "bash", "Fails fast with a readable message if VERCEL_TOKEN is absent"],
                ["Install", "Bun 1.3.14, frozen lockfile", "Reproducible dependency tree; no drift between runs"],
                ["Typecheck", "tsc --noEmit", "The real type gate (compensates ignoreBuildErrors); catches the classes lint cannot"],
                ["Lint", "eslint (config as reviewed in Ch. 8)", "Currently weak; passes by construction until re-armed (F-15)"],
                ["Vercel pull", "vercel CLI", "Project + environment metadata for the prebuilt flow"],
                ["Build (prod)", "NEXT_STATIC=1 next build + sw-version stamp", "Static export plus content-hash SW versioning"],
                ["Deploy prebuilt", "vercel deploy --prebuilt --prod", "Artifact promotion; concurrency-group guarded"],
                ["Smoke test", "curl + assertions, 5 retries", "Live GET, SW cache header, X-Frame-Options, manifest 200, SPA rewrite on a deep link"],
            ],
        }),
        ("table", {
            "cols": [0.20, 0.16, 0.64],
            "align": ['l', 'l', 'l'],
            "caption": "auto-listings.yml - the growth loop, step by step (4x daily).",
            "header": ["Step", "Tooling", "Notes"],
            "rows": [
                ["Scan + feeds", "zero-dep Node", "Simulated scanner and feed adapters; env-passed inputs per injection guidance"],
                ["Enrich", "zero-dep Node", "Template enrichment; never claims verification"],
                ["Dedupe + quality gate", "zero-dep Node", "Deterministic; exit code 3 = nothing to do"],
                ["Publish", "writes auto-listings.json", "Prettier-formatted for reviewable diffs"],
                ["Commit + push", "git as owner identity", "Vercel Hobby attribution requirement; triggers deploy"],
                ["Verify", "git + API checks", "Step summary written for later human reading"],
            ],
        }),
        ("body", "The hourly production check runs the smoke assertions on a matrix - the deployment URL "
                 "as a required check, keja.app as warning-only while DNS settles - and its alert routing "
                 "is, today, GitHub's default notification email, which the observability chapter "
                 "addresses. The PR workflow mirrors the deploy gates without deploying; it has never "
                 "run against an actual pull request, because none has ever been opened - a fact that "
                 "is simultaneously a strength (the mainline has stayed disciplined without review) "
                 "and a latent risk (the workflow itself is untested in its intended role, and the "
                 "team has no PR muscle memory for the day it matters)."),
        ("h2", "Assessment"),
        ("body", "DevOps scores 3.5 of 5 - genuinely strong for a Hobby-tier solo operation, with the "
                 "deficit concentrated in environments and reversal rather than in building or "
                 "verifying. The audit's sequencing: wire the sitemap and extend the smoke test (week "
                 "one, costless); add the rollback-promotion workflow (week two, one file); stand up a "
                 "preview target when the second contributor arrives; adopt tagging and changelogs when "
                 "the store-track release work begins."),
    ],
})

# =====================================================================
CHAPTERS.append({
    "title": "Observability",
    "blocks": [
        ("h2", "Production is a black box"),
        ("body", "The observability finding is categorical: <b>the platform is blind in production</b>. "
                 "There is no error tracking - the global ErrorBoundary logs component errors only when "
                 "NODE_ENV is development, so every production client exception vanishes silently. There "
                 "is no remote product analytics - the analytics module is a deliberate local-only ring "
                 "buffer (200 events, taxonomy-typed, zero egress) that is admirable as privacy "
                 "engineering and useless for learning anything about usage off-device. There is no "
                 "real-user monitoring of web vitals, no funnel measurement, no crash aggregation for "
                 "the Capacitor shells, no uptime alerting beyond GitHub's default notification for a "
                 "failed hourly workflow, and no status page. The hourly synthetic check tells the team "
                 "the origin still returns 200; it cannot tell them that a render regression blanked the "
                 "properties view on Android 11 at 09:00."),
        ("table", {
            "cols": [0.28, 0.16, 0.56],
            "align": ['l', 'c', 'l'],
            "caption": "Observability coverage matrix.",
            "header": ["Signal", "Coverage", "Recommended instrumentation"],
            "rows": [
                ["Client errors", "None (dev-only logs)", "Sentry browser SDK behind the existing analytics consent posture; source maps uploaded in CI"],
                ["Web vitals (RUM)", "None", "web-vitals reporting into the same privacy-respecting collector"],
                ["Product analytics", "Local ring only", "Plausible-class (cookieless, KE-hosted or self-host) - preserves the no-tracker property"],
                ["Uptime", "Hourly synthetic", "Keep; route alerts to email/WhatsApp beyond GitHub defaults"],
                ["Deploy health", "Smoke test", "Extend to sitemap.xml and one deep listing URL"],
                ["Native crashes", "None", "Sentry native SDK when store track activates (Ch. 19)"],
                ["Funnel / conversion", "None", "Event taxonomy already exists locally; mirror it server-side"],
            ],
        }),
        ("h2", "Why the local analytics design helps the fix"),
        ("body", "The platform's existing analytics module is the right foundation for the remediation, "
                 "which is worth explaining because it is unusual. The module defines a typed taxonomy of "
                 "eleven event kinds, respects a consent posture, stores locally, and never transmits. "
                 "That means the remediation is not add-a-tracker - it is choose-a-destination: a "
                 "cookieless, script-light collector (the Plausible class, or a self-hosted "
                 "Countly/Umami behind keja.app itself) can receive the same taxonomy as opt-in beacons, "
                 "preserving both the privacy promise and the analytic vocabulary the product already "
                 "speaks. The same one-seam logic applies to errors: Sentry's browser SDK can be "
                 "initialised inside the existing ErrorBoundary with a release tag stamped from the "
                 "service-worker version, giving content-addressed error attribution - the version "
                 "string already encodes the exact artifact hash."),
        ("h2", "Assessment and sequencing"),
        ("body", "Observability is the platform's second-lowest score (after testing) and the cheapest "
                 "gap to close relative to its value: a day of work converts the platform from mute to "
                 "instrumented. The audit's rule for sequencing is that <b>no growth activity should "
                 "precede instrumentation</b> - paid traffic or partner launches against a blind "
                 "production system convert spend into unattributable outcomes. Concretely: Sentry "
                 "(errors) plus a cookieless analytics destination plus smoke-test extension are "
                 "scheduled inside the first 30 days of Chapter 27, before the SEO prerendering work "
                 "whose impact they would measure, and before any partner-facing push from the "
                 "marketing documents."),
    ],
})

# =====================================================================
CHAPTERS.append({
    "title": "Testing Assessment",
    "blocks": [
        ("h2", "Current state: zero"),
        ("body", "The single most consequential quality finding in this audit is simple to state: the "
                 "platform ships with no automated tests. The tests directory contains three shell "
                 "scripts (170 lines) that exercise a .zscripts platform directory which does not exist "
                 "in the repository - orphaned tooling tests, not application tests. There is no test "
                 "runner in the dependency tree, no test script in package.json, no configuration, no "
                 "fixtures, no CI step. Every one of the 106 commits that built this platform - "
                 "including the 254-file framework rebuild - was verified by typecheck, lint, and build "
                 "alone."),
        ("h2", "What existed, and what its loss means"),
        ("body", "The git archaeology matters here, because the platform once had the right instincts. "
                 "Before the Next.js rebuild, the repository carried 23 test suites totalling 3,039 "
                 "lines - landlordStore tests (298 lines), finance tests (160), escalation tests for "
                 "the AI guard (58), tokenization store tests, verification tests, route tests, SEO "
                 "meta tests - plus vitest configuration with coverage scripts, a composite verify "
                 "gate (typecheck, lint with zero warnings, tests, build), husky pre-commit hooks, and "
                 "prettier. Commit ae0b2e3 deleted all of it alongside the Vite application it tested. "
                 "The loss is not merely of the tests as artefacts; it is of the <b>regression memory</b> "
                 "they encoded: the finance module's amortisation edge cases, the escalation guard that "
                 "keeps legal questions out of the AI's confident answers, the store invariants that "
                 "keep trust scores capped. Documentation still cites one of these suites as evidence "
                 "(REVIEW_ACTIONS.md references escalation.test.ts as implemented), which makes the gap "
                 "actively misleading to a reader."),
        ("chart", "chart_tests.png",
         "Test coverage deleted in the rebuild commit ae0b2e3, by suite.", 225),
        ("h2", "Coverage gap analysis"),
        ("body", "The audit ranked the untested surface by blast radius, on the principle that the first "
                 "tests restored should guard the code that would hurt most to break silently. At the "
                 "top sits the <b>finance module</b> - pure functions, high consequence, previously "
                 "tested: amortisation, affordability, and the KES/USD peg arithmetic shown to users "
                 "in calculators and listings. Second, the <b>AI engine's escalation guard and intent "
                 "routing</b> - the safety property that routes legal, tax, and valuation questions to "
                 "human handoff, plus the FACT/ESTIMATE labelling that underwrites the platform's trust "
                 "marketing. Third, the <b>search matching logic</b> - the query parser with its subtle "
                 "K/M/k unit scaling and the trust-floor filters. Fourth, the <b>tokenization order "
                 "book invariants</b> - supply caps, balance conservation, and ledger integrity in the "
                 "simulation. Fifth, the <b>store primitive itself</b> - serialisation, seeding, and "
                 "event propagation, since every domain depends on it. The views, by contrast, need "
                 "smoke-level rendering tests first and deep interaction tests only as Phase 2 lands "
                 "real flows."),
        ("table", {
            "cols": [0.30, 0.18, 0.52],
            "align": ['l', 'c', 'l'],
            "caption": "Restoration priority: what to test first and why.",
            "header": ["Target", "Priority", "Rationale and test shape"],
            "rows": [
                ["lib/finance.ts (math)", "P0", "Pure, high-blast-radius, previously covered; restore original cases from git history and extend"],
                ["ai/engine.ts (guard)", "P0", "Safety-relevant escalation and labelling; table-driven intent cases incl. trilingual aliases"],
                ["searchStore matching", "P1", "Unit-mixing parser edge cases; property filter invariants"],
                ["tokenizeStore invariants", "P1", "Order matching, supply caps, ledger conservation properties"],
                ["store.ts primitive", "P1", "Round-trip, seed fallback, event fan-out; jsdom environment"],
                ["router.tsx navigation", "P1", "Hash parsing, query params, back/forward"],
                ["View smoke tests", "P2", "Render each lazy view without crash; a11y assertions on the shell"],
                ["E2E critical path", "P2", "Playwright: search, open listing, WhatsApp link intent, install prompt suppression"],
            ],
        }),
        ("h2", "Stack recommendation"),
        ("body", "The 2026-conventional stack for this codebase is Vitest plus React Testing Library for "
                 "unit and component work (the codebase is ESM, Vite-adjacent, and the deleted suite was "
                 "vitest-based - the restore path is native), and Playwright for the end-to-end layer "
                 "(one config can also exercise the installed-PWA context via its persistent contexts, "
                 "and later the Capacitor web view). The audit recommends restoring before writing: the "
                 "pre-rebuild suites in git history (git show ae0b2e3^) describe the original invariants "
                 "in executable form and port to the current modules with modest import changes - a "
                 "faster route to meaningful coverage than authoring from zero, and one that revives the "
                 "regression memory rather than approximating it. The composite verify gate should then "
                 "return to CI exactly as it existed: typecheck, lint, tests, build, in that order, "
                 "blocking merges."),
        ("h2", "Implementation sketch"),
        ("body", "To size the restoration concretely, the audit sketched the target configuration "
                 "against the codebase's reality: Vitest with a jsdom environment for the store and "
                 "logic layer, React Testing Library for component behaviour, and Playwright for the "
                 "end-to-end layer with one project for the hosted SPA and one for the installed-PWA "
                 "context (persistent context, service worker enabled - the install-prompt and offline "
                 "behaviours become testable). The vitest configuration is deliberately minimal "
                 "because the codebase has no path aliases beyond @/, and the deleted pre-rebuild "
                 "suite ports with import-path changes only."),
        ("code", "// vitest.config.ts (restoration target)\n"
                 "import { defineConfig } from 'vitest/config';\n"
                 "import path from 'path';\n"
                 "export default defineConfig({\n"
                 "  test: {\n"
                 "    environment: 'jsdom',\n"
                 "    include: ['src/**/*.test.{ts,tsx}'],\n"
                 "    coverage: { reporter: ['text', 'html'],\n"
                 "      include: ['src/lib/**'] },\n"
                 "  },\n"
                 "  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },\n"
                 "});\n"
                 "// package.json scripts (restore the pre-rebuild gate)\n"
                 "//   \"verify\": \"tsc --noEmit && eslint . --max-warnings 0 && vitest run && next build\""),
        ("body", "The Playwright layer starts with four journeys and grows only as real flows arrive: "
                 "search-and-open-a-listing (the revenue path), WhatsApp intent handoff (the "
                 "conversion truth), install-prompt suppression in standalone contexts (the PWA "
                 "contract), and offline navigation to a cached listing (the platform's differentiating "
                 "promise). Each journey doubles as a regression net for one Chapter 23 finding family, "
                 "which is how the audit suggests prioritising when time is scarce: tests that pin the "
                 "findings, then tests that cover the code."),
        ("h2", "Assessment"),
        ("body", "Testing scores 1 of 5 not because the task is large but because it is binary: the "
                 "safety net is absent, and the platform's most trust-critical code (money arithmetic, "
                 "an AI that answers questions, a claims register) runs unverified on every deploy. The "
                 "restoration is tractable - the audit sizes the P0 set at days, not weeks, because the "
                 "tests once existed and their targets still do. Chapter 27 makes it the third item of "
                 "the first sprint, immediately after the two security gates, on the principle that "
                 "everything else this report recommends will be built faster and safer once the net "
                 "is back."),
    ],
})
