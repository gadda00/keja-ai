/**
 * KEJA Admin & Operations Store
 * ---------------------------------------------------------------------------
 * Backs the Admin Console (blueprint Ch.14–15: role-based access, audit
 * trails, verification workflows) and the global listing-acquisition engine
 * (blueprint Ch.5–8: marketplace supply, trust by design, provenance).
 *
 * All state is persisted client-side (localStorage) so the platform runs on
 * a static host; every collection is designed to map 1:1 onto an API table
 * in the Phase-2 backend migration.
 */
import { store, useStore } from '@/lib/store';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface AuditEntry {
  id: string;
  actor: string;
  actorEmail: string;
  action: string;
  target: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical';
  ts: string;
}

export type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'flagged';

export interface ListingSubmission {
  id: string;
  submitterName: string;
  submitterEmail: string;
  submitterPhone?: string;
  agency?: string;
  title: string;
  type: string;
  purpose: string[];
  area: string;
  county: string;
  price: number;
  rentEstimate?: number;
  bedrooms?: number;
  bathrooms?: number;
  sizeSqm: number;
  description: string;
  amenities: string[];
  images: string[];
  source: 'self-service' | 'partner' | 'feed' | 'wizard';
  status: SubmissionStatus;
  flags: string[]; // trust-by-design anomaly detection
  completeness: number; // 0–100
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
}

export type PartnerType =
  'agency' | 'developer' | 'landlord' | 'portal' | 'data-partner' | 'diaspora-agent';

