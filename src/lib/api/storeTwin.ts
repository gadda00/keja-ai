'use client';
/**
 * Store twins — the one-seam persistence layer (audit Ch. 24, P2-2).
 *
 * A store twin exposes EXACTLY the useStore interface ([value, set]) so views
 * never know where their data lives:
 *
 *   - local mode (today): identical behaviour to useStore — localStorage,
 *     cross-tab sync, seeded defaults
 *   - remote mode (when NEXT_PUBLIC_API_URL is set): reads hydrate from the
 *     API collection, writes POST/PATCH to it, and mirror to localStorage as
 *     an offline cache; API failures fall back to the cached copy silently
 *
 * Migration waves (audit Ch. 24) swap domains to twins one at a time:
 * leads → viewings → applications → properties. Each wave is a one-line
 * change at the consumer site.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { api, apiConfigured, ApiUnavailable } from '@/lib/api/client';
import { useStore } from '@/lib/store';

export interface TwinConfig<T> {
  /** localStorage key (also the offline cache in remote mode) */
  key: string;
  /** seeded default when nothing is stored and the API has nothing */
  seed: T | (() => T);
  /** REST collection path on the API, e.g. '/leads' */
  collection: string;
  /** serialize a value to the POST body (e.g. strip client-only fields) */
  toRemote?: (v: T) => unknown;
  /** map a GET {items:[…]} element to the local shape */
  fromRemote?: (item: unknown) => T;
}

/**
 * useStoreTwin — drop-in replacement for useStore per domain.
 *
 * Remote hydration happens once on mount (never blocking first paint); a
 * failed hydration logs and keeps the local value. Writes are optimistic
 * locally, then fire-and-forget to the API (a failed remote write keeps the
 * local copy — the sync story is documented in docs/CURRENT_PICTURE.md).
 */
export function useStoreTwin<T>(config: TwinConfig<T>): [T, (v: T | ((prev: T) => T)) => void] {
  const seed = useMemo(
    () => (typeof config.seed === 'function' ? (config.seed as () => T)() : config.seed),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed resolves once per twin
    [],
  );
  const local = useStore<T>(config.key, seed);
  const [remote, setRemote] = useState<T | null>(null);
  const hydrated = useRef(false);

  // one-time remote hydration (only when the seam is configured)
  useEffect(() => {
    if (!apiConfigured() || hydrated.current) return;
    hydrated.current = true;
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.get<{ items: unknown[] }>(config.collection);
        if (cancelled || !Array.isArray(res.items)) return;
        const mapped = res.items.map((i) => (config.fromRemote ? config.fromRemote(i) : (i as T)));
        setRemote(mapped as unknown as T);
      } catch (e) {
        if (!(e instanceof ApiUnavailable) && process.env.NODE_ENV === 'development') {
          console.warn('[twin] hydration failed, staying on local copy', e);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once per twin instance
  }, []);

  const value = remote ?? local[0];

  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      const next =
        typeof v === 'function' ? (v as (prev: T) => T)(value) : v;
      local[1](next); // optimistic local write (also the offline cache)
      setRemote(next);
      if (apiConfigured()) {
        void api
          .post(config.collection, config.toRemote ? config.toRemote(next) : next)
          .catch((e) => {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[twin] remote write failed (kept locally)', e);
            }
          });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- local setter is stable; value captured via closure is the twin's source of truth
    [value, local[1], config.collection, config.toRemote],
  );

  return [value, set];
}
