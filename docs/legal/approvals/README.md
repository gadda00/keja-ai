# Legal approval artifacts

This directory is the **regulatory readiness gate** (see `src/lib/regulatory.ts`).

A capability whose claim id appears in `REGULATED_CLAIM_IDS` may only be marked
`live` in the claims register (`src/data/claims.ts`) when a matching approval
document exists **in this directory** and parses:

```
docs/legal/approvals/<claim-id>.md     ← e.g. payments.md, tokenize.md
```

The document must open with a fenced metadata block:

```
<!-- keja-legal-approval
capability: <claim id>
approved-by: <named person, role and firm>
date: <ISO date the opinion was issued>
scope: <exactly what was approved — capability, partners, limits>
expires: <ISO date the approval must be renewed by>
-->
```

Rules enforced by CI (`tests/regulatory.test.ts` + `tests/claims.test.ts`,
which run on every deploy path including Auto-Pilot ingests):

- **No document → not live.** The gate fails the suite naming the exact path.
- **Expired, future-dated, or malformed documents do not count.**
- Removing a document re-locks the capability on the next CI run.

This makes it structurally impossible for *technical* completeness to be
mistaken for *legal* readiness: code can be finished, merged and deployed
while the public claim — and every surface that relies on it — stays honestly
non-live until a named human commits a dated, scoped approval.

**Status today: empty by design.** No regulated capability is live; the
approvals that would unlock them are owner actions (licensed PSP partnership,
CMA classification opinion, KYC provider contract) tracked in the claims
register's `pathToLive` fields.
