/**
 * Wave 17 — portal reality regression tests.
 *
 * The user report behind the wave (2026-09-19):
 *   "portals (e.g. developer) cannot be loggined or registered … the
 *    listings should also work … the developer list should only be
 *    available in admin side."
 *
 * These tests pin the three contracts that make that real:
 *
 *   1. DEVELOPER DIRECTORY — the admin-owned registry: seeded with
 *      verifiable shape, status transitions land in the audit trail, and
 *      the public surfaces only ever count verified organisations.
 *   2. LISTING PIPELINE — submissionToListing mints a marketplace-resolvable
 *      KJA-U… id (the publish-then-404 bug: the wizard navigated to the
 *      submission's UL-… id), availability lifecycle stays schema-valid,
 *      and view counting actually counts.
 *   3. WORKSPACE WIRING — the modules the developer workspace depends on
 *      (devStore projects carry an area; the destination contract in
 *      accountTypes) keep their shape.
 */
import { describe, expect, it } from 'vitest';

import {
  directoryStats,
  getDevelopers,
  setDeveloperStatus,
  verifiedDevelopers,
} from '@/lib/developerStore';
import {
  incrementListingViews,
  logAudit,
  submissionToListing,
  type ListingSubmission,
} from '@/lib/adminStore';
import { marketInventory, userListingToProperty } from '@/lib/inventory';
import { userListingsSchema } from '@/lib/boundaries';
import { freshnessOf } from '@/lib/verification';
import { newDevProject, DEFAULT_DEV_INPUTS } from '@/lib/devStore';

const baseSubmission = (): ListingSubmission => ({
  id: 'sub-test-1',
  submitterName: 'Amina Yusuf',
  submitterEmail: 'amina@example.com',
  submitterPhone: '+254 700 000 000',
  agency: 'Test Developers Ltd',
  ownerEmail: 'amina@example.com',
  ownerName: 'Amina Yusuf',
  title: 'Test 3BR apartment, Kilimani',
  type: 'apartment',
  purpose: ['buy'],
  area: 'Kilimani',
  county: 'Nairobi',
  price: 12_000_000,
  rentEstimate: 90_000,
  bedrooms: 3,
  bathrooms: 2,
  sizeSqm: 110,
  description: 'A long enough description to pass the schema screens without any trouble.',
  amenities: ['Lift'],
  images: [],
  source: 'wizard',
  status: 'pending',
  flags: [],
  completeness: 80,
  createdAt: '2026-09-19T00:00:00Z',
});

/* ------------------------------------------------------------------ */
/* 1. Developer directory (admin-side)                                  */
/* ------------------------------------------------------------------ */

