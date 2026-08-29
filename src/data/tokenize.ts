/**
 * Keja Tokenize — data model & seeded offerings.
 * Client-side tokenization marketplace (simulation): 5 Nairobi properties,
 * a demo investor portfolio, and distribution history.
 * All ledger entries are simulated on-device — no real chain, no real money.
 */

export type TokenizeStatus = 'LIVE' | 'FUNDING' | 'FUNDED' | 'UPCOMING'
export type PropertyType = 'OFFICE' | 'RESIDENTIAL' | 'RETAIL' | 'MIXED_USE' | 'LOGISTICS'
export type DistributionFreq = 'MONTHLY' | 'QUARTERLY'

export interface TokenizedProperty {
  id: string
  slug: string
  title: string
  tagline: string
  description: string
  location: string
  city: string
  country: string
  propertyType: PropertyType
  imageUrl: string
  totalValueUsd: number
  totalTokens: number
  tokensSold: number
  tokenPriceUsd: number
  annualNetIncomeUsd: number
  distributionFreq: DistributionFreq
  legalStructure: string
  jurisdiction: string
  tokenSymbol: string
  contractAddress: string
  status: TokenizeStatus
  minTokens: number
  appreciationPct: number
  occupancyPct: number
  managementFeePct: number
  highlights: string[]
  /** property-level distribution history shown on the detail page */
  distributions: PropertyDistribution[]
  investorCount: number
  /** true when issued at runtime through the Issuer Console */
  custom?: boolean
}

export interface PropertyDistribution {
  id: string
  periodLabel: string
  payDate: string
  amountUsd: number
  perTokenUsd: number
}

export interface Investor {
  id: string
  email: string
  fullName: string
  phone: string
  country: string
  kycStatus: 'VERIFIED'
  walletAddress: string
  /** demo portfolio flag */
  demo?: boolean
}

export interface Investment {
  id: string
  propertyId: string
  tokenAmount: number
  pricePerTokenUsd: number
  totalCostUsd: number
  txHash: string
  blockNumber: number
  createdAt: string
}

export interface LedgerTx {
  txHash: string
  blockNumber: number
  symbol: string
  title: string
  tokens: number
  totalCostUsd: number
  timestamp: string
  type: 'PURCHASE' | 'ISSUANCE'
}

export interface ReceivedDistribution {
  id: string
  propertyId: string
  symbol: string
  title: string
  period: string
  payDate: string
  tokens: number
  perTokenUsd: number
  amountUsd: number
}

/* ------------------------------- seeded data ------------------------------- */

