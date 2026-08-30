# Keja.ai — Intelligent Real Estate. Verified Trust.

Kenya's AI real-estate advisor and cross-agency trust layer — a product of **Chacadom Investments**.
Live at **https://gadda00.github.io/keja-ai/**

## What's inside

| Area | Highlights |
|---|---|
| **Marketplace** | 35+ verified listings (seed + auto-ingested), trust scores, Investment Score™ (7 weighted factors, FACT/ESTIMATE/ASSUMPTION labels), SVG Kenya map view, saved searches + alert matching, 4-property comparison |
| **AI advisor** | Conversational engine (EN/SW/FR) covering search, yields, mortgages, buying costs, process timelines, affordability, area guides, qualification |
| **Calculators** | Rental ROI + 5/10-yr projections, mortgage (extra-payment savings, amortization schedule), affordability (CBK 33% DTI), Kenyan buying-cost stack |
| **Keja Tokenize** | Fractional ownership demo (SPV framing, KYC/AML gating, simulated ledger, secondary market with order books, distributions calendar) — clearly labelled simulation |
| **Accounts** | Google Sign-In (demo picker until `GOOGLE_CLIENT_ID` is set) + email/password, 12h/30d sliding sessions, RBAC (user/agent/admin), brute-force throttle |
| **Admin console** | Users, verification queue with trust-by-design anomaly flags, bulk approve/reject, CSV exports, partner applications + global feed connections, audit trail, settings |
| **Auto-Pilot** | AI automatic listing engine — market scanner + partner feed adapters (JSON/CSV/XML) → enrichment → dedupe → quality gate → publish, on a 6-hour cron. Admin "Auto-Pilot" tab shows run log, feed health and per-listing machine screens |
| **Supply** | 4-step listing wizard (draft auto-save, purpose validation) with live anomaly detection, 5-channel global listing acquisition strategy |
| **Content** | Six long-form market guides (`/insights`), Trust Center methodology, ecosystem map (8 products) |
| **Platform** | PWA (installable, offline shell), per-route SEO meta + JSON-LD (RealEstateListing/Article/FAQPage/BreadcrumbList) + auto-generated sitemap, reduced-motion support, WCAG-AA focus management, error boundary + real 404, 27 unit tests + CI gates |

## Stack

React 19 · Vite 8 · TypeScript (strict, zero `any`) · Tailwind 3.4 · React Router 7 · Zustand-free local stores (localStorage, backend-upgradeable) · recharts (lazy) · vitest.

## Develop

```bash
npm install
npm run dev        # local dev server
npm test           # unit tests (finance, scoring, search, AI engine, Auto-Pilot adapter)
npm run build      # production build (base /keja-ai/ baked into vite.config)
```

`base` is set in `vite.config.ts`, so local builds match CI; CI additionally passes `--base` explicitly.

## Architecture notes

- `src/lib/` — engines: `finance.ts` (investment/mortgage/affordability math), `investmentScore.ts`, `ai/engine.ts` (intent parser), `auth.tsx`, `adminStore.ts` (verification queue), `tokenizeStore.tsx` (holdings/FIFO ledger), `searchStore.ts` (saved searches/notifications), `inventory.ts` (merged marketplace), `seo.ts` (per-route meta), `useFocusTrap.ts`
- `src/data/` — properties (20 listings + area insights), tokenize assets, long-form articles
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
  → git commit by keja-autopilot[bot] → triggers deploy → live marketplace grows
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

`admin@keja.ai / admin123` · `agent@keja.ai / agent123` · `investor@keja.ai / investor123` · Google demo picker (Amina / Victor / Clive).
All data is client-side demo data — no production backend, no real securities.

## Deployment

`git push origin main` → GitHub Actions builds with `--base=/keja-ai/`, copies `index.html → 404.html` (SPA fallback), deploys to GitHub Pages.

## Roadmap

Real backend (accounts, listings, payments via M-Pesa/bank), licensed KYC provider, ERC-3643 tokenization with CMA sandbox approval, agent portal (KEJA PRO), multilingual full-site i18n.
