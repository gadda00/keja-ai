'use client';
/**
 * Admin console gate (audit F-05, P0-1) — Google + allowlist + 2FA edition.
 *
 * Three walls before the AdminView (and its lazy chunk) mounts:
 *  1. sign-in wall — anonymous visitors get the Google sign-in prompt;
 *  2. role wall — signed-in non-admins get an explicit 403 (admin is
 *     granted only through the NEXT_PUBLIC_ADMIN_EMAILS allowlist on
 *     Google sign-in; there is no demo admin account anymore);
 *  3. second-factor wall — admins must have completed the Google
 *     Authenticator (RFC 6238 TOTP) step for THIS session. First visit
 *     routes through the enrolment wizard.
 *
 * Scope note: with a static deployment this remains a UI gate — a
 * determined user could still read the bundle. No admin-scoped data or
 * action exists on any server to call (there is no API yet); everything
 * the console shows is demo data already present in the client bundle.
 * The Phase-2 auth service (audit Ch. 24) moves this check server-side
 * per endpoint.
 */
import { Lock, LogIn, ShieldAlert, Smartphone } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { TwoFactorChallenge } from '@/components/common/TwoFactorChallenge';
import { useAuth } from '@/lib/auth';
import { SITE } from '@/config';

export function AdminGate({ children }: { children: ReactNode }) {
  const { isLoggedIn, isAdmin, user, requireAuth, mfaVerified } = useAuth();

  if (!isLoggedIn) {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Lock className="h-7 w-7 text-primary" aria-hidden />
        </div>
        <h1 className="text-xl font-bold">Admin console</h1>
        <p className="text-sm text-muted-foreground">
          This area is restricted to platform administrators. Sign in with your allowlisted
          administrator Google account to continue.
        </p>
        <Button onClick={() => requireAuth('admin console access', () => undefined)}>
          <LogIn className="mr-2 h-4 w-4" aria-hidden /> Sign in with Google
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
          the administrator role, granted through the Google-account allowlist.
        </p>
        <p className="text-xs text-muted-foreground">
          Need access? Contact the platform administrator at{' '}
          <a className="font-semibold text-primary hover:underline" href={`mailto:${SITE.adminEmail}`}>
            {SITE.adminEmail}
          </a>
          .
        </p>
      </div>
    );
  }

  if (!mfaVerified) {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-md flex-col items-center justify-center gap-5 px-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Smartphone className="h-7 w-7 text-primary" aria-hidden />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold">Two-factor verification</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The admin console requires a second factor — enter the code from Google
            Authenticator (or enrol this device if this is your first visit).
          </p>
        </div>
        <div className="w-full rounded-3xl border bg-card p-5">
          <TwoFactorChallenge mode="verify" compact onDone={() => undefined} />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
