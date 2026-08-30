/**
 * Keja Auto-Pilot - Enhanced Market Knowledge Base
 * 
 * This file extends the original market.mjs with:
 * - More detailed area data (infrastructure, security, schools, healthcare)
 * - Enhanced type definitions with investment metrics
 * - More realistic agency data
 * - Expanded amenities and features
 * - Better description grammar
 */

// Enhanced area data with infrastructure ratings
export const AREAS = [
  { area: 'Kilimani', county: 'Nairobi', ppsm: [95000, 145000], yield: 8.2, demand: 9.4, acre: [80, 160], 
    infrastructure: 9.5, security: 9.0, schools: 8.8, healthcare: 8.5, connectivity: 9.2, transport: 9.0 },
  { area: 'Westlands', county: 'Nairobi', ppsm: [100000, 150000], yield: 7.6, demand: 9.2, acre: [90, 180], 
    infrastructure: 9.2, security: 8.8, schools: 8.5, healthcare: 8.7, connectivity: 9.0, transport: 9.5 },
  { area: 'Kileleshwa', county: 'Nairobi', ppsm: [85000, 125000], yield: 8.4, demand: 8.7, acre: [70, 140], 
    infrastructure: 8.8, security: 8.5, schools: 8.2, healthcare: 8.0, connectivity: 8.5, transport: 8.2 },
  { area: 'Lavington', county: 'Nairobi', ppsm: [90000, 135000], yield: 7.4, demand: 8.9, acre: [80, 160], 
    infrastructure: 9.0, security: 9.2, schools: 9.0, healthcare: 8.8, connectivity: 8.8, transport: 8.5 },
  { area: 'Riverside', county: 'Nairobi', ppsm: [95000, 140000], yield: 7.2, demand: 8.8, acre: [85, 170], 
    infrastructure: 8.7, security: 8.5, schools: 8.0, healthcare: 8.2, connectivity: 8.7, transport: 8.8 },
  { area: 'Karen', county: 'Nairobi', ppsm: [55000, 90000], yield: 5.8, demand: 8.4, acre: [18, 45], 
    infrastructure: 7.5, security: 9.5, schools: 9.2, healthcare: 8.5, connectivity: 7.8, transport: 7.5 },
  { area: 'Runda', county: 'Nairobi', ppsm: [60000, 95000], yield: 6.0, demand: 8.5, acre: [15, 40], 
    infrastructure: 8.0, security: 9.8, schools: 9.0, healthcare: 8.8, connectivity: 8.2, transport: 8.0 },
  { area: 'Ruaka', county: 'Nairobi', ppsm: [65000, 95000], yield: 8.0, demand: 7.8, acre: [10, 28], 
    infrastructure: 7.8, security: 7.5, schools: 7.8, healthcare: 7.5, connectivity: 7.5, transport: 8.0 },
  { area: 'Kasarani', county: 'Nairobi', ppsm: [45000, 70000], yield: 8.6, demand: 7.0, acre: [5, 14], 
    infrastructure: 8.2, security: 7.0, schools: 7.5, healthcare: 7.2, connectivity: 7.8, transport: 8.5 },
  { area: 'Madaraka', county: 'Nairobi', ppsm: [70000, 100000], yield: 8.8, demand: 7.2, acre: [8, 20], 
    infrastructure: 8.5, security: 8.0, schools: 8.8, healthcare: 8.2, connectivity: 8.5, transport: 9.0 },
  { area: 'Syokimau', county: 'Machakos', ppsm: [35000, 60000], yield: 7.8, demand: 7.4, acre: [3, 9], 
    infrastructure: 7.0, security: 7.5, schools: 6.5, healthcare: 6.0, connectivity: 7.0, transport: 8.5 },
  { area: 'Kitengela', county: 'Kajiado', ppsm: [30000, 55000], yield: 7.6, demand: 7.6, acre: [2.5, 8], 
    infrastructure: 6.5, security: 6.0, schools: 5.5, healthcare: 5.0, connectivity: 6.0, transport: 7.0 },
  { area: 'Athi River', county: 'Machakos', ppsm: [25000, 45000], yield: 7.2, demand: 6.8, acre: [2, 6], 
    infrastructure: 6.0, security: 5.5, schools: 5.0, healthcare: 4.5, connectivity: 5.5, transport: 7.5 },
  { area: 'Nyali', county: 'Mombasa', ppsm: [60000, 100000], yield: 6.8, demand: 8.3, acre: [8, 25], 
    infrastructure: 8.5, security: 8.0, schools: 7.8, healthcare: 7.5, connectivity: 8.0, transport: 8.2 },
  { area: 'Diani', county: 'Kwale', ppsm: [45000, 85000], yield: 7.0, demand: 8.1, acre: [3, 12], 
    infrastructure: 7.5, security: 7.0, schools: 6.5, healthcare: 6.0, connectivity: 7.0, transport: 7.5 },
  { area: 'Milimani', county: 'Kisumu', ppsm: [40000, 70000], yield: 7.4, demand: 7.0, acre: [4, 12], 
    infrastructure: 7.0, security: 6.5, schools: 7.0, healthcare: 6.5, connectivity: 7.2, transport: 7.0 },
  { area: 'Nakuru', county: 'Nakuru', ppsm: [30000, 55000], yield: 7.8, demand: 6.6, acre: [1.5, 6], 
    infrastructure: 7.2, security: 6.8, schools: 7.0, healthcare: 7.0, connectivity: 7.0, transport: 8.0 },
  { area: 'Nanyuki', county: 'Laikipia', ppsm: [20000, 45000], yield: 6.4, demand: 6.4, acre: [0.8, 4], 
    infrastructure: 6.0, security: 7.0, schools: 6.0, healthcare: 5.5, connectivity: 5.5, transport: 6.5 },
  { area: 'Gigiri', county: 'Nairobi', ppsm: [100000, 160000], yield: 7.0, demand: 8.6, acre: [20, 50], 
    infrastructure: 9.0, security: 9.5, schools: 9.2, healthcare: 8.8, connectivity: 9.0, transport: 8.5 },
  { area: 'Muthaiga', county: 'Nairobi', ppsm: [120000, 200000], yield: 5.5, demand: 8.2, acre: [25, 60], 
    infrastructure: 9.2, security: 9.8, schools: 9.5, healthcare: 9.0, connectivity: 9.2, transport: 8.8 },
  { area: 'Rosslyn', county: 'Nairobi', ppsm: [90000, 130000], yield: 7.5, demand: 8.0, acre: [15, 35], 
    infrastructure: 8.5, security: 9.0, schools: 8.8, healthcare: 8.5, connectivity: 8.8, transport: 8.2 },
  { area: 'Spring Valley', county: 'Nairobi', ppsm: [75000, 110000], yield: 7.8, demand: 7.8, acre: [10, 25], 
    infrastructure: 8.0, security: 8.5, schools: 8.2, healthcare: 7.8, connectivity: 8.0, transport: 7.5 },
];

