'use client';
/**
 * AuthModal — the sign-in + registration surface (Google-only edition).
 *
 * Flows:
 *  1. "Sign in / Create account with Google" (Google Identity Services) —
 *     the only entry. The returned ID token is validated (issuer / audience /
 *     expiry / verified email) before a session is created.
 *  2. Registration — first-time Google sign-ins continue to a one-screen
 *     "what brings you to Keja" step (account group, phone, company) so
 *     every journey — renter, landlord, developer, agent, investor — lands
 *     on the surface built for it.
 *  3. Two-factor step — when the signed-in account requires it (admins
 *     always; everyone else if enrolled), the modal advances to the
 *     Google Authenticator challenge / enrolment wizard instead of closing.
 *
 * Operational note (2026-09-11): Google sign-in used to stall on
 * accounts.google.com/gsi/transform because the site served
 * `Cross-Origin-Opener-Policy: same-origin`, which severs window.opener in
 * the GIS popup. The header is now `same-origin-allow-popups` (vercel.json)
 * and the button surfaces a small troubleshooting note if the popup never
 * completes (blocked popups / third-party cookies / unregistered origin).
 *
 * Pending intents (requireAuth reason + onDone) are surfaced and executed
 * on success, so gated actions (admin console, posting a listing, …)
 * continue where the user left off.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, LifeBuoy, ShieldCheck, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TwoFactorChallenge } from '@/components/common/TwoFactorChallenge';
import { useAuth } from '@/lib/auth';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { loadGoogleIdentity } from '@/lib/googleAuth';
import { navigate, useRouter } from '@/lib/router';
import { useToast } from '@/hooks/use-toast';
import { GOOGLE_CLIENT_ID, SITE_URL } from '@/config';
import {
  ACCOUNT_TYPES,
  accountTypeInfo,
  type AccountType,
} from '@/lib/accountTypes';
import type { UserAccount } from '@/lib/auth';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Canonical-origin hint                                                */
/* ------------------------------------------------------------------ */

/** The OAuth client is registered for the canonical origin (keja.app). A
 *  mirrored host (e.g. www.keja.app or a preview URL) will render the
 *  button but Google refuses to return a credential — surface a hint.
 *  The origin cannot change during a page session, so this is a constant,
 *  not state. */
function useOriginMismatch(): boolean {
  return useMemo(() => {
    if (typeof window === 'undefined') return false;
    try {
      const canonical = new URL(SITE_URL);
      const localDev = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
      return !localDev && window.location.origin !== canonical.origin;
    } catch {
      return false;
    }
  }, []);
}

/* ------------------------------------------------------------------ */
/* Google sign-in button                                                */
/* ------------------------------------------------------------------ */

/** Real "Sign in with Google" — GIS button rendered into a container div.
 *  Falls back to an error message if the script cannot load (offline /
 *  blocked). The callback hands the raw credential to the auth context,
 *  which validates claims before creating the session. */
