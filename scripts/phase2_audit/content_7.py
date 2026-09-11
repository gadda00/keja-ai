# -*- coding: utf-8 -*-
"""Content module 7: Findings Register, Phase 2 Architecture (Ch 21-22)."""

CHAPTERS = []

# =====================================================================
CHAPTERS.append({
    "part": "Part VI - Recommendations",
    "title": "Consolidated Findings Register",
    "blocks": [
        ("h2", "How to read the register"),
        ("body", "This chapter consolidates every finding from Parts II through V into a single "
                 "numbered register, ordered by severity and domain, with the remediation path "
                 "cross-referenced into Chapters 22 through 24. Severity follows the model defined in "
                 "Chapter 2: Critical findings expose real users to concrete harm or block a primary "
                 "channel; High findings will predictably become incidents; Medium findings compound "
                 "quietly; Low findings are hygiene. In total the audit registers <b>47 findings: 4 "
                 "Critical, 13 High, 22 Medium, and 8 Low</b>. Each row cites its primary evidence "
                 "location so that any engineer can begin verification without re-deriving the audit's "
                 "path."),
        ("chart", "chart_severity.png",
         "Findings by severity across the seven audit domains.", 250),
        ("h2", "Critical findings"),
        ("table", {
            "cols": [0.09, 0.30, 0.37, 0.24],
            "align": ['c', 'l', 'l', 'l'],
            "caption": "Critical findings (activate with real users or block a primary channel).",
            "header": ["ID", "Finding", "Evidence", "Remediation"],
            "rows": [
                ["F-01", "Passwords hashed with unsalted DJB2 and persisted in localStorage; open registration accepts real credentials", "auth.tsx:102-106, 197-202, 395-399", "Ch. 24 auth seam; demo-mode gate in <= 5 days"],
                ["F-02", "KYC collects national ID and source-of-funds into plaintext client storage without notice or safeguards", "tokenizeStore.tsx:188-196, 246-252; TokenizeView.tsx:310-339", "Ch. 14 gating; ODPC registration path; encrypt server-side"],
                ["F-03", "All property, article, and area pages unindexable by search engines (hash-routed CSR shell)", "router.tsx; out/index.html initial payload", "Ch. 24 Strategy B prerendering decision"],
                ["F-04", "Zero automated tests; 3,039 lines of suites deleted in rebuild commit", "tests/ orphan scripts; git show ae0b2e3", "Ch. 22 restoration plan; verify gate in CI"],
            ],
        }),
        ("h2", "High findings"),
        ("table", {
            "cols": [0.09, 0.30, 0.37, 0.24],
            "align": ['c', 'l', 'l', 'l'],
            "caption": "High findings (predictable future incidents).",
            "header": ["ID", "Finding", "Evidence", "Remediation"],
            "rows": [
                ["F-05", "#/admin console renders with no authentication or role check", "KejaApp.tsx:121; AdminView.tsx", "Gate in UI now; server-side check in Phase 2"],
                ["F-06", "No Content-Security-Policy despite otherwise complete header set", "vercel.json:42-50", "Deploy default-src 'self' (report-only first)"],
                ["F-07", "sitemap.xml absent while robots.txt declares it; serves HTML at 200", "scripts/generate-sitemap.mjs unwired", "Wire into build command; content-type route"],
                ["F-08", "No structured data of any kind (Organization, RealEstateListing, Breadcrumbs)", "out/index.html grep", "JSON-LD blocks; works pre-prerender"],
                ["F-09", "No per-route title/meta; every share unfurls as home page", "No document.title mutation in src/", "usePageMeta hook on the router"],
                ["F-10", "No production error tracking; boundary logs dev-only", "ErrorBoundary.tsx:21-24", "Sentry init; CI source maps"],
                ["F-11", "No remote analytics or RUM; product learning impossible off-device", "analytics.ts local ring", "Cookieless collector; mirror taxonomy"],
                ["F-12", "No map UI in a property marketplace", "0 hits: Leaflet/Mapbox/Google/OSM", "Ch. 26 Leaflet clustered results map"],
                ["F-13", "recharts duplicated across two async chunks (~300 KB)", "out/_next/static/chunks sizes", "Shared chunk or single chart module"],
                ["F-14", "Dead code mass: 30 shadcn files (4,243 LOC), db.ts, ~20 unused deps", "Import graph analysis", "Ch. 26 purge; lockfile shrinks accordingly"],
                ["F-15", "Lint configuration disables 26 rules incl. correctness set", "eslint.config.mjs", "Re-arm incrementally; zero-warnings gate"],
                ["F-16", "No staging/preview environment; every merge is production", "Workflows; Vercel Hobby", "Preview target; PR builds to URL"],
                ["F-17", "Deep-link autoVerify unactivated (no assetlinks.json served)", "android/ intent filters; public/ absent", "Serve .well-known/assetlinks.json"],
            ],
        }),
        ("h2", "Medium findings"),
        ("table", {
            "cols": [0.09, 0.62, 0.29],
            "align": ['c', 'l', 'l'],
            "caption": "Medium findings (compounding costs).",
            "header": ["ID", "Finding", "Remediation"],
            "rows": [
                ["F-18", "noImplicitAny: false; ignoreBuildErrors; reactStrictMode off", "Re-arm config after P0 fixes"],
                ["F-19", "Unvalidated JSON.parse of persisted state on every read", "Zod schemas at the read boundary"],
                ["F-20", "auto-listings.json trusted via as-unknown-as cast (5,630 lines)", "Validate generated data at boundary"],
                ["F-21", "Cross-tab coherence only for auth; useStore event gap", "Move storage listener into store primitive"],
                ["F-22", "Monolithic views (ManageView 523-line function; DealAnalyst 418)", "Extract pure logic modules first"],
                ["F-23", "JPG served where WebP siblings exist; ~5 MB dead imagery deployed", "Reference swap + public/ diet"],
                ["F-24", "No responsive images (srcset/DPR); layout shift on load", "srcset from existing variants"],
                ["F-25", "Gold-on-cream text contrast 1.91:1 on real text", "Darker gold token for light mode"],
                ["F-26", "Book a viewing / Request callback are toast stubs", "WhatsApp intent deep links; then lead store"],
                ["F-27", "i18n claimed trilingual; ~20 keys wired across 6 components only", "Complete or de-claim the story"],
                ["F-28", "Offline page uses retired gold palette", "Rebrand offline.html"],
                ["F-29", "No prefers-reduced-motion for framer-motion", "Global MotionConfig"],
                ["F-30", "Prisma scaffold implies a database that does not exist", "Author real schema (Ch. 24) or delete scaffold"],
                ["F-31", "Caddyfile arbitrary-port proxy pattern tracked in repo", "Delete or bind localhost with allowlist"],
                ["F-32", "No immutable cache header for /_next/static", "One vercel.json rule"],
                ["F-33", "No native CI or signing for Capacitor projects", "Ch. 19 release engineering"],
                ["F-34", "No rollback automation on smoke failure", "Vercel API promote workflow"],
                ["F-35", "Seed PII in real-contact format across auth and stores", "Reserved-domain fictional data"],
                ["F-36", "Silent service-worker updates (no version toast)", "Toast with reload affordance"],
                ["F-37", "Date.now() used as identifier at 30+ sites", "Central uuid helper"],
                ["F-38", "Orientation lock blocks landscape/tablet browsing", "Remove lock; test landscape"],
                ["F-39", "Tailwind v3 config file contradicts v4 CSS-first reality", "Delete tailwind.config.ts"],
            ],
        }),
        ("h2", "Low findings"),
        ("body", "The eight Low findings are hygiene items, listed for completeness and scheduled into "
                 "the Chapter 26 excellence plan rather than the critical path: the two dev-only console "
                 "statements (both intentional); the thirteen guarded non-null assertions in the compare "
                 "feature (a narrowing helper would remove the class); the void-marker dead statements "
                 "in two views; the duplicated local format helpers that should consolidate onto "
                 "src/lib/format.ts; the unused skeleton component while loading states use spinners; "
                 "the untested range-input trust filter with screen readers; the hardcoded org and "
                 "project IDs in the deploy workflow (public values, but vars are cleaner); and the "
                 "missing .env.example for the Next.js era. None of these blocks anything; all of them "
                 "are the difference between a repository that feels maintained and one that is."),
    ],
})