export const TOKENIZED_PROPERTIES: TokenizedProperty[] = [
  {
    id: 'kj-wst1',
    slug: 'westlands-tower-one',
    title: 'Westlands Tower One',
    tagline: 'Grade-A office floors on the edge of Nairobi’s financial district',
    description:
      'A 14-storey Grade-A office tower in the heart of Westlands, Nairobi’s premier business node. Anchored by blue-chip tenants on long leases (avg. 7 years) with full-generation backup power, 3-level basement parking and BREEAM-equivalent efficiency standards. The tower maintains a 96% occupancy rate with rental income denominated in a stable USD-linked structure, making it a core-income asset for the Keja tokenized portfolio.',
    location: 'Ring Road, Westlands',
    city: 'Nairobi',
    country: 'Kenya',
    propertyType: 'OFFICE',
    imageUrl: '/images/props/office_0.jpg',
    totalValueUsd: 12_000_000,
    totalTokens: 1_200_000,
    tokensSold: 1_200_000,
    tokenPriceUsd: 10,
    annualNetIncomeUsd: 840_000,
    distributionFreq: 'QUARTERLY',
    legalStructure: 'SPV — Keja Westlands Holdings Ltd',
    jurisdiction: 'Kenya',
    tokenSymbol: 'KJ-WST1',
    contractAddress: '0x8f2e41ab9c73d5e6018fa2b4c6d97e3502a1f8b3',
    status: 'LIVE',
    minTokens: 10,
    appreciationPct: 5.0,
    occupancyPct: 96,
    managementFeePct: 8,
    highlights: [
      '96% occupancy with blue-chip corporate tenants on 5–9 year leases',
      'USD-linked rental income, quarterly distributions since 2024',
      'Independent valuation by Knight Frank Kenya (Feb 2026)',
      'Title verified on Ardhisasa land registry — zero encumbrances',
    ],
    distributions: [
      { id: 'wst1-q425', periodLabel: 'Q4 2025', payDate: '2026-01-15', amountUsd: 210_000, perTokenUsd: 0.175 },
      { id: 'wst1-q126', periodLabel: 'Q1 2026', payDate: '2026-04-15', amountUsd: 210_000, perTokenUsd: 0.175 },
      { id: 'wst1-q226', periodLabel: 'Q2 2026', payDate: '2026-07-15', amountUsd: 210_000, perTokenUsd: 0.175 },
    ],
    investorCount: 412,
  },
  {
    id: 'kj-klm2',
    slug: 'kilimani-sky-residences',
    title: 'Kilimani Sky Residences',
    tagline: 'Serviced apartments serving Nairobi’s expat & corporate demand',
    description:
      'An 86-unit serviced apartment block in Kilimani, Nairobi’s highest-yield residential sub-market. Units are managed under a single operator agreement with corporate housing demand from NGOs, embassies and tech firms, delivering consistently high occupancy. The asset produced an 8.1% net yield over the trailing 12 months, with distributions paid monthly to token holders.',
    location: 'Wood Avenue, Kilimani',
    city: 'Nairobi',
    country: 'Kenya',
    propertyType: 'RESIDENTIAL',
    imageUrl: '/images/props/apartment_0.jpg',
    totalValueUsd: 4_500_000,
    totalTokens: 450_000,
    tokensSold: 450_000,
    tokenPriceUsd: 10,
    annualNetIncomeUsd: 360_000,
    distributionFreq: 'MONTHLY',
    legalStructure: 'SPV — Keja Kilimani Residences Ltd',
    jurisdiction: 'Kenya',
    tokenSymbol: 'KJ-KLM2',
    contractAddress: '0x3c1d8e94b2a6f07d5e83c1a9d4b6f2e708c5d9a1',
    status: 'LIVE',
    minTokens: 10,
    appreciationPct: 6.0,
    occupancyPct: 94,
    managementFeePct: 9,
    highlights: [
      '8.0% trailing net yield — highest of the Keja live portfolio',
      'Monthly rental distributions, paid since January 2025',
      'Single corporate-housing operator on 10-year master agreement',
      'Fully renovated 2023: solar water heating, backup generator',
    ],
    distributions: [
      { id: 'klm2-q226', periodLabel: 'Q2 2026', payDate: '2026-07-05', amountUsd: 90_000, perTokenUsd: 0.2 },
      { id: 'klm2-jul26', periodLabel: 'July 2026', payDate: '2026-08-05', amountUsd: 30_000, perTokenUsd: 0.0667 },
    ],
    investorCount: 367,
  },
  {
    id: 'kj-krn3',
    slug: 'karen-village-retail-court',
    title: 'Karen Village Retail Court',
    tagline: 'Neighbourhood retail anchored by a supermarket & lifestyle tenants',
    description:
      'A 4,200 sqm open-air neighbourhood retail court on Karen Road, anchored by a leading supermarket chain on a 12-year lease and complemented by 24 lifestyle units — cafés, clinics, a pharmacy and services. Neighbourhood retail has proven the most resilient commercial format in Kenya, with this court holding 93% occupancy through the last two market cycles.',
    location: 'Karen Road, Karen',
    city: 'Nairobi',
    country: 'Kenya',
    propertyType: 'RETAIL',
    imageUrl: '/images/props/interior_0.jpg',
    totalValueUsd: 8_000_000,
    totalTokens: 800_000,
    tokensSold: 496_000,
    tokenPriceUsd: 10,
    annualNetIncomeUsd: 560_000,
    distributionFreq: 'QUARTERLY',
    legalStructure: 'SPV — Keja Karen Retail Ltd',
    jurisdiction: 'Kenya',
    tokenSymbol: 'KJ-KRN3',
    contractAddress: '0xa5b7e2f1c9d30846b7e1a5c9f2d6e8b4037a1c52',
    status: 'FUNDING',
    minTokens: 20,
    appreciationPct: 4.5,
    occupancyPct: 93,
    managementFeePct: 8,
    highlights: [
      'Supermarket anchor on 12-year lease — 41% of rental income',
      'First investor distribution projected for Q1 2027',
      'Target allocation: 62% funded as of today',
      'Independent valuation by Broll Kenya (Jun 2026)',
    ],
    distributions: [],
    investorCount: 158,
  },
  {
    id: 'kj-lvn4',
    slug: 'lavington-green-mixed-use',
    title: 'Lavington Green Mixed-Use',
    tagline: 'Boutique offices over street-level retail in leafy Lavington',
    description:
      'A boutique mixed-use development combining 2,800 sqm of flexible office space with 11 high-street retail units on James Gichuru Road. The Lavington sub-market commands premium rents from professional services firms seeking quieter alternatives to Westlands, and the retail component adds defensive, non-discretionary income to the stack.',
    location: 'James Gichuru Road, Lavington',
    city: 'Nairobi',
    country: 'Kenya',
    propertyType: 'MIXED_USE',
    imageUrl: '/images/props/townhouse_0.jpg',
    totalValueUsd: 6_000_000,
    totalTokens: 600_000,
    tokensSold: 168_000,
    tokenPriceUsd: 10,
    annualNetIncomeUsd: 420_000,
    distributionFreq: 'QUARTERLY',
    legalStructure: 'SPV — Keja Lavington Green Ltd',
    jurisdiction: 'Kenya',
    tokenSymbol: 'KJ-LVN4',
    contractAddress: '0xe7f2a8b1c4d9635f8a2e7c1b5d9f3a6028b4e7c1',
    status: 'FUNDING',
    minTokens: 20,
    appreciationPct: 5.5,
    occupancyPct: 90,
    managementFeePct: 8,
    highlights: [
      '7.0% target yield from day one of operations',
      'Pre-letting at 61% — two floors committed to a law firm',
      'Corner plot with 47 parking bays — rare for the sub-market',
      'Construction completed & title verified on Ardhisasa',
    ],
    distributions: [],
    investorCount: 74,
  },
  {
    id: 'kj-thk5',
    slug: 'thika-road-logistics-hub',
    title: 'Thika Road Logistics Hub',
    tagline: 'Institutional-grade warehousing on Nairobi’s northern corridor',
    description:
      'An 18,500 sqm logistics and light-industrial park on the Thika Superhighway corridor, serving Nairobi’s fastest-growing consumption belt. Pre-let to two regional FMCG distributors and an e-commerce fulfilment operator on triple-net-style leases. Logistics is the tightest commercial property sub-market in Kenya, with vacancy below 3% city-wide.',
    location: 'Exit 11, Thika Superhighway, Ruiru',
    city: 'Nairobi',
    country: 'Kenya',
    propertyType: 'LOGISTICS',
    imageUrl: '/images/props/land_0.jpg',
    totalValueUsd: 15_000_000,
    totalTokens: 1_500_000,
    tokensSold: 0,
    tokenPriceUsd: 10,
    annualNetIncomeUsd: 1_125_000,
    distributionFreq: 'QUARTERLY',
    legalStructure: 'SPV — Keja Logistics Park Ltd',
    jurisdiction: 'Kenya',
    tokenSymbol: 'KJ-THK5',
    contractAddress: '0xb9d3e7a2c5f18024d6b9e3a7c1f5284b6d0e9a3c',
    status: 'UPCOMING',
    minTokens: 50,
    appreciationPct: 6.0,
    occupancyPct: 100,
    managementFeePct: 7,
    highlights: [
      '7.5% target yield — fully pre-let before tokenization',
      'Triple-net leases: tenants bear rates, insurance & maintenance',
      '73% of income from listed regional distributors',
      'Token offering opens Q4 2026 — join the waitlist',
    ],
    distributions: [],
    investorCount: 0,
  },
]

