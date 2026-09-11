'use client';
/**
 * Admin console gate (audit F-05, P0-1).
 *
 * The #/admin console previously rendered for ANY visitor — anonymous or
 * signed-in — with full moderation UI. This gate renders a sign-in wall for
 * anonymous visitors and an explicit 403 for non-admin accounts before the
 * AdminView (and its lazy chunk) is ever mounted.
 *
 * Scope note: with a static deployment this remains a UI gate — a determined
 * user could still read the bundle. No admin-scoped data or action exists on
 * any server to call (there is no API yet); everything the console shows is
 * demo data already present in the client bundle. The Phase-2 auth service
 * (audit Ch. 24) moves this check server-side per endpoint.
 */
import { Lock, LogIn, ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';

export function AdminGate({ children }: { children: ReactNode }) {
  const { isLoggedIn, isAdmin, user, requireAuth } = useAuth();

  if (!isLoggedIn) {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Lock className="h-7 w-7 text-primary" aria-hidden />
        </div>
        <h1 className="text-xl font-bold">Admin console</h1>
        <p className="text-sm text-muted-foreground">
          This area is restricted to platform administrators. Sign in with an
          admin account to continue.
        </p>
        <Button onClick={() => requireAuth('admin console access', () => undefined)}>
          <LogIn className="mr-2 h-4 w-4" aria-hidden /> Sign in
        </Button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
          <ShieldAlert className="h-7 w-7 text-destructive" aria-hidden />
        </div>
        <h1 className="text-xl font-bold">Admins only</h1>
        <p className="text-sm text-muted-foreground">
          You are signed in as <span className="font-semibold">{user?.email}</span> (role:{' '}
          <span className="font-mono text-xs">{user?.role}</span>). The admin console requires
          the administrator role.
        </p>
        <p className="text-xs text-muted-foreground">
          Need access? Contact the platform team. On the trial build, sign in with the demo
          admin account.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
