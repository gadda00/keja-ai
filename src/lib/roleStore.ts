/**
 * First-visit role selection — narrows the first session to one job.
 *
 * Review feedback: "the first interaction should ask a single question:
 * What are you trying to do?" The chosen role personalises the home hero and
 * quick actions, and can be changed at any time from the footer of the home
 * page. Stored locally; never leaves the device.
 */
import { useEffect, useState } from 'react';

import { track } from '@/lib/analytics';

export type VisitorRole = 'buy' | 'rent' | 'invest' | 'list' | 'manage';

export const ROLE_STORAGE_KEY = 'keja:role';
/** Also gate on first-visit flag so returning demo users are not re-prompted. */
export const ROLE_ASKED_KEY = 'keja:role-asked';

export const ROLES: {
  value: VisitorRole;
  label: string;
  blurb: string;
  emoji: string;
  /** primary CTA destination for this role */
  to: string;
  cta: string;
}[] = [
  {
    value: 'buy',
    label: 'Buy a home',
    blurb: 'Search verified listings with full evidence',
    emoji: '🏡',
    to: '/properties?purpose=buy',
    cta: 'Browse homes for sale',
  },
  {
    value: 'rent',
    label: 'Rent a place',
    blurb: 'Furnished, family and corporate rentals',
    emoji: '🔑',
    to: '/properties?purpose=rent',
    cta: 'Browse rentals',
  },
  {
    value: 'invest',
    label: 'Invest',
    blurb: 'Yields, projections and honest math',
    emoji: '📈',
    to: '/invest',
    cta: 'Open the investment tools',
  },
  {
    value: 'list',
    label: 'List / sell property',
    blurb: 'Free guided wizard, verification included',
    emoji: '🏷️',
    to: '/sell',
    cta: 'Start the listing wizard',
  },
  {
    value: 'manage',
    label: 'Manage property',
    blurb: 'Tenant sourcing, rent and statements',
    emoji: '🧾',
    to: '/manage',
    cta: 'See management services',
  },
];

export function getRole(): VisitorRole | null {
  try {
    const raw = localStorage.getItem(ROLE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as VisitorRole) : null;
  } catch {
    return null;
  }
}

export function setRole(role: VisitorRole) {
  try {
    localStorage.setItem(ROLE_STORAGE_KEY, JSON.stringify(role));
  } catch {
    /* storage blocked — choice lives only for this render */
  }
  track({ event: 'role_selected', role });
  window.dispatchEvent(new CustomEvent('keja-store-change', { detail: 'role' }));
}

export function roleWasAsked(): boolean {
  try {
    return localStorage.getItem(ROLE_ASKED_KEY) === '1';
  } catch {
    return true; // storage blocked — never nag
  }
}

export function markRoleAsked() {
  try {
    localStorage.setItem(ROLE_ASKED_KEY, '1');
  } catch {
    /* ignore */
  }
}

/** React hook: reads the role and re-renders on change. */
export function useRole(): VisitorRole | null {
  const [role, setLocal] = useState<VisitorRole | null>(getRole);
  useEffect(() => {
    const onChange = () => setLocal(getRole());
    window.addEventListener('keja-store-change', onChange);
    return () => window.removeEventListener('keja-store-change', onChange);
  }, []);
  return role;
}