export interface PartnerApplication {
  id: string;
  orgName: string;
  contactName: string;
  email: string;
  phone?: string;
  type: PartnerType;
  market: string;
  listingsCount: number;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export type FeedType = 'api' | 'csv' | 'portal-syndication' | 'manual' | 'whatsapp';

export interface FeedConnection {
  id: string;
  name: string;
  type: FeedType;
  url?: string;
  market: string;
  intervalHours: number;
  lastSync: string;
  status: 'healthy' | 'degraded' | 'paused' | 'error';
  listingsImported: number;
  duplicatesBlocked: number;
}

export interface PlatformSettings {
  autoApproveThreshold: number; // completeness above which submissions auto-approve
  requirePhoneVerification: boolean;
  enableGlobalFeeds: boolean;
  maintenanceMode: boolean;
  listingReviewSLA: number; // hours
}

/* ------------------------------------------------------------------ */
/* Audit trail                                                         */
/* ------------------------------------------------------------------ */

const AUDIT_KEY = 'audit';
const MAX_AUDIT = 500;

const uid = () => Math.random().toString(36).slice(2, 10);

export function logAudit(e: Omit<AuditEntry, 'id' | 'ts'>) {
  const entries = store.get<AuditEntry[]>(AUDIT_KEY, []);
  const entry: AuditEntry = { ...e, id: uid(), ts: new Date().toISOString() };
  entries.unshift(entry);
  store.set(AUDIT_KEY, entries.slice(0, MAX_AUDIT));
  window.dispatchEvent(new CustomEvent('keja-store-change', { detail: AUDIT_KEY }));
}

export const useAuditLog = () => useStore<AuditEntry[]>(AUDIT_KEY, []);

/* ------------------------------------------------------------------ */
/* Seeds — demo data so every workflow is explorable from first load   */
/* ------------------------------------------------------------------ */

const now = Date.now();
const iso = (h: number) => new Date(now - h * 3600_000).toISOString();

const seedSubmissions: ListingSubmission[] = [
  {
    id: 'sub-1041',
    submitterName: 'Wanjiru Kamau',
    submitterEmail: 'wanjiru@skyline-agents.co.ke',
    submitterPhone: '+254 733 210 456',
    agency: 'Skyline Agents Kenya',
    title: 'Furnished 2BR Apartment — Riverside Drive',
    type: 'apartment',
    purpose: ['rent', 'invest'],
    area: 'Riverside',
    county: 'Nairobi',
    price: 95000,
    rentEstimate: 95000,
    bedrooms: 2,
    bathrooms: 2,
    sizeSqm: 110,
    description:
      'Fully furnished 2-bedroom on Riverside Drive with river views, backup generator, 24/7 concierge and secure parking. Popular with expatriate tenants; walking distance to Riverside Square.',
    amenities: ['Furnished', 'Balcony', 'Lift', 'Backup Generator', 'Concierge', 'Parking'],
    images: ['/images/props/apartment_0.jpg'],
    source: 'partner',
    status: 'pending',
    flags: [],
    completeness: 92,
    createdAt: iso(3),
  },
  {
    id: 'sub-1042',
    submitterName: 'Diaspora Listings Ltd',
    submitterEmail: 'feeds@diasporalistings.com',
    agency: 'Diaspora Listings Ltd (UK)',
    title: 'Karen 5BR Family Home on Half Acre',
    type: 'villa',
    purpose: ['buy'],
    area: 'Karen',
    county: 'Nairobi',
    price: 4200000, // GBP-sourced price not converted → anomaly
    bedrooms: 5,
    bathrooms: 4,
    sizeSqm: 380,
    description: ' Stunning 5BR family home ',
    amenities: ['Garden', 'Staff Quarters', 'Pool'],
    images: [],
    source: 'feed',
    status: 'pending',
    flags: ['suspicious-price', 'thin-description', 'no-images', 'currency-mismatch'],
    completeness: 38,
    createdAt: iso(9),
  },
  {
    id: 'sub-1043',
    submitterName: 'Hassan Yusuf',
    submitterEmail: 'hassan.y@northcoasthomes.co.ke',
    submitterPhone: '+254 745 882 100',
    agency: 'North Coast Homes',
    title: 'Beachfront Plot 0.5 Acres — Diani',
    type: 'land',
    purpose: ['buy', 'invest'],
    area: 'Diani',
    county: 'Kwale',
    price: 8900000,
    sizeSqm: 2023,
    description:
      'Prime beachfront plot with clean freehold title, direct beach access, graded access road and mains electricity at the boundary. Ideal for villa development or holiday-let project; comparable plots in the row recently transacted at KES 9.2M–10.5M.',
    amenities: ['Beachfront', 'Freehold Title', 'Electricity', ' graded road'],
    images: ['/images/props/land_0.jpg', '/images/props/land_1.jpg'],
    source: 'self-service',
    status: 'approved',
    flags: [],
    completeness: 88,
    createdAt: iso(26),
    reviewedAt: iso(24),
    reviewedBy: 'Clive Mwangi',
    reviewNote: 'Title verified against Ardhisasa; comparables check out.',
  },
  {
    id: 'sub-1044',
    submitterName: 'QuickDeals Properties',
    submitterEmail: 'quickdeals@propertyjiju.com',
    title: 'CHEAP 3BR KILIMANI URGENT SALE',
    type: 'apartment',
    purpose: ['buy'],
    area: 'Kilimani',
    county: 'Nairobi',
    price: 3500000, // far below market → duplicate + scam pattern
    bedrooms: 3,
    bathrooms: 2,
    sizeSqm: 120,
    description: 'urgent sale contact whatsapp only',
    amenities: [],
    images: [],
    source: 'self-service',
    status: 'flagged',
    flags: [
      'suspicious-price',
      'duplicate-suspected',
      'thin-description',
      'no-images',
      'off-platform-contact',
    ],
    completeness: 22,
    createdAt: iso(40),
    reviewedAt: iso(39),
    reviewedBy: 'Clive Mwangi',
    reviewNote: 'Matches known scam pattern (identical listing on 3 portals). Rejected & reported.',
  },
  {
    id: 'sub-1045',
    submitterName: 'TechPark Developers',
    submitterEmail: 'listings@techparkdev.co.ke',
    submitterPhone: '+254 20 445 678',
    agency: 'TechPark Developers',
    title: 'Grade-A Office Floor — Upper Hill Tower',
    type: 'commercial',
    purpose: ['rent', 'invest'],
    area: 'Upper Hill',
    county: 'Nairobi',
    price: 1850000,
    rentEstimate: 1850000,
    sizeSqm: 620,
    description:
      'Whole-floor Grade-A office space in a new Upper Hill tower: raised floors, VRV climate control, dual-fibre connectivity, 2 high-speed lift banks, 24/7 security with access control, and 12 dedicated parking bays. LEED-equivalent fit-out standard.',
    amenities: ['Raised Floors', 'VRV HVAC', 'Dual Fibre', 'Parking', 'Access Control', 'Lift'],
    images: ['/images/props/office_0.jpg', '/images/props/office_1.jpg'],
    source: 'partner',
    status: 'pending',
    flags: [],
    completeness: 84,
    createdAt: iso(1),
  },
];

const seedPartners: PartnerApplication[] = [
  {
    id: 'prt-201',
    orgName: 'Skyline Agents Kenya',
    contactName: 'Wanjiru Kamau',
    email: 'wanjiru@skyline-agents.co.ke',
    phone: '+254 733 210 456',
    type: 'agency',
    market: 'Nairobi',
    listingsCount: 45,
    message: 'Full agency onboarding — residential sales & letting across Nairobi.',
    status: 'pending',
    createdAt: iso(5),
  },
  {
    id: 'prt-202',
    orgName: 'Diaspora Listings Ltd',
    contactName: 'Michael Otieno',
    email: 'feeds@diasporalistings.com',
    phone: '+44 7700 900123',
    type: 'portal',
    market: 'UK → Kenya corridor',
    listingsCount: 180,
    message: 'Cross-portal syndication: UK-based Kenyan diaspora inventory, XML feed ready.',
    status: 'pending',
    createdAt: iso(30),
  },
  {
    id: 'prt-203',
    orgName: 'TechPark Developers',
    contactName: 'Alice Mutiso',
    email: 'listings@techparkdev.co.ke',
    phone: '+254 20 445 678',
    type: 'developer',
    market: 'Nairobi',
    listingsCount: 12,
    message: 'New Upper Hill commercial tower — pre-letting inventory.',
    status: 'approved',
    createdAt: iso(72),
  },
  {
    id: 'prt-204',
    orgName: 'Uvumbuzi Real Estate',
    contactName: 'Joseph Mburu',
    email: 'joseph@uvumbuzi.rw',
    phone: '+250 788 123 456',
    type: 'agency',
    market: 'Kigali, Rwanda',
    listingsCount: 30,
    message: 'First East-African expansion partner — Kigali residential market.',
    status: 'pending',
    createdAt: iso(50),
  },
];

const seedFeeds: FeedConnection[] = [
  {
    id: 'feed-01',
    name: 'Diaspora Listings XML (UK)',
    type: 'portal-syndication',
    url: 'https://feeds.diasporalistings.com/keja.xml',
    market: 'Kenya (diaspora corridor)',
    intervalHours: 6,
    lastSync: iso(2),
    status: 'healthy',
    listingsImported: 180,
    duplicatesBlocked: 34,
  },
  {
    id: 'feed-02',
    name: 'TechPark Developer API',
    type: 'api',
    url: 'https://api.techparkdev.co.ke/v1/listings',
    market: 'Nairobi',
    intervalHours: 1,
    lastSync: iso(0.5),
    status: 'healthy',
    listingsImported: 12,
    duplicatesBlocked: 0,
  },
  {
    id: 'feed-03',
    name: 'Partner CSV Drop (Google Drive)',
    type: 'csv',
    url: 'https://drive.google.com/drive/folders/keja-partners',
    market: 'Multi-market',
    intervalHours: 24,
    lastSync: iso(20),
    status: 'degraded',
    listingsImported: 62,
    duplicatesBlocked: 11,
  },
  {
    id: 'feed-04',
    name: 'WhatsApp Listing Bot',
    type: 'whatsapp',
    market: 'Kenya',
    intervalHours: 0,
    lastSync: iso(0.2),
    status: 'healthy',
    listingsImported: 217,
    duplicatesBlocked: 89,
  },
  {
    id: 'feed-05',
    name: 'Uvumbuzi Kigali Portal',
    type: 'portal-syndication',
    url: 'https://uvumbuzi.rw/feed/keja',
    market: 'Rwanda',
    intervalHours: 12,
    lastSync: iso(55),
    status: 'paused',
    listingsImported: 0,
    duplicatesBlocked: 0,
  },
];

const DEFAULT_SETTINGS: PlatformSettings = {
  autoApproveThreshold: 95,
  requirePhoneVerification: false,
  enableGlobalFeeds: true,
  maintenanceMode: false,
  listingReviewSLA: 24,
};

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

export const useSubmissions = () => useStore<ListingSubmission[]>('submissions', seedSubmissions);

export const usePartners = () => useStore<PartnerApplication[]>('partners', seedPartners);

export const useFeeds = () => useStore<FeedConnection[]>('feeds', seedFeeds);

export const useSettings = () => useStore<PlatformSettings>('settings', DEFAULT_SETTINGS);

/* ------------------------------------------------------------------ */
/* Trust-by-Design anomaly detection (blueprint Ch.8)                  */
/* ------------------------------------------------------------------ */

export interface AnomalyResult {
  flags: string[];
  completeness: number;
}

const MARKET_RATE_PER_SQM: Record<string, [number, number]> = {
  // conservative KES/sqm bands by area (illustrative)
  Kilimani: [80000, 220000],
  Riverside: [90000, 200000],
  Westlands: [90000, 230000],
  Lavington: [85000, 210000],
  Karen: [60000, 160000],
  'Upper Hill': [120000, 300000],
  Diani: [2000, 9000], // land
  default: [40000, 260000],
};

/**
 * Pure anomaly detection — no side effects. Pass `seenSignatures` to
 * include the duplicate heuristic in read-only mode (safe inside useMemo /
 * render). Signatures are only *recorded* via `recordListingSignature()` at
 * submit time, so a user's own live draft can never flag itself.
 */
export function getListingSignatures(): string[] {
  try {
    return JSON.parse(localStorage.getItem('keja:listing-sigs') ?? '[]') as string[];
  } catch {
    return [];
  }
}

export function recordListingSignature(s: {
  title: string;
  area: string;
  price: number;
  bedrooms?: number;
}): void {
  if (!(s.title && s.area && s.price > 0 && s.bedrooms)) return;
  const signature = `${s.bedrooms}br|${s.area}|${Math.round(s.price / 500000)}`;
  try {
    const seen = getListingSignatures();
    if (!seen.includes(signature)) {
      seen.unshift(signature);
      localStorage.setItem('keja:listing-sigs', JSON.stringify(seen.slice(0, 200)));
    }
  } catch {
    /* storage unavailable — signatures are best-effort only */
  }
}

export function runAnomalyDetection(
  s: {
    title: string;
    area: string;
    county: string;
    price: number;
    sizeSqm: number;
    bedrooms?: number;
    description: string;
    images: string[];
    amenities: string[];
  },
  seenSignatures?: string[]
): AnomalyResult {
  const flags: string[] = [];
  let completeness = 0;

  // completeness scoring
  if (s.title?.trim().length >= 15) completeness += 15;
  else flags.push('short-title');
  if (s.description?.trim().length >= 120) completeness += 20;
  else flags.push('thin-description');
  if (s.images.length >= 3) completeness += 20;
  else if (s.images.length >= 1) completeness += 10;
  else flags.push('no-images');
  if (s.amenities.length >= 4) completeness += 15;
  else if (s.amenities.length >= 1) completeness += 8;
  if (s.bedrooms && s.bedrooms > 0) completeness += 10;
  if (s.sizeSqm > 0) completeness += 10;
  if (s.price > 0) completeness += 10;

  // price anomaly (per-sqm band)
  if (s.price > 0 && s.sizeSqm > 0) {
    const band = MARKET_RATE_PER_SQM[s.area] ?? MARKET_RATE_PER_SQM.default;
    const perSqm = s.price / s.sizeSqm;
    if (perSqm < band[0] * 0.45) flags.push('suspicious-price');
    // rental listings (low absolute price, monthly) get a pass on band checks
    if (perSqm > band[1] * 3.5 && s.price > 1000000) flags.push('price-outlier-high');
  }

  // off-platform contact pattern
  const txt = `${s.title} ${s.description}`.toLowerCase();
  if (/(whatsapp\s*only|dm\s*only|urgent\s*sale|cheap|no\s*agents)/.test(txt))
    flags.push('off-platform-contact');
  if (/[A-Z]{6,}/.test(s.title)) flags.push('shouty-title');

  // currency mismatch heuristic (common with diaspora feeds)
  if (s.price > 0 && s.price < 500000 && s.price % 1000 === 0 && txt.includes('acre'))
    flags.push('currency-mismatch');

  // duplicate heuristic — same-ish signature (pure read; recording happens
  // only in recordListingSignature() at submit time)
  if (s.title && s.area && s.price > 0 && s.bedrooms && seenSignatures) {
    const signature = `${s.bedrooms}br|${s.area}|${Math.round(s.price / 500000)}`;
    if (seenSignatures.includes(signature)) flags.push('duplicate-suspected');
  }

  return { flags: [...new Set(flags)], completeness: Math.min(100, completeness) };
}

/* ------------------------------------------------------------------ */
/* Conversion: approved submission → live marketplace listing          */
/* ------------------------------------------------------------------ */

export interface UserListing {
  id: string;
  /** the submission that produced this listing (publish/rollback idempotence) */
  submissionId?: string;
  title: string;
  type: string;
  purpose: string[];
  area: string;
  county: string;
  price: number;
  rentEstimate?: number;
  bedrooms?: number;
  bathrooms?: number;
  sizeSqm: number;
  amenities: string[];
  images: string[];
  description: string;
  agency: string;
  agent: { name: string; phone: string };
  availability: 'available' | 'reserved' | 'sold';
  listedAt: string;
  source: string;
  userSubmitted: true;
  views: number;
}

export const useUserListings = () => useStore<UserListing[]>('user-listings', []);

export function submissionToListing(s: ListingSubmission): UserListing {
  return {
    submissionId: s.id,
    // Collision-safe id: the old `slice(-4)` scheme collided whenever two
    // submissions shared trailing digits — use a random 6-hex suffix instead.
    id: `KJA-U${
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, '').slice(0, 6)
        : Math.floor(Math.random() * 0xffffff)
            .toString(16)
            .padStart(6, '0')
    }`,
    title: s.title,
    type: s.type,
    purpose: s.purpose,
    area: s.area,
    county: s.county,
    price: s.price,
    rentEstimate: s.rentEstimate,
    bedrooms: s.bedrooms,
    bathrooms: s.bathrooms,
    sizeSqm: s.sizeSqm,
    amenities: s.amenities,
    images: s.images.length ? s.images : ['/images/props/apartment_2.jpg'],
    description: s.description,
    agency: s.agency ?? 'Keja Verified Partner',
    agent: { name: s.submitterName, phone: s.submitterPhone ?? '' },
    availability: 'available',
    listedAt: s.createdAt,
    source: s.source,
    userSubmitted: true,
    views: 0,
  };
}

/* ------------------------------------------------------------------ */
/* Listing issue reports — user-side correction workflow               */
/* ------------------------------------------------------------------ */

/**
 * Review feedback: "listing freshness and correction workflows" — users need
 * a way to report stale or wrong listings, and the platform needs an
 * adjudication queue. Reports land here (client-side in this build; maps to
 * a `listing_reports` table in the Phase-2 backend) and surface in the Admin
 * Console listings tab.
 */

export type ReportReason =
  | 'sold-or-let'
  | 'price-wrong'
  | 'photos-outdated'
  | 'contact-unreachable'
  | 'suspected-fraud'
  | 'other';

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'sold-or-let', label: 'Already sold or let' },
  { value: 'price-wrong', label: 'Price is wrong or outdated' },
  { value: 'photos-outdated', label: 'Photos are outdated or not of this unit' },
  { value: 'contact-unreachable', label: 'Agent contact unreachable' },
  { value: 'suspected-fraud', label: 'Suspected fraud or misrepresentation' },
  { value: 'other', label: 'Something else' },
];

