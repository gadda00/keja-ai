/**
 * Keja Auto-Pilot - Enhanced AI Enrichment Layer
 * 
 * This enhances the original enrich.mjs with:
 * - More detailed descriptions based on area characteristics
 * - Better title generation with location highlights
 * - More accurate rent and yield estimates
 * - Enhanced photo selection based on property type and quality
 * - Richer highlights based on area amenities and property features
 * - Dynamic appreciation forecasts based on area trends
 */

import {
  AMENITIES, POI, TENANT_MIX, CORRIDORS, DESCRIPTION_GRAMMAR, titleFor,
  makeRng, pick, pickN, AREAS, TYPES, MARKET_TRENDS
} from './market-enhanced.mjs';

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

/**
 * Get area-specific features and selling points
 */
function getAreaFeatures(areaName) {
  const area = AREAS.find(a => a.area === areaName)
  if (!area) return []
  
  const features = []
  
  // Infrastructure highlights
  if (area.infrastructure > 8.5) {
    features.push('Excellent infrastructure')
  } else if (area.infrastructure > 7.5) {
    features.push('Good infrastructure')
  }
  
  // Security highlights
  if (area.security > 9) {
    features.push('Top-tier security')
  } else if (area.security > 7.5) {
    features.push('Secure neighborhood')
  }
  
  // Schools highlights
  if (area.schools > 8.5) {
    features.push('Access to top schools')
  } else if (area.schools > 7) {
    features.push('Good schools nearby')
  }
  
  // Healthcare highlights
  if (area.healthcare > 8) {
    features.push('Quality healthcare facilities')
  }
  
  // Connectivity highlights
  if (area.connectivity > 8) {
    features.push('Excellent connectivity')
  }
  
  // Transport highlights
  if (area.transport > 8.5) {
    features.push('Superb transport links')
  } else if (area.transport > 7) {
    features.push('Good transport access')
  }
  
  return features
}

/**
 * Get type-specific features
 */
function getTypeFeatures(type, ppsm, sqm, bedrooms) {
  const features = []
  
  switch (type) {
    case 'apartment':
      if (ppsm > 100000) features.push('Luxury finishes')
      if (sqm > 120) features.push('Spacious layout')
      if (bedrooms >= 3) features.push('Family-friendly')
      break
    case 'townhouse':
      if (sqm > 200) features.push('Generous space')
      if (bedrooms >= 4) features.push('Ideal for families')
      break
    case 'villa':
      if (sqm > 300) features.push('Expansive living')
      if (bedrooms >= 5) features.push('Perfect for large families')
      break
    case 'bungalow':
      features.push('Single-level living')
      if (sqm > 150) features.push('Roomy bungalow')
      break
    case 'land':
      if (sqm > 4000) features.push('Large development plot')
      if (sqm < 2000) features.push('Compact building plot')
      break
    case 'commercial':
      if (sqm > 500) features.push('Large commercial space')
      features.push('Business-ready')
      break
  }
  
  return features
}

/**
 * Calculate dynamic appreciation based on area trends
 */
function calculateAppreciation(rng, areaName, type) {
  const area = AREAS.find(a => a.area === areaName)
  if (!area) return Math.round((4.5 + rng() * 4) * 10) / 10
  
  // Base appreciation from area demand
  let appreciation = 5 + (area.demand - 7) * 0.8
  
  // Adjust based on infrastructure growth potential
  appreciation += (9 - area.infrastructure) * 0.3
  
  // Type-specific adjustments
  const typeBonus = {
    'land': 2.0,
    'villa': 1.5,
    'apartment': 0.5,
    'townhouse': 1.0,
    'bungalow': 0.8,
    'commercial': 0.3
  }
  appreciation += typeBonus[type] || 0
  
  // Add random variation
  appreciation += (rng() - 0.5) * 1.5
  
  return Math.max(3, Math.min(15, Math.round(appreciation * 10) / 10))
}

/**
 * Calculate more accurate rent estimate
 */
