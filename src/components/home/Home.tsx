'use client';
/**
 * Keja AI — the repositioned homepage (proposal §18).
 *
 * "Africa's Real Estate Intelligence & Trust Infrastructure"
 *  Discover. Verify. Analyse. Finance. Invest. Transact. Manage.
 *
 * The visitor must immediately understand that Keja is far more than a
 * property-listing website: the lifecycle strip, the nine-product ecosystem,
 * the stakeholder entries, verified metrics and the trust layer carry that.
 */
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Coins,
  GraduationCap,
  HandCoins,
  HeartHandshake,
  Landmark,
  LineChart,
  Plane,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Link, navigate } from '@/lib/router';
import { ECOSYSTEM } from '@/lib/ecosystem';
import { useI18n } from '@/lib/i18n';
import { useAllProperties } from '@/lib/inventory';
import { useStore } from '@/lib/store';
import { PropertyCard } from '@/components/property/PropertyCard';
import { cn } from '@/lib/utils';

/* --------------------------------- Hero ---------------------------------- */

function Hero() {
  const { t } = useI18n();
  const [q, setQ] = useState('');
  return (
    <section className="bg-hero-mesh relative overflow-hidden">
      <div className="bg-dots absolute inset-0 opacity-60" aria-hidden />
      <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4 pb-16 pt-14 text-center sm:px-6 sm:pb-24 sm:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold-soft px-4 py-1.5"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-gold" aria-hidden />
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-foreground">
            {t('hero.eyebrow')}
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="mt-6 max-w-4xl text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-6xl"
        >
          {t('hero.title1')}
          <br />
          <span className="text-brand-gradient">{t('hero.title2')}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.16 }}
          className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
        >
          {t('hero.subtitle')}
        </motion.p>

        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.24 }}
          className="mt-8 flex w-full max-w-xl items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            navigate(`/properties${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
          }}
          role="search"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('search.placeholder')}
              aria-label={t('search.placeholder')}
              className="h-12 rounded-xl border-border/70 bg-card pl-10 text-sm shadow-sm"
            />
          </div>
          <Button type="submit" size="lg" className="h-12 rounded-xl px-6 font-bold">
            {t('search.button')}
          </Button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.34 }}
          className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-semibold text-muted-foreground"
        >
          {['Verified titles & documents', 'Investment scoring on every listing', 'Trial tokenization'].map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" aria-hidden /> {s}
            </span>
          ))}
        </motion.div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" className="font-bold" onClick={() => navigate('/properties')}>
            {t('hero.cta')} <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
          </Button>
          <Button size="lg" variant="outline" className="border-primary/30 font-bold" onClick={() => navigate('/ask')}>
            <Sparkles className="mr-1.5 h-4 w-4 text-gold" aria-hidden /> {t('hero.cta2')}
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- Lifecycle strip ---------------------------- */

const LIFECYCLE = [
  { verb: 'Discover', to: '/properties' },
  { verb: 'Verify', to: '/trust' },
  { verb: 'Analyse', to: '/deal-analyst' },
  { verb: 'Finance', to: '/finance' },
  { verb: 'Invest', to: '/invest' },
  { verb: 'Transact', to: '/transact' },
  { verb: 'Manage', to: '/manage' },
];

