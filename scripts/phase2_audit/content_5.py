# -*- coding: utf-8 -*-
"""Content module 5: PWA, Performance, SEO, A11y/UX (Ch 13-16)."""

CHAPTERS = []

# =====================================================================
CHAPTERS.append({
    "part": "Part V - Delivery and User-Facing Disciplines",
    "title": "Progressive Web App Assessment",
    "blocks": [
        ("h2", "Installability verdict"),
        ("body", "Keja AI is genuinely installable on both major mobile platforms, and the implementation "
                 "quality places it in the top tier of PWAs the audit team has reviewed. The manifest is "
                 "complete and modern: a stable id, standalone display with a display_override chain, a "
                 "navigate-existing launch handler, portrait orientation, branded theme and background "
                 "colours, app categories, three app shortcuts (Properties, Ask Keja, Deal Analyst), and - "
                 "the detail most teams skip - screenshot entries with form_factor declarations for both "
                 "narrow (1080x2340) and wide (1920x1080) presentations, which unlocks Chrome's rich install "
                 "dialog. Icons cover the required matrix: 192 and 512 PNGs for any, maskable variants at "
                 "both sizes with drawn safe zones, an 180-point Apple touch icon, and both a 64-point PNG "
                 "and an SVG favicon for browsers."),
        ("table", {
            "cols": [0.34, 0.16, 0.16, 0.34],
            "align": ['l', 'c', 'c', 'l'],
            "caption": "PWA installability checklist against current platform criteria.",
            "header": ["Criterion", "Android", "iOS", "Evidence / note"],
            "rows": [
                ["Manifest served, parseable, with icons", "Pass", "n/a", "manifest.webmanifest 2.1 KB, 6 icon entries"],
                ["HTTPS with service worker + fetch handler", "Pass", "Pass", "Vercel TLS; sw.js 109 lines, three-tier strategy"],
                ["beforeinstallprompt capture and prompt UX", "Pass", "n/a", "InstallPrompt 188 lines, 14-day dismissal cooldown"],
                ["iOS Add to Home Screen walkthrough", "n/a", "Pass", "Three-step illustrated guide in Share menu"],
                ["Standalone chrome and status bar treatment", "Pass", "Pass", "apple-mobile-web-app-capable + black-translucent; legacy meta belt-and-braces"],
                ["Splash / launch screens", "Pass", "Pass", "17 device-class startup images, 750x1334 to 2048x2732"],
                ["Offline fallback", "Pass", "Pass", "offline.html + inline Response final fallback"],
                ["Maskable icon safe zone", "Pass", "n/a", "generate-pwa-assets.mjs draws safe zone deterministically"],
                ["Update flow", "Warn", "Warn", "skipWaiting is silent; no new-version toast"],
                ["Orientation flexibility", "Warn", "n/a", "portrait-primary lock blocks landscape/tableets"],
            ],
        }),
        ("h2", "The service worker"),
        ("body", "The service worker is the platform's best single file. It implements a three-tier strategy: "
                 "immutable /assets/ requests are cache-first with 200-only caching; images are cache-first "
                 "in a versioned cache; and navigations race the network against an eight-second timeout, "
                 "falling back through the cached page, the cached index shell, the offline page, and "
                 "finally an inline Response - so the app never hard-fails offline. Cache writes are wrapped "
                 "in event.waitUntil with a documented rationale (bare promise chains can be killed "
                 "mid-write), the activate handler evicts every cache not matching the current version "
                 "string, and skipWaiting plus clients.claim make rollouts immediate. The versioning story "
                 "is the standout detail: a build script SHA-256-hashes the entire out/ tree and stamps the "
                 "digest into the worker source, giving content-addressed cache busting that cannot drift - "
                 "and vercel.json serves the worker itself with max-age=0 must-revalidate so updates are "
                 "never stranded at the edge."),
        ("h2", "Gaps in an otherwise excellent implementation"),
        ("body", "Three gaps remain, all Medium or below. The update flow is silent: when a new version "
                 "arrives, the worker takes over immediately with no user-facing signal, which is "
                 "disorienting in a long-lived installed session - a toast with a reload affordance is the "
                 "standard remedy and costs an afternoon. The orientation lock (portrait-primary) prevents "
                 "landscape and large-tablet use of a property-browsing product whose comparison and "
                 "dashboard views benefit from width; the audit recommends removing the lock and testing "
                 "the shell at landscape aspect ratios. And offline.html still carries the retired gold-on-"
                 "cream palette rather than the green brand system declared in the manifest - cosmetic, but "
                 "it is the one screen where brand continuity matters most, because it is shown precisely "
                 "when the platform feels broken."),
        ("h2", "iOS specifics"),
        ("body", "The iOS treatment deserves its own paragraph because it is where most PWAs quietly fail. "
                 "The layout ships the full metadata set (capable, black-translucent status bar, viewport-fit "
                 "cover with safe-area insets honoured in the shell's pt-safe/pb-safe utilities), and the "
                 "seventeen startup images cover every current device class from 750x1334 to 2048x2732 - "
                 "2.2 MB of PNGs that most teams never generate. Safari ignores the fetch-handler caching "
                 "tier for its own reasons, but the app shell still lands in the origin cache, and the "
                 "offline page renders from the inline fallback. The install walkthrough in the prompt "
                 "component teaches the Share-menu dance with illustrations, and the prompt correctly "
                 "suppresses itself in standalone and Capacitor contexts. Net: an iOS user can add Keja to "
                 "a home screen and receive a credible app-like experience - which is exactly the "
                 "distribution story for a market where app-store discovery is weak and WhatsApp sharing "
                 "is strong."),
        ("h2", "Assessment"),
        ("body", "PWA execution is a platform strength to protect, not a gap to close: the audit score is "
                 "4.5 of 5, with the half point held back only by the update-flow and orientation items. "
                 "The strategic note that belongs here rather than in Chapter 16: installability is the "
                 "platform's compensation strategy for its SEO darkness (Chapter 17) - the PWA-first, "
                 "share-first distribution bet only pays if the installed experience is impeccable, "
                 "because there is no search funnel backing it up. Every incremental investment in the "
                 "installed experience (update toasts, offline listing caching of the property JSON, "
                 "background sync when Phase 2 arrives) directly strengthens the one acquisition channel "
                 "the current architecture actually supports."),
    ],
})

