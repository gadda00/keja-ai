/**
 * Client-side store: favorites, leads, profile, chat history, language.
 * Uses localStorage so all features work without a backend — MVP-ready and
 * upgradeable to a real API later (roadmap Phase 2/3).
 */
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { chatHistorySchema, idListSchema } from '@/lib/boundaries';

const PREFIX = 'keja:';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  interest: string;
  budget?: string;
  timeline?: string;
  temperature: 'HOT' | 'WARM' | 'COLD';
  source: 'chat' | 'viewing' | 'contact' | 'manual';
  propertyId?: string;
  note?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'keja';
  text: string;
  ts: string;
  /** Epistemic labels attached to AI answers (see AIResponse.meta). */
  meta?: { label: 'FACT' | 'ESTIMATE' | 'ASSUMPTION' | 'REPORTED'; text: string }[];
  /** Engine-provided follow-up chips (persisted so history keeps them). */
  quickReplies?: string[];
  /** Engine-provided property cards for this answer. */
  propertyIds?: string[];
  /** Corpus citations attached by the intelligence gateway. */
  sources?: { ref: string; title: string; kind: 'property' | 'area-insight' | 'policy'; asOf: string }[];
  /** Engine-suggested next action for this answer. */
  action?: 'start-qualification' | 'open-calculator' | 'whatsapp';
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent('keja-store-change', { detail: key }));
  } catch {
    /* storage unavailable */
  }
}

