import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, ShieldCheck, Home, LayoutDashboard, LogOut, Settings2, UserCircle2, Building2 } from 'lucide-react'
import { SITE } from '@/config'
import { useAuth, initials } from '@/lib/auth'

const NAV = [
  { to: '/properties', label: 'Buy & Rent' },
  { to: '/invest', label: 'Invest' },
  { to: '/tokenize', label: 'Tokenize', highlight: true },
  { to: '/partners', label: 'Partners' },
  { to: '/ask', label: 'Ask Keja AI' },
  { to: '/trust', label: 'Trust Center' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/insights', label: 'Insights' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isAdmin, logout, setAuthModalOpen } = useAuth()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [location.pathname])

  // close menus on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setMenuOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // close avatar menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  const handleLogout = () => {
    setMenuOpen(false)
    logout()
    navigate('/')
  }

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
            <span className="text-[9px] font-semibold uppercase tracking-wide2 text-ink-muted">
              by Chacadom
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Main navigation">
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
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-full border border-gold-200 bg-gold-50/60 py-1 pl-1 pr-3 transition hover:border-gold-400 hover:bg-gold-50"
                aria-label="Account menu"
                aria-expanded={menuOpen}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-gradient text-xs font-bold text-white"
                  aria-hidden="true"
                >
                  {initials(user.name)}
                </span>
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block max-w-[110px] truncate text-xs font-semibold text-ink">
                    {user.name.split(' ')[0]}
                  </span>
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-gold-700">
                    {user.role}
                  </span>
                </span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl bg-white shadow-card-hover ring-1 ring-gold-200">
                  <div className="border-b border-gold-100 bg-gold-50/50 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                    <p className="truncate text-xs text-ink-muted">{user.email}</p>
                  </div>
                  <div className="flex flex-col p-1.5">
                    <Link
                      to="/account"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-soft transition hover:bg-gold-50 hover:text-gold-700"
                    >
                      <UserCircle2 className="h-4 w-4 text-gold-600" /> My Account
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gold-700 transition hover:bg-gold-50"
                      >
                        <Settings2 className="h-4 w-4" /> Admin Console
                      </Link>
                    )}
                    <Link
                      to="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-soft transition hover:bg-gold-50 hover:text-gold-700"
                    >
                      <LayoutDashboard className="h-4 w-4 text-gold-600" /> Sales Dashboard
                    </Link>
                    <Link
                      to="/partners"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-soft transition hover:bg-gold-50 hover:text-gold-700"
                    >
                      <Building2 className="h-4 w-4 text-gold-600" /> List with Keja
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="btn-dark !px-4 !py-2 !text-xs"
            >
              Sign in
            </button>
          )}
          <Link to="/ask" className="btn-gold !px-4 !py-2">
            Ask Keja
          </Link>
        </div>

        <button
          className="rounded-lg p-2 text-ink hover:bg-gold-50 xl:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
          aria-controls="mobile-nav"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div id="mobile-nav" className="border-t border-gold-100 bg-white px-4 pb-4 pt-2 xl:hidden">
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
            <div className="mt-2 flex gap-2">
              {user ? (
                <>
                  <Link to="/account" className="btn-outline flex-1 !py-2.5 !text-xs">
                    Account ({user.name.split(' ')[0]})
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" className="btn-dark flex-1 !py-2.5 !text-xs">
                      Admin
                    </Link>
                  )}
                  <button onClick={handleLogout} className="btn-outline !px-4 !py-2.5 !text-xs !text-red-600">
                    <LogOut className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setOpen(false)
                    setAuthModalOpen(true)
                  }}
                  className="btn-dark flex-1 !py-2.5 !text-xs"
                >
                  Sign in
                </button>
              )}
            </div>
            <Link to="/ask" className="btn-gold mt-2 w-full">
              Ask Keja AI
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
