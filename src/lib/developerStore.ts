/**
 * KEJA Developer Directory — the admin-owned registry of property developers
 * (wave 17).
 *
 * Before wave 17 the public developer portal shipped a hardcoded array of
 * three fictional project profiles; nobody could log in, register as a
 * developer, or be verified. The realistic shape is the opposite:
 *
 *  - the DEVELOPER DIRECTORY lives in the ADMIN console (verification desk):
 *    org profiles with track record + portfolio projects, moved through
 *    pending → verified / suspended by admins, every decision audited;
 *  - the PUBLIC /develop route is an authenticated WORKSPACE for the
 *    signed-in developer (their listings, their feasibility projects and
 *    market intelligence) — not a brochure listing every developer;
 *  - the marketplace side of a developer's activity is their account-owned
 *    listings (My listings), exactly like landlords and agents.
 *
 * Persistence: the shared localStorage store ('keja:developers'), designed to
 * map 1:1 onto a `developers` + `developer_projects` table pair in the
 * Phase-2 backend migration. Status changes flow through setDeveloperStatus()
 * so the audit trail sees every decision.
 */
import { logAudit } from '@/lib/adminStore';
import { store, useStore } from '@/lib/store';
import { newId } from '@/lib/uuid';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type DeveloperStatus = 'pending' | 'verified' | 'suspended';

/** A project in a developer's portfolio (off-plan / completed schemes). */
export interface DeveloperProject {
  id: string;
  name: string;
  area: string;
  units: number;
  unitsSold: number;
  fromPrice: number;
  completion: string;
  progressPct: number;
  paymentPlan: string;
  rentalProjectionPct: number;
  type: 'apartment' | 'townhouse' | 'mixed';
}

/** A developer organisation in the directory. */
export interface DeveloperProfile {
  id: string;
  orgName: string;
  contactName: string;
  email: string;
  phone?: string;
  county: string;
  /** One-liner the admin desk keeps for context. */
  about: string;
  yearsActive: number;
  projectsDelivered: number;
  portfolio: DeveloperProject[];
  status: DeveloperStatus;
  createdAt: string;
  verifiedAt?: string;
}

/* ------------------------------------------------------------------ */
/* Seed — the desk's starting registry                                 */
/* ------------------------------------------------------------------ */

const now = Date.now();
const iso = (days: number) => new Date(now - days * 86_400_000).toISOString();

const seedDevelopers: DeveloperProfile[] = [
  {
    id: 'dev-savanna',
    orgName: 'Savanna Heights Development',
    contactName: 'Cynthia Achieng',
    email: 'projects@savannaheights.co.ke',
    phone: '+254 733 118 240',
    county: 'Nairobi',
    about: 'Boutique townhouse developer — Karen, Kileleshwa and Hardy schemes since 2017.',
    yearsActive: 9,
    projectsDelivered: 6,
    portfolio: [
      {
        id: newId('dvp'),
        name: 'Amani Ridge Residences',
        area: 'Karen',
        units: 48,
        unitsSold: 31,
        fromPrice: 14_500_000,
        completion: 'Q3 2027',
        progressPct: 62,
        paymentPlan: '20% deposit · 6 quarterly instalments · 10% on handover',
        rentalProjectionPct: 6.8,
        type: 'townhouse',
      },
    ],
    status: 'verified',
    createdAt: iso(210),
    verifiedAt: iso(180),
  },
  {
    id: 'dev-chacadom',
    orgName: 'Chacadom Development Co.',
    contactName: 'David Mwangi',
    email: 'info@chacadomdev.co.ke',
    phone: '+254 20 374 556',
    county: 'Nairobi',
    about: 'Mid-rise apartment developer active in Westlands and Kilimani since 2014.',
    yearsActive: 12,
    projectsDelivered: 11,
    portfolio: [
      {
        id: newId('dvp'),
        name: 'Skyline Lofts, Westlands',
        area: 'Westlands',
        units: 120,
        unitsSold: 96,
        fromPrice: 8_900_000,
        completion: 'Q1 2027',
        progressPct: 84,
        paymentPlan: '10% deposit · milestone-linked instalments · bank finance accepted',
        rentalProjectionPct: 8.2,
        type: 'apartment',
      },
    ],
    status: 'verified',
    createdAt: iso(160),
    verifiedAt: iso(140),
  },
  {
    id: 'dev-learning',
    orgName: 'Learning City Properties',
    contactName: 'Grace Wanjiku',
    email: 'desk@learningcityproperties.co.ke',
    phone: '+254 711 902 214',
    county: 'Nairobi',
    about: 'Purpose-built student housing around the University of Nairobi corridor.',
    yearsActive: 7,
    projectsDelivered: 4,
    portfolio: [
      {
        id: newId('dvp'),
        name: 'Madaraka Student Living',
        area: 'Madaraka',
        units: 210,
        unitsSold: 178,
        fromPrice: 2_400_000,
        completion: 'Q4 2026',
        progressPct: 91,
        paymentPlan: '15% deposit · balance on possession · parent-guarantor plans',
        rentalProjectionPct: 9.6,
        type: 'apartment',
      },
    ],
    status: 'verified',
    createdAt: iso(120),
    verifiedAt: iso(95),
  },
  {
    id: 'dev-nyumbani',
    orgName: 'Nyumbani Coast Developers',
    contactName: 'Salma Bakari',
    email: 'salma@nyumbanicoast.co.ke',
    phone: '+254 726 445 870',
    county: 'Mombasa',
    about: 'Coastal holiday-home and apartment developer — Diani and Nyali schemes.',
    yearsActive: 5,
    projectsDelivered: 3,
    portfolio: [
      {
        id: newId('dvp'),
        name: 'Bahari Heights, Diani',
        area: 'Diani',
        units: 64,
        unitsSold: 18,
        fromPrice: 11_200_000,
        completion: 'Q2 2027',
        progressPct: 35,
        paymentPlan: '20% deposit · quarterly instalments over 24 months',
        rentalProjectionPct: 7.4,
        type: 'mixed',
      },
    ],
    status: 'pending',
    createdAt: iso(12),
  },
  {
    id: 'dev-ridgeview',
    orgName: 'Ridgeview Estates Ltd',
    contactName: 'Peter Kariuki',
    email: 'pkariuki@ridgeviewestates.co.ke',
    county: 'Kiambu',
    about: 'Gated-community developer in Kiambu and Athi River; applying with two schemes.',
    yearsActive: 4,
    projectsDelivered: 2,
    portfolio: [],
    status: 'pending',
    createdAt: iso(4),
  },
];

