# -*- coding: utf-8 -*-
"""Content module 4: Security, Data Model, Privacy (Ch 10-12)."""

CHAPTERS = []

# =====================================================================
CHAPTERS.append({
    "part": "Part IV - Security, Data and Compliance",
    "title": "Security Audit",
    "blocks": [
        ("h2", "Posture in one paragraph"),
        ("body", "Keja AI's security posture is defined by a single structural fact: there is no server. The "
                 "static export eliminates the entire server-side OWASP surface - no injection, no broken "
                 "file access, no SSRF, no deserialisation, no misconfigured endpoints - and the audit "
                 "verified the pleasant corollaries: zero secrets in the client bundle, zero network egress "
                 "from application code, no third-party trackers, no cookies, and a service worker that "
                 "caches only same-origin GET responses with 200 status. The platform also gets the header "
                 "basics right that most forget: X-Frame-Options DENY, nosniff, a strict referrer policy, a "
                 "permissions policy, and a one-year HSTS. What remains is the client-side trust problem: "
                 "every control that matters - authentication, roles, throttling, data ownership - executes "
                 "in a context the user fully controls, and two of those controls are implemented in ways "
                 "that would be unacceptable if a real user relied on them."),
        ("h2", "Critical finding C-1: credential storage"),
        ("body", "The authentication layer (src/lib/auth.tsx) accepts email-and-password registration from "
                 "any visitor and stores those credentials in localStorage after hashing with <b>DJB2</b> - a "
                 "non-cryptographic, unsalted, reversible-by-brute-force string hash from 1997 - in the "
                 "format k1$hash$length under the keja:pw key. The demo accounts (admin/agent/investor at "
                 "keja.ai with trivial passwords) are hardcoded in source at lines 197-202 and 395-399, and "
                 "the simulated Google accounts are equally public. For the demo phase this is labelled and "
                 " survivable. The criticality arises from combination: registration is not demo-gated, the "
                 "platform is publicly marketed, and password reuse across services is the norm for most "
                 "users - so a real user's real reused password can end up trivially recoverable from their "
                 "own browser storage (and from any device or extension that can read it) by anyone with "
                 "ten lines of script. The audit's remediation is staged: immediately block or loudly warn "
                 "on real-looking password registration in demo builds; before any real authentication, "
                 "migrate to server-side sessions with argon2 hashing and HttpOnly cookies (Chapter 24 "
                 "specifies the seam)."),
        ("h2", "Critical finding C-2: KYC data collection"),
        ("body", "The tokenization flow collects national identification - idType, idNumber, and a "
                 "source-of-funds declaration - into plaintext localStorage (tokenizeStore, lines 188-196 and "
                 "246-252; the form surfaces at TokenizeView lines 310-339). There is no encryption at rest, "
                 "no retention limit, no data-subject notice at the point of collection, and no erasure "
                 "path. Under the Kenya Data Protection Act 2019, national ID numbers and financial-source "
                 "data are sensitive personal data; collecting them without registration as a data "
                 "controller with the ODPC, and without the Act's safeguards, is a compliance exposure that "
                 "activates the moment a real user types real values - which the current UI happily permits. "
                 "The platform's own documentation half-acknowledges this by deferring real KYC to the CMA "
                 "sandbox process, but the form is live and ungated. Remediation: do not persist identifier "
                 "values in the demo (collect-and-discard, or gate the flow), and treat the collection "
                 "point itself - notice, purpose, retention - as a first-class Phase 2 requirement rather "
                 "than a compliance afterthought."),
        ("h2", "High finding: the ungated admin console"),
        ("body", "The #/admin route renders the platform administration console - listing submissions, the "
                 "audit log, partner applications, feed configuration, platform settings - to any visitor "
                 "who types the hash. The authentication context exists, the role model exists, and the "
                 "account view consumes them; the admin view consumes neither. In a localStorage world the "
                 "console cannot actually mutate shared state (it edits only the local browser), so the "
                 "damage today is cosmetic: a demo visitor can see the moderation surface and be misled "
                 "about what is real. But the pattern is the kind that survives migration - a view that "
                 "never learned to check the door - and the audit flags it High precisely because Phase 2 "
                 "will make that door load-bearing. The fix is five lines today (render a sign-in gate when "
                 "isAdmin is false) and a server-side authorisation check the day the console gains a real "
                 "API behind it."),
        ("h2", "High finding: no Content-Security-Policy"),
        ("body", "The one header that meaningfully defends a data-driven SPA - Content-Security-Policy - is "
                 "absent. The application loads zero external origins (fonts are self-hosted, no CDNs, no "
                 "trackers), which makes Keja AI the easiest possible CSP deployment: a default-src 'self' "
                 "with script-src 'self' would ship in one vercel.json line and would have blocked, for "
                 "example, any future supply-chain script that ever slipped into a dependency. The audit "
                 "recommends deploying it in report-only mode first (to catch the odd inline style), then "
                 "enforcing - and pairing it with HSTS preload submission once the domain has served the "
                 "header continuously. While in the file, the Permissions-Policy can be tightened: "
                 "geolocation is currently allowed for self but the application never uses it."),
        ("h2", "What the audit verified as clean"),
        ("bullet", [
            "<b>Secrets sweep:</b> no ghp_/vcp_/nfp_/sk-/AKIA/AIza patterns in any tracked file, and git history shows exactly one .env.example (public VITE vars) ever committed, later deleted in the rebuild.",
            "<b>XSS surface:</b> exactly one dangerouslySetInnerHTML (the shadcn chart wrapper's CSS-variable theming, no user data); ReactMarkdown renders without rehype-raw so chat and agent text is escaped; no eval or Function constructors; external links carry noopener noreferrer.",
            "<b>CSV export hardening:</b> src/lib/csv.ts neutralises formula injection (=, +, -, @, tab, CR prefixes) on user-controlled exports - exemplary and rare.",
            "<b>Service worker safety:</b> same-origin GET-only, 200-only caching, versioned caches self-evicting on activate - no cache-poisoning pattern.",
            "<b>CI script injection:</b> workflows pass untrusted input via environment rather than string interpolation, per GitHub's own guidance.",
            "<b>Rate limiting:</b> client-side five-failures-per-minute lockout exists; bypassable by clearing storage, but present and commented.",
        ]),
        ("h2", "OWASP mapping"),
        ("table", {
            "cols": [0.10, 0.16, 0.44, 0.30],
            "align": ['c', 'l', 'l', 'l'],
            "caption": "Security findings register mapped to OWASP Top 10 (2021) categories.",
            "header": ["ID", "Severity", "Finding", "OWASP category"],
            "rows": [
                ["C-1", "Critical", "DJB2 password hashing into localStorage; open registration accepts real credentials", "A02 Cryptographic Failures"],
                ["C-2", "Critical", "KYC national ID and source-of-funds persisted plaintext client-side", "A04 Insecure Design"],
                ["H-1", "High", "#/admin console renders with no authentication or role check", "A01 Broken Access Control"],
                ["H-2", "High", "No Content-Security-Policy header", "A05 Security Misconfiguration"],
                ["H-3", "High", "Demo credentials and simulated Google accounts hardcoded in source", "A07 Identification Failures"],
                ["M-1", "Medium", "Unused next-auth v4 (EOL line) and z-ai 0.x SDK in dependency tree", "A06 Vulnerable Components"],
                ["M-2", "Medium", "Client-side throttling and sessions bypassable via storage clear", "A04 Insecure Design"],
                ["M-3", "Medium", "Unvalidated JSON.parse of persisted state on every read", "A08 Software and Data Integrity"],
                ["M-4", "Medium", "Hardcoded seed PII in real-contact format across auth and stores", "Privacy / hygiene"],
                ["M-5", "Medium", "Caddyfile dev proxy exposes arbitrary-port forwarding pattern", "A05 (dev-only)"],
                ["L-1", "Low", "Permissions-Policy allows geolocation that the app never uses", "A05"],
                ["L-2", "Low", "ignoreBuildErrors and reactStrictMode disabled in next.config", "A05"],
            ],
        }),
        ("h2", "Threat model"),
        ("body", "To make the register actionable rather than merely declarative, the audit modelled the "
                 "platform against a lightweight STRIDE pass over its two trust boundaries: the browser "
                 "session (the only boundary that exists today) and the future API seam (Chapter 24). "
                 "For each threat class the table records the current exposure and the architectural "
                 "control that closes it - which doubles as a preview of why the Phase 2 seam is shaped "
                 "the way it is. The reading is blunt but clarifying: today, every class that depends on "
                 "server-verifiable truth is open not because of a bug but because the boundary is "
                 "absent, which is why the remediation is architectural and why the Chapter 27 P0 items "
                 "gate the marketing push rather than the other way round."),
        ("table", {
            "cols": [0.14, 0.30, 0.28, 0.28],
            "align": ['l', 'l', 'l', 'l'],
            "caption": "STRIDE threat model across current and Phase 2 boundaries.",
            "header": ["Class", "Threat in scope", "Today (browser boundary)", "Control at the API seam"],
            "rows": [
                ["Spoofing", "Attacker impersonates a user or admin", "Trivial: roles are client state (F-05, F-01)", "Server sessions + role checks on every endpoint"],
                ["Tampering", "User edits own ledger, trust data, application records", "Trivial: all state is user-mutable", "Server-side records; client cache is advisory"],
                ["Repudiation", "Actor denies a moderation or payment action", "Audit trail is local and editable", "Write-once AuditEntry table (Ch. 25)"],
                ["Information disclosure", "Credentials and KYC readable from storage", "F-01, F-02 (Critical)", "Server-side hashing; encrypted identifiers"],
                ["Denial of service", "Abuse of future endpoints or the AI seam", "N/A today (no endpoints)", "Per-identity and per-IP limits at the boundary"],
                ["Elevation of privilege", "Visitor mints admin rights", "Possible via storage edit", "Roles issued and verified server-side only"],
            ],
        }),
        ("h2", "Assessment"),
        ("body", "For a platform with no server, Keja AI is unusually defensible: the attack surface is one "
                 "static bundle, it leaks nothing, and its hygiene habits (noopener discipline, CSV "
                 "hardening, SW safety) reflect genuine care. The two Critical findings share a shape - "
                 "mechanisms that were written for demo users being exposed to real users - and both are "
                 "cheap to defuse now and expensive to defuse after trust is established. The audit's "
                 "security verdict: <b>secure as a demonstration, one release away from safe as a "
                 "product</b>, with the gap concentrated in exactly the places Phase 2 already needs to "
                 "build (authentication, KYC, admin) - which is the best possible timing for the fixes to "
                 "land."),
    ],
})

