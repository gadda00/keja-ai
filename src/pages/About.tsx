import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Target, Eye, HeartHandshake, ShieldCheck, Bot, Building2, ChevronRight, Globe2 } from 'lucide-react'
import { asset } from '@/config'

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6 },
}

export default function About() {
  return (
    <div>
      <section className="bg-ink py-20 sm:py-24">
        <div className="container-luxe max-w-3xl text-center">
          <p className="eyebrow !text-gold-400">About Keja.ai</p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
            &ldquo;Keja&rdquo; is Swahili for <span className="gold-text">home</span>.
          </h1>
          <p className="mt-6 leading-relaxed text-white/65">
            Keja.ai is Kenya’s AI real-estate advisor and cross-agency trust layer — built by Chacadom Investments
            to help people discover, evaluate, buy, sell, rent and manage property with confidence, across multiple
            agencies and developers, not just one.
          </p>
        </div>
      </section>

      <section className="section-pad bg-white">
        <div className="container-luxe grid gap-6 grid-cols-1 md:grid-cols-3">
          {[
            {
              icon: Target,
              title: 'Our mission',
              text: 'Turn property information into intelligent investment decisions — and turn qualified prospects into confident real-estate clients. We don’t just find you a home; we help you build a legacy.',
            },
            {
              icon: Eye,
              title: 'Our vision',
              text: 'To become the trust and intelligence layer that every agency, developer and buyer in East Africa routes through — connecting discovery, advisory, verification, transaction and management in one flow.',
            },
            {
              icon: HeartHandshake,
              title: 'Our values',
              text: 'Trust first, premium second. Transparent facts, clearly labelled estimates, sound investment logic, and a professional client experience — across every agency on the platform.',
            },
          ].map((c) => (
            <motion.div key={c.title} {...fadeUp} className="card-luxe p-7">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-gradient shadow-gold-sm">
                <c.icon className="h-6 w-6 text-white" />
              </span>
              <h3 className="mt-4 font-display text-xl font-semibold text-ink">{c.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-ink-muted">{c.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* what makes us different */}
      <section className="section-pad bg-cream">
        <div className="container-luxe grid items-center gap-12 lg:grid-cols-2">
          <motion.div {...fadeUp}>
            <p className="eyebrow">Why we exist</p>
            <h2 className="heading-display mt-3 text-3xl sm:text-4xl">
              Kenyan real estate runs on trust. Trust was missing.
            </h2>
            <div className="mt-6 space-y-4 leading-relaxed text-ink-soft">
              <p>
                Fraudulent listings, title disputes, recycled photos, &ldquo;urgent sale&rdquo; bait — these are daily
                realities in Kenya’s property market, and they cost real families real money. Diaspora buyers,
                who cannot walk the land themselves, carry the heaviest risk of all.
              </p>
              <p>
                A chatbot owned by one developer can never solve this — it can’t warn you about its own
                inventory. The only honest advisor sits above every seller: cross-checking titles, scoring agents,
                catching duplicates, and telling you plainly which listings deserve your money.
              </p>
              <p>
                That is Keja. An AI advisor with a spine — warm and professional, but never pushy; confident about
                verified facts, explicit about assumptions; consistent across every partner agency, because Keja is
                the constant and agencies are the inventory.
              </p>
            </div>
          </motion.div>

          <motion.div {...fadeUp} className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {[
              { icon: Bot, title: 'AI-native', text: 'Conversational discovery, investment intelligence and verification — not a listings board with a chat bolted on.' },
              { icon: ShieldCheck, title: 'Trust as product', text: 'The Verified by Keja badge is earned through checks, not paid placements. Fraud we catch is published.' },
              { icon: Building2, title: 'Multi-agency', text: 'Neutral recommendations across agencies — the structural moat no single-brand advisor can replicate.' },
              { icon: Globe2, title: 'East Africa first', text: 'Built for Kenya, designed for the region: Swahili from day one, French for regional expansion, diaspora-ready.' },
            ].map((c) => (
              <div key={c.title} className="card-luxe p-6">
                <c.icon className="h-6 w-6 text-gold-600" />
                <h3 className="mt-3 font-display text-lg font-semibold text-ink">{c.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{c.text}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* parent company */}
      <section className="bg-ink">
        <div className="container-luxe flex flex-col items-center gap-8 py-16 lg:flex-row">
          <img src={asset('/brand/chacadom-logo.jpg')} alt="Chacadom Investments" className="h-36 w-36 rounded-2xl object-cover shadow-gold-lg" />
          <div className="max-w-2xl text-center lg:text-left">
            <p className="eyebrow !text-gold-400">A Chacadom Investments venture</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-white">Building wealth through real estate excellence</h2>
            <p className="mt-3 leading-relaxed text-white/60">
              Chacadom Investments — Vision · Value · Growth · Legacy — develops, advises on and manages real estate
              across Kenya. Keja.ai is its digital flagship: where Chacadom’s market knowledge meets AI-native
              product craft. We don’t sell property; we help people make better property decisions.
            </p>
            <Link to="/contact" className="btn-gold mt-6">
              Partner with us <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
