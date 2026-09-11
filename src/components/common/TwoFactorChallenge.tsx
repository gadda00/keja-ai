'use client';
/**
 * TwoFactorChallenge — the Google Authenticator (RFC 6238 TOTP) surface.
 *
 * Two modes, one component:
 *  - "verify": the account is enrolled → 6-digit code entry (with a
 *    single-use recovery-code fallback). Success flags the session.
 *  - "enrol": the account must enrol (admin requirement) or chose to →
 *    QR code (otpauth://) + manual-entry secret + confirmation code.
 *    On success the recovery codes are shown exactly once.
 *
 * The QR is rendered via a dynamic import of `qrcode` so the ~30 kB
 * library only loads when an enrolment actually happens.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyRound, LifeBuoy, QrCode, ShieldCheck, Smartphone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

type Mode = 'verify' | 'enrol';

export function TwoFactorChallenge({
  mode: initialMode,
  onDone,
  onCancel,
  compact = false,
}: {
  mode: Mode;
  /** Called after a successful verification/enrolment. */
  onDone: () => void;
  onCancel?: () => void;
  compact?: boolean;
}) {
  const {
    user,
    verifyTwoFactor,
    beginTwoFactorEnrolment,
    confirmTwoFactorEnrolment,
    twoFactorEnrolled,
  } = useAuth();

  // "verify" downgrades to "enrol" when no enrolment exists yet (e.g. the
  // admin gate on first visit) — derived, not stateful
  const mode: Mode =
    initialMode === 'verify' && !twoFactorEnrolled ? 'enrol' : initialMode;
  const [code, setCode] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // enrolment state (component-local — the secret is never persisted
  // until the user proves the authenticator works)
  const [pending, setPending] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const qrHolder = useRef<HTMLDivElement>(null);

  const startEnrolment = useCallback(() => {
    setPending(beginTwoFactorEnrolment());
    setQrDataUrl('');
    setError('');
    setCode('');
  }, [beginTwoFactorEnrolment]);

  useEffect(() => {
    if (mode === 'enrol' && !pending && !recoveryCodes) startEnrolment();
  }, [mode, pending, recoveryCodes, startEnrolment]);

  // render the otpauth:// QR (dynamic import keeps `qrcode` out of the
  // main bundle — it only loads during an actual enrolment)
  useEffect(() => {
    if (!pending?.otpauthUri || qrDataUrl) return;
    let cancelled = false;
    void (async () => {
      try {
        const QRCode = (await import('qrcode')).default;
        const url = await QRCode.toDataURL(pending.otpauthUri, {
          margin: 1,
          width: 208,
          color: { dark: '#0f172a', light: '#ffffff' },
        });
        if (!cancelled) setQrDataUrl(url);
      } catch {
        if (!cancelled) setError('The QR could not render — enter the secret manually below.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pending?.otpauthUri, qrDataUrl]);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      if (mode === 'enrol') {
        if (!pending) return;
        const res = await confirmTwoFactorEnrolment(code.replace(/\D/g, ''), pending.secret);
        if (!res.ok) {
          setError('That code did not match. Check the app and try again.');
          return;
        }
        setRecoveryCodes(res.recoveryCodes);
        return; // stay on screen showing the recovery codes
      }
      const res = await verifyTwoFactor(recoveryMode ? code.trim() : code.replace(/\D/g, ''));
      if (!res.ok) {
        setError(
          recoveryMode
            ? 'That recovery code was not accepted (or already used).'
            : 'Incorrect code. Codes refresh every 30 seconds — try the current one.'
        );
        return;
      }
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const finishWithRecoveryCodes = () => onDone();

  /* ---------------- recovery-codes success screen ---------------- */
  if (recoveryCodes) {
    return (
      <div className="grid gap-4" role="status">
        <div className="flex items-center gap-2 text-sm font-black text-primary">
          <ShieldCheck className="h-4 w-4" aria-hidden /> Two-factor enabled
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Store these single-use recovery codes somewhere safe (password manager or printed).
          Each one unlocks your account once if you lose your authenticator device. They are
          shown <strong>only this once</strong>.
        </p>
        <div className="grid grid-cols-2 gap-2 rounded-2xl border bg-background/60 p-3 font-mono text-xs">
          {recoveryCodes.map((c) => (
            <span key={c} className="select-all rounded bg-card px-2 py-1.5 text-center">
              {c}
            </span>
          ))}
        </div>
        <Button className="font-black" onClick={finishWithRecoveryCodes}>
          I saved them — continue
        </Button>
      </div>
    );
  }

  /* ---------------- enrolment: QR + confirm ---------------- */
  if (mode === 'enrol') {
    return (
      <div className="grid gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <QrCode className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div>
            <h3 className="text-sm font-black">Set up Google Authenticator</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Admin accounts require a second factor. Scan this QR with Google Authenticator
              (or any authenticator app), then enter the 6-digit code it shows to confirm.
            </p>
          </div>
        </div>

        <div className="mx-auto rounded-2xl border bg-white p-3" ref={qrHolder}>
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Google Authenticator enrolment QR code" width={208} height={208} className="h-52 w-52" />
          ) : (
            <div className="flex h-52 w-52 items-center justify-center text-xs text-muted-foreground">
              <Smartphone className="mr-2 h-4 w-4 animate-pulse" aria-hidden /> Rendering QR…
            </div>
          )}
        </div>

        <details className="rounded-xl border bg-background/60 p-3 text-xs">
          <summary className="cursor-pointer font-bold">Can&apos;t scan? Enter the key manually</summary>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            In Google Authenticator: <strong>Enter a setup key</strong> → account{' '}
            <span className="font-mono">{user?.email}</span> · key (spaces ignored):
          </p>
          <p className="mt-1.5 select-all break-all rounded-lg bg-card px-2 py-1.5 font-mono">
            {pending ? pending.secret.replace(/(.{4})/g, '$1 ').trim() : '…'}
          </p>
        </details>

        <div className="grid gap-1.5">
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            placeholder="6-digit code from the app"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && void submit()}
            className="text-center font-mono text-lg tracking-[0.4em]"
            aria-label="Verification code"
          />
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button className="flex-1 font-black" disabled={busy || code.length !== 6} onClick={() => void submit()}>
              <ShieldCheck className="mr-1.5 h-4 w-4" aria-hidden /> Confirm &amp; enable
            </Button>
            <Button variant="ghost" size="icon" aria-label="New secret" title="Generate a new secret" onClick={startEnrolment}>
              <KeyRound className="h-4 w-4" aria-hidden />
            </Button>
          </div>
          {!compact && onCancel && (
            <button className="mt-1 text-center text-xs font-bold text-muted-foreground hover:underline" onClick={onCancel}>
              Cancel for now
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ---------------- verify: code entry ---------------- */
  return (
    <div className="grid gap-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Smartphone className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <div>
          <h3 className="text-sm font-black">Two-factor verification</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Enter the 6-digit code from Google Authenticator for{' '}
            <span className="font-semibold">{user?.email}</span>.
          </p>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Input
          inputMode={recoveryMode ? 'text' : 'numeric'}
          autoComplete="one-time-code"
          autoFocus
          maxLength={recoveryMode ? 11 : 6}
          placeholder={recoveryMode ? 'XXXXX-XXXXX' : '6-digit code'}
          value={code}
          onChange={(e) =>
            setCode(
              recoveryMode
                ? e.target.value.toUpperCase().slice(0, 11)
                : e.target.value.replace(/\D/g, '').slice(0, 6),
            )
          }
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            if (recoveryMode ? code.length === 11 : code.length === 6) void submit();
          }}
          className={cn('text-center font-mono', recoveryMode ? 'tracking-widest' : 'text-lg tracking-[0.4em]')}
          aria-label={recoveryMode ? 'Recovery code' : 'Verification code'}
        />
        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button className="font-black" disabled={busy || code.length < (recoveryMode ? 11 : 6)} onClick={() => void submit()}>
          Verify
        </Button>
        <button
          className="flex items-center justify-center gap-1 text-center text-xs font-bold text-muted-foreground hover:underline"
          onClick={() => {
            setRecoveryMode(!recoveryMode);
            setCode('');
            setError('');
          }}
        >
          <LifeBuoy className="h-3.5 w-3.5" aria-hidden />
          {recoveryMode ? 'Use the 6-digit code instead' : 'Lost your device? Use a recovery code'}
        </button>
      </div>
    </div>
  );
}
