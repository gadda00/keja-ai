/**
 * Boundary validation (audit F-19 / F-20).
 *
 * Every JSON.parse of persisted or generated data crossed zero validation
 * before this module: a corrupted localStorage value or a malformed
 * generated file would surface as a deep runtime crash instead of a clean
 * fallback. These zod schemas sit exactly at the read boundaries:
 *
 *   - generated data: src/data/auto-listings.json (5,630 lines committed by
 *     the Auto-Pilot bot) is validated once at module load; bad entries are
 *     dropped loudly (console.error) instead of crashing the marketplace
 *   - persisted state: auth users / password map / session and the tokenize
 *     store read through safeRead, falling back to seeded defaults when a
 *     stored value fails its schema (corruption, manual edits, old formats)
 */
import { z } from 'zod';

/* ------------------------------- helpers ---------------------------------- */

/**
 * Validate a value against a schema, returning fallback on failure.
 * Dev: logs the issues so a bad payload is visible immediately.
 */
export function safeParse<T>(
  schema: z.ZodType<T>,
  value: unknown,
  fallback: T,
  label: string,
): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  if (process.env.NODE_ENV === 'development') {
    console.error(`[boundaries] ${label} failed validation — using fallback`, result.error.issues.slice(0, 5));
  }
  return fallback;
}

/* ------------------------------ auto-listings ------------------------------ */

const autoCheckSchema = z.object({
  label: z.string(),
  status: z.enum(['pass', 'warn', 'fail']),
  detail: z.string(),
});

const autoListingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  type: z.string().min(1),
  purpose: z.array(z.string()).min(1),
  area: z.string(),
  county: z.string(),
  price: z.number().nonnegative(),
  rentEstimate: z.number().optional(),
  grossYieldEstimate: z.number().optional(),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  sizeSqm: z.number(),
  amenities: z.array(z.string()),
  images: z.array(z.string()),
  description: z.string(),
  agency: z.string(),
  agent: z.object({ name: z.string(), phone: z.string() }),
  availability: z.string(),
  listedAt: z.string(),
  appreciationForecast: z.number().optional(),
  offPlan: z.boolean().optional(),
  furnished: z.boolean().optional(),
  highlights: z.array(z.string()),
  views: z.number(),
  auto: z.object({
    source: z.string(),
    firstSeenAt: z.string(),
    enrichedBy: z.string(),
    priceGrade: z.string(),
    areaYieldBand: z.number(),
    qualityScore: z.number(),
    route: z.string(),
    checks: z.array(autoCheckSchema),
  }),
});

const autoStateSchema = z.object({
  version: z.number(),
  generatedAt: z.string(),
  runs: z.array(z.any()).default([]),
  listings: z.array(autoListingSchema).default([]),
  pending: z.array(autoListingSchema).default([]),
  rejected: z.array(z.any()).optional(),
});

export type ValidatedAutoListing = z.infer<typeof autoListingSchema>;

/**
 * Validate the generated auto-listings payload. Invalid entries are dropped
 * individually (one bad listing must not take the marketplace down), and
 * the drop is reported so the Auto-Pilot console shows honest counts.
 */
export function validateAutoState(raw: unknown): {
  listings: ValidatedAutoListing[];
  pending: ValidatedAutoListing[];
  runs: unknown[];
  generatedAt: string;
  version: number;
  dropped: number;
} {
  const result = autoStateSchema.safeParse(raw);
  if (result.success) return { ...result.data, dropped: 0 };
  // structural failure — salvage per-entry
  const obj = (raw ?? {}) as Record<string, unknown>;
  const keep = (key: string): ValidatedAutoListing[] => {
    const arr = Array.isArray(obj[key]) ? (obj[key] as unknown[]) : [];
    const good: ValidatedAutoListing[] = [];
    for (const item of arr) {
      const r = autoListingSchema.safeParse(item);
      if (r.success) good.push(r.data);
      else console.error(`[boundaries] auto-listings: dropped invalid ${key} entry`, r.error.issues[0]);
    }
    return good;
  };
  const listings = keep('listings');
  const pending = keep('pending');
  const dropped =
    (Array.isArray(obj.listings) ? (obj.listings as unknown[]).length : 0) - listings.length +
    (Array.isArray(obj.pending) ? (obj.pending as unknown[]).length : 0) - pending.length;
  return {
    version: typeof obj.version === 'number' ? obj.version : 0,
    generatedAt: typeof obj.generatedAt === 'string' ? obj.generatedAt : new Date().toISOString(),
    runs: Array.isArray(obj.runs) ? obj.runs : [],
    listings,
    pending,
    dropped,
  };
}