# =====================================================================
CHAPTERS.append({
    "title": "Performance Assessment",
    "blocks": [
        ("h2", "Measured bundle composition"),
        ("body", "The audit measured the production artifact directly (out/, built with Turbopack and "
                 "deployed). The first-load critical path - the nine script chunks referenced by index.html "
                 "- totals 611 KB raw, about 183 KB gzipped, plus 145 KB of CSS (22 KB gzipped) and the "
                 "self-hosted Geist fonts (164 KB across eleven woff2 files, two preloaded). With the HTML "
                 "shell that is roughly 810 KB raw / 240 KB compressed before imagery - acceptable for the "
                 "3G-to-4G reality of the target market, and materially better than the platform's incumbent "
                 "competitors ship, but with two avoidable inefficiencies embedded in it."),
        ("chart", "chart_bundle.png",
         "First-load chunk composition from the production build: raw versus gzipped sizes.", 235),
        ("h2", "The recharts duplication"),
        ("body", "The single largest avoidable cost is that the recharts library ships twice. Two lazy "
                 "chunks (2b20b3ee and 4de4ce44) each contain the full recharts/d3 dependency tree - 388 KB "
                 "apiece, roughly 775 KB of raw JavaScript between them - because the bundler did not "
                 "extract the shared module for the two asynchronous routes that import it (the market data "
                 "view and the investor dashboard / deal analyst pair). A manual shared chunk, or routing "
                 "all chart usage through one lazily-loaded module, removes roughly 300 KB from the lazy "
                 "surface at zero product cost. The audit ranks this Medium severity - it does not touch "
                 "first load, but it doubles the download for exactly the power users (investors) whose "
                 "retention the platform most wants."),
        ("h2", "Imagery: the five-megabyte ghost"),
        ("body", "The audit cross-referenced every image reference in source against the deployed asset "
                 "tree and found that all 132 property-image references resolve to .jpg files - not one "
                 ".webp variant is referenced anywhere in src/, despite every property shipping both "
                 "formats side by side. The WebP set is approximately five megabytes of dead weight on the "
                 "CDN, and - the more actionable inverse - users are being served the heavier format on "
                 "every listing card. Additionally, roughly 876 KB of brand imagery referenced only by PDF "
                 "documents ships in the web bundle. No srcset, picture element, or DPR handling exists "
                 "anywhere: full-resolution JPGs serve to every device class. The remediation is "
                 "mechanical - swap references to the WebP variants (a 30-60 percent size reduction on "
                 "identical quality), delete the unreferenced brand set from public/, and add width/"
                 "height attributes to eliminate layout shift on image load."),
        ("stats", [("611 KB", "first-load JS (raw)"), ("~300 KB", "recharts duplicated in lazy chunks"),
                   ("~5.0 MB", "dead WebP assets deployed"), ("0", "srcset / DPR usages")]),
        ("h2", "First-load waterfall"),
        ("body", "Reconstructing the first visit from the artifact: the HTML shell (22.1 KB) references "
                 "the nine critical chunks, two stylesheets, and two preloaded font files; the shell "
                 "renders the branded loading splash until React mounts and the hash router resolves "
                 "the initial view. The waterfall below is the honest budget the audit recommends "
                 "optimising against - and the reference point for the P1 image work, since imagery "
                 "lands after paint on listing-bearing routes."),
        ("table", {
            "cols": [0.30, 0.16, 0.16, 0.38],
            "align": ['l', 'c', 'c', 'l'],
            "caption": "First-visit budget, raw and compressed (measured from out/).",
            "header": ["Resource", "Raw", "Gzipped", "Notes"],
            "rows": [
                ["HTML shell", "22.1 KB", "~6 KB", "Includes RSC flight data for the splash"],
                ["Critical JS (9 chunks)", "611 KB", "183 KB", "Includes Home + framer-motion (F-item: lazy Home)"],
                ["CSS (2 files)", "144.6 KB", "22 KB", "Tailwind 4 output with token layer"],
                ["Fonts (11 woff2; 2 preloaded)", "164 KB", "~150 KB", "Geist + Mono, self-hosted, no third party"],
                ["First listing hero image", "~350 KB", "n/a (JPEG)", "Full-size JPG; WebP sibling unreferenced (F-23)"],
                ["Total to interactive (approx.)", "~1.29 MB", "~365 KB", "Before SW caching; repeat visits near-zero"],
            ],
        }),
        ("h2", "What is already fast"),
        ("body", "The performance story is not one of neglect - most fundamentals are right. Route-level "
                 "code splitting is genuine (31 lazy views); the service worker makes repeat visits "
                 "near-zero-transfer; fonts are self-hosted with preloading and no third-party requests; "
                 "listing images lazy-load with onError fallbacks; entrance animations fire once on "
                 "viewport entry rather than running persistent rAF loops; and the skeleton of a Core Web "
                 "Vitals story exists (server timing headers, hashed immutable assets, preloaded fonts). "
                 "The measured gaps are concentration problems, not architecture problems: Home is "
                 "statically imported, pulling framer-motion and the heaviest view into the initial "
                 "chunk; recharts doubles; images are unoptimised by format. All three have direct fixes "
                 "in the Chapter 26 plan."),
        ("table", {
            "cols": [0.30, 0.14, 0.56],
            "align": ['l', 'c', 'l'],
            "caption": "Performance findings and remediation summary.",
            "header": ["Finding", "Severity", "Remediation"],
            "rows": [
                ["recharts duplicated across two async chunks", "Medium", "Manual shared chunk or single chart module; ~300 KB saved"],
                ["JPG served where WebP siblings exist", "Medium", "Swap references; delete unreferenced variants; expect 30-60% image transfer cut"],
                ["No responsive image handling (srcset/DPR)", "Medium", "Add srcset from existing variants; set width/height to stop CLS"],
                ["Home statically imported in shell chunk", "Low", "Lazy-load Home like other views; shell shrinks by the Home delta"],
                ["No immutable cache header for /_next/static", "Low", "Add max-age=31536000 immutable rule in vercel.json"],
                ["5 MB unreferenced imagery + 876 KB PDF-only brand assets", "Medium", "Delete from public/; regenerate asset manifest"],
                ["framer-motion on every property card", "Low", "Batch or remove card-level motion; add prefers-reduced-motion"],
            ],
        }),
        ("h2", "Assessment"),
        ("body", "Scored against the platform's own market context - Android devices on variable data "
                 "plans - the shipped performance is adequate-to-good, with a clear 25-35 percent "
                 "improvement available from a week of mechanical work (image formats, shared chart "
                 "chunk, lazy Home) that requires no architectural change. The audit's one forward-looking "
                 "caution: performance work is currently unmeasurable in production (no RUM, no "
                 "analytics, Chapter 21), so every optimisation lands blind and every regression ships "
                 "unnoticed. The sequencing recommendation is therefore to stand up even a minimal "
                 "privacy-respecting web-vitals signal in the same sprint as the first optimisation, not "
                 "after."),
    ],
})

