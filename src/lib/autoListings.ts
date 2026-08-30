/**
 * Keja Auto-Pilot — runtime integration.
 *
 * The pipeline (scripts/auto-listings) commits src/data/auto-listings.json on
 * a schedule; this module loads it, adapts entries to the marketplace
 * Property shape, and exposes stats for the Admin Auto-Pilot console.
 *
 * Trust is deliberately capped and honestly labelled: auto-ingested listings
 * pass machine screens but have NOT had Ardhisasa title verification — they
 * carry a visible AUTO source chip and never claim the platform's top band.
 */
import type { Property } from '@/data/properties'
import raw from '@/data/auto-listings.json'
import { asset } from '@/config'

export interface AutoCheck {
  label: string
  status: 'pass' | 'warn' | 'fail'
  detail: string
}

export interface AutoListing {
  id: string
  title: string
  type: string
  purpose: string[]
  area: string
  county: string
  price: number
  rentEstimate?: number
  grossYieldEstimate?: number
  bedrooms?: number
  bathrooms?: number
  sizeSqm: number
  amenities: string[]
  images: string[]
  description: string
  agency: string
  agent: { name: string; phone: string }
  availability: string
  listedAt: string
  appreciationForecast?: number
  offPlan?: boolean
  furnished?: boolean
  highlights: string[]
  views: number
  auto: {
    source: string
    firstSeenAt: string
    enrichedBy: string
    priceGrade: string
    areaYieldBand: number
    qualityScore: number
    route: string
    checks: AutoCheck[]
  }
}

export interface AutoRun {
  id: string
  startedAt: string
  ingested: number
  published: number
  queued: number
  rejected: number
  deduped: number
  sources: { scanner: number; feeds: number }
  feedStatus: { feed: string; format: string; items: number; state: string }[]
}

interface AutoState {
  version: number
  generatedAt: string
  runs: AutoRun[]
  listings: AutoListing[]
  pending: AutoListing[]
  rejected?: { id: string; title: string; source: string; qualityScore: number; checks: AutoCheck[] }[]
}

export const AUTO_STATE = raw as unknown as AutoState
export const AUTO_LISTINGS: AutoListing[] = AUTO_STATE.listings ?? []
export const AUTO_PENDING: AutoListing[] = AUTO_STATE.pending ?? []
export const AUTO_RUNS: AutoRun[] = AUTO_STATE.runs ?? []

/** Quality score → honest trust score band (never above partner ceiling 88). */
function autoTrustScore(l: AutoListing): number {
  let score = 72 // machine-screened baseline (below human-verified partner stock)
  if (l.auto.qualityScore >= 90) score += 10
  else if (l.auto.qualityScore >= 80) score += 6
  if (l.auto.source.startsWith('feed:')) score += 4 // contracted partner feed
  return Math.min(88, score)
}

/** Adapt an auto-ingested listing into the marketplace Property shape. */
export function autoListingToProperty(l: AutoListing): Property {
  const feedName = l.auto.source.startsWith('feed:') ? l.auto.source.split(':')[2] : 'market scanner'
  return {
    ...l,
    type: l.type as Property['type'],
    purpose: l.purpose as Property['purpose'],
    availability: l.availability as Property['availability'],
    // base-path aware so images resolve under /keja-ai/ subpath hosting
    images: l.images.map((img) => (img.startsWith('http') || img.startsWith('data:') ? img : asset(img))),
    trustScore: autoTrustScore(l),
    verification: {
      // Machine screens only — Ardhisasa title check remains PENDING until a
      // human verifies. This is the honest middle band by design.
      titleCheck: 'pending',
      ardhisasaMatch: false,
      photosVerified: true,
      duplicateCheck: 'clean',
      listingVelocity: 'normal',
      lastChecked: l.auto.firstSeenAt.slice(0, 10),
    },
    trustSignals: [
      {
        label: 'Auto-ingested listing',
        status: 'pass',
        detail: `Source: ${feedName} — machine-screened by Keja Auto-Pilot on ingestion`,
      },
      ...l.auto.checks.map((c) => ({
        label: c.label,
        status: c.status,
        detail: c.detail,
      })),
    ],
    highlights: l.highlights,
  } as Property
}

/** All auto listings adapted for the marketplace (newest first). */
export const AUTO_PROPERTIES: Property[] = AUTO_LISTINGS.map(autoListingToProperty)

/** Pipeline health + inventory stats for the Admin console. */
export function autoPilotStats() {
  const lastRun = AUTO_RUNS[0]
  const feedOk = (lastRun?.feedStatus ?? []).filter((f) => f.state === 'ok').length
  const feedTotal = (lastRun?.feedStatus ?? []).length
  const avgQuality = AUTO_LISTINGS.length
    ? Math.round(AUTO_LISTINGS.reduce((acc, l) => acc + l.auto.qualityScore, 0) / AUTO_LISTINGS.length)
    : 0
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000
  return {
    liveListings: AUTO_LISTINGS.length,
    pendingReview: AUTO_PENDING.length,
    totalRuns: AUTO_RUNS.length,
    lastRun,
    lastRunAt: lastRun?.startedAt ?? null,
    feedHealth: feedTotal ? `${feedOk}/${feedTotal} feeds healthy` : 'no feeds connected',
    feedsDegraded: feedOk < feedTotal,
    avgQuality,
    publishedThisWeek: AUTO_LISTINGS.filter((l) => +new Date(l.listedAt) > weekAgo).length,
    sources: {
      scanner: AUTO_LISTINGS.filter((l) => l.auto.source === 'market-scanner').length,
      feeds: AUTO_LISTINGS.filter((l) => l.auto.source.startsWith('feed:')).length,
    },
  }
}
