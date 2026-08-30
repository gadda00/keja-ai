/**
 * Keja Auto-Pilot — quality gate & anomaly screening.
 *
 * Every enriched listing is scored 0–100 before publication:
 *   completeness (30) — fields a buyer needs
 *   price sanity (30) — price/sqm vs the area band (the bait-price screen)
 *   content quality (20) — description depth, amenities, photos
 *   source reputation (20) — feed partner vs organic scanner sighting
 * Routing: ≥80 auto-publish · 60–79 review queue · <60 reject.
 * This mirrors the trust-by-design checks advertised on /trust.
 */

const REQUIRED_FIELDS = ['title', 'area', 'county', 'price', 'sizeSqm', 'description', 'agency', 'agent']

export function qualityScore(listing) {
  const checks = []
  let score = 0

  // --- completeness (30) ---
  const missing = REQUIRED_FIELDS.filter((f) => {
    const v = f === 'agent' ? listing.agent?.name : listing[f]
    return v === undefined || v === null || v === '' || (f === 'sizeSqm' && Number(v) <= 0)
  })
  const completeness = Math.max(0, 30 - missing.length * 6)
  score += completeness
  checks.push({
    label: 'Completeness screen',
    status: missing.length === 0 ? 'pass' : missing.length <= 1 ? 'warn' : 'fail',
    detail: missing.length === 0 ? 'All buyer-critical fields present' : `Missing: ${missing.join(', ')}`,
  })

  // --- price sanity (30) — type-aware ---
  let priceStatus = 'pass'
  let priceDetail = 'Price sits inside the area market band'
  const band = listing.auto?.areaPpsmBand ?? [20000, 160000]
  const acreBand = listing.auto?.areaAcreBand ?? [2, 15]
  if (listing.type === 'land' && listing.sizeSqm > 0) {
    // Land: price per acre vs the area acreage band
    const acres = listing.sizeSqm / 4047
    const perAcreM = listing.price / acres / 1_000_000
    if (perAcreM < acreBand[0] * 0.5) {
      priceStatus = 'fail'
      priceDetail = `KES ${perAcreM.toFixed(1)}M/acre is far below the area band (${acreBand[0]}–${acreBand[1]}M) — possible bait`
    } else if (perAcreM < acreBand[0] * 0.75 || perAcreM > acreBand[1] * 1.4) {
      priceStatus = 'warn'
      priceDetail = `KES ${perAcreM.toFixed(1)}M/acre is outside the typical band (${acreBand[0]}–${acreBand[1]}M) — verify valuation`
    } else {
      priceDetail = `KES ${perAcreM.toFixed(1)}M/acre within the area band (${acreBand[0]}–${acreBand[1]}M)`
    }
  } else if (listing.price >= 500000 && listing.sizeSqm > 0) {
    const ppsm = listing.price / listing.sizeSqm
    if (ppsm < band[0] * 0.5) {
      priceStatus = 'fail'
      priceDetail = `KES ${Math.round(ppsm / 1000)}k/sqm is far below the area band — classic bait pricing`
    } else if (ppsm < band[0] * 0.75 || ppsm > band[1] * 1.35) {
      priceStatus = 'warn'
      priceDetail = `KES ${Math.round(ppsm / 1000)}k/sqm is outside the typical area band — verify valuation`
    } else {
      priceDetail = `KES ${Math.round(ppsm / 1000)}k/sqm sits within the area band`
    }
  } else if (listing.price < 500000 && listing.price < 15000) {
    priceStatus = 'warn'
    priceDetail = 'Monthly rent below KES 15k — verify unit condition'
  } else if (listing.price <= 0) {
    priceStatus = 'fail'
    priceDetail = 'No usable price supplied by the source feed'
  }
  score += priceStatus === 'pass' ? 30 : priceStatus === 'warn' ? 15 : 0
  checks.push({ label: 'Price-band screen', status: priceStatus, detail: priceDetail })

  // --- content quality (20) ---
  const descWords = String(listing.description ?? '').split(/\s+/).length
  const photoCount = (listing.images ?? []).length
  const amenityCount = (listing.amenities ?? []).length
  let content = 0
  if (descWords >= 50) content += 8
  else if (descWords >= 30) content += 5
  if (photoCount >= 3) content += 6
  else if (photoCount >= 2) content += 4
  if (amenityCount >= 4) content += 6
  else if (amenityCount >= 2) content += 3
  score += content
  checks.push({
    label: 'Content quality screen',
    status: content >= 16 ? 'pass' : content >= 10 ? 'warn' : 'fail',
    detail: `${descWords}-word description · ${photoCount} photos · ${amenityCount} amenities`,
  })

  // --- source reputation (20) ---
  const source = listing.auto?.source ?? ''
  const isPartnerFeed = source.startsWith('feed:')
  const repScore = isPartnerFeed ? 20 : 15 // feeds are contracted partners
  score += repScore
  checks.push({
    label: 'Source screening',
    status: isPartnerFeed ? 'pass' : 'warn',
    detail: isPartnerFeed ? `Contracted partner feed (${source.split(':')[2]})` : 'Organic market scanner sighting — human spot-check recommended',
  })

  score = Math.max(0, Math.min(100, Math.round(score)))
  const route = score >= 80 ? 'publish' : score >= 60 ? 'review' : 'reject'
  return { score, route, checks }
}

/** Attach quality metadata to a listing (stored alongside, not shown as "facts"). */
export function screen(listing) {
  const q = qualityScore(listing)
  return {
    ...listing,
    auto: {
      ...listing.auto,
      qualityScore: q.score,
      route: q.route,
      checks: q.checks,
    },
  }
}
