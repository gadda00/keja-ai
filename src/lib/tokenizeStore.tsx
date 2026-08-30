/**
 * Keja Tokenize — client-side state store.
 * React context + localStorage persistence. Simulates the full loop:
 * KYC → purchase → ledger → portfolio → issuance. No backend required.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  DEMO_DISTRIBUTIONS, DEMO_INVESTMENTS, DEMO_INVESTOR, TOKENIZED_PROPERTIES,
  nextBlockNumber, randomHex,
} from '@/data/tokenize'
import type {
  Investment, Investor, LedgerTx, ReceivedDistribution, TokenizedProperty,
} from '@/data/tokenize'

const STORAGE_KEY = 'keja-tokenize-v1'

export type TokenizeView = 'marketplace' | 'property' | 'portfolio' | 'issuer' | 'learn' | 'market'

interface PersistedState {
  investor: Investor | null
  investments: Investment[]
  ledger: LedgerTx[]
  customProperties: TokenizedProperty[]
  /** tokensSold deltas for seeded properties (index by property id) */
  soldDelta: Record<string, number>
  receivedDistributions: ReceivedDistribution[]
  waitlist: string[]
}

const EMPTY: PersistedState = {
  investor: null,
  investments: [],
  ledger: [],
  customProperties: [],
  soldDelta: {},
  receivedDistributions: [],
  waitlist: [],
}

function load(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<PersistedState>
    return { ...EMPTY, ...parsed }
  } catch {
    return EMPTY
  }
}

export interface TokenizeStore {
  investor: Investor | null
  properties: TokenizedProperty[]
  investments: Investment[]
  ledger: LedgerTx[]
  receivedDistributions: ReceivedDistribution[]
  waitlist: string[]

  view: TokenizeView
  setView: (v: TokenizeView) => void
  selectedPropertyId: string | null
  openProperty: (id: string) => void
  investPropertyId: string | null
  openInvest: (id: string) => void
  closeInvest: () => void
  kycOpen: boolean
  kycNextAction: 'invest' | 'portfolio' | null
  openKyc: (nextAction: 'invest' | 'portfolio') => void
  closeKyc: () => void

  completeKyc: (form: KycForm) => Investor
  buyTokens: (propertyId: string, tokenAmount: number) => BuyResult
  sellTokens: (propertyId: string, tokenAmount: number, pricePerTokenUsd: number) => { proceedsUsd: number; txHash: string; tokens: number }
  issueProperty: (draft: IssuerDraft) => IssueResult
  loadDemoPortfolio: () => void
  signOut: () => void
  joinWaitlist: (propertyId: string) => void
}

export interface KycForm {
  fullName: string
  email: string
  phone: string
  country: string
  idType: 'NATIONAL_ID' | 'PASSPORT'
  idNumber: string
  sourceOfFunds: string
}

export interface BuyResult {
  tokens: number
  totalCostUsd: number
  txHash: string
  blockNumber: number
  symbol: string
  title: string
  freq: string
  firstDistributionHint: string
  fundedPct: number
}

export interface IssuerDraft {
  title: string
  tagline: string
  description: string
  location: string
  city: string
  propertyType: TokenizedProperty['propertyType']
  totalValueUsd: number
  tokenPriceUsd: number
  minTokens: number
  annualNetIncomeUsd: number
  distributionFreq: TokenizedProperty['distributionFreq']
  appreciationPct: number
  occupancyPct: number
  managementFeePct: number
  spvName: string
  jurisdiction: string
  highlights: string[]
}

export interface IssueResult {
  property: TokenizedProperty
  txHash: string
  blockNumber: number
}

const Ctx = createContext<TokenizeStore | null>(null)

