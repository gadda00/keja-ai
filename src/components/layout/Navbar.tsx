import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Menu, X, ShieldCheck, Home } from 'lucide-react'
import { SITE } from '@/config'

const NAV = [
  { to: '/properties', label: 'Buy & Rent' },
  { to: '/invest', label: 'Invest' },
  { to: '/tokenize', label: 'Tokenize', highlight: true },
  { to: '/ask', label: 'Ask Keja AI' },
  { to: '/trust', label: 'Trust Center' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/insights', label: 'Insights' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [location.pathname])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 shadow-card backdrop-blur-md' : 'bg-white/80 backdrop-blur-sm'
      } border-b border-gold-100`}
    >
      <div className="container-luxe flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-gradient shadow-gold-sm">
            <Home className="h-5 w-5 text-white" strokeWidth={2.2} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-xl font-bold tracking-tight text-ink">
              Keja<span className="gold-text">.ai</span>
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-wide2 text-ink-muted">by Chacadom</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main navigation">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-gold-50 text-gold-700'
                    : item.highlight
                      ? 'text-gold-700 hover:bg-gold-50/60'
                      : 'text-ink-soft hover:bg-gold-50/60 hover:text-gold-700'
                }`
              }
            >
              {item.highlight ? (
                <span className="inline-flex items-center gap-1.5">
                  {item.label}
                  <span className="rounded-full bg-gold-gradient px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-white">
                    New
                  </span>
                </span>
              ) : (
                item.label
              )}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            to="/trust"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-gold-700"
          >
            <ShieldCheck className="h-4 w-4 text-gold-600" />
            Verified inventory only
          </Link>
          <Link to="/ask" className="btn-gold !px-4 !py-2">
            Ask Keja
          </Link>
        </div>

        <button
          className="rounded-lg p-2 text-ink hover:bg-gold-50 lg:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-gold-100 bg-white px-4 pb-4 pt-2 lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-lg px-4 py-2.5 text-sm font-medium ${
                    isActive ? 'bg-gold-50 text-gold-700' : 'text-ink-soft hover:bg-gold-50/60'
                  }`
                }
              >
                {item.highlight ? (
                  <span className="inline-flex items-center gap-1.5">
                    {item.label}
                    <span className="rounded-full bg-gold-gradient px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-white">
                      New
                    </span>
                  </span>
                ) : (
                  item.label
                )}
              </NavLink>
            ))}
            <Link to="/ask" className="btn-gold mt-2 w-full">
              Ask Keja AI
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
