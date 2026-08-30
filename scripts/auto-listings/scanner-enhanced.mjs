/**
 * Keja Auto-Pilot - Enhanced AI Market Scanner
 * 
 * This is an enhanced version of scanner.mjs with:
 * - More realistic area selection based on infrastructure and security
 * - Type selection that considers area characteristics
 * - Agency selection weighted by rating and listings
 * - More sophisticated pricing models
 * - Better bedroom and size distributions
 * - Enhanced rental vs sale logic
 * - More realistic listing ages
 */

import { AREAS, TYPES, AGENCIES, makeRng, hashString, randInt, pick } from './market-enhanced.mjs';

/**
 * Choose area based on demand AND infrastructure quality
 */
function chooseArea(rng) {
  // Weight by demand AND infrastructure quality for more realistic distribution
  const weights = AREAS.map((a) => a.demand * (a.infrastructure || 7) * (a.security || 7) / 50)
  const total = weights.reduce((x, y) => x + y, 0)
  let r = rng() * total
  for (let i = 0; i < AREAS.length; i++) {
    r -= weights[i]
    if (r <= 0) return AREAS[i]
  }
  return AREAS[0]
}

/**
 * Choose type based on area characteristics
 */
function chooseTypeForArea(rng, area) {
  // Area-specific type preferences
  const areaTypes = {
    'Kilimani': ['apartment', 'commercial', 'townhouse'],
    'Westlands': ['apartment', 'commercial', 'townhouse'],
    'Kileleshwa': ['apartment', 'townhouse', 'villa'],
    'Lavington': ['apartment', 'villa', 'townhouse'],
    'Riverside': ['apartment', 'commercial', 'villa'],
    'Karen': ['villa', 'bungalow', 'land'],
    'Runda': ['villa', 'bungalow', 'land'],
    'Ruaka': ['townhouse', 'apartment', 'land'],
    'Kasarani': ['apartment', 'land', 'townhouse'],
    'Madaraka': ['apartment', 'commercial', 'townhouse'],
    'Syokimau': ['land', 'townhouse', 'apartment'],
    'Kitengela': ['land', 'bungalow', 'townhouse'],
    'Athi River': ['land', 'apartment', 'commercial'],
    'Nyali': ['villa', 'apartment', 'land'],
    'Diani': ['villa', 'land', 'bungalow'],
    'Milimani': ['apartment', 'commercial', 'land'],
    'Nakuru': ['land', 'apartment', 'bungalow'],
    'Nanyuki': ['land', 'villa', 'bungalow'],
    'Gigiri': ['villa', 'apartment', 'land'],
    'Muthaiga': ['villa', 'bungalow', 'land'],
    'Rosslyn': ['apartment', 'villa', 'townhouse'],
    'Spring Valley': ['bungalow', 'villa', 'townhouse'],
  };
  
  const preferred = areaTypes[area.area] || ['apartment', 'townhouse', 'villa', 'land']
  const filteredTypes = TYPES.filter(t => preferred.includes(t.type))
  
  if (filteredTypes.length > 0 && rng() < 0.7) {
    // 70% chance to pick from preferred types
    let r = rng()
    for (const t of filteredTypes) {
      r -= t.weight * 2
      if (r <= 0) return t
    }
  }
  
  // Fallback to default distribution
  return chooseType(rng)
}

function chooseType(rng) {
  let r = rng()
  for (const t of TYPES) {
    r -= t.weight
    if (r <= 0) return t
  }
  return TYPES[0]
}

/**
 * Enhanced scanner with better market modeling
 */