/* --------------------------------- auth ------------------------------------ */

export const userAccountSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  email: z.string(),
  role: z.enum(['user', 'agent', 'admin']),
  // Google-only accounts (2026-09-11): retired 'email' records fail here
  // and are dropped by the loader — the safe path to re-entry is Google.
  provider: z.literal('google'),
  status: z.enum(['active', 'suspended']),
  picture: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  // Registration (group personalisation) — optional for backward
  // compatibility with accounts created before the registration step.
  accountType: z.enum(['renter', 'landlord', 'developer', 'agent', 'investor']).optional(),
  onboardedAt: z.string().optional(),
  createdAt: z.string(),
  lastLoginAt: z.string(),
  loginCount: z.number(),
});

export const sessionSchema = z.object({
  token: z.string().min(8),
  userId: z.string().min(1),
  issuedAt: z.string(),
  expiresAt: z.string(),
  remember: z.boolean(),
  // second-factor state; legacy sessions without it default to unverified
  mfaVerified: z.boolean().default(false),
});

/* ------------------------------ tokenize store ----------------------------- */

const tokenizePersistedSchema = z
  .object({
    investor: z.any().nullable().optional(),
    investments: z.array(z.any()).default([]),
    ledger: z.array(z.any()).default([]),
    customProperties: z.array(z.any()).default([]),
    soldDelta: z.record(z.string(), z.number()).default({}),
    receivedDistributions: z.array(z.any()).default([]),
    waitlist: z.array(z.string()).default([]),
    walletUsd: z.number().default(0),
    marketPrices: z.record(z.string(), z.number()).default({}),
    trades: z.array(z.any()).default([]),
    clockOffsetMs: z.number().default(0),
    lastAccrual: z.string().nullable().optional(),
    statusOverrides: z.record(z.string(), z.string()).default({}),
    investorCountDelta: z.record(z.string(), z.number()).default({}),
  })
  .passthrough();

export function validateTokenizePersisted(raw: unknown): unknown {
  const result = tokenizePersistedSchema.safeParse(raw);
  if (result.success) return result.data;
  if (process.env.NODE_ENV === 'development') {
    console.error('[boundaries] tokenize persisted state invalid — resetting trial wallet', result.error.issues.slice(0, 3));
  }
  return tokenizePersistedSchema.parse({});
}

/* ------------------------- listing wizard submission ----------------------- */

/**
 * The publish boundary for the listing wizard (wave 10). The form's numeric
 * fields arrive as Number(input.value), so an emptied or tampered field is
 * NaN or 0 — without this gate an empty title or a NaN price flowed verbatim
 * into the marketplace merge (useAllProperties) and every derived surface
 * (sorting, pricing screens, home stats, the AI corpus).
 *
 * Caps are deliberate, not decorative: a 5,000-character description and a
 * 120-character title bound what the marketplace card, detail view, sitemap
 * and localStorage quota must ever handle.
 */
export const listingFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(8, 'Give the listing a title of at least 8 characters.')
    .max(120, 'Keep the title under 120 characters.'),
  type: z.enum(['apartment', 'villa', 'townhouse', 'bungalow', 'land', 'commercial']),
  area: z.string().trim().min(2, 'Where is the property?').max(60),
  county: z.string().trim().min(2).max(40),
  price: z
    .number({ message: 'Enter the asking price.' })
    .int('The price must be a whole number.')
    .positive('The price must be above zero.')
    .max(50_000_000_000, 'That price is above KES 50 billion — check the digits.'),
  rentEstimate: z
    .number({ message: 'Enter the monthly rent estimate.' })
    .int()
    .nonnegative()
    .max(10_000_000, 'That rent is above KES 10 million per month — check the digits.'),
  bedrooms: z.number().int().min(0).max(30),
  bathrooms: z.number().int().min(0).max(30),
  sizeSqm: z
    .number({ message: 'Enter the size.' })
    .int()
    .min(10, 'The smallest listing is 10 m².')
    .max(1_000_000, 'That size is above 1,000,000 m² — check the digits.'),
  purpose: z
    .array(z.enum(['buy', 'rent', 'invest']))
    .min(1, 'Pick at least one purpose (buy / rent / invest).'),
  description: z
    .string()
    .trim()
    .min(20, 'Describe the property in at least 20 characters — buyers read this.')
    .max(5_000, 'Keep the description under 5,000 characters.'),
  phone: z.string().trim().max(25).optional(),
});