/* ------------------------------ demo investor ------------------------------ */

export const DEMO_INVESTOR: Investor = {
  id: 'inv-demo',
  email: 'demo@keja.ai',
  fullName: 'Amina Otieno',
  phone: '+254 712 000 111',
  country: 'Kenya',
  kycStatus: 'VERIFIED',
  walletAddress: '0x7F3dA9c14B8e25E6fA0b71C4dD88e09B3a2F5cE7',
  demo: true,
}

export const DEMO_INVESTMENTS: Investment[] = [
  {
    id: 'inv-wst1',
    propertyId: 'kj-wst1',
    tokenAmount: 2_500,
    pricePerTokenUsd: 10,
    totalCostUsd: 25_000,
    txHash: '0x4c8a1f7b2e9d6a3c5f8b1e4d7a2c9f6b3e8d1a5c7f2b9e4d6a1c8f3b5e2d9a4c',
    blockNumber: 4_821_377,
    createdAt: '2025-11-14T10:22:00Z',
  },
  {
    id: 'inv-klm2',
    propertyId: 'kj-klm2',
    tokenAmount: 1_200,
    pricePerTokenUsd: 10,
    totalCostUsd: 12_000,
    txHash: '0x9e2d5a8c1f4b7e3a6d9c2f5b8e1a4d7c3f6b9e2a5d8c1f4b7e3a6d9c2f5b8e1a',
    blockNumber: 4_865_204,
    createdAt: '2026-01-09T14:05:00Z',
  },
  {
    id: 'inv-krn3',
    propertyId: 'kj-krn3',
    tokenAmount: 500,
    pricePerTokenUsd: 10,
    totalCostUsd: 5_000,
    txHash: '0x2f7b4e9a1c6d3f8b5e2a7c4d1f8b5e2a9c4d1f6b3e8a5c2d9f4b1e7a3c6d5f8b',
    blockNumber: 5_102_883,
    createdAt: '2026-08-02T09:41:00Z',
  },
]