export function TokenizeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(() => load())
  const [view, setView] = useState<TokenizeView>('marketplace')
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
  const [investPropertyId, setInvestPropertyId] = useState<string | null>(null)
  const [kycOpen, setKycOpen] = useState(false)
  const [kycNextAction, setKycNextAction] = useState<'invest' | 'portfolio' | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage full / private mode — ignore */
    }
  }, [state])

  /** seeded properties with runtime sold deltas + custom issued properties */
  const properties = useMemo<TokenizedProperty[]>(() => {
    const seeded = TOKENIZED_PROPERTIES.map((p) => ({
      ...p,
      tokensSold: Math.min(p.totalTokens, p.tokensSold + (state.soldDelta[p.id] ?? 0)),
    }))
    return [...seeded, ...state.customProperties]
  }, [state.soldDelta, state.customProperties])

  const openProperty = useCallback((id: string) => {
    setSelectedPropertyId(id)
    setView('property')
  }, [])

  const openInvest = useCallback((id: string) => {
    setInvestPropertyId(id)
  }, [])

  const closeInvest = useCallback(() => setInvestPropertyId(null), [])

  const openKyc = useCallback((nextAction: 'invest' | 'portfolio') => {
    setKycNextAction(nextAction)
    setKycOpen(true)
  }, [])

  const closeKyc = useCallback(() => setKycOpen(false), [])

  const completeKyc = useCallback((form: KycForm): Investor => {
    const investor: Investor = {
      id: `inv-${Date.now().toString(36)}`,
      email: form.email,
      fullName: form.fullName,
      phone: form.phone,
      country: form.country,
      kycStatus: 'VERIFIED',
      walletAddress: randomHex(40),
    }
    setState((s) => ({ ...s, investor }))
    return investor
  }, [])

  const buyTokens = useCallback(
    (propertyId: string, tokenAmount: number): BuyResult => {
      const p = properties.find((x) => x.id === propertyId)
      if (!p) throw new Error('Property not found')
      const cost = tokenAmount * p.tokenPriceUsd
      const txHash = randomHex(64)
      const blockNumber = nextBlockNumber()
      const now = new Date().toISOString()

      const investment: Investment = {
        id: `inv-${Date.now().toString(36)}`,
        propertyId: p.id,
        tokenAmount,
        pricePerTokenUsd: p.tokenPriceUsd,
        totalCostUsd: cost,
        txHash,
        blockNumber,
        createdAt: now,
      }
      const ledgerTx: LedgerTx = {
        txHash,
        blockNumber,
        symbol: p.tokenSymbol,
        title: p.title,
        tokens: tokenAmount,
        totalCostUsd: cost,
        timestamp: now,
        type: 'PURCHASE',
      }

      setState((s) => ({
        ...s,
        investments: [investment, ...s.investments],
        ledger: [ledgerTx, ...s.ledger],
        soldDelta: { ...s.soldDelta, [p.id]: (s.soldDelta[p.id] ?? 0) + tokenAmount },
      }))

      const newSold = p.tokensSold + tokenAmount
      const funded = p.totalTokens > 0 ? Math.round((newSold / p.totalTokens) * 100) : 0
      const hint =
        p.status === 'LIVE'
          ? p.distributionFreq === 'MONTHLY'
            ? 'Your first distribution lands at the start of the next monthly cycle.'
            : 'Your first distribution lands at the start of the next quarterly cycle.'
          : `First distribution projected for Q1 2027 once the offering is fully funded (${Math.min(funded, 100)}% funded).`

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
      }
    },
    [properties]
  )

  const sellTokens = useCallback(
    (propertyId: string, tokenAmount: number, pricePerTokenUsd: number) => {
      const p = properties.find((x) => x.id === propertyId)
      if (!p) throw new Error('Property not found')
      const held = state.investments
        .filter((i) => i.propertyId === propertyId)
        .reduce((acc, i) => acc + i.tokenAmount, 0)
      if (tokenAmount <= 0 || tokenAmount > held) throw new Error('Insufficient tokens')
      const proceeds = tokenAmount * pricePerTokenUsd
      const txHash = randomHex(64)
      const now = new Date().toISOString()
      const ledgerTx: LedgerTx = {
        txHash,
        blockNumber: nextBlockNumber(),
        symbol: p.tokenSymbol,
        title: p.title,
        tokens: -tokenAmount,
        totalCostUsd: proceeds,
        timestamp: now,
        type: 'SALE',
      }
      setState((s) => {
        let remaining = tokenAmount
        const investments = s.investments
          .filter((i) => i.propertyId === propertyId)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt)) // FIFO: oldest lots sell first
          .map((i) => {
            if (remaining <= 0) return i
            const take = Math.min(i.tokenAmount, remaining)
            remaining -= take
            return { ...i, tokenAmount: i.tokenAmount - take }
          })
          .filter((i) => i.tokenAmount > 0)
        return {
          ...s,
          investments,
          ledger: [ledgerTx, ...s.ledger],
          soldDelta: { ...s.soldDelta, [propertyId]: Math.max(0, (s.soldDelta[propertyId] ?? 0) - tokenAmount) },
        }
      })
      return { proceedsUsd: proceeds, txHash, tokens: tokenAmount }
    },
    [properties, state.investments],
  )

  const issueProperty = useCallback((draft: IssuerDraft): IssueResult => {
    const existing = [...TOKENIZED_PROPERTIES, ...state.customProperties]
    const totalTokens = draft.tokenPriceUsd > 0 ? Math.round(draft.totalValueUsd / draft.tokenPriceUsd) : 0
    const contractAddress = randomHex(40)
    const txHash = randomHex(64)
    const blockNumber = nextBlockNumber()
    const prop: TokenizedProperty = {
      id: `kj-custom-${Date.now().toString(36)}`,
      slug: draft.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
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
    }
    const ledgerTx: LedgerTx = {
      txHash,
      blockNumber,
      symbol: prop.tokenSymbol,
      title: prop.title,
      tokens: totalTokens,
      totalCostUsd: draft.totalValueUsd,
      timestamp: new Date().toISOString(),
      type: 'ISSUANCE',
    }
    setState((s) => ({
      ...s,
      customProperties: [prop, ...s.customProperties],
      ledger: [ledgerTx, ...s.ledger],
    }))
    return { property: prop, txHash, blockNumber }
  }, [state.customProperties])

  const loadDemoPortfolio = useCallback(() => {
    const nowLedger: LedgerTx[] = DEMO_INVESTMENTS.map((inv, i) => ({
      txHash: inv.txHash,
      blockNumber: inv.blockNumber,
      symbol: DEMO_INVESTMENTS[i].propertyId === 'kj-wst1' ? 'KJ-WST1' : DEMO_INVESTMENTS[i].propertyId === 'kj-klm2' ? 'KJ-KLM2' : 'KJ-KRN3',
      title: TOKENIZED_PROPERTIES.find((p) => p.id === inv.propertyId)?.title ?? '',
      tokens: inv.tokenAmount,
      totalCostUsd: inv.totalCostUsd,
      timestamp: inv.createdAt,
      type: 'PURCHASE' as const,
    }))
    setState((s) => ({
      ...s,
      investor: DEMO_INVESTOR,
      investments: DEMO_INVESTMENTS,
      receivedDistributions: DEMO_DISTRIBUTIONS,
      ledger: [...s.ledger.filter((tx) => !DEMO_INVESTMENTS.some((d) => d.txHash === tx.txHash)), ...nowLedger].sort(
        (a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)
      ),
    }))
  }, [])

  const signOut = useCallback(() => {
    setState((s) => ({
      ...EMPTY,
      // keep custom properties & their sold deltas so the marketplace stays consistent
      customProperties: s.customProperties,
      soldDelta: s.soldDelta,
      waitlist: s.waitlist,
    }))
  }, [])

  const joinWaitlist = useCallback((propertyId: string) => {
    setState((s) => (s.waitlist.includes(propertyId) ? s : { ...s, waitlist: [...s.waitlist, propertyId] }))
  }, [])

  const value: TokenizeStore = {
    investor: state.investor,
    properties,
    investments: state.investor?.demo ? state.investments : state.investments.filter((i) => !DEMO_INVESTMENTS.some((d) => d.id === i.id)),
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
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTokenize(): TokenizeStore {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTokenize must be used inside <TokenizeProvider>')
  return ctx
}

/* ------------------------------- small helpers ------------------------------ */

function pickImage(type: TokenizedProperty['propertyType']): string {
  switch (type) {
    case 'OFFICE': return '/images/props/office_1.jpg'
    case 'RESIDENTIAL': return '/images/props/apartment_1.jpg'
    case 'RETAIL': return '/images/props/interior_1.jpg'
    case 'MIXED_USE': return '/images/props/townhouse_1.jpg'
    case 'LOGISTICS': return '/images/props/land_1.jpg'
  }
}

function nextSymbol(existing: TokenizedProperty[]): string {
  const nums = existing
    .map((p) => parseInt((p.tokenSymbol.match(/(\d+)$/) ?? ['0'])[0], 10))
    .filter((n) => !isNaN(n))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `KJ-CUS${next}`
}
