'use client';
/**
 * Comparison tray — pick up to four properties anywhere in the marketplace,
 * then open the side-by-side comparison view.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { GitCompareArrows, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';
import { useAllProperties, findProperty } from '@/lib/inventory';
import { track } from '@/lib/analytics';
import { Link } from '@/lib/router';

const MAX_COMPARE = 4;

export function useCompare() {
  const [ids, setIds] = useStore<string[]>('compare', []);
  const toggle = (id: string) => {
    const wasIncluded = ids.includes(id);
    setIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_COMPARE) return [...prev.slice(1), id];
      return [...prev, id];
    });
    if (!wasIncluded) track({ event: 'compare_add', propertyId: id });
  };
  const remove = (id: string) => setIds((prev) => prev.filter((x) => x !== id));
  const clear = () => setIds([]);
  return { ids, toggle, remove, clear };
}

export function CompareBar({ onOpen }: { onOpen: () => void }) {
  const { ids, remove, clear } = useCompare();
  const all = useAllProperties();
  if (ids.length === 0) return null;

  const picked = ids.map((id) => findProperty(all, id)).filter(Boolean);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="fixed inset-x-0 bottom-16 z-40 mx-auto w-fit max-w-[94vw] md:bottom-6"
        role="region"
        aria-label="Comparison tray"
      >
        <div className="flex items-center gap-3 rounded-2xl border bg-card/95 p-3 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-2">
            {picked.map((p) => (
              <div key={p!.id} className="group relative">
                <Link
                  to={`/properties/${p!.id}`}
                  className="block h-11 w-16 overflow-hidden rounded-lg border-2 border-primary/30"
                  ariaLabel={p!.title}
                >
                  <img src={p!.images[0]} alt="" className="h-full w-full object-cover" />
                </Link>
                <button
                  onClick={() => remove(p!.id)}
                  aria-label={`Remove ${p!.title} from comparison`}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </div>
            ))}
            {Array.from({ length: MAX_COMPARE - picked.length }).map((_, i) => (
              <div
                key={i}
                className="flex h-11 w-16 items-center justify-center rounded-lg border-2 border-dashed border-border text-[10px] font-bold text-muted-foreground"
              >
                {picked.length + i + 1}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 border-l pl-3">
            <Button size="sm" className="font-bold" onClick={onOpen} disabled={picked.length < 2}>
              <GitCompareArrows className="mr-1 h-4 w-4" aria-hidden /> Compare {picked.length}
            </Button>
            <Button size="sm" variant="ghost" onClick={clear} aria-label="Clear comparison">
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
