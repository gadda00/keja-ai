'use client';
/**
 * AdminShell — the chrome of the admin territory (admin.keja.app).
 * ---------------------------------------------------------------------------
 * On the admin subdomain the public marketing shell (navbar mega-menu,
 * footer, WhatsApp float, install prompts) is gone: the console is the
 * whole site. What remains is a minimal, security-signalled bar:
 *
 *   - wordmark + "Keja Admin · admin.keja.app" territory label
 *   - the signed-in administrator (email chip)
 *   - "Back to keja.app" (the public site is one click away)
 *   - sign out
 *
 * Route discipline lives in KejaApp's AdminHostRouter: every route on this
 * host is forced to #/admin, so the shell never needs its own nav.
 */
import { useState } from 'react';
import { ArrowLeft, DoorOpen, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { ADMIN_HOST, SITE_URL } from '@/config';
import { isAdminHost } from '@/lib/adminHost';
import { cn } from '@/lib/utils';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout, isAdmin } = useAuth();
  const [leaving, setLeaving] = useState(false);
  // the actual hostname when we're on an admin host (admin.localhost in
  // dev), the configured territory otherwise — the label never lies about
  // where the console is being served from.
  const hostLabel =
    typeof window !== 'undefined' && isAdminHost(window.location.hostname)
      ? window.location.hostname
      : ADMIN_HOST;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-gold/30 bg-background/90 pt-safe backdrop-blur-xl">
        <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="" className="h-8 w-8" />
            <span className="flex flex-col leading-none">
              <span className="text-base font-bold tracking-tight">
                Keja<span className="text-gold"> Admin</span>
              </span>
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {hostLabel}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {isAdmin && user && (
              <span
                className={cn(
                  'hidden max-w-[16rem] truncate rounded-full border border-gold/40 bg-gold-soft px-3 py-1',
                  'text-[11px] font-bold text-gold-foreground sm:inline-flex sm:items-center sm:gap-1.5',
                )}
                title={user.email}
              >
                <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden />
                {user.email}
              </span>
            )}
            <a
              href={SITE_URL}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Back to site
            </a>
            <Button
              size="sm"
              variant="outline"
              disabled={leaving}
              onClick={() => {
                setLeaving(true);
                logout('admin shell');
              }}
              className="font-bold"
            >
              <DoorOpen className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              {leaving ? 'Signing out…' : 'Sign out'}
            </Button>
          </div>
        </nav>
      </header>
      {/* same layout rhythm as the public shell — pt-14 clears the bar */}
      <main id="main-content" className="flex-1 pt-14">
        {children}
      </main>
    </div>
  );
}