# =====================================================================
CHAPTERS.append({
    "title": "Data Model and Persistence",
    "blocks": [
        ("h2", "Two data models, one of them imaginary"),
        ("body", "The repository contains two data models that have never met. The real one lives in the "
                 "client: roughly forty TypeScript interfaces across the store and data modules, documented "
                 "field-by-field in the data dictionary, that describe properties, verification evidence, "
                 "trust signals, tenancy applications, rent payments, maintenance tickets, KYC records, "
                 "wallet ledgers, orders, audit entries, and feed connections. The imaginary one lives in "
                 "prisma/schema.prisma: the untouched Prisma starter schema with its User and Post models - "
                 "authorId an orphan string with no relation, no enums, no indexes beyond the implicit ones - "
                 "served by a SQLite datasource and a PrismaClient singleton (src/lib/db.ts) that nothing "
                 "imports. The package.json even ships a db:push --accept-data-loss script against this "
                 "scaffold. The audit's finding is not that dormant scaffolding exists; it is that the "
                 "distance between the two models is the true measure of Phase 2's data work, and that "
                 "distance is currently unmapped in the one artifact (the schema) where it matters most."),
        ("table", {
            "cols": [0.24, 0.38, 0.38],
            "align": ['l', 'l', 'l'],
            "caption": "Domain coverage: client interfaces versus the Prisma scaffold.",
            "header": ["Domain concept", "Client-side model (real)", "Prisma schema (scaffold)"],
            "rows": [
                ["Property / listing", "Property with verification, trust, yields, pricing (27 seeds + 60 auto)", "Absent"],
                ["Tenancy", "RentalApplication with income, employer, references", "Absent"],
                ["Payments", "RentPayment with channel (mpesa/bank/cash), receipts", "Absent"],
                ["Users and roles", "User with role user/agent/admin, audit trail", "User: email + name only, no password, no role"],
                ["KYC", "KYCRecord with idType/idNumber/sourceOfFunds/status", "Absent"],
                ["Tokenization", "Asset, wallet, ledger entries, orders", "Absent"],
                ["Moderation", "Submission, report, audit entry, feed connection", "Absent (Post model irrelevant)"],
                ["Relations", "Composed in interfaces and merge logic", "authorId string, no @relation, no cascade"],
                ["Constraints", "Runtime discipline (trust caps, uniqueness by id)", "None beyond unique email"],
            ],
        }),
        ("h2", "The persistence reality"),
        ("body", "What the platform actually persists today is a well-organised set of twenty-eight "
                 "localStorage keys (enumerated in Appendix B) - session and credential state for "
                 "authentication; favourites, leads, chat history, saved searches, compare lists, and "
                 "notifications for the core store; per-domain records for landlord, tenant, admin, "
                 "developer, diaspora, professional, and investor state; the tokenization blob "
                 "(keja-tokenize-v1) carrying KYC and wallet; a 200-event analytics ring; and assorted UI "
                 "flags. The discipline around them is better than typical: a single namespaced accessor, "
                 "bounded buffers where growth is unbounded in principle, and seed fallbacks that make a "
                 "cleared browser self-heal to the demo experience. The limits are equally structural: five "
                 "megabytes total quota, no cross-device truth, no backup, no concurrent-edit semantics, and "
                 "user-mutability that makes every value advisory rather than authoritative."),
        ("h2", "Migration gap analysis"),
        ("body", "The audit assessed the gap between current persistence and the Phase 2 requirement along "
                 "five axes. <b>Schema:</b> absent - the real domain must be authored in Prisma from the "
                 "data dictionary before any backend code exists, or the API will crystallise around "
                 "ad-hoc shapes. <b>API contract:</b> absent - no typed endpoint definitions, no error "
                 "taxonomy, no pagination or filtering conventions. <b>Sync strategy:</b> absent - no "
                 "offline queue, no conflict model, no idempotency for the day a landlord records rent "
                 "offline and re-syncs. <b>PII handling:</b> absent - no encryption-at-rest design for "
                 "identifier and income fields, though the Phase 2 database layer makes it straightforward "
                 "(column-level encryption or vaulted identifiers). <b>Backfill:</b> trivial - by design, "
                 "no real user data exists to migrate, which is the one unambiguous benefit of the "
                 "localStorage phase: the schema can be authored correctly once, from documentation, "
                 "without a single migration script from a legacy store."),
        ("h2", "Recommended schema shape"),
        ("body", "Chapter 24 presents the full target architecture; the data-model core of it deserves "
                 "preview here. The recommended Prisma schema is authored from the data dictionary with "
                 "the following properties: PostgreSQL as the datasource (the SQLite scaffold is dev-grade "
                 "and the ecosystem advantages of Postgres - row-level security options, JSONB for flexible "
                 "verification evidence, mature managed hosting - matter at exactly this scale); enums for "
                 "every TS union (PropertyType, Purpose, Availability, ClaimStatus, KYCStatus, "
                 "PaymentChannel, SubmissionState) so the database enforces what TypeScript currently "
                 "asserts; unique composites where the client currently relies on discipline (unit plus "
                 "period on rent payments, property plus investor on holdings); explicit cascade rules for "
                 "the ownership graph (user to applications, listing to evidence); soft-delete and audit "
                 "columns on the moderation-relevant tables; and the client's own audit-log event taxonomy "
                 "promoted to a first-class AuditEntry model so the Phase 2 platform keeps the transparency "
                 "property the demo already advertises."),
        ("h2", "Assessment"),
        ("body", "The data layer scores as a paradox worth stating precisely: <b>persistence engineering "
                 "discipline is high; persistence itself is the platform's single missing organ.</b> The "
                 "client-side modelling is genuinely good - typed, documented, quota-aware, seeded - and it "
                 "constitutes an accidental but complete specification for the server schema. The dormant "
                 "Prisma scaffold is harmless except as a signal: it implies a database exists. The audit "
                 "recommands either authoring the real schema as the first Phase 2 commit (preferred - it "
                 "is the contract everything else hangs from) or deleting the scaffold until that day "
                 "(acceptable - it removes a false implication). What it should not do is ship Phase 2 "
                 "incrementally with the starter models still in place, because the first ad-hoc endpoint "
                 "will harden around them."),
    ],
})

