import { GitCompareArrows, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import type { Property } from '@/data/properties';
import { useAllProperties } from '@/lib/inventory';
import { KEYS, useStore } from '@/lib/store';

/** Floating bar shown when 1+ properties are queued for comparison. */
export default function CompareBar() {
  const [compare, setCompare] = useStore<string[]>(KEYS.compare, []);
  const all = useAllProperties();
  const { pathname } = useLocation();
  if (!compare.length || pathname.startsWith('/compare')) return null;
  const items = compare
    .map((id) => all.find((p) => p.id === id))
    .filter((p): p is Property => p != null);
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gold-200 bg-white/95 shadow-[0_-8px_30px_rgba(25,22,18,0.12)] backdrop-blur">
      <div className="container-luxe flex items-center gap-3 py-3">
        <GitCompareArrows className="h-5 w-5 shrink-0 text-gold-600" aria-hidden="true" />
        <p className="shrink-0 text-sm font-semibold text-ink">
          {compare.length} {compare.length === 1 ? 'property' : 'properties'} queued
        </p>
        <ul className="hidden min-w-0 flex-1 items-center gap-2 sm:flex">
          {items.map((p) => (
            <li
              key={p.id}
              className="flex max-w-[220px] items-center gap-1.5 truncate rounded-full bg-gold-50 px-3 py-1 text-xs font-medium text-ink-soft ring-1 ring-gold-100"
            >
              <span className="truncate">{p.title}</span>
              <button
                onClick={() => setCompare(compare.filter((c) => c !== p.id))}
                aria-label={`Remove ${p.title} from comparison`}
                className="shrink-0 text-ink-muted hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setCompare([])}
            className="hidden text-xs font-semibold text-ink-muted hover:text-red-600 sm:block"
          >
            Clear
          </button>
          <Link to={`/compare?ids=${compare.join(',')}`} className="btn-gold !px-4 !py-2 !text-xs">
            Compare now
          </Link>
        </div>
      </div>
    </div>
  );
}