# =====================================================================
CHAPTERS.append({
    "title": "SEO and Discoverability",
    "blocks": [
        ("h2", "The darkest chapter of the audit"),
        ("body", "If the report had to compress its strategic message into one sentence, it would be this: "
                 "the platform is invisible to the channel that decides marketplace outcomes. Because the "
                 "application is a hash-routed SPA whose shell renders a loading fallback in the initial "
                 "HTML, and because search engines discard URL fragments, <b>all 87 property pages, every "
                 "article, and every area guide are unindexable as distinct resources</b>. A Google query "
                 "for a Kilimani two-bedroom - the platform's core demand - cannot surface a Keja listing, "
                 "today or under the current architecture ever. For a listings marketplace competing "
                 "against BuyRentKenya (the most-trafficked dedicated property portal in East Africa, "
                 "backed by ROAM Group) and Jiji, both of whom acquire predominantly through organic "
                 "search, this is not a ranking problem; it is an existence problem."),
        ("h2", "The metadata that is done well"),
        ("body", "The audit wants to be precise about what works, because the fix builds on it. The root "
                 "layout's metadata is professional: a metadataBase anchored to keja.app, a title template, "
                 "Open Graph with a proper 1200x630 image and en_KE locale, Twitter large-image cards, a "
                 "robots configuration with max-image-preview large, format detection controls, and "
                 "application metadata. robots.txt is clean and declares a sitemap. The problem is "
                 "entirely structural: this excellent metadata describes one page - the home page - and "
                 "every deep link in the product shares it, because nothing in the SPA mutates document "
                 "title or description per route, and the sitemap the robots file points at does not "
                 "exist in production."),
        ("h2", "The sitemap that serves HTML"),
        ("body", "A well-built sitemap generator exists in the repository (scripts/generate-sitemap.mjs) - "
                 "it extracts property IDs, article slugs, and area slugs into roughly ninety URLs - but "
                 "no workflow and no build command invokes it, so out/ ships without sitemap.xml. The "
                 "failure mode this creates is worse than a 404: the SPA rewrite serves index.html at "
                 "/sitemap.xml with HTTP 200, presenting the crawler with a JavaScript loading shell where "
                 "it expects XML. Wiring the generator into the Vercel build command is a five-minute fix "
                 "and Chapter 27 schedules it in the first week - but the audit is equally clear that a "
                 "sitemap of fragment URLs fixes nothing about indexability; it is table stakes for the "
                 "day path-based URLs exist."),
        ("table", {
            "cols": [0.30, 0.14, 0.56],
            "align": ['l', 'c', 'l'],
            "caption": "SEO findings register.",
            "header": ["Finding", "Severity", "Detail and remediation path"],
            "rows": [
                ["Fragment URLs unindexable", "Critical", "Hash routing discards #/ in crawlers; requires prerendered path routes (Ch. 24 decision framework)"],
                ["sitemap.xml absent; serves HTML at 200", "High", "Run generator in build command; add XML content-type route ahead of SPA rewrite"],
                ["No structured data (JSON-LD)", "High", "Add Organization, WebSite+SearchAction, and per-listing RealEstateListing blocks - works even pre-prerender on the shell for the site entity"],
                ["No per-route title/description", "High", "Add a usePageMeta hook on the custom router; restores social unfurls for shared links immediately"],
                ["Single-page metadata only", "Medium", "Consequence of the above; resolved by per-route meta"],
                ["No hreflang / language signals", "Low", "Content is English; revisit if Swahili content ships"],
            ],
        }),
        ("h2", "The strategic decision"),
        ("body", "The honest framing the audit offers the platform owner is a choice between two coherent "
                 "strategies, both legitimate, currently unreconciled. <b>Strategy A - accept the dark:</b> "
                 "lean fully into PWA-first, WhatsApp-first distribution - install prompts, referral "
                 "links, agent-mediated sharing, and eventually app-store presence via the Capacitor "
                 "shells. This suits the Kenyan context (WhatsApp is the de facto web), matches the "
                 "current architecture exactly, and forfeits search permanently. <b>Strategy B - turn on "
                 "the lights:</b> introduce path-based routes with build-time prerendering of the "
                 "indexable surfaces (listing pages, area guides, articles) while keeping the SPA shell "
                 "for the app-like flows. Next.js's own guidance ranks static generation first for SEO, "
                 "and the repository even contains the corpse of the right idea - prerender.mjs, the Vite-"
                 "era script that rendered route HTML into dist/. Chapter 24 specifies the Strategy B "
                 "implementation as the audit's recommendation, because a marketplace without an organic "
                 "acquisition channel is renting its growth from every other channel it uses."),
        ("callout", "<b>Audit recommendation:</b> adopt Strategy B. Prerender the public catalog (87 "
                    "listing pages, 21 area guides, the insights corpus) to path-based URLs at build "
                    "time; keep the hash router or migrate to path routing for the authenticated flows; "
                    "ship JSON-LD per listing; wire the sitemap. The Auto-Pilot pipeline already rebuilds "
                    "on inventory changes, so prerendering rides the existing deploy loop for free - "
                    "new listings become indexable pages within one cron cycle."),
        ("h2", "Assessment"),
        ("body", "SEO is the platform's lowest-scoring discipline (1.5 of 5) and simultaneously its "
                 "highest-leverage opportunity, because the fix is architectural but bounded: the public "
                 "catalog is small, statically generatable, and already data-driven. The gap between "
                 "where the platform is (zero organic visibility) and where one sprint of work puts it "
                 "(fully indexable catalog with structured data) is the largest ratio in this report."),
    ],
})

