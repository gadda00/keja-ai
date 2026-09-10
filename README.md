# Keja AI — Africa's Real Estate Intelligence & Trust Infrastructure

**Discover. Verify. Analyse. Finance. Invest. Transact. Manage.**

Kenya's AI real-estate ecosystem for every stakeholder — buyers, sellers, landlords, tenants,
investors, developers, banks and institutions. A product of **Chacadom Investments**.
Canonical home: **https://keja.app** (Netlify) · native apps: `docs/MOBILE.md`

## The ecosystem (nine products)

| Product | Purpose | Status |
| --- | --- | --- |
| **Keja Home** | Property discovery and listings — search, facets, comparison, saved-search alerts | Live |
| **Keja Verify** | Verification, the KEJA Trust Score™ (12 labelled factors) and the Property Passport | Live |
| **Keja AI** | AI property advisor (EN/SW/FR) + the AI Deal Analyst (document pre-screening) | Live |
| **Keja Invest** | Investment calculator, Investment Score™ and the investor dashboard (downloadable report) | Live |
| **Keja Finance** | Mortgage calculator, eligibility (CBK 33% DTI), bank comparison, financing types | Pilot |
| **Keja Transact** | Transaction milestones, stakeholder payments and the professional panel | Pilot |
| **Keja Token** | Fractional ownership — **TRIAL MODE** with fictional assets and a virtual wallet | Trial |
| **Keja Manage** | Property & rental management — rent, tenants, maintenance, AI alerts | Pilot |
| **Keja Data** | Market intelligence — natural-language questions answered from live inventory | Live |

Plus the stakeholder portals: **Diaspora** (remittance comparison, timezone engine),
**Developers** (project profiles + the Development Score), **Institutional** (banks, pension
funds, REITs, SACCOs, insurers) and **Partners** (partnership deck requests).

## What's inside

- **Marketplace** — 85+ listings (seed + Auto-Pilot ingested), Trust Scores on every card,
  the Property Passport (KEJA-XXX-000000 identity, ownership/title/encumbrance/rates/zoning
  status, valuation band, fraud risk) and evidence panels with 90-day freshness.
- **Trust layer** — the claims register (`/trust#claims`): every capability declared live /
  simulated / partner-dependent / planned with evidence and path-to-live. The site cannot
  claim what is not declared there.
- **AI advisor** — trilingual conversational engine covering search, yields, mortgages,
  affordability, area guides and process — with intent routing to every workspace and a
  professional-advice escalation guard (legal/tax/valuation/suitability questions go to humans).
- **AI Deal Analyst** — describe the deal, attach documents (processed on-device, never
  uploaded), receive investment score, market-value comparison, yields, red flags and a
  Proceed/Negotiate/Investigate/High-Risk recommendation.
- **Keja Token (TRIAL)** — $25,000 virtual wallet, KYC-gated subscriptions, simulated ledger,
  order-matched secondary trading with market impact, distribution accrual on a
  fast-forwardable trial clock, issuer console and the nine-step issuance journey. Fictional
  assets only — no real securities.
- **Investor dashboard** — portfolio value, yields, occupancy, cash flow, financing snapshot,
  allocation charts, token positions and a downloadable HTML investor report.
- **Keja Data** — "Which neighbourhood has the highest yield?" / "Where should I invest
  KSh 20M?" answered live from inventory with sample sizes and sourcing declared.
- **Keja Manage** — units, tenants & screening, rent collection ledger, arrears engine,
  maintenance tickets and transparent rule-based AI alerts.
- **Accounts** — demo sign-in, 12h/30d sliding sessions, RBAC (user/agent/admin).
- **Admin console** — verification queue, listing-report adjudication, partner applications,
  feed health, audit trail, settings.
- **Auto-Pilot** — the AI listing engine (scanner → enrich → dedupe → quality gate → publish)
  on a 6-hour cron; commits grow the marketplace and trigger the gated deploy.
- **Platform** — PWA (installable, offline shell), light/dark themes, EN/SW/FR UI language,
  app-style mobile tab bar, reduced-motion support, WCAG-minded focus management.

## Stack

