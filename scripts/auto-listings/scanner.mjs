/**
 * Keja Auto-Pilot — AI market scanner.
 *
 * Generates realistic new postings from market signals: area economics, type
 * mix, demand weighting and price-band discipline. Deterministic per
 * (runDate, sequence) — the same seed always produces the same listing, so
 * builds are reproducible. This is "source 0" of the multi-source pipeline;
 * partner feeds (JSON/CSV/XML) are the other sources.
 */
import { AREAS, TYPES, AGENCIES, makeRng, hashString, randInt, pick } from './market.mjs'

/** Demand-weighted area choice. */
function chooseArea(rng) {
  const weights = AREAS.map((a) => a.demand)
  const total = weights.reduce((x, y) => x + y, 0)
  let r = rng() * total
  for (let i = 0; i < AREAS.length; i++) {
    r -= weights[i]
    if (r <= 0) return AREAS[i]
  }
  return AREAS[0]
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
 * Scan the market for `count` new postings.
 * Each posting is a raw "sighting" — enrichment happens downstream.
 */
export function scanMarket({ runDate, count = 4, sequence = 0 }) {
  const sightings = []
  for (let i = 0; i < count; i++) {
    const seed = hashString(`${runDate}:scanner:${sequence}:${i}`)
    const rng = makeRng(seed)
    const area = chooseArea(rng)
    const t = chooseType(rng)
    const agency = pick(rng, AGENCIES)
    const agent = pick(rng, agency.agents)

    // Bedrooms first, then a size consistent with them (a 100sqm 1-BR or a
    // 45sqm 4-BR are instant credibility killers).
    const beds = t.beds[1] > 0 ? randInt(rng, t.beds[0], t.beds[1]) : 0
    let sqm
    if (beds === 0) {
      sqm = randInt(rng, t.sqm[0], t.sqm[1])
    } else if (beds <= 1) {
      sqm = randInt(rng, 38, 75)
    } else if (beds === 2) {
      sqm = randInt(rng, 60, 110)
    } else if (beds === 3) {
      sqm = randInt(rng, 95, 160)
    } else {
      sqm = randInt(rng, 150, t.sqm[1])
    }
    let price
    if (t.type === 'land') {
      const acres = Math.round((sqm / 4047) * 10) / 10
      let perAcre = area.acre[0] + rng() * (area.acre[1] - area.acre[0])
      const bias = rng()
      if (bias < 0.12) perAcre *= 0.82 + rng() * 0.08
      else if (bias > 0.92) perAcre *= 1.1 + rng() * 0.1
      price = Math.round((acres * perAcre * 1_000_000) / 50000) * 50000
    } else {
      let ppsm = area.ppsm[0] + rng() * (area.ppsm[1] - area.ppsm[0])
      const bias = rng()
      if (bias < 0.12) ppsm *= 0.82 + rng() * 0.08 // quick sale
      else if (bias > 0.92) ppsm *= 1.1 + rng() * 0.1 // premium finish
      price = Math.round((sqm * ppsm) / 50000) * 50000
    }
    if (price < 50000) price = 50000

    // Rentals: small apartments only (1–2BR) — family units are sold, not rented
    const isRental = t.type === 'apartment' && beds <= 2 && rng() < 0.35
    if (isRental) {
      const rent = Math.round((price * (area.yield / 100)) / 12 / 5000) * 5000
      price = Math.max(25000, rent)
    }

    const purpose = isRental ? ['rent'] : rng() < 0.55 ? ['buy', 'invest'] : ['buy']

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
        bathrooms: t.baths[1] > 0 ? randInt(rng, t.baths[0], Math.max(t.baths[0], 2)) : undefined,
        agency: agency.name,
        agentName: agent[0],
        agentPhone: agent[1],
        purpose,
        areaYield: area.yield,
        areaPpsm: area.ppsm,
        areaAcre: area.acre,
        offPlan: rng() < 0.15,
        furnished: !isRental && t.type === 'apartment' && rng() < 0.2,
      },
      seed,
      firstSeenAt: new Date(`${runDate}T0${randInt(rng, 1, 9)}:${String(randInt(rng, 10, 59))}:00Z`).toISOString(),
    })
  }
  return sightings
}