function calculateRentEstimate(rng, price, areaYield, sqm, type, bedrooms) {
  // Base rent from price and yield
  const baseRent = Math.max(15000, Math.round((price * (areaYield / 100)) / 12 / 1000) * 1000)
  
  // Adjust based on type
  const typeFactors = {
    'apartment': 1.0,
    'townhouse': 1.1,
    'villa': 1.2,
    'bungalow': 1.05,
    'commercial': 1.3
  }
  
  const typeFactor = typeFactors[type] || 1.0
  
  // Adjust based on bedrooms
  const bedroomFactors = {
    1: 0.8,
    2: 1.0,
    3: 1.2,
    4: 1.4,
    5: 1.6
  }
  const bedroomFactor = bedroomFactors[bedrooms] || 1.0
  
  // Adjust based on size
  const sizeFactor = Math.min(1.3, 1 + (sqm - 100) / 200)
  
  // Add random variation
  const variation = 0.95 + rng() * 0.1
  
  const rent = Math.round(baseRent * typeFactor * bedroomFactor * sizeFactor * variation / 1000) * 1000
  
  return Math.max(25000, rent)
}

/**
 * Enhanced enrichment with more details
 */
export function enrich(sighting, seq) {
  const rng = makeRng(sighting.seed)
  const r = sighting.raw
  const typeLabel = { 
    apartment: 'apartment', 
    townhouse: 'townhouse', 
    villa: 'villa', 
    bungalow: 'bungalow', 
    land: 'land parcel', 
    commercial: 'commercial unit' 
  }[r.type] ?? 'property'

  const ppsm = r.sqm && r.price >= 500000 ? Math.round(r.price / r.sqm) : 0

  // Enhanced rent estimate
  const rentEstimate = !r.isRental && r.price >= 500000 && r.type !== 'land'
    ? calculateRentEstimate(rng, r.price, r.areaYield, r.sqm, r.type, r.bedrooms)
    : undefined
  
  const grossYieldEstimate = rentEstimate ? Math.round(((rentEstimate * 12) / r.price) * 1000) / 10 : undefined

  // Enhanced description with area-specific details
  const area = AREAS.find(a => a.area === r.area)
  const areaFeatures = getAreaFeatures(r.area)
  const typeFeatures = getTypeFeatures(r.type, ppsm, r.sqm, r.bedrooms)
  
  // Build opening with area context
  const opening = pick(rng, DESCRIPTION_GRAMMAR.openings)
    .replaceAll('{typeLabel}', typeLabel)
    .replaceAll('{area}', r.area)
    .replaceAll('{county}', r.county)
    .replaceAll('{sqm}', String(r.sqm ?? Math.round(rentEstimate ? rentEstimate / 300 : 90)))
    .replaceAll('{county}', r.county)

  // Enhanced middles with area context
  const middles = DESCRIPTION_GRAMMAR.middles[r.type] ?? DESCRIPTION_GRAMMAR.middles.apartment
  let middle = pick(rng, middles)
  
  // Add area-specific context to middle
  if (area && area.demand > 8) {
    middle += ` The area's high demand (${area.demand}/10) ensures strong interest.`
  }
  
  // Choose closing based on investment potential
  const closingPool = grossYieldEstimate && grossYieldEstimate >= 6 
    ? DESCRIPTION_GRAMMAR.closings.invest 
    : DESCRIPTION_GRAMMAR.closings.lifestyle
  const closing = pick(rng, closingPool)
    .replaceAll('{area}', r.area)
    .replaceAll('{yieldPct}', String(r.areaYield))
    .replaceAll('{pricePerSqm}', ppsm ? fmtK(ppsm) : 'a competitive rate')
    .replaceAll('{priceGrade}', priceGrade(ppsm, r.areaPpsm))

  // Combine with area and type features
  const areaContext = areaFeatures.length > 0 
    ? ` Located in an area known for ${areaFeatures.join(', ')}, ` 
    : ' '
  const typeContext = typeFeatures.length > 0 
    ? `This ${typeLabel} features ${typeFeatures.join(', ')}. ` 
    : ''
  
  const description = `${opening} ${middle}${areaContext}${typeContext}${closing}`

  // Enhanced highlights with more context
  const highlights = [
    ppsm ? `${fmtK(ppsm)}/sqm — ${priceGrade(ppsm, r.areaPpsm)} the ${r.area} band` : `${r.area} location with steady tenant demand`,
    `Close to ${pick(rng, POI[r.area] ?? ['local amenities'])}`,
    grossYieldEstimate ? `Est. gross yield ~${grossYieldEstimate}% p.a. (area band ${r.areaYield}%)` : `Popular with ${pick(rng, TENANT_MIX)} tenants`,
    ...areaFeatures.slice(0, 2),
    ...typeFeatures.slice(0, 2),
  ]
  
  if (r.offPlan) highlights.push('Off-plan with staged payment plan')
  if (r.sqm && r.type === 'land') highlights.push(`${(r.sqm / 4047).toFixed(2)} acres with beaconed boundaries`)
  if (r.furnished) highlights.push('Fully furnished with quality finishes')
  if (r.listingAge < 7) highlights.push('Fresh on the market')

  // Enhanced photo selection based on quality and type
  const PHOTO_POOLS = {
    apartment: ['apartment_0', 'apartment_1', 'apartment_2', 'interior_0', 'interior_1', 'bedroom_0', 'kitchen_0', 'bathroom_0'],
    townhouse: ['townhouse_0', 'townhouse_1', 'interior_2', 'apartment_2', 'garden_0', 'exterior_0'],
    villa: ['villa_0', 'villa_1', 'interior_0', 'townhouse_1', 'pool_0', 'garden_1', 'exterior_1'],
    bungalow: ['townhouse_0', 'interior_1', 'apartment_1', 'garden_0', 'exterior_0'],
    land: ['land_0', 'land_1', 'land_2', 'aerial_0'],
    commercial: ['office_0', 'office_1', 'interior_2', 'exterior_2', 'reception_0'],
  }
  
  // Select more photos for premium properties
  const photoCount = r.type === 'land' ? 3 : 
                   ppsm > 100000 ? 5 : 
                   ppsm > 70000 ? 4 : 3
  
  const photos = pickN(rng, PHOTO_POOLS[r.type] ?? PHOTO_POOLS.apartment, photoCount)
    .map((p) => `/images/props/${p}.jpg`)

  // Dynamic appreciation forecast
  const appreciationForecast = calculateAppreciation(rng, r.area, r.type)

  const id = `KJA-A${String(seq).padStart(4, '0')}`
  
  // Enhanced title with more context
  const title = r.feedTitle || titleFor(rng, r.type, r.area, r.bedrooms ?? 0)

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
    amenities: pickN(rng, AMENITIES[r.type] ?? AMENITIES.apartment, 4 + Math.floor(rng() * 4)),
    images: photos,
    description,
    agency: r.agency,
    agent: { name: r.agentName, phone: r.agentPhone },
    availability: 'available',
    listedAt: sighting.firstSeenAt,
    appreciationForecast,
    offPlan: r.offPlan,
    furnished: r.furnished,
    highlights,
    views: 0,
    /* Enhanced autopilot metadata */
    auto: {
      source: sighting.source,
      firstSeenAt: sighting.firstSeenAt,
      enrichedBy: 'keja-autopilot/enrich-enhanced@1',
      priceGrade: ppsm ? priceGrade(ppsm, r.areaPpsm) : 'n/a',
      areaYieldBand: r.areaYield,
      areaPpsmBand: r.areaPpsm,
      areaAcreBand: r.areaAcre,
      areaInfrastructure: r.areaInfrastructure,
      areaSecurity: r.areaSecurity,
      areaSchools: r.areaSchools,
      areaHealthcare: r.areaHealthcare,
      typeAppreciation: r.typeAppreciation,
      typeLiquidity: r.typeLiquidity,
      listingAge: r.listingAge,
    },
  }
}

export default enrich;
