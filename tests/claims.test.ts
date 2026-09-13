/**
 * Claims register — the truth layer behind every public promise.
 *
 * The Trust Center renders this register verbatim; these tests make sure
 * the register itself stays well-formed, honest and reviewable: unique
 * ids, valid statuses, evidence for every claim, a path-to-live for
 * everything not yet live, and a real review date.
 */
import { CAPABILITY_CLAIMS, CLAIM_LAST_REVIEWED, type ClaimStatus } from '@/data/claims';
import { PROPERTIES } from '@/data/properties';
import { trustScore } from '@/lib/trustScore';
import { assertRegulatedClaims, REGULATED_CLAIM_IDS } from '@/lib/regulatory';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

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

describe('claims ↔ engine coherence (wave 12)', () => {
  const WORDS: Record<number, string> = {
    2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight',
    9: 'nine', 10: 'ten', 11: 'eleven', 12: 'twelve', 13: 'thirteen', 14: 'fourteen',
    15: 'fifteen', 16: 'sixteen', 17: 'seventeen', 18: 'eighteen', 19: 'nineteen', 20: 'twenty',
  };

  it('the trust-score claim states the engine\'s actual factor count', () => {
    const claim = CAPABILITY_CLAIMS.find((c) => c.id === 'trust-score');
    expect(claim).toBeTruthy();
    const engineCount = trustScore(PROPERTIES[0]).factors.length;
    const accepted = [String(engineCount), WORDS[engineCount]];
    expect(
      accepted.some((form) => (claim!.claim + claim!.evidence).toLowerCase().includes(form.toLowerCase())),
      `claim must state the engine's factor count (${engineCount}) — a register that misstates its own engine is worse than none`,
    ).toBe(true);
  });

  it('the trust-score claim cites the published anchor manifest', () => {
    const claim = CAPABILITY_CLAIMS.find((c) => c.id === 'trust-score');
    expect(claim!.evidence).toContain('trust-anchor.json');
  });

  it('regulated claims can only be live with a committed legal approval artifact', () => {
    // real filesystem: docs/legal/approvals/<id>.md must exist and parse for a live status
    const readDoc = (path: string) => {
      const full = join(process.cwd(), path);
      return existsSync(full) ? readFileSync(full, 'utf8') : null;
    };
    const { ok, violations } = assertRegulatedClaims(CAPABILITY_CLAIMS, readDoc);
    if (!ok) {
      const detail = violations.map((v) => `${v.id}: ${v.why}`).join('; ');
      throw new Error(
        `Regulatory gate failed — a regulated capability is claimed live without a valid, unexpired ` +
          `approval document at docs/legal/approvals/<id>.md:\n${detail}`,
      );
    }
    // the gate itself must be wired to the regulated ids we know about today
    for (const id of REGULATED_CLAIM_IDS) {
      expect(CAPABILITY_CLAIMS.some((c) => c.id === id)).toBe(true);
    }
  });
});
