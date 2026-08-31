import { describe, expect, it } from 'vitest';

import {
  CAPABILITY_CLAIMS,
  CLAIM_STATUS_META,
  claimsByStatus,
  type ClaimStatus,
} from '@/data/claims';

describe('claims register integrity', () => {
  it('has a unique id per claim', () => {
    const ids = CAPABILITY_CLAIMS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every claim carries a valid status, surface, evidence and review date', () => {
    const statuses = Object.keys(CLAIM_STATUS_META) as ClaimStatus[];
    for (const c of CAPABILITY_CLAIMS) {
      expect(statuses).toContain(c.status);
      expect(c.claim.length).toBeGreaterThan(10);
      expect(c.evidence.length).toBeGreaterThan(30); // honest sentence, not a stub
      expect(c.surface.length).toBeGreaterThan(1);
      expect(c.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('claims that are not live must explain their path to live', () => {
    for (const c of CAPABILITY_CLAIMS) {
      if (c.status !== 'live') {
        expect(c.pathToLive, `claim "${c.id}" needs a pathToLive`).toBeTruthy();
      }
    }
  });

  it('money-sensitive claims are never marked live', () => {
    // Nothing that touches payments, KYC or securities may claim to be live —
    // that status is reserved for a production backend that does not exist.
    const money = ['mpesa-escrow', 'payments', 'tokenize', 'kyc', 'accounts'];
    for (const id of money) {
      const claim = CAPABILITY_CLAIMS.find((c) => c.id === id);
      expect(claim, `claim ${id} must exist in the register`).toBeTruthy();
      expect(claim!.status).not.toBe('live');
    }
  });

  it('covers the high-exposure vocabulary the review flagged', () => {
    const register = CAPABILITY_CLAIMS.map((c) => `${c.claim} ${c.evidence}`)
      .join(' ')
      .toLowerCase();
    for (const term of ['ardhisasa', 'escrow', 'token', 'kyc', 'reputation']) {
      expect(register).toContain(term);
    }
  });

  it('claimsByStatus partitions the register', () => {
    const total = (Object.keys(CLAIM_STATUS_META) as ClaimStatus[])
      .map((s) => claimsByStatus(s).length)
      .reduce((a, b) => a + b, 0);
    expect(total).toBe(CAPABILITY_CLAIMS.length);
    expect(claimsByStatus('live').length).toBeGreaterThan(0);
  });
});
