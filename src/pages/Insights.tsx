import { motion } from 'framer-motion';
import {
  ArrowRight,
  Coins,
  Landmark,
  Lightbulb,
  MapPinned,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { ARTICLES } from '@/data/articles';
import { usePageMeta } from '@/lib/seo';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6 },
};

export default function Insights() {
  usePageMeta(
    'Insights — Guides & Market Notes',
    'Practical guides for Kenyan property: buying processes, costs, mortgages, diaspora investing and area spotlights.'
  );
  return (
    <div>
      <section className="bg-ink py-20 sm:py-24">
        <div className="container-luxe max-w-3xl text-center">
          <p className="eyebrow !text-gold-400">Market insights</p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
            Smart investments build <span className="gold-text">lasting wealth</span>
          </h1>
          <p className="mt-6 leading-relaxed text-white/65">
            The right property. The right location. The right strategy. Keja’s market desk distils
            what matters for Kenyan buyers and investors — no hype, no fear-selling, just durable
            principles.
          </p>
        </div>
      </section>

      {/* core principles */}
      <section className="section-pad bg-white">
        <div className="container-luxe">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">The three pillars</p>
            <h2 className="heading-display mt-3 text-3xl sm:text-4xl">Real estate rewards</h2>
            <p className="mt-4 italic text-ink-muted">
              &ldquo;The people who wait for a place to become expensive usually fund the profits of
              those who entered early.&rdquo;
            </p>
          </motion.div>
          <div className="mt-12 grid gap-6 grid-cols-1 md:grid-cols-3">
            {[
              {
                title: 'Patience',
                text: 'Great opportunities belong to those who wait wisely. Property is a five-to-ten-year instrument, not a lottery ticket — the compounding happens in the years you hold, not the month you buy.',
              },
              {
                title: 'Positioning',
                text: 'The right location today creates tomorrow’s value. Infrastructure drives value faster than hype: bypasses, expressways, industrial parks, SEZs, airports, universities and tourism zones.',
              },
              {
                title: 'Timing',
                text: 'Enter early, stay ahead, and let time build your wealth. Growth corridors sell at entry prices only once — the goal is to buy the corridor before the ribbon-cutting, not after.',
              },
            ].map((p, i) => (
              <motion.div
                key={p.title}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.08 }}
                className="card-luxe p-7 text-center"
              >
                <p className="font-display text-4xl font-bold text-gold-300">0{i + 1}</p>
                <h3 className="mt-3 font-display text-2xl font-semibold text-ink">{p.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">{p.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* advice for clients & investors */}
      <section className="section-pad bg-cream">
        <div className="container-luxe">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Key advice for clients & investors</p>
            <h2 className="heading-display mt-3 text-3xl sm:text-4xl">
              Six rules from the Keja desk
            </h2>
          </motion.div>
          <div className="mt-12 grid gap-5 grid-cols-1 md:grid-cols-2">
            {[
              {
                icon: MapPinned,
                title: 'Location drives value',
                text: 'Invest in areas with growing population, infrastructure, and strong demand. Infrastructure drives value faster than hype — a road, a mall, or a university does more for your plot’s price than any marketing.',
              },
              {
                icon: Coins,
                title: 'Land is powerful, but cash flow is king',
                text: 'Land appreciates over time. Rental property gives you monthly income. Balance both for long-term financial freedom — land builds the balance sheet; rentals pay the bills while it grows.',
              },
              {
                icon: TrendingUp,
                title: 'Focus on growth corridors',
                text: 'Look for areas near bypasses, expressways, industrial parks, SEZs, airports, universities, and tourism zones. Today’s satellite town is tomorrow’s suburb — Kitengela and Syokimau wrote that playbook.',
              },
              {
                icon: Lightbulb,
                title: 'Buy based on demand, not emotions',
                text: 'Ask: who will buy or rent this, and what problem does it solve? High-demand areas always retain stronger value. The unit you love matters less than the unit the next ten tenants will love.',
              },
              {
                icon: Landmark,
                title: 'Documentation is everything',
                text: 'No clean title, no deal. Official searches, encumbrance checks, beacon walks, rates clearance — boring paperwork is what separates an asset from a courtroom. Keja automates the first pass; your advocate finishes it.',
              },
              {
                icon: ShieldCheck,
                title: 'Trust must be verifiable',
                text: 'If a platform cannot show you why a listing is trustworthy, treat it as unverified. Trust scores, published fraud flags, escrowed deposits — verification is a feature, not a slogan.',
              },
            ].map((c, i) => (
              <motion.div
                key={c.title}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.05 }}
                className="card-luxe card-luxe-hover flex gap-5 p-6"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold-gradient shadow-gold-sm">
                  <c.icon className="h-6 w-6 text-white" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink">{c.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{c.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-16">
        <div className="container-luxe text-center">
          <motion.div {...fadeUp}>
            <h2 className="font-display text-2xl font-bold text-white sm:text-4xl">
              Want these principles applied to <span className="gold-text">your</span> next
              property?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/60">
              Ask Keja for a personalised investor report: property & location analysis, yield, ROI,
              5/10-year projections, risks, strengths and a plain-language verdict — built on
              verified inventory.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/ask" className="btn-gold">
                Get my investor report <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/invest"
                className="inline-flex items-center gap-2 border border-gold-400/50 px-6 py-3 text-sm font-semibold text-gold-300 transition hover:bg-gold-400/10"
              >
                Open the calculator
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* long-form guides */}
      <section className="section-pad bg-cream">
        <div className="container-luxe">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">The Keja guidebook</p>
            <h2 className="heading-display mt-3 text-3xl sm:text-4xl">
              Long-form, worth your time
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">
              The market desk writes the guides we wish someone had written for us — complete,
              current and honest about what is a fact, an estimate, or an assumption.
            </p>
          </motion.div>
          <div className="mt-12 grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {ARTICLES.map((a, i) => (
              <motion.div
                key={a.slug}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: (i % 3) * 0.07 }}
              >
                <Link
                  to={`/insights/${a.slug}`}
                  className="card-luxe card-luxe-hover flex h-full flex-col p-6"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide2 text-gold-700">
                    {a.category}
                  </p>
                  <h3 className="mt-2 font-display text-lg font-bold leading-snug text-ink">
                    {a.title}
                  </h3>
                  <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-ink-muted">
                    {a.excerpt}
                  </p>
                  <p className="mt-auto pt-4 text-xs font-semibold text-ink-muted">
                    {a.minutes} min read ·{' '}
                    {new Date(a.date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}{' '}
                    <span className="text-gold-700">· Read →</span>
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
