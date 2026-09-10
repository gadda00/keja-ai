/**
 * Keja Tokenize — client-side state store (TRIAL MODE).
 * React context + localStorage persistence. Simulates the full loop:
 * KYC → purchase → ledger → portfolio → issuance → secondary trading →
 * distributions. No backend, no real chain, no real money.
 *
 * Trial mode (2026-09): every investor gets a virtual USD wallet funded
 * with trial credits; buys debit it, sales and distributions credit it; the
 * secondary market matches orders against a walking book (price impact);
 * LIVE properties accrue distributions on a virtual trial clock the user can
 * fast-forward so the full lifecycle is demonstrable in minutes.
 */
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type {
  Investment,
  Investor,
  LedgerTx,
  ReceivedDistribution,
  TokenizedProperty,
} from '@/data/tokenize';
import {
  DEMO_DISTRIBUTIONS,
  DEMO_INVESTMENTS,
  DEMO_INVESTOR,
  nextBlockNumber,
  randomHex,
  TOKENIZED_PROPERTIES,
} from '@/data/tokenize';

const STORAGE_KEY = 'keja-tokenize-v1';

/** Trial credits granted on first visit / after a reset. */
export const TRIAL_START_BALANCE_USD = 25_000;
/** Trial top-up chunk (clearly labelled in the UI). */
export const TRIAL_TOPUP_USD = 10_000;
/** One monthly distribution cycle on the trial clock. */
export const MONTH_CYCLE_MS = 30 * 24 * 60 * 60 * 1000;
/** One quarterly cycle on the trial clock. */
export const QUARTER_CYCLE_MS = 91 * 24 * 60 * 60 * 1000;

export type TokenizeView = 'marketplace' | 'property' | 'portfolio' | 'issuer' | 'learn' | 'market';

/** Executed secondary-market trade (trial). */
export interface Trade {
  id: string;
  propertyId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  tokens: number;
  avgPriceUsd: number;
  totalUsd: number;
  timestamp: string;
}

interface PersistedState {
  investor: Investor | null;
  investments: Investment[];
  ledger: LedgerTx[];
  customProperties: TokenizedProperty[];
  /** tokensSold deltas for seeded properties (index by property id) */
  soldDelta: Record<string, number>;
  receivedDistributions: ReceivedDistribution[];
  waitlist: string[];
  /* ----- trial mode state ----- */
  /** virtual USD wallet (trial credits; simulated money only) */
  walletUsd: number;
  /** live mid-price overrides after secondary trades (per property id) */
  marketPrices: Record<string, number>;
  /** executed secondary trades (trial) */
  trades: Trade[];
  /** virtual trial-clock offset from real time */
  clockOffsetMs: number;
  /** ISO timestamp of the last distribution accrual run */
  lastAccrual: string | null;
  /** lifecycle overrides: FUNDING sold out → FUNDED; issuer opens trading → LIVE */
  statusOverrides: Record<string, 'FUNDED' | 'LIVE'>;
  /** investor-count deltas (first purchase per property increments) */
  investorCountDelta: Record<string, number>;
  /** when the trial started (ISO) */
  trialStartedAt: string;
}

const EMPTY: PersistedState = {
  investor: null,
  investments: [],
  ledger: [],
  customProperties: [],
  soldDelta: {},
  receivedDistributions: [],
  waitlist: [],
  walletUsd: TRIAL_START_BALANCE_USD,
  marketPrices: {},
  trades: [],
  clockOffsetMs: 0,
  lastAccrual: null,
  statusOverrides: {},
  investorCountDelta: {},
  trialStartedAt: new Date().toISOString(),
};

function load(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return { ...EMPTY, ...parsed, walletUsd: parsed.walletUsd ?? TRIAL_START_BALANCE_USD };
  } catch {
    return EMPTY;
  }
}

export interface TokenizeStore {
  investor: Investor | null;
  properties: TokenizedProperty[];
  investments: Investment[];
  ledger: LedgerTx[];
  receivedDistributions: ReceivedDistribution[];
  waitlist: string[];

  view: TokenizeView;
  setView: (v: TokenizeView) => void;
  selectedPropertyId: string | null;
  openProperty: (id: string) => void;
  investPropertyId: string | null;
  openInvest: (id: string) => void;
  closeInvest: () => void;
  kycOpen: boolean;
  kycNextAction: 'invest' | 'portfolio' | null;
  openKyc: (nextAction: 'invest' | 'portfolio') => void;
  closeKyc: () => void;

