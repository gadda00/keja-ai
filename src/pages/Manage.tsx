import { m } from 'framer-motion';
import {
  ArrowRight,
  Bot,
  Building2,
  CalendarClock,
  CheckCircle2,
  FileBarChart,
  KeyRound,
  MessageCircle,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { asset } from '@/config';
import { usePageMeta } from '@/lib/seo';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6 },
};

export default function Manage() {
  usePageMeta(
    'Keja Manage — Landlords & Property Managers',
    'Tenant communication, maintenance, rental analytics and occupancy reporting in one place.'
  );
  return (
    <div>
      <section className="bg-ink py-20 sm:py-24">
        <div className="container-luxe max-w-3xl text-center">
          <p className="eyebrow !text-gold-400">Property management</p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
            Your property, <span className="gold-text">professionally boring</span>
          </h1>
          <p className="mt-6 leading-relaxed text-white/65">
            The best property management is the kind you never notice: tenants pay on time, issues
            get fixed before you hear about them, and your statement lands monthly like clockwork.
            That’s the Keja standard — M-Pesa-native, Airbnb-capable, boringly reliable.
          </p>
        </div>
      </section>

      {/* services */}
      <section className="section-pad bg-white">
        <div className="container-luxe grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: KeyRound,
              title: 'Tenant sourcing & screening',
              text: 'Qualified tenants from the Keja network — employment checks, references, and rent-affordability scoring before they ever see your unit. Long-tenancy family and corporate segments prioritised.',
            },
            {
              icon: MessageCircle,
              title: 'Rent collection (M-Pesa-native)',
              text: 'Automated rent reminders, M-Pesa collection, and same-month arrears escalation. Late rent is chased politely, persistently, and documented — so you never have to.',
            },
            {
              icon: Wrench,
              title: 'Maintenance & repairs',
              text: 'Vetted contractors, pooled pricing, and a maintenance SLA. Emergency issues are handled first and reported after; everything else is quoted and approved by you.',
            },
            {
              icon: Sparkles,
              title: 'Airbnb & short-stay management',
              text: 'Guest communication, dynamic pricing, cleaning turnover and restocking for short-stay units. We report both occupancy and revenue — and tell you honestly whether Airbnb beats a long lease.',
            },
            {
              icon: CalendarClock,
              title: 'Occupancy monitoring',
              text: 'Live occupancy dashboards, lease-expiry tracking and renewal management. Vacancy is the silent killer of returns; our job is making it rare and short.',
            },
            {
              icon: FileBarChart,
              title: 'Owner statements',
              text: 'Monthly statements: rent collected, expenses, arrears status, and portfolio performance. Annual summaries ready for your accountant. No surprises, ever.',
            },
          ].map((s, i) => (
            <m.div
              key={s.title}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.05 }}
              className="card-luxe card-luxe-hover p-6"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-gradient shadow-gold-sm">
                <s.icon className="h-6 w-6 text-white" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{s.text}</p>
            </m.div>
          ))}
        </div>
      </section>

      {/* pricing */}
      <section className="section-pad bg-cream">
        <div className="container-luxe grid items-center gap-12 lg:grid-cols-2">
          <m.div {...fadeUp}>
            <p className="eyebrow">Simple, honest fees</p>
            <h2 className="heading-display mt-3 text-3xl sm:text-4xl">
              One line of math you’ll like
            </h2>
            <div className="mt-8 space-y-3">
              {[
                'Long-let management: 8% of collected rent — nothing when nothing is collected.',
                'Short-stay / Airbnb: from 15%, all-inclusive of guest handling and turnovers.',
                'Letting only (find the tenant): one month’s rent, once.',
                'Furnishing packages for landlords: staged, financed, and rent-optimised.',
              ].map((p) => (
                <div
                  key={p}
                  className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gold-100"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" />
                  <p className="text-sm leading-relaxed text-ink-soft">{p}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl bg-ink p-6">
              <Building2 className="h-6 w-6 text-gold-400" />
              <p className="mt-2 font-display text-lg font-semibold text-white">Portfolio owners</p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/60">
                Managing 5+ units? Chacadom’s portfolio desk builds you a consolidated asset plan —
                yields, capex priorities, divest/refinance signals — on top of day-to-day
                management.
              </p>
            </div>
          </m.div>

          <m.div {...fadeUp} className="card-luxe overflow-hidden">
            <img
              src={asset('/images/props/interior_0.jpg')}
              alt="Managed apartment interior"
              className="h-64 w-full object-cover"
            />
            <div className="p-6">
              <h3 className="font-display text-xl font-bold text-ink">What owners see, monthly</h3>
              <div className="mt-4 space-y-2.5 text-sm">
                {[
                  ['Rent collected', 'KES 110,000'],
                  ['Occupancy (rolling 12m)', '89%'],
                  ['Maintenance spend', 'KES 8,400'],
                  ['Management fee (8%)', 'KES 8,800'],
                  ['Net to owner', 'KES 92,800'],
                  ['Arrears', 'None — tenant A+'],
                ].map(([k, v]) => (
                  <p
                    key={k}
                    className="flex items-center justify-between border-b border-gold-100 pb-2.5"
                  >
                    <span className="text-ink-muted">{k}</span>
                    <b className="text-ink">{v}</b>
                  </p>
                ))}
              </div>
              <Link to="/contact" className="btn-gold mt-6 w-full">
                Get a management quote
              </Link>
            </div>
          </m.div>
        </div>
      </section>

      <section className="bg-ink py-16">
        <div className="container-luxe flex flex-col items-center gap-6 text-center lg:flex-row lg:text-left">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gold-gradient shadow-gold-lg">
            <Bot className="h-8 w-8 text-white" />
          </span>
          <div className="flex-1">
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
              Buying first? Start with the math.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
              The best-managed property still starts as the best-bought property. Run the numbers
              before you commit.
            </p>
          </div>
          <Link to="/invest" className="btn-gold shrink-0">
            Open the calculator <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
