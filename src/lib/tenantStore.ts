/**
 * Keja Tenant Hub — client-side store for renters.
 *
 * Application builder draft + submitted applications, maintenance requests,
 * lease tracker and the moving checklist, persisted to localStorage under
 * 'keja:tenant' via the shared useStore pattern ('keja-store-change' event).
 * All derived figures (renewal countdowns, affordability reads) come from the
 * pure helpers below so they stay testable. Demo boundary: nothing leaves the
 * browser; production routes requests into the landlord/agency pipeline.
 */
import { formatKES } from '@/lib/format';
import { useStore } from '@/lib/store';
import { newId } from '@/lib/uuid';

export interface RentalApplication {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  employment: 'employed' | 'self' | 'business' | 'remote';
  monthlyIncomeKes: number;
  employerName?: string;
  areas: string[];
  maxRentKes: number;
  beds: number;
  moveInBy: string; // 'YYYY-MM-DD'
  refName: string;
  refPhone: string;
  note?: string;
  createdAt: string; // ISO timestamp
  status: 'draft' | 'submitted';
}

export interface MaintenanceRequest {
  id: string;
  category: 'plumbing' | 'electrical' | 'appliance' | 'security' | 'other';
  title: string;
  detail: string;
  preferredTime: string;
  submittedAt: string; // ISO timestamp
  status: 'submitted' | 'acknowledged' | 'scheduled';
}

export interface LeaseInfo {
  start: string; // 'YYYY-MM-DD'
  end: string; // 'YYYY-MM-DD'
  monthlyRentKes: number;
  depositKes: number;
  propertyTitle: string;
  landlordName: string;
  propertyId?: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  hint: string;
}

export interface TenantHubData {
  lease: LeaseInfo | null;
  /** In-progress application builder state (status 'draft'). */
  draft: RentalApplication | null;
  applications: RentalApplication[];
  requests: MaintenanceRequest[];
  checklist: Record<string, boolean>;
}

export type RequestCategory = MaintenanceRequest['category'];
export type RequestStatus = MaintenanceRequest['status'];
export type ApplicationDraftInput = Omit<RentalApplication, 'id' | 'createdAt' | 'status'>;
export type NewMaintenanceRequest = Omit<MaintenanceRequest, 'id' | 'submittedAt' | 'status'>;

/** localStorage slot: 'keja:tenant' (PREFIX lives in lib/store). */
export const TENANT_KEY = 'tenant';

export const REQUEST_CATEGORIES: RequestCategory[] = [
  'plumbing',
  'electrical',
  'appliance',
  'security',
  'other',
];

export const PREFERRED_TIMES = [
  'Weekday mornings',
  'Weekday afternoons',
  'Weekday evenings',
  'Any Saturday',
  'Any Sunday',
];

/** Kenya's practical pre-move-in checklist (order = roughly the order you do them). */
export const MOVING_CHECKLIST: ChecklistItem[] = [
  {
    id: 'kplc',
    title: 'KPLC electricity account transfer',
    hint: 'Move the meter & account into your name, clear any outstanding units.',
  },
  {
    id: 'water',
    title: 'Water account registration',
    hint: 'County / Nairobi Water account in your name — check the last bill was settled.',
  },
  {
    id: 'internet',
    title: 'Internet installation booking',
    hint: 'Fibre install slot (Safaricom, Zuku, Jamii…) — book 1–2 weeks ahead.',
  },
  {
    id: 'locks',
    title: 'Change locks & cut spare keys',
    hint: 'Re-key or replace locks; hand spare copies only to people you trust.',
  },
  {
    id: 'cleaning',
    title: 'Pre-move-in deep clean',
    hint: 'Windows, kitchen and bathrooms before the furniture arrives.',
  },
  {
    id: 'insurance',
    title: 'Home contents insurance',
    hint: 'Renters cover for your belongings — monthly premiums start small.',
  },
  {
    id: 'movers',
    title: 'Movers & packing plan',
    hint: 'Compare quotes, buy boxes, book a lift slot if the building needs one.',
  },
  {
    id: 'address',
    title: 'Address change & courier point',
    hint: 'Bank statements, employer HR, and a P.O. Box / courier pickup point.',
  },
  {
    id: 'garbage',
    title: 'Garbage & waste registration',
    hint: 'Register with the estate or county waste collection service.',
  },
  {
    id: 'estate',
    title: 'Estate registration & caretaker intro',
    hint: 'Gate access, visitor rules, caretaker and security contacts saved.',
  },
];

/* ------------------------------ pure helpers ------------------------------ */

const DAY_MS = 86_400_000;
const PHONE_RE = /^(\+?254|0)[17]\d{8}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const todayStr = () => new Date().toISOString().slice(0, 10);

/** Kenyan mobile format: 07…, 01…, +2547…, 2541… (spaces and dashes ignored). */
export function isValidKejaPhone(phone: string): boolean {
  return PHONE_RE.test(phone.replace(/[\s-]/g, ''));
}