# =====================================================================
CHAPTERS.append({
    "title": "Accessibility and User Experience",
    "blocks": [
        ("h2", "Accessibility census"),
        ("body", "For an AI-accelerated solo build, the accessibility floor is remarkably high, and the "
                 "audit credits it explicitly because it is the discipline most often skipped. The census "
                 "found: a skip-to-content link implemented correctly (visually hidden until focused); a "
                 "role=search hero form with an aria-label; 393 aria attributes across the component tree "
                 "with aria-current on active navigation and tabs; every Lucide icon marked aria-hidden; "
                 "descriptive alt text including photo-count patterns (title - photo 2 of 5) and empty "
                 "alt on decorative imagery; label-for pairs on all fourteen fields of the listing "
                 "wizard; a focus-trap hook with escape handling, focus restoration, and stacked-dialog "
                 "close ordering; role=status loading states; semantic landmark elements throughout; and "
                 "Radix primitives supplying the dialog and menu semantics the hand-rolled UI could not "
                 "be trusted to get right."),
        ("h2", "Contrast and motion"),
        ("body", "Two gaps temper the census. First, contrast: the brand gold (#D4B04A) on the cream "
                 "background (#F7F5EF) measures 1.91:1 - far below the 4.5:1 WCAG AA threshold for body "
                 "text - and while most of the 148 text-gold usages are decorative (the AI wordmark "
                 "accent, arrows, icons), the footer tagline and several uppercase micro-labels are real "
                 "text in real violation. The primary green and white-on-green combinations pass "
                 "comfortably (4.92:1 and 5.37:1), so the fix is scoped: darken the gold for light-mode "
                 "text usage only. Second, motion: framer-motion entrance and stagger effects ship with "
                 "no prefers-reduced-motion strategy beyond a single CSS-level concession - a full "
                 "reduced-motion media query covering the animation library is a modest, standard "
                 "addition that respects users with vestibular sensitivity."),
        ("table", {
            "cols": [0.34, 0.14, 0.52],
            "align": ['l', 'c', 'l'],
            "caption": "Accessibility findings.",
            "header": ["Finding", "Severity", "Remediation"],
            "rows": [
                ["Gold-on-cream text contrast 1.91:1", "Medium", "Darker gold token for light-mode text; keep gold-on-dark as is (8.12:1)"],
                ["No prefers-reduced-motion for framer-motion", "Low", "Global MotionConfig with reduced-motion user respect"],
                ["Skeletons unused; spinners for loading", "Low", "Adopt content-shaped skeletons from existing ui/skeleton.tsx"],
                ["Range-input trust filter untested with SR", "Low", "Add aria-valuetext labelling; test with TalkBack/VoiceOver"],
                ["Keyboard gallery operation", "Pass", "Already implemented"],
                ["Focus management in dialogs", "Pass", "useFocusTrap is exemplary"],
            ],
        }),
        ("h2", "User experience inventory"),
        ("body", "The product's UX surface is broad and internally consistent. Search offers facets "
                 "(area, type, purpose, bedrooms, price and trust sliders), five sort orders, a compare "
                 "tray, and saved searches with local alert matching - and the empty state is properly "
                 "designed (a clear message plus a clear-all affordance) where most SPAs simply render "
                 "blank. The listing detail page is the platform's strongest surface: gallery with "
                 "keyboard operation, the trust score breakdown, the Property Passport identity block, "
                 "verification evidence with freshness chips, an inline mortgage calculator, similar "
                 "properties, and an agent card whose WhatsApp deep link carries a prefilled listing "
                 "reference - the one genuinely real conversion path in the product. The design system "
                 "(shadcn on Tailwind 4 tokens, oklch colour space, dark mode via token swap with only "
                 "25 explicit dark: overrides) is coherent, and the responsive shell (mobile-first, safe-"
                 "area insets, a five-tab bottom bar, a four-card grid at wide breakpoints) behaves like "
                 "a product designed in Nairobi for a phone-first market - because it was."),
        ("h2", "The conversion gap"),
        ("body", "The audit's principal UX finding is that <b>the primary conversion actions are "
                 "theatrical</b>: Book a viewing and Request callback render a toast and discard the "
                 "intent - no capture, no persistence, no notification. In a WhatsApp-first market this "
                 "is survivable (and the WhatsApp float with prefilled context is the real funnel), but "
                 "the buttons' apparent functionality overstates their reality, which cuts against the "
                 "platform's own honesty standard. The remediation ladder is cheap: route both actions "
                 "through the WhatsApp deep link with intent-specific prefilled text (an afternoon); or "
                 "capture a lightweight lead form into the existing leads store with an admin-queue "
                 "surface (a day, no backend needed); or defer to the Phase 2 lead API. The audit "
                 "recommends the first rung immediately and the second by day 30."),
        ("h2", "The missing map"),
        ("body", "One domain-shaped absence stands out in the browsing experience: there is no map. Zero "
                 "usage of Leaflet, Mapbox, Google Maps, or OSM anywhere in the tree - in a property "
                 "marketplace whose searchStore even persists stylised area coordinates per saved search. "
                 "Kenya's renters navigate by neighbourhood and landmark, and every incumbent portal "
                 "leads its results with a map panel. The audit rates this High for the domain and "
                 "prescribes the pragmatic version in Chapter 26: a Leaflet (OSM-tiled) results map "
                 "clustered by area, lazy-loaded behind the results view so the library never touches "
                 "first load, with the existing per-area coordinates as the data source and per-listing "
                 "geocoding deferred until a provider is chosen deliberately."),
        ("h2", "The editorial and content system"),
        ("body", "A property marketplace lives or dies on the content around its listings, and the "
                 "platform's editorial layer is more developed than its size suggests. The insights "
                 "corpus publishes article pages through the same lazy-view pipeline as the product "
                 "surfaces, with slugged routes (#/insights/:slug) and a detail view that carries "
                 "structured metadata. Twenty-one area guides (#/areas/:slug) give each Nairobi "
                 "neighbourhood a canonical page - the exact asset class that, under Chapter 24's "
                 "Strategy B prerendering, becomes the platform's SEO beachhead, because area-guide "
                 "queries ('2 bedroom Kilimani rent') are precisely the demand the incumbents monetise "
                 "and the audit's keyword logic targets. The claims register, discussed throughout "
                 "this report as the honesty backbone, is itself an editorial product: a public, "
                 "machine-readable inventory of every material platform claim, rendered in the Trust "
                 "Center view - the audit knows of no regional competitor that ships anything "
                 "comparable."),
        ("table", {
            "cols": [0.24, 0.14, 0.62],
            "align": ['l', 'c', 'l'],
            "caption": "Content asset classes and their strategic roles.",
            "header": ["Asset class", "Volume", "Strategic role"],
            "rows": [
                ["Property listings", "87 (27 seed + 60 auto)", "The catalogue; grows via Auto-Pilot cron"],
                ["Area guides", "21 areas", "SEO beachhead under Strategy B; local-lore moat"],
                ["Insights articles", "corpus in src/data", "Topical authority; share surface for WhatsApp"],
                ["Claims register", "register + Trust Center", "Differentiating trust artefact; regulator-facing"],
                ["Verification evidence", "per-listing blocks", "The product's core promise, rendered"],
                ["Documentation suite", "18 docs + PDFs", "Operational memory; partner credibility"],
            ],
        }),
        ("body", "The content system's weakness is the same as every other surface's - it is entirely "
                 "build-time. Articles and guides ship inside the JavaScript bundle as authored data "
                 "modules, which means updates ride deploys (fine at current cadence), nothing is "
                 "individually addressable to crawlers (the Chapter 17 finding), and there is no "
                 "editorial workflow beyond committing TypeScript. None of that blocks Phase 2, and "
                 "the authored-in-TypeScript approach has genuine virtues for a solo team (type-checked "
                 "content, zero CMS attack surface); the audit's single recommendation here is the "
                 "prerendering dependency already scheduled, which converts this rich content layer "
                 "from invisible inventory into indexable assets."),
        ("h2", "Assessment"),
        ("body", "Accessibility and UX score well above the platform's stage: the foundation is "
                 "semantic, labelled, keyboard-operable, and visually coherent, with two bounded "
                 "defects (contrast token, motion preference) and one strategic omission (the map). The "
                 "conversion-theatre finding is the one that matters most to fix before growth spending, "
                 "because every unit of traffic driven to a toast-shaped dead end is a unit of trust "
                 "spent against the platform's core promise."),
    ],
})