function GoogleSignInButton({ onCredential }: { onCredential: (c: string) => void }) {
  const holder = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  // retry trigger: re-running the effect re-attempts the GIS load with a
  // fresh closure (compiler-safe — no ref mutation from handlers)
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void loadGoogleIdentity()
      .then((id) => {
        if (cancelled || !holder.current) return;
        id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => onCredential(response.credential),
          ux_mode: 'popup',
          use_fedcm_for_prompt: true,
        });
        if (holder.current) {
          id.renderButton(holder.current, {
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'center',
            width: Math.min(340, holder.current.clientWidth || 340),
          });
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Google Sign-In unavailable.');
      });
    return () => {
      cancelled = true;
    };
  }, [onCredential, attempt]);

  return (
    <div className="grid justify-items-center gap-2">
      <div ref={holder} aria-label="Continue with Google" />
      {error && (
        <div role="alert" className="grid justify-items-center gap-2 text-center">
          <p className="text-xs font-semibold text-destructive">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs font-bold"
            onClick={() => {
              setError('');
              setAttempt((n) => n + 1);
            }}
          >
            Retry loading Google Sign-In
          </Button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Registration step (first Google sign-in)                             */
/* ------------------------------------------------------------------ */

function RegistrationStep({ onDone }: { onDone: () => void }) {
  const { user, completeRegistration } = useAuth();
  const { toast } = useToast();
  const [type, setType] = useState<AccountType | null>(null);
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [company, setCompany] = useState(user?.company ?? '');
  const [name, setName] = useState(user?.name ?? '');
  // company only makes sense for the professional groups
  const pro = type === 'landlord' || type === 'developer' || type === 'agent';

  const finishRegistration = () => {
    if (!type) return;
    completeRegistration({ accountType: type, phone, company: pro ? company : '', name });
    toast({
      title: `Welcome to Keja, ${name.split(' ')[0] || 'friend'} 🎉`,
      description: `Your ${accountTypeInfo(type).label.toLowerCase()} workspace is ready.`,
    });
    onDone();
    // land the new member on the surface built for their group
    window.setTimeout(() => navigate(accountTypeInfo(type).to), 60);
  };

  return (
    <div className="grid gap-5">
      <div>
        <h3 className="text-sm font-black">What brings you to Keja?</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Signed in as <span className="font-semibold">{user?.email}</span>. Pick your lane —
          you can change it any time from your account page.
        </p>
      </div>

      <div className="grid gap-2" role="radiogroup" aria-label="Account type">
        {ACCOUNT_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={type === t.value}
            onClick={() => setType(t.value)}
            className={cn(
              'flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all',
              type === t.value
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'hover:border-primary/40',
            )}
          >
            <span className="text-xl" aria-hidden>{t.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm font-black">{t.label}</span>
              <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{t.blurb}</span>
            </span>
            <span
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                type === t.value ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
              )}
              aria-hidden
            >
              {type === t.value && <Check className="h-3 w-3" />}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-2.5">
        <label className="grid gap-1.5">
          <span className="text-xs font-bold">Display name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-bold">Phone <span className="font-normal text-muted-foreground">(optional)</span></span>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+254…"
            inputMode="tel"
            className="h-9"
          />
        </label>
        {pro && (
          <label className="grid gap-1.5">
            <span className="text-xs font-bold">
              Company / agency <span className="font-normal text-muted-foreground">(optional)</span>
            </span>
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder={type === 'developer' ? 'e.g. Section Homes Ltd' : 'e.g. Keja Properties'}
              className="h-9"
            />
          </label>
        )}
      </div>

      <Button className="font-black" disabled={!type} onClick={finishRegistration}>
        Create my Keja account
      </Button>
      <button
        className="text-xs font-bold text-muted-foreground hover:underline"
        onClick={onDone}
      >
        Skip for now
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Modal shell                                                          */
/* ------------------------------------------------------------------ */

export function AuthModal() {
  const {
    authModalOpen,
    setAuthModalOpen,
    pendingIntent,
    clearIntent,
    loginWithGoogleCredential,
    accountRequiresTwoFactor,
    loading,
  } = useAuth();
  const originMismatch = useOriginMismatch();
  const { route } = useRouter();

  const dialogRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'google' | 'register' | 'challenge'>('google');
  /** account that just signed in — drives register → challenge chaining */
  const [signedInAccount, setSignedInAccount] = useState<UserAccount | null>(null);

  /** Whether the modal is open, readable inside effects without re-running
   *  them on every open/close (used by the route-change watcher below). */
  const openRef = useRef(false);
  useEffect(() => {
    openRef.current = authModalOpen;
  }, [authModalOpen]);

  /** The sign-in modal is route-scoped: navigating away abandons the gated
   *  action that opened it ("sign in to continue: publish a listing" is
   *  meaningless on a different page). Before this, the modal — a
   *  full-screen overlay that intercepts every click — followed the user
   *  around indefinitely until manually closed (observed 2026-09-12: it
   *  blocked the contact form's Send button three routes later). */
  useEffect(() => {
    if (openRef.current) {
      openRef.current = false;
      setAuthModalOpen(false);
      setError('');
      setStep('google');
      setSignedInAccount(null);
      clearIntent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close-on-navigate only; refs are read on purpose
  }, [route.path]);

  /** Close and reset transient form state so a reopen starts clean. */
  const close = () => {
    setAuthModalOpen(false);
    setError('');
    setStep('google');
    setSignedInAccount(null);
    clearIntent();
  };

  /** Close + run the gated action that asked for auth, if any. */
  const finish = () => {
    const intent = pendingIntent;
    close();
    if (intent) window.setTimeout(() => intent.onDone(), 0);
  };

  useFocusTrap(dialogRef, authModalOpen, close);

  // Real-Google callback — stable via useCallback so the GIS button isn't
  // re-initialised on every render (only when the pending intent changes).
  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      setError('');
      try {
        const account = await loginWithGoogleCredential(credential);
        setSignedInAccount(account);
        // first-time sign-ins register (pick their group) before anything
        // else; enrolled/admin accounts continue to the 2FA step; everyone
        // else is done
        if (!account.accountType) setStep('register');
        else if (accountRequiresTwoFactor(account)) setStep('challenge');
        else finish();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    },
    // finish depends on pendingIntent — include it (stable across renders
    // of the same intent) so the closure sees the current one
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loginWithGoogleCredential, accountRequiresTwoFactor, pendingIntent, setAuthModalOpen, clearIntent]
  );

  /** After registration (or skip): admins + enrolled accounts continue
   *  to the 2FA challenge, everyone else is done. */
  const afterRegistration = useCallback(() => {
    if (signedInAccount && accountRequiresTwoFactor(signedInAccount)) setStep('challenge');
    else finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedInAccount, accountRequiresTwoFactor, pendingIntent, setAuthModalOpen, clearIntent]);

  const heading = useMemo(
    () =>
      step === 'challenge'
        ? 'One more step'
        : step === 'register'
          ? 'Almost there'
          : 'Welcome to Keja',
    [step]
  );

  const subheading = useMemo(() => {
    if (step === 'challenge') return 'Your account is protected with two-factor authentication.';
    if (step === 'register') return 'One quick screen to set up your Keja account.';
    return pendingIntent?.reason
      ? `Sign in to continue: ${pendingIntent.reason}.`
      : 'Sign in with your Google account to sync favourites, searches and portfolio on this device.';
  }, [step, pendingIntent]);

  if (!authModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to Keja"
      onClick={(e) => {
        // backdrop click dismisses (same as Escape / the Close button)
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border bg-card p-6 slim-scroll sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">{heading}</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{subheading}</p>
          </div>
          <button
            aria-label="Close"
            className="rounded-lg p-1 text-muted-foreground hover:bg-black/5"
            onClick={close}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {step === 'challenge' ? (
          <div className="mt-5">
            <TwoFactorChallenge mode="verify" onDone={finish} />
            <button
              className="mt-4 flex w-full items-center justify-center gap-1 text-xs font-bold text-muted-foreground hover:underline"
              onClick={() => setStep('google')}
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Use a different account
            </button>
          </div>
        ) : step === 'register' ? (
          <div className="mt-5">
            <RegistrationStep onDone={afterRegistration} />
          </div>
        ) : (
          <>
            <div className="mt-6">
              {GOOGLE_CLIENT_ID ? (
                <GoogleSignInButton onCredential={handleGoogleCredential} />
              ) : (
                <div
                  className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-xs leading-relaxed text-destructive"
                  role="alert"
                >
                  Google Sign-In is not configured on this deployment — set{' '}
                  <code className="font-mono">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> and redeploy
                  (see docs/GOOGLE_AUTH_SETUP.md).
                </div>
              )}
            </div>

            {loading && (
              <p className="mt-4 text-center text-xs font-bold text-muted-foreground" role="status">
                Signing you in…
              </p>
            )}
            {error && (
              <p
                className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive"
                role="alert"
              >
                {error}
              </p>
            )}

            {originMismatch && (
              <div className="mt-4 rounded-xl border border-gold/50 bg-gold-soft p-3 text-[11px] leading-relaxed text-gold-foreground" role="note">
                You are on <span className="font-mono font-semibold">{typeof window !== 'undefined' ? window.location.origin : ''}</span>.
                Google Sign-In is registered for <span className="font-mono font-semibold">{SITE_URL}</span> —{' '}
                <a className="font-bold underline" href={SITE_URL}>open the canonical site</a> to sign in.
              </div>
            )}

            {/* Stuck-popup troubleshooter (2026-09-11 gsi/transform incident) */}
            <details className="mt-3 rounded-xl border bg-background/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
              <summary className="flex cursor-pointer items-center gap-1.5 font-bold text-foreground">
                <LifeBuoy className="h-3.5 w-3.5 text-gold" aria-hidden /> Google window not completing?
              </summary>
              <ul className="mt-2 grid gap-1.5 pl-4">
                <li className="list-disc">Allow pop-ups for this site, then retry.</li>
                <li className="list-disc">In Safari / Firefox, allow third-party cookies for accounts.google.com (or use Chrome, where the modern sign-in flow needs no cookies).</li>
                <li className="list-disc">Still stuck? Sign out of Google in this browser first, or try another browser — and make sure you are on <span className="font-mono">keja.app</span>.</li>
              </ul>
            </details>

            {/* Trust note — one honest paragraph about the account model */}
            <div
              className="mt-4 rounded-xl border border-gold/40 bg-gold-soft p-3 text-[11px] leading-relaxed text-gold-foreground"
              role="note"
            >
              <p className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Keja accounts are Google accounts
              </p>
              <p className="mt-1">
                Sign-in is handled by Google; Keja never sees your password. New here? The same
                button creates your account in one tap. Admin and 2FA-protected accounts
                additionally verify a 6-digit code from Google Authenticator. Sessions and
                2FA enrolment live on this device only — see the{' '}
                <a className="font-semibold underline" href="#/trust">Trust Center</a> for what is real today.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
