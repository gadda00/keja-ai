'use client';
/**
 * AuthModal — the sign-in surface (Google-only edition).
 *
 * Flows:
 *  1. "Sign in with Google" (Google Identity Services) — the only sign-in
 *     method since the demo accounts + email/password paths were retired
 *     (2026-09-11). The returned ID token is validated (issuer / audience /
 *     expiry / verified email) before a session is created.
 *  2. Two-factor step — when the signed-in account requires it (admins
 *     always; everyone else if enrolled), the modal advances to the
 *     Google Authenticator challenge / enrolment wizard instead of closing.
 *
 * Pending intents (requireAuth reason + onDone) are surfaced and executed
 * on success, so gated actions (admin console, saving while signed-out, …)
 * continue where the user left off.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ShieldCheck, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { TwoFactorChallenge } from '@/components/common/TwoFactorChallenge';
import { useAuth } from '@/lib/auth';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { loadGoogleIdentity } from '@/lib/googleAuth';
import { GOOGLE_CLIENT_ID } from '@/config';

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
      <div ref={holder} aria-label="Sign in with Google" />
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

  const dialogRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'google' | 'challenge'>('google');

  /** Close and reset transient form state so a reopen starts clean. */
  const close = () => {
    setAuthModalOpen(false);
    setError('');
    setStep('google');
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
        // admins (and enrolled accounts) continue to the 2FA step;
        // everyone else is done
        if (accountRequiresTwoFactor(account)) setStep('challenge');
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

  if (!authModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to Keja"
    >
      <div
        ref={dialogRef}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border bg-card p-6 slim-scroll sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">
              {step === 'challenge' ? 'One more step' : 'Welcome to Keja'}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {step === 'challenge'
                ? 'Your account is protected with two-factor authentication.'
                : pendingIntent?.reason
                  ? `Sign in to continue: ${pendingIntent.reason}.`
                  : 'Sign in with your Google account to sync favourites, searches and portfolio on this device.'}
            </p>
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

            {/* Trust note — one honest paragraph about the account model */}
            <div
              className="mt-6 rounded-xl border border-gold/40 bg-gold-soft p-3 text-[11px] leading-relaxed text-gold-foreground"
              role="note"
            >
              <p className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Keja accounts are Google accounts
              </p>
              <p className="mt-1">
                Sign-in is handled by Google; Keja never sees your password. Admin and 2FA-protected
                accounts additionally verify a 6-digit code from Google Authenticator. Sessions and
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
