/**
 * Regulatory readiness gate (wave 12).
 *
 * Pins the structural rule: a regulated capability may only be claimed
 * 'live' when a valid, unexpired legal approval artifact exists. The gate
 * must be impossible to satisfy by forgetting — only by deliberately
 * committing a named, dated, scoped approval document.
 */
import type { CapabilityClaim } from '@/data/claims';
import {
  approvalPath,
  assertRegulatedClaims,
  parseApprovalDoc,
  REGULATED_CLAIM_IDS,
} from '@/lib/regulatory';

const VALID_DOC = `# Payments — legal approval

<!-- keja-legal-approval
capability: payments
approved-by: Jane Doe, counsel (Firm LLP)
date: 2026-01-10
scope: viewing-fee escrow via licensed PSP partner only
expires: 2027-01-10
-->

Body text describing the opinion. Nothing here matters to the parser; the
fenced metadata block is the machine-readable approval record.
`;

const claims = (liveId: string | null, liveStatus: CapabilityClaim['status'] = 'live'): CapabilityClaim[] =>
  REGULATED_CLAIM_IDS.map((id) => ({
    id,
    claim: 'A regulated capability.',
    status: id === liveId ? liveStatus : 'planned',
    surface: 'Test',
    evidence: 'Test fixture claim for the regulatory gate.',
    lastReviewed: '2026-09-13',
  }));

describe('parseApprovalDoc', () => {
  it('parses a well-formed approval', () => {
    const a = parseApprovalDoc(VALID_DOC, '2026-09-13');
    expect(a).not.toBeNull();
    expect(a!.capability).toBe('payments');
    expect(a!.approvedBy).toContain('Jane Doe');
    expect(a!.expires).toBe('2027-01-10');
  });

  it('rejects a missing metadata block', () => {
    expect(parseApprovalDoc('# just markdown\n\nno fence', '2026-09-13')).toBeNull();
  });

  it('rejects missing fields', () => {
    const missing = VALID_DOC.replace('scope: viewing-fee escrow via licensed PSP partner only\n', '');
    expect(parseApprovalDoc(missing, '2026-09-13')).toBeNull();
  });

  it('rejects a malformed or missing date', () => {
    expect(parseApprovalDoc(VALID_DOC.replace('date: 2026-01-10', 'date: January 10'), '2026-09-13')).toBeNull();
  });

  it('rejects an expired approval', () => {
    const expired = VALID_DOC.replace('expires: 2027-01-10', 'expires: 2026-01-01');
    expect(parseApprovalDoc(expired, '2026-09-13')).toBeNull();
  });

  it('rejects an approval dated in the future', () => {
    const future = VALID_DOC.replace('date: 2026-01-10', 'date: 2027-12-31');
    expect(parseApprovalDoc(future, '2026-09-13')).toBeNull();
  });
});

describe('assertRegulatedClaims', () => {
  it('non-live regulated claims pass without any approval document', () => {
    const r = assertRegulatedClaims(claims(null), () => null, '2026-09-13');
    expect(r.ok).toBe(true);
  });

  it('a live regulated claim without an artifact fails, naming the path', () => {
    const r = assertRegulatedClaims(claims('payments'), () => null, '2026-09-13');
    expect(r.ok).toBe(false);
    expect(r.violations[0].why).toContain(approvalPath('payments'));
  });

  it('a live regulated claim with a valid, unexpired artifact passes', () => {
    const r = assertRegulatedClaims(claims('payments'), (p) =>
      p === approvalPath('payments') ? VALID_DOC : null,
    );
    expect(r.ok).toBe(true);
  });

  it('a live regulated claim with a malformed artifact fails', () => {
    const r = assertRegulatedClaims(claims('tokenize'), () => '# garbage\n');
    expect(r.ok).toBe(false);
    expect(r.violations[0].why).toContain('malformed');
  });

  it('a regulated id missing from the register entirely fails', () => {
    const r = assertRegulatedClaims([], () => VALID_DOC, '2026-09-13');
    expect(r.ok).toBe(false);
    expect(r.violations).toHaveLength(REGULATED_CLAIM_IDS.length);
  });
});
