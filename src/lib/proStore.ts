/**
 * KEJA PRO — agent workspace state: CMA reports, generated listing drafts and
 * viewing schedules.
 *
 * Client-side only (localStorage under 'keja:pro', 'keja-store-change' event)
 * — everything an agent creates here stays on this device, honestly labelled
 * as a demo workspace. The pure engine functions (findCmaComps, buildCma,
 * generateListingCopy, upcomingViewings) are exported for unit tests and the UI.
 */
import type { Property } from '@/data/properties';
import { isRentalPrice } from '@/lib/finance';
import { useStore } from '@/lib/store';
import { newId } from '@/lib/uuid';

export type ProSubjectType =
  'apartment' | 'villa' | 'townhouse' | 'bungalow' | 'land' | 'commercial';

export type ListingTone = 'professional' | 'warm' | 'luxury' | 'diaspora';

export interface CmaReport {
  id: string;
  createdAt: string;
  subjectArea: string;
  subjectType: ProSubjectType;
  subjectBeds?: number;
  subjectSizeSqM?: number;
  compIds: string[];
  lowKes: number;
  medianKes: number;
  highKes: number;
  pricePerSqMKes?: number;
  label: string;
}

export interface GeneratedListing {
  id: string;
  createdAt: string;
  listingTitle: string;
  description: string;
  highlights: string[];
  inputs: {
    type: string;
    area: string;
    beds: number;
    features: string[];
    tone: ListingTone;
  };
}

export interface Viewing {
  id: string;
  propertyId: string;
  leadName: string;
  scheduledFor: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  note?: string;
}

export interface ProState {
  cmas: CmaReport[];
  listings: GeneratedListing[];
  viewings: Viewing[];
}

/** Storage suffix — persisted as localStorage 'keja:pro' via the shared store. */
export const PRO_KEY = 'pro';

const EMPTY_PRO_STATE: ProState = { cmas: [], listings: [], viewings: [] };

export function useProStore(): [ProState, (v: ProState | ((prev: ProState) => ProState)) => void] {
  return useStore<ProState>(PRO_KEY, EMPTY_PRO_STATE);
}

/** Collision-safe id for records created on this device. */
export function newProId(prefix: string): string {
  return newId(prefix);
}

/* ------------------------------------------------------------------ */
/* CMA — comparables-based market analysis (all figures are ESTIMATES) */
/* ------------------------------------------------------------------ */

export interface CmaSubject {
  area: string;
  type: ProSubjectType;
  beds?: number;
  sizeSqM?: number;
}

export interface CmaComputation {
  compCount: number;
  compIds: string[];
  lowKes: number;
  medianKes: number;
  highKes: number;
  pricePerSqMKes?: number;
}

/** Indicative band width around the comp price median. */
const CMA_BAND_PCT = 0.15;

/** Sale comps only — rentals (monthly pricing) and price-on-application
 *  listings would corrupt a price band, so they never enter CMA math. */
function isSaleComp(p: Property): boolean {
  return p.price > 0 && !isRentalPrice(p.price);
}

/** Comps for a subject: same area + type, sale-priced, most trusted first. */
export function findCmaComps(inventory: Property[], subject: CmaSubject): Property[] {
  return inventory
    .filter((p) => p.area === subject.area && p.type === subject.type && isSaleComp(p))
    .sort((a, b) => b.trustScore - a.trustScore);
}

/**
 * Band math from comps. Bedroom tolerance: comps within ±1 bedroom of the
 * subject when both declare bedrooms (land/commercial comps carry none, so
 * they are never dropped by the bedroom filter). Rounds to KES 1,000.
 */
