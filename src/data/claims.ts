/**
 * Keja Claims Register — the "truth layer" behind every public promise.
 *
 * Independent review feedback (Aug 2026): the product used authoritative
 * language ("verified titles", "M-Pesa escrow", "regulated tokenization",
 * "agent reputation scoring") without distinguishing what is live, what is
 * simulated inside this demo, what depends on partners, and what is planned.
 * This register is the machine-readable answer: every capability claim the
 * product makes is declared here with a status, an evidence pointer, and the
 * date it was last reviewed.
 *
 * The Trust Center renders this register verbatim — so the public site can
 * never silently drift from this list without a code change that reviewers
 * can see.
 */

export type ClaimStatus = 'live' | 'simulated' | 'partner-dependent' | 'planned';

export interface CapabilityClaim {
  /** Stable id — tests assert against these. */
  id: string;
  /** The claim as a user meets it in the UI copy. */
  claim: string;
  status: ClaimStatus;
  /** Where the claim appears (route or component). */
  surface: string;
  /** What actually backs it today, in one honest sentence. */
  evidence: string;
  /** ISO date the claim was last reviewed against the implementation. */
  lastReviewed: string;
  /** For simulated/planned claims: what has to happen to reach "live". */
  pathToLive?: string;
}

export const CLAIM_LAST_REVIEWED = '2026-08-31';

