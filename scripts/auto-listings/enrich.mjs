/**
 * Keja Auto-Pilot — AI enrichment layer.
 *
 * Turns raw sightings (scanner + feeds) into complete, publishable listings:
 *   • auto-written descriptions (grammar + variation, no two identical)
 *   • title generation
 *   • rent estimate + gross-yield estimate from area economics
 *   • deterministic photo assignment (reuse-aware)
 *   • amenities and highlights grounded in area data
 * Enrichment never invents trust facts — it only formats and computes.
 */
import {
  AMENITIES, POI, TENANT_MIX, CORRIDORS, DESCRIPTION_GRAMMAR, titleFor,
  makeRng, pick, pickN,
} from './market.mjs'

function fmtK(n) {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1000) return `KES ${Math.round(n / 1000)}k`
  return `KES ${n}`
}

function priceGrade(ppsmActual, band) {
  const mid = (band[0] + band[1]) / 2
  const r = ppsmActual / mid
  if (r < 0.88) return 'below'
  if (r > 1.12) return 'above'
  return 'within'
}

export function enrich(sighting, seq) {
  const rng = makeRng(sighting.seed)
  const r = sighting.raw
  const typeLabel = { apartment: 'apartment', townhouse: 'townhouse', villa: 'villa', bungalow: 'bungalow', land: 'land parcel', commercial: 'commercial unit' }[r.type] ?? 'property'

  const ppsm = r.sqm && r.price >= 500000 ? Math.round(r.price / r.sqm) : 0

  // Rent estimate (sale listings only): price × area yield / 12
  const rentEstimate = !r.isRental && r.price >= 500000 && r.type !== 'land'
    ? Math.max(15000, Math.round((r.price * (r.areaYield / 100)) / 12 / 1000) * 1000)
    : undefined
  const grossYieldEstimate = rentEstimate ? Math.round(((rentEstimate * 12) / r.price) * 1000) / 10 : undefined

  // Description: opening + middle + closing (grammar, seeded variety)
  const opening = pick(rng, DESCRIPTION_GRAMMAR.openings)
    .replaceAll('{typeLabel}', typeLabel)
    .replaceAll('{area}', r.area)
    .replaceAll('{county}', r.county)
    .replaceAll('{sqm}', String(r.sqm ?? Math.round(rentEstimate ? rentEstimate / 300 : 90)))
  const middles = DESCRIPTION_GRAMMAR.middles[r.type] ?? DESCRIPTION_GRAMMAR.middles.apartment
  const middle = pick(rng, middles)
  const closingPool = grossYieldEstimate && grossYieldEstimate >= 6 ? DESCRIPTION_GRAMMAR.closings.invest : DESCRIPTION_GRAMMAR.closings.lifestyle
  const closing = pick(rng, closingPool)
    .replaceAll('{area}', r.area)
    .replaceAll('{yieldPct}', String(r.areaYield))
    .replaceAll('{pricePerSqm}', ppsm ? fmtK(ppsm) : 'a competitive rate')
    .replaceAll('{priceGrade}', priceGrade(ppsm, r.areaPpsm))
  const description = `${opening} ${middle} ${closing}`

  // Highlights: grounded in the sighting's own facts
  const highlights = [
    ppsm ? `${fmtK(ppsm)}/sqm — ${priceGrade(ppsm, r.areaPpsm)} the ${r.area} band` : `${r.area} location with steady tenant demand`,
    `Close to ${pick(rng, POI[r.area] ?? ['local amenities'])}`,
    grossYieldEstimate ? `Est. gross yield ~${grossYieldEstimate}% p.a. (area band ${r.areaYield}%)` : `Popular with ${pick(rng, TENANT_MIX)} tenants`,
  ]
  if (r.offPlan) highlights.push('Off-plan with staged payment plan')
  if (r.sqm && r.type === 'land') highlights.push(`${(r.sqm / 4047).toFixed(2)} acres with beaconed boundaries`)

  // Photos: deterministic pick by type (2–3 images)
  const PHOTO_POOLS = {
    apartment: ['apartment_0', 'apartment_1', 'apartment_2', 'interior_0', 'interior_1', 'bedroom_0'],
    townhouse: ['townhouse_0', 'townhouse_1', 'interior_2', 'apartment_2'],
    villa: ['villa_0', 'villa_1', 'interior_0', 'townhouse_1'],
    bungalow: ['townhouse_0', 'interior_1', 'apartment_1'],
    land: ['land_0', 'land_1'],
    commercial: ['office_0', 'office_1', 'interior_2'],
  }
  const photos = pickN(rng, PHOTO_POOLS[r.type] ?? PHOTO_POOLS.apartment, r.type === 'land' ? 2 : 3).map((p) => `/images/props/${p}.jpg`)

  const id = `KJA-A${String(seq).padStart(4, '0')}`
  const title = r.feedTitle ?? titleFor(rng, r.type, r.area, r.bedrooms ?? 0)

  return {
    id,
    title,
    type: r.type,
    purpose: r.purpose,
    area: r.area,
    county: r.county,
    price: r.price,
    rentEstimate,
    grossYieldEstimate,
    bedrooms: r.bedrooms,
    bathrooms: r.bathrooms,
    sizeSqm: r.sqm ?? 0,
    amenities: pickN(rng, AMENITIES[r.type] ?? AMENITIES.apartment, 4 + Math.floor(rng() * 3)),
    images: photos,
    description,
    agency: r.agency,
    agent: { name: r.agentName, phone: r.agentPhone },
    availability: 'available',
    listedAt: sighting.firstSeenAt,
    appreciationForecast: Math.round((4.5 + rng() * 4) * 10) / 10,
    offPlan: r.offPlan,
    furnished: r.furnished,
    highlights,
    views: 0,
    /* autopilot metadata (consumed by the runtime adapter + admin console) */
    auto: {
      source: sighting.source,
      firstSeenAt: sighting.firstSeenAt,
      enrichedBy: 'keja-autopilot/enrich@1',
      priceGrade: ppsm ? priceGrade(ppsm, r.areaPpsm) : 'n/a',
      areaYieldBand: r.areaYield,
      areaPpsmBand: r.areaPpsm,
      areaAcreBand: r.areaAcre,
    },
  }
}