function isValidDate(value: string): boolean {
  return DATE_RE.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

export interface ApplicationValidation {
  ok: boolean;
  errors: string[];
}

/** Full submission validation — every field a partner agency will ask for. */
export function validateApplication(app: RentalApplication): ApplicationValidation {
  const errors: string[] = [];
  if (app.fullName.trim().length < 3) {
    errors.push('Full name is required (at least 3 characters).');
  }
  if (!isValidKejaPhone(app.phone)) {
    errors.push('Phone must be a valid Kenyan mobile (07…, 01… or +254 7…).');
  }
  if (app.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(app.email)) {
    errors.push('Email address looks invalid.');
  }
  if (!(app.monthlyIncomeKes > 0)) {
    errors.push('Monthly income must be greater than zero.');
  }
  if (!(app.maxRentKes > 0)) {
    errors.push('Maximum monthly rent must be greater than zero.');
  }
  if (app.areas.length === 0) {
    errors.push('Select at least one preferred area.');
  }
  if (app.beds < 0) {
    errors.push('Bedrooms cannot be negative.');
  }
  if (!isValidDate(app.moveInBy)) {
    errors.push('Move-in date is required (YYYY-MM-DD).');
  }
  if (app.refName.trim().length < 3) {
    errors.push('Referee name is required.');
  }
  if (!isValidKejaPhone(app.refPhone)) {
    errors.push('Referee phone must be a valid Kenyan mobile.');
  }
  return { ok: errors.length === 0, errors };
}

/** Whole days from today (or a fixed `today`) until the lease ends. Negative = past. */
export function daysToRenewal(leaseEnd: string, today = todayStr()): number {
  return Math.round(
    (new Date(`${leaseEnd}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) /
      DAY_MS
  );
}

/** Day of the month rent falls due, derived from the lease start date. */
export function rentDueDay(leaseStart: string): number {
  return Number(leaseStart.slice(8, 10));
}

/** Whole days until the next rent due date (rolls to the next month when due). */
export function daysUntilRentDue(leaseStart: string, today = todayStr()): number {
  const day = rentDueDay(leaseStart);
  const [y, m, d] = today.split('-').map(Number);
  const nowTs = new Date(Date.UTC(y, m - 1, d)).getTime();
  let nextTs = new Date(Date.UTC(y, m - 1, day)).getTime();
  if (nextTs <= nowTs) nextTs = new Date(Date.UTC(y, m, day)).getTime();
  return Math.round((nextTs - nowTs) / DAY_MS);
}

export type CompetitivenessVerdict = 'strong' | 'moderate' | 'stretch';

export interface Competitiveness {
  /** rent ÷ income — lower is more competitive. */
  ratio: number;
  verdict: CompetitivenessVerdict;
  label: string;
}

/**
 * Renter-competitiveness read: how comfortably the target rent sits inside
 * the declared income. Strong ≤ 25% of income, Moderate ≤ 35%, beyond that
 * the application stretches. Self-declared figures → ESTIMATE.
 */
export function competitiveness(monthlyIncomeKes: number, rentKes: number): Competitiveness {
  const ratio = monthlyIncomeKes > 0 ? rentKes / monthlyIncomeKes : Number.POSITIVE_INFINITY;
  if (ratio <= 0.25) return { ratio, verdict: 'strong', label: 'Strong' };
  if (ratio <= 0.35) return { ratio, verdict: 'moderate', label: 'Moderate' };
  return { ratio, verdict: 'stretch', label: 'Stretch' };
}

/** Plain-text application summary for sharing with any Keja partner agency. */
export function applicationSummary(app: RentalApplication): string {
  const lines = [
    `KEJA RENTAL APPLICATION — ${app.fullName}`,
    `Phone: ${app.phone}${app.email ? ` · Email: ${app.email}` : ''}`,
    `Areas: ${app.areas.join(', ')} · Beds: ${app.beds} · Max rent: ${formatKES(app.maxRentKes, {
      monthly: true,
    })}`,
    `Income: ${formatKES(app.monthlyIncomeKes, { monthly: true })} (${app.employment}${
      app.employerName ? ` — ${app.employerName}` : ''
    })`,
    `Move-in by: ${app.moveInBy}`,
    `Reference: ${app.refName} (${app.refPhone})`,
  ];
  if (app.note) lines.push(`Note: ${app.note}`);
  lines.push('Shared via Keja — self-declared figures, ESTIMATE until verified.');
  return lines.join('\n');
}

/** Demo pipeline step: submitted → acknowledged → scheduled. */
export function nextRequestStatus(status: RequestStatus): RequestStatus {
  if (status === 'submitted') return 'acknowledged';
  return 'scheduled';
}

/* -------------------------------- seed data ------------------------------- */

export const SEED_APPLICATION: RentalApplication = {
  id: 'app-seed-1',
  fullName: 'Mercy Wangari',
  phone: '+254 711 234 567',
  email: 'mercy.wangari@example.com',
  employment: 'employed',
  monthlyIncomeKes: 250000,
  employerName: 'Airtel Kenya',
  areas: ['Kilimani', 'Westlands'],
  maxRentKes: 60000,
  beds: 1,
  moveInBy: '2026-11-15',
  refName: 'Joseph Kariuki',
  refPhone: '+254 722 345 678',
  note: 'Relocating for a new role; prefers a furnished unit with parking.',
  createdAt: '2026-08-22T10:00:00Z',
  status: 'submitted',
};

/** Matches Keja listing KJA-012 (Furnished 1BR — Kileleshwa). */
export const SEED_LEASE: LeaseInfo = {
  start: '2026-06-01',
  end: '2027-05-31',
  monthlyRentKes: 65000,
  depositKes: 130000,
  propertyTitle: 'Furnished 1BR — Kileleshwa',
  landlordName: 'Nairobi Habitat Realtors',
  propertyId: 'KJA-012',
};

export const SEED_REQUESTS: MaintenanceRequest[] = [
  {
    id: 'req-seed-1',
    category: 'plumbing',
    title: 'Bathroom hot tap leaking',
    detail: 'Hot water tap in the bathroom drips continuously; the basin is draining slowly too.',
    preferredTime: 'Weekday mornings',
    submittedAt: '2026-08-30T08:30:00Z',
    status: 'acknowledged',
  },
  {
    id: 'req-seed-2',
    category: 'appliance',
    title: 'Oven tripping the main switch',
    detail: 'The oven trips the RCD whenever it heats past 180°C. Fridge and hob are fine.',
    preferredTime: 'Any Saturday',
    submittedAt: '2026-09-05T19:05:00Z',
    status: 'submitted',
  },
];

export const SEED_TENANT: TenantHubData = {
  lease: SEED_LEASE,
  draft: null,
  applications: [SEED_APPLICATION],
  requests: SEED_REQUESTS,
  checklist: {},
};

/* --------------------------------- the hook ------------------------------- */

export type SubmitResult =
  { ok: true; application: RentalApplication } | { ok: false; errors: string[] };

function uid(prefix: string): string {
  return newId(prefix);
}

const cloneSeed = (): TenantHubData => JSON.parse(JSON.stringify(SEED_TENANT)) as TenantHubData;

/**
 * The Tenant Hub store hook. State lives in localStorage ('keja:tenant') and
 * stays in sync across components via the 'keja-store-change' event.
 */
export function useTenantStore() {
  const [data, setData] = useStore<TenantHubData>(TENANT_KEY, SEED_TENANT);

  const saveDraft = (draft: ApplicationDraftInput) => {
    setData((prev) => ({
      ...prev,
      draft: {
        ...draft,
        id: prev.draft?.id ?? uid('app'),
        createdAt: prev.draft?.createdAt ?? new Date().toISOString(),
        status: 'draft' as const,
      },
    }));
  };

  const clearDraft = () => setData((prev) => ({ ...prev, draft: null }));

  const submitApplication = (source?: ApplicationDraftInput): SubmitResult => {
    const base = source ?? data.draft;
    if (!base) return { ok: false, errors: ['Nothing to submit — the builder is empty.'] };
    const candidate: RentalApplication = {
      ...base,
      id: uid('app'),
      createdAt: new Date().toISOString(),
      status: 'submitted',
    };
    const validation = validateApplication(candidate);
    if (!validation.ok) return { ok: false, errors: validation.errors };
    setData((prev) => ({
      ...prev,
      draft: null,
      applications: [candidate, ...prev.applications],
    }));
    return { ok: true, application: candidate };
  };

  const setLease = (lease: LeaseInfo) => setData((prev) => ({ ...prev, lease }));

  const clearLease = () => setData((prev) => ({ ...prev, lease: null }));

  const addRequest = (request: NewMaintenanceRequest) => {
    setData((prev) => ({
      ...prev,
      requests: [
        {
          ...request,
          id: uid('req'),
          submittedAt: new Date().toISOString(),
          status: 'submitted' as const,
        },
        ...prev.requests,
      ],
    }));
  };

  /** Demo only: simulate the landlord/agency acknowledging and scheduling. */
  const advanceRequest = (id: string) => {
    setData((prev) => ({
      ...prev,
      requests: prev.requests.map((r) =>
        r.id === id && r.status !== 'scheduled' ? { ...r, status: nextRequestStatus(r.status) } : r
      ),
    }));
  };

  const toggleChecklistItem = (id: string) => {
    setData((prev) => ({ ...prev, checklist: { ...prev.checklist, [id]: !prev.checklist[id] } }));
  };

  const resetDemo = () => setData(cloneSeed());

  return {
    data,
    saveDraft,
    clearDraft,
    submitApplication,
    setLease,
    clearLease,
    addRequest,
    advanceRequest,
    toggleChecklistItem,
    resetDemo,
  };
}
