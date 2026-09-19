/**
 * Wave 19 — "portal-aware account identity" regression tests.
 *
 * The navbar account entry used to be a dead "Account" label: it told the
 * visitor nothing about which account they were signing into, and a
 * signed-in user had to leave for /account to see anything. The new
 * AccountMenu answers "which account am I logging into" for both states,
 * and this file pins the contracts behind it:
 *
 *   1. PORTAL DIRECTORY — the eight stakeholder portals, in homepage
 *      order, with valid lanes, distinct routes and non-empty workspace
 *      labels; every account type maps to a home portal.
 *   2. ROUTE CONTEXT — portalForRoute / portalContextForRoute resolve
 *      exact routes, sub-routes and the complementary routes.
 *   3. SOURCE CONTRACTS — the homepage grid derives from the directory
 *      (no drift), the navbar mounts the AccountMenu, the guest state
 *      offers sign-in/register + the eight portals, and the signed-in
 *      state renders the profile, the lane chip and the portal quick
 *      actions sourced from accountTypes.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  PORTAL_DIRECTORY,
  portalContextForRoute,
  portalForAccountType,
  portalForRoute,
} from '@/lib/portalDirectory';
import { ACCOUNT_TYPE_VALUES, type AccountType } from '@/lib/accountTypes';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf-8');

/* ------------------------------------------------------------------ */
/* 1. The directory                                                     */
/* ------------------------------------------------------------------ */

const HOMEPAGE_ORDER = [
  'buyers',
  'landlords',
  'investors',
  'tenants',
  'banks',
  'developers',
  'diaspora',
  'agents',
] as const;

describe('the portal directory (wave 19)', () => {
  it('has the eight stakeholder portals in homepage card order', () => {
    expect(PORTAL_DIRECTORY.map((p) => p.key)).toEqual([...HOMEPAGE_ORDER]);
  });

  it('every portal has a lane, a distinct route and a non-empty workspace label', () => {
    const routes = new Set<string>();
    for (const p of PORTAL_DIRECTORY) {
      expect(p.lane === 'any' || (ACCOUNT_TYPE_VALUES as readonly string[]).includes(p.lane)).toBe(true);
      expect(p.route.startsWith('/')).toBe(true);
      expect(p.route).not.toBe('/');
      expect(routes.has(p.route)).toBe(false); // one route, one portal
      routes.add(p.route);
      expect(p.workspace.length).toBeGreaterThan(3);
      expect(p.name.length).toBeGreaterThan(3);
      expect(p.description.length).toBeGreaterThan(20);
    }
  });

  it('the six concrete lanes each gate exactly one workspace portal', () => {
    const lanePortals = PORTAL_DIRECTORY.filter((p) => p.lane !== 'any');
    const lanes = lanePortals.map((p) => p.lane);
    expect(new Set(lanes).size).toBe(lanes.length); // no two portals share a lane
    expect(lanes.sort()).toEqual([...(ACCOUNT_TYPE_VALUES as string[])].sort());
  });

  it('every account type maps to a home portal', () => {
    for (const t of ACCOUNT_TYPE_VALUES) {
      const portal = portalForAccountType(t as AccountType);
      expect(portal.lane).toBe(t);
    }
  });

  it('lookup helpers degrade safely on unknown input', () => {
    expect(portalForRoute('')).toBeNull();
    expect(portalForRoute('/')).toBeNull();
    expect(portalForRoute('/about')).toBeNull();
    expect(portalForRoute('manage')).toBeNull(); // must be path-shaped
  });
});

/* ------------------------------------------------------------------ */
/* 2. Route → portal context                                            */
/* ------------------------------------------------------------------ */

