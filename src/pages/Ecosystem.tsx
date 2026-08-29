/**
 * Ecosystem — the KEJA product family (blueprint Ch.5): eight products built
 * around one intelligence layer, plus the platform hierarchy, data flywheel
 * and end-to-end property journey (Ch.6–8).
 */
import { Link } from 'react-router-dom'
import {
  Home,
  TrendingUp,
  Briefcase,
  Building,
  Database,
  Search,
  Sparkles,
  Coins,
  ArrowRight,
  RefreshCw,
  Layers,
  Globe2,
} from 'lucide-react'

const PRODUCTS = [
  {
    icon: Home,
    name: 'KEJA HOME',
    user: 'Buyers & renters',
    role: 'Property discovery, search, comparisons and guided decision-making.',
    status: 'Live',
    to: '/properties',
  },
  {
    icon: TrendingUp,
    name: 'KEJA INVEST',
    user: 'Investors',
    role: 'Investment analysis, scoring, reports, portfolio intelligence and opportunity discovery.',
    status: 'Live',
    to: '/invest',
  },
  {
    icon: Briefcase,
    name: 'KEJA PRO',
    user: 'Agents & developers',
    role: 'Lead qualification, CRM, listings, marketing, analytics and follow-up tools.',
    status: 'Live',
    to: '/dashboard',
  },
  {
    icon: Building,
    name: 'KEJA MANAGE',
    user: 'Landlords & managers',
    role: 'Tenant communication, maintenance, rental analytics, occupancy and reporting.',
    status: 'Live',
    to: '/manage',
  },
  {
    icon: Database,
    name: 'KEJA DATA',
    user: 'Institutions & enterprise',
    role: 'Market intelligence, pricing, rental analytics, location intelligence and APIs.',
    status: 'Enterprise preview',
    to: '/contact',
  },
  {
    icon: Search,
    name: 'KEJA SEARCH',
    user: 'All users',
    role: 'Natural-language property discovery connected to live, structured inventory.',
    status: 'Live',
    to: '/ask',
  },
  {
    icon: Sparkles,
    name: 'KEJA AI ADVISOR',
    user: 'All users',
    role: 'Conversational intelligence across discovery, analysis and property decisions.',
    status: 'Live',
    to: '/ask',
  },
  {
    icon: Coins,
    name: 'KEJA TOKEN',
    user: 'Eligible investors',
    role: 'Long-term, regulated tokenization and digital investment infrastructure.',
    status: 'Demo (simulated)',
    to: '/tokenize',
  },
]

const HIERARCHY = [
  { n: '01', t: 'Property', d: 'The real-world asset — structured, verified, investable.' },
  { n: '02', t: 'Data', d: 'The structured information layer — prices, rents, comparables, provenance.' },
  { n: '03', t: 'AI', d: 'The interpretation and automation layer — intelligence on demand.' },
  { n: '04', t: 'Investment Intelligence', d: 'The decision layer — scores, scenarios, verdicts.' },
  { n: '05', t: 'Marketplace', d: 'The transaction and professional network.' },
  { n: '06', t: 'Tokenization', d: 'The digital representation layer for eligible interests.' },
  { n: '07', t: 'Financial Ecosystem', d: 'Payments, financing, custody — where regulation permits.' },
]

const JOURNEY = [
  'Discover', 'Compare', 'Analyse', 'Verify', 'Finance', 'Transact',
  'Furnish', 'Manage', 'Monitor', 'Optimise', 'Exit',
]

