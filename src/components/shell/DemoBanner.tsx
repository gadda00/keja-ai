'use client';
/**
 * Persistent trial-mode banner — trust-by-design (proposal §15).
 * Sensitive surfaces (tokenize, finance, manage) always carry it; elsewhere
 * it appears once per session and can be dismissed.
 */
import { useState } from 'react';
import { Info, X } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { cn } from '@/lib/utils';

const ALWAYS_ON = ['tokenize', 'finance', 'transact', 'institutional'];
const LS_KEY = 'keja:banner-dismissed';

export function DemoBanner() {
  const { section } = useRouter();
  // client-only render (ssr:false) — safe to read storage synchronously
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(LS_KEY) === '1';
    } catch {
      return false;
    }
  });

  const forced = ALWAYS_ON.includes(section);
  if (!forced && dismissed) return null;

  return (
    <div
      role="note"
      className={cn(
        'fixed inset-x-0 top-16 z-40 flex items-center justify-center gap-2 border-b border-gold/30 bg-gold-soft px-4 py-1.5 text-center text-[11px] font-semibold text-gold-foreground',
        'pt-safe-offset-16',
      )}
    >
      <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        Trial platform — listings, scores and tokenized assets are illustrative demo data.
      </span>
      {!forced && (
        <button
          aria-label="Dismiss notice"
          className="ml-1 rounded p-0.5 hover:bg-black/5"
          onClick={() => {
            setDismissed(true);
            try {
              sessionStorage.setItem(LS_KEY, '1');
            } catch {
              /* ignore */
            }
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
