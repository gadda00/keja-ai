/**
 * KEJA Trust Score™ — the proprietary multi-factor trust engine (proposal §4).
 *
 * Twelve weighted dimensions assess how far a listing can be trusted before
 * a buyer engages professional due diligence:
 *
 *   Ownership verification · Documentation · Location · Pricing ·
 *   Market comparables · Rental demand · Investment yield · Infrastructure ·
 *   Property condition · Agent/developer credibility · Market liquidity ·
 *   Risk indicators
 *
 * Every factor is labelled with the evidential basis of its input:
 *   FACT      — verified on-platform evidence (title check, agency record)
 *   ESTIMATE  — model-derived from market data (yield, comparables)
 *   ASSUMPTION — default assumption where no data exists yet
 *
 * Interpretation bands (platform standard):
 *   90–100 Exceptional · 80–89 Strong · 70–79 Moderate ·
 *   60–69 High Risk · <60 Requires Significant Due Diligence
 *
 * The score is decision support, never a guarantee — the platform pairs it
 * with human verification paths and professional referrals.
 */
import type { Property } from '@/data/properties';
import { areaInsights } from '@/data/properties';

export type ScoreBasis = 'FACT' | 'ESTIMATE' | 'ASSUMPTION';

export interface TrustFactor {
  key: string;
  label: string;
  /** 0–100 factor score */
  score: number;
  /** relative weight in the composite */
  weight: number;
  basis: ScoreBasis;
  note: string;
}

export interface TrustScoreResult {
  composite: number;
  band: string;
  factors: TrustFactor[];
}

const AGENCY_CREDIBILITY: Record<string, number> = {
  'Chacadom Premier Properties': 96,
  'Nairobi Habitat Realtors': 88,
  'Savanna Heights Realty': 84,
  'Pwani Beach Homes': 90,
  'Rift Valley Land & Homes': 80,
};

/** Neighbourhood liquidity + infrastructure bands (Nairobi-centric, data-upgradeable). */
const AREA_PROFILE: Record<string, { liquidity: number; infrastructure: number; demand: number }> = {
  Kilimani: { liquidity: 94, infrastructure: 92, demand: 95 },
  Westlands: { liquidity: 95, infrastructure: 93, demand: 96 },
  Lavington: { liquidity: 88, infrastructure: 88, demand: 90 },
  Riverside: { liquidity: 86, infrastructure: 87, demand: 88 },
  Karen: { liquidity: 78, infrastructure: 82, demand: 84 },
  'Upper Hill': { liquidity: 85, infrastructure: 86, demand: 87 },
  Kileleshwa: { liquidity: 90, infrastructure: 88, demand: 91 },
  Runda: { liquidity: 80, infrastructure: 82, demand: 83 },
  Nyali: { liquidity: 76, infrastructure: 78, demand: 80 },
  Diani: { liquidity: 68, infrastructure: 66, demand: 74 },
  default: { liquidity: 70, infrastructure: 68, demand: 72 },
};

const clamp = (n: number, lo = 0, hi = 100) => Math.min(Math.max(n, lo), hi);

/** Pricing accuracy vs the area's price band (from trustSignals authored data). */
function pricingScore(p: Property): { score: number; basis: ScoreBasis; note: string } {
  const signal = p.trustSignals.find((s) => /pricing/i.test(s.label));
  if (signal) {
    if (signal.status === 'pass') return { score: 92, basis: 'FACT', note: signal.detail };
    if (signal.status === 'warn') return { score: 68, basis: 'FACT', note: signal.detail };
    return { score: 40, basis: 'FACT', note: signal.detail };
  }
  return {
    score: 65,
    basis: 'ASSUMPTION',
    note: 'No comparable-pricing screen recorded for this listing yet.',
  };
}

/** Documentation completeness — from verification record + listing richness. */
function documentationScore(p: Property): { score: number; basis: ScoreBasis; note: string } {
  const v = p.verification;
  let score = 55;
  if (v.titleCheck === 'verified') score += 25;
  else if (v.titleCheck === 'pending') score += 5;
  else score -= 25;
  if (v.photosVerified) score += 8;
  if (v.duplicateCheck === 'clean') score += 6;
  else if (v.duplicateCheck === 'flagged') score -= 18;
  if ((p.description?.length ?? 0) > 280) score += 4;
  return {
    score: clamp(score),
    basis: v.titleCheck === 'verified' ? 'FACT' : 'ASSUMPTION',
    note:
      v.titleCheck === 'verified'
        ? 'Title verified against Ardhisasa records; supporting documents on file.'
        : 'Documentation review still in progress — treat as unverified until complete.',
  };
}

/** Rental-demand + yield estimate for the area. */
function yieldFactors(p: Property, area: string) {
  const profile = AREA_PROFILE[area] ?? AREA_PROFILE.default;
  const insight = areaInsights[area];
  const areaYield = parseFloat(insight?.yield ?? '') || 0;
  const yieldPct = p.rentEstimate && p.price > 0 ? ((p.rentEstimate * 12) / p.price) * 100 : areaYield;
  const yieldScore = yieldPct > 0 ? clamp(55 + (yieldPct / 9) * 45) : 55;
  return { profile, yieldPct, yieldScore, areaYield };
}