function LifecycleStrip() {
  return (
    <section aria-label="The Keja lifecycle" className="border-y bg-card">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-2 gap-y-3 px-4 py-5 sm:px-6">
        {LIFECYCLE.map((step, i) => (
          <div key={step.verb} className="flex items-center gap-2">
            <Link
              to={step.to}
              className="rounded-full px-4 py-1.5 text-sm font-bold transition-colors hover:bg-accent hover:text-primary"
            >
              {step.verb}
            </Link>
            {i < LIFECYCLE.length - 1 && (
              <span className="text-gold" aria-hidden>→</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ----------------------------- Stakeholders ------------------------------- */

const STAKEHOLDERS = [
  { icon: Users, title: 'Buyers & Sellers', desc: 'Verified listings, fair-price screening and a guided purchase path.', to: '/properties' },
  { icon: Building2, title: 'Landlords', desc: 'Rent collection, tenant screening and portfolio performance in one desk.', to: '/manage' },
  { icon: LineChart, title: 'Investors', desc: 'Yield analysis, the investor dashboard and fractional ownership trials.', to: '/portfolio' },
  { icon: HandCoins, title: 'Tenants', desc: 'Rent affordability checks, verified homes and a tenant hub.', to: '/tenant' },
  { icon: Landmark, title: 'Banks & Lenders', desc: 'Qualified financing leads and property intelligence.', to: '/institutional' },
  { icon: GraduationCap, title: 'Developers', desc: 'Project profiles, the Development Score and buyer matching.', to: '/develop' },
  { icon: Plane, title: 'Diaspora', desc: 'Invest in Kenya from anywhere — verification, viewing and management.', to: '/diaspora' },
  { icon: HeartHandshake, title: 'Agents & Professionals', desc: 'A pro workspace with leads, valuation tools and market data.', to: '/pro' },
];

function StakeholderGrid() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Every stakeholder</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
          One platform for the entire ecosystem
        </h2>
        <p className="mt-4 text-muted-foreground">
          Keja serves the people and institutions on every side of a property transaction —
          each with a dedicated workspace, not just a listing feed.
        </p>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAKEHOLDERS.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.25) }}
          >
            <Link
              to={s.to}
              className="card-lift group flex h-full flex-col gap-3 rounded-2xl border bg-card p-5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <s.icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="text-[15px] font-bold">{s.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              <span className="mt-auto inline-flex items-center gap-1 text-xs font-bold text-primary">
                Open workspace <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------ Ecosystem --------------------------------- */

function EcosystemGrid() {
  return (
    <section className="border-y bg-cream py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">The ecosystem</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Nine products. One intelligent platform.
          </h2>
          <p className="mt-4 text-muted-foreground">
            From discovery to management — each capability is built to stand alone and
            engineered to compound together.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ECOSYSTEM.map((p, i) => (
            <motion.div
              key={p.key}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.25) }}
            >
              <Link to={p.route} className="card-lift group flex h-full flex-col rounded-2xl border bg-card p-5">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <p.icon className="h-5.5 w-5.5" aria-hidden />
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[9px] font-bold uppercase tracking-wider',
                      p.status === 'TRIAL' && 'border-gold/50 text-gold',
                      p.status === 'LIVE' && 'border-primary/40 text-primary',
                    )}
                  >
                    {p.status === 'TRIAL' ? 'Trial mode' : p.status === 'PILOT' ? 'Pilot' : 'Live'}
                  </Badge>
                </div>
                <h3 className="mt-4 text-base font-bold">{p.name}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.description}</p>
                <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-bold text-primary">
                  Explore <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          See the full map on the <Link to="/ecosystem" className="font-bold text-primary hover:underline">ecosystem page</Link>.
        </p>
      </div>
    </section>
  );
}

/* --------------------------- Featured listings ---------------------------- */

function FeaturedProperties() {
  const all = useAllProperties();
  const [favorites, setFavorites] = useStore<string[]>('favorites', []);
  const featured = useMemo(
    () =>
      [...all]
        .filter((p) => p.availability !== 'sold')
        .sort((a, b) => b.trustScore - a.trustScore || b.views - a.views)
        .slice(0, 8),
    [all],
  );

  const toggleSave = (id: string) =>
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Keja Home</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Highest-trust listings this week
          </h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Every listing carries the KEJA Trust Score and a Property Passport — verification
            status, pricing screens and evidence, visible before you enquire.
          </p>
        </div>
        <Button variant="outline" className="font-bold" onClick={() => navigate('/properties')}>
          View all {all.length}+ listings <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
        </Button>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {featured.map((p, i) => (
          <PropertyCard
            key={p.id}
            property={p}
            index={i}
            saved={favorites.includes(p.id)}
            onSave={(pp) => toggleSave(pp.id)}
          />
        ))}
      </div>
    </section>
  );
}

/* ----------------------------- Token spotlight ---------------------------- */

