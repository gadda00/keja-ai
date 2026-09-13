/**
 * Search v2: saved searches, alert matching, map coordinates, notifications.
 * All client-side (localStorage) — upgradeable to server push later.
 */
import { useCallback, useEffect } from 'react';

import type { Property } from '@/data/properties';
import { matchesFreeQuery, parseFreeQuery } from '@/lib/queryParser';
import { KEYS, store, useValidatedStore } from '@/lib/store';
import { notificationsSchema, savedSearchesSchema } from '@/lib/boundaries';
import { newId } from '@/lib/uuid';

export interface SavedSearch {
  id: string;
  label: string;
  filters: {
    q?: string;
    type?: string;
    purpose?: string;
    area?: string;
    maxPrice?: number;
    minBeds?: number;
    verifiedOnly?: boolean;
    sort?: string;
  };
  createdAt: string;
  alerts: boolean;
  seenIds: string[];
}

/** Verified band used across the marketplace (Trust ≥ 75 earns the badge). */
export const VERIFIED_TRUST_FLOOR = 75;

export interface Notification {
  id: string;
  kind: 'match' | 'listing' | 'distribution' | 'system';
  title: string;
  body: string;
  href?: string;
  createdAt: string;
  read: boolean;
}

/** Known areas for free-query parsing inside matchers — derived from the
 * live inventory (the same list the Properties page parses against), so a
 * saved query like "2BR Kilimani under 15M" keeps its area structure when
 * matched in a sweep instead of degrading to a substring scan. */
export function inventoryAreas(properties: Property[]): string[] {
  return [...new Set(properties.map((p) => p.area))];
}

/* Approximate area coordinates (Kenya) — powers the stylized map view. */
export const AREA_COORDS: Record<string, { lat: number; lng: number }> = {
  Westlands: { lat: -1.267, lng: 36.806 },
  Riverside: { lat: -1.277, lng: 36.766 },
  Kilimani: { lat: -1.283, lng: 36.784 },
  Kileleshwa: { lat: -1.279, lng: 36.773 },
  Lavington: { lat: -1.277, lng: 36.766 },
  Karen: { lat: -1.319, lng: 36.708 },
  Runda: { lat: -1.233, lng: 36.821 },
  Ruaka: { lat: -1.218, lng: 36.781 },
  Kasarani: { lat: -1.224, lng: 36.896 },
  CBD: { lat: -1.286, lng: 36.823 },
  Madaraka: { lat: -1.309, lng: 36.811 },
  Eastleigh: { lat: -1.292, lng: 36.849 },
  Syokimau: { lat: -1.352, lng: 36.9 },
  Kitengela: { lat: -1.483, lng: 36.983 },
  'Athi River': { lat: -1.453, lng: 36.983 },
  Nyali: { lat: -4.043, lng: 39.699 },
  Milimani: { lat: -4.052, lng: 39.677 }, // Mombasa (Kisumu's Milimani resolved via county below)
  Diani: { lat: -4.317, lng: 39.594 },
  Nanyuki: { lat: 0.016, lng: 37.072 },
  Nakuru: { lat: -0.303, lng: 36.08 },
  Kisumu: { lat: -0.091, lng: 34.768 },
};

/** Milimani exists in both Mombasa and Kisumu — disambiguate by county. */
const COUNTY_COORD_OVERRIDES: Record<string, { lat: number; lng: number }> = {
  Kisumu: { lat: -0.091, lng: 34.768 },
};

export function areaCoords(area: string, county?: string): { lat: number; lng: number } {
  if (county && COUNTY_COORD_OVERRIDES[county]) return COUNTY_COORD_OVERRIDES[county];
  return AREA_COORDS[area] ?? { lat: -1.286, lng: 36.817 }; // default: Nairobi
}

/* ------------------------------ saved searches ----------------------------- */

export function useSavedSearches() {
  const [searches, setSearches] = useValidatedStore<SavedSearch[]>(KEYS.searches, savedSearchesSchema, []);
  const save = useCallback(
    (filters: SavedSearch['filters'], label: string) => {
      const id = newId('ss');
      setSearches(
        [
          { id, label, filters, createdAt: new Date().toISOString(), alerts: true, seenIds: [] },
          ...searches,
        ].slice(0, 12)
      );
      return id;
    },
    [searches, setSearches]
  );
  const remove = useCallback(
    (id: string) => setSearches(searches.filter((s) => s.id !== id)),
    [searches, setSearches]
  );
  const toggleAlerts = useCallback(
    (id: string) =>
      setSearches(searches.map((s) => (s.id === id ? { ...s, alerts: !s.alerts } : s))),
    [searches, setSearches]
  );
  return { searches, save, remove, toggleAlerts };
}

