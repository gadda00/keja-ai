import { m } from 'framer-motion';
import {
  BadgeCheck,
  ChevronRight,
  Copy,
  FileSearch,
  Image,
  Scale,
  ShieldCheck,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { CAPABILITY_CLAIMS, CLAIM_STATUS_META, claimsByStatus } from '@/data/claims';
import { faqJsonLd, usePageMeta } from '@/lib/seo';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6 },
};

const PILLARS = [
  {
    icon: FileSearch,
    title: '1. Title & Ardhisasa cross-check',
    weight: '35% of score',
    text: 'The title deed is checked against official land registry records — ownership, encumbrances, caveats, charges and whether the parcel touches planned public infrastructure. Listings show Verified / Pending / Flagged status, with the date of the last official search.',
  },
  {
    icon: Image,
    title: '2. Photo authenticity scan',
    weight: '20% of score',
    text: 'Every listing photo is fingerprinted and reverse-matched across all agencies on the platform. Recycled photos from other buildings, stock images passed off as real units, and old listings re-used under new names are all caught automatically.',
  },
  {
    icon: Copy,
    title: '3. Duplicate-listing detection',
    weight: '15% of score',
    text: 'The same unit listed five times at five prices is one of the oldest scams in Kenyan real estate. Our cross-agency view detects duplicate and near-duplicate listings instantly — something no single-agency platform can ever do.',
  },
  {
    icon: TrendingUp,
    title: '4. Pricing anomaly detection',
    weight: '15% of score',
    text: 'Statistical models compare each asking price against the market band for its area, type and size. A price 30%+ below market isn’t a bargain — it’s bait. Urgency-scam patterns are flagged before they reach you.',
  },
  {
    icon: UserCheck,
    title: '5. Agent reputation scoring',
    weight: '15% of score',
    text: 'Phone-number history, complaint patterns, response behaviour and prior listing outcomes build a reputation profile for every agent and agency. Repeat bad actors are removed from the verified network.',
  },
];

const TRUST_FAQS = [
  {
    q: 'What is Ardhisasa and why does it matter?',
    a: 'Ardhisasa is Kenya’s official digital land information platform run by the Ministry of Lands. It records ownership, tenure, acreage and encumbrances for registered land. We cross-check every listing’s title against it where access permits — and we tell you when we couldn’t, rather than pretending.',
  },
  {
    q: 'Does a high trust score guarantee the deal is safe?',
    a: 'No — and be suspicious of anyone who promises that. A trust score means our checks passed as of the date shown. You should still run your own advocate-led due diligence: official land search, rates clearance, encumbrances, and a physical beacon walkthrough for land. We make that easier, not optional.',
  },
  {
    q: 'Why do you show flagged listings instead of hiding them?',
    a: 'Three reasons: (1) buyers deserve to see what fraud looks like, with labels; (2) hiding listings would push bad actors to less transparent channels; (3) a marketplace that only shows perfect inventory isn’t telling the truth about the Kenyan market. We show reality, clearly marked.',
  },
  {
    q: 'How do agents get onto the verified network?',
    a: 'Agencies apply or are invited, submit company registration and operator IDs, and their first listings go through enhanced verification. Their ongoing behaviour — complaint patterns, listing accuracy, closing honesty — feeds their reputation score. Bad actors are removed; their history stays on record.',
  },
  {
    q: 'Can I get scammed anyway?',
    a: 'Fraud evolves, so stay alert even on verified platforms. Our golden rules: never pay "holding fees" to personal wallets, insist on escrow, never skip the official land search, walk the beacons, and treat urgency ("someone else is paying today") as a red flag in itself.',
  },
];

