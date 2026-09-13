/**
 * Regulatory readiness gate (brief Q5: "make it structurally impossible to
 * accidentally ship a regulated capability before its approval lands").
 *
 * The claims register records whether a capability is live, simulated,
 * partner-dependent or planned. For REGULATED capabilities — payments,
 * tokenization, KYC — a status flip to "live" is not a copy edit: it asserts
 * that the platform's legal position has been reviewed and approved. Relying
 * on a human remembering that is exactly the failure mode this module
 * removes.
 *
 * Mechanism: a regulated claim may only be status 'live' when a legal
 * approval artifact exists at docs/legal/approvals/<claim-id>.md AND parses
 * (capability id, approver, approval date, scope, expiry). The artifact is a
 * reviewed, committed document — creating one is a deliberate act with a
 * named approver, and tests enforce the coupling on every CI path (the same
 * suite that gates every deploy, including Auto-Pilot ingests).
 *
 * Technical completeness can never again be mistaken for legal readiness:
 * the code can be finished, merged and deployed while the claim — and every
 * money-moving surface keyed to it — stays honestly non-live until the
 * approval document lands.
 */
import type { CapabilityClaim } from '@/data/claims';

/** Claim ids whose "live" status asserts a regulated capability. */
export const REGULATED_CLAIM_IDS = ['mpesa-escrow', 'payments', 'tokenize', 'kyc'] as const;

export type RegulatedClaimId = (typeof REGULATED_CLAIM_IDS)[number];

/** Path of the required legal-approval artifact for a regulated claim. */
export function approvalPath(id: string): string {
  return `docs/legal/approvals/${id}.md`;
}

export interface LegalApproval {
  capability: string;
  approvedBy: string;
  date: string; // ISO date
  scope: string;
  expires: string; // ISO date — approvals are time-boxed, not eternal
}

/**
 * Parse an approval artifact. Format is a fenced metadata block at the top:
 *
 *   <!-- keja-legal-approval
 *   capability: payments
 *   approved-by: Jane Doe, counsel (firm)
 *   date: 2026-09-13
 *   scope: viewing-fee escrow via PSP partner X only
 *   expires: 2027-09-13
 *   -->
 *
 * Returns null when any field is missing or malformed, or the approval has
 * expired as of `today`.
 */
export function parseApprovalDoc(md: string, today = new Date().toISOString().slice(0, 10)): LegalApproval | null {
  const block = md.match(/<!--\s*keja-legal-approval([\s\S]*?)-->/);
  if (!block) return null;
  const field = (name: string) => block[1].match(new RegExp(`${name}:\\s*(.+)`, 'i'))?.[1]?.trim();
  const capability = field('capability');
  const approvedBy = field('approved-by');
  const date = field('date');
  const scope = field('scope');
  const expires = field('expires');
  if (!capability || !approvedBy || !scope) return null;
  const isoDate = /^\d{4}-\d{2}-\d{2}$/;
  if (!date || !isoDate.test(date) || !expires || !isoDate.test(expires)) return null;
  if (Date.parse(date) > Date.parse(today)) return null; // approval dated in the future
  if (Date.parse(expires) < Date.parse(today)) return null; // approval expired
  if (approvedBy.length < 3) return null;
  return { capability, approvedBy, date, scope, expires };
}

export interface RegulatoryViolation {
  id: string;
  why: string;
}

/**
 * The gate: every regulated claim that says 'live' must carry a valid,
 * unexpired approval artifact. `readDoc` is injected so the rule is pure and
 * testable; production wiring passes a filesystem reader for
 * docs/legal/approvals/.
 */
export function assertRegulatedClaims(
  claims: CapabilityClaim[],
  readDoc: (path: string) => string | null,
  today = new Date().toISOString().slice(0, 10),
): { ok: boolean; violations: RegulatoryViolation[] } {
  const violations: RegulatoryViolation[] = [];
  for (const id of REGULATED_CLAIM_IDS) {
    const claim = claims.find((c) => c.id === id);
    if (!claim) {
      violations.push({ id, why: 'regulated claim id is missing from the register entirely' });
      continue;
    }
    if (claim.status !== 'live') continue; // non-live is the safe state
    const doc = readDoc(approvalPath(id));
    if (doc === null) {
      violations.push({
        id,
        why: `status is 'live' but no legal approval artifact exists at ${approvalPath(id)}`,
      });
      continue;
    }
    const approval = parseApprovalDoc(doc, today);
    if (!approval) {
      violations.push({
        id,
        why: `approval artifact at ${approvalPath(id)} is missing fields, malformed, or expired`,
      });
    }
  }
  return { ok: violations.length === 0, violations };
}
