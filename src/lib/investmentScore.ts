/**
 * KEJA Investment Score™ — the transparent multi-factor framework from the
 * blueprint (Ch.7): rental potential, capital appreciation, location, demand,
 * price/value, liquidity and risk. Scores are decision-support tools, never
 * guarantees — the engine separates verified inputs from estimates.
 */
import type { Property } from '@/data/properties'

export interface ScoreFactor {
  key: string
  label: string
  score: number // 0–10
  basis: 'FACT' | 'ESTIMATE' | 'ASSUMPTION'
  note: string
}

export interface InvestmentScore {
  overall: number // 0–10, one decimal
  band: 'Exceptional' | 'Strong' | 'Solid' | 'Moderate' | 'Speculative'
  factors: ScoreFactor[]
}

/** Location demand bands (illustrative, Nairobi-centric, upgradeable to data). */
const LOCATION_SCORE: Record<string, number> = {
  Kilimani: 9.4,
  Westlands: 9.2,
  Lavington: 8.9,
  Riverside: 8.8,
  Karen: 8.4,
  'Upper Hill': 8.6,
  Kileleshwa: 8.7,
  Nyali: 8.3,
  Diani: 8.1,
  Runda: 8.5,
  default: 7.2,
}

export function investmentScore(p: Property): InvestmentScore {
  // 1 — Rental potential: gross yield vs 8% benchmark
  const grossYield = p.rentEstimate && p.price ? ((p.rentEstimate * 12) / p.price) * 100 : 0
  const rental = p.rentEstimate
    ? Math.max(3, Math.min(10, (grossYield / 8) * 8.5))
    : 5.5

  // 2 — Capital appreciation forecast (data-provided or 6% baseline)
  const appreciation = p.appreciationForecast ?? 6
  const growth = Math.max(3, Math.min(10, (appreciation / 9) * 9))

  // 3 — Location score from band table
  const location = LOCATION_SCORE[p.area] ?? LOCATION_SCORE.default

  // 4 — Demand proxy: views + trust score blend
  const demand = Math.max(3, Math.min(10, 4 + p.views / 120 + (p.trustScore - 80) / 10))

  // 5 — Price/value: price per sqm vs type norms
  const perSqm = p.sizeSqm > 0 ? p.price / p.sizeSqm : 0
  const typeNorm: Record<string, number> = {
    apartment: 120000,
    villa: 85000,
    townhouse: 95000,
    bungalow: 80000,
    land: 8000,
    commercial: 160000,
  }
  const norm = typeNorm[p.type] ?? 100000
  const value = perSqm > 0 ? Math.max(3, Math.min(10, 10 - Math.abs(perSqm / norm - 1) * 9)) : 6

  // 6 — Liquidity: apartments & hot areas turn over faster
  const liquidity =
    (p.type === 'apartment' ? 8.2 : p.type === 'villa' ? 6.8 : p.type === 'land' ? 5.2 : 7) *
    (LOCATION_SCORE[p.area] ? 1.02 : 0.94)

  // 7 — Risk: verification status & listing signals
  let risk = 8.5
  if (p.verification.titleCheck !== 'verified') risk -= 2
  if (p.verification.duplicateCheck !== 'clean') risk -= 1.5
  if (p.verification.listingVelocity === 'suspicious') risk -= 2
  if (p.offPlan) risk -= 1
  risk = Math.max(2, Math.min(10, risk))

  const factors: ScoreFactor[] = [
    {
      key: 'rental',
      label: 'Rental Potential',
      score: round1(rental),
      basis: p.rentEstimate ? 'FACT' : 'ASSUMPTION',
      note: p.rentEstimate
        ? `Gross yield ${grossYield.toFixed(1)}% (verified rent estimate)`
        : 'No verified rent data — benchmark assumption applied',
    },
    {
      key: 'growth',
      label: 'Capital Appreciation',
      score: round1(growth),
      basis: p.appreciationForecast ? 'ESTIMATE' : 'ASSUMPTION',
      note: `Forecast ${appreciation}% p.a. ${p.appreciationForecast ? '(model estimate)' : '(market baseline)'}`,
    },
    {
      key: 'location',
      label: 'Location',
      score: round1(location),
      basis: 'FACT',
      note: `${p.area}, ${p.county} — location intelligence band`,
    },
    {
      key: 'demand',
      label: 'Demand',
      score: round1(demand),
      basis: 'FACT',
      note: `${p.views} views · trust score ${p.trustScore}/100`,
    },
    {
      key: 'value',
      label: 'Price / Value',
      score: round1(value),
      basis: 'ESTIMATE',
      note: perSqm > 0 ? `KES ${Math.round(perSqm / 1000)}k/sqm vs ${p.type} norm` : 'Size data unavailable',
    },
    {
      key: 'liquidity',
      label: 'Liquidity',
      score: round1(Math.min(10, liquidity)),
      basis: 'ESTIMATE',
      note: `${p.type} resale depth in ${p.area}`,
    },
    {
      key: 'risk',
      label: 'Risk',
      score: round1(risk),
      basis: 'FACT',
      note: `Title ${p.verification.titleCheck}, duplicate check ${p.verification.duplicateCheck}`,
    },
  ]

  const weights: Record<string, number> = {
    rental: 0.22,
    growth: 0.18,
    location: 0.16,
    demand: 0.12,
    value: 0.14,
    liquidity: 0.08,
    risk: 0.10,
  }
  const overall = round1(
    factors.reduce((acc, f) => acc + f.score * weights[f.key], 0),
  )

  const band: InvestmentScore['band'] =
    overall >= 8.5 ? 'Exceptional' : overall >= 7.5 ? 'Strong' : overall >= 6.5 ? 'Solid' : overall >= 5.5 ? 'Moderate' : 'Speculative'

  return { overall, band, factors }
}

const round1 = (n: number) => Math.round(n * 10) / 10

export const scoreTone = (score: number) =>
  score >= 8.5
    ? { chip: 'bg-green-600 text-white', bar: 'bg-green-500' }
    : score >= 7.5
      ? { chip: 'bg-gold-gradient text-white', bar: 'bg-gold-500' }
      : score >= 6.5
        ? { chip: 'bg-gold-100 text-gold-800', bar: 'bg-gold-400' }
        : score >= 5.5
          ? { chip: 'bg-amber-100 text-amber-800', bar: 'bg-amber-500' }
          : { chip: 'bg-red-100 text-red-700', bar: 'bg-red-500' }