export type ListingFormValues = z.infer<typeof listingFormSchema>;

/** Field-keyed error messages for the wizard UI (first error per field). */
export function validateListingForm(
  form: unknown,
): { ok: true; value: ListingFormValues } | { ok: false; errors: Record<string, string> } {
  const result = listingFormSchema.safeParse(form);
  if (result.success) return { ok: true, value: result.data };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? '_form');
    if (!errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}

/* --------------------- persisted domain-state reads ------------------------ */
/**
 * Schemas for the every-visitor localStorage keys (wave 10 — the F-19
 * boundary extended from auth/tokenize/auto-listings to the stores the
 * main product surfaces read). Each mirrors the TypeScript interface its
 * store owns; useValidatedStore (src/lib/store.ts) enforces them at the
 * read seam with element-wise salvage for arrays.
 *
 * A drifted schema/interface pair fails at the useValidatedStore call site
 * (type mismatch) and at the pinned round-trip tests — both barriers are
 * load-bearing; do not remove either.
 */

/** favorites / compare: arrays of property ids. */
export const idListSchema = z.array(z.string());

/** Ask-Keja chat history (mirrors ChatMessage in src/lib/store.ts). */
export const chatHistorySchema = z.array(
  z.object({
    id: z.string(),
    role: z.enum(['user', 'keja']),
    text: z.string(),
    ts: z.string(),
    meta: z
      .array(
        z.object({
          label: z.enum(['FACT', 'ESTIMATE', 'ASSUMPTION', 'REPORTED']),
          text: z.string(),
        }),
      )
      .optional(),
    quickReplies: z.array(z.string()).optional(),
    propertyIds: z.array(z.string()).optional(),
    sources: z
      .array(
        z.object({
          ref: z.string(),
          title: z.string(),
          kind: z.enum(['property', 'area-insight', 'policy']),
          asOf: z.string(),
        }),
      )
      .optional(),
    action: z.enum(['start-qualification', 'open-calculator', 'whatsapp']).optional(),
  }),
);

/** Saved searches (mirrors SavedSearch in src/lib/searchStore.ts). */
export const savedSearchesSchema = z.array(
  z.object({
    id: z.string(),
    label: z.string(),
    filters: z.object({
      q: z.string().optional(),
      type: z.string().optional(),
      purpose: z.string().optional(),
      area: z.string().optional(),
      maxPrice: z.number().optional(),
      minBeds: z.number().optional(),
      verifiedOnly: z.boolean().optional(),
      sort: z.string().optional(),
    }),
    createdAt: z.string(),
    alerts: z.boolean(),
    seenIds: z.array(z.string()),
  }),
);

/** Notifications (mirrors Notification in src/lib/searchStore.ts). */
export const notificationsSchema = z.array(
  z.object({
    id: z.string(),
    kind: z.enum(['match', 'listing', 'distribution', 'system']),
    title: z.string(),
    body: z.string(),
    href: z.string().optional(),
    createdAt: z.string(),
    read: z.boolean(),
  }),
);

/**
 * Account-posted listings (mirrors UserListing in src/lib/adminStore.ts) —
 * the key the marketplace merge (useAllProperties) reads, so a corrupted
 * entry here would otherwise break /properties, home stats and the AI corpus.
 */
export const userListingsSchema = z.array(
  z.object({
    id: z.string(),
    submissionId: z.string().optional(),
    ownerEmail: z.string().optional(),
    ownerName: z.string().optional(),
    title: z.string(),
    type: z.string(),
    purpose: z.array(z.string()),
    area: z.string(),
    county: z.string(),
    price: z.number(),
    rentEstimate: z.number().optional(),
    bedrooms: z.number().optional(),
    bathrooms: z.number().optional(),
    sizeSqm: z.number(),
    amenities: z.array(z.string()),
    images: z.array(z.string()),
    description: z.string(),
    agency: z.string(),
    agent: z.object({ name: z.string(), phone: z.string() }),
    availability: z.enum(['available', 'reserved', 'sold']),
    listedAt: z.string(),
    source: z.string(),
    userSubmitted: z.literal(true),
    views: z.number(),
  }),
);
