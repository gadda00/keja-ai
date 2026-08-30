/**
 * Keja Auto-Pilot — market knowledge base.
 *
 * Single source of truth for the automatic listing pipeline: area economics,
 * type norms, agency pool, amenities, photo pools and the description grammar
 * used by the AI enrichment layer. Pure data — no imports — so the pipeline
 * runs in any Node 18+ environment (GitHub Actions included).
 */

export const AREAS = [
  { area: 'Kilimani', county: 'Nairobi', ppsm: [95000, 145000], yield: 8.2, demand: 9.4, acre: [80, 160] },
  { area: 'Westlands', county: 'Nairobi', ppsm: [100000, 150000], yield: 7.6, demand: 9.2, acre: [90, 180] },
  { area: 'Kileleshwa', county: 'Nairobi', ppsm: [85000, 125000], yield: 8.4, demand: 8.7, acre: [70, 140] },
  { area: 'Lavington', county: 'Nairobi', ppsm: [90000, 135000], yield: 7.4, demand: 8.9, acre: [80, 160] },
  { area: 'Riverside', county: 'Nairobi', ppsm: [95000, 140000], yield: 7.2, demand: 8.8, acre: [85, 170] },
  { area: 'Karen', county: 'Nairobi', ppsm: [55000, 90000], yield: 5.8, demand: 8.4, acre: [18, 45] },
  { area: 'Runda', county: 'Nairobi', ppsm: [60000, 95000], yield: 6.0, demand: 8.5, acre: [15, 40] },
  { area: 'Ruaka', county: 'Nairobi', ppsm: [65000, 95000], yield: 8.0, demand: 7.8, acre: [10, 28] },
  { area: 'Kasarani', county: 'Nairobi', ppsm: [45000, 70000], yield: 8.6, demand: 7.0, acre: [5, 14] },
  { area: 'Madaraka', county: 'Nairobi', ppsm: [70000, 100000], yield: 8.8, demand: 7.2, acre: [8, 20] },
  { area: 'Syokimau', county: 'Machakos', ppsm: [35000, 60000], yield: 7.8, demand: 7.4, acre: [3, 9] },
  { area: 'Kitengela', county: 'Kajiado', ppsm: [30000, 55000], yield: 7.6, demand: 7.6, acre: [2.5, 8] },
  { area: 'Athi River', county: 'Machakos', ppsm: [25000, 45000], yield: 7.2, demand: 6.8, acre: [2, 6] },
  { area: 'Nyali', county: 'Mombasa', ppsm: [60000, 100000], yield: 6.8, demand: 8.3, acre: [8, 25] },
  { area: 'Diani', county: 'Kwale', ppsm: [45000, 85000], yield: 7.0, demand: 8.1, acre: [3, 12] },
  { area: 'Milimani', county: 'Kisumu', ppsm: [40000, 70000], yield: 7.4, demand: 7.0, acre: [4, 12] },
  { area: 'Nakuru', county: 'Nakuru', ppsm: [30000, 55000], yield: 7.8, demand: 6.6, acre: [1.5, 6] },
  { area: 'Nanyuki', county: 'Laikipia', ppsm: [20000, 45000], yield: 6.4, demand: 6.4, acre: [0.8, 4] },
]

export const TYPES = [
  {
    type: 'apartment', label: 'Apartment', weight: 0.38,
    sqm: [45, 180], beds: [1, 4], baths: [1, 3],
    photos: ['apartment_0', 'apartment_1', 'apartment_2', 'interior_0', 'interior_1', 'bedroom_0'],
  },
  {
    type: 'townhouse', label: 'Townhouse', weight: 0.16,
    sqm: [120, 260], beds: [3, 5], baths: [2, 4],
    photos: ['townhouse_0', 'townhouse_1', 'interior_2', 'apartment_2'],
  },
  {
    type: 'villa', label: 'Villa', weight: 0.12,
    sqm: [200, 450], beds: [4, 6], baths: [3, 5],
    photos: ['villa_0', 'villa_1', 'interior_0', 'townhouse_1'],
  },
  {
    type: 'bungalow', label: 'Bungalow', weight: 0.09,
    sqm: [90, 200], beds: [2, 4], baths: [1, 3],
    photos: ['townhouse_0', 'interior_1', 'apartment_1'],
  },
  {
    type: 'land', label: 'Land', weight: 0.17,
    sqm: [404, 40470], beds: [0, 0], baths: [0, 0],
    photos: ['land_0', 'land_1'],
  },
  {
    type: 'commercial', label: 'Commercial', weight: 0.08,
    sqm: [80, 900], beds: [0, 0], baths: [0, 2],
    photos: ['office_0', 'office_1', 'interior_2'],
  },
]

