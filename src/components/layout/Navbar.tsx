import {
  Building2,
  ChevronDown,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  ShieldCheck,
  UserCircle2,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';

import NotificationBell from '@/components/layout/NotificationBell';
import { initials, useAuth } from '@/lib/auth';

const NAV = [
  { to: '/properties', label: 'Buy & Rent' },
  { to: '/invest', label: 'Invest' },
  { to: '/tokenize', label: 'Tokenize', highlight: true },
  { to: '/partners', label: 'Partners' },
  { to: '/ask', label: 'Ask Keja AI' },
  { to: '/trust', label: 'Trust Center' },
  { to: '/insights', label: 'Insights' },
];

/** Stakeholder workspaces under the "Tools" dropdown (desktop) and the
    mobile menu (all items listed flat). Routes re-assert the demo banner. */
const TOOL_GROUPS = [
  {
    heading: 'Own & rent',
    items: [
      { to: '/manage', label: 'Landlord Studio', desc: 'Units, tenants, rent ledger' },
      { to: '/tenant', label: 'Tenant Hub', desc: 'Applications & move-in tools' },
      { to: '/diaspora', label: 'Diaspora Hub', desc: 'Buy from abroad, PoA & FX' },
    ],
  },
  {
    heading: 'Professionals',
    items: [
      { to: '/pro', label: 'KEJA PRO', desc: 'CMA builder, listing writer, leads' },
      { to: '/valuation', label: 'Valuation Desk', desc: 'Indicative comparables band' },
      { to: '/develop', label: 'Developer Console', desc: 'Feasibility & cashflow' },
    ],
  },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, logout, setAuthModalOpen } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setToolsOpen(false);
  }, [location.pathname]);

  // close menus on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setMenuOpen(false);
        setToolsOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // close avatar + tools menus on outside click
  useEffect(() => {
    if (!menuOpen && !toolsOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) setToolsOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen, toolsOpen]);

  const anyToolActive = TOOL_GROUPS.some((g) =>
    g.items.some((it) => location.pathname.startsWith(it.to))
  );

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    void navigate('/');
  };

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
          {NAV.slice(0, 3).map((item) => (
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

          {/* Stakeholder workspaces dropdown */}
          <div className="relative" ref={toolsRef}>
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
                toolsOpen || anyToolActive
                  ? 'bg-gold-50 text-gold-700'
                  : 'text-ink-soft hover:bg-gold-50/60 hover:text-gold-700'
              }`}
              aria-label="Stakeholder tools menu"
              aria-expanded={toolsOpen}
              aria-haspopup="true"
            >
              Tools
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${toolsOpen ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
            {toolsOpen ? (
              <div className="absolute left-1/2 z-50 mt-2 w-[26rem] -translate-x-1/2 overflow-hidden rounded-xl bg-white shadow-card-hover ring-1 ring-gold-200">
                {TOOL_GROUPS.map((group, gi) => (
                  <div
                    key={group.heading}
                    className={gi === 0 ? 'p-2' : 'border-t border-gold-100 p-2'}
                  >
                    <p className="px-2 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wide2 text-ink-faint">
                      {group.heading}
                    </p>
                    {group.items.map((tool) => (
                      <NavLink
                        key={tool.label}
                        to={tool.to}
                        onClick={() => setToolsOpen(false)}
                        className={({ isActive }) =>
                          `block rounded-lg px-2.5 py-2 transition ${
                            isActive ? 'bg-gold-50' : 'hover:bg-gold-50/60'
                          }`
                        }
                      >
                        <span className="block text-sm font-semibold text-ink">{tool.label}</span>
                        <span className="block text-xs text-ink-muted">{tool.desc}</span>
                      </NavLink>
                    ))}
                  </div>
                ))}
                <div className="border-t border-gold-100 bg-gold-50/40 px-3 py-2 text-[11px] text-ink-muted">
                  One workspace per stakeholder — all demo data stays in your browser.
                </div>
              </div>
            ) : null}
          </div>

          {NAV.slice(3).map((item) => (
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
              {menuOpen ? (
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
                    {isAdmin ? (
                      <Link
                        to="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gold-700 transition hover:bg-gold-50"
                      >
                        <Settings2 className="h-4 w-4" /> Admin Console
                      </Link>
                    ) : null}
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
              ) : null}
            </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="btn-dark !px-4 !py-2 !text-xs"
            >
              Sign in
            </button>
          )}
          <NotificationBell />
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

      {open ? (
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
            <div className="mt-3 border-t border-gold-100 pt-2">
              <p className="px-4 pb-1 text-[10px] font-bold uppercase tracking-wide2 text-ink-faint">
                Stakeholder tools
              </p>
              {TOOL_GROUPS.flatMap((g) => g.items).map((tool) => (
                <NavLink
                  key={tool.label}
                  to={tool.to}
                  className={({ isActive }) =>
                    `flex items-baseline justify-between rounded-lg px-4 py-2.5 ${
                      isActive ? 'bg-gold-50 text-gold-700' : 'text-ink-soft hover:bg-gold-50/60'
                    }`
                  }
                >
                  <span className="text-sm font-semibold">{tool.label}</span>
                  <span className="ml-2 truncate text-[11px] text-ink-muted">{tool.desc}</span>
                </NavLink>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              {user ? (
                <>
                  <Link to="/account" className="btn-outline flex-1 !py-2.5 !text-xs">
                    Account ({user.name.split(' ')[0]})
                  </Link>
                  {isAdmin ? (
                    <Link to="/admin" className="btn-dark flex-1 !py-2.5 !text-xs">
                      Admin
                    </Link>
                  ) : null}
                  <button
                    onClick={handleLogout}
                    className="btn-outline !px-4 !py-2.5 !text-xs !text-red-600"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setOpen(false);
                    setAuthModalOpen(true);
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
      ) : null}
    </header>
  );
}
