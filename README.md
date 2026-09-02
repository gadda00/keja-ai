# Keja.ai — Intelligent Real Estate. Verified Trust.

Kenya's AI real-estate advisor and cross-agency trust layer — a product of **Chacadom Investments**.
Live at **https://gadda00.github.io/keja-ai/**

## Regulatory readiness — CMA Regulatory Sandbox

Application pack for the **Keja.ai Tokenization Pilot** (applicant: Chacadom Investments), prepared per the CMA sandbox requirements (sandbox.cma.or.ke):

- **[Testing Plan (PDF)](docs/cma/Chacadom_CMA_Sandbox_Testing_Plan.pdf)** — a twelve-month, four-phase live test: hard participation and exposure caps, suitability screening before subscription, segregated client money, phase gates reported to the Authority, and a rehearsed exit (full licence / letter of no objection / wind-down).
- **[Safeguards & Risk-Management Plan (PDF)](docs/cma/Chacadom_CMA_Sandbox_Safeguards_Risk_Management_Plan.pdf)** — three-lines governance, a twelve-risk register with named owners, KYC/AML controls, Kenya Data Protection Act compliance, incident classes with CMA notification times, and a wind-down that ranks investors' capital ahead of the applicant's recovery.

## What's inside

| Area                     | Highlights                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Marketplace**          | 85+ live listings (seed + Auto-Pilot ingested), 80+ trust-verified (score ≥ 75), trust scores, Investment Score™ (7 weighted factors, FACT/ESTIMATE/ASSUMPTION labels), price-on-application support, SVG Kenya map view, saved searches + alert matching, 4-property comparison                                                                                                                                                                                                                                                                                                                                                               |
| **AI advisor**           | Conversational engine (EN/SW/FR) covering search, yields, mortgages, buying costs, process timelines, affordability, area guides, qualification                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Calculators**          | Rental ROI + 5/10-yr projections, mortgage (extra-payment savings, amortization schedule), affordability (CBK 33% DTI), Kenyan buying-cost stack                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Keja Tokenize**        | Fractional ownership demo (SPV framing, KYC/AML gating, simulated ledger, secondary market with order books, distributions calendar) — clearly labelled simulation                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Accounts**             | Google Sign-In (demo picker — wire a real client ID in `auth.tsx` when the backend ships) + email/password, 12h/30d sliding sessions, RBAC (user/agent/admin), brute-force throttle                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Admin console**        | Users, verification queue with trust-by-design anomaly flags, bulk approve/reject, CSV exports, partner applications + global feed connections, audit trail, settings                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Auto-Pilot**           | AI automatic listing engine — market scanner + partner feed adapters (JSON/CSV/XML) → enrichment → dedupe → quality gate → publish, on a 6-hour cron. Admin "Auto-Pilot" tab shows run log, feed health and per-listing machine screens                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Supply**               | 4-step listing wizard (draft auto-save, purpose validation) with live anomaly detection, 5-channel global listing acquisition strategy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Content**              | Six long-form market guides (`/insights`), Trust Center methodology, ecosystem map (8 products)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Neighbourhood guides** | The Waterfront Karen flagship location — `/areas/waterfront-karen`: photo/video guide, FACT/REPORTED/ESTIMATE-labelled investment thesis, live Karen inventory join, homepage spotlight, Waterfront badge on Karen listing cards, AI-engine intent ("tell me about the waterfront")                                                                                                                                                                                                                                                                                                                                                            |
| **Truth layer**          | **Claims register** (`/trust#claims`): every public capability declared with live/simulated/partner-dependent/planned status, evidence and path-to-live · **Evidence panels** on listings: scope, method, check date, 90-day expiry, freshness states, report-an-issue + human-review paths · **Admin adjudication queue** for user reports · **Persistent demo banner** on sensitive routes · **AI escalation guard** (legal/tax/valuation/lending/suitability questions route to humans, never improvised) · privacy-first local analytics bus (11-event taxonomy, no third parties) · first-visit role picker (buy/rent/invest/list/manage) |
| **Platform**             | PWA (installable, offline shell), per-route SEO meta + JSON-LD (RealEstateListing/Article/FAQPage/BreadcrumbList) + auto-generated sitemap, **prerendered status-200 HTML for every sitemap route (109 pages + a real 404 page)** (crawlers + social unfurls with absolute og:image URLs), reduced-motion support, WCAG-AA focus management, error boundary + real 404, 124 unit tests + CI gates (typecheck, ESLint flat config + oxlint, Prettier, vitest) — enforced on PRs AND deploys                                                                                                                                                     |

## Stack

React 19 · Vite 8 · TypeScript (strict, zero `any`) · Tailwind 3.4 · React Router 7 · local stores (localStorage, backend-upgradeable) · recharts (lazy) · vitest (+ jsdom for React-level tests).

## Develop

