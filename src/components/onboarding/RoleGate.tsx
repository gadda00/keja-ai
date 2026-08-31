import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { markRoleAsked, ROLES, roleWasAsked, setRole, type VisitorRole } from '@/lib/roleStore';
import { useFocusTrap } from '@/lib/useFocusTrap';

/**
 * First-visit role picker — one question, five answers, then it never
 * interrupts again (changeable from the home page footer). Skipped entirely
 * on non-home routes and for visitors who already chose.
 */
export default function RoleGate() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open, () => setOpen(false));

  useEffect(() => {
    // only on the home route, only once, only when no role exists
    const base = document.querySelector('base')?.getAttribute('href') ?? '';
    const path = window.location.pathname.replace(/\/+$/, '');
    const onHome = path === '/' || (!!base && path === base.replace(/\/+$/, ''));
    if (onHome && !roleWasAsked()) {
      const t = window.setTimeout(() => setOpen(true), 900);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, []);

  // "Change my role" affordance elsewhere on the site can re-open the picker
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('keja-open-role-gate', onOpen);
    return () => window.removeEventListener('keja-open-role-gate', onOpen);
  }, []);

  if (!open) return null;

  const choose = (role: VisitorRole) => {
    setRole(role);
    markRoleAsked();
    setOpen(false);
    const target = ROLES.find((r) => r.value === role)?.to;
    if (target) void navigate(target);
  };

  const skip = () => {
    markRoleAsked();
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-gate-title"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm"
    >
      <div ref={dialogRef} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="role-gate-title" className="font-display text-xl font-bold text-ink">
              What are you trying to do today?
            </h2>
            <p className="mt-1.5 text-sm text-ink-muted">
              One question, then Keja tailors your homepage and next step. You can change this
              anytime.
            </p>
          </div>
          <button
            onClick={skip}
            className="rounded-lg p-1.5 text-ink-muted transition hover:bg-gold-50"
            aria-label="Skip and explore on my own"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {ROLES.map((r) => (
            <button
              key={r.value}
              onClick={() => choose(r.value)}
              className="flex items-center gap-3 rounded-xl border border-gold-200 bg-white p-4 text-left transition hover:border-gold-400 hover:bg-gold-50"
            >
              <span aria-hidden className="text-2xl">
                {r.emoji}
              </span>
              <span>
                <span className="block text-sm font-bold text-ink">{r.label}</span>
                <span className="mt-0.5 block text-xs text-ink-muted">{r.blurb}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-gold-100 pt-4">
          <p className="text-[11px] leading-relaxed text-ink-faint">
            Your choice is stored on your device only — it never leaves your browser.
          </p>
          <button
            onClick={skip}
            className="text-xs font-semibold text-gold-700 underline decoration-gold-400 underline-offset-2 hover:text-gold-600"
          >
            Just exploring
          </button>
        </div>
      </div>
    </div>
  );
}
