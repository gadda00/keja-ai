'use client';
/**
 * App-style bottom tab bar (mobile + the Capacitor shells).
 * Five primary destinations; the full ecosystem lives behind the hamburger.
 */
import { Coins, Home, Search, Sparkles, User } from 'lucide-react';
import { Link, useRouter } from '@/lib/router';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface Tab {
  to: string;
  icon: typeof Home;
  /** i18n dictionary key */
  k: string;
}
const TABS: Tab[] = [
  { to: '/', icon: Home, k: 'nav.home' },
  { to: '/properties', icon: Search, k: 'nav.discover' },
  { to: '/ask', icon: Sparkles, k: 'nav.ask' },
  { to: '/tokenize', icon: Coins, k: 'nav.token' },
  { to: '/account', icon: User, k: 'nav.account' },
];

export function MobileTabBar() {
  const { route } = useRouter();
  const { t } = useI18n();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/92 pb-safe backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {TABS.map((tab) => {
          const active =
            tab.to === '/' ? route.path === '/' : route.path.startsWith(tab.to);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              ariaLabel={t(tab.k)}
              ariaCurrent={active}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-wide transition-colors',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <tab.icon className={cn('h-5 w-5', active && 'drop-shadow-sm')} aria-hidden />
              {t(tab.k)}
              <span
                className={cn(
                  'h-0.5 w-6 rounded-full transition-all',
                  active ? 'bg-gold' : 'bg-transparent',
                )}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
