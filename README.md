# Keja.ai — Intelligent Real Estate. Verified Trust.

> Kenya's AI real-estate advisor and cross-agency trust layer — a **Chacadom Investments** venture.

**"Keja" is Swahili for home.** Keja.ai helps people discover, evaluate, buy, sell, rent and manage property across multiple agencies and developers — not just one. We don't just list property; we tell you which listings you can trust.

## ✨ Features

| Area | What's included |
|------|-----------------|
| **AI Assistant (Keja)** | Conversational property search, investment math, trust answers, lead qualification — in **English, Kiswahili & Français**, with facts / estimates / assumptions explicitly labelled |
| **Marketplace** | 20 verified listings across 5 partner agencies; filters (type, area, budget, bedrooms, purpose, verified-only), sorting, search |
| **Trust Layer** | Trust scores (0–100) with 5-pillar verification: Ardhisasa title checks, photo authenticity, duplicate detection, pricing anomaly detection, agent reputation. Flagged listings shown transparently with fraud signals |
| **Investment Calculator** | Gross & net yield, payback, 5/10-year projections with charts; real-listing presets; KES/USD diaspora mode |
| **Property Pages** | Gallery, verification report, investment snapshot, mortgage estimator (deposit slider), area insights, viewing requests with M-Pesa escrow notes |
| **Dashboard** | HOT/WARM/COLD lead pipeline, inventory stats, verification queue, rental performance charts, agency network |
| **Services** | Sell with Keja (verification-first listing flow), Property Management (tenants, M-Pesa rent collection, owner statements) |
| **Extras** | Favorites (localStorage), WhatsApp touchpoints, market insights, responsive white & gold luxury design |

## 🧱 Tech Stack

- **React 18 + TypeScript + Vite** — fast, static, deploys anywhere
- **Tailwind CSS 3** — white & gold design system (`gold` palette, Playfair Display + Inter)
- **React Router 6** — SPA routing with Netlify redirects
- **Recharts** — investment projections & dashboard charts (lazy-loaded)
- **Framer Motion + Lucide** — animations & icons
- **Keja AI engine** (`src/lib/ai/engine.ts`) — intent detection, property matching, finance math, multilingual responses. Client-side by design (Phase 1 MVP); upgrade path to a server LLM is a drop-in swap of the `respond()` call.

## 🚀 Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm run preview    # serve the production build
```

## 🌍 Deploy to Netlify

This repo is Netlify-ready (`netlify.toml` + `_redirects` included):

1. Push this repo to GitHub.
2. In Netlify: **Add new site → Import an existing project → GitHub → select this repo**.
3. Build command `npm run build`, publish directory `dist` (auto-detected from `netlify.toml`).
4. Add your custom domain `keja.ai` in **Site settings → Domain management**.

No environment variables are required for the MVP.

## 📁 Project structure

```
src/
├── config/          # site settings (WhatsApp number, contact info)
├── data/
│   └── properties.ts   # 20-listing database + agencies + area insights
├── lib/
│   ├── ai/engine.ts    # Keja AI conversational engine
│   ├── finance.ts      # investment & mortgage mathematics
│   ├── store.ts        # localStorage state (favorites, leads, chat)
│   └── format.ts       # KES formatting, trust tiers
├── components/       # layout, property cards, chat window, markdown
└── pages/            # Home, Properties, PropertyDetail, AskKeja,
                      # InvestmentCalculator, TrustCenter, Dashboard,
                      # About, Contact, Insights, ListProperty, Manage
```

## 🔧 Configuration

- **WhatsApp number & contact details** → `src/config/index.ts`
- **Listings & agencies** → `src/data/properties.ts`
- **AI knowledge & responses** → `src/lib/ai/engine.ts`

## 🗺️ Roadmap alignment

This implements the **Phase 1 MVP** from the Keja.ai roadmap: AI assistant, property database, conversational search, ROI calculator, client qualification, lead capture, viewing-request flow. Phase 2 (cross-agency trust data pipelines, Ardhisasa API integration) and Phase 3 (M-Pesa escrow, property management operations, WhatsApp Business API) build on this foundation.

---

© Chacadom Investments. *We don't just list property. We tell you which listings you can trust.*
