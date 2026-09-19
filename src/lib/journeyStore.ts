/**
 * The guided purchase path (wave 20) — the Buyers & Sellers portal promise,
 * finally a product surface.
 *
 * Ask Keja has always *described* the nine-step Keja buying flow in chat;
 * the account page now walks it: one persistent checklist per buyer, each
 * step linking to the exact surface that does that job. Pure catalogue +
 * progress helpers (mirrors the diaspora journey pattern, which already
 * proved the shape) — the store persists through the validated-store seam.
 */
import { useCallback } from 'react';
import { z } from 'zod';
import { useValidatedStore, KEYS } from '@/lib/store';

/** Journey state schema: a map of known step ids → booleans, junk keys dropped. */
export const journeyShape = z.record(z.string(), z.boolean());

export interface BuyingStep {
  id: string;
  label: string;
  hint: string;
  /** Where the platform does this step. */
  to: string;
  /** Action verb for the CTA. */
  action: string;
}

/** The nine-step Keja buying flow — the same steps Ask Keja teaches,
 *  each wired to the tool that does the job. */
export const BUYING_STEPS: BuyingStep[] = [
  {
    id: 'discover',
    label: 'Discover verified stock',
    hint: 'Browse trust-scored listings only — every card carries the twelve-factor Trust Score and its evidence.',
    to: '/properties',
    action: 'Open discovery',
  },
  {
    id: 'qualify',
    label: 'Qualify your budget honestly',
    hint: 'Affordability math the CBK way: instalment ≤ 33% of net income, deposit and the Kenyan buyer cost stack included.',
    to: '/finance',
    action: 'Run affordability',
  },
  {
    id: 'shortlist',
    label: 'Shortlist with Keja AI',
    hint: 'Tell the advisor your brief — budget, area, purpose — and save the matches it recommends.',
    to: '/ask',
    action: 'Ask Keja AI',
  },
  {
    id: 'analyse',
    label: 'Analyse before you visit',
    hint: 'Yields, ROI, 5/10-year projections and risk flags on the shortlist — the Deal Analyst reads every listing.',
    to: '/deal-analyst',
    action: 'Open Deal Analyst',
  },
  {
    id: 'screen-price',
    label: 'Screen the price',
    hint: 'Pricing Intelligence on every listing detail: where the asking sits against live comparables — negotiate with evidence.',
    to: '/properties',
    action: 'Review saved homes',
  },
  {
    id: 'view',
    label: 'View and verify in person',
    hint: 'Escorted viewing through the listing agency — book from the listing page, check the passport evidence first.',
    to: '/properties',
    action: 'Book viewings',
  },
  {
    id: 'legal',
    label: 'Lawyer-led due diligence',
    hint: 'Official land search, encumbrances, rates and zoning — every flagged item gets human review before money moves.',
    to: '/transact',
    action: 'See the transaction rails',
  },
  {
    id: 'deposit',
    label: 'Deposit in escrow',
    hint: 'Milestone-released only. On the live product the deposit sits in a regulated escrow; on trial, the rails are labelled.',
    to: '/transact',
    action: 'Understand the escrow',
  },
  {
    id: 'transfer',
    label: 'Transfer, stamp duty, keys',
    hint: 'Stamp duty (4% urban), registration at Ardhisasa, and the keys — with the passport updated to closed.',
    to: '/trust',
    action: 'Read the trust layer',
  },
];

/** Per-step completion map persisted at 'keja:buying-journey'. */
export type JourneyState = Record<string, boolean>;

export function journeyProgressPct(state: JourneyState): number {
  const done = BUYING_STEPS.filter((s) => state[s.id]).length;
  return Math.round((done / BUYING_STEPS.length) * 100);
}

/** First un-finished step — where "continue" should send the buyer. */
export function activeStep(state: JourneyState): BuyingStep {
  return BUYING_STEPS.find((s) => !state[s.id]) ?? BUYING_STEPS[BUYING_STEPS.length - 1];
}

export function useJourneyStore(): {
  state: JourneyState;
  toggle: (id: string) => void;
  reset: () => void;
  progressPct: number;
} {
  const [state, setState] = useValidatedStore<JourneyState>(KEYS.journey, journeyShape, {});
  const toggle = useCallback(
    (id: string) => setState((prev) => ({ ...prev, [id]: !prev[id] })),
    [setState],
  );
  const reset = useCallback(() => setState({}), [setState]);
  return { state, toggle, reset, progressPct: journeyProgressPct(state) };
}

