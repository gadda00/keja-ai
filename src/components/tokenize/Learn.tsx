/**
 * Keja Tokenize — Learn academy: the worked example ($10M → 1M tokens),
 * the six-step operating model, key advantages, Kenya regulatory landscape, FAQ.
 */
import { m } from 'framer-motion';
import {
  ArrowLeftRight,
  BadgeCheck,
  Calculator,
  CalendarClock,
  ChevronDown,
  Coins,
  Cpu,
  Droplets,
  Eye,
  FileSearch,
  Globe2,
  Landmark,
  Link2,
  PieChart,
  Scale,
  UserCheck,
} from 'lucide-react';

import { SectionTitle } from './shared';

const MODEL_STEPS = [
  {
    icon: Coins,
    title: 'Property acquisition',
    body: 'A suitable property is identified and acquired — or already owned and restructured — for investment. Keja underwrites the asset: independent valuation, Ardhisasa title search, tenant lease audits and physical inspection.',
  },
  {
    icon: Scale,
    title: 'Legal structuring',
    body: 'The property is placed inside an appropriate legal structure, typically a Special Purpose Vehicle (SPV) or trust. The SPV ring-fences the asset so tokens represent clean, enforceable economic rights.',
  },
  {
    icon: Link2,
    title: 'Token issuance',
    body: 'Digital tokens representing ownership or defined economic rights are issued on a blockchain. A $10M property might become 1,000,000 tokens at $10 each — each token a provable, auditable unit of ownership.',
  },
  {
    icon: UserCheck,
    title: 'Investor onboarding',
    body: 'Investors undergo KYC/AML and regulatory compliance procedures. Only verified wallets can hold tokens — a compliance gate that is native to regulated security-token standards like ERC-3643.',
  },
  {
    icon: CalendarClock,
    title: 'Income distribution',
    body: 'Rental income or other returns are distributed proportionally to eligible token holders — monthly or quarterly — with smart contracts automating the splits and every payout recorded on-chain.',
  },
  {
    icon: ArrowLeftRight,
    title: 'Potential secondary trading',
    body: 'Subject to regulatory approval and compliant marketplaces, investors may eventually transfer or trade their interests — addressing the illiquidity that defines traditional private real estate.',
  },
];

const ADVANTAGES = [
  {
    icon: PieChart,
    title: 'Fractional ownership',
    body: 'Participate in high-value properties with smaller amounts of capital — from $100 instead of $100,000.',
  },
  {
    icon: Globe2,
    title: 'Greater accessibility',
    body: 'Institutional-quality real estate opens to a broader investor base, including the Kenyan and pan-African diaspora.',
  },
  {
    icon: Eye,
    title: 'Transparency',
    body: 'Blockchain provides an auditable, immutable record of transactions and ownership — no opaque registries.',
  },
  {
    icon: Cpu,
    title: 'Automation',
    body: 'Smart contracts automate income distributions and ownership transfers, cutting admin cost and settlement time.',
  },
  {
    icon: Droplets,
    title: 'Potential liquidity',
    body: 'Properly structured tokenized interests could offer greater transferability than traditional private real estate — though liquidity is never guaranteed.',
  },
];

const FAQS = [
  {
    q: 'What exactly does a token represent?',
    a: 'Each token represents a fractional economic interest in the underlying property, held through a legal structure such as an SPV. Your entitlement — to rental income and any sale proceeds — is determined by the legal and contractual structure set out in the offering documents. Tokens are digital records of those rights, not the land title itself.',
  },
  {
    q: 'How is rental income paid to me?',
    a: 'The SPV collects rent from tenants, deducts operating costs and the asset management fee, and the net income is distributed proportionally to token holders — monthly or quarterly depending on the asset. On Keja Tokenize, payouts and statements appear in your portfolio dashboard, and every distribution is recorded on the ledger.',
  },
  {
    q: 'Can I sell my tokens?',
    a: 'Not immediately. Tokenized real estate is illiquid in its early phase — that is a real risk to understand. Secondary trading requires regulatory approval and compliant marketplaces; when available, transfers would still be restricted to KYC-verified wallets. Treat any token purchase as a long-term hold.',
  },
  {
    q: 'Is this legal in Kenya?',
    a: 'Real estate tokenization sits at the intersection of securities, property, tax, AML and digital-asset regulation. Kenya’s Capital Markets Authority (CMA) runs a regulatory sandbox in which real estate tokenization platforms are actively being tested — three platforms were admitted as of 2026. A production deployment requires CMA engagement and legal counsel in every relevant jurisdiction. This demo is illustrative only.',
  },
  {
    q: 'What happens if the property value falls?',
    a: 'Token holders bear the market risk of the underlying asset, proportional to their holdings. Rental income can fall with occupancy, and capital values can decline. Keja mitigates — never eliminates — these risks through asset selection, blue-chip tenants, independent valuations and conservative underwriting ceilings.',
  },
  {
    q: 'What does the demo cover vs. production?',
    a: 'The demo simulates the full product loop: KYC/AML gating, token purchase, a ledger with transaction hashes, income distributions and an issuer console. Production additionally requires a licensed custody setup, a public-chain security-token standard (e.g. ERC-3643 with whitelisting), payment rails (bank & mobile money), CMA approval and audited SPV accounts.',
  },
];