Next.js 16 (App Router, single-route client SPA with hash deep links) · React 19 · TypeScript
(strict) · Tailwind CSS 4 + shadcn/ui · recharts · local stores (localStorage —
backend-upgradeable) · Capacitor 8 native shells (Android + iOS).

**Architecture note** — the whole platform mounts on the Next.js `/` route and navigates with
hash paths (`#/properties/KJA-001`). That serves identically behind the sandbox preview
gateway, on the Netlify CDN and inside the Capacitor shells, and keeps the app fully
functional offline. The `NEXT_STATIC=1` build emits `out/` for Netlify and `cap sync`.

## Develop

```bash
bun install --frozen-lockfile   # the lockfile is bun.lock (CI installs the same way)
npm run dev            # local dev server
npm run typecheck      # tsc --noEmit (same gate as CI)
npm run lint           # ESLint (same gate as CI)
npm run build:static   # static export → out/ (what Netlify builds)
npm run mobile:sync    # static build + cap sync into android/ + ios/
node scripts/auto-listings/run.mjs   # Auto-Pilot pipeline (zero npm deps)
```

## Deploy

Pushes to `main` run `.github/workflows/deploy-netlify.yml`: typecheck + lint + static
export + service-worker version stamp, then deploy to Netlify via API using the
`NETLIFY_AUTH_TOKEN` / `NETLIFY_SITE_ID` repo secrets. keja.app is the canonical domain.

Auto-Pilot commits (6-hour cron) flow through the same quality gate and trigger the deploy.

## Regulatory readiness — CMA Regulatory Sandbox

- **[Testing Plan (PDF)](docs/cma/Chacadom_CMA_Sandbox_Testing_Plan.pdf)** — twelve-month,
  four-phase live test: participation and exposure caps, suitability screening, segregated
  client money, phase gates, and a rehearsed exit.
- **[Safeguards & Risk-Management Plan (PDF)](docs/cma/Chacadom_CMA_Sandbox_Safeguards_Risk_Management_Plan.pdf)** —
  three-lines governance, twelve-risk register, KYC/AML controls, Kenya DPA compliance,
  incident classes with CMA notification times.

Tokenization runs in trial mode with fictional assets. Digital tokens are clearly
distinguished from legal ownership of underlying real estate; live issuance awaits the full
regulatory pathway.

## Native apps

Android + iOS via Capacitor (`com.chacadom.keja`): app-style bottom tab bar, splash/icons,
`keja://` + `https://keja.app` deep links — see `docs/MOBILE.md`.

```bash
npm run mobile:apk     # debug APK
npm run mobile:android # Android Studio
npm run mobile:ios     # Xcode
```

## Documentation suite

Engineering, business and operations documents — PDF editions in `docs/pdf/`, markdown companions alongside:

| Document | Markdown | PDF |
| --- | --- | --- |
| The Repository Picture (engineering dossier) | `docs/REPO_PICTURE.md` | `docs/pdf/keja-repo-picture.pdf` |
| Marketing playbook | `docs/MARKETING_PLAYBOOK.md` | `docs/pdf/keja-marketing-playbook.pdf` |
| Strategy | `docs/STRATEGY.md` | `docs/pdf/keja-strategy.pdf` |
| Kenya partner proposals (20 targets) | `docs/KENYA_PARTNER_PROPOSALS.md` | `docs/pdf/keja-kenya-partner-proposals.pdf` |
| keja.app domain setup guide | — | `docs/pdf/keja-domain-setup-guide.pdf` |
| keja.app Netlify domain-conflict fix | `docs/DOMAIN_CONFLICT_FIX.md` | `docs/pdf/keja-domain-conflict-fix.pdf` |
| PWA asset regeneration | `node scripts/generate-pwa-assets.mjs` | — |

## The honesty standard

Keja labels every number: **FACT** (verified on-platform evidence), **ESTIMATE**
(model-derived), **ASSUMPTION** (default), **REPORTED** (publicly reported). AI analyses are
decision support and never replace legal, valuation, financial or regulatory advice. Only
auditable metrics are displayed. The claims register is the machine-readable contract between
the product and its promises.

— *Chacadom Investments · Nairobi, Kenya · "Keja" is Swahili for home.*