export function useStore<T>(key: string, fallback: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => read(key, fallback));
  // fallback is usually an inline literal — reading it through a ref keeps
  // the listener stable without re-subscribing on every render.
  const fallbackRef = useRef(fallback);
  useEffect(() => {
    fallbackRef.current = fallback;
  }, [fallback]);
  useEffect(() => {
    const onChange = (e: Event) => {
      const { detail } = e as CustomEvent;
      if (detail === key) setValue(read(key, fallbackRef.current));
    };
    // Cross-tab sync (audit F-21): the browser fires `storage` on OTHER tabs
    // for every localStorage write — listening here means every useStore
    // consumer (favourites, compare tray, leads, …) stays coherent across
    // tabs, not just auth.
    const onStorage = (e: StorageEvent) => {
      if (e.key === PREFIX + key) setValue(read(key, fallbackRef.current));
    };
    window.addEventListener('keja-store-change', onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('keja-store-change', onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, [key]);
  const set = (v: T | ((prev: T) => T)) => {
    const next = typeof v === 'function' ? (v as (prev: T) => T)(read(key, fallback)) : v;
    write(key, next);
    setValue(next);
  };
  return [value, set];
}

export const store = {
  get: <T>(key: string, fallback: T): T => read(key, fallback),
  set: <T>(key: string, value: T) => write(key, value),
};

export const KEYS = {
  favorites: 'favorites',
  leads: 'leads',
  profile: 'profile',
  chat: 'chat-history',
  language: 'language',
  viewed: 'recently-viewed',
  searches: 'saved-searches',
  compare: 'compare-list',
  notifications: 'notifications',
};

/* ------------------------- validated reads (wave 10) ------------------------ */
/**
 * Boundary validation for persisted domain state (audit F-19, extended from
 * auth/tokenize/auto-listings to the every-visitor stores). useStore trusts
 * `JSON.parse(raw) as T`, so one corrupted write (partial write, quota hit,
 * stale shape from an older build, devtools edit) crashed the view that read
 * it. useValidatedStore adds a zod schema at the read seam:
 *
 *   - a value that fails the schema falls back to `fallback`
 *   - an ARRAY whose shape fails element-wise is filtered to the valid
 *     entries (the same drop-loudly-never-crash policy as auto-listings)
 *   - whenever the stored value changes (fallback or filtering), it is
 *     repaired in storage so subsequent reads are stable
 *
 * The drop is logged once in development, never silent in production code.
 */
export function useValidatedStore<T>(
  key: string,
  schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false } },
  fallback: T,
): [T, (v: T | ((prev: T) => T)) => void] {
  const validatedRead = useCallback(
    (fb: T): { value: T; repaired: T | null } => {
      try {
        const raw = localStorage.getItem(PREFIX + key);
        if (!raw) return { value: fb, repaired: null };
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          return { value: fb, repaired: fb };
        }
        const whole = schema.safeParse(parsed);
        if (whole.success) return { value: whole.data, repaired: null };
        if (Array.isArray(parsed) && Array.isArray(fb)) {
          // element-wise salvage: keep the valid entries, drop the rest
          const kept = parsed.filter((e) => schema.safeParse([e]).success);
          if (kept.length || parsed.length === 0) {
            const arr = kept as unknown as T;
            return { value: arr, repaired: kept.length === parsed.length ? null : arr };
          }
        }
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[store] '${key}' failed its schema — falling back`);
        }
        return { value: fb, repaired: fb };
      } catch {
        return { value: fb, repaired: null };
      }
    },
    [key, schema],
  );

  const [value, setValue] = useState<T>(() => {
    const { value: v, repaired } = validatedRead(fallback);
    if (repaired !== null) write(key, repaired);
    return v;
  });

  const fallbackRef = useRef(fallback);
  useEffect(() => {
    fallbackRef.current = fallback;
  }, [fallback]);

  // repair also when another tab (storage) or this tab (keja-store-change)
  // delivers an invalid payload — the listener is the same seam useStore uses
  useEffect(() => {
    const validate = () => {
      const { value: v, repaired } = validatedRead(fallbackRef.current);
      if (repaired !== null) write(key, repaired);
      setValue(v);
    };
    const onChange = (e: Event) => {
      if ((e as CustomEvent).detail === key) validate();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === PREFIX + key) validate();
    };
    window.addEventListener('keja-store-change', onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('keja-store-change', onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, [key, validatedRead]);

  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      setValidated(key, v, fallbackRef, validatedRead, setValue);
    },
    [key, validatedRead],
  );
  return [value, set];
}

/** The validated setter: function-updaters seed from the validated value,
 *  never from a raw (possibly corrupted) storage read. */
const setValidated = <T,>(
  key: string,
  v: T | ((prev: T) => T),
  fallbackRef: { current: T },
  validatedRead: (fb: T) => { value: T; repaired: T | null },
  setValue: Dispatch<SetStateAction<T>>,
) => {
  const seed = validatedRead(fallbackRef.current).value;
  const next = typeof v === 'function' ? (v as (prev: T) => T)(seed) : v;
  write(key, next);
  setValue(next);
};

/* ------------------- shared validated hooks (wave 10) ---------------------- */
/** One validated read per key per app — these hooks replace the scattered
 *  `useStore<string[]>('favorites', [])` call sites so the schema lives in
 *  exactly one place. */

export const useFavorites = () => useValidatedStore<string[]>(KEYS.favorites, idListSchema, []);
export const useCompareList = () => useValidatedStore<string[]>('compare', idListSchema, []);
export const useChatHistory = () =>
  useValidatedStore<ChatMessage[]>(KEYS.chat, chatHistorySchema, []);

export const seedLeads: Lead[] = [
  {
    id: 'seed-1',
    name: 'Brian Kimani',
    phone: '+254 722 111 222',
    email: 'brian.k@example.com',
    interest: 'Kilimani 3BR investment',
    budget: 'KES 12M–16M',
    timeline: '1–3 months',
    temperature: 'HOT',
    source: 'chat',
    propertyId: 'KJA-001',
    note: 'Diaspora buyer (Dubai). Wants ROI breakdown and video viewing.',
    createdAt: '2026-08-26T10:12:00Z',
  },
  {
    id: 'seed-2',
    name: 'Grace Achieng',
    phone: '+254 733 333 444',
    email: 'grace.a@example.com',
    interest: 'Nyali 4BR for family + holiday rental',
    budget: 'KES 15M–18M',
    timeline: '3–6 months',
    temperature: 'WARM',
    source: 'viewing',
    propertyId: 'KJA-009',
    note: 'Comparing Nyali vs Bamburi. Asked about Airbnb occupancy data.',
    createdAt: '2026-08-24T14:05:00Z',
  },
  {
    id: 'seed-3',
    name: 'David Mwangi',
    phone: '+254 701 555 666',
    interest: 'Land — Athi River / Kitengela',
    budget: 'KES 2.5M–4M',
    timeline: 'Researching',
    temperature: 'COLD',
    source: 'chat',
    note: 'First-time land buyer, educating himself on title verification.',
    createdAt: '2026-08-22T09:40:00Z',
  },
  {
    id: 'seed-4',
    name: 'Sarah Hassan',
    phone: '+254 736 777 888',
    email: 's.hassan@example.com',
    interest: 'Furnished Kileleshwa 1BR rental',
    budget: 'KES 60k–70k/mo',
    timeline: 'Immediate',
    temperature: 'HOT',
    source: 'contact',
    propertyId: 'KJA-012',
    note: 'Corporate relocation from Lagos. Needs move-in within 3 weeks.',
    createdAt: '2026-08-27T16:22:00Z',
  },
  {
    id: 'seed-5',
    name: 'Moses Kiptoo',
    phone: '+254 710 999 000',
    interest: 'Nanyuki land 10 acres',
    budget: 'KES 15M–20M',
    timeline: '6–12 months',
    temperature: 'WARM',
    source: 'chat',
    propertyId: 'KJA-013',
    note: 'Considering horticulture venture; asked about borehole permits.',
    createdAt: '2026-08-21T11:30:00Z',
  },
];
