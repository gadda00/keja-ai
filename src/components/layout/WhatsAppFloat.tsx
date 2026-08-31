import { MessageCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { whatsappLink } from '@/config';
import { track } from '@/lib/analytics';
import { KEYS, useStore } from '@/lib/store';

export default function WhatsAppFloat() {
  const [showLabel, setShowLabel] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  // Lift above the CompareBar when a comparison is active (was overlapping)
  const [compare] = useStore<string[]>(KEYS.compare, []);
  const lifted = compare.length > 0;

  useEffect(() => {
    const t = setTimeout(() => setShowLabel(true), 4000);
    const t2 = setTimeout(() => setShowLabel(false), 16000);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, []);

  if (dismissed) return null;

  return (
    <div
      className={`fixed right-5 z-40 flex items-end gap-3 transition-all ${lifted ? 'bottom-24' : 'bottom-5'}`}
    >
      {showLabel && !dismissed ? (
        <div className="relative mb-1 hidden max-w-[220px] animate-fadeUp rounded-2xl rounded-br-none bg-white p-4 shadow-card-hover ring-1 ring-gold-100 sm:block">
          <button
            onClick={() => setDismissed(true)}
            className="absolute -right-2 -top-2 rounded-full bg-ink p-1 text-white"
            aria-label="Dismiss"
          >
            <X className="h-3 w-3" />
          </button>
          <p className="text-xs font-semibold text-ink">Karibu! 👋</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            Keja is also on WhatsApp — instant property answers, viewings & alerts.
          </p>
        </div>
      ) : null}
      <a
        href={whatsappLink('Hello Keja! Help me find verified property in Kenya.')}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with Keja on WhatsApp"
        onClick={() => track({ event: 'human_handoff', channel: 'whatsapp', context: 'float' })}
        className="group flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 shadow-lg transition-all hover:scale-105 hover:bg-emerald-500"
      >
        <MessageCircle className="h-7 w-7 text-white" fill="currentColor" />
      </a>
    </div>
  );
}