export const DEMO_DISTRIBUTIONS: ReceivedDistribution[] = [
  { id: 'dd-1', propertyId: 'kj-wst1', symbol: 'KJ-WST1', title: 'Westlands Tower One', period: 'Q4 2025', payDate: '2026-01-15', tokens: 2_500, perTokenUsd: 0.175, amountUsd: 437.5 },
  { id: 'dd-2', propertyId: 'kj-wst1', symbol: 'KJ-WST1', title: 'Westlands Tower One', period: 'Q1 2026', payDate: '2026-04-15', tokens: 2_500, perTokenUsd: 0.175, amountUsd: 437.5 },
  { id: 'dd-3', propertyId: 'kj-wst1', symbol: 'KJ-WST1', title: 'Westlands Tower One', period: 'Q2 2026', payDate: '2026-07-15', tokens: 2_500, perTokenUsd: 0.175, amountUsd: 437.5 },
  { id: 'dd-4', propertyId: 'kj-klm2', symbol: 'KJ-KLM2', title: 'Kilimani Sky Residences', period: 'Q2 2026', payDate: '2026-07-05', tokens: 1_200, perTokenUsd: 0.2, amountUsd: 240 },
  { id: 'dd-5', propertyId: 'kj-klm2', symbol: 'KJ-KLM2', title: 'Kilimani Sky Residences', period: 'July 2026', payDate: '2026-08-05', tokens: 1_200, perTokenUsd: 0.0667, amountUsd: 80 },
]

/* --------------------------------- helpers --------------------------------- */

export const propertyTypeLabel = (t: PropertyType) =>
  ({ OFFICE: 'Office', RESIDENTIAL: 'Residential', RETAIL: 'Retail', MIXED_USE: 'Mixed-Use', LOGISTICS: 'Logistics' })[t]

export const yieldPct = (p: TokenizedProperty) =>
  p.totalValueUsd > 0 ? (p.annualNetIncomeUsd / p.totalValueUsd) * 100 : 0

export const tokensAvailable = (p: TokenizedProperty) => Math.max(0, p.totalTokens - p.tokensSold)

export const fundedPct = (p: TokenizedProperty) =>
  p.totalTokens > 0 ? Math.round((p.tokensSold / p.totalTokens) * 100) : 0

/** Deterministic pseudo-random hex generator (wallet-safe, no real chain). */
export function randomHex(len: number): string {
  const bytes = new Uint8Array(len / 2)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes)
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  return '0x' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export const nextBlockNumber = () => 5_200_000 + Math.floor(Math.random() * 90_000)

export function nextTokenSymbol(existing: TokenizedProperty[]): string {
  const nums = existing
    .map((p) => parseInt((p.tokenSymbol.match(/(\d+)$/) ?? ['0'])[0], 10))
    .filter((n) => !isNaN(n))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `KJ-CUS${next}`
}
