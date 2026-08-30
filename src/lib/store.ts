/**
 * Client-side store: favorites, leads, profile, chat history, language.
 * Uses localStorage so all features work without a backend — MVP-ready and
 * upgradeable to a real API later (roadmap Phase 2/3).
 */
import { useEffect, useState } from 'react'

const PREFIX = 'keja:'

export interface Lead {
  id: string
  name: string
  phone: string
  email?: string
  interest: string
  budget?: string
  timeline?: string
  temperature: 'HOT' | 'WARM' | 'COLD'
  source: 'chat' | 'viewing' | 'contact' | 'manual'
  propertyId?: string
  note?: string
  createdAt: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'keja'
  text: string
  ts: string
  meta?: string[]
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
    window.dispatchEvent(new CustomEvent('keja-store-change', { detail: key }))
  } catch {
    /* storage unavailable */
  }
}

export function useStore<T>(key: string, fallback: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => read(key, fallback))
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail === key) setValue(read(key, fallback))
    }
    window.addEventListener('keja-store-change', onChange)
    return () => window.removeEventListener('keja-store-change', onChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  const set = (v: T | ((prev: T) => T)) => {
    const next = typeof v === 'function' ? (v as (prev: T) => T)(read(key, fallback)) : v
    write(key, next)
    setValue(next)
  }
  return [value, set]
}

export const store = {
  get: <T>(key: string, fallback: T): T => read(key, fallback),
  set: <T>(key: string, value: T) => write(key, value),
}

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
}

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
]
