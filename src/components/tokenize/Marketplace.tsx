/**
 * Keja Tokenize — marketplace view: hero, live stats, property cards,
 * how-it-works and the issuer console CTA.
 */
import { motion } from 'framer-motion'
import { MapPin, ArrowRight, Coins, CalendarClock, Building2, ShieldCheck, Sparkles, TrendingUp, Link2 } from 'lucide-react'
import { useTokenize } from '@/lib/tokenizeStore'
import type { TokenizedProperty } from '@/data/tokenize'
import { fundedPct, tokensAvailable, yieldPct } from '@/data/tokenize'
import { StatusBadge, TypeIcon, SectionTitle, propertyTypeLabel, fmtNum, fmtUsd, fmtUsdCompact, img } from './shared'

export function Marketplace() {
  const { properties, setView } = useTokenize()

  const totalValue = properties.reduce((s, p) => s + p.totalValueUsd, 0)
  const totalIncome = properties.reduce((s, p) => s + p.annualNetIncomeUsd, 0)
  const avgYield = totalValue > 0 ? (totalIncome / totalValue) * 100 : 0
  const tokensIssued = properties.reduce((s, p) => s + p.totalTokens, 0)

  return (
    <div>
      {/* ───────────────────────────── hero ───────────────────────────── */}
      <section className="relative overflow-hidden bg-cream">
        <div className="absolute inset-x-0 top-0 h-1 bg-gold-gradient" />
        <div className="container-luxe py-14 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 rounded-full border border-gold-200 bg-white px-3.5 py-1.5">
                <Sparkles className="h-3.5 w-3.5 text-gold-600" />
                <span className="text-[11px] font-bold uppercase tracking-wide2 text-gold-700">
                  Keja Tokenize · A Chacadom Investments Product
                </span>
              </div>
              <h1 className="mt-6 font-display text-4xl font-bold leading-[1.08] text-ink sm:text-5xl lg:text-[3.4rem]">
                Own a fraction of <span className="gold-text italic">Nairobi’s finest</span> real estate
              </h1>
              <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-muted sm:text-base">
                From <strong className="text-ink">$100</strong>, buy blockchain-verified tokens in
                institutional-grade Kenyan property and earn your share of rental income — distributed
                monthly or quarterly to your wallet. KYC-gated, Ardhisasa-verified, CMA-sandbox informed.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  className="btn-gold !h-12 !px-7 !text-[15px]"
                  onClick={() => document.getElementById('offerings')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Explore offerings <ArrowRight className="h-4 w-4" />
                </button>
                <button className="btn-outline !h-12 !px-7 !text-[15px]" onClick={() => setView('learn')}>
                  How tokenization works
                </button>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-ink-muted">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-gold-600" /> Title-verified on Ardhisasa
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="h-4 w-4 text-gold-600" /> Income from month one (live assets)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Link2 className="h-4 w-4 text-gold-600" /> On-chain ownership record
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="relative"
            >
              <div className="relative overflow-hidden rounded-2xl border border-gold-200 shadow-gold-lg">
                <img
                  src={img('/images/props/skyline_hero.jpg')}
                  alt="Nairobi skyline — tokenized real estate by Keja.ai"
                  className="h-[300px] w-full object-cover sm:h-[380px] lg:h-[440px]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide2 text-gold-300">Live portfolio</p>
                    <p className="font-display text-xl font-semibold text-white">
                      {fmtUsdCompact(totalValue)} tokenized across {properties.length} assets
                    </p>
                  </div>
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="absolute -bottom-6 -left-3 rounded-xl border border-gold-200 bg-white px-4 py-3 shadow-gold-md sm:-left-6"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-gold-50 p-2">
                    <TrendingUp className="h-5 w-5 text-gold-600" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-ink-muted">Blended net yield</p>
                    <p className="text-lg font-bold leading-none text-ink">{avgYield.toFixed(1)}%</p>
                  </div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65, duration: 0.5 }}
                className="absolute -top-5 -right-2 rounded-xl border border-gold-200 bg-white px-4 py-3 shadow-gold-md sm:-right-5"
              >
                <p className="text-[11px] font-medium text-ink-muted">Tokens issued</p>
                <p className="text-lg font-bold leading-none text-ink">{fmtNum(tokensIssued)}</p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────── offerings ─────────────────────────── */}
      <section id="offerings" className="container-luxe py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionTitle
            eyebrow="Current offerings"
            title="Tokenized properties on the Keja Ledger"
            sub="Every asset sits in its own SPV, is title-verified on Ardhisasa and distributes net rental income to token holders. Pick an offering to see the full investment case."
          />
          <button
            onClick={() => setView('portfolio')}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gold-700 transition hover:gap-2.5"
          >
            View my portfolio <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-10 grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((p, i) => (
            <PropertyCard key={p.id} p={p} index={i} />
          ))}
        </div>
      </section>

      {/* ────────────────────────── how it works ────────────────────────── */}
      <section className="border-y border-gold-100 bg-cream">
        <div className="container-luxe py-16">
          <SectionTitle center eyebrow="How it works" title="From dollars to dividends in three steps" />
          <div className="mt-10 grid gap-6 grid-cols-1 md:grid-cols-3">
            {[
              {
                icon: Building2,
                step: '01',
                title: 'Pick a verified property',
                body: 'Browse institutional-grade Nairobi assets — each independently valued, title-verified on Ardhisasa and held in a dedicated SPV.',
              },
              {
                icon: Coins,
                step: '02',
                title: 'Buy tokens from $100',
                body: 'Complete KYC once, then purchase fractional tokens at a transparent fixed price. Ownership is recorded on the Keja Ledger.',
              },
              {
                icon: CalendarClock,
                step: '03',
                title: 'Earn rental income',
                body: 'Net rent flows to your wallet monthly or quarterly, proportional to your tokens — with statements in your portfolio dashboard.',
              },
            ].map((s) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45 }}
                className="relative rounded-2xl border border-gold-100 bg-white p-6"
              >
                <span className="absolute right-5 top-4 font-display text-4xl font-bold text-gold-100">{s.step}</span>
                <div className="inline-flex rounded-xl bg-gold-50 p-3">
                  <s.icon className="h-5 w-5 text-gold-600" />
                </div>
                <h3 className="mt-4 text-[15px] font-bold text-ink">{s.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── issuer CTA ───────────────────────── */}
      <section className="container-luxe py-16">
        <div className="relative overflow-hidden rounded-3xl bg-ink px-6 py-12 sm:px-12">
          <div className="relative flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-xl">
              <p className="text-[11px] font-bold uppercase tracking-wide2 text-gold-300">For property owners</p>
              <h2 className="mt-3 font-display text-2xl font-semibold leading-tight text-white sm:text-3xl">
                Tokenize your property in six guided steps
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                The Issuer Console walks you through acquisition, SPV structuring, token issuance,
                compliance gating and distribution setup — the full model, operationalized.
              </p>
            </div>
            <button className="btn-gold !h-12 shrink-0 !px-8 !text-[15px]" onClick={() => setView('issuer')}>
              Open Issuer Console <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

