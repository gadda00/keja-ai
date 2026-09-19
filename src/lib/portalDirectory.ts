/**
 * Portal directory — the eight stakeholder portals of the Keja platform.
 * ---------------------------------------------------------------------------
 * The homepage stakeholder grid, the navbar account menu and the account
 * page all describe "the portals" — buyers & sellers, landlords, investors,
 * tenants, banks & lenders, developers, diaspora, agents & professionals.
 * Until now every surface carried its own hand-copied list, so they could
 * (and did) drift. This module is the single source of truth:
 *
 *   - PORTAL_DIRECTORY — all eight portals, in homepage order, with the
 *     route each "Open workspace" card targets, the account lane the
 *     workspace expects and the quick elements the account menu shows.
 *   - portalForRoute() — which portal a visitor is currently looking at
 *     (the account menu's "viewing" context).
 *   - portalForAccountType() — the portal a registered account calls home
 *     (the "your portal" elements under the profile).
 *
 * Pure data + pure functions (same pattern as accountTypes.ts / ecosystem.ts):
 * safely importable from tests, SSR and any UI layer.
 */
import {
  Building2,
  GraduationCap,
  HandCoins,
  HeartHandshake,
  Landmark,
  LineChart,
  Plane,
  Users,
  type LucideIcon,
} from 'lucide-react';

import type { AccountType } from '@/lib/accountTypes';

export interface PortalInfo {
  /** stable key, e.g. 'landlords' */
  key: string;
  /** homepage card title, e.g. 'Landlords' */
  name: string;
  /** the workspace route the "Open workspace" card targets */
  route: string;
  /** human name of the workspace, e.g. 'Landlord console' */
  workspace: string;
  /** the account lane this workspace expects — 'any' admits every
   *  signed-in account (cross-cutting portals). */
  lane: AccountType | 'any';
  /** one-line description (homepage card copy) */
  description: string;
  icon: LucideIcon;
  /** sentence-case human label, e.g. 'Landlord' */
  label: string;
}

export const PORTAL_DIRECTORY: PortalInfo[] = [
  {
    key: 'buyers',
    name: 'Buyers & Sellers',
    route: '/properties',
    workspace: 'Marketplace',
    lane: 'any',
    description: 'Verified listings, fair-price screening and a guided purchase path.',
    icon: Users,
    label: 'Buyer / Seller',
  },
  {
    key: 'landlords',
    name: 'Landlords',
    route: '/manage',
    workspace: 'Landlord console',
    lane: 'landlord',
    description: 'Rent collection, tenant screening and portfolio performance in one desk.',
    icon: Building2,
    label: 'Landlord',
  },
  {
    key: 'investors',
    name: 'Investors',
    route: '/portfolio',
    workspace: 'Investor dashboard',
    lane: 'investor',
    description: 'Yield analysis, the investor dashboard and fractional ownership trials.',
    icon: LineChart,
    label: 'Investor',
  },
  {
    key: 'tenants',
    name: 'Tenants',
    route: '/tenant',
    workspace: 'Tenant hub',
    lane: 'renter',
    description: 'Rent affordability checks, verified homes and a tenant hub.',
    icon: HandCoins,
    label: 'Tenant',
  },
  {
    key: 'banks',
    name: 'Banks & Lenders',
    route: '/institutional',
    workspace: 'Institutional workspace',
    lane: 'institution',
    description: 'Qualified financing leads and property intelligence.',
    icon: Landmark,
    label: 'Bank / Lender',
  },
  {
    key: 'developers',
    name: 'Developers',
    route: '/develop',
    workspace: 'Developer workspace',
    lane: 'developer',
    description: 'The developer workspace — listings, feasibility screening and market intelligence.',
    icon: GraduationCap,
    label: 'Developer',
  },
  {
    key: 'diaspora',
    name: 'Diaspora',
    route: '/diaspora',
    workspace: 'Diaspora desk',
    lane: 'any',
    description: 'Invest in Kenya from anywhere — verification, viewing and management.',
    icon: Plane,
    label: 'Diaspora investor',
  },
  {
    key: 'agents',
    name: 'Agents & Professionals',
    route: '/pro',
    workspace: 'Pro workspace',
    lane: 'agent',
    description: 'A pro workspace with leads, valuation tools and market data.',
    icon: HeartHandshake,
    label: 'Agent / Professional',
  },
];

/** Exact-route lookup first (a portal owns its workspace route), then
 *  prefix match so detail pages (/portfolio/…) and sub-routes keep their
 *  portal context. Longest route wins on overlap. */
export function portalForRoute(path: string): PortalInfo | null {
  if (!path.startsWith('/')) return null;
  const norm = path.replace(/\/+$/, '') || '/';
  const exact = PORTAL_DIRECTORY.find((p) => p.route === norm);
  if (exact) return exact;
  const prefixed = PORTAL_DIRECTORY.filter((p) => norm.startsWith(`${p.route}/`))
    .sort((a, b) => b.route.length - a.route.length);
  return prefixed[0] ?? null;
}

/** The portal a registered account calls home. Buyers/sellers live in the
 *  marketplace (renter lane); every other lane maps 1:1 to its workspace. */
export function portalForAccountType(type: AccountType): PortalInfo {
  const map: Record<AccountType, string> = {
    renter: 'tenants',
    landlord: 'landlords',
    developer: 'developers',
    agent: 'agents',
    investor: 'investors',
    institution: 'banks',
  };
  const key = map[type];
  const portal = PORTAL_DIRECTORY.find((p) => p.key === key);
  if (!portal) {
    // unreachable while every AccountType is mapped — fail loud in dev
    throw new Error(`No portal mapped for account type '${type}'`);
  }
  return portal;
}

/** Routes that belong to a portal beyond its workspace route (e.g. the
 *  marketplace serves buyers, /invest complements /portfolio). Used by the
 *  account menu's "viewing" chip so context survives navigation. */
const EXTRA_PORTAL_ROUTES: Record<string, string[]> = {
  buyers: ['/sell'],
  investors: ['/invest', '/tokenize', '/deal-analyst'],
  landlords: ['/sell'],
  tenants: ['/ask'],
};

export function portalContextForRoute(path: string): PortalInfo | null {
  const direct = portalForRoute(path);
  if (direct) return direct;
  const norm = path.replace(/\/+$/, '') || '/';
  for (const [key, routes] of Object.entries(EXTRA_PORTAL_ROUTES)) {
    if (routes.some((r) => norm === r || norm.startsWith(`${r}/`))) {
      const portal = PORTAL_DIRECTORY.find((p) => p.key === key);
      if (portal) return portal;
    }
  }
  return null;
}