export function scanMarket({ runDate, count = 4, sequence = 0 }) {
  const sightings = []
  for (let i = 0; i < count; i++) {
    const seed = hashString(`${runDate}:scanner:${sequence}:${i}`)
    const rng = makeRng(seed)
    const area = chooseArea(rng)
    const t = chooseTypeForArea(rng, area)
    
    // Weight agencies by their rating and listings
    const agencyWeights = AGENCIES.map(a => (a.rating || 4.5) * Math.min(a.listings || 1, 10) / 10)
    const totalAgencyWeight = agencyWeights.reduce((x, y) => x + y, 0)
    let agencyRng = rng() * totalAgencyWeight
    let agencyIndex = 0
    for (let i = 0; i < agencyWeights.length; i++) {
      agencyRng -= agencyWeights[i]
      if (agencyRng <= 0) {
        agencyIndex = i
        break
      }
    }
    const agency = AGENCIES[agencyIndex]
    const agent = pick(rng, agency.agents)

    // Bedrooms with area-specific adjustments
    let beds
    if (t.beds[1] > 0) {
      // Adjust bedroom distribution based on area type
      if (area.ppsm[0] > 80000) {
        // High-end areas: more 3-4 bedroom units
        beds = randInt(rng, Math.max(2, t.beds[0]), t.beds[1])
      } else if (area.ppsm[0] < 40000) {
        // Budget areas: more 1-2 bedroom units
        beds = randInt(rng, t.beds[0], Math.min(2, t.beds[1]))
      } else {
        beds = randInt(rng, t.beds[0], t.beds[1])
      }
    } else {
      beds = 0
    }
    
    // Size based on bedrooms and type norms, with area adjustments
    let sqm
    if (beds === 0) {
      // Land: size in acres, converted to sqm
      const acres = randInt(rng, area.acre[0] * 0.5, area.acre[1] * 1.5) / 10
      sqm = Math.round(acres * 4047)
    } else if (beds <= 1) {
      sqm = randInt(rng, Math.max(38, t.sqm[0]), Math.min(75, t.sqm[1]))
    } else if (beds === 2) {
      sqm = randInt(rng, Math.max(60, t.sqm[0]), Math.min(110, t.sqm[1]))
    } else if (beds === 3) {
      sqm = randInt(rng, Math.max(95, t.sqm[0]), Math.min(160, t.sqm[1]))
    } else {
      sqm = randInt(rng, Math.max(150, t.sqm[0]), t.sqm[1])
    }
    
    // Add slight variation based on area demand
    const demandFactor = 1 + (area.demand - 7) * 0.05
    sqm = Math.round(sqm * demandFactor)

    // Calculate price with more sophisticated market modeling
    let price
    if (t.type === 'land') {
      const acres = Math.round((sqm / 4047) * 10) / 10
      let perAcre = area.acre[0] + rng() * (area.acre[1] - area.acre[0])
      
      // Apply area-specific pricing factors
      const infrastructureFactor = 1 + (area.infrastructure - 7) * 0.03
      const demandFactor = 1 + (area.demand - 7) * 0.04
      const securityFactor = 1 + (area.security - 7) * 0.02
      
      perAcre *= infrastructureFactor * demandFactor * securityFactor
      
      // Add market bias (distress sales, premium listings)
      const bias = rng()
      if (bias < 0.08) perAcre *= 0.75 + rng() * 0.1 // Distress sale
      else if (bias < 0.20) perAcre *= 0.82 + rng() * 0.08 // Quick sale
      else if (bias > 0.95) perAcre *= 1.15 + rng() * 0.15 // Premium listing
      else if (bias > 0.85) perAcre *= 1.1 + rng() * 0.1 // Above market
      
      price = Math.round((acres * perAcre * 1_000_000) / 50000) * 50000
    } else {
      // For non-land properties
      let ppsm = area.ppsm[0] + rng() * (area.ppsm[1] - area.ppsm[0])
      
      // Apply type-specific pricing adjustments
      const typeFactor = 1 + (t.appreciation[0] - 7) * 0.02
      
      // Apply area factors
      const infrastructureFactor = 1 + (area.infrastructure - 7) * 0.02
      const demandFactor = 1 + (area.demand - 7) * 0.03
      const securityFactor = 1 + (area.security - 7) * 0.015
      
      ppsm *= typeFactor * infrastructureFactor * demandFactor * securityFactor
      
      // Apply quality/finish bias
      const bias = rng()
      if (bias < 0.05) ppsm *= 0.70 + rng() * 0.1 // Needs work
      else if (bias < 0.15) ppsm *= 0.80 + rng() * 0.1 // Basic finish
      else if (bias < 0.40) ppsm *= 0.90 + rng() * 0.1 // Standard finish
      else if (bias < 0.70) ppsm *= 1.00 + rng() * 0.1 // Good finish
      else if (bias < 0.90) ppsm *= 1.10 + rng() * 0.1 // Premium finish
      else ppsm *= 1.20 + rng() * 0.15 // Luxury finish
      
      price = Math.round((sqm * ppsm) / 50000) * 50000
    }
    
    // Ensure minimum viable price
    if (price < 50000) price = 50000
    
    // For high-end areas, ensure prices reflect premium nature
    if (area.ppsm[0] > 100000 && price < area.ppsm[0] * sqm * 0.8) {
      price = Math.round((area.ppsm[0] * sqm * 0.8) / 50000) * 50000
    }

    // Determine rental vs sale based on type and area
    let isRental = false
    let rentPrice = 0
    
    if (t.type === 'apartment' && beds <= 2) {
      // Apartments can be rented
      const rentalProbability = 0.35 + (area.demand - 7) * 0.03
      isRental = rng() < Math.min(0.7, rentalProbability)
    } else if (t.type === 'commercial') {
      // Commercial properties can also be rented
      isRental = rng() < 0.4
    }
    
    if (isRental) {
      // Calculate realistic rent based on area yield
      const baseRent = Math.round((price * (area.yield / 100)) / 12 / 5000) * 5000
      
      // Adjust rent based on quality and demand
      const qualityFactor = 0.9 + rng() * 0.2
      const demandFactor = 1 + (area.demand - 7) * 0.05
      
      rentPrice = Math.round(baseRent * qualityFactor * demandFactor / 5000) * 5000
      price = Math.max(25000, rentPrice)
    }

    // Determine purpose based on type and price
    let purpose
    if (isRental) {
      purpose = ['rent']
    } else if (t.type === 'land') {
      purpose = ['buy', 'invest']
    } else if (price > 20000000) {
      // High-value properties: buy or invest
      purpose = rng() < 0.7 ? ['buy', 'invest'] : ['buy']
    } else if (price < 5000000) {
      // Lower-value: primarily buy
      purpose = rng() < 0.3 ? ['buy', 'invest'] : ['buy']
    } else {
      purpose = rng() < 0.55 ? ['buy', 'invest'] : ['buy']
    }

    // Calculate bathrooms based on bedrooms and type
    let bathrooms
    if (t.baths[1] > 0) {
      if (beds <= 1) {
        bathrooms = 1
      } else if (beds === 2) {
        bathrooms = rng() < 0.7 ? 1 : 2
      } else if (beds === 3) {
        bathrooms = rng() < 0.5 ? 2 : 3
      } else {
        bathrooms = randInt(rng, t.baths[0], Math.min(t.baths[1], beds))
      }
    }
    
    // Determine off-plan status
    const offPlan = rng() < 0.15
    
    // Furnished status based on type and price
    let furnished = false
    if (!isRental && (t.type === 'apartment' || t.type === 'villa' || t.type === 'townhouse')) {
      const furnishProbability = 0.15 + (price / 50000000) * 0.2
      furnished = rng() < Math.min(0.5, furnishProbability)
    }
    
    // Add listing age variation (fresh vs older listings)
    const daysAgo = randInt(rng, 0, 30)
    const listedHours = randInt(rng, 8, 18)
    const listedMinutes = randInt(rng, 0, 59)
    const listingDate = new Date()
    listingDate.setDate(listingDate.getDate() - daysAgo)
    
    sightings.push({
      source: 'market-scanner',
      raw: {
        type: t.type,
        area: area.area,
        county: area.county,
        price,
        isRental,
        sqm,
        bedrooms: beds > 0 ? beds : undefined,
        bathrooms: bathrooms > 0 ? bathrooms : undefined,
        agency: agency.name,
        agentName: agent[0],
        agentPhone: agent[1],
        purpose,
        areaYield: area.yield,
        areaPpsm: area.ppsm,
        areaAcre: area.acre,
        areaInfrastructure: area.infrastructure,
        areaSecurity: area.security,
        areaSchools: area.schools,
        areaHealthcare: area.healthcare,
        typeAppreciation: t.appreciation,
        typeLiquidity: t.liquidity,
        typeRisk: t.risk,
        typeMaintenance: t.maintenance,
        offPlan,
        furnished,
        listingAge: daysAgo,
      },
      seed,
      firstSeenAt: new Date(listingDate.setHours(listedHours, listedMinutes, 0, 0)).toISOString(),
    })
  }
  return sightings
}

export default scanMarket;
