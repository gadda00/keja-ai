/**
 * The governed product-event taxonomy (audit ch.8, Sprint 2).
 *
 * Rules of the contract:
 *  1. Every event is `namespace.verb.version` — version is part of the name,
 *     so a payload change means a new .v2 event, never a silent mutation.
 *  2. Every payload schema is strict: unknown keys are errors, every field
 *     is typed, free text passes through `safeText` caps. The schema IS the
 *     ingestion validator — nothing reaches the ring buffer unvalidated.
 *  3. Every event declares a privacy class:
 *     - public        — the payload could be published as an aggregate
 *     - pseudonymous  — carries ids that are pseudonymous but joinable
 *                       within a session (ids, coarse counts)
 *     - confidential  — operator-internal; never leaves the device/mirror
 *  4. Never in payloads: names, phone numbers, emails, addresses, free-form
 *     prompts, identity numbers, raw document text (audit ch.8).
 *
 * The legacy unversioned names in analytics.ts map through LEGACY_NAMES
 * so 30+ existing call sites keep compiling while emitting v1 envelopes.
 */
import { z } from 'zod';
import { safeText } from './envelope';

/* ----------------------------- primitives ------------------------------ */

/** Property/listing id — `KJA-###` or auto-listing slug form. */
export const idSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, 'id must be a plain identifier');

/** Free-text-safe short label (search role, intent, channel…). */
export const labelSchema = z
  .string()
  .min(1)
  .max(64)
  .transform((s) => safeText(s))
  .refine((s) => s.length > 0, 'label empty after redaction');

/** Search query — capped, control-stripped, never stored raw elsewhere. */
export const querySchema = z.string().max(1000).transform((s) => safeText(s, 120));

export const countSchema = z.number().int().min(0).max(1_000_000);

/* ------------------------------ the catalog ---------------------------- */

export interface EventDefinition {
  /** Description for the data dictionary. */
  description: string;
  /** Privacy class — see module doc. */
  privacy: 'public' | 'pseudonymous' | 'confidential';
  /** Strict payload validator. */
  schema: z.ZodType;
}

export const TAXONOMY = {
  /* ---- search & discovery ---- */
  'search.performed.v1': {
    description: 'A search query completed with its result count.',
    privacy: 'pseudonymous',
    schema: z.strictObject({ query: querySchema, results: countSchema }),
  },
  'listing.viewed.v1': {
    description: 'A listing detail page was opened.',
    privacy: 'pseudonymous',
    schema: z.strictObject({ propertyId: idSchema }),
  },
  'listing.saved.v1': {
    description: 'A listing was saved to favourites.',
    privacy: 'pseudonymous',
    schema: z.strictObject({ propertyId: idSchema }),
  },
  'listing.compare_added.v1': {
    description: 'A listing was added to the compare tray.',
    privacy: 'pseudonymous',
    schema: z.strictObject({ propertyId: idSchema }),
  },
  'listing.issue_reported.v1': {
    description: 'A listing issue was reported for adjudication.',
    privacy: 'pseudonymous',
    schema: z.strictObject({ propertyId: idSchema, reason: labelSchema }),
  },
  'listing.evidence_reviewed.v1': {
    description: 'A user expanded the evidence panel on a listing.',
    privacy: 'pseudonymous',
    schema: z.strictObject({ propertyId: idSchema }),
  },
  'listing.viewing_requested.v1': {
    description: 'A viewing request flow was started or submitted.',
    privacy: 'pseudonymous',
    schema: z.strictObject({ propertyId: idSchema }),
  },

  /* ---- tools & conversion ---- */
  'tool.calculator_completed.v1': {
    description: 'A calculator produced a full result.',
    privacy: 'public',
    schema: z.strictObject({
      calculator: z.enum(['roi', 'mortgage', 'affordability']),
    }),
  },
  'support.human_requested.v1': {
    description: 'A user was routed to a human (WhatsApp / contact form).',
    privacy: 'pseudonymous',
    schema: z.strictObject({
      channel: z.enum(['whatsapp', 'contact']),
      context: labelSchema.optional(),
    }),
  },
  'visitor.role_selected.v1': {
    description: 'A first-visit role was chosen (buy / rent / invest / list / manage).',
    privacy: 'public',
    schema: z.strictObject({ role: labelSchema }),
  },

  /* ---- intelligence (emitted by the AI gateway, Task 3) ---- */
  'ai.answer.generated.v1': {
    description:
      'The intelligence gateway produced a grounded answer. Carries citation and confidence bands only — never prompt or answer text.',
    privacy: 'pseudonymous',
    schema: z.strictObject({
      surface: z.enum(['ask-keja', 'deal-analyst', 'valuation']),
      intent: labelSchema,
      citations: countSchema,
      confidence: z.enum(['low', 'medium', 'high']),
      outcome: z.enum(['answered', 'abstained', 'escalated']),
      latencyMs: countSchema,
      provider: z.enum(['local-deterministic', 'deepseek']),
    }),
  },
  'ai.answer.escalated.v1': {
    description: 'A question was escalated to a human by policy (regulated domain).',
    privacy: 'pseudonymous',
    schema: z.strictObject({
      surface: z.enum(['ask-keja', 'deal-analyst', 'valuation']),
      policy: labelSchema,
    }),
  },
  'ai.lead_qualified.v1': {
    description: 'The assistant identified transaction intent in conversation (legacy chat_qualified).',
    privacy: 'pseudonymous',
    schema: z.strictObject({
      surface: z.enum(['ask-keja', 'deal-analyst']).default('ask-keja'),
      intent: labelSchema,
    }),
  },

  /* ---- operations (Sprint 5, admin console) ---- */
  'moderation.reviewed.v1': {
    description: 'An operator reviewed a listing-quality triage or duplicate suggestion.',
    privacy: 'confidential',
    schema: z.strictObject({
      subjectId: idSchema,
      decision: z.enum(['approve', 'reject', 'flag', 'dismiss']),
      category: labelSchema,
    }),
  },
} as const satisfies Record<string, EventDefinition>;

export type EventName = keyof typeof TAXONOMY;

/** Legacy (unversioned) name → governed name — for analytics.ts compatibility. */
export const LEGACY_NAMES: Record<string, EventName> = {
  search: 'search.performed.v1',
  result_view: 'listing.viewed.v1',
  save: 'listing.saved.v1',
  compare_add: 'listing.compare_added.v1',
  issue_reported: 'listing.issue_reported.v1',
  evidence_reviewed: 'listing.evidence_reviewed.v1',
  viewing_request: 'listing.viewing_requested.v1',
  calculator_complete: 'tool.calculator_completed.v1',
  human_handoff: 'support.human_requested.v1',
  role_selected: 'visitor.role_selected.v1',
  chat_qualified: 'ai.lead_qualified.v1',
};
