/**
 * Area gazetteer — approximate centres for the marketplace's areas
 * (audit F-12 / P2-4). Powers the clustered results map; coordinates are
 * good enough for neighbourhood-level clustering, not for navigation.
 */
export interface AreaCoord {
  lat: number;
  lng: number;
}

export const AREA_COORDS: Record<string, AreaCoord> = {
  // Nairobi
  'CBD': { lat: -1.2864, lng: 36.8172 },
  'Westlands': { lat: -1.2649, lng: 36.8039 },
  'Kilimani': { lat: -1.2921, lng: 36.7827 },
  'Kileleshwa': { lat: -1.2832, lng: 36.7728 },
  'Lavington': { lat: -1.2799, lng: 36.7586 },
  'Riverside': { lat: -1.2746, lng: 36.7683 },
  'Karen': { lat: -1.3197, lng: 36.7076 },
  'Runda': { lat: -1.2135, lng: 36.7963 },
  'Kasarani': { lat: -1.2243, lng: 36.8962 },
  'Madaraka': { lat: -1.3096, lng: 36.8147 },
  'Eastleigh': { lat: -1.2851, lng: 36.8459 },
  // Kiambu / satellite towns
  'Ruaka': { lat: -1.2167, lng: 36.7833 },
  'Ruiru': { lat: -1.0833, lng: 36.9667 },
  'Tatu City': { lat: -1.1167, lng: 36.9833 },
  // Machakos corridor
  'Syokimau': { lat: -1.35, lng: 36.9167 },
  'Athi River': { lat: -1.4563, lng: 36.9781 },
  'Kantafu': { lat: -1.4167, lng: 37.1167 },
  // Kajiado
  'Kitengela': { lat: -1.85, lng: 36.7833 },
  // Coast
  'Nyali': { lat: -4.0435, lng: 39.6682 },
  'Diani': { lat: -4.2872, lng: 39.5906 },
  // Upcountry
  'Nakuru': { lat: -0.3031, lng: 36.08 },
  'Milimani': { lat: -0.2862, lng: 36.0669 }, // Nakuru Milimani (Kisumu Milimani below overrides via county)
  'Nanyuki': { lat: 0.0167, lng: 37.0719 },
};

/** Kisumu's Milimani sits apart from Nakuru's — county-aware lookup. */
const COUNTY_OVERRIDES: Record<string, AreaCoord> = {
  'Milimani|Kisumu': { lat: -0.1, lng: 34.75 },
};

export function coordFor(area: string, county: string): AreaCoord | null {
  const override = COUNTY_OVERRIDES[`${area}|${county}`];
  if (override) return override;
  return AREA_COORDS[area] ?? null;
}
