/**
 * Diaspora Hub store + tooling (Task 8-a).
 *
 * For Kenyans abroad (UK / US / UAE corridors) buying and managing property
 * back home: remote viewing slots with cross-timezone conversion, the
 * remote purchase journey, remittance cost comparison against the shared
 * FX anchor, and the Power-of-Attorney checklist.
 *
 * HONESTY: timezone math is exact (fixed EAT offset + IANA zones); every
 * money figure is an ESTIMATE-class demo model — the app-wide FX anchor
 * comes from finance.ts (single source of truth) and fee models are
 * "typical" shapes, clearly labelled in the UI as verify-with-your-provider.
 * Nothing here is legal, tax or remittance advice.
 *
 * State persists under 'keja:diaspora' via the shared store.
 */
import { FX_KES_PER_USD } from '@/lib/finance';
import { store, useStore } from '@/lib/store';

/** Storage key (the shared store prefixes 'keja:' → 'keja:diaspora'). */
export const DIASPORA_KEY = 'diaspora';

/* ------------------------------------------------------------------ */
/* Types + state                                                        */
/* ------------------------------------------------------------------ */

export interface ViewingSlot {
  id: string;
  date: string; // 'YYYY-MM-DD'
  timeEAT: string; // 'HH:mm' Nairobi time
  areas: string[];
  inspectorName: string;
  videoCallLink?: string;
  status: 'requested' | 'confirmed' | 'done';
}

export interface PoaProgress {
  taskIds: string[];
}

export interface RemitPlan {
  id: string;
  amountUsd: number;
  corridor: 'UK' | 'US' | 'UAE';
  frequency: 'once' | 'monthly';
  createdAt: string;
}

export type JourneyStepStatus = 'untouched' | 'next' | 'done';

export interface DiasporaState {
  slots: ViewingSlot[];
  poa: PoaProgress;
  journey: Record<string, JourneyStepStatus>;
  remitPlans: RemitPlan[];
}

export const EMPTY_DIASPORA: DiasporaState = {
  slots: [],
  poa: { taskIds: [] },
  journey: {},
  remitPlans: [],
};

/** React hook over the diaspora state (shared store + change events). */
export function useDiaspora() {
  return useStore<DiasporaState>(DIASPORA_KEY, EMPTY_DIASPORA);
}

/** Read the diaspora state outside React (AI engine / verification later). */
export function getDiaspora(): DiasporaState {
  return store.get<DiasporaState>(DIASPORA_KEY, EMPTY_DIASPORA);
}

/* ------------------------------------------------------------------ */
/* Timezone conversion (pure, exact)                                    */
/* ------------------------------------------------------------------ */

export interface DiasporaTimezone {
  label: string;
  iana: string;
}

export const diasporaTimezones: DiasporaTimezone[] = [
  { label: 'UK (GMT/BST)', iana: 'Europe/London' },
  { label: 'US East (ET)', iana: 'America/New_York' },
  { label: 'US West (PT)', iana: 'America/Los_Angeles' },
  { label: 'UAE (GST)', iana: 'Asia/Dubai' },
  { label: 'Nairobi (EAT)', iana: 'Africa/Nairobi' },
];

/** Africa/Nairobi is fixed UTC+3 (no DST) — safe to anchor arithmetically. */
const EAT_UTC_OFFSET_MINUTES = 180;
const MS_PER_DAY = 86_400_000;

/** 'YYYY-MM-DD' calendar key of a UTC instant, as seen in an IANA zone. */
function dayKeyInZone(utcMs: number, iana: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: iana,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(utcMs));
}

/**
 * Convert a Nairobi slot into a target zone's local 'HH:mm' label.
 * Cross-day slots get a '(+1 day)' / '(-1 day)' suffix so a diaspora buyer
 * never books the wrong calendar day. Pure — safe for tests and the engine.
 */
export function convertSlot(date: string, timeEAT: string, targetIana: string): string {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = timeEAT.split(':').map(Number);
  if ([y, mo, d, h, mi].some((n) => !Number.isFinite(n))) return '—';

  const eatUtcMs = Date.UTC(y, mo - 1, d, h, mi) - EAT_UTC_OFFSET_MINUTES * 60_000;
  const localTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: targetIana,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(eatUtcMs));

  const dayShift = Math.round(
    (Date.parse(dayKeyInZone(eatUtcMs, targetIana)) - Date.parse(date)) / MS_PER_DAY
  );
  if (dayShift === 1) return `${localTime} (+1 day)`;
  if (dayShift === -1) return `${localTime} (-1 day)`;
  return localTime;
}

/* ------------------------------------------------------------------ */
/* Remittance cost models (ESTIMATE class)                              */
/* ------------------------------------------------------------------ */

export type RemitCorridor = 'UK' | 'US' | 'UAE';

export interface RemitChannelModel {
  id: 'bank' | 'specialist' | 'crypto';
  label: string;
  pctFee: number; // share of the amount
  fixedFeeUsd: number;
}

