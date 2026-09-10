'use client';
/**
 * Top navigation — Keja AI.
 * Sticky glass bar with the ecosystem mega-menu (nine products), search,
 * language switcher, theme toggle and account entry. App-style on mobile.
 */
import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  ChevronDown,
  Globe,
  Menu,
  Moon,
  Search,
  Sun,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Link, useRouter } from '@/lib/router';
import { ECOSYSTEM, PORTALS } from '@/lib/ecosystem';
import { LANGUAGES, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

function Wordmark() {
  return (
    <Link to="/" className="flex items-center gap-2.5" ariaLabel="Keja AI home">
      <img src="/favicon.svg" alt="" className="h-9 w-9" />
      <span className="flex flex-col leading-none">
        <span className="text-lg font-bold tracking-tight">
          Keja<span className="text-gold"> AI</span>
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Chacadom Investments
        </span>
      </span>
    </Link>
  );
}

function StatusChip({ status }: { status: 'LIVE' | 'TRIAL' | 'PILOT' }) {
  return (
    <span
      className={cn(
        'rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider',
        status === 'LIVE' && 'bg-primary/10 text-primary',
        status === 'TRIAL' && 'bg-gold/20 text-gold-foreground',
        status === 'PILOT' && 'bg-muted text-muted-foreground',
      )}
    >
      {status === 'TRIAL' ? 'Trial' : status === 'PILOT' ? 'Pilot' : 'Live'}
    </span>
  );
}

function EcosystemMenu({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="grid w-[34rem] gap-1 p-3 sm:w-[38rem] sm:grid-cols-2">
      {ECOSYSTEM.map((p) => (
        <Link
          key={p.key}
          to={p.route}
          onClick={onNavigate}
          className="group flex gap-3 rounded-xl p-3 transition-colors hover:bg-accent"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent group-hover:bg-background">
            <p.icon className={cn('h-4 w-4', p.accent)} aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{p.name}</span>
              <StatusChip status={p.status} />
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
              {p.description}
            </p>
          </div>
        </Link>
      ))}
      <Separator className="col-span-full my-1" />
      <div className="col-span-full grid grid-cols-2 gap-1">
        {PORTALS.map((p) => (
          <Link
            key={p.route}
            to={p.route}
            onClick={onNavigate}
            className="rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {p.name} Portal
            <span className="ml-1 text-gold">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Change language" className="text-muted-foreground">
          <Globe className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-2">
        <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Language · Lugha · Langue
        </p>
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            onClick={() => {
              setLang(l.code);
              setOpen(false);
            }}
            className={cn(
              'flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-accent',
              lang === l.code && 'font-bold text-primary',
            )}
          >
            {l.label}
            {lang === l.code && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle dark mode"
      className="text-muted-foreground"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

export function Navbar() {
  const { section } = useRouter();
  const { t } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [ecoOpen, setEcoOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const openEco = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setEcoOpen(true);
  };
  const closeEco = () => {
    closeTimer.current = setTimeout(() => setEcoOpen(false), 120);
  };

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 pt-safe',
        scrolled
          ? 'border-border bg-background/85 shadow-sm backdrop-blur-xl'
          : 'border-transparent bg-background/60 backdrop-blur-md',
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          {/* Mobile hamburger */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 overflow-y-auto p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex items-center justify-between border-b p-4">
                <Wordmark />
              </div>
              <div className="p-3">
                <EcosystemMenu onNavigate={() => setMenuOpen(false)} />
                <Separator />
                <div className="grid gap-1 p-2">
                  {[
                    { to: '/properties', label: t('nav.discover') },
                    { to: '/ask', label: t('nav.ask') },
                    { to: '/insights', label: 'Insights' },
                    { to: '/trust', label: t('nav.trust') },
                    { to: '/account', label: t('nav.account') },
                    { to: '/about', label: 'About' },
                    { to: '/contact', label: 'Contact' },
                  ].map((l) => (
                    <Link
                      key={l.to}
                      to={l.to}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        'rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-accent',
                        section === l.to.slice(1) && 'bg-accent text-primary',
                      )}
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Wordmark />

          {/* Desktop nav */}
          <div className="ml-4 hidden items-center gap-1 md:flex">
            <Popover open={ecoOpen} onOpenChange={setEcoOpen}>
              <PopoverTrigger asChild>
                <button
                  onMouseEnter={openEco}
                  onMouseLeave={closeEco}
                  className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  Ecosystem
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', ecoOpen && 'rotate-180')} />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={10}
                className="p-0"
                onMouseEnter={openEco}
                onMouseLeave={closeEco}
              >
                <EcosystemMenu onNavigate={() => setEcoOpen(false)} />
              </PopoverContent>
            </Popover>

            {[
              { to: '/properties', label: t('nav.discover') },
              { to: '/ask', label: 'Ask Keja AI' },
              { to: '/data', label: t('nav.data') },
              { to: '/insights', label: 'Insights' },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                  section === l.to.slice(1) && 'bg-accent text-foreground',
                )}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Link
            to="/properties"
            ariaLabel="Search properties"
            className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:flex"
          >
            <Search className="h-4 w-4" />
          </Link>
          <LanguageSwitcher />
          <ThemeToggle />
          <Button
            size="sm"
            className="ml-1 hidden font-bold sm:inline-flex"
            onClick={() => {
              window.location.hash = '#/account';
            }}
          >
            {t('nav.account')}
          </Button>
        </div>
      </nav>
    </header>
  );
}