# =====================================================================
CHAPTERS.append({
    "title": "Privacy and Regulatory Compliance",
    "blocks": [
        ("h2", "The privacy posture is a strength - until data gets real"),
        ("body", "By the standards of consumer web platforms, Keja AI's privacy posture is close to "
                 "exemplary: no third-party trackers, no cookies (the single sidebar-state cookie in the "
                 "repository lives in dead code), no network egress at all, analytics that stay on-device "
                 "in a bounded ring buffer with a published taxonomy, and no account required to browse. A "
                 "user of the demo platform is, from a data-flow perspective, entirely private. This is "
                 "partly design virtue and partly architectural consequence - a static bundle has nowhere "
                 "to send data - but the effect is the same, and it aligns neatly with the trust-first "
                 "branding. The compliance question begins where the demo ends: at the points where the "
                 "platform collects identity-grade and financial-grade data into that private-by-accident "
                 "context."),
        ("h2", "Kenya Data Protection Act 2019 exposure"),
        ("body", "The Kenya DPA 2019 requires data controllers and processors processing personal data of "
                 "persons resident in Kenya to register with the Office of the Data Protection Commissioner "
                 "(ODPC), and imposes obligations around lawful basis, purpose specification, minimisation, "
                 "security, retention, and data-subject rights. Three platform surfaces engage the Act "
                 "today. The KYC form collects national ID or passport numbers and source-of-funds "
                 "declarations - sensitive personal data in anyone's reading - into plaintext browser "
                 "storage with no notice, purpose statement, or retention limit. The tenant application "
                 "collects monthly income, employer, and referee contact details. And the registration "
                 "flow accepts real email-plus-password credentials. None of these is unlawful to display; "
                 "all of them become regulated processing the moment they hold a real person's real data, "
                 "and the current implementation would satisfy none of the Act's security or notice "
                 "expectations in that moment. The audit's finding is timing-sensitive: this is cheap to "
                 "fix before real users and reputationally expensive after."),
        ("table", {
            "cols": [0.26, 0.37, 0.37],
            "align": ['l', 'l', 'l'],
            "caption": "DPA engagement points and the audit's remediation stance.",
            "header": ["Surface", "Data collected today", "Remediation stance"],
            "rows": [
                ["Tokenization KYC form", "idType, idNumber, sourceOfFunds, plaintext localStorage", "Do not persist identifiers in demo; add notice, purpose, retention before any real collection; encrypt at rest server-side in Phase 2"],
                ["Tenant application", "Monthly income, employer, references, phone", "Notice at collection; minimise to what landlords act on; server-side storage with role-gated access in Phase 2"],
                ["Account registration", "Email, password (DJB2-hashed locally)", "Gate or warn on real credentials in demo; real auth via server sessions (Ch. 24)"],
                ["On-device analytics", "Local events only, 200-event ring, no egress", "No DPA exposure; preserve the local-first property when remote analytics arrive"],
                ["Seed data in source", "Real-format names, phones, emails across auth and stores", "Replace with reserved-domain fictional data (@example.com, 07XX ranges)"],
                ["WhatsApp handoff", "Prefilled listing reference via wa.me link", "No personal data in URL beyond listing id - acceptable; keep refs non-identifying"],
            ],
        }),
        ("h2", "Registration and governance"),
        ("body", "When Phase 2 activates real data processing, the platform will need ODPC registration as "
                 "a data controller (the process is an online registration with category declarations), a "
                 "short privacy notice at each collection point - the current UI has none - and an "
                 "internal data map that, conveniently, the data dictionary already half-provides. The "
                 "tokenization ambitions add a second regulator: the platform's own documents track the "
                 "CMA regulatory sandbox (three sandbox-related PDFs are committed under docs/cma, covering "
                 "a testing plan and safeguards for a Karen waterfront tokenization quotation). The audit "
                 "is not qualified to predict CMA outcomes, but notes the sequencing dependency plainly: "
                 "collecting KYC data ahead of sandbox admission and ODPC registration is the single most "
                 "avoidable regulatory risk the platform currently carries, and the fix is a demo-mode "
                 "gate rather than a compliance programme."),
        ("h2", "Assessment"),
        ("body", "Privacy engineering earns the platform real credit: the local-first architecture, absent "
                 "trackers, and honest labelling would satisfy most of the Act's technical-security spirit "
                 "by default if the data were server-side. The compliance gap is concentrated, small, and "
                 "fully enumerated: three collection surfaces lacking notice and safeguards, plus seed "
                 "data hygiene. The audit schedules the demo-mode gating and fictional-data replacement in "
                 "the first 30 days of the action plan (Chapter 27), and folds the notice, registration, "
                 "and encryption work into the Phase 2 architecture milestones where they belong - as "
                 "first-class requirements, not annexes."),
    ],
})
