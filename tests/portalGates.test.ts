/**
 * Wave 18 — "all eight portals real" regression tests.
 *
 * The usability report behind the wave (2026-09-19): the homepage advertises
 * eight stakeholder cards ("Open workspace") but only /develop and /pro
 * were authenticated workspaces after wave 17 — /manage, /portfolio,
 * /tenant and /institutional served open demo ledgers and brochures, and
 * /diaspora's store (viewing slots, PoA checklist, purchase journey) had
 * no UI at all.
 *
 * These tests pin the contracts that make the wave real:
 *
 *   1. DIASPORA DESK — the journey steps, progress helpers and the
 *      slot lifecycle the desk drives (the store finally has a consumer).
 *   2. INSTITUTION LANE — the sixth account type validates through the
 *      account boundary and routes to the institutional workspace.
 *   3. INSTITUTIONAL ENQUIRY → PARTNER DESK — enquiries are real
 *      PartnerApplications (type 'institution') the admin console can
 *      adjudicate, not toasts into the void.
 *   4. GATE WIRING — every portal view actually mounts the shared
 *      PortalGate with the lane the stakeholder card promises (a source
 *      contract, same pattern as buildParity: wiring drift breaks the
 *      test, not the user).
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  activeJourneyStep,
  JOURNEY_STEPS,
  journeyProgressPct,
  nextJourneyStatus,
  POA_TASKS,
  type JourneyStepStatus,
} from '@/lib/diasporaStore';
import { userAccountSchema } from '@/lib/boundaries';
import { store } from '@/lib/store';
import { ACCOUNT_TYPES, accountTypeInfo, isAccountType } from '@/lib/accountTypes';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------------------------------------------ */
/* 1. The diaspora desk contracts                                        */
/* ------------------------------------------------------------------ */

describe('diaspora journey (wave 18)', () => {
  it('defines the eight-step remote purchase journey with resolvable ids', () => {
    expect(JOURNEY_STEPS).toHaveLength(8);
    expect(new Set(JOURNEY_STEPS.map((s) => s.id)).size).toBe(8);
    for (const s of JOURNEY_STEPS) {
      expect(s.label.length).toBeGreaterThan(3);
      expect(s.hint.length).toBeGreaterThan(10);
      if (s.to) expect(s.to.startsWith('/')).toBe(true);
    }
  });

  it('journeyProgressPct: 0 → 100 monotonic, unknown ids cannot inflate it', () => {
    expect(journeyProgressPct({})).toBe(0);
    const half: Record<string, JourneyStepStatus> = {
      [JOURNEY_STEPS[0].id]: 'done',
      [JOURNEY_STEPS[1].id]: 'done',
      [JOURNEY_STEPS[2].id]: 'done',
      [JOURNEY_STEPS[3].id]: 'done',
    };
    const halfPct = journeyProgressPct(half);
    expect(halfPct).toBe(50);
    const more: Record<string, JourneyStepStatus> = { ...half, [JOURNEY_STEPS[4].id]: 'done' };
    expect(journeyProgressPct(more)).toBeGreaterThan(halfPct);
    const full: Record<string, JourneyStepStatus> = Object.fromEntries(
      JOURNEY_STEPS.map((s) => [s.id, 'done' as const]),
    );
    expect(journeyProgressPct(full)).toBe(100);
    expect(journeyProgressPct({ 'not-a-step': 'done' })).toBe(0);
  });

  it('activeJourneyStep prefers the marked "next" over untouched defaults', () => {
    expect(activeJourneyStep({})).toBe(JOURNEY_STEPS[0]);
    const withNext: Record<string, JourneyStepStatus> = { [JOURNEY_STEPS[3].id]: 'next' };
    expect(activeJourneyStep(withNext)).toBe(JOURNEY_STEPS[3]);
    // done-only journeys have no active step left
    const full: Record<string, JourneyStepStatus> = Object.fromEntries(
      JOURNEY_STEPS.map((s) => [s.id, 'done' as const]),
    );
    expect(activeJourneyStep(full)).toBeUndefined();
  });

  it('journey statuses cycle untouched → next → done (the desk tap order)', () => {
    expect(nextJourneyStatus('untouched')).toBe('next');
    expect(nextJourneyStatus('next')).toBe('done');
    expect(nextJourneyStatus('done')).toBe('untouched');
  });

  it('the PoA checklist ships its nine embassy-to-registry steps', () => {
    expect(POA_TASKS).toHaveLength(9);
    expect(POA_TASKS[0].id).toBe('poa-embassy-appt');
    expect(POA_TASKS.at(-1)!.id).toBe('poa-lawyer-registration');
  });
});

/* ------------------------------------------------------------------ */
/* 2. The institution lane                                               */
/* ------------------------------------------------------------------ */

const baseAccount = {
  id: 'acct-inst-1',
  name: 'Grace Mwangi',
  email: 'grace@amanibank.example',
  role: 'user',
  provider: 'google',
  status: 'active',
  createdAt: '2026-09-19T00:00:00Z',
  lastLoginAt: '2026-09-19T00:00:00Z',
  loginCount: 1,
};

