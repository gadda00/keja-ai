/**
 * Legal — Terms of Service & Privacy Policy (KEJA).
 * KDPA (Kenya Data Protection Act 2019)-aligned, honest about demo scope.
 */
import { AlertTriangle, Database, Lock, RefreshCw, Scale, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import { usePageMeta } from '@/lib/seo';

const SECTIONS = [
  {
    icon: Scale,
    title: '1. What Keja.ai is — and is not',
    paras: [
      'Keja.ai is a property discovery, verification and analysis platform operated by Chacadom Investments ("Keja", "we"). It aggregates listings from partner agencies, developer feeds, owner submissions and automated market ingestion, and layers trust scoring and investment analytics on top.',
      'Keja is a marketplace and an advisor — not a party to your transaction. We do not sell the properties listed, we do not hold your purchase funds (except viewing-fee escrow where offered), and we are not a licensed advocate, valuer, or regulated fund manager. Nothing on the platform is an offer of securities.',
    ],
  },
  {
    icon: AlertTriangle,
    title: '2. Scores and data: facts, estimates, assumptions',
    paras: [
      'Every trust score, Investment Score, yield estimate and price band is decision support, not a guarantee. We label verified facts, model estimates and assumptions separately and never blend them — but models can be wrong and market conditions change.',
      'Auto-Pilot listings are ingested and screened by code (duplicate detection, price-band anomaly screens, completeness checks). They are clearly labelled, their trust scores are capped, and title verification remains pending until human review. Always run independent, advocate-led due diligence before committing money.',
    ],
  },
  {
    icon: Users,
    title: '3. Accounts and acceptable use',
    paras: [
      'You may register with email or Google. You are responsible for keeping your credentials safe and for the accuracy of information you submit. Role assignments (user, agent, admin) are controlled by the platform; attempting to circumvent access controls is grounds for suspension.',
      'Do not submit listings you have no right to list, scrape or resell platform data, impersonate another person or agency, or use the platform for fraud. We cooperate with authorities on fraud reports.',
    ],
  },
  {
    icon: Database,
    title: '4. Listings, partners and third-party content',
    paras: [
      'Listings come from third parties (agencies, developers, owners, syndicated feeds). We screen them, but we do not independently own or control the underlying properties. Listing accuracy, pricing legality and title validity remain the responsibility of the listing party.',
      'Partner feeds are ingested automatically on a schedule. If a partner sends incorrect data, we correct or unpublish when detected — and our audit trail records every action.',
    ],
  },
  {
    icon: Lock,
    title: '5. Data protection (Kenya Data Protection Act 2019)',
    paras: [
      'We process personal data on the lawful bases of contract performance (accounts, viewing requests), legitimate interest (platform security, fraud prevention, audit logs) and consent (marketing communications, saved-search alerts you enable). We collect only what the product needs: identity and contact data, your saved searches and favourites, and the records of actions you take.',
      'In this demonstration build, all data is stored locally on your device (browser storage) — it never leaves your machine and is not transferred to our servers. In production, data is stored with Kenya-resident processors where feasible, encrypted in transit and at rest, retained only as long as necessary, and never sold.',
      'You may request access, correction, or deletion of your data at any time (privacy@keja.ai). You may also complain to the Office of the Data Protection Commissioner (ODPC).',
    ],
  },
  {
    icon: RefreshCw,
    title: '6. Changes and contact',
    paras: [
      'We may update these terms as the platform evolves; material changes will be announced in-app. Continued use after changes take effect constitutes acceptance.',
      'Questions: hello@keja.ai · Chacadom Investments, Westlands, Nairobi, Kenya.',
    ],
  },
];

export default function TermsPrivacy() {
  usePageMeta(
    'Terms of Service & Privacy Policy',
    'How Keja.ai operates: what scores mean, how listings are screened, your account responsibilities, and how we handle personal data under the Kenya Data Protection Act.'
  );
  return (
    <div className="bg-white">
      <section className="bg-ink py-16 sm:py-20">
        <div className="container-luxe">
          <p className="eyebrow text-gold-300">Legal — plain language</p>
          <h1 className="heading-display mt-3 text-3xl sm:text-4xl text-white">
            Terms of Service &amp; Privacy Policy
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/70">
            Last updated 30 August 2026. We wrote this to be readable, not to hide behind legalese.
            The short version: our scores are decision support, your data stays yours, and in this
            demo build everything is stored on your own device.
          </p>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-luxe max-w-3xl space-y-10">
          {SECTIONS.map((sec) => (
            <div key={sec.title} className="card-luxe p-6 sm:p-8">
              <h2 className="flex items-center gap-3 font-display text-xl font-bold text-ink">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-gradient shadow-gold-sm">
                  <sec.icon className="h-5 w-5 text-white" />
                </span>
                {sec.title}
              </h2>
              <div className="mt-4 space-y-3">
                {sec.paras.map((p, i) => (
                  <p key={i} className="text-sm leading-relaxed text-ink-soft">
                    {p}
                  </p>
                ))}
              </div>
            </div>
          ))}

          <div className="rounded-2xl bg-gold-50 p-6 ring-1 ring-gold-200">
            <p className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-soft">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" />
              Keja Tokenize is a demonstration environment. Tokens, valuations, yields and
              distributions shown there are simulated — no securities are offered, and no real
              blockchain transactions occur. See the Learn tab inside Tokenize for how a regulated
              launch would work.
            </p>
          </div>

          <p className="text-center text-sm text-ink-muted">
            Questions about these terms?{' '}
            <Link to="/contact" className="font-semibold text-gold-700">
              Talk to us →
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