export default function TrustCenter() {
  usePageMeta(
    'Trust Center — How Keja Verifies Every Listing',
    'Ardhisasa title cross-checks, photo and duplicate scans, pricing anomaly detection and agent reputation scoring.',
    { jsonLd: faqJsonLd(TRUST_FAQS) }
  );
  return (
    <div>
      {/* hero */}
      <section className="bg-ink py-20 sm:py-28">
        <div className="container-luxe text-center">
          <m.div {...fadeUp}>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide2 text-gold-300">
              <ShieldCheck className="h-3.5 w-3.5" /> The Keja Trust Layer
            </span>
            <h1 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-bold leading-tight text-white sm:text-6xl">
              How trust scores <span className="gold-text">actually work</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl leading-relaxed text-white/65">
              No black boxes. No &ldquo;trust us&rdquo;. Here is exactly what we check, how we score
              it, and why a cross-agency platform can be honest in a way single-agency sites
              structurally cannot.
            </p>
          </m.div>
        </div>
      </section>

      {/* the five pillars */}
      <section className="section-pad bg-white">
        <div className="container-luxe">
          <p className="mx-auto mb-8 max-w-3xl rounded-xl bg-amber-50 px-4 py-3 text-center text-xs leading-relaxed text-amber-800 ring-1 ring-amber-200">
            <b>Read this first.</b> The pillars below describe the full verification model. In the
            current public build some checks run on demo data only — the{' '}
            <a href="#claims" className="font-semibold underline underline-offset-2">
              claims register
            </a>{' '}
            below states exactly which are live, which are simulated, and which are planned. We
            would rather show you the blueprint with its status than blur the line.
          </p>
        </div>
        <div className="container-luxe grid gap-6 grid-cols-1 lg:grid-cols-2">
          {PILLARS.map((p, i) => (
            <m.div
              key={p.title}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.06 }}
              className="card-luxe card-luxe-hover p-7"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold-gradient shadow-gold-sm">
                  <p.icon className="h-6 w-6 text-white" />
                </span>
                <span className="rounded-full bg-gold-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gold-700">
                  {p.weight}
                </span>
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold text-ink">{p.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-ink-muted">{p.text}</p>
            </m.div>
          ))}

          <m.div {...fadeUp} className="rounded-2xl bg-ink p-7 sm:col-span-2 lg:col-span-2">
            <div className="flex items-center gap-3">
              <Scale className="h-6 w-6 text-gold-400" />
              <h3 className="font-display text-xl font-semibold text-white">
                Score bands — what the badge means
              </h3>
            </div>
            <div className="mt-5 grid gap-4 grid-cols-1 sm:grid-cols-4">
              {[
                {
                  band: '90–100',
                  label: 'Highly Verified',
                  desc: 'All checks passed. Clean title, unique photos, in-band pricing, reputable agency.',
                  tone: 'gold',
                },
                {
                  band: '75–89',
                  label: 'Verified',
                  desc: 'Passed all critical checks; one minor note (e.g. off-plan renders or similar unit elsewhere).',
                  tone: 'gold',
                },
                {
                  band: '60–74',
                  label: 'Under Review',
                  desc: 'Pending searches or minor anomalies. Proceed with standard due diligence.',
                  tone: 'amber',
                },
                {
                  band: 'Below 60',
                  label: 'Flagged',
                  desc: 'Failed checks detected. We show it — clearly labelled — so you know what to avoid.',
                  tone: 'red',
                },
              ].map((b) => (
                <div
                  key={b.band}
                  className={`rounded-xl p-5 ${
                    b.tone === 'gold'
                      ? 'bg-gold-gradient'
                      : b.tone === 'amber'
                        ? 'bg-amber-500/90'
                        : 'bg-red-600/90'
                  }`}
                >
                  <p className="font-display text-2xl font-bold text-white">{b.band}</p>
                  <p className="mt-1 text-sm font-bold uppercase tracking-wider text-white">
                    {b.label}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-white/85">{b.desc}</p>
                </div>
              ))}
            </div>
          </m.div>
        </div>
      </section>

      {/* claims register — what is real, simulated, partner-dependent or planned */}
      <section className="section-pad bg-cream" id="claims">
        <div className="container-luxe">
          <m.div {...fadeUp} className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">The claims register</p>
            <h2 className="heading-display mt-3 text-3xl sm:text-4xl">
              What is real, and what is a demo
            </h2>
            <p className="mt-5 leading-relaxed text-ink-soft">
              Most property platforms ask you to take their word for it. We publish the register
              below instead: every capability this product claims, its honest status, what actually
              backs it today, and what has to happen before it can be called live. If a claim is not
              here, we don&rsquo;t make it.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {(Object.keys(CLAIM_STATUS_META) as (keyof typeof CLAIM_STATUS_META)[]).map((s) => (
                <span
                  key={s}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                    s === 'live'
                      ? 'bg-emerald-100 text-emerald-800'
                      : s === 'simulated'
                        ? 'bg-amber-100 text-amber-800'
                        : s === 'partner-dependent'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-zinc-200 text-zinc-700'
                  }`}
                >
                  {CLAIM_STATUS_META[s].label} · {claimsByStatus(s).length}
                </span>
              ))}
            </div>
          </m.div>

          <div className="mx-auto mt-10 max-w-4xl overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse bg-white text-left text-sm shadow-sm ring-1 ring-gold-100">
              <thead>
                <tr className="border-b border-gold-200 bg-gold-50/60 text-[11px] uppercase tracking-wider text-ink-faint">
                  <th className="px-4 py-3 font-semibold">Claim</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">What backs it today</th>
                </tr>
              </thead>
              <tbody>
                {CAPABILITY_CLAIMS.map((c) => {
                  const meta = CLAIM_STATUS_META[c.status];
                  return (
                    <tr key={c.id} className="border-b border-gold-100 last:border-0 align-top">
                      <td className="px-4 py-3.5">
                        <p className="font-semibold leading-snug text-ink">{c.claim}</p>
                        <p className="mt-1 text-[11px] text-ink-faint">
                          {c.surface} · reviewed {c.lastReviewed}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                            c.status === 'live'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.status === 'simulated'
                                ? 'bg-amber-100 text-amber-800'
                                : c.status === 'partner-dependent'
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-zinc-200 text-zinc-700'
                          }`}
                          title={meta.description}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-xs leading-relaxed text-ink-muted">{c.evidence}</p>
                        {c.pathToLive ? (
                          <p className="mt-1.5 text-[11px] leading-relaxed text-ink-faint">
                            <b className="font-semibold text-ink-soft">Path to live:</b>{' '}
                            {c.pathToLive}
                          </p>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mx-auto mt-4 max-w-4xl text-[11px] leading-relaxed text-ink-faint">
            This register is generated from{' '}
            <code className="rounded bg-white px-1 py-0.5 font-mono text-[10px]">
              src/data/claims.ts
            </code>{' '}
            and rendered verbatim — the site cannot claim a capability that is not declared here,
            and each entry carries the date it was last reviewed against the implementation.
          </p>
        </div>
      </section>

      {/* why cross-agency matters */}
      <section className="section-pad bg-white" id="score">
        <div className="container-luxe grid items-center gap-12 lg:grid-cols-2">
          <m.div {...fadeUp}>
            <p className="eyebrow">The structural moat</p>
            <h2 className="heading-display mt-3 text-3xl sm:text-4xl">
              Why a single-agency AI can never do this
            </h2>
            <p className="mt-5 leading-relaxed text-ink-soft">
              An AI advisor owned by one developer or agency can never tell you a listing looks
              suspicious — even when it is. Its employer’s revenue depends on you transacting. Keja
              sits <b>above</b> multiple agencies: our incentives are aligned with the buyer,
              because trust is the product.
            </p>
            <p className="mt-4 leading-relaxed text-ink-soft">
              Duplicate detection, agent reputation and pricing anomalies only become possible when
              more than one seller’s data flows through the same verification layer. That’s why
              agencies onboard to Keja first, and why the trust layer compounds as the network
              grows.
            </p>
            <Link to="/properties" className="btn-outline">
              Browse verified listings
            </Link>
          </m.div>
        </div>
      </section>

      <section className="section-pad bg-cream">
        <div className="container-luxe mx-auto max-w-3xl">
          <m.div {...fadeUp} className="text-center">
            <p className="eyebrow">Trust questions, answered</p>
            <h2 className="heading-display mt-3 text-3xl sm:text-4xl">Straight answers</h2>
          </m.div>
          <div className="mt-10 space-y-4">
            {TRUST_FAQS.map((f) => (
              <m.details key={f.q} {...fadeUp} className="group card-luxe overflow-hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 font-display text-base font-semibold text-ink marker:content-none">
                  {f.q}
                  <ChevronRight className="h-5 w-5 shrink-0 text-gold-600 transition-transform group-open:rotate-90" />
                </summary>
                <p className="border-t border-gold-100 px-5 py-4 text-sm leading-relaxed text-ink-soft">
                  {f.a}
                </p>
              </m.details>
            ))}
          </div>

          <m.div
            {...fadeUp}
            className="mt-12 rounded-2xl bg-gradient-to-r from-gold-100 to-gold-50 p-8 text-center"
          >
            <BadgeCheck className="mx-auto h-10 w-10 text-gold-600" />
            <h3 className="mt-3 font-display text-2xl font-bold text-ink">
              We don’t just list property.
            </h3>
            <p className="mt-2 text-ink-soft">We tell you which listings you can trust.</p>
            <Link to="/ask" className="btn-gold mt-6">
              Ask Keja to verify a listing
            </Link>
          </m.div>
        </div>
      </section>
    </div>
  );
}