describe('developer directory (wave 17)', () => {
  it('seeds a realistic registry: verified orgs with portfolios + pending applications', () => {
    const devs = getDevelopers();
    expect(devs.length).toBeGreaterThanOrEqual(5);
    expect(devs.filter((d) => d.status === 'verified').length).toBeGreaterThanOrEqual(3);
    expect(devs.filter((d) => d.status === 'pending').length).toBeGreaterThanOrEqual(2);
    for (const d of devs) {
      expect(d.orgName.length).toBeGreaterThan(3);
      expect(d.email).toMatch(/@/);
      expect(d.yearsActive).toBeGreaterThan(0);
      expect(d.portfolio.every((p) => p.units > 0 && p.unitsSold <= p.units)).toBe(true);
    }
  });

  it('directoryStats summarises the registry for the admin console', () => {
    const stats = directoryStats(getDevelopers());
    expect(stats.verified + stats.pending + stats.suspended).toBe(getDevelopers().length);
    expect(stats.portfolioProjects).toBe(
      getDevelopers().reduce((s, d) => s + d.portfolio.length, 0),
    );
  });

  it('setDeveloperStatus transitions state, stamps verification and writes the audit trail', () => {
    const actor = { name: 'Desk Admin', email: 'admin@keja.app' };
    const before = getDevelopers();
    const pending = before.find((d) => d.status === 'pending');
    expect(pending).toBeDefined();

    setDeveloperStatus(pending!.id, 'verified', actor);

    const after = getDevelopers();
    const verified = after.find((d) => d.id === pending!.id);
    expect(verified?.status).toBe('verified');
    expect(verified?.verifiedAt).toBeDefined();

    const audit = JSON.parse(localStorage.getItem('keja:audit') ?? '[]');
    expect(audit[0].action).toBe('developer.verified');
    expect(audit[0].actor).toBe('Desk Admin');
    expect(audit[0].target).toBe(pending!.orgName);
  });

  it('suspension is flagged as a warning in the audit trail', () => {
    const actor = { name: 'Desk Admin', email: 'admin@keja.app' };
    const verifiedOne = getDevelopers().find((d) => d.status === 'verified');
    setDeveloperStatus(verifiedOne!.id, 'suspended', actor);
    const audit = JSON.parse(localStorage.getItem('keja:audit') ?? '[]');
    expect(audit[0].action).toBe('developer.suspended');
    expect(audit[0].severity).toBe('warning');
  });

  it('verifiedDevelopers only exposes verified organisations to public copy', () => {
    const publicFacing = verifiedDevelopers(getDevelopers());
    expect(publicFacing.length).toBeGreaterThan(0);
    expect(publicFacing.every((d) => d.status === 'verified')).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* 2. Listing pipeline (the "listings should work" contract)            */
/* ------------------------------------------------------------------ */

describe('listing pipeline (wave 17)', () => {
  it('submissionToListing mints a marketplace-resolvable id — never the submission id', () => {
    const listing = submissionToListing(baseSubmission());
    // the publish-then-404 bug: the wizard navigated to the submission's
    // UL-… id which the inventory merge never resolves
    expect(listing.id).not.toBe('sub-test-1');
    expect(listing.id).toMatch(/^KJA-U/);
    expect(listing.submissionId).toBe('sub-test-1');
    // the wizard persists exactly this object; it must resolve through the
    // merged marketplace inventory (and the submission id must not)
    localStorage.setItem('keja:user-listings', JSON.stringify([listing]));
    expect(marketInventory().some((p) => p.id === listing.id)).toBe(true);
    expect(marketInventory().some((p) => p.id === 'sub-test-1')).toBe(false);
  });

  it('owner attribution survives the submission → listing conversion', () => {
    const listing = submissionToListing(baseSubmission());
    expect(listing.ownerEmail).toBe('amina@example.com');
    expect(listing.ownerName).toBe('Amina Yusuf');
    expect(listing.agent.name).toBe('Amina Yusuf');
  });

  it('the availability lifecycle (available → reserved → sold) stays schema-valid', () => {
    const listing = submissionToListing(baseSubmission());
    for (const availability of ['reserved', 'sold', 'available'] as const) {
      const next = [{ ...listing, availability }];
      expect(userListingsSchema.safeParse(next).success).toBe(true);
    }
  });

  it('incrementListingViews counts exactly once per call and only for stored listings', () => {
    const listing = submissionToListing(baseSubmission());
    localStorage.setItem(
      'keja:user-listings',
      JSON.stringify([listing]),
    );
    incrementListingViews(listing.id);
    incrementListingViews(listing.id);
    const stored = JSON.parse(localStorage.getItem('keja:user-listings') ?? '[]');
    expect(stored[0].views).toBe(2);

    // unknown id: no crash, no phantom rows
    incrementListingViews('KJA-Udoesnotexist');
    const after = JSON.parse(localStorage.getItem('keja:user-listings') ?? '[]');
    expect(after.length).toBe(1);
  });

  it('user listings render a detail page without crashing the Property Passport (wave 17 crash fix)', () => {
    // The bug: userListingToProperty stamped verification.lastChecked with
    // the FULL listedAt timestamp; the freshness engine built
    // `new Date(iso + 'T00:00:00Z')` → Invalid Date → RangeError inside the
    // passport → the whole detail page died behind the error boundary.
    // Seeds + Auto-Pilot listings always shipped date-only.
    const listing = submissionToListing(baseSubmission());
    const property = userListingToProperty(listing, false);
    expect(property.verification.lastChecked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // and the freshness engine accepts both the date-only and (defensively)
    // the legacy full-timestamp form without throwing
    expect(() => freshnessOf(property.verification.lastChecked)).not.toThrow();
    expect(() => freshnessOf(listing.listedAt)).not.toThrow();
    const f = freshnessOf(property.verification.lastChecked);
    expect(['fresh', 'recheck-due', 'expired']).toContain(f.state);
  });

  it('withdrawn listings leave the marketplace (the withdraw contract ListingManageCard relies on)', () => {
    const listing = submissionToListing(baseSubmission());
    localStorage.setItem('keja:user-listings', JSON.stringify([listing]));
    const remaining = JSON.parse(localStorage.getItem('keja:user-listings') ?? '[]').filter(
      (l: { id: string }) => l.id !== listing.id,
    );
    localStorage.setItem('keja:user-listings', JSON.stringify(remaining));
    expect(marketInventory().some((p) => p.id === listing.id)).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* 3. Workspace wiring                                                  */
/* ------------------------------------------------------------------ */

describe('developer workspace wiring (wave 17)', () => {
  it('newDevProject stamps ids, dates and the area context for the land-banking shield', () => {
    const project = newDevProject('Ridgeways Court', DEFAULT_DEV_INPUTS, 'Kilimani');
    expect(project.id).toMatch(/^dev_/);
    expect(project.name).toBe('Ridgeways Court');
    expect(project.area).toBe('Kilimani');
    expect(project.inputs).toBe(DEFAULT_DEV_INPUTS);

    const unnamed = newDevProject('   ', DEFAULT_DEV_INPUTS);
    expect(unnamed.name).toBe('Untitled scheme');
    expect(unnamed.area).toBeUndefined();
  });

  it('audit entries from listing lifecycle actions carry actor attribution', () => {
    logAudit({
      actor: 'Amina Yusuf',
      actorEmail: 'amina@example.com',
      action: 'listing.withdrawn',
      target: 'Test 3BR apartment, Kilimani',
      detail: 'Listing KJA-U123 withdrawn by the owner',
      severity: 'warning',
    });
    const audit = JSON.parse(localStorage.getItem('keja:audit') ?? '[]');
    expect(audit[0].actorEmail).toBe('amina@example.com');
    expect(audit[0].severity).toBe('warning');
  });
});
