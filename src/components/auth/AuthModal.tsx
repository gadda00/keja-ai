/**
 * Auth Modal — Google Sign-In + email registration/login.
 * Google Identity Services arrives with the Phase-2 backend; until then the
 * demo account picker keeps the full journey working on static hosting
 * (GitHub Pages) — clearly labelled as demo mode.
 */
import { ChevronLeft, Lock, Mail, ShieldCheck, Sparkles, User as UserIcon, X } from 'lucide-react';
import { type FC, type FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { DEMO_GOOGLE_ACCOUNTS, initials, useAuth } from '@/lib/auth';
import { useFocusTrap } from '@/lib/useFocusTrap';

type Mode = 'choose' | 'login' | 'register';

/* Official Google "G" mark (brand-compliant, drawn inline) */
const GoogleMark: FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
    />
    <path
      fill="#FBBC05"
      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
    />
  </svg>
);

export default function AuthModal() {
  const {
    authModalOpen,
    setAuthModalOpen,
    pendingIntent,
    clearIntent,
    loginWithGoogle,
    loginWithEmail,
    register,
    loading,
    user,
  } = useAuth();

  const [mode, setMode] = useState<Mode>('choose');
  const [demoPicker, setDemoPicker] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [remember, setRemember] = useState(true);
  const dialogRef = useRef<HTMLDivElement>(null);

  const close = () => {
    setAuthModalOpen(false);
    clearIntent();
    setError('');
    setMode('choose');
    setDemoPicker(false);
  };

  useFocusTrap(dialogRef, authModalOpen, close);

  // close intent once signed in
  useEffect(() => {
    if (user && authModalOpen) {
      const done = pendingIntent?.onDone;
      close();
      done?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // lock scroll while open
  useEffect(() => {
    if (!authModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [authModalOpen]);

  if (!authModalOpen) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'login') await loginWithEmail(form.email, form.password, remember);
      else
        await register({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
        });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Sign in to Keja.ai"
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gold-200"
      >
        {/* header */}
        <div className="relative bg-ink px-6 py-6 text-white">
          <button
            onClick={close}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          {mode !== 'choose' && !demoPicker && (
            <button
              onClick={() => {
                setMode('choose');
                setError('');
              }}
              className="absolute left-4 top-4 rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Back"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-gradient shadow-gold-sm">
              <Lock className="h-5 w-5 text-white" />
            </span>
            <div>
              <h2 className="font-display text-xl font-bold">
                {mode === 'register' ? 'Create your Keja account' : 'Welcome to Keja.ai'}
              </h2>
              <p className="text-xs text-white/60">
                {pendingIntent?.reason ?? 'Discover. Analyse. Invest. Transact. Manage.'}
              </p>
            </div>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
          {mode === 'choose' && !demoPicker && (
            <div className="flex flex-col gap-4">
              {/* Google button */}
              <button
                onClick={() => setDemoPicker(true)}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-ink/15 bg-white px-4 py-3 text-sm font-semibold text-ink shadow-sm transition hover:bg-gold-50 hover:border-gold-300"
              >
                <GoogleMark className="h-5 w-5" />
                Continue with Google
              </button>

              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-gold-100" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  or use email
                </span>
                <span className="h-px flex-1 bg-gold-100" />
              </div>

              <button onClick={() => setMode('login')} className="btn-gold w-full !py-3">
                <Mail className="h-4 w-4" /> Sign in with email
              </button>
              <button onClick={() => setMode('register')} className="btn-outline w-full !py-3">
                <UserIcon className="h-4 w-4" /> Create an account
              </button>

              <div className="rounded-xl bg-gold-50 p-3.5 ring-1 ring-gold-100">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gold-700">
                  <Sparkles className="h-3.5 w-3.5" /> Demo credentials
                </p>
                <ul className="mt-2 space-y-1 text-xs text-ink-soft">
                  <li>
                    <code className="rounded bg-white px-1.5 py-0.5 font-mono">admin@keja.ai</code>{' '}
                    / <code className="font-mono">admin123</code> — admin console
                  </li>
                  <li>
                    <code className="rounded bg-white px-1.5 py-0.5 font-mono">agent@keja.ai</code>{' '}
                    / <code className="font-mono">agent123</code> — agent tools
                  </li>
                  <li>
                    <code className="rounded bg-white px-1.5 py-0.5 font-mono">
                      investor@keja.ai
                    </code>{' '}
                    / <code className="font-mono">investor123</code> — investor
                  </li>
                </ul>
              </div>

              <p className="flex items-start gap-2 text-[11px] leading-relaxed text-ink-faint">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-600" />
                Protected by KEJA Trust infrastructure. Sessions expire automatically; role-based
                access controls apply. By continuing you accept the{' '}
                <Link
                  to="/legal"
                  className="font-semibold text-gold-700 underline decoration-gold-400 underline-offset-2"
                >
                  Terms &amp; Privacy Policy
                </Link>
                .
              </p>
            </div>
          )}

          {demoPicker ? (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setDemoPicker(false)}
                className="self-start text-xs font-semibold text-gold-700 hover:text-gold-800"
              >
                ← Back
              </button>
              <p className="text-xs leading-relaxed text-ink-muted">
                Real Google Sign-In ships with the Phase-2 backend (verified credential JWTs). In
                this static demo build, pick a demo Google account to continue:
              </p>
              {DEMO_GOOGLE_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() =>
                    loginWithGoogle(acc).catch((e: Error) => setError(String(e.message)))
                  }
                  disabled={loading}
                  className="group flex items-center gap-3 rounded-xl border border-ink/10 bg-white p-3.5 text-left shadow-sm transition hover:border-gold-300 hover:bg-gold-50 disabled:opacity-60"
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ background: acc.picture }}
                  >
                    {initials(acc.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">{acc.name}</span>
                    <span className="block truncate text-xs text-ink-muted">{acc.email}</span>
                    <span className="block text-[11px] text-gold-700">{acc.blurb}</span>
                  </span>
                  <GoogleMark className="h-4 w-4 opacity-70 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          ) : null}

          {(mode === 'login' || mode === 'register') && (
            <form onSubmit={submit} className="flex flex-col gap-4">
              {mode === 'register' && (
                <div>
                  <label className="label-luxe" htmlFor="auth-name">
                    Full name
                  </label>
                  <input
                    id="auth-name"
                    className="input-luxe"
                    placeholder="Amina Otieno"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
              )}
              <div>
                <label className="label-luxe" htmlFor="auth-email">
                  Email address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  className="input-luxe"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              {mode === 'register' && (
                <div>
                  <label className="label-luxe" htmlFor="auth-phone">
                    Phone <span className="font-normal normal-case text-ink-faint">(optional)</span>
                  </label>
                  <input
                    id="auth-phone"
                    className="input-luxe"
                    placeholder="+254 7xx xxx xxx"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              )}
              <div>
                <label className="label-luxe" htmlFor="auth-password">
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  className="input-luxe"
                  placeholder={mode === 'register' ? 'At least 6 characters' : '••••••••'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>

              {mode === 'login' && (
                <label className="flex items-center gap-2 text-xs text-ink-muted">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 accent-gold-600"
                  />
                  Keep me signed in for 30 days
                </label>
              )}

              {error ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-red-100">
                  {error}
                </p>
              ) : null}

              <button type="submit" className="btn-gold w-full !py-3" disabled={loading}>
                {loading
                  ? 'Please wait…'
                  : mode === 'login'
                    ? 'Sign in'
                    : 'Create account & sign in'}
              </button>

              <p className="text-center text-xs text-ink-muted">
                {mode === 'login' ? (
                  <>
                    New to Keja?{' '}
                    <button
                      type="button"
                      className="font-semibold text-gold-700 hover:underline"
                      onClick={() => setMode('register')}
                    >
                      Create an account
                    </button>
                  </>
                ) : (
                  <>
                    Already registered?{' '}
                    <button
                      type="button"
                      className="font-semibold text-gold-700 hover:underline"
                      onClick={() => setMode('login')}
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