/** Does a property satisfy a saved search? Mirrors Properties page filter
 * logic line-for-line — an alert must never fire on a listing the results
 * page would not have shown when the search was saved.
 *
 * maxPrice is absolute KES (the slider's own units), matching the schema and
 * the Properties page. previously it was interpreted in M/k units with
 * ceiling checks at 100/200 — a saved 15M cap excluded everything (15 <
 * 100 always at ceiling) while a 15k rent cap filtered sales in millions.
 */
export function matchesSearch(
  p: Property,
  f: SavedSearch['filters'],
  knownAreas: string[] = [],
): boolean {
  if (f.q) {
    // Same free-query semantics as the results page (queryParser, with the
    // same known-areas list) — a saved search must alert on the same
    // listings the user saw when saving it.
    const pq = parseFreeQuery(f.q, knownAreas);
    if (pq.raw && !matchesFreeQuery(p, pq)) return false;
  }
  if (f.type && f.type !== 'all' && p.type !== f.type) return false;
  if (f.purpose && f.purpose !== 'all' && !p.purpose.includes(f.purpose as Property['purpose'][number])) return false;
  if (f.area && f.area !== 'all' && p.area !== f.area) return false;
  if (f.maxPrice != null && p.price > f.maxPrice && !p.priceOnApplication) return false;
  if (f.minBeds && (p.bedrooms ?? 0) < f.minBeds) return false;
  if (f.verifiedOnly && p.trustScore < VERIFIED_TRUST_FLOOR) return false;
  return true;
}

/**
 * Run alert matching: for every saved search with alerts on, find matching
 * properties not yet seen; record them as notifications and mark them seen.
 */
export function runAlertSweep(properties: Property[]) {
  const searches: SavedSearch[] = store.get<SavedSearch[]>(KEYS.searches, []);
  const active = searches.filter((s) => s.alerts);
  if (!active.length) return;
  // raw reads inside the sweep go through the same schemas the hooks use —
  // a corrupted payload falls back to empty instead of throwing inside the
  // sweep's timeout (silent failure: no alerts, no seenIds persistence).
  const parsed = savedSearchesSchema.safeParse(searches);
  const safeSearches = parsed.success ? parsed.data : [];
  const activeSearches = safeSearches.filter((s) => s.alerts);
  if (!activeSearches.length) return;
  const areas = inventoryAreas(properties);
  const notifsParsed = notificationsSchema.safeParse(store.get<Notification[]>(KEYS.notifications, []));
  const notifs: Notification[] = notifsParsed.success ? notifsParsed.data : [];
  let added = false;
  for (const s of activeSearches) {
    const hits = properties.filter(
      (p) => matchesSearch(p, s.filters, areas) && !s.seenIds.includes(p.id),
    );
    if (!hits.length) continue;
    s.seenIds = [...s.seenIds, ...hits.map((p) => p.id)].slice(-200);
    for (const p of hits.slice(0, 3)) {
      notifs.unshift({
        id: newId('n'),
        kind: 'match',
        title: 'New match for your saved search',
        body: `"${p.title}" in ${p.area} matches "${s.label}"`,
        href: `/properties/${p.id}`,
        createdAt: new Date().toISOString(),
        read: false,
      });
    }
    added = true;
  }
  if (added) {
    store.set(KEYS.searches, safeSearches);
    store.set(KEYS.notifications, notifs.slice(0, 50));
  }
}

/* ------------------------------ notifications ------------------------------ */

export function notify(n: Omit<Notification, 'id' | 'createdAt' | 'read'>) {
  const notifs = store.get<Notification[]>(KEYS.notifications, []);
  notifs.unshift({
    ...n,
    id: newId('n'),
    createdAt: new Date().toISOString(),
    read: false,
  });
  store.set(KEYS.notifications, notifs.slice(0, 50));
}

export function useNotifications() {
  const [notifs, setNotifs] = useValidatedStore<Notification[]>(
    KEYS.notifications,
    notificationsSchema,
    []
  );
  const unread = notifs.filter((n) => !n.read).length;
  const markAllRead = useCallback(
    () => setNotifs(notifs.map((n) => ({ ...n, read: true }))),
    [notifs, setNotifs]
  );
  const clearAll = useCallback(() => setNotifs([]), [setNotifs]);
  const markOneRead = useCallback(
    (id: string) => setNotifs(notifs.map((n) => (n.id === id ? { ...n, read: true } : n))),
    [notifs, setNotifs]
  );
  const removeOne = useCallback(
    (id: string) => setNotifs(notifs.filter((n) => n.id !== id)),
    [notifs, setNotifs]
  );
  return { notifs, unread, markAllRead, clearAll, markOneRead, removeOne };
}

/** One-time alert sweep on mount (after inventory loads). */
export function useAlertSweep(properties: Property[]) {
  useEffect(() => {
    const t = window.setTimeout(() => runAlertSweep(properties), 1500);
    return () => window.clearTimeout(t);
    // deliberate: fire once when the inventory size settles — depending on
    // the array identity would re-run the sweep on every parent render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties.length]);
}