```bash
npm install
npm run dev        # local dev server
npm test           # unit tests (finance, scoring, search, AI engine, tokenize ledger, anomaly gate)
npm run typecheck  # tsc -b (same gate as CI)
npm run lint:eslint  # ESLint 9 flat config (same gate as CI)
npm run lint       # oxlint (fast pass)
npm run verify     # typecheck + eslint + tests + build — the full CI pipeline locally
npm run build      # production build (base /keja-ai/ baked into vite.config)
npm run prerender  # after build: status-200 HTML for all sitemap routes (needs `npx playwright install chromium`)
node scripts/generate-data-dictionary.mjs  # regenerate docs/DATA_DICTIONARY.md after dataset changes
```

`base` is set in `vite.config.ts`, so local builds match CI; CI additionally passes `--base` explicitly.

## Architecture notes

- `src/lib/` — engines: `finance.ts` (investment/mortgage/affordability math), `investmentScore.ts`, `ai/engine.ts` (intent parser + professional-advice escalation), `auth.tsx`, `adminStore.ts` (verification queue + listing-report adjudication), `tokenizeStore.tsx` (holdings/FIFO ledger), `searchStore.ts` (saved searches/notifications), `inventory.ts` (merged marketplace), `seo.ts` (per-route meta), `useFocusTrap.ts`, `verification.ts` (evidence model: scope/dates/expiry/freshness), `analytics.ts` (local-only event bus + taxonomy), `roleStore.ts` (first-visit role picker)
- `src/data/` — properties (27 seed listings + area insights), tokenize assets, long-form articles, **claims.ts (the capability claims register — the site cannot claim what is not declared there)**
- `docs/` — `REVIEW_ACTIONS.md` (external-review recommendation tracker), `DATA_DICTIONARY.md` (generated)
- `src/components/tokenize/` — the tokenization module (marketplace, trade, portfolio, issuer, learn)
- `public/sw.js` — versioned service worker (cache-first assets, network-first pages, offline fallback)

## Keja Auto-Pilot — the AI automatic listing engine

The marketplace grows itself, end to end, fully automated by code:

```
.github/workflows/auto-listings.yml   cron every 6h (+ manual dispatch)
  └─ scripts/auto-listings/run.mjs    orchestrator (zero npm deps)
       ├─ scanner.mjs                 market scanner: demand-weighted areas, type mix,
       │                              per-acre land pricing, bed-consistent sizing
       ├─ feeds.mjs                   partner feed adapters — JSON, CSV, XML
       │                              (feeds/ directory = contracted partner sources)
       ├─ enrich.mjs                  AI enrichment: grammar-based descriptions,
       │                              rent/yield estimates from area economics,
       │                              deterministic photo assignment, highlights
       ├─ dedupe.mjs                  cross-source fuzzy signatures + title-token overlap
       ├─ quality.mjs                 type-aware anomaly screens (price/sqm vs area band,
       │                              price/acre vs acreage band, completeness, content)
       │                              → publish (Q≥80) / review (60–79) / reject (<60)
       └─ publish.mjs                 src/data/auto-listings.json (capped, run log)
  → git commit by keja-autopilot[bot] → gated deploy job (same workflow, only
    when listings actually changed) → live marketplace grows
```

Runtime: `src/lib/autoListings.ts` adapts entries into the marketplace — IDs `KJA-A0001+`,
trust capped at 88 with `titleCheck: pending` (machine-screened, never human-verified),
visible **AUTO-PILOT** chips on cards and detail pages. Admin console → Auto-Pilot tab
for run history, feed health, review queue and per-listing screens.

Try it locally:

```bash
node scripts/auto-listings/run.mjs --dry --count 6   # preview a run
node scripts/auto-listings/run.mjs --count 6         # write the data file
node scripts/generate-sitemap.mjs                    # regenerate sitemap
```

## Demo accounts

Google demo picker (Amina / Victor / Clive) from the sign-in dialog, or the seeded email accounts (`admin@`, `agent@`, `investor@keja.ai`).
All data is client-side demo data — no production backend, no real securities.

> **Security note:** this is the MVP auth layer for a static demo deployment —
> roles, sessions and password hashes live in the visitor's own browser
> (localStorage) and are therefore client-trust only. Before any real launch,
> the admin console and account layer MUST move to server-side verification
> (see `src/lib/auth.tsx` header). No real user data should ever be entered.

## Deployment

`git push origin main` → GitHub Actions builds with `--base=/keja-ai/`, prerenders every sitemap route to status-200 HTML (including a real, noindex `404.html` captured from the router's NotFound page — no SPA-fallback copy of Home), deploys to GitHub Pages.

## Roadmap

Real backend (accounts, listings, payments via M-Pesa/bank), licensed KYC provider, ERC-3643 tokenization with CMA sandbox approval, agent portal (KEJA PRO), multilingual full-site i18n.