/* ───────────────────────────── property card ───────────────────────────── */

function PropertyCard({ p, index }: { p: TokenizedProperty; index: number }) {
  const { openProperty } = useTokenize()
  const available = tokensAvailable(p)
  const funded = fundedPct(p)

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: (index % 3) * 0.08 }}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-gold-100 bg-white shadow-card transition-all hover:-translate-y-1 hover:border-gold-200 hover:shadow-card-hover focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:outline-none"
      role="button"
      tabIndex={0}
      aria-label={`Open ${p.title} offering — ${p.tokenSymbol}`}
      onClick={() => openProperty(p.id)}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          openProperty(p.id)
        }
      }}
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={img(p.imageUrl)}
          alt={p.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-x-3 top-3 flex items-start justify-between">
          <StatusBadge status={p.status} />
          <span className="rounded-full bg-ink/85 px-2.5 py-1 text-[11px] font-bold text-emerald-300 backdrop-blur">
            {yieldPct(p).toFixed(1)}% net yield
          </span>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-gold-600">
          <TypeIcon type={p.propertyType} className="h-3.5 w-3.5" />
          {propertyTypeLabel(p.propertyType)} · {p.tokenSymbol}
        </div>
        <h3 className="mt-2 font-display text-lg font-semibold leading-snug text-ink">{p.title}</h3>
        <p className="mt-1 flex items-center gap-1 text-[13px] text-ink-muted">
          <MapPin className="h-3.5 w-3.5 text-gold-600" />
          {p.location}, {p.city}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-cream p-3 text-center">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-ink-muted">Token</p>
            <p className="text-sm font-bold text-ink">${p.tokenPriceUsd}</p>
          </div>
          <div className="border-x border-gold-100">
            <p className="text-[10px] font-medium uppercase tracking-wide text-ink-muted">Entry</p>
            <p className="text-sm font-bold text-ink">${fmtNum(p.minTokens * p.tokenPriceUsd)}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-ink-muted">Income</p>
            <p className="text-sm font-bold text-emerald-700">
              {p.distributionFreq === 'MONTHLY' ? 'Monthly' : 'Quarterly'}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] font-medium">
            <span className="text-ink-muted">
              {p.status === 'UPCOMING' ? 'Offering opens Q4 2026' : `${funded}% funded`}
            </span>
            <span className="text-ink-muted">
              {p.status === 'UPCOMING' ? `${fmtNum(p.totalTokens)} tokens` : `${fmtNum(available)} left`}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gold-100">
            <div
              className={`h-full rounded-full ${p.status === 'UPCOMING' ? 'bg-gold-300' : 'bg-gold-gradient'}`}
              style={{ width: `${p.status === 'UPCOMING' ? 4 : Math.max(funded, 3)}%` }}
            />
          </div>
        </div>

        <span className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-gold-300 py-2.5 text-[13px] font-semibold text-gold-700 transition-colors group-hover:bg-gold-gradient group-hover:text-white group-hover:ring-0">
          {p.status === 'UPCOMING' ? 'Join the waitlist' : p.status === 'LIVE' ? 'View live offering' : 'View offering'}
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </motion.article>
  )
}