# =====================================================================
CHAPTERS.append({
    "title": "Phase 2 Target Architecture",
    "blocks": [
        ("h2", "The one-seam principle"),
        ("body", "The audit's architectural recommendation is deliberately conservative: <b>change one "
                 "thing, not everything</b>. The platform keeps its static SPA shell, its hash-to-path "
                 "routing evolution, its PWA and Capacitor surfaces, and its entire component layer. It "
                 "gains exactly one new element - a typed API layer - behind which live the four services "
                 "the product narrative already promises: PostgreSQL with a real Prisma schema, "
                 "server-side authentication, M-Pesa integration through a licensed payment service "
                 "provider, and search. Every Phase 2 migration then proceeds one domain at a time "
                 "through the store boundary that Chapter 10 identified as the codebase's natural seam. "
                 "This is the difference between an evolution the current codebase was accidentally "
                 "designed for and a rewrite nobody asked for."),
        ("chart", "diagram_phase2.png",
         "Phase 2 target architecture: the client surfaces stay; one typed API seam adds persistence, auth, payments, and search.", 330),
        ("h2", "The API seam"),
        ("body", "The seam should be boring and typed. Next.js server routes (the same repository, the "
                 "same deploy) or a small Node service on Vercel expose a REST-or-tRPC contract validated "
                 "with zod at the edge - the same zod that sits unused in package.json today, finally "
                 "earning its place. Three properties are non-negotiable at this boundary: idempotency "
                 "keys on every mutation the client might retry (payments above all), rate limiting per "
                 "identity and per IP, and structured request logging with the release tag inherited "
                 "from the service-worker version stamp. The client-side migration mechanism is equally "
                 "specific: each domain store gains an API-backed twin behind its existing hook "
                 "signature, with localStorage retained as the offline cache - the store that was built "
                 "to work without a server becomes the offline-first cache that makes the server safe "
                 "to add. Tenants migrate first (highest risk, smallest surface), then listings and "
                 "moderation, then landlord ledgers once reconciliation exists, and tokenization last, "
                 "behind CMA sandbox admission."),
        ("h2", "The data layer"),
        ("body", "Chapter 13 specified the schema shape; the architecture adds its operational "
                 "properties. PostgreSQL (managed - Neon, Supabase, or RDS-class) with the authored "
                 "Prisma schema as the single source of truth; migrations from day one rather than db:push "
                 "against a moving database; seeds derived from the existing data dictionary so the demo "
                 "experience survives the migration; PII columns (identifiers, income, contact) encrypted "
                 "at rest or vaulted; and the audit-entry model promoted to a first-class table so the "
                 "platform's transparency property survives contact with a database. The Auto-Pilot "
                 "pipeline's Phase 2 form is a feed-ingestion service that writes through the same "
                 "quality gates into the listings table - the growth loop preserved, now with real "
                 "storage behind it."),
        ("h2", "Authentication"),
        ("body", "The auth migration is the highest-risk, highest-leverage seam, and the audit specifies "
                 "it precisely. Server-side sessions (HttpOnly, Secure, SameSite=Lax cookies) issued by "
                 "an OIDC-capable provider - the existing optional Google Sign-In already speaks the "
                 "right protocol - with argon2id password hashing server-side, and the demo accounts "
                 "rebuilt as labelled demo identities that cannot be confused with real users. The RBAC "
                 "model (user, agent, admin) moves from a client-side boolean to a server-side "
                 "authorization check on every admin-scoped endpoint; the UI gate from finding F-05 "
                 "becomes the client half of a defense in depth. The existing 12-hour sliding session "
                 "semantics carry over. Nothing about this requires NextAuth specifically (the unused "
                 "v4 dependency should not be revived); a thin session service or a current-generation "
                 "library both fit the seam."),
        ("h2", "Payments: M-Pesa done correctly"),
        ("body", "The Kenyan payment rail is M-Pesa, and the audit's recommendation follows the "
                 "platform's own documented caution: integrate Daraja (Safaricom's API) through a "
                 "licensed PSP arrangement rather than as an independent merchant until licensing is "
                 "secured - current integration guidance puts the full merchant path at roughly five "
                 "weeks including business registration, paybill/till provisioning, and KRA "
                 "documentation. The technical shape is well understood and the codebase's ledger "
                 "already models it: STK push for payment initiation, C2B callbacks for confirmation, "
                 "a double-entry escrow ledger with hold, release, and refund semantics (B2C plus "
                 "reversal), idempotency keys on every webhook, and reconciliation against Safaricom's "
                 "transaction reports. The sandbox comes first, hard-wired behind a feature flag, with "
                 "the simulation retained as the demo path - the same honesty pattern the platform "
                 "already applies to verification."),
        ("h2", "The SEO decision, implemented"),
        ("body", "Chapter 17 committed to Strategy B; this chapter specifies it. The public catalog - "
                 "listing pages, area guides, the insights corpus, the claims register - becomes "
                 "build-time prerendered HTML at path-based URLs (Next.js generateStaticParams over the "
                 "inventory, or the modernised prerender script applied to out/). The SPA shell "
                 "continues to own the interactive flows (search with facets, dashboards, applications) "
                 "under whatever routing serves them best, with per-route metadata from the usePageMeta "
                 "hook regardless. Each listing page carries JSON-LD (RealEstateListing plus "
                 "BreadcrumbList), the sitemap generator runs in the build command, and the Auto-Pilot "
                 "deploy cycle guarantees freshness: a listing ingested at the 06:00 cron run is an "
                 "indexable URL by 06:20. The one migration cost the audit flags honestly: shared "
                 "fragment links in the wild (WhatsApp history, saved posts) need a one-time redirect "
                 "map from hash routes to path routes in the shell."),
        ("h2", "API contract sketch"),
        ("body", "To make the seam concrete enough to estimate, the audit sketched the initial endpoint "
                 "surface - deliberately small, resource-shaped, and versioned from day one. The contract "
                 "follows three conventions: every mutation accepts an Idempotency-Key header; every "
                 "response carries the artifact release tag; and errors use a closed taxonomy (validation, "
                 "auth, rate-limit, conflict, internal) so the client can render honest messages rather "
                 "than raw failures. The first wave totals eleven endpoints - small enough to review in "
                 "one sitting, which is the point."),
        ("table", {
            "cols": [0.30, 0.12, 0.30, 0.28],
            "align": ['l', 'c', 'l', 'l'],
            "caption": "Wave 1-2 endpoint surface (auth, profiles, applications, leads).",
            "header": ["Endpoint", "Method", "Purpose", "Notes"],
            "rows": [
                ["/v1/auth/session", "POST", "Email + password exchange for HttpOnly session", "argon2 verify; lockout counters server-side"],
                ["/v1/auth/session", "DELETE", "Sign out", "Revokes server session"],
                ["/v1/auth/oidc/google", "POST", "OIDC code exchange", "Existing optional flow, promoted"],
                ["/v1/auth/demo", "POST", "Labelled demo identities", "Cannot mint roles; rate-limited"],
                ["/v1/me", "GET", "Session user + profile", "Drives all client gates"],
                ["/v1/me", "PATCH", "Update profile, language", "zod-validated"],
                ["/v1/properties", "GET", "Public catalog (paged, filtered)", "Feeds search + prerender + PWA cache"],
                ["/v1/properties/:slug", "GET", "Listing detail with evidence", "JSON-LD mirrors this shape"],
                ["/v1/applications", "POST", "Submit tenancy application", "Idempotency-Key required; PII columns encrypted"],
                ["/v1/leads", "POST", "WhatsApp-ref or form lead capture", "Closes finding F-26"],
                ["/v1/viewings", "POST", "Book a viewing", "Notifies landlord channel"],
            ],
        }),
        ("code", "// Store-twin migration sketch (tenant domain)\n"
                 "// Before (today): const [app, setApp] = useTenantStore();\n"
                 "// After:          same hook, API-backed twin, localStorage as cache\n"
                 "async function submitApplication(draft, idemKey) {\n"
                 "  cache.set('keja:tenant:pending', draft);          // offline-first\n"
                 "  const res = await api.post('/v1/applications', draft,\n"
                 "      { headers: { 'Idempotency-Key': idemKey } });\n"
                 "  cache.delete('keja:tenant:pending');\n"
                 "  return res.data;                                  // queue drains on reconnect\n"
                 "}"),
        ("h2", "Sequencing"),
        ("body", "The architecture lands in four moves, each independently shippable. Move one is "
                 "foundational hygiene: the security gates, the test restoration, the sitemap and "
                 "metadata - all Chapter 27 P0 items that Phase 2 code should not precede. Move two is "
                 "the seam itself: schema authored, API skeleton with auth and the tenant domain, "
                 "preview environment live. Move three is the growth surface: prerendering, JSON-LD, "
                 "lead capture real, map shipped, analytics instrumented. Move four is transactions: "
                 "M-Pesa sandbox behind the PSP track, landlord ledgers migrated, store releases "
                 "following. Each move has a rollback that is simply the previous state - the "
                 "architecture never bets the platform on a single cutover."),
    ],
})