describe('route context (which portal am I looking at?)', () => {
  it('exact routes resolve to their portal', () => {
    expect(portalForRoute('/manage')?.key).toBe('landlords');
    expect(portalForRoute('/portfolio')?.key).toBe('investors');
    expect(portalForRoute('/tenant')?.key).toBe('tenants');
    expect(portalForRoute('/institutional')?.key).toBe('banks');
    expect(portalForRoute('/develop')?.key).toBe('developers');
    expect(portalForRoute('/diaspora')?.key).toBe('diaspora');
    expect(portalForRoute('/pro')?.key).toBe('agents');
    expect(portalForRoute('/properties')?.key).toBe('buyers');
  });

  it('sub-routes keep their portal context', () => {
    expect(portalForRoute('/properties/KJA-001')?.key).toBe('buyers');
    expect(portalForRoute('/manage/')?.key).toBe('landlords'); // trailing slash
  });

  it('complementary routes resolve through the context map', () => {
    expect(portalContextForRoute('/sell')?.key).toBe('buyers'); // sellers list here
    expect(portalContextForRoute('/invest')?.key).toBe('investors');
    expect(portalContextForRoute('/tokenize')?.key).toBe('investors');
    expect(portalContextForRoute('/deal-analyst')?.key).toBe('investors');
    expect(portalContextForRoute('/ask')?.key).toBe('tenants');
    expect(portalContextForRoute('/about')).toBeNull(); // no portal context
  });
});

/* ------------------------------------------------------------------ */
/* 3. Source contracts                                                  */
/* ------------------------------------------------------------------ */

describe('account identity wiring (source contracts)', () => {
  const navbar = read('src/components/shell/Navbar.tsx');
  const menu = read('src/components/shell/AccountMenu.tsx');
  const home = read('src/components/home/Home.tsx');

  it('the homepage grid derives from the directory (single source of truth)', () => {
    expect(home).toContain('PORTAL_DIRECTORY.map');
    expect(home).not.toMatch(/const STAKEHOLDERS = \[/); // hand-copied list is gone
  });

  it('the navbar mounts the AccountMenu (the dead Account label is retired)', () => {
    expect(navbar).toContain('<AccountMenu />');
    expect(navbar).not.toMatch(/nav\.account['"]?\s*\}\s*<\/Button>/);
  });

  it('the guest state answers "which account am I logging into": sign-in/register + all eight portals', () => {
    expect(menu).toContain('Sign in or register');
    expect(menu).toContain('setAuthModalOpen(true)');
    expect(menu).toContain('The eight portals');
    expect(menu).toContain('PORTAL_DIRECTORY.map'); // guest list derives from the directory
    expect(menu).toContain("lane — landlord, investor, developer,");
  });

  it('the signed-in state shows the profile, the lane chip and the portal quick elements', () => {
    expect(menu).toContain('twoFactorEnrolled');
    expect(menu).toContain('needsRegistration');
    expect(menu).toContain('portalForAccountType(user.accountType)');
    expect(menu).toContain('{portal.name} · {portal.workspace}');
    expect(menu).toContain('info.actions.map'); // quick actions sourced from accountTypes
    expect(menu).toContain('Finish setup.');
  });

  it('the signed-in state names the workspace being viewed and confirms the lane match', () => {
    expect(menu).toContain('ViewingStrip');
    expect(menu).toContain('portalContextForRoute(route.path)');
    expect(menu).toContain('Your lane');
    expect(menu).toContain('Switch lane');
  });

  it('sign out is offered in place (logout wired from the menu)', () => {
    expect(menu).toContain("logout('account menu')");
  });

  it('the directory routes every portal to a route KejaApp actually renders', () => {
    const kejaApp = read('src/components/shell/KejaApp.tsx');
    for (const p of PORTAL_DIRECTORY) {
      const head = p.route.slice(1);
      expect(kejaApp).toContain(`case '${head}':`);
    }
  });

  it('portal routes are app sections or public sections the catalogue knows', () => {
    const sectionMeta = read('src/lib/sectionMeta.ts');
    for (const p of PORTAL_DIRECTORY) {
      expect(sectionMeta).toContain(`path: '${p.route}'`);
    }
  });
});