// Enhanced type definitions with investment characteristics
export const TYPES = [
  {
    type: 'apartment', label: 'Apartment', weight: 0.38,
    sqm: [45, 180], beds: [1, 4], baths: [1, 3],
    photos: ['apartment_0', 'apartment_1', 'apartment_2', 'interior_0', 'interior_1', 'bedroom_0'],
    appreciation: [6.5, 8.5], liquidity: 8.5, risk: 2.5, maintenance: 0.01,
    targetMarket: ['young professionals', 'expatriates', 'investors'],
    occupancyRate: [0.85, 0.95]
  },
  {
    type: 'townhouse', label: 'Townhouse', weight: 0.16,
    sqm: [120, 260], beds: [3, 5], baths: [2, 4],
    photos: ['townhouse_0', 'townhouse_1', 'interior_2', 'apartment_2'],
    appreciation: [7.0, 9.0], liquidity: 7.5, risk: 3.0, maintenance: 0.015,
    targetMarket: ['families', 'expatriates', 'investors'],
    occupancyRate: [0.80, 0.90]
  },
  {
    type: 'villa', label: 'Villa', weight: 0.12,
    sqm: [200, 450], beds: [4, 6], baths: [3, 5],
    photos: ['villa_0', 'villa_1', 'interior_0', 'townhouse_1'],
    appreciation: [7.5, 9.5], liquidity: 6.5, risk: 3.5, maintenance: 0.02,
    targetMarket: ['high-net-worth', 'diplomats', 'executives'],
    occupancyRate: [0.75, 0.85]
  },
  {
    type: 'bungalow', label: 'Bungalow', weight: 0.09,
    sqm: [90, 200], beds: [2, 4], baths: [1, 3],
    photos: ['townhouse_0', 'interior_1', 'apartment_1'],
    appreciation: [6.0, 8.0], liquidity: 7.0, risk: 3.0, maintenance: 0.012,
    targetMarket: ['families', 'retirees', 'first-time buyers'],
    occupancyRate: [0.80, 0.90]
  },
  {
    type: 'land', label: 'Land', weight: 0.17,
    sqm: [404, 40470], beds: [0, 0], baths: [0, 0],
    photos: ['land_0', 'land_1'],
    appreciation: [8.0, 12.0], liquidity: 4.0, risk: 4.0, maintenance: 0.005,
    targetMarket: ['developers', 'investors', 'speculators'],
    occupancyRate: [0, 0]
  },
  {
    type: 'commercial', label: 'Commercial', weight: 0.08,
    sqm: [80, 900], beds: [0, 0], baths: [0, 2],
    photos: ['office_0', 'office_1', 'interior_2'],
    appreciation: [5.5, 7.5], liquidity: 7.0, risk: 3.5, maintenance: 0.025,
    targetMarket: ['businesses', 'investors', 'entrepreneurs'],
    occupancyRate: [0.70, 0.85]
  },
];

