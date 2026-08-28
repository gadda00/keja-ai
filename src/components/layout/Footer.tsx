import { Link } from 'react-router-dom'
import { Home, Mail, Phone, MapPin, ShieldCheck } from 'lucide-react'
import { SITE, whatsappLink } from '@/config'

export default function Footer() {
  return (
    <footer className="border-t border-gold-100 bg-ink text-white/80">
      <div className="container-luxe grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-gradient">
              <Home className="h-5 w-5 text-white" strokeWidth={2.2} />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-display text-xl font-bold text-white">
                Keja<span className="gold-text">.ai</span>
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-wide2 text-gold-300">by Chacadom</span>
            </span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            {SITE.tagline} Kenya’s AI real-estate advisor and cross-agency trust layer — discovery, advisory,
            verification and management in one flow.
          </p>
          <p className="mt-3 text-xs italic text-gold-300/80">{SITE.swahiliNote}</p>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide2 text-gold-400">Platform</h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link to="/properties" className="hover:text-gold-300">Buy Property</Link></li>
            <li><Link to="/properties?purpose=rent" className="hover:text-gold-300">Rent Property</Link></li>
            <li><Link to="/invest" className="hover:text-gold-300">Investment Calculator</Link></li>
            <li><Link to="/ask" className="hover:text-gold-300">Ask Keja AI</Link></li>
            <li><Link to="/dashboard" className="hover:text-gold-300">Agent Dashboard</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide2 text-gold-400">Trust & Company</h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link to="/trust" className="hover:text-gold-300">Trust Center</Link></li>
            <li><Link to="/trust#score" className="hover:text-gold-300">How Trust Scores Work</Link></li>
            <li><Link to="/about" className="hover:text-gold-300">About Keja.ai</Link></li>
            <li><Link to="/insights" className="hover:text-gold-300">Market Insights</Link></li>
            <li><Link to="/manage" className="hover:text-gold-300">List & Manage</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide2 text-gold-400">Contact</h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gold-400" />
              <a href={`tel:${SITE.phone.replace(/\s/g, '')}`} className="hover:text-gold-300">{SITE.phone}</a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gold-400" />
              <a href={`mailto:${SITE.email}`} className="hover:text-gold-300">{SITE.email}</a>
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gold-400" />
              {SITE.offices}
            </li>
            <li>
              <a
                href={whatsappLink('Hello Keja! I have a question about property.')}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-emerald-600/90 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                Chat on WhatsApp
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-luxe flex flex-col items-center justify-between gap-3 py-5 text-xs text-white/50 sm:flex-row">
          <p>© {new Date().getFullYear()} Keja.ai — a Chacadom Investments venture. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-gold-400" />
            We don’t just list property. We tell you which listings you can trust.
          </p>
        </div>
      </div>
    </footer>
  )
}