/** Typical fee shapes — ESTIMATE; the UI says "verify with your provider". */
export const REMIT_CHANNEL_MODELS: RemitChannelModel[] = [
  { id: 'bank', label: 'Bank wire', pctFee: 0.025, fixedFeeUsd: 25 },
  { id: 'specialist', label: 'FX specialist', pctFee: 0.01, fixedFeeUsd: 5 },
  { id: 'crypto', label: 'Stablecoin transfer', pctFee: 0.008, fixedFeeUsd: 3 },
];

export interface RemitQuote {
  channel: RemitChannelModel;
  corridor: RemitCorridor;
  feeUsd: number;
  netUsd: number;
  netKes: number;
  /** Reference anchor (FX_KES_PER_USD from finance.ts) — ESTIMATE. */
  fxKesPerUsd: number;
}

/**
 * Cost comparison across the three channel models, ranked best-net-first.
 * The corridor is carried on each quote (fee shapes are corridor-agnostic
 * in this demo; the UI labels everything as typical models).
 */
export function compareRemitChannels(amountUsd: number, corridor: RemitCorridor): RemitQuote[] {
  const fx = FX_KES_PER_USD;
  const quotes = REMIT_CHANNEL_MODELS.map((channel) => {
    const feeUsd = amountUsd * channel.pctFee + channel.fixedFeeUsd;
    const netUsd = Math.max(0, amountUsd - feeUsd);
    return { channel, corridor, feeUsd, netUsd, netKes: netUsd * fx, fxKesPerUsd: fx };
  });
  return quotes.sort((a, b) => b.netKes - a.netKes);
}

export interface CorridorFx {
  corridor: RemitCorridor;
  currency: string;
  kesPerUnit: number;
  basis: string;
}

/**
 * Static demo corridor table, all derived from the app-wide FX anchor so
 * there is one source of truth. Cross rates are stated assumptions —
 * ESTIMATE, verify with your provider at transfer time.
 */
export const CORRIDOR_FX_DEMO: CorridorFx[] = [
  {
    corridor: 'US',
    currency: 'USD',
    kesPerUnit: FX_KES_PER_USD,
    basis: 'FX_KES_PER_USD anchor (finance.ts)',
  },
  {
    corridor: 'UK',
    currency: 'GBP',
    kesPerUnit: Math.round(FX_KES_PER_USD * 1.27),
    basis: 'anchor × 1.27 GBP/USD (assumed cross)',
  },
  {
    corridor: 'UAE',
    currency: 'AED',
    kesPerUnit: Math.round((FX_KES_PER_USD / 3.6725) * 10) / 10,
    basis: 'anchor ÷ 3.6725 USD/AED peg (assumed)',
  },
];

/* ------------------------------------------------------------------ */
/* Power of Attorney checklist                                          */
/* ------------------------------------------------------------------ */

export interface PoaTask {
  id: string;
  label: string;
  hint: string;
}

/** The nine embassy-to-registry steps for a diaspora PoA. */
export const POA_TASKS: PoaTask[] = [
  {
    id: 'poa-embassy-appt',
    label: 'Embassy appointment booked',
    hint: 'Kenyan embassies and consulates notarise PoAs by appointment — book early, slots can fill weeks out.',
  },
  {
    id: 'poa-id-passport',
    label: 'ID + passport copies',
    hint: 'Certified copies of your Kenyan ID (or alien certificate) and passport — take originals to the appointment.',
  },
  {
    id: 'poa-kra-pin',
    label: 'KRA PIN',
    hint: 'Your KRA PIN (and your lawyer\u2019s) is needed for land-registry filings — print the KRA certificate if you can.',
  },
  {
    id: 'poa-signature',
    label: 'Specimen signature',
    hint: 'Sign exactly as your ID shows — signature mismatches are the most common cause of rejection at the registry.',
  },
  {
    id: 'poa-land-schedule',
    label: 'Land details schedule',
    hint: 'Attach the parcel (LR) number, approximate area and registry map reference so the PoA is scoped to one property.',
  },
  {
    id: 'poa-witness',
    label: 'Witness requirements',
    hint: 'Confirm how many witnesses the embassy requires and whether they must be unrelated to you.',
  },
  {
    id: 'poa-notary-fee',
    label: 'Notarisation fee',
    hint: 'Budget the embassy notarisation fee per document and confirm the current figure when booking — fees change.',
  },
  {
    id: 'poa-courier',
    label: 'Courier to Kenya',
    hint: 'Send the notarised original (not a scan) by tracked courier to your lawyer — registries want originals.',
  },
  {
    id: 'poa-lawyer-registration',
    label: 'Lawyer registration at lands registry',
    hint: 'Your lawyer registers the PoA so it is recognised in future filings, and keeps the original in safe custody.',
  },
];

/** Checklist progress 0–100, counting only known task ids. */
export function poaProgressPct(taskIds: string[]): number {
  if (POA_TASKS.length === 0) return 0;
  const done = POA_TASKS.filter((t) => taskIds.includes(t.id)).length;
  return Math.round((done / POA_TASKS.length) * 100);
}

/* ------------------------------------------------------------------ */
/* Journey status cycle                                                 */
/* ------------------------------------------------------------------ */

/** Toggle order for a purchase-journey step: untouched → next → done. */
export function nextJourneyStatus(status: JourneyStepStatus): JourneyStepStatus {
  if (status === 'untouched') return 'next';
  if (status === 'next') return 'done';
  return 'untouched';
}
