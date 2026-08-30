/**
 * Keja Auto-Pilot - Enhanced Publish Module
 * 
 * This enhances the original publish.mjs with:
 * - Better state management for runs
 * - Enhanced quality scoring
 * - More detailed logging
 * - Improved deduplication tracking
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DATA_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../src/data')
const STATE_FILE = resolve(DATA_DIR, 'auto-listings.json')

/**
 * Load current state from file
 */
export function loadState() {
  if (!existsSync(STATE_FILE)) {
    return {
      version: 1,
      generatedAt: new Date().toISOString(),
      runs: [],
      listings: [],
      pending: [],
      rejected: [],
      seenSignatures: [],
    }
  }
  
  try {
    const content = readFileSync(STATE_FILE, 'utf8')
    const state = JSON.parse(content)
    
    // Ensure all required fields exist
    return {
      version: state.version || 1,
      generatedAt: state.generatedAt || new Date().toISOString(),
      runs: state.runs || [],
      listings: state.listings || [],
      pending: state.pending || [],
      rejected: state.rejected || [],
      seenSignatures: state.seenSignatures || [],
    }
  } catch {
    return {
      version: 1,
      generatedAt: new Date().toISOString(),
      runs: [],
      listings: [],
      pending: [],
      rejected: [],
      seenSignatures: [],
    }
  }
}

/**
 * Save state to file
 */
export function saveState(state) {
  const content = JSON.stringify(state, null, 2)
  writeFileSync(STATE_FILE, content, 'utf8')
  return STATE_FILE
}

/**
 * Get next sequence number
 */
export function nextSequence(state) {
  const lastRun = state.runs[0]
  if (lastRun && lastRun.id) {
    const match = lastRun.id.match(/run-(\d{4}-\d{2}-\d{2})-(\d{5})/)
    if (match) {
      return parseInt(match[2], 10) + 1
    }
  }
  return 1
}

/**
 * Publish listings with enhanced metadata
 */
export function publish({ state, screened, feedStatus, runId }) {
  const now = new Date().toISOString()
  
  // Separate by route
  const published = []
  const queued = []
  const rejected = []
  
  for (const listing of screened) {
    switch (listing.auto.route) {
      case 'publish':
        published.push(listing)
        break
      case 'review':
        queued.push(listing)
        break
      case 'reject':
        rejected.push({
          id: listing.id,
          title: listing.title,
          source: listing.auto.source,
          qualityScore: listing.auto.qualityScore,
          checks: listing.auto.checks,
          rejectedAt: now,
          reason: 'Failed quality gate',
        })
        break
    }
  }

  // Update seen signatures
  const newSignatures = screened.map(l => {
    const r = l.raw
    const priceBand = l.price >= 500000
      ? Math.round(l.price / 1_000_000)
      : Math.round(l.price / 5000)
    return `${l.type}|${l.area}|${l.bedrooms ?? 0}br|${priceBand}`
  })
  
  const allSignatures = [...(state.seenSignatures || []), ...newSignatures]
  
  // Create new state
  const newState = {
    version: state.version || 1,
    generatedAt: now,
    runs: [
      {
        id: runId,
        startedAt: now,
        ingested: screened.length,
        published: published.length,
        queued: queued.length,
        rejected: rejected.length,
        deduped: 0, // Will be set by caller
        sources: {
          scanner: state.runs.length > 0 ? state.runs[0].sources?.scanner || 0 : 0,
          feeds: state.runs.length > 0 ? state.runs[0].sources?.feeds || 0 : 0,
        },
        feedStatus: feedStatus || [],
      },
      ...(state.runs || []).slice(0, 49), // Keep last 50 runs
    ],
    listings: [
      ...published,
      ...(state.listings || []).slice(0, 49), // Keep last 50 listings
    ],
    pending: [
      ...queued,
      ...(state.pending || []).slice(0, 19), // Keep last 20 pending
    ],
    rejected: [
      ...rejected,
      ...(state.rejected || []).slice(0, 49), // Keep last 50 rejected
    ],
    seenSignatures: allSignatures.slice(-500), // Keep last 500 signatures
  }

  return {
    nextState: newState,
    published,
    pending: queued,
    rejected,
    run: newState.runs[0],
  }
}

/**
 * Enhanced quality gate with more factors
 */