export interface ListingReport {
  id: string;
  propertyId: string;
  propertyTitle: string;
  reason: ReportReason;
  detail?: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
}

const REPORTS_KEY = 'listing-reports';
const MAX_REPORTS = 200;

export function reportListing(
  r: Omit<ListingReport, 'id' | 'status' | 'createdAt'>
): ListingReport {
  const reports = store.get<ListingReport[]>(REPORTS_KEY, []);
  const report: ListingReport = {
    ...r,
    id: `RPT-${uid()}`,
    status: 'open',
    createdAt: new Date().toISOString(),
  };
  reports.unshift(report);
  store.set(REPORTS_KEY, reports.slice(0, MAX_REPORTS));
  window.dispatchEvent(new CustomEvent('keja-store-change', { detail: REPORTS_KEY }));
  return report;
}

export const useListingReports = () => useStore<ListingReport[]>(REPORTS_KEY, []);

export function setReportStatus(id: string, status: ListingReport['status']) {
  const reports = store.get<ListingReport[]>(REPORTS_KEY, []);
  const next = reports.map((r) => (r.id === id ? { ...r, status } : r));
  store.set(REPORTS_KEY, next);
  window.dispatchEvent(new CustomEvent('keja-store-change', { detail: REPORTS_KEY }));
}
