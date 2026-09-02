import { m } from 'framer-motion';
import {
  AlertTriangle,
  BadgeCheck,
  Bot,
  Building2,
  Calculator,
  CalendarClock,
  ChevronRight,
  Coins,
  FileSearch,
  LayoutDashboard,
  Link2,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import PropertyCard from '@/components/property/PropertyCard';
import { whatsappLink } from '@/config';
import { asset } from '@/config';
import { WATERFRONT_KAREN } from '@/data/neighborhoods';
import { featuredProperties } from '@/data/properties';
import { autoPilotStats } from '@/lib/autoListings';
import { formatKES } from '@/lib/format';
import { useAllProperties } from '@/lib/inventory';
import { ROLES, useRole } from '@/lib/roleStore';
import { usePageMeta } from '@/lib/seo';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6 },
};

export default function Home() {
  const role = useRole();
  const roleMeta = ROLES.find((r) => r.value === role);
  usePageMeta(
    'Keja.ai — Intelligent Real Estate. Verified Trust.',
    "Kenya's AI real-estate advisor: verified listings, trust scores, investment intelligence and tokenized fractional ownership."
  );
  const navigate = useNavigate();
  // Unified inventory (auto + approved partner submissions + seed) so Home
  // stats always match what the Properties marketplace actually shows.
  const MARKET = useAllProperties();
  const avgTrust = Math.round(MARKET.reduce((s, p) => s + p.trustScore, 0) / MARKET.length);
  const verifiedCount = MARKET.filter((p) => p.trustScore >= 75).length;
  const flaggedCount = MARKET.filter((p) => p.trustScore < 60).length;
  const karenCount = MARKET.filter((p) => p.area === WATERFRONT_KAREN.area).length;
  const freshThisWeek = [...MARKET]
    .sort((a, b) => b.listedAt.localeCompare(a.listedAt))
    .filter((p) => Date.now() - +new Date(p.listedAt) < 7 * 24 * 3600 * 1000)
    .slice(0, 3);

  return (
    <div>
      {/* ============================== HERO ============================== */}
      <section className="relative overflow-hidden bg-ink">
        <div className="absolute inset-0">
          <picture>
            <source srcSet={asset('/images/props/skyline_hero.webp')} type="image/webp" />
            <img
              src={asset('/images/props/skyline_hero.jpg')}
              alt="Nairobi skyline"
              width={1600}
              height={1000}
              fetchPriority="high"
              className="h-full w-full object-cover opacity-40"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-b from-ink/80 via-ink/60 to-ink" />
        </div>

        <div className="container-luxe relative flex flex-col items-center py-24 text-center sm:py-32">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide2 text-gold-300 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              AI Real Estate · by Chacadom Investments
            </span>
          </m.div>

          <m.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12 }}
            className="mt-6 max-w-4xl font-display text-4xl font-bold leading-[1.1] text-white sm:text-6xl"
          >
            Find home. <span className="gold-text">Verified.</span>
            <span className="mt-3 block text-xl font-medium text-white/70 sm:text-2xl">
              Intelligent Real Estate. Smarter Investments.
            </span>
          </m.h1>

          <m.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24 }}
            className="mt-6 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg"
          >
            Keja.ai is Kenya’s AI property advisor and cross-agency trust layer. We don’t just list
            property — we tell you which listings you can trust, with verified titles, transparent
            yields and honest investment math.
          </m.p>

          {/* role-aware strip — the first session gets one job, not eleven */}
          {role && roleMeta ? (
            <m.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-7 flex flex-wrap items-center justify-center gap-3"
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-gold-400/15 px-4 py-2 text-sm font-semibold text-gold-200 ring-1 ring-gold-400/40">
                <span aria-hidden>{roleMeta.emoji}</span>
                Tailored for you: {roleMeta.label.toLowerCase()}
              </span>
              <Link
                to={roleMeta.to}
                className="rounded-full bg-white px-4 py-2 text-sm font-bold text-ink transition hover:bg-gold-100"
              >
                {roleMeta.cta} →
              </Link>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('keja-open-role-gate'))}
                className="text-xs font-semibold text-white/60 underline decoration-white/30 underline-offset-4 transition hover:text-gold-300"
              >
                change
              </button>
            </m.div>
          ) : null}

          {/* Search bar */}
          <m.form
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.36 }}
            className="mt-10 w-full max-w-3xl"
            onSubmit={(e) => {
              e.preventDefault();
              const q = new FormData(e.currentTarget).get('q') as string;
              void navigate(`/properties?q=${encodeURIComponent(q || '')}`);
            }}
          >
            <div className="flex items-center gap-2 rounded-2xl bg-white p-2 shadow-gold-lg">
              <div className="flex flex-1 items-center gap-2.5 pl-3">
                <MapPin className="h-5 w-5 shrink-0 text-gold-600" />
                <input
                  name="q"
                  placeholder="Search area — Kilimani, Westlands, Kitengela, Nyali..."
                  className="w-full bg-transparent py-2.5 text-sm text-ink placeholder-ink-faint focus:outline-none"
                />
              </div>
              <button type="submit" className="btn-gold !rounded-xl !px-6">
                <Search className="h-4 w-4" /> Search
              </button>
            </div>
          </m.form>

          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-white/60"
          >
            <span>Popular:</span>
            {['Kilimani', 'Westlands', 'Karen', 'Kitengela land', 'Nyali'].map((a) => (
              <Link
                key={a}
                to={`/properties?q=${encodeURIComponent(a)}`}
                className="rounded-full border border-white/20 px-3 py-1 transition hover:border-gold-400 hover:text-gold-300"
              >
                {a}
              </Link>
            ))}
          </m.div>

          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-3"
          >
            <Link to="/ask" className="btn-gold">
              <Bot className="h-4 w-4" /> Ask Keja AI
            </Link>
            <Link
              to="/tokenize"
              className="inline-flex items-center gap-2 border border-gold-400/50 px-6 py-3 text-sm font-semibold tracking-wide text-gold-300 transition hover:bg-gold-400/10"
            >
              <Coins className="h-4 w-4" /> Tokenize — explore the demo
            </Link>
            <Link
              to="/trust"
              className="inline-flex items-center gap-2 border border-gold-400/50 px-6 py-3 text-sm font-semibold tracking-wide text-gold-300 transition hover:bg-gold-400/10"
            >
              <ShieldCheck className="h-4 w-4" /> How we verify
            </Link>
          </m.div>
        </div>
      </section>

      {/* ============================== STATS ============================== */}
      <section className="border-b border-gold-100 bg-white">
        <div className="container-luxe grid grid-cols-2 gap-6 py-10 sm:grid-cols-4">
          {[
            { icon: Building2, value: `${verifiedCount}`, label: 'Verified listings' },
            { icon: BadgeCheck, value: `${verifiedCount}`, label: 'Trust-scored properties' },
            { icon: AlertTriangle, value: `${flaggedCount}`, label: 'Fraud flags caught' },
            { icon: ShieldCheck, value: `${avgTrust}/100`, label: 'Avg. trust score' },
          ].map((s) => (
            <m.div key={s.label} {...fadeUp} className="flex flex-col items-center text-center">
              <s.icon className="h-5 w-5 text-gold-600" />
              <p className="mt-2 font-display text-3xl font-bold text-ink">{s.value}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-ink-muted">
                {s.label}
              </p>
            </m.div>
          ))}
        </div>
      </section>

      {/* ============================== WATERFRONT KAREN SPOTLIGHT ============================== */}
      <section className="relative overflow-hidden bg-ink">
        <div className="absolute inset-0 bg-gold-shimmer opacity-[0.05]" aria-hidden="true" />
        <div className="container-luxe relative grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-2">
          <m.div {...fadeUp}>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide2 text-gold-300 backdrop-blur">
              <MapPin className="h-3.5 w-3.5" /> Flagship location spotlight
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
              The Waterfront Karen — <span className="gold-text">lifestyle with weight</span>
            </h2>
            <p className="mt-5 leading-relaxed text-white/70">
              A world-class lakeside town centre in Nairobi&rsquo;s premier suburb: Naivas-anchored
              shopping, the Maji Magic aqua park, dining, health and banking — minutes from
              half-acre Karen gardens. And with a reported KES 9B institutional transaction plus a
              50.6-acre expansion plan, the corridor around it is the one Nairobi investors are
              watching.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {[
                'Naivas anchor',
                'Maji Magic Aqua Park',
                'Dining & cafés',
                'Health & fitness',
                'Lakeside walks',
                'Pet-friendly',
              ].map((chip) => (
                <li
                  key={chip}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/75"
                >
                  {chip}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/areas/waterfront-karen" className="btn-gold">
                Explore the Waterfront guide <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                to={`/properties?area=${encodeURIComponent(WATERFRONT_KAREN.area)}`}
                className="btn-outline"
              >
                Karen listings
                {karenCount > 0 && ` (${karenCount})`}
              </Link>
            </div>
          </m.div>

          <m.div {...fadeUp} className="relative">
            <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-gold-500/10 blur-2xl" />
            <div className="overflow-hidden rounded-3xl shadow-card-hover ring-1 ring-gold-300/30">
              <picture>
                <source srcSet={asset('/images/waterfront/wf-entrance.webp')} type="image/webp" />
                <img
                  src={asset('/images/waterfront/wf-entrance.jpg')}
                  alt="The Waterfront Karen — main entrance with the centre’s signature blue signage"
                  width={1200}
                  height={665}
                  loading="lazy"
                  className="h-[340px] w-full object-cover sm:h-[380px]"
                />
              </picture>
              <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
            </div>
            <div className="absolute -bottom-6 -left-2 hidden w-52 overflow-hidden rounded-2xl shadow-card-hover ring-1 ring-gold-200 sm:block lg:-left-6">
              <img
                src={asset('/images/waterfront/wf-sunset-lake.jpg')}
                alt="Maji Magic Aqua Park on the lake at The Waterfront Karen, at dusk"
                width={1200}
                height={675}
                loading="lazy"
                className="h-32 w-full object-cover"
              />
            </div>
            <div className="absolute -top-5 right-2 rounded-2xl bg-white p-4 shadow-card-hover ring-1 ring-gold-100 sm:right-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">
                Reported 2026
              </p>
              <p className="font-display text-xl font-bold text-ink">KES 9B</p>
              <p className="text-[11px] leading-tight text-ink-muted">
                incl. 50.6-acre expansion site
              </p>
            </div>
          </m.div>
        </div>
      </section>

      {/* ============================== KEJA AI SECTION ============================== */}
      <section className="section-pad bg-cream">
        <div className="container-luxe grid items-center gap-12 lg:grid-cols-2">
          <m.div {...fadeUp}>
            <p className="eyebrow">Meet Keja — your AI advisor</p>
            <h2 className="heading-display mt-3 text-3xl sm:text-4xl">
              Conversational property search, <span className="gold-text">done right</span>
            </h2>
            <p className="mt-5 leading-relaxed text-ink-soft">
              Chat with Keja in English, Kiswahili or French. Ask anything — &ldquo;2BR in Kilimani
              under 15M&rdquo;, &ldquo;is Kitengela a good investment?&rdquo;, &ldquo;how do you
              verify titles?&rdquo; — and get answers grounded in verified inventory, with every
              number labelled as fact, estimate or assumption.
            </p>
            <ul className="mt-6 space-y-3.5">
              {[
                {
                  icon: Search,
                  text: 'Conversational search across multiple agencies — neutral, not one developer’s stock',
                },
                {
                  icon: Calculator,
                  text: 'Live investment math: yields, ROI, payback, 5 & 10-year projections',
                },
                {
                  icon: ShieldCheck,
                  text: 'Trust answers you can check — Ardhisasa title logic, fraud red flags',
                },
                {
                  icon: Zap,
                  text: 'Lead qualification that routes you to the right agent — only when you’re ready',
                },
              ].map((f) => (
                <li key={f.text} className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold-100">
                    <f.icon className="h-4 w-4 text-gold-700" />
                  </span>
                  <span className="text-sm leading-relaxed text-ink-soft">{f.text}</span>
                </li>
              ))}
            </ul>
            <Link to="/ask" className="btn-gold mt-8">
              Start chatting <ChevronRight className="h-4 w-4" />
            </Link>
          </m.div>

          <m.div {...fadeUp} className="relative">
            <div className="absolute -inset-4 sm:-inset-6 -z-10 rounded-[2.5rem] bg-gold-100/40 blur-2xl" />
            <div className="overflow-hidden rounded-3xl shadow-card-hover ring-1 ring-gold-200">
              <picture>
                <source srcSet={asset('/brand/keja-banner.webp')} type="image/webp" />
                <img
                  src={asset('/brand/keja-banner-opt.jpg')}
                  alt="Keja AI assistant"
                  loading="lazy"
                  className="w-full object-cover"
                />
              </picture>
            </div>
            <div className="absolute -bottom-5 -left-3 rounded-2xl bg-white p-4 shadow-card-hover ring-1 ring-gold-100 sm:-left-8">
              <div className="flex items-center gap-3">
                <img
                  src={asset('/brand/keja-mascot.jpg')}
                  alt="Keja mascot"
                  className="h-12 w-12 rounded-xl object-cover ring-2 ring-gold-200"
                />
                <div>
                  <p className="text-sm font-bold text-ink">&ldquo;Hi, I’m Keja.&rdquo;</p>
                  <p className="text-xs text-ink-muted">
                    Here to help you discover, analyse and invest smarter.
                  </p>
                </div>
              </div>
            </div>
          </m.div>
        </div>
      </section>

      {/* ============================== TRUST LAYER ============================== */}
      <section className="section-pad bg-ink">
        <div className="container-luxe">
          <m.div {...fadeUp} className="mx-auto max-w-3xl text-center">
            <p className="eyebrow !text-gold-400">The Keja Trust Layer</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">
              We don’t just list property.
              <span className="gold-text block">We tell you which listings you can trust.</span>
            </h2>
            <p className="mt-5 leading-relaxed text-white/60">
              A tool owned by one agency can never tell you a listing looks suspicious. Keja sits
              above multiple agencies — so trust-scoring is structurally possible, and structurally
              defensible.
            </p>
          </m.div>

          <div className="mt-14 grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: FileSearch,
                title: 'Ardhisasa title cross-check',
                text: 'Every listing’s title is checked against official land records — encumbrances, caveats and ownership history.',
              },
              {
                icon: BadgeCheck,
                title: 'Photo & duplicate scan',
                text: 'Reverse-image matching catches recycled photos and the same unit listed five times — classic scam patterns.',
              },
              {
                icon: TrendingUp,
                title: 'Pricing anomaly detection',
                text: 'A 34%-below-market &ldquo;urgent sale&rdquo; isn’t a bargain — it’s a bait. Our models flag price anomalies instantly.',
              },
              {
                icon: ShieldCheck,
                title: 'Agent reputation scoring',
                text: 'Phone-number history, complaint patterns and prior listing behaviour build a reputation score for every agent.',
              },
            ].map((c, i) => (
              <m.div
                key={c.title}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.08 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-gold-400/40 hover:bg-white/[0.08]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-gradient shadow-gold-sm">
                  <c.icon className="h-5 w-5 text-white" />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold text-white">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{c.text}</p>
              </m.div>
            ))}
          </div>

          <m.div {...fadeUp} className="mt-10 text-center">
            <Link
              to="/trust"
              className="inline-flex items-center gap-2 text-sm font-semibold text-gold-300 hover:text-gold-200"
            >
              Explore the Trust Center <ChevronRight className="h-4 w-4" />
            </Link>
          </m.div>
        </div>
      </section>

      {/* ============================== NEW THIS WEEK (AUTO-PILOT) ============================== */}
      {freshThisWeek.length > 0 && (
        <section className="section-pad !pt-12 !pb-4 bg-white">
          <div className="container-luxe">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  New this week — ingested by Keja Auto-Pilot
                </p>
                <h2 className="heading-display mt-3 text-3xl sm:text-4xl">Fresh on the market</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
                  Our AI pipeline scans the market and our partner feeds (JSON · CSV · XML) every
                  few hours — new postings are enriched, screened for duplicates and price
                  anomalies, and published here automatically. Auto-ingested listings are always
                  labelled and trust-capped until human verification.
                </p>
              </div>
              <Link to="/properties?sort=recent" className="btn-outline">
                See all fresh listings <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-8 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {freshThisWeek.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
            <p className="mt-4 text-[11px] text-ink-faint">
              Pipeline stats: {autoPilotStats().liveListings} auto-listings live ·{' '}
              {autoPilotStats().totalRuns} runs logged · {autoPilotStats().feedHealth} · quality avg{' '}
              {autoPilotStats().avgQuality}/100
            </p>
          </div>
        </section>
      )}

      {/* ============================== FEATURED ============================== */}
      <section className="section-pad bg-white">
        <div className="container-luxe">
          <m.div {...fadeUp} className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Featured — trust score 90+</p>
              <h2 className="heading-display mt-3 text-3xl sm:text-4xl">
                Top-verified properties this week
              </h2>
            </div>
            <Link to="/properties" className="btn-outline">
              Browse all {MARKET.length} listings <ChevronRight className="h-4 w-4" />
            </Link>
          </m.div>

          <div className="mt-10 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {featuredProperties.slice(0, 6).map((p, i) => (
              <m.div key={p.id} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.06 }}>
                <PropertyCard property={p} />
              </m.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================== TOKENIZE SECTION ============================== */}
      <section className="section-pad bg-cream">
        <div className="container-luxe grid items-center gap-12 lg:grid-cols-2">
          <m.div {...fadeUp}>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-300 bg-white px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide2 text-gold-700">
              <Sparkles className="h-3.5 w-3.5" /> New — Keja Tokenize
            </span>
            <h2 className="heading-display mt-4 text-3xl sm:text-4xl">
              Own a fraction of Nairobi’s <span className="gold-text">finest</span> real estate
            </h2>
            <p className="mt-5 leading-relaxed text-ink-soft">
              Keja Tokenize demonstrates how institutional-grade property could convert into digital
              tokens — a $10M tower becoming 1,000,000 tokens at $10 each. It is an education-first
              walkthrough: explore simulated offerings, run the economics, and learn how SPV
              structures, title verification and KYC/AML would work in a compliant production build.
            </p>
            <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800 ring-1 ring-amber-200">
              <b>Simulation notice:</b> tokens, yields and distributions on Keja Tokenize are
              simulated. Nothing here is an offer of securities, no money is accepted, and a token
              is not a land title. See the{' '}
              <Link to="/trust#claims" className="font-semibold underline underline-offset-2">
                claims register
              </Link>
              .
            </p>
            <ul className="mt-6 space-y-3.5">
              {[
                {
                  icon: Coins,
                  text: 'Simulated fractional ownership from $100 — explore the model',
                },
                {
                  icon: CalendarClock,
                  text: 'How pro-rata rental distributions would flow, monthly or quarterly',
                },
                { icon: Link2, text: 'A transparent ownership record — the simulated Keja Ledger' },
                {
                  icon: ShieldCheck,
                  text: 'How KYC/AML gating, SPV wrappers and independent valuations would work',
                },
              ].map((f) => (
                <li key={f.text} className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold-100">
                    <f.icon className="h-4 w-4 text-gold-700" />
                  </span>
                  <span className="text-sm leading-relaxed text-ink-soft">{f.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/tokenize" className="btn-gold">
                Explore the tokenization demo <ChevronRight className="h-4 w-4" />
              </Link>
              <Link to="/tokenize?view=learn" className="btn-outline">
                How tokenization works
              </Link>
            </div>
          </m.div>

          <m.div {...fadeUp} className="relative">
            <div className="absolute -inset-4 sm:-inset-6 -z-10 rounded-[2.5rem] bg-gold-100/50 blur-2xl" />
            <div className="relative overflow-hidden rounded-3xl shadow-card-hover ring-1 ring-gold-200">
              <img
                src={asset('/images/props/office_0.jpg')}
                alt="Westlands Tower One — tokenized Grade-A office property"
                loading="lazy"
                className="h-[380px] w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
              <div className="absolute inset-x-6 bottom-6 flex flex-wrap items-end justify-between gap-4 text-white">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide2 text-gold-300">
                    Simulated offering · demo
                  </p>
                  <p className="font-display text-2xl font-bold">Westlands Tower One</p>
                  <p className="mt-0.5 text-[13px] text-white/70">
                    $12M Grade-A offices · simulated, from $100
                  </p>
                </div>
                <div className="rounded-2xl bg-white/95 px-4 py-3 text-ink shadow-gold-md">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gold-700">
                    Net yield (sim.)
                  </p>
                  <p className="text-xl font-bold text-emerald-700">7.0%</p>
                </div>
              </div>
            </div>
            <div className="absolute -top-5 -right-2 rounded-2xl bg-white p-4 shadow-card-hover ring-1 ring-gold-100 sm:-right-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-gradient">
                  <Link2 className="h-5 w-5 text-white" />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">
                    Tokenized value
                  </p>
                  <p className="text-lg font-bold leading-none text-ink">$45.5M+</p>
                </div>
              </div>
            </div>
          </m.div>
        </div>
      </section>

      {/* ============================== HOW IT WORKS ============================== */}
      <section className="section-pad bg-cream">
        <div className="container-luxe">
          <m.div {...fadeUp} className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">The full flow</p>
            <h2 className="heading-display mt-3 text-3xl sm:text-4xl">
              From discovery to management — <span className="gold-text">one intelligent flow</span>
            </h2>
          </m.div>

          <div className="mt-14 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                step: '01',
                title: 'Discover',
                text: 'Search verified inventory across agencies — or just ask Keja.',
              },
              {
                step: '02',
                title: 'Verify',
                text: 'Trust scores, title checks and fraud signals on every listing.',
              },
              {
                step: '03',
                title: 'Analyse',
                text: 'Yields, ROI, projections and investor reports — the honest math.',
              },
              {
                step: '04',
                title: 'Transact',
                text: 'Escorted viewings, M-Pesa escrow deposits, advocate-led closing.',
              },
              {
                step: '05',
                title: 'Manage',
                text: 'Tenants, rent collection, maintenance and owner statements.',
              },
            ].map((s, i) => (
              <m.div
                key={s.step}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.07 }}
                className="relative rounded-2xl bg-white p-6 shadow-card ring-1 ring-gold-100"
              >
                <p className="font-display text-3xl font-bold text-gold-300">{s.step}</p>
                <h3 className="mt-2 font-display text-lg font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{s.text}</p>
                {i < 4 && (
                  <ChevronRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-gold-400 lg:block" />
                )}
              </m.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================== TOOLS CTA ============================== */}
      <section className="section-pad bg-white">
        <div className="container-luxe grid gap-6 grid-cols-1 md:grid-cols-3">
          {[
            {
              icon: Calculator,
              title: 'Investment Calculator',
              text: 'Purchase price, rent, occupancy → gross & net yield, payback, 5/10-year projections. Built for diaspora and investor buyers.',
              to: '/invest',
              cta: 'Run the numbers',
            },
            {
              icon: LayoutDashboard,
              title: 'Agent Dashboard',
              text: 'Multi-agency lead pipeline (HOT/WARM/COLD), inventory, verification queue, rental performance and AI activity.',
              to: '/dashboard',
              cta: 'Open dashboard',
            },
            {
              icon: Bot,
              title: 'WhatsApp-first',
              text: 'Keja lives where Kenya already is. Instant property answers, viewing requests and escrow prompts on WhatsApp.',
              href: whatsappLink('Hello Keja! I’d like help finding property.'),
              cta: 'Chat now',
            },
          ].map((t) => (
            <m.div
              key={t.title}
              {...fadeUp}
              className="card-luxe card-luxe-hover flex flex-col p-7"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-gradient shadow-gold-sm">
                <t.icon className="h-6 w-6 text-white" />
              </span>
              <h3 className="mt-5 font-display text-xl font-semibold text-ink">{t.title}</h3>
              <p className="mt-2.5 flex-1 text-sm leading-relaxed text-ink-muted">{t.text}</p>
              {t.to ? (
                <Link
                  to={t.to}
                  className="mt-5 text-sm font-semibold text-gold-700 hover:text-gold-600"
                >
                  {t.cta} →
                </Link>
              ) : (
                <a
                  href={t.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 text-sm font-semibold text-emerald-700 hover:text-emerald-600"
                >
                  {t.cta} →
                </a>
              )}
            </m.div>
          ))}
        </div>
      </section>

      {/* ============================== FLAGGED EXAMPLE ============================== */}
      <section className="border-y border-gold-100 bg-gold-50/50">
        <div className="container-luxe flex flex-col items-center gap-6 py-12 text-center lg:flex-row lg:text-left">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-red-100">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </span>
          <div className="flex-1">
            <h3 className="font-display text-2xl font-bold text-ink">
              This week, our trust layer caught a listing priced 34% below market
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-muted">
              Re-posted three times under different agent names, with photos lifted from another
              building. It’s still on our site — openly flagged — because transparency is how
              markets get safer. That’s the difference between a listings board and a trust layer.{' '}
              {formatKES(4200000)} looked like a deal. It wasn’t.
            </p>
          </div>
          <Link to="/properties/KJA-020" className="btn-dark shrink-0">
            See the flagged listing
          </Link>
        </div>
      </section>

      {/* ============================== ECOSYSTEM / BLUEPRINT ============================== */}
      <section className="bg-white">
        <div className="container-luxe py-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">The KEJA Ecosystem</p>
            <h2 className="heading-display mt-2 text-3xl sm:text-4xl">
              Discover. Analyse. Invest. <span className="gold-text">Transact. Manage.</span>
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              Eight products, one intelligence layer — from first search to tokenized ownership.
              Data feeds intelligence; intelligence improves decisions; decisions create
              transactions; transactions create more data. The flywheel compounds.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { name: 'KEJA HOME', desc: 'Guided discovery', to: '/properties' },
              { name: 'KEJA INVEST', desc: 'Scores & reports', to: '/invest' },
              { name: 'KEJA PRO', desc: 'Agent CRM & leads', to: '/dashboard' },
              { name: 'KEJA MANAGE', desc: 'Landlord tools', to: '/manage' },
              { name: 'KEJA DATA', desc: 'Market intelligence', to: '/contact' },
              { name: 'KEJA SEARCH', desc: 'Natural-language search', to: '/ask' },
              { name: 'KEJA AI', desc: 'Your advisor', to: '/ask' },
              { name: 'KEJA TOKEN', desc: 'Fractional ownership', to: '/tokenize' },
            ].map((p) => (
              <Link
                key={p.name}
                to={p.to}
                className="card-luxe card-luxe-hover group p-4 text-center"
              >
                <p className="font-display text-sm font-bold text-ink group-hover:text-gold-700">
                  {p.name}
                </p>
                <p className="mt-1 text-[11px] text-ink-muted">{p.desc}</p>
              </Link>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <Link to="/ecosystem" className="btn-outline !py-2.5 !text-xs">
              Explore the full ecosystem →
            </Link>
            <Link to="/partners" className="btn-outline !py-2.5 !text-xs">
              Get your listings on Keja 🌍
            </Link>
          </div>
        </div>
      </section>

      {/* ============================== FINAL CTA ============================== */}
      <section className="relative overflow-hidden bg-ink">
        <div className="absolute inset-0 bg-gold-shimmer opacity-[0.06]" />
        <div className="container-luxe relative py-20 text-center sm:py-24">
          <m.div {...fadeUp}>
            <p className="eyebrow !text-gold-400">For you. For your family. For your future.</p>
            <h2 className="mt-4 font-display text-3xl font-bold text-white sm:text-5xl">
              We don’t just find you a home.
              <span className="gold-text block">We help you build a legacy.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-white/60">
              Join the buyers, renters and investors getting honest answers from Kenya’s AI
              real-estate advisor.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/ask" className="btn-gold">
                <Bot className="h-4 w-4" /> Ask Keja anything
              </Link>
              <Link
                to="/properties"
                className="inline-flex items-center gap-2 border border-gold-400/50 px-6 py-3 text-sm font-semibold tracking-wide text-gold-300 transition hover:bg-gold-400/10"
              >
                Browse listings
              </Link>
            </div>
          </m.div>
        </div>
      </section>
    </div>
  );
}