export function enhancedQualityScore(listing) {
  const checks = []
  let score = 0
  
  // Required fields
  const REQUIRED_FIELDS = ['title', 'area', 'county', 'price', 'sizeSqm', 'description', 'agency', 'agent']
  const missing = REQUIRED_FIELDS.filter((f) => {
    const v = f === 'agent' ? listing.agent?.name : listing[f]
    return v === undefined || v === null || v === '' || ((f === 'sizeSqm' || f === 'price') && Number(v) <= 0)
  })
  
  // Completeness (30 points)
  const completeness = Math.max(0, 30 - missing.length * 6)
  score += completeness
  checks.push({
    label: 'Completeness screen',
    status: missing.length === 0 ? 'pass' : missing.length <= 1 ? 'warn' : 'fail',
    detail: missing.length === 0 ? 'All buyer-critical fields present' : `Missing: ${missing.join(', ')}`,
  })

  // Price sanity (30 points)
  let priceStatus = 'pass'
  let priceDetail = 'Price sits inside the area market band'
  const band = listing.auto?.areaPpsmBand ?? [20000, 160000]
  const acreBand = listing.auto?.areaAcreBand ?? [2, 15]
  
  if (!(listing.price > 0)) {
    priceStatus = 'fail'
    priceDetail = 'No usable price supplied by the source feed'
  } else if (listing.type === 'land' && listing.sizeSqm > 0) {
    const acres = listing.sizeSqm / 4047
    const perAcreM = listing.price / acres / 1_000_000
    if (perAcreM < acreBand[0] * 0.5) {
      priceStatus = 'fail'
      priceDetail = `KES ${perAcreM.toFixed(1)}M/acre is far below the area band (${acreBand[0]}\u2013${acreBand[1]}M) \u2014 possible bait`
    } else if (perAcreM < acreBand[0] * 0.75 || perAcreM > acreBand[1] * 1.4) {
      priceStatus = 'warn'
      priceDetail = `KES ${perAcreM.toFixed(1)}M/acre is outside the typical band (${acreBand[0]}\u2013${acreBand[1]}M) \u2014 verify valuation`
    } else {
      priceDetail = `KES ${perAcreM.toFixed(1)}M/acre within the area band (${acreBand[0]}\u2013${acreBand[1]}M)`
    }
  } else if (listing.price >= 500000 && listing.sizeSqm > 0) {
    const ppsm = listing.price / listing.sizeSqm
    if (ppsm < band[0] * 0.5) {
      priceStatus = 'fail'
      priceDetail = `KES ${Math.round(ppsm / 1000)}k/sqm is far below the area band \u2014 classic bait pricing`
    } else if (ppsm < band[0] * 0.75 || ppsm > band[1] * 1.35) {
      priceStatus = 'warn'
      priceDetail = `KES ${Math.round(ppsm / 1000)}k/sqm is outside the typical area band \u2014 verify valuation`
    } else {
      priceDetail = `KES ${Math.round(ppsm / 1000)}k/sqm sits within the area band`
    }
  } else if (listing.price >= 500000 && listing.sizeSqm <= 0) {
    priceStatus = 'warn'
    priceDetail = 'No size supplied \u2014 price sanity screen skipped; verify valuation manually'
  } else if (listing.price < 500000 && listing.price < 15000) {
    priceStatus = 'warn'
    priceDetail = 'Monthly rent below KES 15k \u2014 verify unit condition'
  }
  
  score += priceStatus === 'pass' ? 30 : priceStatus === 'warn' ? 15 : 0
  checks.push({ label: 'Price-band screen', status: priceStatus, detail: priceDetail })

  // Content quality (20 points)
  const descWords = String(listing.description ?? '').split(/\s+/).length
  const photoCount = (listing.images ?? []).length
  const amenityCount = (listing.amenities ?? []).length
  let content = 0
  if (descWords >= 80) content += 8
  else if (descWords >= 50) content += 5
  if (photoCount >= 4) content += 6
  else if (photoCount >= 3) content += 4
  if (amenityCount >= 6) content += 6
  else if (amenityCount >= 4) content += 3
  score += content
  checks.push({
    label: 'Content quality screen',
    status: content >= 16 ? 'pass' : content >= 10 ? 'warn' : 'fail',
    detail: `${descWords}-word description \u00b7 ${photoCount} photos \u00b7 ${amenityCount} amenities`,
  })

  // Source reputation (20 points)
  const source = listing.auto?.source ?? ''
  const isPartnerFeed = source.startsWith('feed:')
  const repScore = isPartnerFeed ? 20 : 15
  score += repScore
  checks.push({
    label: 'Source screening',
    status: isPartnerFeed ? 'pass' : 'warn',
    detail: isPartnerFeed ? `Contracted partner feed (${source.split(':')[2]})` : 'Organic market scanner sighting \u2014 human spot-check recommended',
  })

  // Area quality bonus (up to 10 points)
  const areaQuality = (listing.auto?.areaInfrastructure || 7) * 0.5 + 
                     (listing.auto?.areaSecurity || 7) * 0.3 + 
                     (listing.auto?.areaSchools || 7) * 0.2
  const areaBonus = Math.max(0, (areaQuality - 7) * 2)
  score += areaBonus
  checks.push({
    label: 'Area quality bonus',
    status: areaQuality > 8 ? 'pass' : 'warn',
    detail: `Area score: ${areaQuality.toFixed(1)}/10`,
  })

  // Type liquidity bonus (up to 5 points)
  const liquidityBonus = (listing.auto?.typeLiquidity || 5) * 0.5
  score += liquidityBonus
  
  score = Math.max(0, Math.min(100, Math.round(score)))
  let route = score >= 80 ? 'publish' : score >= 60 ? 'review' : 'reject'
  if (priceStatus === 'fail') route = 'reject'
  
  return { score, route, checks }
}

export default {
  loadState,
  saveState,
  nextSequence,
  publish,
  enhancedQualityScore,
};
