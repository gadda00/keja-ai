import { motion } from 'framer-motion';
import {
  ArrowRight,
  CalendarCheck,
  ExternalLink,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import PropertyCard from '@/components/property/PropertyCard';
import VideoFacade from '@/components/ui/VideoFacade';
import { asset, whatsappLink } from '@/config';
import { getNeighborhoodGuide } from '@/data/neighborhoods';
import { useAllProperties } from '@/lib/inventory';
import { usePageMeta } from '@/lib/seo';
import NotFound from '@/pages/NotFound';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6 },
};

/**
 * Neighbourhood deep-dive — currently anchored on The Waterfront Karen.
 * Live inventory joins on the guide’s `area`, so cards always reflect the
 * real marketplace (seed + Auto-Pilot + approved partner submissions).
 */
export default function AreaGuide() {
  const { slug } = useParams<{ slug: string }>();
  const guide = slug ? getNeighborhoodGuide(slug) : undefined;
  const MARKET = useAllProperties();
  const areaListings = guide ? MARKET.filter((p) => p.area === guide.area) : [];

  usePageMeta(
    guide ? `${guide.name} — Neighbourhood Guide` : 'Neighbourhood guide',
    guide
      ? `${guide.tagline}. Photos, video, the investment case and every live verified listing near ${guide.name} — with facts labelled.`
      : 'Keja neighbourhood guides',
    guide
      ? {
          image: `${guide.hero.base}.jpg`,
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'Place',
            name: guide.name,
            description: guide.summary,
            url: `https://gadda00.github.io/keja-ai/areas/${guide.slug}`,
            address: {
              '@type': 'PostalAddress',
              addressLocality: guide.area,
              addressRegion: 'Nairobi',
              addressCountry: 'KE',
            },
            sameAs: guide.sources.map((s) => s.url),
          },
        }
      : undefined
  );

  if (!guide) return <NotFound />;

  return (
    <div>
      {/* ============================== HERO ============================== */}
      <section className="relative overflow-hidden bg-ink">
        <div className="absolute inset-0">
          <picture>
            <source srcSet={asset(`${guide.hero.base}.webp`)} type="image/webp" />
            <img
              src={asset(`${guide.hero.base}.jpg`)}
              alt={guide.hero.alt}
              width={guide.hero.width}
              height={guide.hero.height}
              fetchPriority="high"
              className="h-full w-full object-cover opacity-45"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-b from-ink/80 via-ink/55 to-ink" />
        </div>

        <div className="container-luxe relative py-20 sm:py-28">
          <nav aria-label="Breadcrumb" className="text-xs font-medium text-white/50">
            <Link to="/" className="hover:text-gold-300">
              Home
            </Link>
            <span className="mx-2" aria-hidden="true">
              /
            </span>
            <Link to="/properties" className="hover:text-gold-300">
              Areas
            </Link>
            <span className="mx-2" aria-hidden="true">
              /
            </span>
            <span className="text-gold-300">{guide.name}</span>
          </nav>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide2 text-gold-300 backdrop-blur">
              <MapPin className="h-3.5 w-3.5" /> Neighbourhood guide · {guide.location}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12 }}
            className="mt-6 max-w-3xl font-display text-4xl font-bold leading-[1.1] text-white sm:text-6xl"
          >
            The Waterfront <span className="gold-text">Karen</span>
            <span className="mt-4 block text-lg font-medium text-white/70 sm:text-2xl">
              {guide.tagline}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24 }}
            className="mt-6 max-w-2xl leading-relaxed text-white/75 sm:text-lg"
          >
            {guide.summary}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.36 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Link to={`/properties?area=${encodeURIComponent(guide.area)}`} className="btn-gold">
              Browse {guide.area} listings
              {areaListings.length > 0 && ` (${areaListings.length})`}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={whatsappLink(
                `Hello Keja! I'd like to know more about property near ${guide.name}.`
              )}
              target="_blank"
              rel="noreferrer"
              className="btn-outline"
            >
              <MessageCircle className="h-4 w-4" /> Ask about {guide.shortName}
            </a>
          </motion.div>
        </div>
      </section>

      {/* ============================== STATS ============================== */}
      <section className="border-b border-gold-100 bg-white">
        <div className="container-luxe grid grid-cols-2 gap-6 py-10 sm:grid-cols-3 lg:grid-cols-5">
          {guide.stats.map((s) => (
            <motion.div
              key={s.label}
              {...fadeUp}
              className="flex flex-col items-center text-center"
            >
              <p className="font-display text-3xl font-bold text-ink">{s.value}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-ink-muted">
                {s.label}
              </p>
              {s.note ? (
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-700">
                  {s.note}
                </p>
              ) : null}
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============================== LIFESTYLE ============================== */}
      <section className="section-pad bg-cream">
        <div className="container-luxe">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">The lifestyle</p>
            <h2 className="heading-display mt-3 text-3xl sm:text-4xl">
              A whole town centre, <span className="gold-text">at the end of the lane</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">
              &ldquo;A world class town centre with innovation in every square inch&rdquo; is how
              The Waterfront describes itself — and it is a fair description of what Karen residents
              get within minutes of their gates.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {guide.amenities.map((a, i) => (
              <motion.div
                key={a.title}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.05 }}
                className="card-luxe card-luxe-hover p-6"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-100">
                  <a.icon className="h-5 w-5 text-gold-700" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-display text-base font-semibold text-ink">{a.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{a.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================== VIDEO ============================== */}
      <section className="section-pad bg-ink">
        <div className="container-luxe grid items-center gap-12 lg:grid-cols-2">
          <motion.div {...fadeUp}>
            <p className="eyebrow !text-gold-400">See it for yourself</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">
              Walk the Waterfront <span className="gold-text">before you visit</span>
            </h2>
            <p className="mt-5 leading-relaxed text-white/70">
              This independent guide covers what to do, what things cost and how to get there — the
              fastest way to feel whether the Karen lifestyle fits your family. The video loads only
              when you press play (we keep third-party scripts off your first paint).
            </p>
            <ul className="mt-6 space-y-3">
              {[
                { icon: Search, text: 'Things to do — aqua park, paintball, dining, events' },
                { icon: CalendarCheck, text: 'Opening hours & entry pricing covered in the guide' },
                {
                  icon: ShieldCheck,
                  text: 'Curated by Keja — we only recommend what we have checked',
                },
              ].map((f) => (
                <li key={f.text} className="flex gap-3 text-sm leading-relaxed text-white/75">
                  <f.icon className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" aria-hidden="true" />
                  {f.text}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={`/properties?area=${encodeURIComponent(guide.area)}`} className="btn-gold">
                See live {guide.area} inventory <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="https://thewaterfrontkaren.com"
                target="_blank"
                rel="noreferrer"
                className="btn-outline"
              >
                Official Waterfront site <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </motion.div>

          <motion.div {...fadeUp} className="relative">
            <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-gold-500/10 blur-2xl" />
            <div className="overflow-hidden rounded-3xl shadow-card-hover ring-1 ring-gold-300/30">
              <VideoFacade
                videoId={guide.video.id}
                title={guide.video.title}
                channel={guide.video.channel}
                poster={asset(`${guide.gallery[0].base}.jpg`)}
                posterAlt={guide.gallery[0].alt}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================== GALLERY ============================== */}
      <section className="section-pad bg-white">
        <div className="container-luxe">
          <motion.div {...fadeUp} className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Around the Waterfront</p>
              <h2 className="heading-display mt-3 text-3xl sm:text-4xl">
                The setting — town centre <span className="gold-text">and suburb</span>
              </h2>
            </div>
          </motion.div>
          <div className="mt-10 grid gap-5 grid-cols-1 sm:grid-cols-2">
            {guide.gallery.map((g, i) => (
              <motion.figure
                key={g.base}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.06 }}
                className="group overflow-hidden rounded-3xl shadow-card ring-1 ring-gold-100"
              >
                <picture>
                  <source srcSet={asset(`${g.base}.webp`)} type="image/webp" />
                  <img
                    src={asset(`${g.base}.jpg`)}
                    alt={g.alt}
                    width={g.width}
                    height={g.height}
                    loading="lazy"
                    className="w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                </picture>
                <figcaption className="bg-white px-5 py-4 text-xs leading-relaxed text-ink-muted">
                  {g.alt}
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </section>

      {/* ============================== INVESTMENT CASE ============================== */}
      <section className="section-pad bg-cream">
        <div className="container-luxe">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">The investment case</p>
            <h2 className="heading-display mt-3 text-3xl sm:text-4xl">
              Why buyers pay attention to <span className="gold-text">this corridor</span>
            </h2>
          </motion.div>
          <div className="mt-12 grid gap-5 grid-cols-1 md:grid-cols-3">
            {guide.investmentThesis.map((t, i) => (
              <motion.div
                key={t.title}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.07 }}
                className="card-luxe card-luxe-hover p-7"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-gradient shadow-gold-sm">
                  <t.icon className="h-6 w-6 text-white" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-display text-xl font-semibold text-ink">{t.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">{t.text}</p>
              </motion.div>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-relaxed text-ink-muted">
            Transaction and expansion figures are as reported by Kenyan business media (see sources
            below). Keja labels reported figures distinctly from verified listing data — the
            discipline that applies to every number we publish.
          </p>
        </div>
      </section>

      {/* ============================== LIVE INVENTORY ============================== */}
      <section className="section-pad bg-white">
        <div className="container-luxe">
          <motion.div {...fadeUp} className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Live near the Waterfront</p>
              <h2 className="heading-display mt-3 text-3xl sm:text-4xl">
                Verified {guide.area} listings, <span className="gold-text">right now</span>
              </h2>
            </div>
            <Link to={`/properties?area=${encodeURIComponent(guide.area)}`} className="btn-outline">
              View all in {guide.area} <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>

          {areaListings.length > 0 ? (
            <div className="mt-10 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {areaListings.slice(0, 6).map((p, i) => (
                <motion.div
                  key={p.id}
                  {...fadeUp}
                  transition={{ ...fadeUp.transition, delay: i * 0.06 }}
                >
                  <PropertyCard property={p} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-3xl border border-dashed border-gold-200 bg-gold-50/50 p-10 text-center">
              <p className="font-display text-lg font-semibold text-ink">
                No verified {guide.area} listings on the market this week
              </p>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
                {guide.area} stock moves quietly and rarely lingers. Set a watching brief with our
                client desk and we will surface the next verified listing before it is advertised
                elsewhere.
              </p>
              <a
                href={whatsappLink(
                  `Hello Keja! Please alert me when new ${guide.area} listings arrive near ${guide.name}.`
                )}
                target="_blank"
                rel="noreferrer"
                className="btn-gold mt-6"
              >
                <MessageCircle className="h-4 w-4" /> Set a watching brief
              </a>
            </div>
          )}
        </div>
      </section>

      {/* ============================== SOURCES ============================== */}
      <section className="border-t border-gold-100 bg-white">
        <div className="container-luxe py-10">
          <p className="text-xs font-bold uppercase tracking-wide2 text-ink-muted">Sources</p>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            {guide.sources.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-gold-700 hover:text-gold-600"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden="true" /> {s.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-ink-muted">
            Guide reviewed {guide.lastReviewed}. Independent of The Waterfront Karen — this page is
            editorial context, not an advertisement.
          </p>
        </div>
      </section>
    </div>
  );
}
