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
  provider: z.enum(['google', 'email']),
  status: z.enum(['active', 'suspended']),
  picture: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
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
});

export const passwordMapSchema = z.record(z.string(), z.string());

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
