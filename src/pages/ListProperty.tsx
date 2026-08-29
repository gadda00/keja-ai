import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, TrendingUp, BadgeCheck, Camera, FileSearch, Rocket, CheckCircle2, ChevronRight, Bot } from 'lucide-react'

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6 },
}

const STEPS = [
  {
    icon: FileSearch,
    title: 'Submit your property',
    text: 'Share the basics: location, size, asking price, photos, and any existing documents (title, approvals, tenancy schedules for income property). Takes about ten minutes.',
  },
  {
    icon: Camera,
    title: 'Keja verifies it',
    text: 'Title cross-check, photo authenticity, pricing benchmarking against the market band, duplicate scan. We may request an on-site visit for premium or off-plan listings.',
  },
  {
    icon: BadgeCheck,
    title: 'Get the Verified badge',
    text: 'Verified listings earn the badge, rank higher in search, and sell faster at fairer prices — because buyers can see exactly why your listing deserves trust.',
  },
  {
    icon: Rocket,
    title: 'Keja markets it — everywhere',
    text: 'Your property enters the AI recommendation engine: matched to qualified buyers in chat, on WhatsApp, and across every agency channel in the network. You get weekly performance reports.',
  },
]

export default function ListProperty() {
  const [form, setForm] = useState({ name: '', phone: '', property: '', type: 'apartment', area: '', price: '' })
  const [sent, setSent] = useState(false)

  return (
    <div>
      <section className="bg-ink py-20 sm:py-24">
        <div className="container-luxe max-w-3xl text-center">
          <p className="eyebrow !text-gold-400">Sell with Keja</p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
            Verified listings sell <span className="gold-text">faster & fairer</span>
          </h1>
          <p className="mt-6 leading-relaxed text-white/65">
            The Verified by Keja badge tells buyers your property has passed real checks — titles, photos, pricing.
            In a market scarred by fraud, that badge is the strongest marketing you can buy. And it can’t be
            bought; it’s earned.
          </p>
        </div>
      </section>

      {/* steps */}
      <section className="section-pad bg-white">
        <div className="container-luxe grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <motion.div key={s.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.07 }} className="card-luxe p-6">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-gradient shadow-gold-sm">
                  <s.icon className="h-5 w-5 text-white" />
                </span>
                <span className="font-display text-3xl font-bold text-gold-200">0{i + 1}</span>
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{s.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* pricing & form */}
      <section className="section-pad bg-cream">
        <div className="container-luxe grid gap-10 grid-cols-1 lg:grid-cols-2">
          <motion.div {...fadeUp}>
            <p className="eyebrow">Transparent pricing</p>
            <h2 className="heading-display mt-3 text-3xl sm:text-4xl">No sale, no fee. Ever.</h2>
            <div className="mt-8 space-y-4">
              {[
                { name: 'Verification & badge', price: 'Free', note: 'Title check, photo scan, pricing benchmark — free for every listing.' },
                { name: 'Standard sale', price: '2.5%', note: 'Paid on completion. Includes AI matching, escorted viewings, escrowed deposits and closing support.' },
                { name: 'Premium / luxury stock', price: 'Custom', note: 'Dedicated marketing, drone media, investor-targeted distribution through Chacadom’s network.' },
                { name: 'Landlords — management', price: '8% of rent', note: 'Tenant sourcing, M-Pesa rent collection, maintenance, monthly owner statements.' },
              ].map((r) => (
                <div key={r.name} className="card-luxe flex items-start justify-between gap-6 p-5">
                  <div>
                    <p className="font-display text-lg font-semibold text-ink">{r.name}</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-muted">{r.note}</p>
                  </div>
                  <p className="shrink-0 font-display text-xl font-bold text-gold-600">{r.price}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-gold-50 p-5">
              <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" />
              <p className="text-sm leading-relaxed text-ink-soft">
                <b>Why verified sells faster:</b> buyers shortlist listings they can trust. On Keja, a 90+ trust score
                puts your property in the AI’s top recommendations to qualified buyers — automatically.
              </p>
            </div>
          </motion.div>

          <motion.div {...fadeUp} className="card-luxe p-6 sm:p-8">
            {sent ? (
              <div className="py-12 text-center">
                <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
                <h3 className="mt-4 font-display text-2xl font-bold text-ink">Submission received</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
                  Our verification team will call you within one business day to start the title check. Welcome to the
                  verified network — let’s get your property sold properly.
                </p>
                <Link to="/properties" className="btn-gold mt-6">See what verified looks like</Link>
              </div>
            ) : (
              <>
                <h3 className="font-display text-xl font-bold text-ink">List your property</h3>
                <p className="mt-1.5 text-sm text-ink-muted">Start the verification journey today.</p>
                <form
                  className="mt-6 space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault()
                    setSent(true)
                  }}
                >
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <div>
                      <label className="label-luxe">Your name *</label>
                      <input required className="input-luxe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Wanjiku" />
                    </div>
                    <div>
                      <label className="label-luxe">Phone *</label>
                      <input required className="input-luxe" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+254 7XX XXX XXX" />
                    </div>
                  </div>
                  <div>
                    <label className="label-luxe">Property title / short description *</label>
                    <input required className="input-luxe" value={form.property} onChange={(e) => setForm({ ...form, property: e.target.value })} placeholder="e.g. 3BR apartment, fitted kitchen, 4th floor" />
                  </div>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                    <div>
                      <label className="label-luxe">Type</label>
                      <select className="input-luxe" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                        <option value="apartment">Apartment</option>
                        <option value="villa">Villa</option>
                        <option value="townhouse">Townhouse</option>
                        <option value="bungalow">Bungalow</option>
                        <option value="land">Land</option>
                        <option value="commercial">Commercial</option>
                      </select>
                    </div>
                    <div>
                      <label className="label-luxe">Area *</label>
                      <input required className="input-luxe" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="e.g. Kilimani" />
                    </div>
                    <div>
                      <label className="label-luxe">Asking price (KES) *</label>
                      <input required type="number" className="input-luxe" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="e.g. 12500000" />
                    </div>
                  </div>
                  <button type="submit" className="btn-gold w-full">
                    <Home className="h-4 w-4" /> Start verification
                  </button>
                  <p className="text-center text-[11px] leading-relaxed text-ink-faint">
                    Submitting does not create a public listing. Verification comes first — always.
                  </p>
                </form>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* manage teaser */}
      <section className="bg-ink py-16">
        <div className="container-luxe flex flex-col items-center gap-6 text-center lg:flex-row lg:text-left">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gold-gradient shadow-gold-lg">
            <Bot className="h-8 w-8 text-white" />
          </span>
          <div className="flex-1">
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">Property doesn’t end at the sale</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
              Tenants, rent collection, maintenance, owner statements — Keja’s management desk keeps income
              properties income-producing. M-Pesa-native, Airbnb-capable, boringly reliable.
            </p>
          </div>
          <Link to="/manage" className="btn-gold shrink-0">
            Explore management <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