export function buildCma(comps: Property[], subject: CmaSubject): CmaComputation {
  const eligible = comps.filter((p) => {
    if (!isSaleComp(p)) return false;
    if (subject.beds === undefined || p.bedrooms === undefined) return true;
    return Math.abs(p.bedrooms - subject.beds) <= 1;
  });

  if (eligible.length === 0) {
    return { compCount: 0, compIds: [], lowKes: 0, medianKes: 0, highKes: 0 };
  }

  const priceMedian = median(eligible.map((p) => p.price));
  const psqmValues = eligible.filter((p) => p.sizeSqm > 0).map((p) => p.price / p.sizeSqm);

  return {
    compCount: eligible.length,
    compIds: eligible.map((p) => p.id),
    lowKes: roundTo(priceMedian * (1 - CMA_BAND_PCT), 1_000),
    medianKes: roundTo(priceMedian, 1_000),
    highKes: roundTo(priceMedian * (1 + CMA_BAND_PCT), 1_000),
    pricePerSqMKes: psqmValues.length > 0 ? roundTo(median(psqmValues), 1_000) : undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Listing writer — deterministic grammar-based copy (no LLM call)     */
/* ------------------------------------------------------------------ */

export interface ListingInputs {
  type: string;
  area: string;
  beds: number;
  features: string[];
  tone: ListingTone;
}

export interface ListingCopy {
  title: string;
  description: string;
  highlights: string[];
}

/** Feature chips offered by the writer — the grammar map is keyed to these. */
export const FEATURE_OPTIONS: string[] = [
  'backup power',
  'borehole',
  'gym',
  'pool',
  'garden',
  'DSQ',
  'solar',
  'gated',
  'parking',
];

const FEATURE_PHRASES: Record<string, string> = {
  'backup power': 'Backup power keeps the lights on and essentials running through any grid outage',
  borehole: 'A borehole on site insulates the household from water rationing schedules',
  gym: 'The on-site gym turns a workout into a two-minute commute',
  pool: 'The swimming pool anchors weekend relaxation without leaving the compound',
  garden: 'A private garden gives children and pets safe room to play outdoors',
  DSQ: 'A dedicated servants quarter (DSQ) adds live-in help without sacrificing family privacy',
  solar: 'Solar panels trim monthly electricity bills and keep essentials powered through outages',
  gated: 'Gated access with controlled entry keeps the compound quiet, secure and child-friendly',
  parking: 'Generous parking serves the household and guests without the daily scramble',
};

const TITLE_PREFIX: Record<ListingTone, string> = {
  professional: 'Move-In-Ready',
  warm: 'Family-Ready',
  luxury: 'Exceptional',
  diaspora: 'Diaspora-Friendly',
};

const OPENING: Record<ListingTone, (i: ListingInputs) => string> = {
  professional: (i) =>
    `Presenting a ${i.beds}-bedroom ${i.type} in ${i.area}, configured for comfortable day-to-day living and pragmatic, well-documented ownership.`,
  warm: (i) =>
    `This ${i.beds}-bedroom ${i.type} in ${i.area} was made for slow Sunday breakfasts, homework around the kitchen table, and a home that simply works.`,
  luxury: (i) =>
    `An address that speaks quietly but carries weight — a ${i.beds}-bedroom ${i.type} in ${i.area}, finished and positioned for buyers who notice the difference.`,
  diaspora: (i) =>
    `Own at a distance with confidence: this ${i.beds}-bedroom ${i.type} in ${i.area} is the kind of home that lets you land, view once, and stop worrying.`,
};

const CLOSING: Record<ListingTone, string> = {
  professional:
    'Viewings are by appointment. Ask for the Keja trust report on this listing before you commit — the evidence chain is the product.',
  warm: 'Come round and imagine your Saturdays here. Book a viewing through Keja and walk every room before you decide.',
  luxury:
    'Private viewings can be arranged through Keja. Serious enquiries are welcomed, and handled discreetly.',
  diaspora:
    'Book a video viewing through Keja from wherever you are, then decide with the full evidence pack in hand.',
};

function cap(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Deterministic grammar generator: same inputs always produce the same draft
 * (three paragraphs — tone opening, feature/area body, tone CTA — plus a
 * suggested title and exactly four highlights). No network, no LLM.
 */
export function generateListingCopy(inputs: ListingInputs): ListingCopy {
  const { type, area, beds, features, tone } = inputs;

  const title = `${TITLE_PREFIX[tone]} ${beds}-Bedroom ${cap(type)} in ${area}`;

  const bodyParts = [
    `${area} is an established address with schools, shopping and daily amenities within practical reach.`,
    ...features.map(
      (f) => `${FEATURE_PHRASES[f] ?? `${cap(f)} included as declared by the seller`}.`
    ),
  ];

  const description = [OPENING[tone](inputs), bodyParts.join(' '), CLOSING[tone]].join('\n\n');

  const highlights = [`${beds} bedrooms`];
  for (const f of features.slice(0, 3)) highlights.push(cap(f));
  const fillers = [
    `${cap(type)} in ${area}`,
    'Viewings by appointment',
    'Ready to publish via the Keja listing wizard',
  ];
  for (const filler of fillers) {
    if (highlights.length >= 4) break;
    highlights.push(filler);
  }

  return { title, description, highlights: highlights.slice(0, 4) };
}

/* ------------------------------------------------------------------ */
/* Viewings                                                            */
/* ------------------------------------------------------------------ */

/** Scheduled viewings from now onwards, soonest first. */
export function upcomingViewings(viewings: Viewing[], now: Date = new Date()): Viewing[] {
  const nowMs = now.getTime();
  return viewings
    .filter((v) => v.status === 'scheduled' && new Date(v.scheduledFor).getTime() >= nowMs)
    .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
}

/* ------------------------------------------------------------------ */
/* local math helpers                                                  */
/* ------------------------------------------------------------------ */

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Round to a step (KES 1,000 for CMA figures — honest, not false-precision). */
function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}
