/**
 * Account types — the groups a Keja account can belong to.
 * ---------------------------------------------------------------------------
 * Keja has one identity provider (Google) and several journeys. The account
 * type is chosen during registration (right after the first Google sign-in)
 * and personalises the experience: the destination the user lands on, the
 * quick actions in the account overview, and which workspace surfaces are
 * surfaced first. It can be changed at any time from the account page.
 *
 * This module is deliberately pure data (same pattern as roleStore.ts) so it
 * is safely importable from tests, SSR and any UI layer.
 */

export type AccountType = 'renter' | 'landlord' | 'developer' | 'agent' | 'investor';

export interface AccountTypeInfo {
  value: AccountType;
  label: string;
  /** short line shown on the registration cards */
  blurb: string;
  emoji: string;
  /** where a brand-new account of this type lands after registration */
  to: string;
  /** the primary CTA label for this group */
  cta: string;
  /** quick actions pinned to the account overview */
  actions: { label: string; to: string }[];
}

export const ACCOUNT_TYPES: AccountTypeInfo[] = [
  {
    value: 'renter',
    label: 'Find a home',
    blurb: 'Search verified rentals & homes for sale, save favourites and alerts',
    emoji: '🔑',
    to: '/properties',
    cta: 'Browse properties',
    actions: [
      { label: 'Browse properties', to: '/properties' },
      { label: 'Ask Keja AI', to: '/ask' },
      { label: 'Tenant hub', to: '/tenant' },
    ],
  },
  {
    value: 'landlord',
    label: 'Landlord',
    blurb: 'List your property, screen tenants and manage rent in one console',
    emoji: '🏡',
    to: '/sell',
    cta: 'Post your first property',
    actions: [
      { label: 'Post a property', to: '/sell' },
      { label: 'Landlord console', to: '/manage' },
      { label: 'Market data', to: '/data' },
    ],
  },
  {
    value: 'developer',
    label: 'Developer',
    blurb: 'Move inventory with data-backed pricing, portals and off-plan reach',
    emoji: '🏗️',
    to: '/sell',
    cta: 'Post your first property',
    actions: [
      { label: 'Post a property', to: '/sell' },
      { label: 'Developer portal', to: '/develop' },
      { label: 'Investor reach', to: '/institutional' },
    ],
  },
  {
    value: 'agent',
    label: 'Agent / Pro',
    blurb: 'Manage listings, leads and clients with the Pro workspace',
    emoji: '💼',
    to: '/pro',
    cta: 'Open the Pro workspace',
    actions: [
      { label: 'Post a property', to: '/sell' },
      { label: 'Pro workspace', to: '/pro' },
      { label: 'Partners', to: '/partners' },
    ],
  },
  {
    value: 'investor',
    label: 'Investor',
    blurb: 'Yields, portfolio tracking, deal analysis and fractional assets',
    emoji: '📈',
    to: '/invest',
    cta: 'Open the investment tools',
    actions: [
      { label: 'Investment tools', to: '/invest' },
      { label: 'Portfolio', to: '/portfolio' },
      { label: 'Deal analyst', to: '/deal-analyst' },
    ],
  },
];

export const ACCOUNT_TYPE_VALUES: readonly AccountType[] = ACCOUNT_TYPES.map((t) => t.value);

/** Type guard — a tampered storage slot must never feed unknown types in. */
export function isAccountType(v: unknown): v is AccountType {
  return typeof v === 'string' && (ACCOUNT_TYPE_VALUES as readonly string[]).includes(v);
}

export function accountTypeInfo(type: AccountType): AccountTypeInfo {
  const info = ACCOUNT_TYPES.find((t) => t.value === type);
  if (info) return info;
  throw new Error(`Unknown account type: ${String(type)}`);
}

/** Groups allowed to post properties to the marketplace. */
export const POSTING_TYPES: readonly AccountType[] = ['landlord', 'developer', 'agent'];

export function canPostProperties(type: AccountType | undefined | null): boolean {
  return !!type && POSTING_TYPES.includes(type);
}
