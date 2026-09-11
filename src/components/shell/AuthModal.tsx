'use client';
/**
 * AuthModal — the sign-in / registration surface (restored; audit finding:
 * the rebuild kept the auth context but never mounted its modal, leaving
 * requireAuth() a silent no-op).
 *
 * Three flows, honest about the static deployment (audit F-01 / P0-1):
 *  1. One-tap demo accounts (Google-style) — clearly labelled as demo.
 *  2. Email + password sign-in — PBKDF2-hashed on this device.
 *  3. Registration — carries an explicit "demo mode" disclosure: the account
 *     exists only in this browser, is not a real credential, and upgrades to
 *     a server account when the Phase-2 auth service ships.
 *
 * Pending intents (requireAuth reason + onDone) are surfaced and executed on
 * success, so gated actions (admin console, saving while signed-out, …)
 * continue where the user left off.
 */
import { useRef, useState } from 'react';
import { LogIn, ShieldCheck, UserPlus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, DEMO_GOOGLE_ACCOUNTS, initials } from '@/lib/auth';
import { useFocusTrap } from '@/lib/useFocusTrap';

export function AuthModal() {
  const {
    authModalOpen,
    setAuthModalOpen,
    pendingIntent,
    clearIntent,
    loginWithGoogle,
    loginWithEmail,
    register,
    loading,
  } = useAuth();

  const dialogRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  /** Close and reset transient form state so a reopen starts clean. */
  const close = () => {
    setAuthModalOpen(false);
    setError('');
    setMode('signin');
    clearIntent();
  };

  useFocusTrap(dialogRef, authModalOpen, close);

  if (!authModalOpen) return null;

  const finish = () => {
    const intent = pendingIntent;
    close();
    // Continue the gated action AFTER the modal is gone (state updates
    // inside the same tick would re-trigger modals unpredictably).
    if (intent) window.setTimeout(() => intent.onDone(), 0);
  };

  const run = async (fn: () => Promise<unknown>) => {
    setError('');
    try {
      await fn();
      finish();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  };

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
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {pendingIntent?.reason
                ? `Sign in to continue: ${pendingIntent.reason}.`
                : 'Sign in to sync your favourites, searches and portfolio on this device.'}
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

        {/* Demo one-tap accounts */}
        <div className="mt-5 grid gap-2">
          {DEMO_GOOGLE_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              className="flex items-center gap-3 rounded-2xl border bg-background/60 p-3 text-left transition hover:border-primary/50 hover:bg-background"
              onClick={() => void run(() => loginWithGoogle(acc))}
              disabled={loading}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                style={{ backgroundColor: acc.picture }}
                aria-hidden
              >
                {initials(acc.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">
                  {acc.name} <span className="font-normal text-muted-foreground">· demo</span>
                </span>
                <span className="block truncate text-xs text-muted-foreground">{acc.blurb}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="my-5 flex items-center gap-3" aria-hidden>
          <span className="h-px flex-1 bg-border" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            or use email
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() =>
              mode === 'signin'
                ? loginWithEmail(form.email, form.password, true)
                : register({ name: form.name || form.email.split('@')[0], email: form.email, password: form.password }),
            );
          }}
        >
          {mode === 'register' && (
            <div className="grid gap-1">
              <Label htmlFor="auth-name">Name</Label>
              <Input
                id="auth-name"
                autoComplete="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Wanjiku Kamau"
              />
            </div>
          )}
          <div className="grid gap-1">
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="auth-password">Password</Label>
            <Input
              id="auth-password"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={mode === 'register' ? 'At least 6 characters' : 'Your password'}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" className="mt-1 font-black" disabled={loading}>
            {mode === 'signin' ? (
              <>
                <LogIn className="mr-1.5 h-4 w-4" aria-hidden /> Sign in
              </>
            ) : (
              <>
                <UserPlus className="mr-1.5 h-4 w-4" aria-hidden /> Create account
              </>
            )}
          </Button>
        </form>

        <button
          className="mt-3 w-full text-center text-xs font-bold text-primary hover:underline"
          onClick={() => {
            setMode(mode === 'signin' ? 'register' : 'signin');
            setError('');
          }}
        >
          {mode === 'signin'
            ? 'No account yet? Create one'
            : 'Already have an account? Sign in'}
        </button>

        {/* Demo-mode disclosure (audit F-01 / P0-1) */}
        <div className="mt-5 rounded-xl border border-gold/40 bg-gold-soft p-3 text-[11px] leading-relaxed text-gold-foreground" role="note">
          <p className="flex items-center gap-1.5 font-bold">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Trial platform — read this
          </p>
          <p className="mt-1">
            Accounts created here live <strong>only in this browser</strong> (passwords are
            hashed on-device, never transmitted). This is not a real credential system yet —
            never reuse a password you use anywhere else. Server-side accounts arrive with the
            Phase-2 upgrade; see the <a className="font-semibold underline" href="#/trust">Trust Center</a> for what is real today.
          </p>
        </div>
      </div>
    </div>
  );
}