  completeKyc: (form: KycForm) => Investor;
  buyTokens: (propertyId: string, tokenAmount: number) => BuyResult;
  sellTokens: (
    propertyId: string,
    tokenAmount: number,
    pricePerTokenUsd: number
  ) => { proceedsUsd: number; txHash: string; tokens: number };
  issueProperty: (draft: IssuerDraft) => IssueResult;
  loadDemoPortfolio: () => void;
  signOut: () => void;
  joinWaitlist: (propertyId: string) => void;

  /* ----- trial mode ----- */
  /** Virtual USD wallet balance (trial credits — simulated money). */
  walletUsd: number;
  /** Executed secondary trades (trial). */
  trades: Trade[];
  /** Virtual trial clock offset in ms. */
  clockOffsetMs: number;
  /** Effective "now" on the trial clock (real now + offset). */
  trialNowMs: number;
  /** Add a labelled chunk of trial credits. */
  topUpTrial: () => void;
  /** Buy on the secondary market against the ask side (walking book). */
  buySecondary: (propertyId: string, tokenAmount: number) => SecondaryTradeResult;
  /** Sell on the secondary market against the bid side (walking book). */
  sellSecondary: (propertyId: string, tokenAmount: number) => SecondaryTradeResult;
  /** Fast-forward the trial clock one distribution cycle, then accrue. */
  advanceTrialCycle: () => AccrualResult;
  /** Live mid price for a property (post-trade override or issuance price). */
  marketPrice: (propertyId: string) => number;
  /** Wipe everything and restart the trial with fresh credits. */
  resetTrial: () => void;
  /** Issuer action: open secondary trading on a fully-funded offering. */
  openTrading: (propertyId: string) => void;
}

export interface SecondaryTradeResult {
  tokens: number;
  avgPriceUsd: number;
  totalUsd: number;
  txHash: string;
  symbol: string;
  title: string;
  /** price the book moved to after the fill (market impact) */
  newMid: number;
}

export interface AccrualResult {
  cyclesAdvanced: number;
  creditedUsd: number;
  entries: ReceivedDistribution[];
}

export interface KycForm {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  idType: 'NATIONAL_ID' | 'PASSPORT';
  idNumber: string;
  sourceOfFunds: string;
}

export interface BuyResult {
  tokens: number;
  totalCostUsd: number;
  txHash: string;
  blockNumber: number;
  symbol: string;
  title: string;
  freq: string;
  firstDistributionHint: string;
  fundedPct: number;
}

export interface IssuerDraft {
  title: string;
  tagline: string;
  description: string;
  location: string;
  city: string;
  propertyType: TokenizedProperty['propertyType'];
  totalValueUsd: number;
  tokenPriceUsd: number;
  minTokens: number;
  annualNetIncomeUsd: number;
  distributionFreq: TokenizedProperty['distributionFreq'];
  appreciationPct: number;
  occupancyPct: number;
  managementFeePct: number;
  spvName: string;
  jurisdiction: string;
  highlights: string[];
}

export interface IssueResult {
  property: TokenizedProperty;
  txHash: string;
  blockNumber: number;
}

const Ctx = createContext<TokenizeStore | null>(null);