function TokenSpotlight() {
  return (
    <section className="relative overflow-hidden border-y bg-emerald-deep py-16 text-white sm:py-20">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'url(/images/waterfront/karen-villa-pool.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        aria-hidden
      />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <Badge className="border-0 bg-gold text-[10px] font-black uppercase tracking-widest text-gold-foreground">
            Trial Mode · Fictional Assets
          </Badge>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Keja Token — fractional ownership, in a guided trial
          </h2>
          <p className="mt-4 max-w-lg leading-relaxed text-white/80">
            Explore fractional real-estate investing with a <strong className="text-gold">$25,000 virtual wallet</strong>:
            five fictional Nairobi assets, KYC-gated subscriptions, a simulated ledger with
            order-matched secondary trading, and live distribution accruals — the full journey
            from asset selection to investor reporting.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" className="bg-gold font-black text-gold-foreground hover:bg-gold/90" onClick={() => navigate('/tokenize')}>
              <Coins className="mr-1.5 h-4 w-4" aria-hidden /> Enter the trial marketplace
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 font-bold text-white hover:bg-white/10 hover:text-white"
              onClick={() => navigate('/tokenize?tab=learn')}
            >
              How tokenization works
            </Button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { k: '5', v: 'fictional tokenized assets' },
            { k: '$25k', v: 'virtual trial wallet' },
            { k: 'KYC', v: 'gated investor flows' },
            { k: 'CMA', v: 'sandbox-ready documentation' },
          ].map((s) => (
            <div key={s.k} className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-2xl font-black text-gold">{s.k}</p>
              <p className="mt-1 text-sm font-semibold text-white/80">{s.v}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Social proof ------------------------------ */

const TRUSTED_BY = [
  'Banks', 'Developers', 'Law Firms', 'Valuers', 'Investment Firms', 'Property Managers', 'Technology Partners',
];

function SocialProof() {
  const all = useAllProperties();
  const metrics = useMemo(
    () => [
      { value: `${all.length}+`, label: 'Listings on the marketplace' },
      { value: `${all.filter((p) => p.trustScore >= 80).length}`, label: 'Verified properties (Trust ≥ 80)' },
      { value: '12', label: 'Counties covered' },
      { value: '3', label: 'Languages — EN · SW · FR' },
    ],
    [all],
  );
  return (
    <section aria-label="Platform metrics" className="bg-card py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className="text-center">
              <p className="text-3xl font-black tracking-tight text-primary sm:text-4xl">{m.value}</p>
              <p className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {m.label}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-10 overflow-hidden">
          <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
            Designed to be trusted by
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {TRUSTED_BY.map((b) => (
              <span key={b} className="text-sm font-bold text-muted-foreground/70">{b}</span>
            ))}
          </div>
        </div>
        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Platform metrics update from live inventory. Only auditable numbers are displayed.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------ Trust teaser ------------------------------ */

function TrustTeaser() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Keja Verify</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            The trust layer under every listing
          </h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Fraud is the tax on Africa&rsquo;s property market. Keja&rsquo;s answer is the
            <strong className="text-foreground"> KEJA Trust Score™</strong> — a twelve-factor,
            evidence-labelled rating of ownership, documentation, pricing and risk — plus a
            <strong className="text-foreground"> Property Passport</strong> for every verified
            asset, and a public claims register that separates what is live from what is simulated.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              'Title & Ardhisasa ownership screens on every listing',
              'Twelve-factor Trust Score with FACT / ESTIMATE / ASSUMPTION labels',
              'Human verification desk and report-an-issue adjudication',
              'AI escalation guard — legal and valuation questions route to professionals',
            ].map((li) => (
              <li key={li} className="flex items-start gap-2.5 text-sm">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span className="text-muted-foreground">{li}</span>
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button className="font-bold" onClick={() => navigate('/trust')}>
              Visit the Trust & Security Center
            </Button>
            <Button variant="outline" className="font-bold" onClick={() => navigate('/trust?tab=claims')}>
              Read the claims register
            </Button>
          </div>
        </div>
        <div className="relative">
          <div className="card-lift mx-auto max-w-sm rounded-3xl border bg-card p-6 stamp-ring">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-gold">
                Keja Property Passport
              </span>
              <Badge variant="outline" className="text-[9px] font-bold">Sample</Badge>
            </div>
            <p className="mt-4 font-mono text-sm font-bold tracking-wider">KEJA-KRN-000124</p>
            <p className="text-xs text-muted-foreground">Karen, Nairobi · Residential · ½ Acre</p>
            <div className="mt-5 space-y-2.5 text-xs">
              {[
                ['Ownership', 'Verified'],
                ['Title & encumbrance', 'Clear'],
                ['Rates & zoning', 'Compliant'],
                ['Valuation', 'On file'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-dashed border-border pb-2 last:border-0">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="inline-flex items-center gap-1 font-bold text-primary">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> {v}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between rounded-xl bg-accent p-3.5">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  KEJA Trust Score
                </p>
                <p className="text-xs font-semibold text-muted-foreground">Highly verified asset</p>
              </div>
              <p className="text-3xl font-black text-primary">94<span className="text-sm text-muted-foreground">/100</span></p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Diaspora CTA ------------------------------ */

function DiasporaCTA() {
  return (
    <section className="border-y bg-cream py-14">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 text-center sm:px-6">
        <Plane className="h-8 w-8 text-gold" aria-hidden />
        <h2 className="max-w-2xl text-2xl font-black tracking-tight sm:text-3xl">
          &ldquo;I&rsquo;m abroad — help me invest in Kenya.&rdquo;
        </h2>
        <p className="max-w-xl text-muted-foreground">
          The Keja Diaspora portal: verified properties, AI-assisted analysis, virtual viewings,
          lawyer and property-management connections, rental collection and WhatsApp support —
          invest from anywhere in the world.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" className="font-bold" onClick={() => navigate('/diaspora')}>
            Open the Diaspora portal <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
          </Button>
          <Button size="lg" variant="outline" className="font-bold" onClick={() => navigate('/ask')}>
            <Sparkles className="mr-1.5 h-4 w-4 text-gold" aria-hidden /> Ask Keja AI first
          </Button>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- Home ----------------------------------- */

export function Home() {
  return (
    <>
      <Hero />
      <LifecycleStrip />
      <StakeholderGrid />
      <EcosystemGrid />
      <FeaturedProperties />
      <TokenSpotlight />
      <SocialProof />
      <TrustTeaser />
      <DiasporaCTA />
    </>
  );
}
