/**
 * Claims register — the truth layer behind every public promise.
 *
 * The Trust Center renders this register verbatim; these tests make sure
 * the register itself stays well-formed, honest and reviewable: unique
 * ids, valid statuses, evidence for every claim, a path-to-live for
 * everything not yet live, and a real review date.
 */
import { CAPABILITY_CLAIMS, CLAIM_LAST_REVIEWED, type ClaimStatus } from '@/data/claims';

const STATUSES: ClaimStatus[] = ['live', 'simulated', 'partner-dependent', 'planned'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

describe('register shape', () => {
  it('is the documented 24-claim register (18 at first review, since grown)', () => {
    expect(CAPABILITY_CLAIMS).toHaveLength(24);
  });

  it('has unique stable ids', () => {
    const ids = CAPABILITY_CLAIMS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every claim uses a valid status', () => {
    for (const c of CAPABILITY_CLAIMS) expect(STATUSES).toContain(c.status);
  });

  it('every claim states where it appears and what backs it', () => {
    for (const c of CAPABILITY_CLAIMS) {
      expect(c.claim.length).toBeGreaterThan(10);
      expect(c.surface.length).toBeGreaterThan(3);
      expect(c.evidence.length).toBeGreaterThan(20);
    }
  });

  it('every claim carries an ISO last-reviewed date', () => {
    for (const c of CAPABILITY_CLAIMS) expect(c.lastReviewed).toMatch(ISO_DATE);
  });

  it('CLAIM_LAST_REVIEWED is an ISO date consistent with the entries', () => {
    expect(CLAIM_LAST_REVIEWED).toMatch(ISO_DATE);
    for (const c of CAPABILITY_CLAIMS) {
      expect(new Date(c.lastReviewed).getTime()).not.toBeNaN();
    }
  });
});

describe('honesty rules', () => {
  it('anything not live declares its path to live', () => {
    for (const c of CAPABILITY_CLAIMS) {
      if (c.status !== 'live') {
        expect(c.pathToLive, `${c.id} (${c.status}) must declare pathToLive`).toBeTruthy();
        expect(c.pathToLive?.length).toBeGreaterThan(20);
      }
    }
  });

  it('simulated claims disclose their simulation honestly', () => {
    for (const c of CAPABILITY_CLAIMS) {
      if (c.status === 'simulated') {
        expect(
          /demo|simulat|seeded|no live|not.*live|illustrat/i.test(c.evidence),
          `${c.id} must disclose its simulated basis`,
        ).toBe(true);
      }
    }
  });

  it('the register covers the trust-critical surfaces', () => {
    const ids = new Set(CAPABILITY_CLAIMS.map((c) => c.id));
    expect(ids.has('title-check')).toBe(true);
  });

  it('mentions of money movement are never marked live (no PSP yet)', () => {
    const money = CAPABILITY_CLAIMS.filter((c) =>
      /mpesa|escrow|payment|wallet|disbursement/i.test(`${c.claim} ${c.evidence}`),
    );
    expect(money.length).toBeGreaterThan(0);
    for (const c of money) expect(c.status).not.toBe('live');
  });
});