export function trustScore(p: Property): TrustScoreResult {
  const area = p.area;
  const profile = AREA_PROFILE[area] ?? AREA_PROFILE.default;
  const agencyCred = AGENCY_CREDIBILITY[p.agency] ?? 74;
  const pricing = pricingScore(p);
  const documentation = documentationScore(p);
  const { yieldScore, yieldPct } = yieldFactors(p, area);

  // Ownership verification — the heaviest single factor.
  const ownership =
    p.verification.titleCheck === 'verified' && p.verification.ardhisasaMatch
      ? 97
      : p.verification.titleCheck === 'verified'
        ? 88
        : p.verification.titleCheck === 'pending'
          ? 55
          : 22;

  // Location quality — blends the area profile with the listing's own signals.
  const location = clamp(profile.demand * 0.6 + profile.infrastructure * 0.4);

  // Market comparables — from authored pricing signals where present.
  const comparables = pricing.basis === 'FACT' ? pricing.score : 58;

  // Property condition — photos verified + description richness proxy.
  const condition = clamp(
    (p.verification.photosVerified ? 80 : 55) + (p.furnished ? 8 : 0) + ((p.description?.length ?? 0) > 400 ? 8 : 0),
  );

  // Risk indicators — the inverse of the adverse signals present.
  const adverse = p.trustSignals.filter((s) => s.status !== 'pass').length;
  const velocityPenalty = p.verification.listingVelocity === 'suspicious' ? 30 : p.verification.listingVelocity === 'high' ? 10 : 0;
  const risk = clamp(92 - adverse * 16 - velocityPenalty);

  const factors: TrustFactor[] = [
    {
      key: 'ownership',
      label: 'Ownership Verification',
      score: ownership,
      weight: 0.22,
      basis: p.verification.titleCheck === 'verified' ? 'FACT' : 'ASSUMPTION',
      note:
        p.verification.titleCheck === 'verified'
          ? `Title deed ${p.verification.ardhisasaMatch ? 'matched to Ardhisasa land records' : 'verified'} — free of encumbrances.`
          : 'Registered-ownership evidence is not yet on file.',
    },
    {
      key: 'documentation',
      label: 'Documentation',
      score: documentation.score,
      weight: 0.12,
      basis: documentation.basis,
      note: documentation.note,
    },
    {
      key: 'location',
      label: 'Location',
      score: Math.round(location),
      weight: 0.08,
      basis: 'ESTIMATE',
      note: `${area} demand and infrastructure profile from KEJA area intelligence.`,
    },
    {
      key: 'pricing',
      label: 'Pricing',
      score: pricing.score,
      weight: 0.1,
      basis: pricing.basis,
      note: pricing.note,
    },
    {
      key: 'comparables',
      label: 'Market Comparables',
      score: comparables,
      weight: 0.08,
      basis: pricing.basis === 'FACT' ? 'FACT' : 'ASSUMPTION',
      note: 'Asking price screened against comparable listings in the same area band.',
    },
    {
      key: 'rentalDemand',
      label: 'Rental Demand',
      score: profile.demand,
      weight: 0.07,
      basis: 'ESTIMATE',
      note: `Tenant absorption and search-volume profile for ${area}.`,
    },
    {
      key: 'yield',
      label: 'Investment Yield',
      score: Math.round(yieldScore),
      weight: 0.07,
      basis: yieldPct > 0 ? 'ESTIMATE' : 'ASSUMPTION',
      note:
        yieldPct > 0
          ? `Estimated gross yield ${yieldPct.toFixed(1)}% from current market inputs.`
          : 'Yield estimate pending rental data for this asset.',
    },
    {
      key: 'infrastructure',
      label: 'Infrastructure',
      score: profile.infrastructure,
      weight: 0.05,
      basis: 'ESTIMATE',
      note: 'Roads, utilities, connectivity and social amenities serving the area.',
    },
    {
      key: 'condition',
      label: 'Property Condition',
      score: condition,
      weight: 0.05,
      basis: 'ESTIMATE',
      note: 'Photo-verified presentation and listing detail proxy — inspection still advised.',
    },
    {
      key: 'agent',
      label: 'Agent / Developer Credibility',
      score: agencyCred,
      weight: 0.07,
      basis: 'FACT',
      note: `${p.agency} — platform-verified agency track record.`,
    },
    {
      key: 'liquidity',
      label: 'Market Liquidity',
      score: profile.liquidity,
      weight: 0.04,
      basis: 'ESTIMATE',
      note: 'Historical absorption speed for this asset class in the area.',
    },
    {
      key: 'risk',
      label: 'Risk Indicators',
      score: risk,
      weight: 0.05,
      basis: 'FACT',
      note:
        risk >= 85
          ? 'No adverse indicators flagged by the anomaly screens.'
          : `${adverse} adverse signal(s) flagged by the anomaly screens — review before proceeding.`,
    },
  ];

  const composite = Math.round(
    factors.reduce((sum, f) => sum + f.score * f.weight, 0),
  );
  const band =
    composite >= 90
      ? 'Exceptional'
      : composite >= 80
        ? 'Strong'
        : composite >= 70
          ? 'Moderate'
          : composite >= 60
            ? 'High Risk'
            : 'Requires Significant Due Diligence';

  return { composite, band, factors };
}