const GLOSSARY = [
  {
    t: 'Tokenization',
    d: 'Converting ownership rights or economic interests in an asset into digital tokens recorded on a blockchain.',
  },
  {
    t: 'SPV (Special Purpose Vehicle)',
    d: 'A dedicated legal company created to hold one property, ring-fencing it from other risks.',
  },
  {
    t: 'KYC / AML',
    d: 'Know Your Customer and Anti-Money-Laundering checks that gate who may invest — legally mandatory.',
  },
  {
    t: 'ERC-3643',
    d: 'A regulated security-token standard with built-in whitelisting and transfer restrictions.',
  },
  {
    t: 'Distribution',
    d: 'Net rental income paid to token holders, proportional to holdings, monthly or quarterly.',
  },
  {
    t: 'Net yield',
    d: 'Annual net income divided by property value — the income return, before any appreciation.',
  },
];

export function Learn() {
  return (
    <div className="bg-cream">
      {/* intro */}
      <section className="relative overflow-hidden border-b border-gold-100 bg-cream">
        <div className="container-luxe py-14 text-center">
          <SectionTitle
            center
            eyebrow="Keja Academy"
            title="Real estate tokenization, explained"
            sub="The concept behind Keja Tokenize — converting ownership rights or economic interests in a property into digital tokens recorded on a blockchain, so investors can acquire fractional interests without buying an entire property."
          />
        </div>
      </section>

      {/* worked example */}
      <section className="container-luxe py-14">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <SectionTitle
              eyebrow="The worked example"
              title="The arithmetic of fractional ownership"
              sub="Take a property valued at $10 million generating roughly $600,000 in annual net rental income — and represent it with 1,000,000 tokens."
            />
            <div className="mt-6 space-y-3">
              {[
                {
                  l: 'Property value',
                  v: '$10,000,000',
                  d: 'Independently valued income property',
                },
                {
                  l: 'Annual net rental income',
                  v: '$600,000',
                  d: 'After costs & management fees',
                },
                {
                  l: 'Token supply',
                  v: '1,000,000 tokens',
                  d: '$10 of underlying value per token',
                },
                { l: 'Yield per token', v: '$0.60 / year', d: 'A 6.0% net yield, paid pro-rata' },
              ].map((r) => (
                <div
                  key={r.l}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-gold-100 bg-white p-4"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-ink">{r.l}</p>
                    <p className="text-[12px] text-ink-muted">{r.d}</p>
                  </div>
                  <p className="shrink-0 whitespace-nowrap font-display text-base font-bold text-gold-700 sm:text-lg">
                    {r.v}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <m.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="rounded-3xl bg-ink p-8 text-white shadow-gold-lg"
          >
            <div className="flex items-center gap-2 text-gold-300">
              <Calculator className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase tracking-wide2">Investor view</span>
            </div>
            <h3 className="mt-3 font-display text-2xl font-bold">An investor buys 10,000 tokens</h3>
            <div className="mt-6 space-y-4">
              {[
                ['Investment exposure', '$100,000'],
                ['Share of the property', '1.0%'],
                ['Projected annual income', '≈ $6,000'],
                ['Economic entitlement', 'Pro-rata, per SPV terms'],
              ].map(([l, v], i, arr) => (
                <div
                  key={l}
                  className={`flex justify-between ${i < arr.length - 1 ? 'border-b border-white/10 pb-3' : ''}`}
                >
                  <span className="text-[14px] text-white/70">{l}</span>
                  <span
                    className={`text-xl font-bold ${l === 'Projected annual income' ? 'text-emerald-300' : ''}`}
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-6 rounded-xl bg-white/5 p-4 text-[12.5px] leading-relaxed text-white/60">
              Subject to the applicable legal and regulatory structure — the same discipline Keja
              applies to every listing: SPV wrapper, independent valuation, title verification and
              KYC-gated investors only.
            </p>
          </m.div>
        </div>
      </section>

      {/* 6-step model */}
      <section className="border-y border-gold-100 bg-white">
        <div className="container-luxe py-14">
          <SectionTitle
            center
            eyebrow="The operating model"
            title="How the tokenization machine works"
            sub="Six stages take a property from a physical asset to a divisible, income-paying digital holding."
          />
          <div className="mt-10 grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {MODEL_STEPS.map((s, i) => (
              <m.div
                key={s.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 3) * 0.08 }}
                className="relative rounded-2xl border border-gold-100 bg-cream p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="rounded-xl border border-gold-200 bg-gold-50 p-3">
                    <s.icon className="h-5 w-5 text-gold-600" />
                  </div>
                  <span className="font-display text-3xl font-bold text-gold-200">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mt-4 text-[15px] font-bold text-ink">{s.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{s.body}</p>
              </m.div>
            ))}
          </div>
        </div>
      </section>

      {/* advantages */}
      <section className="container-luxe py-14">
        <SectionTitle
          eyebrow="Why it matters"
          title="Key advantages of tokenized real estate"
          sub="Fractional entry, accessibility, transparency, automation and the prospect of liquidity — the benefits that made Chacadom pursue this model."
        />
        <div className="mt-8 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          {ADVANTAGES.map((a) => (
            <m.div
              key={a.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-gold-100 bg-white p-5"
            >
              <a.icon className="h-5 w-5 text-gold-600" />
              <h3 className="mt-3 text-[13.5px] font-bold text-ink">{a.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">{a.body}</p>
            </m.div>
          ))}
        </div>
      </section>

      {/* Kenya regulation */}
      <section className="border-y border-gold-100 bg-ink">
        <div className="container-luxe py-14">
          <div className="grid gap-10 grid-cols-1 lg:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 text-gold-300">
                <Landmark className="h-4 w-4" />
                <span className="text-[11px] font-bold uppercase tracking-wide2">
                  The Kenya regulatory landscape
                </span>
              </div>
              <h2 className="mt-3 font-display text-2xl font-bold leading-tight text-white sm:text-3xl">
                Kenya is testing real estate tokenization inside the CMA sandbox
              </h2>
              <p className="mt-4 text-[14px] leading-relaxed text-white/70">
                The Capital Markets Authority of Kenya operates a regulatory sandbox in which
                tokenized real estate platforms are being piloted — three platforms were admitted as
                of 2026, alongside new virtual-asset and REIT licensing frameworks. Real estate
                tokenization must be structured carefully to comply with securities, property, tax,
                anti-money-laundering, investor-protection and digital-asset regulations in every
                relevant jurisdiction.
              </p>
              <p className="mt-4 text-[14px] leading-relaxed text-white/70">
                The success of such a platform depends not only on blockchain technology, but on
                strong legal structuring, property due diligence, transparent valuation,
                professional asset management, investor protection and regulatory compliance. That
                is exactly the posture Keja Tokenize takes: compliance-first, sandbox-informed, and
                clearly labelled as a demonstration until the necessary approvals are in place.
              </p>
            </div>
            <div className="space-y-3">
              {[
                {
                  icon: FileSearch,
                  t: 'Path to compliance',
                  d: 'CMA sandbox admission → securities-law structuring → licensed custodians → audited SPV accounts → restricted-transfer token standard.',
                },
                {
                  icon: BadgeCheck,
                  t: 'What Keja does today',
                  d: 'Every listing is Ardhisasa title-verified, independently valued, KYC/AML-gated and wrapped in a dedicated SPV — the same stack regulators expect.',
                },
                {
                  icon: Landmark,
                  t: 'What production adds',
                  d: 'Public-chain security tokens (ERC-3643-class), mobile-money & bank rails, licensed custody, CMA approval and continuous disclosure.',
                },
              ].map((c) => (
                <div
                  key={c.t}
                  className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-5"
                >
                  <c.icon className="h-6 w-6 shrink-0 text-gold-300" />
                  <div>
                    <h3 className="text-[14px] font-bold text-white">{c.t}</h3>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-white/60">{c.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <SectionTitle center eyebrow="FAQ" title="Questions investors actually ask" />
        <div className="mt-8 space-y-3">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl border border-gold-100 bg-white px-5 py-4"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-left text-[14.5px] font-semibold text-ink transition hover:text-gold-700 [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown className="h-4 w-4 shrink-0 text-gold-600 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-[13.5px] leading-relaxed text-ink-muted">{f.a}</p>
            </details>
          ))}
        </div>

        {/* KJAI & KPT — blueprint token architecture */}
        <div className="mt-16">
          <SectionTitle
            center
            eyebrow="The two-token architecture"
            title="KJAI for ecosystem utility · KPT for property interests"
            sub="Company equity, platform utility and property investment interests remain conceptually and legally distinct — the core separation principle of the KEJA blueprint."
          />
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {/* KJAI */}
            <div className="rounded-2xl bg-ink p-6 text-white">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-bold text-gold-300">
                  KJAI — Utility Token
                </h3>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/70">
                  1,000,000,000 planning supply
                </span>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-white/70">
                The ecosystem utility layer — never a speculative product. Premium AI access, fee
                benefits, developer services, ecosystem rewards and membership tiers where legally
                permitted. No promise of appreciation; utility tied to real customer activity.
              </p>
              <div className="mt-5 space-y-2.5">
                {[
                  ['Ecosystem & rewards', '25%', '250M'],
                  ['Treasury', '20%', '200M'],
                  ['Community', '15%', '150M'],
                  ['Strategic investors', '15%', '150M'],
                  ['Team & founders', '10%', '100M'],
                  ['Technology', '10%', '100M'],
                  ['Liquidity', '5%', '50M'],
                ].map(([label, pct]) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="w-36 shrink-0 text-[11px] text-white/70">{label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gold-gradient"
                        style={{ width: `${(Number(pct.replace('%', '')) / 25) * 100}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-[11px] font-bold text-gold-300">
                      {pct}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[10px] leading-relaxed text-white/40">
                Planning allocation — a design assumption that must be validated through legal,
                economic and market modelling before any issuance.
              </p>
            </div>

            {/* KPT */}
            <div className="rounded-2xl border-2 border-gold-300 bg-white p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-bold text-ink">
                  KPT — Property Investment Tokens
                </h3>
                <span className="rounded-full bg-gold-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gold-800">
                  Project-specific
                </span>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
                KPTs represent legally defined interests in specific property SPVs, funds, REITs or
                approved structures. The rights attached come from enforceable legal documents —
                never from the token itself.
              </p>
              <div className="mt-5 rounded-xl bg-gold-50 p-4 ring-1 ring-gold-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gold-700">
                  Illustrative example — KPT-NBO-001
                </p>
                <div className="mt-3 space-y-2 text-[12.5px]">
                  {[
                    ['Underlying asset', 'Income-generating Nairobi residential property'],
                    ['Illustrative value', 'KSh 500,000,000'],
                    ['Units', '500,000'],
                    ['Unit reference', 'KSh 1,000'],
                    ['Rights', 'Defined by the legal vehicle & offering documents'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4">
                      <span className="text-ink-muted">{k}</span>
                      <span className="text-right font-semibold text-ink">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  'Investor ownership records',
                  'Distributions',
                  'Transfers',
                  'Property performance',
                  'Valuations',
                  'Corporate actions',
                ].map((r) => (
                  <span
                    key={r}
                    className="rounded-lg bg-cream px-2.5 py-1.5 text-[11px] font-medium text-ink-soft ring-1 ring-gold-100"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* tokenization lifecycle */}
          <div className="mt-10">
            <SectionTitle
              center
              eyebrow="The lifecycle"
              title="From property selection to servicing — ten controlled steps"
            />
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                'Identify property',
                'Due diligence',
                'Legal structure (SPV)',
                'Classification & approvals',
                'Define investor rights',
                'Tokenize',
                'Onboard investors (KYC/AML)',
                'Operate & distribute',
                'Report',
                'Secondary transfers',
              ].map((s, i) => (
                <div
                  key={s}
                  className="rounded-xl border border-gold-100 bg-white p-3.5 text-center"
                >
                  <p className="font-display text-lg font-bold text-gold-400">
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold leading-snug text-ink-soft">{s}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-[11px] leading-relaxed text-ink-faint">
              Classification first. Licensing second. Issuance third — the regulatory-first
              operating sequence.
            </p>
          </div>
        </div>

        {/* glossary */}
        <div className="mt-12">
          <SectionTitle center eyebrow="Glossary" title="Six terms you will hear constantly" />
          <div className="mt-6 grid gap-3 grid-cols-1 sm:grid-cols-2">
            {GLOSSARY.map((g) => (
              <div key={g.t} className="rounded-xl border border-gold-100 bg-white p-4">
                <p className="text-[13px] font-bold text-gold-700">{g.t}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">{g.d}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-gold-200 bg-gold-50 p-6 text-[12.5px] leading-relaxed text-gold-700">
          <strong>Educational content, not financial advice.</strong> Keja Tokenize is a
          demonstration environment built for Chacadom Investments. Properties, tokens, valuations,
          distributions and ledger entries are simulated. Nothing here is an offer of securities.
          Speak to a licensed advisor before making investment decisions.
        </div>
      </section>
    </div>
  );
}