describe('institution account type (wave 18)', () => {
  it('is a first-class lane: catalogue entry, guard, workspace route', () => {
    expect(isAccountType('institution')).toBe(true);
    const info = accountTypeInfo('institution');
    expect(info.to).toBe('/institutional');
    expect(ACCOUNT_TYPES.map((t) => t.value)).toContain('institution');
    // the registration wizard offers it (ACCOUNT_TYPES drives the cards)
    expect(ACCOUNT_TYPES).toHaveLength(6);
  });

  it('survives the account boundary (tampered shapes still sign out)', () => {
    const parsed = userAccountSchema.safeParse({ ...baseAccount, accountType: 'institution' });
    expect(parsed.success).toBe(true);
    const bogus = userAccountSchema.safeParse({ ...baseAccount, accountType: 'bank' });
    expect(bogus.success).toBe(false);
    // every lane the wizard can mint passes validation
    for (const t of ACCOUNT_TYPES) {
      expect(userAccountSchema.safeParse({ ...baseAccount, accountType: t.value }).success).toBe(true);
    }
  });

  it('cannot post properties — institutions buy intelligence, not listings', () => {
    // POSTING_TYPES stays landlord/developer/agent; asserted via accountTypes suite
    expect((ACCOUNT_TYPES.find((t) => t.value === 'institution')!).actions.length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/* 3. Institutional enquiry → the partnerships desk                      */
/* ------------------------------------------------------------------ */

describe('institutional enquiries land on the partner desk (wave 18)', () => {
  it('persists a typed PartnerApplication the admin console reads back', () => {
    const application = {
      id: 'ptn-inst-1',
      orgName: 'Amani Bank Ltd',
      contactName: 'Grace Mwangi',
      email: 'grace@amanibank.example',
      type: 'institution' as const,
      market: 'Banks',
      listingsCount: 0,
      message: 'Collateral intelligence for our mortgage book',
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    };
    const existing = store.get<unknown[]>('partners', []);
    store.set('partners', [application, ...existing]);

    const readBack = store.get<Array<{ type: string; status: string; orgName: string }>>('partners', []);
    const mine = readBack.find((p) => p.orgName === 'Amani Bank Ltd');
    expect(mine).toBeDefined();
    expect(mine!.type).toBe('institution');
    expect(mine!.status).toBe('pending');

    // restore the seeded store so other assertions stay hermetic
    store.set('partners', existing);
  });
});

/* ------------------------------------------------------------------ */
/* 4. The gate wiring (source contract)                                  */
/* ------------------------------------------------------------------ */

const src = (p: string) => readFileSync(resolve(ROOT, p), 'utf8');

describe('every stakeholder portal mounts the gate (wave 18)', () => {
  const expectations: { file: string; lane: string; portal: string }[] = [
    { file: 'src/components/manage/ManageView.tsx', lane: 'landlord', portal: 'Landlords' },
    { file: 'src/components/invest/InvestorDashboardView.tsx', lane: 'investor', portal: 'Investors' },
    { file: 'src/components/manage/TenantHubView.tsx', lane: 'renter', portal: 'Tenants' },
    { file: 'src/components/institutional/InstitutionalPortalView.tsx', lane: 'institution', portal: 'Banks & Lenders' },
  ];

  it.each(expectations)('$portal ($file) is gated with the $lane lane', ({ file, lane }) => {
    const source = src(file);
    expect(source).toContain('PortalGate');
    expect(source).toMatch(new RegExp(`lane="${lane}"`));
    // the switch card contract: registration + lane switch, never a dead end
    expect(source).toContain('laneTitle=');
  });

  it('the diaspora desk is account-aware without a lane wall (segment, not role)', () => {
    const source = src('src/components/diaspora/DiasporaHubView.tsx');
    expect(source).toContain('requireAuth(');
    expect(source).toContain('DiasporaDesk');
    expect(source).toContain('DeskSignInCard');
    expect(source).toContain('RegistrationHint');
    // the store features finally have a UI
    expect(source).toContain('JOURNEY_STEPS');
    expect(source).toContain('POA_TASKS');
    expect(source).toContain('convertSlot');
  });

  it('the landlord console surfaces the marketplace listings it owns', () => {
    const source = src('src/components/manage/ManageView.tsx');
    expect(source).toContain('useUserListings');
    expect(source).toContain('ListingManageCard');
  });

  it('the buyer workspace surfaces the saved-homes filter (heart → shortlist)', () => {
    const source = src('src/components/property/PropertiesView.tsx');
    expect(source).toContain('savedOnly');
    expect(source).toMatch(/Saved\{favorites\.length/);
  });

  it('the shared gate exists exactly once (single source, no copy-paste drift)', () => {
    const source = src('src/components/common/PortalGate.tsx');
    expect(source).toContain('export function PortalGate');
    expect(source).toContain('export function RegistrationHint');
    // wave-17 gates keep their own (pre-shared-component) implementations
    expect(src('src/components/developer/DeveloperPortalView.tsx')).toContain('GuestGate');
    expect(src('src/components/common/ProWorkspaceView.tsx')).toContain('ProGuestGate');
  });

  it('chart data props stay referentially stable (recharts 3.10 #185 contract)', () => {
    // recharts' ChartDataContextProvider dispatches on every `data` identity
    // change — an inline .map() in a data prop loops the store into React
    // error #185. No view may build its chart data inline at the call site.
    const chartViews = [
      'src/components/invest/InvestorDashboardView.tsx',
      'src/components/manage/ManageView.tsx',
      'src/components/data/MarketDataView.tsx',
      'src/components/tokenize/TokenizeView.tsx',
    ];
    for (const f of chartViews) {
      expect(src(f)).not.toMatch(/data=\{[a-zA-Z]+\.(map|filter)\(/);
    }
  });

  it('no store reads an uncached snapshot (the TokenizeProvider #185 root cause)', () => {
    // Date.now() inside useSyncExternalStore's getSnapshot re-renders forever
    const source = src('src/lib/tokenizeStore.tsx');
    expect(source).not.toContain('useSyncExternalStore');
    expect(source).not.toContain('trialNowMs');
  });
});