export const CAPABILITY_CLAIMS: CapabilityClaim[] = [
  /* ------------------------------ verification ----------------------------- */
  {
    id: 'title-check',
    claim: 'Title deeds are cross-checked against official land-registry records.',
    status: 'simulated',
    surface: 'Listing pages · Trust Center',
    evidence:
      'Checks run on seeded demo data with recorded outcomes and dates; no live connection to Ardhisasa or Ministry of Lands systems exists in this build.',
    lastReviewed: CLAIM_LAST_REVIEWED,
    pathToLive:
      'Integrate an Ardhisasa-access partner or advocate network, record search references, and date-stamp every result.',
  },
  {
    id: 'photo-authenticity',
    claim: 'Listing photos are fingerprinted and reverse-matched across agencies.',
    status: 'simulated',
    surface: 'Listing pages · Trust Center',
    evidence:
      'Duplicate and reuse outcomes are pre-computed on the demo inventory; no external reverse-image provider is called at runtime.',
    lastReviewed: CLAIM_LAST_REVIEWED,
    pathToLive:
      'Perceptual-hash pipeline over real multi-agency photo sets with a dispute workflow.',
  },
  {
    id: 'duplicate-detection',
    claim: 'Duplicate and near-duplicate listings are detected automatically.',
    status: 'live',
    surface: 'Auto-Pilot pipeline (scripts/auto-listings/dedupe.mjs)',
    evidence:
      'Fuzzy-match deduplication runs as part of the ingest pipeline and in-app anomaly checks; covered by unit tests.',
    lastReviewed: CLAIM_LAST_REVIEWED,
  },
  {
    id: 'pricing-anomaly',
    claim: 'Asking prices are screened against market bands for anomalies.',
    status: 'live',
    surface: 'Auto-Pilot pipeline · anomaly detection (adminStore)',
    evidence:
      'Deterministic price-band screening runs on every ingested listing and inside the admin anomaly sweep; covered by unit tests.',
    lastReviewed: CLAIM_LAST_REVIEWED,
  },
  {
    id: 'agent-reputation',
    claim: 'Agents and agencies carry a reputation score.',
    status: 'simulated',
    surface: 'Listing pages · Trust Center',
    evidence:
      'Scores are demo values on seeded agencies; no complaint database, response-time tracking or operational history feeds them yet.',
    lastReviewed: CLAIM_LAST_REVIEWED,
    pathToLive:
      'Response-time SLAs, complaint adjudication and renewal/suspension policy with real telemetry.',
  },
  {
    id: 'trust-score',
    claim: 'Every listing carries a 0–100 trust score with five weighted pillars.',
    status: 'live',
    surface: 'Listing pages · Trust Center',
    evidence:
      'Scores and their five-pillar weighting are computed and displayed deterministically; factor definitions are published on the Trust Center.',
    lastReviewed: CLAIM_LAST_REVIEWED,
  },
  {
    id: 'verification-freshness',
    claim: 'Verification evidence carries a check date, scope and validity window.',
    status: 'live',
    surface: 'Listing pages (evidence panel)',
    evidence:
      'Evidence panels derive scope, check date and a 90-day validity window per check, and expose a report / human-review path.',
    lastReviewed: CLAIM_LAST_REVIEWED,
  },

  /* -------------------------------- marketplace ------------------------------ */
  {
    id: 'search',
    claim: 'Natural-language property search across inventory.',
    status: 'live',
    surface: 'Ask Keja AI · Properties',
    evidence: 'Deterministic parser + matcher over the demo inventory; covered by unit tests.',
    lastReviewed: CLAIM_LAST_REVIEWED,
  },
  {
    id: 'calculators',
    claim: 'Rental ROI, mortgage and affordability calculators with labelled assumptions.',
    status: 'live',
    surface: 'Investment Calculator · Ask Keja AI',
    evidence:
      'Pure functions with FACT / ESTIMATE / ASSUMPTION labels; covered by finance unit tests.',
    lastReviewed: CLAIM_LAST_REVIEWED,
  },
  {
    id: 'autopilot',
    claim: 'Auto-Pilot ingests partner feeds with quality gates and review queues.',
    status: 'live',
    surface: 'scripts/auto-listings/* · Admin console',
    evidence:
      'Feed adapters, enrichment, dedupe, quality scoring and a capped trust score run end-to-end in CI on sample feeds.',
    lastReviewed: CLAIM_LAST_REVIEWED,
  },
  {
    id: 'cross-agency',
    claim: 'Keja sits above multiple agencies as a cross-agency trust layer.',
    status: 'simulated',
    surface: 'Trust Center · Home',
    evidence:
      'Multiple demo agencies exist in seeded data; no live agency integrations or partner feeds are connected in production.',
    lastReviewed: CLAIM_LAST_REVIEWED,
    pathToLive: 'Signed partner feed contracts with attribution, freshness and revocation terms.',
  },

  /* --------------------------------- payments -------------------------------- */
  {
    id: 'mpesa-escrow',
    claim: 'Viewing fees and deposits can be held in M-Pesa escrow.',
    status: 'planned',
    surface: 'Ask Keja AI (viewing flow)',
    evidence:
      'Copy describes a future capability. No payment provider integration, settlement model or funds safeguarding exists in this build, and none should until the legal role of the platform is defined.',
    lastReviewed: CLAIM_LAST_REVIEWED,
    pathToLive:
      "Licensed PSP partnership, documented settlement and reconciliation model, and a written legal opinion on the platform's payment role.",
  },
  {
    id: 'payments',
    claim: 'The platform processes any payments at all.',
    status: 'planned',
    surface: 'Terms & Privacy',
    evidence:
      'No payment collection of any kind exists in this build. Nothing asks for, or should receive, real money.',
    lastReviewed: CLAIM_LAST_REVIEWED,
    pathToLive:
      'Licensed PSP partnership, documented settlement and reconciliation model, and a written legal opinion on the platform\u2019s payment role.',
  },

  /* -------------------------------- tokenization ----------------------------- */
  {
    id: 'tokenize',
    claim: 'Property tokenization with fractional ownership from $100.',
    status: 'simulated',
    surface: 'Keja Tokenize',
    evidence:
      'Fully simulated environment: assets, tokens, ledger, KYC and distributions are demo data. No securities are offered, no money is accepted, and no blockchain is involved.',
    lastReviewed: CLAIM_LAST_REVIEWED,
    pathToLive:
      'Separate legal entity, CMA classification opinion, offering documents, licensed KYC/AML and custody arrangements — education-only until then.',
  },
  {
    id: 'kyc',
    claim: 'KYC gates investor onboarding.',
    status: 'simulated',
    surface: 'Keja Tokenize (KYC modal)',
    evidence:
      'The KYC flow demonstrates the UX only; no identity documents are collected, verified or stored — by design, since there is no backend.',
    lastReviewed: CLAIM_LAST_REVIEWED,
    pathToLive:
      'A vetted identity-verification provider with purpose-limited access, explicit retention rules and audit logging.',
  },

  /* ----------------------------- stakeholder tools --------------------------- */
  {
    id: 'landlord-studio',
    claim: 'Landlords manage units, tenants, rent collection and statements.',
    status: 'live',
    surface: 'Landlord Studio (/manage)',
    evidence:
      'Interactive studio with rent ledger, arrears, maintenance tickets and computed owner statements; all math is pure functions covered by unit tests. Data is browser-local demo data — no M-Pesa or bank sync exists.',
    lastReviewed: CLAIM_LAST_REVIEWED,
    pathToLive:
      'M-Pesa Daraja statement integration and manager-entered operations before real ledgers.',
  },
  {
    id: 'tenant-hub',
    claim: 'Renters build applications, track leases and file maintenance requests.',
    status: 'live',
    surface: 'Tenant Hub (/tenant)',
    evidence:
      'Application builder, lease tracker and maintenance flows run client-side with validation; covered by unit tests. Requests demo-route to the Landlord Studio pipeline only.',
    lastReviewed: CLAIM_LAST_REVIEWED,
    pathToLive: 'Agency-side routing of applications and requests with SLAs.',
  },
  {
    id: 'keja-pro',
    claim: 'Agents build CMAs, generate listing copy and manage leads and viewings.',
    status: 'live',
    surface: 'KEJA PRO (/pro)',
    evidence:
      'CMA band math, deterministic listing-copy grammar, lead pipeline and viewing scheduling run on the live inventory; covered by unit tests. No real agencies are onboarded.',
    lastReviewed: CLAIM_LAST_REVIEWED,
    pathToLive: 'Per-agent workspaces with server-side identity and real lead routing.',
  },
  {
    id: 'valuation-desk',
    claim: 'Indicative valuation bands from live comparables.',
    status: 'live',
    surface: 'Valuation Desk (/valuation)',
    evidence:
      'Deterministic comparables engine (median/blend/condition adjustments, confidence by comp count) over the live inventory; covered by unit tests. Explicitly labelled ESTIMATE — formal valuations still escalate to humans.',
    lastReviewed: CLAIM_LAST_REVIEWED,
    pathToLive: 'Licensed valuer partnerships for signed valuation reports.',
  },
  {
    id: 'developer-console',
    claim: 'Developers screen land feasibility with cashflow and sensitivity math.',
    status: 'live',
    surface: 'Developer Console (/develop)',
    evidence:
      'Feasibility, month-by-month cashflow and sensitivity grid are pure functions with unit tests. Screening-grade ESTIMATE math only — not investment advice.',
    lastReviewed: CLAIM_LAST_REVIEWED,
    pathToLive: 'Cost benchmarks from live contractor quotations and bank-accurate finance terms.',
  },
  {
    id: 'diaspora-hub',
    claim: 'Diaspora buyers get viewing scheduling, PoA and remittance tools.',
    status: 'live',
    surface: 'Diaspora Hub (/diaspora)',
    evidence:
      'Timezone-accurate scheduling, interactive PoA checklist and fee-model comparison calculators run client-side; covered by unit tests. FX figures are static ESTIMATE anchors; no remittance partner is integrated.',
    lastReviewed: CLAIM_LAST_REVIEWED,
    pathToLive: 'Licensed remittance partners with live rates and escrow-style custody.',
  },

  /* ---------------------------------- accounts ------------------------------- */
  {
    id: 'accounts',
    claim: 'Accounts, roles and sessions.',
    status: 'simulated',
    surface: 'Auth modal · Dashboard · Admin',
    evidence:
      "Demo-grade, client-side only: roles, sessions and password hashes live in the visitor's own browser storage. Suitable for demonstrating flows; not real security.",
    lastReviewed: CLAIM_LAST_REVIEWED,
    pathToLive:
      'Server-side identity, modern password hashing, MFA and revocable sessions before any real account.',
  },
  {
    id: 'ai-advisor',
    claim: 'Keja AI gives property guidance.',
    status: 'live',
    surface: 'Ask Keja AI',
    evidence:
      'Deterministic intent engine with FACT / ESTIMATE / ASSUMPTION labels, explicit escalation on legal, tax, valuation and suitability questions, and a human handoff path; covered by unit tests.',
    lastReviewed: CLAIM_LAST_REVIEWED,
  },
  {
    id: 'ai-llm',
    claim: 'The AI is a large language model.',
    status: 'planned',
    surface: 'Ask Keja AI',
    evidence:
      'It is not — it is a transparent rules engine. That is a feature (predictability, no hallucination) and is disclosed so nobody assumes otherwise.',
    lastReviewed: CLAIM_LAST_REVIEWED,
    pathToLive:
      'A governed LLM integration with evaluation sets, escalation policies and hallucination monitoring.',
  },
];

export const CLAIM_STATUS_META: Record<
  ClaimStatus,
  { label: string; description: string; tone: string }
> = {
  live: {
    label: 'Live',
    description: 'Works in this build and is covered by automated tests.',
    tone: 'emerald',
  },
  simulated: {
    label: 'Simulated',
    description: 'Runs on demo data to demonstrate the experience — not connected to real systems.',
    tone: 'amber',
  },
  'partner-dependent': {
    label: 'Partner-dependent',
    description: 'Requires a third-party integration or agreement that is not in place yet.',
    tone: 'sky',
  },
  planned: {
    label: 'Planned',
    description: 'Describes the roadmap, not the current product. Nothing to use yet.',
    tone: 'zinc',
  },
};

export const claimsByStatus = (status: ClaimStatus) =>
  CAPABILITY_CLAIMS.filter((c) => c.status === status);
