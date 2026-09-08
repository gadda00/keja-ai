import { Bot, ChevronRight, Coins, Home, MoreHorizontal, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

/**
 * MobileTabBar — app-style bottom navigation for phones (and the Capacitor
 * Android/iOS shells). Five primary destinations; "More" opens a sheet with
 * the stakeholder workspaces and secondary routes. Respects the iOS safe
 * area inset; CompareBar and WhatsAppFloat lift above it (see their
 * bottom-* responsive classes).
 */

const PRIMARY = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/properties', label: 'Search', icon: Search, end: false },
  { to: '/ask', label: 'Ask AI', icon: Bot, end: false, center: true },
  { to: '/tokenize', label: 'Tokenize', icon: Coins, end: false },
];

const MORE_GROUPS = [
  {
    heading: 'Stakeholder tools',
    items: [
      { to: '/manage', label: 'Landlord Studio' },
      { to: '/tenant', label: 'Tenant Hub' },
      { to: '/diaspora', label: 'Diaspora Hub' },
      { to: '/pro', label: 'KEJA PRO' },
      { to: '/valuation', label: 'Valuation Desk' },
      { to: '/develop', label: 'Developer Console' },
    ],
  },
  {
    heading: 'More',
    items: [
      { to: '/invest', label: 'Investment calculators' },
      { to: '/dashboard', label: 'Sales dashboard' },
      { to: '/insights', label: 'Insights' },
      { to: '/partners', label: 'Partners' },
      { to: '/trust', label: 'Trust Center' },
      { to: '/account', label: 'Account' },
    ],
  },
];

export default function MobileTabBar() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();

  // close the sheet on navigation
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  // lock body scroll while the sheet is open
  useEffect(() => {
    document.body.style.overflow = moreOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [moreOpen]);

  const anyToolActive = MORE_GROUPS.some((g) =>
    g.items.some((it) => location.pathname.startsWith(it.to))
  );

  return (
    <>
      {moreOpen ? (
        <div
          className="fixed inset-0 z-[59] bg-ink/50 backdrop-blur-sm md:hidden"
          onClick={() => setMoreOpen(false)}
          aria-hidden="true"
        />
      ) : null}
      <div
        className={`fixed inset-x-0 bottom-0 z-[60] border-t border-gold-100 bg-white/97 backdrop-blur-md md:hidden ${
          moreOpen ? 'translate-y-0' : 'translate-y-0'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {moreOpen ? (
          <div
            role="dialog"
            aria-label="More navigation"
            className="max-h-[70vh] overflow-y-auto px-4 pb-2 pt-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="font-display text-lg font-bold text-ink">More</p>
              <button
                onClick={() => setMoreOpen(false)}
                className="rounded-lg p-1.5 text-ink-muted hover:bg-gold-50"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {MORE_GROUPS.map((group) => (
              <div key={group.heading} className="mb-3">
                <p className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wide2 text-ink-faint">
                  {group.heading}
                </p>
                {group.items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-ink-soft transition hover:bg-gold-50 active:bg-gold-50"
                  >
                    {item.label}
                    <ChevronRight className="h-4 w-4 text-ink-faint" aria-hidden />
                  </Link>
                ))}
              </div>
            ))}
          </div>
        ) : null}
        <nav
          className="flex h-16 items-stretch justify-around"
          aria-label="Mobile primary navigation"
        >
          {PRIMARY.map((item) => {
            const active = item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            if (item.center) {
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  aria-label={item.label}
                  className="relative flex w-16 flex-col items-center justify-center"
                >
                  <span
                    className={`-mt-5 flex h-12 w-12 items-center justify-center rounded-full shadow-gold-md transition ${
                      active ? 'bg-gold-gradient scale-105' : 'bg-gold-gradient'
                    }`}
                  >
                    <item.icon className="h-6 w-6 text-white" strokeWidth={2.2} />
                  </span>
                  <span
                    className={`mt-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      active ? 'text-gold-700' : 'text-ink-muted'
                    }`}
                  >
                    {item.label}
                  </span>
                </NavLink>
              );
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                aria-label={item.label}
                className="flex w-16 flex-col items-center justify-center gap-0.5"
              >
                <item.icon
                  className={`h-5 w-5 transition ${active ? 'text-gold-700' : 'text-ink-muted'}`}
                  strokeWidth={active ? 2.4 : 2}
                />
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide ${
                    active ? 'text-gold-700' : 'text-ink-muted'
                  }`}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            aria-label="More pages"
            aria-expanded={moreOpen}
            className="flex w-16 flex-col items-center justify-center gap-0.5"
          >
            <MoreHorizontal
              className={`h-5 w-5 ${moreOpen || anyToolActive ? 'text-gold-700' : 'text-ink-muted'}`}
              strokeWidth={moreOpen ? 2.4 : 2}
            />
            <span
              className={`text-[10px] font-bold uppercase tracking-wide ${
                moreOpen || anyToolActive ? 'text-gold-700' : 'text-ink-muted'
              }`}
            >
              More
            </span>
          </button>
        </nav>
      </div>
    </>
  );
}