export function TokenizeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(() => load());
  const [view, setView] = useState<TokenizeView>('marketplace');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [investPropertyId, setInvestPropertyId] = useState<string | null>(null);
  const [kycOpen, setKycOpen] = useState(false);
  const [kycNextAction, setKycNextAction] = useState<'invest' | 'portfolio' | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full / private mode — ignore */
    }
  }, [state]);

  /** seeded properties with runtime sold deltas, lifecycle overrides,
   *  investor-count deltas + custom issued properties */
  const properties = useMemo<TokenizedProperty[]>(() => {
    const seeded = TOKENIZED_PROPERTIES.map((p) => {
      const sold = Math.min(p.totalTokens, p.tokensSold + (state.soldDelta[p.id] ?? 0));
      // Lifecycle: a FUNDING offering that sells out becomes FUNDED; an
      // explicit override (issuer "open trading") then promotes it to LIVE.
      let { status } = p;
      if (p.status === 'FUNDING' && sold >= p.totalTokens) status = 'FUNDED';
      const override = state.statusOverrides[p.id];
      if (override === 'LIVE') status = 'LIVE';
      return {
        ...p,
        tokensSold: sold,
        status,
        investorCount: p.investorCount + (state.investorCountDelta[p.id] ?? 0),
      };
    });
    const custom = state.customProperties.map((p) => {
      const override = state.statusOverrides[p.id];
      return override === 'LIVE' ? { ...p, status: 'LIVE' as const } : p;
    });
    return [...seeded, ...custom];
  }, [state.soldDelta, state.customProperties, state.statusOverrides, state.investorCountDelta]);

  const openProperty = useCallback((id: string) => {
    setSelectedPropertyId(id);
    setView('property');
  }, []);

  const openInvest = useCallback((id: string) => {
    setInvestPropertyId(id);
  }, []);

  const closeInvest = useCallback(() => setInvestPropertyId(null), []);

  const openKyc = useCallback((nextAction: 'invest' | 'portfolio') => {
    setKycNextAction(nextAction);
    setKycOpen(true);
  }, []);

  const closeKyc = useCallback(() => setKycOpen(false), []);

  const completeKyc = useCallback((form: KycForm): Investor => {
    const investor: Investor = {
      id: `inv-${Date.now().toString(36)}`,
      email: form.email,
      fullName: form.fullName,
      phone: form.phone,
      country: form.country,
      kycStatus: 'VERIFIED',
      walletAddress: randomHex(40),
    };
    setState((s) => ({ ...s, investor }));
    return investor;
  }, []);

  const buyTokens = useCallback(
    (propertyId: string, tokenAmount: number): BuyResult => {
      const p = properties.find((x) => x.id === propertyId);
      if (!p) throw new Error('Property not found');
      // Supply cap — offerings can never be oversold, whatever the UI allows.
      // NOTE: `properties` memo already folds `soldDelta` into `tokensSold`,
      // so applying the delta again here would double-count the user's own
      // purchases and understate availability. Use the memo value as-is.
      const sold = p.tokensSold;
      const available = Math.max(0, p.totalTokens - sold);
      if (tokenAmount <= 0) throw new Error('Enter a token amount');
      if (tokenAmount > available)
        throw new Error(
          `Only ${available.toLocaleString()} ${p.tokenSymbol} tokens remain — reduce your order`
        );
      const cost = tokenAmount * p.tokenPriceUsd;
      // Trial wallet: primary purchases pay from virtual trial credits.
      if (cost > state.walletUsd)
        throw new Error(
          `Trial wallet has $${Math.round(state.walletUsd).toLocaleString()} — this order costs $${Math.round(cost).toLocaleString()}. Top up trial credits or reduce the order.`
        );
      const txHash = randomHex(64);
      const blockNumber = nextBlockNumber();
      const now = new Date(Date.now() + state.clockOffsetMs).toISOString();
      const firstBuy = !state.investments.some((i) => i.propertyId === propertyId);

      const investment: Investment = {
        id: `inv-${Date.now().toString(36)}`,
        propertyId: p.id,
        tokenAmount,
        pricePerTokenUsd: p.tokenPriceUsd,
        totalCostUsd: cost,
        txHash,
        blockNumber,
        createdAt: now,
      };
      const ledgerTx: LedgerTx = {
        txHash,
        blockNumber,
        symbol: p.tokenSymbol,
        title: p.title,
        tokens: tokenAmount,
        totalCostUsd: cost,
        timestamp: now,
        type: 'PURCHASE',
      };

      setState((s) => ({
        ...s,
        investments: [investment, ...s.investments],
        ledger: [ledgerTx, ...s.ledger],
        walletUsd: s.walletUsd - cost,
        soldDelta: { ...s.soldDelta, [p.id]: (s.soldDelta[p.id] ?? 0) + tokenAmount },
        // first purchase on this offering counts a new investor
        investorCountDelta: firstBuy
          ? { ...s.investorCountDelta, [p.id]: (s.investorCountDelta[p.id] ?? 0) + 1 }
          : s.investorCountDelta,
      }));

      const newSold = sold + tokenAmount;
      const funded =
        p.totalTokens > 0 ? Math.min(100, Math.round((newSold / p.totalTokens) * 100)) : 0;
      const hint =
        p.status === 'LIVE'
          ? p.distributionFreq === 'MONTHLY'
            ? 'Your first distribution lands at the start of the next monthly cycle.'
            : 'Your first distribution lands at the start of the next quarterly cycle.'
          : `First distribution projected for Q1 2027 once the offering is fully funded (${Math.min(funded, 100)}% funded).`;

      return {
        tokens: tokenAmount,
        totalCostUsd: cost,
        txHash,
        blockNumber,
        symbol: p.tokenSymbol,
        title: p.title,
        freq: p.distributionFreq,
        firstDistributionHint: hint,
        fundedPct: funded,
      };
    },
    [properties, state.walletUsd, state.clockOffsetMs, state.investments]
  );

  const sellTokens = useCallback(
    (propertyId: string, tokenAmount: number, pricePerTokenUsd: number) => {
      const p = properties.find((x) => x.id === propertyId);
      if (!p) throw new Error('Property not found');
      const held = state.investments
        .filter((i) => i.propertyId === propertyId)
        .reduce((acc, i) => acc + i.tokenAmount, 0);
      if (tokenAmount <= 0 || tokenAmount > held) throw new Error('Insufficient tokens');
      const proceeds = tokenAmount * pricePerTokenUsd;
      const txHash = randomHex(64);
      const now = new Date(Date.now() + state.clockOffsetMs).toISOString();
      const ledgerTx: LedgerTx = {
        txHash,
        blockNumber: nextBlockNumber(),
        symbol: p.tokenSymbol,
        title: p.title,
        tokens: -tokenAmount,
        totalCostUsd: proceeds,
        timestamp: now,
        type: 'SALE',
      };
      setState((s) => {
        let remaining = tokenAmount;
        const investments = s.investments
          .filter((i) => i.propertyId === propertyId)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt)) // FIFO: oldest lots sell first
          .map((i) => {
            if (remaining <= 0) return i;
            const take = Math.min(i.tokenAmount, remaining);
            remaining -= take;
            return { ...i, tokenAmount: i.tokenAmount - take };
          })
          .filter((i) => i.tokenAmount > 0);
        return {
          ...s,
          investments,
          ledger: [ledgerTx, ...s.ledger],
          walletUsd: s.walletUsd + proceeds,
          soldDelta: {
            ...s.soldDelta,
            [propertyId]: Math.max(0, (s.soldDelta[propertyId] ?? 0) - tokenAmount),
          },
        };
      });
      return { proceedsUsd: proceeds, txHash, tokens: tokenAmount };
    },
    [properties, state.investments, state.clockOffsetMs]
  );

  const issueProperty = useCallback(
    (draft: IssuerDraft): IssueResult => {
      const existing = [...TOKENIZED_PROPERTIES, ...state.customProperties];
      const totalTokens =
        draft.tokenPriceUsd > 0 ? Math.round(draft.totalValueUsd / draft.tokenPriceUsd) : 0;
      const contractAddress = randomHex(40);
      const txHash = randomHex(64);
      const blockNumber = nextBlockNumber();
      const prop: TokenizedProperty = {
        id: `kj-custom-${Date.now().toString(36)}`,
        slug: draft.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
        title: draft.title,
        tagline: draft.tagline,
        description: draft.description,
        location: draft.location,
        city: draft.city,
        country: 'Kenya',
        propertyType: draft.propertyType,
        imageUrl: pickImage(draft.propertyType),
        totalValueUsd: draft.totalValueUsd,
        totalTokens,
        tokensSold: 0,
        tokenPriceUsd: draft.tokenPriceUsd,
        annualNetIncomeUsd: draft.annualNetIncomeUsd,
        distributionFreq: draft.distributionFreq,
        legalStructure: `SPV — ${draft.spvName}`,
        jurisdiction: draft.jurisdiction,
        tokenSymbol: nextSymbol(existing),
        contractAddress,
        status: 'FUNDING',
        minTokens: draft.minTokens,
        appreciationPct: draft.appreciationPct,
        occupancyPct: draft.occupancyPct,
        managementFeePct: draft.managementFeePct,
        highlights: draft.highlights,
        distributions: [],
        investorCount: 0,
        custom: true,
      };
      const ledgerTx: LedgerTx = {
        txHash,
        blockNumber,
        symbol: prop.tokenSymbol,
        title: prop.title,
        tokens: totalTokens,
        totalCostUsd: draft.totalValueUsd,
        timestamp: new Date().toISOString(),
        type: 'ISSUANCE',
      };
      setState((s) => ({
        ...s,
        customProperties: [prop, ...s.customProperties],
        ledger: [ledgerTx, ...s.ledger],
      }));
      return { property: prop, txHash, blockNumber };
    },
    [state.customProperties]
  );

  const loadDemoPortfolio = useCallback(() => {
    const nowLedger: LedgerTx[] = DEMO_INVESTMENTS.map((inv) => ({
      txHash: inv.txHash,
      blockNumber: inv.blockNumber,
      symbol: TOKENIZED_PROPERTIES.find((p) => p.id === inv.propertyId)?.tokenSymbol ?? 'KJ-KRN3',
      title: TOKENIZED_PROPERTIES.find((p) => p.id === inv.propertyId)?.title ?? '',
      tokens: inv.tokenAmount,
      totalCostUsd: inv.totalCostUsd,
      timestamp: inv.createdAt,
      type: 'PURCHASE' as const,
    }));
    // Fold the demo holdings into soldDelta so the marketplace funding % and
    // the portfolio stay consistent (otherwise the demo buys exist in the
    // portfolio but are invisible on the market cards).
    const demoDelta: Record<string, number> = {};
    for (const inv of DEMO_INVESTMENTS) {
      demoDelta[inv.propertyId] = (demoDelta[inv.propertyId] ?? 0) + inv.tokenAmount;
    }
    setState((s) => ({
      ...s,
      investor: DEMO_INVESTOR,
      investments: DEMO_INVESTMENTS,
      receivedDistributions: DEMO_DISTRIBUTIONS,
      soldDelta: demoDelta,
      ledger: [
        ...s.ledger.filter((tx) => !DEMO_INVESTMENTS.some((d) => d.txHash === tx.txHash)),
        ...nowLedger,
      ].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)),
    }));
  }, []);

  const signOut = useCallback(() => {
    setState((s) => ({
      ...EMPTY,
      // keep custom properties & their sold deltas so the marketplace stays consistent
      customProperties: s.customProperties,
      soldDelta: s.soldDelta,
      waitlist: s.waitlist,
    }));
  }, []);

  const joinWaitlist = useCallback((propertyId: string) => {
    setState((s) =>
      s.waitlist.includes(propertyId) ? s : { ...s, waitlist: [...s.waitlist, propertyId] }
    );
  }, []);

  /* ------------------------------ trial actions ----------------------------- */

  const topUpTrial = useCallback(() => {
    setState((s) => ({ ...s, walletUsd: s.walletUsd + TRIAL_TOPUP_USD }));
  }, []);

  const buySecondary = useCallback(
    (propertyId: string, tokenAmount: number): SecondaryTradeResult => {
      const p = properties.find((x) => x.id === propertyId);
      if (!p) throw new Error('Property not found');
      if (tokenAmount <= 0) throw new Error('Enter a token amount');
      const book = buildOrderBook(p.id, seedMidPrice(p), state.marketPrices[p.id]);
      const fill = matchMarketOrder('buy', tokenAmount, book.bids, book.asks);
      if (fill.filled <= 0) throw new Error('No ask depth on the book right now');
      if (fill.totalUsd > state.walletUsd)
        throw new Error(
          `Trial wallet has $${Math.round(state.walletUsd).toLocaleString()} — this order fills $${Math.round(fill.totalUsd).toLocaleString()}. Top up trial credits or reduce the order.`
        );
      const txHash = randomHex(64);
      const now = new Date(Date.now() + state.clockOffsetMs).toISOString();
      const investment: Investment = {
        id: `inv-${Date.now().toString(36)}`,
        propertyId,
        tokenAmount: fill.filled,
        pricePerTokenUsd: fill.avgPriceUsd,
        totalCostUsd: fill.totalUsd,
        txHash,
        blockNumber: nextBlockNumber(),
        createdAt: now,
      };
      const ledgerTx: LedgerTx = {
        txHash,
        blockNumber: nextBlockNumber(),
        symbol: p.tokenSymbol,
        title: p.title,
        tokens: fill.filled,
        totalCostUsd: fill.totalUsd,
        timestamp: now,
        type: 'PURCHASE',
      };
      const trade: Trade = {
        id: `trd-${Date.now().toString(36)}`,
        propertyId,
        symbol: p.tokenSymbol,
        side: 'BUY',
        tokens: fill.filled,
        avgPriceUsd: fill.avgPriceUsd,
        totalUsd: fill.totalUsd,
        timestamp: now,
      };
      setState((s) => ({
        ...s,
        investments: [investment, ...s.investments],
        ledger: [ledgerTx, ...s.ledger],
        trades: [trade, ...s.trades],
        walletUsd: s.walletUsd - fill.totalUsd,
        marketPrices: { ...s.marketPrices, [propertyId]: fill.newMid },
      }));
      return {
        tokens: fill.filled,
        avgPriceUsd: fill.avgPriceUsd,
        totalUsd: fill.totalUsd,
        txHash,
        symbol: p.tokenSymbol,
        title: p.title,
        newMid: fill.newMid,
      };
    },
    [properties, state.marketPrices, state.walletUsd, state.clockOffsetMs]
  );

  const sellSecondary = useCallback(
    (propertyId: string, tokenAmount: number): SecondaryTradeResult => {
      const p = properties.find((x) => x.id === propertyId);
      if (!p) throw new Error('Property not found');
      const held = state.investments
        .filter((i) => i.propertyId === propertyId)
        .reduce((acc, i) => acc + i.tokenAmount, 0);
      if (tokenAmount <= 0 || tokenAmount > held) throw new Error('Insufficient tokens');
      const book = buildOrderBook(p.id, seedMidPrice(p), state.marketPrices[p.id]);
      const fill = matchMarketOrder('sell', tokenAmount, book.bids, book.asks);
      if (fill.filled <= 0) throw new Error('No bid depth on the book right now');
      const txHash = randomHex(64);
      const now = new Date(Date.now() + state.clockOffsetMs).toISOString();
      const ledgerTx: LedgerTx = {
        txHash,
        blockNumber: nextBlockNumber(),
        symbol: p.tokenSymbol,
        title: p.title,
        tokens: -fill.filled,
        totalCostUsd: fill.totalUsd,
        timestamp: now,
        type: 'SALE',
      };
      const trade: Trade = {
        id: `trd-${Date.now().toString(36)}`,
        propertyId,
        symbol: p.tokenSymbol,
        side: 'SELL',
        tokens: fill.filled,
        avgPriceUsd: fill.avgPriceUsd,
        totalUsd: fill.totalUsd,
        timestamp: now,
      };
      setState((s) => {
        let remaining = fill.filled;
        const investments = s.investments
          .filter((i) => i.propertyId === propertyId)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          .map((i) => {
            if (remaining <= 0) return i;
            const take = Math.min(i.tokenAmount, remaining);
            remaining -= take;
            return { ...i, tokenAmount: i.tokenAmount - take };
          })
          .filter((i) => i.tokenAmount > 0);
        return {
          ...s,
          investments,
          ledger: [ledgerTx, ...s.ledger],
          trades: [trade, ...s.trades],
          walletUsd: s.walletUsd + fill.totalUsd,
          marketPrices: { ...s.marketPrices, [propertyId]: fill.newMid },
          soldDelta: {
            ...s.soldDelta,
            [propertyId]: Math.max(0, (s.soldDelta[propertyId] ?? 0) - fill.filled),
          },
        };
      });
      return {
        tokens: fill.filled,
        avgPriceUsd: fill.avgPriceUsd,
        totalUsd: fill.totalUsd,
        txHash,
        symbol: p.tokenSymbol,
        title: p.title,
        newMid: fill.newMid,
      };
    },
    [properties, state.investments, state.marketPrices, state.clockOffsetMs]
  );

  /** Accrue distributions for cycles elapsed on the trial clock. */
  const accrue = useCallback(
    (nowMs: number): AccrualResult => {
      const baseMs = state.lastAccrual ? +new Date(state.lastAccrual) : nowMs;
      const entries = computeAccruedDistributions(state.investments, properties, baseMs, nowMs);
      const credited = entries.reduce((a, e) => a + e.amountUsd, 0);
      setState((s) => ({
        ...s,
        lastAccrual: new Date(nowMs).toISOString(),
        walletUsd: s.walletUsd + credited,
        receivedDistributions:
          credited > 0 ? [...entries, ...s.receivedDistributions] : s.receivedDistributions,
      }));
      return { cyclesAdvanced: entries.length, creditedUsd: credited, entries };
    },
    [state.lastAccrual, state.investments, properties]
  );

  const advanceTrialCycle = useCallback((): AccrualResult => {
    // advance the virtual clock by the shortest cycle among held LIVE assets
    // (30 days when nothing is held) so monthly payers credit first and the
    // quarterly cadence visibly differs on the calendar.
    const heldLiveIds = new Set(state.investments.map((i) => i.propertyId));
    const heldLive = properties.filter((p) => heldLiveIds.has(p.id) && p.status === 'LIVE');
    const step = heldLive.length
      ? Math.min(...heldLive.map((p) => cycleLengthMs(p.distributionFreq)))
      : MONTH_CYCLE_MS;
    const nowMs = Date.now() + state.clockOffsetMs + step;
    // First accrual (no lastAccrual yet): anchor one full cycle back so the
    // initial fast-forward credits the cycle it just advanced through.
    const baseMs = state.lastAccrual ? +new Date(state.lastAccrual) : nowMs - step;
    const entries = computeAccruedDistributions(state.investments, properties, baseMs, nowMs);
    const credited = entries.reduce((a, e) => a + e.amountUsd, 0);
    setState((s) => ({
      ...s,
      clockOffsetMs: s.clockOffsetMs + step,
      lastAccrual: new Date(nowMs).toISOString(),
      walletUsd: s.walletUsd + credited,
      receivedDistributions:
        credited > 0 ? [...entries, ...s.receivedDistributions] : s.receivedDistributions,
    }));
    return { cyclesAdvanced: entries.length, creditedUsd: credited, entries };
  }, [state.investments, state.clockOffsetMs, state.lastAccrual, properties]);

  const marketPrice = useCallback(
    (propertyId: string) =>
      state.marketPrices[propertyId] ??
      seedMidPrice(properties.find((p) => p.id === propertyId)) ??
      properties.find((p) => p.id === propertyId)?.tokenPriceUsd ??
      0,
    [properties, state.marketPrices]
  );

  const resetTrial = useCallback(() => {
    setState({ ...EMPTY, trialStartedAt: new Date().toISOString() });
  }, []);

  const openTrading = useCallback((propertyId: string) => {
    setState((s) => ({ ...s, statusOverrides: { ...s.statusOverrides, [propertyId]: 'LIVE' } }));
  }, []);

  // auto-accrue on mount for returning users whose real-time clock has passed
  // full cycles since the last accrual (trial clock unchanged — silent, honest)
  useEffect(() => {
    if (state.lastAccrual) {
      const nowMs = Date.now() + state.clockOffsetMs;
      const entries = computeAccruedDistributions(
        state.investments,
        properties,
        +new Date(state.lastAccrual),
        nowMs
      );
      if (entries.length > 0) void accrue(nowMs);
    }
     
  }, []);

  const value = useMemo<TokenizeStore>(
    () => ({
      investor: state.investor,
      properties,
      investments: state.investor?.demo
        ? state.investments
        : state.investments.filter((i) => !DEMO_INVESTMENTS.some((d) => d.id === i.id)),
      ledger: state.ledger,
      receivedDistributions: state.receivedDistributions,
      waitlist: state.waitlist,
      view,
      setView,
      selectedPropertyId,
      openProperty,
      investPropertyId,
      openInvest,
      closeInvest,
      kycOpen,
      kycNextAction,
      openKyc,
      closeKyc,
      completeKyc,
      buyTokens,
      sellTokens,
      issueProperty,
      loadDemoPortfolio,
      signOut,
      joinWaitlist,
      walletUsd: state.walletUsd,
      trades: state.trades,
      clockOffsetMs: state.clockOffsetMs,
      trialNowMs: Date.now() + state.clockOffsetMs,
      topUpTrial,
      buySecondary,
      sellSecondary,
      advanceTrialCycle,
      marketPrice,
      resetTrial,
      openTrading,
    }),
    [
      state,
      properties,
      view,
      selectedPropertyId,
      investPropertyId,
      kycOpen,
      kycNextAction,
      openProperty,
      openInvest,
      closeInvest,
      openKyc,
      closeKyc,
      completeKyc,
      buyTokens,
      sellTokens,
      issueProperty,
      loadDemoPortfolio,
      signOut,
      joinWaitlist,
      topUpTrial,
      buySecondary,
      sellSecondary,
      advanceTrialCycle,
      marketPrice,
      resetTrial,
      openTrading,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTokenize(): TokenizeStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTokenize must be used inside <TokenizeProvider>');
  return ctx;
}

/* ---------------------- trial-mode engine (pure, unit-tested) ---------------------- */

/** One order-book level (price + resting size). */
export interface BookLevel {
  price: number;
  size: number;
}

/** deterministic pseudo-random from string seed (same series as the UI) */
function seeded(seed: string): () => number {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** Deterministic 30-point price walk from the issuance price (illustrative history). */
export function marketSeries(p: TokenizedProperty): { i: number; price: number }[] {
  const rnd = seeded(p.id);
  const points: { i: number; price: number }[] = [];
  let price = p.tokenPriceUsd;
  for (let i = 0; i < 30; i++) {
    price = Math.max(0.5 * p.tokenPriceUsd, price * (1 + (rnd() - 0.48) * 0.02));
    points.push({ i, price });
  }
  return points;
}

/** Where the book sits before any trial trade: seeded walk's last point. */
export function seedMidPrice(p: TokenizedProperty | undefined): number | undefined {
  if (!p) return undefined;
  return marketSeries(p)[29].price;
}

/** Order book around the current mid: 3 bid/ask levels, deterministic sizes. */
export function buildOrderBook(
  propertyId: string,
  seedMid: number | undefined,
  liveMid: number | undefined
): { mid: number; bids: BookLevel[]; asks: BookLevel[]; volume24h: number } {
  const mid = liveMid ?? seedMid ?? 10;
  const rnd = seeded(`${propertyId}book`);
  const bids = [1, 2, 3].map((k) => ({
    price: mid * (1 - k * 0.004),
    size: Math.round(200 + rnd() * 1800),
  }));
  const asks = [1, 2, 3].map((k) => ({
    price: mid * (1 + k * 0.004),
    size: Math.round(200 + rnd() * 1800),
  }));
  return { mid, bids, asks, volume24h: Math.round(4000 + rnd() * 26000) };
}

/**
 * Walk the book to fill a market order — buys eat asks (ascending), sells eat
 * bids (descending). Volume-weighted average price; partial fill when depth
 * runs out; the book's mid settles just past the last consumed level so
 * trades visibly move the price (market impact).
 */
export function matchMarketOrder(
  side: 'buy' | 'sell',
  size: number,
  bids: BookLevel[],
  asks: BookLevel[]
): { filled: number; avgPriceUsd: number; totalUsd: number; newMid: number } {
  const levels = [...(side === 'buy' ? asks : bids)].sort((a, b) =>
    side === 'buy' ? a.price - b.price : b.price - a.price
  );
  let remaining = Math.max(0, size);
  let cost = 0;
  let filled = 0;
  let lastPrice = 0;
  for (const lvl of levels) {
    if (remaining <= 0) break;
    const take = Math.min(lvl.size, remaining);
    cost += take * lvl.price;
    filled += take;
    remaining -= take;
    lastPrice = lvl.price;
  }
  const newMid =
    filled > 0
      ? side === 'buy'
        ? lastPrice * 1.0015
        : lastPrice * 0.9985
      : bids[0] && asks[0]
        ? (bids[0].price + asks[0].price) / 2
        : lastPrice;
  return { filled, avgPriceUsd: filled > 0 ? cost / filled : 0, totalUsd: cost, newMid };
}

/** Trial-clock length of one distribution cycle. */
export function cycleLengthMs(freq: 'MONTHLY' | 'QUARTERLY'): number {
  return freq === 'MONTHLY' ? MONTH_CYCLE_MS : QUARTER_CYCLE_MS;
}

/** Distribution per token per cycle (declared net income / cycles / supply). */
export function perCycleDistributionUsd(p: TokenizedProperty): number {
  const cyclesPerYear = p.distributionFreq === 'MONTHLY' ? 12 : 4;
  return p.totalTokens > 0 ? p.annualNetIncomeUsd / cyclesPerYear / p.totalTokens : 0;
}

/**
 * Distributions owed to current holdings of LIVE properties for whole cycles
 * elapsed on the trial clock between lastAccrualMs and nowMs. FUNDING and
 * FUNDED assets pay nothing — only income-producing LIVE assets distribute.
 */
export function computeAccruedDistributions(
  investments: Investment[],
  properties: TokenizedProperty[],
  lastAccrualMs: number,
  nowMs: number
): ReceivedDistribution[] {
  const out: ReceivedDistribution[] = [];
  for (const p of properties) {
    if (p.status !== 'LIVE') continue;
    const held = investments
      .filter((i) => i.propertyId === p.id)
      .reduce((acc, i) => acc + i.tokenAmount, 0);
    if (held <= 0) continue;
    const cycle = cycleLengthMs(p.distributionFreq);
    const elapsed = Math.max(0, nowMs - lastAccrualMs);
    const cycles = Math.floor(elapsed / cycle);
    if (cycles <= 0) continue;
    const perToken = perCycleDistributionUsd(p);
    const amountUsd = held * perToken * cycles;
    out.push({
      id: `dist-${p.id}-${nowMs}`,
      propertyId: p.id,
      symbol: p.tokenSymbol,
      title: p.title,
      period: `${cycles} × ${p.distributionFreq === 'MONTHLY' ? 'monthly' : 'quarterly'} cycle${cycles > 1 ? 's' : ''}`,
      payDate: new Date(nowMs).toISOString(),
      tokens: held,
      perTokenUsd: perToken,
      amountUsd,
    });
  }
  return out;
}

/** Mark-to-market portfolio value at live mid prices (trial). */
export function portfolioMarkToMarket(
  investments: Investment[],
  properties: TokenizedProperty[],
  marketPrices: Record<string, number>
): { totalCostUsd: number; currentValueUsd: number; pnlUsd: number; pnlPct: number } {
  let cost = 0;
  let value = 0;
  for (const i of investments) {
    cost += i.totalCostUsd;
    const p = properties.find((x) => x.id === i.propertyId);
    const price = marketPrices[i.propertyId] ?? seedMidPrice(p) ?? p?.tokenPriceUsd ?? 0;
    value += i.tokenAmount * price;
  }
  const pnl = value - cost;
  return {
    totalCostUsd: cost,
    currentValueUsd: value,
    pnlUsd: pnl,
    pnlPct: cost > 0 ? (pnl / cost) * 100 : 0,
  };
}

/* ------------------------------- small helpers ------------------------------ */

function pickImage(type: TokenizedProperty['propertyType']): string {
  switch (type) {
    case 'OFFICE':
      return '/images/props/office_1.jpg';
    case 'RESIDENTIAL':
      return '/images/props/apartment_1.jpg';
    case 'RETAIL':
      return '/images/props/interior_1.jpg';
    case 'MIXED_USE':
      return '/images/props/townhouse_1.jpg';
    case 'LOGISTICS':
      return '/images/props/land_1.jpg';
  }
}

function nextSymbol(existing: TokenizedProperty[]): string {
  const nums = existing
    .map((p) => parseInt((p.tokenSymbol.match(/(\d+)$/) ?? ['0'])[0], 10))
    .filter((n) => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `KJ-CUS${next}`;
}
