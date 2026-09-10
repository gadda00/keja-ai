'use client';
/**
 * App-style bottom tab bar (mobile + the Capacitor shells).
 * Five primary destinations; the full ecosystem lives behind the hamburger.
 */
import { BarChart3, Coins, Home, Search, Sparkles, User } from 'lucide-react';
import { Link, useRouter } from '@/lib/router';
import { cn } from '@/lib/utils';

const TABS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/properties', icon: Search, label: 'Discover' },
  { to: '/ask', icon: Sparkles, label: 'Ask AI' },
  { to: '/tokenize', icon: Coins, label: 'Token' },
  { to: '/account', icon: User, label: 'Account' },
];

export function MobileTabBar() {
  const { section, route } = useRouter();
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
              ariaLabel={tab.label}
              ariaCurrent={active}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-wide transition-colors',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <tab.icon className={cn('h-5 w-5', active && 'drop-shadow-sm')} aria-hidden />
              {tab.label}
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