# =====================================================================
CHAPTERS.append({
    "title": "Phase 2 Data Schema Blueprint",
    "blocks": [
        ("h2", "From dictionary to schema"),
        ("body", "This chapter operationalises Chapter 13's gap analysis into the concrete model list "
                 "the audit recommends authoring as the first Phase 2 commit. Every model below traces "
                 "to interfaces that already exist in the client stores and the data dictionary - the "
                 "schema is a translation, not an invention - and every constraint listed is one the "
                 "client currently enforces by discipline alone. The blueprint is deliberately "
                 "conservative: it models exactly what the product ships today plus the two Phase 2 "
                 "additions the roadmap requires (payment records and sessions), and defers custody "
                 "and settlement tables to the tokenization track where the CMA sandbox will dictate "
                 "their shape."),
        ("table", {
            "cols": [0.20, 0.44, 0.36],
            "align": ['l', 'l', 'l'],
            "caption": "Core domain models for the Phase 2 schema (traced to client contracts).",
            "header": ["Model", "Key fields and constraints", "Traces to / notes"],
            "rows": [
                ["User", "id, email unique, passwordHash?, role enum, status, timestamps", "auth.tsx User; adds server-side hash and status"],
                ["Session", "token (opaque), userId FK cascade, expiresAt, createdAt", "12h/30d sliding semantics carried over"],
                ["Profile", "userId unique FK, name, phone, avatarUrl, language enum", "keja:profile; language from i18n"],
                ["Property", "id, slug unique, title, type enum, purpose enum, areaId FK, priceKes, bedrooms, description, status enum, source enum (seed/auto/user), timestamps", "properties.ts Property; source distinguishes provenance"],
                ["PropertyEvidence", "id, propertyId FK cascade, kind enum, label, detail jsonb, verifiedAt, expiresAt, method enum", "verification blocks; method never 'simulated' for real rows"],
                ["Area", "id, slug unique, name, aliases text[], description", "neighborhoods.ts + engine alias tables"],
                ["TenancyApplication", "id, propertyId FK, userId FK, status enum, monthlyIncomeKes, employer, references jsonb, createdAt", "tenantStore RentalApplication; PII - encrypt columns"],
                ["Viewing", "id, propertyId FK, userId FK, scheduledFor, status enum, notes", "Book-a-viewing intent (F-26); new"],
                ["Lead", "id, propertyId FK, name, phone, message, source enum, createdAt", "keja:leads; WhatsApp-ref or form"],
                ["RentPayment", "id, unitId FK, tenantId FK, period (unique with unitId), amountKes, channel enum, reference, paidAt", "landlordStore RentPayment; uniqueness the client could not enforce"],
                ["Unit", "id, propertyId FK cascade, label, rentKes, status enum", "landlordStore units"],
                ["TenantRecord", "id, unitId FK, userId?, name, phone, startedAt, endedAt?", "landlordStore tenants"],
                ["MaintenanceTicket", "id, unitId FK, title, body, priority enum, status enum, createdAt", "landlordStore tickets"],
                ["AuditEntry", "id, actorId?, action enum, targetType, targetId, meta jsonb, createdAt", "adminStore audit trail (bounded 500 client-side)"],
                ["ListingSubmission", "id, submitterId?, payload jsonb, status enum, reviewerNote, createdAt", "keja:submissions moderation queue"],
                ["SavedSearch", "id, userId FK, criteria jsonb, alertsEnabled, createdAt", "searchStore; alerts run server-side"],
                ["KycRecord", "id, userId FK unique, status enum, idType enum, idNumberEncrypted, sourceOfFunds, decidedAt", "tokenizeStore; encrypted at rest (F-02)"],
            ],
        }),
        ("h2", "Enums and integrity rules"),
        ("body", "The schema's enums encode the TypeScript unions that currently exist only at the "
                 "edges: PropertyType, Purpose, Availability, ClaimStatus, SubmissionState, Role, "
                 "PaymentChannel (mpesa, bank, cash - exactly the client's model), TicketPriority, "
                 "KycStatus, and EvidenceKind. The integrity rules the database adds beyond the client "
                 "discipline: unique (unitId, period) on RentPayment so double-entry is impossible; "
                 "unique (userId) on KycRecord so identity cannot fork; cascade deletes owned through "
                 "the property graph (evidence, units, submissions) while financial records (payments, "
                 "applications) restrict deletion and soft-delete instead; and an audit trigger on "
                 "status transitions for Submission and KycRecord rows so the moderation trail is "
                 "write-once. The audit's one schema-level opinion beyond translation: keep the claims "
                 "register as a <b>materialised table</b> (Claim rows with lastVerifiedAt) rather than "
                 "a static data file, so the Trust Center view the brand depends on becomes queryable "
                 "history the moment Phase 2 lands."),
        ("h2", "Migration waves"),
        ("table", {
            "cols": [0.14, 0.30, 0.28, 0.28],
            "align": ['c', 'l', 'l', 'l'],
            "caption": "Domain migration waves through the store-twin seam.",
            "header": ["Wave", "Domains", "Depends on", "Exit criteria"],
            "rows": [
                ["1", "Auth, Sessions, Profiles", "Schema + API skeleton", "Server-issued HttpOnly sessions; demo identities labelled"],
                ["2", "Tenancy applications, Leads, Viewings", "Wave 1", "Application crosses devices; landlord notified"],
                ["3", "Properties, Evidence, Areas, Submissions", "Wave 1; moderation queue", "Auto-Pilot writes via service; sitemap from DB"],
                ["4", "Units, Tenants, Payments, Tickets", "Waves 1-3; M-Pesa sandbox", "Ledger reconciled against Daraja callbacks"],
                ["5", "KYC, tokenization (deferred)", "CMA sandbox track; ODPC registration", "Regulated-path custody decision made"],
            ],
        }),
        ("body", "Each wave ships behind its store twin with the localStorage path retained as fallback "
                 "for one release, then removed; the offline cache story from Chapter 10 makes the "
                 "retention period a product decision rather than a technical one. The blueprint's "
                 "final property is the one the audit most wants preserved from Phase 1: because every "
                 "model traces to a documented client contract, the data dictionary remains true "
                 "documentation of the platform's state - now with a database that enforces it."),
    ],
})