/* ------------------------------------------------------------------ */
/* Store + hooks                                                       */
/* ------------------------------------------------------------------ */

const DEVELOPERS_KEY = 'developers';

/** Read the whole directory (seed when nothing stored). */
export function getDevelopers(): DeveloperProfile[] {
  return store.get<DeveloperProfile[]>(DEVELOPERS_KEY, seedDevelopers);
}

/** React hook over the directory (shared store + change events). Read-only —
 *  mutations flow through setDeveloperStatus so the audit trail sees them. */
export function useDevelopers(): DeveloperProfile[] {
  const [developers] = useStore<DeveloperProfile[]>(DEVELOPERS_KEY, seedDevelopers);
  return developers;
}

/** Verified developers — the only ones whose names belong on public copy. */
export function verifiedDevelopers(all: DeveloperProfile[]): DeveloperProfile[] {
  return all.filter((d) => d.status === 'verified');
}

/**
 * Admin decision on a developer profile. Central mutator so every state
 * change lands in the audit trail with actor + target.
 */
export function setDeveloperStatus(
  id: string,
  status: DeveloperStatus,
  actor: { name: string; email: string },
): void {
  const all = getDevelopers();
  const next = all.map((d) =>
    d.id === id
      ? {
          ...d,
          status,
          verifiedAt: status === 'verified' ? new Date().toISOString() : d.verifiedAt,
        }
      : d,
  );
  store.set(DEVELOPERS_KEY, next);
  window.dispatchEvent(new CustomEvent('keja-store-change', { detail: DEVELOPERS_KEY }));
  const target = next.find((d) => d.id === id);
  logAudit({
    actor: actor.name,
    actorEmail: actor.email,
    action: `developer.${status === 'verified' ? 'verified' : status === 'suspended' ? 'suspended' : 'reopened'}`,
    target: target?.orgName ?? id,
    detail:
      status === 'verified'
        ? `Track record verified (${target?.projectsDelivered ?? 0} delivered schemes, ${target?.yearsActive ?? 0} years active)`
        : status === 'suspended'
          ? 'Directory listing suspended — public attribution paused pending review'
          : 'Application reopened for additional evidence',
    severity: status === 'suspended' ? 'warning' : 'info',
  });
}

/** Directory summary for the admin stat cards. */
export function directoryStats(all: DeveloperProfile[]) {
  return {
    verified: all.filter((d) => d.status === 'verified').length,
    pending: all.filter((d) => d.status === 'pending').length,
    suspended: all.filter((d) => d.status === 'suspended').length,
    portfolioProjects: all.reduce((s, d) => s + d.portfolio.length, 0),
  };
}