// Enhanced agency data with more details
export const AGENCIES = [
  { name: 'Skyline Agents Kenya', agents: [['Mercy Wanjiru', '+254 712 400 118'], ['Peter Kariuki', '+254 720 811 340']], 
    rating: 4.9, verifiedSince: '2020', listings: 45, specialties: ['luxury', 'investment'], commissionRate: 0.02, responseTime: 2 },
  { name: 'Horizon Realtors', agents: [['Faith Njeri', '+254 733 255 902'], ['Dennis Otieno', '+254 701 644 087']], 
    rating: 4.7, verifiedSince: '2019', listings: 38, specialties: ['residential', 'commercial'], commissionRate: 0.025, responseTime: 3 },
  { name: 'Prestige Homes KE', agents: [['Alice Mumbi', '+254 726 900 451'], ['Brian Mutua', '+254 738 220 776']], 
    rating: 4.8, verifiedSince: '2021', listings: 52, specialties: ['high-end', 'diaspora'], commissionRate: 0.018, responseTime: 1 },
  { name: 'Diaspora Property Group', agents: [['Esther Kimani', '+254 705 118 663'], ['Kevin Ochieng', '+254 745 902 210']], 
    rating: 4.6, verifiedSince: '2018', listings: 28, specialties: ['diaspora', 'land'], commissionRate: 0.022, responseTime: 4 },
  { name: 'Coastal Living Estates', agents: [['Halima Yusuf', '+254 718 337 540'], ['Ali Hassan', '+254 722 684 195']], 
    rating: 4.5, verifiedSince: '2022', listings: 22, specialties: ['coastal', 'holiday'], commissionRate: 0.02, responseTime: 5 },
  { name: 'Nairobi Prime Properties', agents: [['Grace Wairimu', '+254 736 481 902'], ['Samuel Kiptoo', '+254 710 259 664']], 
    rating: 4.4, verifiedSince: '2017', listings: 35, specialties: ['city', 'apartment'], commissionRate: 0.025, responseTime: 6 },
  { name: 'Chacadom Premier Properties', agents: [['Mercy Wanjiru', '+254 712 000 001'], ['James Otieno', '+254 712 000 002']], 
    rating: 4.9, verifiedSince: '2024', listings: 6, specialties: ['verified', 'premium'], commissionRate: 0.015, responseTime: 1 },
  { name: 'Nairobi Habitat Realtors', agents: [['Faith Njeri', '+254 712 000 003']], 
    rating: 4.7, verifiedSince: '2024', listings: 4, specialties: ['residential', 'family'], commissionRate: 0.02, responseTime: 2 },
  { name: 'Savanna Heights Realty', agents: [['James Mwangi', '+254 712 000 004']], 
    rating: 4.6, verifiedSince: '2025', listings: 4, specialties: ['luxury', 'villas'], commissionRate: 0.018, responseTime: 2 },
  { name: 'Pwani Beach Homes', agents: [['Fatma Ali', '+254 712 000 005']], 
    rating: 4.8, verifiedSince: '2025', listings: 3, specialties: ['coastal', 'beach'], commissionRate: 0.02, responseTime: 3 },
  { name: 'Rift Valley Land & Homes', agents: [['Daniel Rotich', '+254 712 000 006']], 
    rating: 4.5, verifiedSince: '2024', listings: 3, specialties: ['land', 'agricultural'], commissionRate: 0.022, responseTime: 4 },
];