export default function Ecosystem() {
  return (
    <div className="container-luxe py-14">
      {/* hero */}
      <div className="mx-auto max-w-3xl text-center">
        <p className="eyebrow">The KEJA Ecosystem</p>
        <h1 className="heading-display mt-2 text-4xl sm:text-5xl">
          A family of products built around{' '}
          <span className="gold-text">one intelligence layer</span>
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-muted">
          KEJA is not a collection of disconnected features — every layer strengthens the next.
          Data feeds intelligence; intelligence improves discovery; discovery feeds transactions;
          transactions generate more data; and the flywheel compounds with every participant.
        </p>
      </div>

      {/* product grid */}
      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PRODUCTS.map((p) => (
          <Link
            key={p.name}
            to={p.to}
            className="card-luxe card-luxe-hover group flex flex-col p-6"
          >
            <div className="flex items-start justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-gradient shadow-gold-sm">
                <p.icon className="h-6 w-6 text-white" strokeWidth={2} />
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  p.status === 'Live'
                    ? 'bg-green-100 text-green-700'
                    : p.status === 'Demo (simulated)'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-sky-100 text-sky-700'
                }`}
              >
                {p.status}
              </span>
            </div>
            <h3 className="font-display mt-4 text-lg font-bold text-ink">{p.name}</h3>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gold-700">
              {p.user}
            </p>
            <p className="mt-2 flex-1 text-xs leading-relaxed text-ink-muted">{p.role}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-gold-700 opacity-0 transition group-hover:opacity-100">
              Open <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        ))}
      </div>

      {/* platform hierarchy */}
      <section className="mt-20">
        <div className="flex items-center gap-3">
          <Layers className="h-6 w-6 text-gold-600" />
          <h2 className="heading-display text-2xl sm:text-3xl">The platform hierarchy</h2>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
          Seven layers, one connected system — from the physical asset to the financial ecosystem.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HIERARCHY.map((h, i) => (
            <div
              key={h.n}
              className={`relative card-luxe p-5 ${i === 3 ? 'ring-2 ring-gold-300' : ''}`}
            >
              <p className="font-display text-2xl font-bold text-gold-300">{h.n}</p>
              <h3 className="font-display text-base font-bold text-ink">{h.t}</h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">{h.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* flywheel */}
      <section className="mt-20 overflow-hidden rounded-3xl bg-ink px-6 py-12 text-white sm:px-12">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-center">
          <div className="lg:w-2/5">
            <p className="eyebrow !text-gold-300">The KEJA flywheel</p>
            <h2 className="font-display mt-2 text-2xl font-bold sm:text-3xl">
              Every additional participant strengthens the network
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              More properties create more data. More data produces better AI. Better AI improves
              investment decisions. Better decisions attract more users. More users create more
              transactions — and the cycle returns to more data. The objective is not merely an
              application, but a self-reinforcing intelligence network for African real estate.
            </p>
            <Link to="/tokenize" className="btn-gold mt-6 !py-2.5 !text-xs">
              See it in Keja Tokenize <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="lg:w-3/5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                'More properties',
                'More data',
                'Better AI',
                'Better decisions',
                'More users',
                'More transactions',
                'More investors',
                'More opportunities',
                'More developers',
              ].map((step, i) => (
                <div
                  key={step}
                  className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-4 py-3.5 ring-1 ring-white/10"
                >
                  <span className="text-xs font-semibold text-white/90">{step}</span>
                  <RefreshCw className="h-3.5 w-3.5 shrink-0 text-gold-400" />
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-[11px] font-semibold uppercase tracking-wider text-gold-300">
              …the cycle returns to more properties
            </p>
          </div>
        </div>
      </section>

      {/* journey */}
      <section className="mt-20">
        <div className="flex items-center gap-3">
          <Globe2 className="h-6 w-6 text-gold-600" />
          <h2 className="heading-display text-2xl sm:text-3xl">The full property journey</h2>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
          KEJA accompanies the user beyond the search — through analysis, verification, financing,
          transaction, furnishing, management and eventually exit.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-2">
          {JOURNEY.map((j, i) => (
            <div key={j} className="flex items-center gap-2">
              <span
                className={`rounded-xl px-4 py-2.5 text-xs font-semibold ring-1 ${
                  i < 4
                    ? 'bg-gold-gradient text-white ring-transparent shadow-gold-sm'
                    : 'bg-gold-50 text-gold-800 ring-gold-200'
                }`}
              >
                {j}
              </span>
              {i < JOURNEY.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-gold-400" />}
            </div>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { t: 'Intelligence first', d: 'Build the intelligence layer and prove customer value before marketplace scale — the deliberate sequence of the KEJA blueprint.' },
            { t: 'Trust by design', d: 'Duplicate detection, anomaly flags, agent verification and document completeness checks on every listing.' },
            { t: 'Compliance-aware', d: 'Classification first, licensing second, issuance third — tokenization only when legally, economically and operationally defensible.' },
          ].map((c) => (
            <div key={c.t} className="card-luxe p-5">
              <h3 className="font-display text-base font-bold text-ink">{c.t}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{c.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
