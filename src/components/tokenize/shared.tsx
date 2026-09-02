/**
 * Keja Tokenize — shared UI primitives.
 * Uses the keja-ai design system (gold / ink / cream, Playfair + Inter).
 */
import { AnimatePresence, m } from 'framer-motion';
import {
  Building2,
  CheckCircle2,
  Home,
  Landmark,
  Layers,
  ShieldCheck,
  Store,
  Warehouse,
  X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { asset } from '@/config';
import type { TokenizedProperty } from '@/data/tokenize';
import { propertyTypeLabel } from '@/data/tokenize';
import { useFocusTrap } from '@/lib/useFocusTrap';

/* --------------------------------- badges --------------------------------- */

export function StatusBadge({ status }: { status: TokenizedProperty['status'] }) {
  if (status === 'LIVE')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/85 px-3 py-1 text-[11px] font-semibold tracking-wide text-emerald-300 backdrop-blur">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
        LIVE · INCOME PAYING
      </span>
    );
  if (status === 'FUNDING')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/85 px-3 py-1 text-[11px] font-semibold tracking-wide text-gold-300 backdrop-blur">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold-400" />
        FUNDING NOW
      </span>
    );
  if (status === 'FUNDED')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/85 px-3 py-1 text-[11px] font-semibold tracking-wide text-emerald-300 backdrop-blur">
        <ShieldCheck className="h-3 w-3" />
        FULLY FUNDED
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold tracking-wide text-ink-muted backdrop-blur">
      <span className="h-1.5 w-1.5 rounded-full bg-gold-600" />
      OPENING SOON
    </span>
  );
}

const TYPE_ICONS: Record<string, typeof Building2> = {
  OFFICE: Building2,
  RESIDENTIAL: Home,
  RETAIL: Store,
  MIXED_USE: Layers,
  LOGISTICS: Warehouse,
};

export function TypeIcon({ type, className = 'h-4 w-4' }: { type: string; className?: string }) {
  const Icon = TYPE_ICONS[type] ?? Landmark;
  return <Icon className={className} />;
}

export { propertyTypeLabel };

export function SectionTitle({
  eyebrow,
  title,
  sub,
  center = false,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  center?: boolean;
}) {
  return (
    <div className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <div className="flex items-center justify-center gap-3">
        {!center && <span className="h-px w-8 bg-gold-gradient" />}
        <span className="text-[11px] font-bold uppercase tracking-wide2 text-gold-700">
          {eyebrow}
        </span>
      </div>
      <h2 className="mt-3 font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">
        {title}
      </h2>
      {sub ? (
        <p className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-[15px]">{sub}</p>
      ) : null}
    </div>
  );
}

/* ---------------------------------- modal ---------------------------------- */

let modalOpenCount = 0;

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open, onClose);

  useEffect(() => {
    if (!open) return;
    modalOpenCount += 1;
    document.body.style.overflow = 'hidden';
    return () => {
      modalOpenCount = Math.max(0, modalOpenCount - 1);
      if (modalOpenCount === 0) document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <m.div
          ref={dialogRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <m.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.25 }}
            className={`w-full ${maxWidth} overflow-hidden rounded-2xl bg-white shadow-gold-lg`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-gold-gradient px-6 py-4">
              <div className="flex items-center gap-2 text-white">
                {icon}
                <div>
                  <h3 className="flex items-center gap-2 text-[15px] font-bold">{title}</h3>
                  {subtitle ? <p className="mt-0.5 text-[12px] text-white/80">{subtitle}</p> : null}
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[78vh] overflow-y-auto p-6">{children}</div>
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}

/* ---------------------------------- toast ---------------------------------- */

export interface ToastMsg {
  id: number;
  title: string;
  description?: string;
}

const ToastCtx = createContext<{ toast: (t: Omit<ToastMsg, 'id'>) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const toast = useCallback((t: Omit<ToastMsg, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts, { ...t, id }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 4200);
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div
        className="pointer-events-none fixed bottom-6 right-6 z-[80] flex w-[calc(100vw-3rem)] max-w-sm flex-col gap-2"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <m.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              className="pointer-events-auto flex items-start gap-3 rounded-xl bg-white p-4 shadow-gold-lg ring-1 ring-gold-200"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-ink">{t.title}</p>
                {t.description ? (
                  <p className="mt-0.5 text-[12px] leading-relaxed text-ink-muted">
                    {t.description}
                  </p>
                ) : null}
              </div>
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

/* ------------------------------ format helpers ------------------------------ */

export const fmtNum = (n: number) => n.toLocaleString('en-US');

export const fmtUsd = (n: number, decimals = 0) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

export const fmtUsdCompact = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1000
      ? `$${Math.round(n / 1000)}K`
      : fmtUsd(n);

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const img = (path: string) => asset(path);
