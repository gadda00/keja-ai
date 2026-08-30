/**
 * Search v2: saved searches, alert matching, map coordinates, notifications.
 * All client-side (localStorage) — upgradeable to server push later.
 */
import { useCallback, useEffect } from 'react'
import type { Property } from '@/data/properties'
import { useStore, store, KEYS } from '@/lib/store'
import { isRentalPrice } from '@/lib/finance'

export interface SavedSearch {
  id: string
  label: string
  filters: {
    q?: string
    type?: string
    purpose?: string
    area?: string
    maxPrice?: number
    minBeds?: number
    verifiedOnly?: boolean
    sort?: string
  }
  createdAt: string
  alerts: boolean
  seenIds: string[]
}

export interface Notification {
  id: string
  kind: 'match' | 'listing' | 'distribution' | 'system'
  title: string
  body: string
  href?: string
  createdAt: string
  read: boolean
}

/* Approximate area coordinates (Kenya) — powers the stylized map view. */
export const AREA_COORDS: Record<string, { lat: number; lng: number }> = {
  Westlands: { lat: -1.267, lng: 36.806 },
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
}

/** Milimani exists in both Mombasa and Kisumu — disambiguate by county. */
const COUNTY_COORD_OVERRIDES: Record<string, { lat: number; lng: number }> = {
  Kisumu: { lat: -0.091, lng: 34.768 },
}

export function areaCoords(area: string, county?: string): { lat: number; lng: number } {
  if (county && COUNTY_COORD_OVERRIDES[county]) return COUNTY_COORD_OVERRIDES[county]
  return AREA_COORDS[area] ?? { lat: -1.286, lng: 36.817 } // default: Nairobi
}

/* ------------------------------ saved searches ----------------------------- */

export function useSavedSearches() {
  const [searches, setSearches] = useStore<SavedSearch[]>(KEYS.searches, [])
  const save = useCallback(
    (filters: SavedSearch['filters'], label: string) => {
      const id = `ss-${Date.now()}`
      setSearches([
        { id, label, filters, createdAt: new Date().toISOString(), alerts: true, seenIds: [] },
        ...searches,
      ].slice(0, 12))
      return id
    },
    [searches, setSearches],
  )
  const remove = useCallback(
    (id: string) => setSearches(searches.filter((s) => s.id !== id)),
    [searches, setSearches],
  )
  const toggleAlerts = useCallback(
    (id: string) => setSearches(searches.map((s) => (s.id === id ? { ...s, alerts: !s.alerts } : s))),
    [searches, setSearches],
  )
  return { searches, save, remove, toggleAlerts }
}

/** True when the max-price filter sits at its ceiling (i.e. "Any"). */
export const PRICE_CEILING = 100
export const RENT_CEILING = 200

/** Does a property satisfy a saved search? Mirrors Properties page filter logic. */
export function matchesSearch(p: Property, f: SavedSearch['filters']): boolean {
  const rentMode = f.purpose === 'rent'
  if (f.q) {
    const q = f.q.toLowerCase()
    const hay = `${p.title} ${p.area} ${p.county} ${p.id} ${p.type} ${p.agency}`.toLowerCase()
    if (!hay.includes(q)) return false
  }
  if (f.type && f.type !== 'all' && p.type !== f.type) return false
  if (f.purpose === 'rent' && !p.purpose.includes('rent')) return false
  if (f.purpose === 'buy' && !p.purpose.includes('buy')) return false
  if (f.purpose === 'invest' && !p.purpose.includes('invest')) return false
  if (f.area && f.area !== 'all' && p.area !== f.area) return false
  if (f.maxPrice != null) {
    const atCeiling = f.maxPrice >= (rentMode ? RENT_CEILING : PRICE_CEILING)
    if (!atCeiling) {
      // Rent-mode caps apply to rentals (monthly KES k); sale-mode caps to
      // sale listings (KES M). Rentals pass sale caps and vice-versa — the
      // units are incomparable, so a cap in one scale never filters the other.
      if (isRentalPrice(p.price)) {
        if (rentMode && p.price > f.maxPrice * 1000) return false
      } else {
        if (!rentMode && p.price > f.maxPrice * 1_000_000) return false
      }
    }
  }
  if (f.minBeds && (p.bedrooms ?? 0) < f.minBeds) return false
  return true
}

/**
 * Run alert matching: for every saved search with alerts on, find matching
 * properties not yet seen; record them as notifications and mark them seen.
 */
export function runAlertSweep(properties: Property[]) {
  const searches: SavedSearch[] = store.get<SavedSearch[]>(KEYS.searches, [])
  const active = searches.filter((s) => s.alerts)
  if (!active.length) return
  const notifs: Notification[] = store.get<Notification[]>(KEYS.notifications, [])
  let added = false
  for (const s of active) {
    const hits = properties.filter((p) => matchesSearch(p, s.filters) && !s.seenIds.includes(p.id))
    if (!hits.length) continue
    s.seenIds = [...s.seenIds, ...hits.map((p) => p.id)].slice(-200)
    for (const p of hits.slice(0, 3)) {
      notifs.unshift({
        id: `n-${Date.now()}-${p.id}-${s.id}`,
        kind: 'match',
        title: 'New match for your saved search',
        body: `"${p.title}" in ${p.area} matches "${s.label}"`,
        href: `/properties/${p.id}`,
        createdAt: new Date().toISOString(),
        read: false,
      })
    }
    added = true
  }
  if (added) {
    store.set(KEYS.searches, searches)
    store.set(KEYS.notifications, notifs.slice(0, 50))
  }
}

/* ------------------------------ notifications ------------------------------ */

export function notify(n: Omit<Notification, 'id' | 'createdAt' | 'read'>) {
  const notifs = store.get<Notification[]>(KEYS.notifications, [])
  notifs.unshift({ ...n, id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, createdAt: new Date().toISOString(), read: false })
  store.set(KEYS.notifications, notifs.slice(0, 50))
}

export function useNotifications() {
  const [notifs, setNotifs] = useStore<Notification[]>(KEYS.notifications, [])
  const unread = notifs.filter((n) => !n.read).length
  const markAllRead = useCallback(() => setNotifs(notifs.map((n) => ({ ...n, read: true }))), [notifs, setNotifs])
  const clearAll = useCallback(() => setNotifs([]), [setNotifs])
  return { notifs, unread, markAllRead, clearAll }
}

/** One-time alert sweep on mount (after inventory loads). */
export function useAlertSweep(properties: Property[]) {
  useEffect(() => {
    const t = window.setTimeout(() => runAlertSweep(properties), 1500)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties.length])
}