export const AGENCIES = [
  { name: 'Skyline Agents Kenya', agents: [['Mercy Wanjiru', '+254 712 400 118'], ['Peter Kariuki', '+254 720 811 340']] },
  { name: 'Horizon Realtors', agents: [['Faith Njeri', '+254 733 255 902'], ['Dennis Otieno', '+254 701 644 087']] },
  { name: 'Prestige Homes KE', agents: [['Alice Mumbi', '+254 726 900 451'], ['Brian Mutua', '+254 738 220 776']] },
  { name: 'Diaspora Property Group', agents: [['Esther Kimani', '+254 705 118 663'], ['Kevin Ochieng', '+254 745 902 210']] },
  { name: 'Coastal Living Estates', agents: [['Halima Yusuf', '+254 718 337 540'], ['Ali Hassan', '+254 722 684 195']] },
  { name: 'Nairobi Prime Properties', agents: [['Grace Wairimu', '+254 736 481 902'], ['Samuel Kiptoo', '+254 710 259 664']] },
]

export const AMENITIES = {
  apartment: ['Lift access', 'Borehole water', 'Backup generator', '24/7 security', 'Gym', 'Rooftop terrace', 'CCTV surveillance', 'Secure parking', 'Balcony', 'Fibre internet ready'],
  townhouse: ['Gated compound', 'Private garden', 'Solar water heating', 'Borehole water', 'Staff quarters', 'Double garage', 'Perimeter wall', 'Clubhouse access'],
  villa: ['Swimming pool', 'Half-acre garden', 'Gated community', 'Solar backup', 'Guest wing', 'Staff quarters', 'EV charger ready', 'Borehole + storage tanks'],
  bungalow: ['Solar water heating', 'Fenced compound', 'Mature garden', 'Water storage tanks', 'Car porch', 'Quiet cul-de-sac'],
  land: ['Clean freehold title', 'Ready title deed', 'Graded access road', 'Electricity on site', 'Water on site', 'Beaconed boundaries', 'Near tarmac road'],
  commercial: ['Grade-A finishes', 'Raised floors', 'Central A/C', 'Ample parking bays', 'Fibre backbone', '100% backup power', 'Loading bay', 'Conference facilities'],
}

export const POI = {
  Kilimani: ['Yaya Centre', 'Prestige Plaza', 'Kilimani Primary'],
  Westlands: ['Sarit Centre', 'Westgate Mall', 'Peponi School'],
  Kileleshwa: ['Kileleshwa Primary', 'Lavington Mall', 'Gitanga Road shops'],
  Lavington: ['Lavington Mall', 'Jaffery Academy', 'Riara Road'],
  Riverside: ['Riverside Drive offices', 'Chiromo Lane', 'Riverside Square'],
  Karen: ['Karen Country Club', 'The Hub Karen', 'Karen Blixen Museum'],
  Runda: ['Runda Mhasibu shops', 'Village Market', 'Gigiri UN complex'],
  Ruaka: ['Two Rivers Mall', 'Ruaka town centre', 'Limuru Road corridor'],
  Kasarani: ['Kasarani stadium', 'Thika Road Mall', 'Garden City'],
  Madaraka: ['Strathmore University', 'Madaraka shops', 'Nairobi Expressway ramp'],
  Syokimau: ['SGR terminus', 'JKIA access road', 'Mlolongo interchange'],
  Kitengela: ['Kitengela town', 'Namanga Road', 'Eastleigh-Kitengela bypass'],
  'Athi River': ['Mombasa Road corridor', 'EPZ industrial zone', 'Daystar University'],
  Nyali: ['Nyali Centre', 'Mombasa Marine Park', 'Links Road hospitals'],
  Diani: ['Diani Beach', 'Ukunda airstrip', 'Baharini shopping plaza'],
  Milimani: ['Kisumu CBD', 'Lake Victoria shoreline', 'Milimani estates'],
  Nakuru: ['Nakuru town CBD', 'Lake Nakuru National Park', 'Kabarak Road'],
  Nanyuki: ['Nanyuki town', 'Mount Kenya foothills', 'Ol Pejeta conservancy'],
}

export const TENANT_MIX = ['young professional', 'expatriate family', 'diaspora investor', 'corporate tenant', 'growing family']
export const CORRIDORS = ['expressway', 'bypass', 'SGR', 'airport']