// Expanded amenities by type
export const AMENITIES = {
  apartment: [
    'Lift access', 'Borehole water', 'Backup generator', '24/7 security', 'Gym', 
    'Rooftop terrace', 'CCTV surveillance', 'Secure parking', 'Balcony', 
    'Fibre internet ready', 'Swimming pool', 'Children play area', 'Visitor parking',
    'Smart home ready', 'Intercom system', 'Fire safety systems'
  ],
  townhouse: [
    'Gated compound', 'Private garden', 'Solar water heating', 'Borehole water', 
    'Staff quarters', 'Double garage', 'Perimeter wall', 'Clubhouse access',
    'Backup power', 'CCTV', 'EV charger ready', 'Water storage tanks',
    'Laundry area', 'Store room'
  ],
  villa: [
    'Swimming pool', 'Half-acre garden', 'Gated community', 'Solar backup', 
    'Guest wing', 'Staff quarters', 'EV charger ready', 'Borehole + storage tanks',
    'Home theatre', 'Wine cellar', 'Gymnasium', 'Sauna', 'Jacuzzi',
    'Smart home system', 'Solar panels'
  ],
  bungalow: [
    'Solar water heating', 'Fenced compound', 'Mature garden', 'Water storage tanks', 
    'Car porch', 'Quiet cul-de-sac', 'Backup generator', 'CCTV surveillance',
    'Perimeter wall', 'Laundry area', 'Store room', 'Fireplace'
  ],
  land: [
    'Clean freehold title', 'Ready title deed', 'Graded access road', 
    'Electricity on site', 'Water on site', 'Beaconed boundaries', 
    'Near tarmac road', 'Survey plan available', 'Soil test done',
    'Environmental approval', 'Road access', 'Clear title',
    'Development approval', 'Fenced perimeter'
  ],
  commercial: [
    'Grade-A finishes', 'Raised floors', 'Central A/C', 'Ample parking bays', 
    'Fibre backbone', '100% backup power', 'Loading bay', 'Conference facilities',
    'Kitchenette', 'Reception area', 'Fire safety systems', 'Disabled access',
    'Lift access', 'Security system', 'Pantry', 'Boardroom'
  ],
};

// Points of interest by area
export const POI = {
  Kilimani: ['Yaya Centre', 'Prestige Plaza', 'Kilimani Primary', 'Nairobi Hospital', 'University of Nairobi'],
  Westlands: ['Sarit Centre', 'Westgate Mall', 'Peponi School', 'Aga Khan Hospital', 'Village Market'],
  Kileleshwa: ['Kileleshwa Primary', 'Lavington Mall', 'Gitanga Road shops', 'Nairobi West Hospital'],
  Lavington: ['Lavington Mall', 'Jaffery Academy', 'Riara Road', 'Mater Hospital'],
  Riverside: ['Riverside Drive offices', 'Chiromo Lane', 'Riverside Square', 'MP Shah Hospital'],
  Karen: ['Karen Country Club', 'The Hub Karen', 'Karen Blixen Museum', 'Karen Hospital'],
  Runda: ['Runda Mhasibu shops', 'Village Market', 'Gigiri UN complex', 'Aga Khan University Hospital'],
  Ruaka: ['Two Rivers Mall', 'Ruaka town centre', 'Limuru Road corridor', 'Kiambu Hospital'],
  Kasarani: ['Kasarani stadium', 'Thika Road Mall', 'Garden City', 'Kenyatta University Hospital'],
  Madaraka: ['Strathmore University', 'Madaraka shops', 'Nairobi Expressway ramp', 'Mbagathi Hospital'],
  Syokimau: ['SGR terminus', 'JKIA access road', 'Mlolongo interchange', 'Machakos Hospital'],
  Kitengela: ['Kitengela town', 'Namanga Road', 'Eastleigh-Kitengela bypass', 'Kitengela Sub-County Hospital'],
  'Athi River': ['Mombasa Road corridor', 'EPZ industrial zone', 'Daystar University', 'Athi River Sub-County Hospital'],
  Nyali: ['Nyali Centre', 'Mombasa Marine Park', 'Links Road hospitals', 'Coast General Hospital'],
  Diani: ['Diani Beach', 'Ukunda airstrip', 'Baharini shopping plaza', 'Diani Beach Hospital'],
  Milimani: ['Kisumu CBD', 'Lake Victoria shoreline', 'Milimani estates', 'Kisumu County Hospital'],
  Nakuru: ['Nakuru town CBD', 'Lake Nakuru National Park', 'Kabarak Road', 'Nakuru County Hospital'],
  Nanyuki: ['Nanyuki town', 'Mount Kenya foothills', 'Ol Pejeta conservancy', 'Nanyuki Cottage Hospital'],
  Gigiri: ['UN Headquarters', 'Village Market', 'Gigiri Shopping Centre', 'Aga Khan University Hospital'],
  Muthaiga: ['Muthaiga Country Club', 'Muthaiga Shopping Centre', 'Karura Forest', 'Aga Khan Hospital'],
  Rosslyn: ['Rosslyn Riviera Mall', 'Gigiri', 'UNEP Headquarters', 'Mater Hospital'],
  'Spring Valley': ['Spring Valley Shopping Centre', 'Rosslyn Academy', 'Karura Forest', 'Nairobi West Hospital'],
};

// Tenant mix descriptions
export const TENANT_MIX = [
  'young professional', 'expatriate family', 'diaspora investor', 
  'corporate tenant', 'growing family', 'retiree', 'student',
  'diplomatic', 'executive', 'entrepreneur'
];

// Corridors and transport links
export const CORRIDORS = [
  'expressway', 'bypass', 'SGR', 'airport', 'highway',
  'main road', 'access road', 'service lane'
];

/* Description grammar */

const OPENINGS = [
  'A well-presented {typeLabel} in {area}, {county}, offering {sqm} sqm of bright, efficiently planned space.',
  'Set in the heart of {area}, this {typeLabel} delivers {sqm} sqm of comfortable living with genuine character.',
  'This {sqm} sqm {typeLabel} in {area} has been finished to a practical standard and priced with discipline.',
  'Rarely available: a {typeLabel} in {area} combining space ({sqm} sqm), light and a convenient address.',
  'An honest, well-maintained {typeLabel} in {area} — {sqm} sqm of sensible layout for owners and investors alike.',
  'Discover this {typeLabel} in {area}, where {sqm} sqm of thoughtfully designed space meets prime location.',
  'Nestled in {area}, this {typeLabel} offers {sqm} sqm of functional living space with modern amenities.',
  'A prime {typeLabel} opportunity in {area}: {sqm} sqm of quality space at a competitive price point.',
];

const MIDDLES_APARTMENT = [
  'The layout flows from a welcoming entrance into an open living area, with bedrooms positioned for privacy.',
  'Interiors are clean and neutral, ready for immediate occupation or a light personal refresh.',
  'Large windows pull in natural light throughout the day; the kitchen is functional and generously fitted.',
  'The development features modern finishes, with attention to detail evident throughout the unit.',
  'Strategically located within the complex, this unit benefits from both convenience and tranquility.',
];

const MIDDLES_HOUSE = [
  'Living areas open onto a private garden, and the bedrooms are all generously proportioned.',
  'The property sits on a mature, well-kept compound with room for family life and entertaining.',
  'A calm street position keeps the setting quiet while keeping the neighbourhood amenities close.',
  'Quality construction is evident, with durable materials used throughout the home.',
  'The floor plan has been designed for both comfort and functionality, with a good flow between rooms.',
];

const MIDDLES_LAND = [
  'The parcel is beaconed, with graded access and utilities available at the boundary.',
  'A level, dry parcel suitable for immediate development or a medium-term hold.',
  'Documentation is available for inspection; the holding is clean and transfer-ready.',
  'Strategically located with excellent road access, this plot offers great development potential.',
  'With clear title and all necessary approvals in place, development can commence immediately.',
];

const MIDDLES_COMMERCIAL = [
  'The floor plate is flexible for office, retail or clinic use, with parking and services in place.',
  'Common areas are managed, and the building enjoys stable tenancy in a business-friendly location.',
  'Infrastructure — power backup, connectivity and parking — supports immediate occupation.',
  'Designed for modern business needs, the space can be easily customized to suit various commercial uses.',
  'Located in a thriving business district, this unit benefits from high foot traffic and excellent visibility.',
];

const CLOSINGS_INVEST = [
  'At {pricePerSqm}/sqm the pricing sits {priceGrade} the {area} band, and the area yield band of {yieldPct}% supports a solid income case.',
  'The {area} market band and {yieldPct}% yield environment make this a disciplined income or appreciation play.',
  'Benchmarked against comparable stock in {area}, this listing offers defensible entry pricing for an income-focused buyer.',
  'With a projected ROI based on area yields of {yieldPct}%, this represents a sound investment opportunity.',
  'The combination of location, pricing, and yield potential makes this an attractive proposition for investors.',
];