/* -------------------------- description grammar -------------------------- */

const OPENINGS = [
  'A well-presented {typeLabel} in {area}, {county}, offering {sqm} sqm of bright, efficiently planned space.',
  'Set in the heart of {area}, this {typeLabel} delivers {sqm} sqm of comfortable living with genuine character.',
  'This {sqm} sqm {typeLabel} in {area} has been finished to a practical standard and priced with discipline.',
  'Rarely available: a {typeLabel} in {area} combining space ({sqm} sqm), light and a convenient address.',
  'An honest, well-maintained {typeLabel} in {area} — {sqm} sqm of sensible layout for owners and investors alike.',
]

const MIDDLES_APARTMENT = [
  'The layout flows from a welcoming entrance into an open living area, with bedrooms positioned for privacy.',
  'Interiors are clean and neutral, ready for immediate occupation or a light personal refresh.',
  'Large windows pull in natural light throughout the day; the kitchen is functional and generously fitted.',
]
const MIDDLES_HOUSE = [
  'Living areas open onto a private garden, and the bedrooms are all generously proportioned.',
  'The property sits on a mature, well-kept compound with room for family life and entertaining.',
  'A calm street position keeps the setting quiet while keeping the neighbourhood amenities close.',
]
const MIDDLES_LAND = [
  'The parcel is beaconed, with graded access and utilities available at the boundary.',
  'A level, dry parcel suitable for immediate development or a medium-term hold.',
  'Documentation is available for inspection; the holding is clean and transfer-ready.',
]
const MIDDLES_COMMERCIAL = [
  'The floor plate is flexible for office, retail or clinic use, with parking and services in place.',
  'Common areas are managed, and the building enjoys stable tenancy in a business-friendly location.',
  'Infrastructure — power backup, connectivity and parking — supports immediate occupation.',
]

const CLOSINGS_INVEST = [
  'At {pricePerSqm}/sqm the pricing sits {priceGrade} the {area} band, and the area yield band of {yieldPct}% supports a solid income case.',
  'The {area} market band and {yieldPct}% yield environment make this a disciplined income or appreciation play.',
  'Benchmarked against comparable stock in {area}, this listing offers defensible entry pricing for an income-focused buyer.',
]
const CLOSINGS_LIFESTYLE = [
  'A practical choice for anyone seeking a genuine {area} address without overpaying.',
  'Viewings are recommended — honest stock in {area} at this price point rarely lingers.',
  'Convenient, well-connected and realistically priced for the current market.',
]

export const DESCRIPTION_GRAMMAR = {
  openings: OPENINGS,
  middles: { apartment: MIDDLES_APARTMENT, townhouse: MIDDLES_HOUSE, villa: MIDDLES_HOUSE, bungalow: MIDDLES_HOUSE, land: MIDDLES_LAND, commercial: MIDDLES_COMMERCIAL },
  closings: { invest: CLOSINGS_INVEST, lifestyle: CLOSINGS_LIFESTYLE },
}

/* ------------------------------ title grammar ---------------------------- */

const TITLE_ADJ = ['Bright', 'Spacious', 'Elegant', 'Modern', 'Charming', 'Refined', 'Sunny', 'Classic', 'Contemporary', 'Well-kept']
const TITLE_NOUN = {
  apartment: ['Apartment', 'City Apartment', 'Residence'],
  townhouse: ['Townhouse', 'Cluster Home'],
  villa: ['Villa', 'Family Villa'],
  bungalow: ['Bungalow', 'Garden Bungalow'],
  land: ['Acreage', 'Building Plot', 'Land Parcel'],
  commercial: ['Commercial Unit', 'Office Suite', 'Retail Space'],
}

export function titleFor(rng, type, area, beds) {
  const adj = TITLE_ADJ[Math.floor(rng() * TITLE_ADJ.length)]
  const noun = TITLE_NOUN[type][Math.floor(rng() * TITLE_NOUN[type].length)]
  const bedPart = beds >= 1 ? `${beds}-Bedroom ` : ''
  return `${adj} ${bedPart}${noun} in ${area}`
}

/* ------------------------------ rng utilities ---------------------------- */

/** Mulberry32 — small, fast, deterministic PRNG. */
export function makeRng(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0
  return h >>> 0
}

export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)]
export const pickN = (rng, arr, n) => {
  const copy = [...arr]
  const out = []
  while (out.length < Math.min(n, copy.length)) out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0])
  return out
}
export const randInt = (rng, min, max) => Math.floor(rng() * (max - min + 1)) + min