const CLOSINGS_LIFESTYLE = [
  'A practical choice for anyone seeking a genuine {area} address without overpaying.',
  'Viewings are recommended — honest stock in {area} at this price point rarely lingers.',
  'Convenient, well-connected and realistically priced for the current market.',
  'Offering excellent value for money, this property is ready for immediate occupation.',
  'Don\'t miss the opportunity to own a piece of {area} at this competitive price.',
];

// Enhanced description grammar with more variety
export const DESCRIPTION_GRAMMAR = {
  openings: OPENINGS,
  middles: {
    apartment: MIDDLES_APARTMENT,
    townhouse: MIDDLES_HOUSE,
    villa: MIDDLES_HOUSE,
    bungalow: MIDDLES_HOUSE,
    land: MIDDLES_LAND,
    commercial: MIDDLES_COMMERCIAL
  },
  closings: { invest: CLOSINGS_INVEST, lifestyle: CLOSINGS_LIFESTYLE },
};

// Title grammar enhancements
const TITLE_ADJ = [
  'Bright', 'Spacious', 'Elegant', 'Modern', 'Charming', 'Refined', 
  'Sunny', 'Classic', 'Contemporary', 'Well-kept', 'Stunning',
  'Luxurious', 'Exclusive', 'Prime', 'Beautiful', 'Immaculate'
];

const TITLE_NOUN = {
  apartment: ['Apartment', 'City Apartment', 'Residence', 'Flat', 'Unit'],
  townhouse: ['Townhouse', 'Cluster Home', 'Terraced House', 'Maisonette'],
  villa: ['Villa', 'Family Villa', 'Luxury Villa', 'Executive Home'],
  bungalow: ['Bungalow', 'Garden Bungalow', 'Single-Storey Home', 'Cottage'],
  land: ['Acreage', 'Building Plot', 'Land Parcel', 'Development Plot'],
  commercial: ['Commercial Unit', 'Office Suite', 'Retail Space', 'Business Premises'],
};

const TITLE_LOCATIONS = {
  apartment: ['with City Views', 'in Prime Location', 'Near Amenities', 'with Balcony'],
  townhouse: ['in Gated Community', 'with Private Garden', 'with Modern Finishes'],
  villa: ['with Pool', 'on Half Acre', 'with Mature Garden', 'with Staff Quarters'],
  bungalow: ['on Quiet Street', 'with Large Plot', 'with Modern Amenities'],
  land: ['with Road Access', 'with Title Deed', 'Ready for Development'],
  commercial: ['in Business District', 'with Parking', 'with High Visibility'],
};

// Enhanced title generation
export function titleFor(rng, type, area, beds) {
  const adj = TITLE_ADJ[Math.floor(rng() * TITLE_ADJ.length)]
  const noun = TITLE_NOUN[type][Math.floor(rng() * TITLE_NOUN[type].length)]
  const bedPart = beds >= 1 ? `${beds}-Bedroom ` : ''
  const location = TITLE_LOCATIONS[type][Math.floor(rng() * TITLE_LOCATIONS[type].length)]
  
  return `${adj} ${bedPart}${noun} in ${area} - ${location}`
}

// Additional market data for better pricing
export const MARKET_TRENDS = {
  inflationRate: 0.065, // 6.5% annual inflation
  interestRate: 0.135, // 13.5% average mortgage rate
  currencyExchange: 130, // KES per USD
  constructionCost: 55000, // KES per sqm average
  landAppreciation: [0.08, 0.15], // 8-15% annual
  propertyAppreciation: [0.05, 0.12], // 5-12% annual
};

// Investment metrics by area
export const AREA_INVESTMENT_METRICS = AREAS.map(area => ({
  ...area,
  capitalGrowth: [4 + (area.demand - 7) * 0.5, 8 + (area.demand - 7) * 0.5],
  rentalGrowth: [3 + (area.demand - 7) * 0.3, 6 + (area.demand - 7) * 0.3],
  vacancyRate: 0.1 - (area.demand - 7) * 0.01,
  liquidityScore: 5 + (area.demand - 7) * 0.5 + (area.infrastructure - 7) * 0.3,
}));

/* RNG utilities */

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

export default {
  AREAS,
  TYPES,
  AGENCIES,
  AMENITIES,
  POI,
  TENANT_MIX,
  CORRIDORS,
  DESCRIPTION_GRAMMAR,
  titleFor,
  makeRng,
  hashString,
  pick,
  pickN,
  randInt,
  MARKET_TRENDS,
  AREA_INVESTMENT_METRICS
};
