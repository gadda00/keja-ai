import {
  Banknote,
  CalendarDays,
  Droplets,
  HeartPulse,
  Landmark,
  Store,
  Tent,
  Trees,
  TrendingUp,
  UtensilsCrossed,
  Waves,
} from 'lucide-react';

import type { Property } from '@/data/properties';

/**
 * Neighbourhood guides — editorial, research-backed location deep-dives that
 * complement raw listings with the "why this area" layer.
 *
 * Everything sourced from public reporting is labelled REPORTED and listed
 * in `sources`; keja's fact/estimate/assumption discipline applies.
 */

export interface NeighborhoodStat {
  value: string;
  label: string;
  /** Provenance label — keja's honesty discipline. */
  note?: string;
}

export interface NeighborhoodAmenity {
  icon: typeof Store;
  title: string;
  text: string;
}

export interface GalleryImage {
  /** path under public/ without extension, e.g. /images/waterfront/waterfront-hero */
  base: string;
  alt: string;
  width: number;
  height: number;
}

export interface NeighborhoodVideo {
  /** YouTube video id (loaded only after an explicit click — see VideoFacade). */
  id: string;
  title: string;
  channel: string;
}

export interface NeighborhoodGuide {
  slug: string;
  name: string;
  shortName: string;
  /** Property.area value used to join the guide with live marketplace inventory. */
  area: string;
  location: string;
  tagline: string;
  summary: string;
  hero: GalleryImage;
  stats: NeighborhoodStat[];
  amenities: NeighborhoodAmenity[];
  investmentThesis: { icon: typeof TrendingUp; title: string; text: string }[];
  gallery: GalleryImage[];
  video: NeighborhoodVideo;
  sources: { label: string; url: string }[];
  /** Provenance note for the photography shown on the guide. */
  photoNote?: string;
  lastReviewed: string;
}

const img = (base: string, alt: string, width: number, height: number): GalleryImage => ({
  base,
  alt,
  width,
  height,
});

export const WATERFRONT_KAREN: NeighborhoodGuide = {
  slug: 'waterfront-karen',
  name: 'The Waterfront Karen',
  shortName: 'Waterfront Karen',
  area: 'Karen',
  location: 'Karen, Nairobi · Kenya',
  tagline: 'A lakeside town centre in Nairobi’s premier low-density suburb',
  summary:
    'The Waterfront Karen is Karen’s world-class mixed-use town centre — shopping, dining, family play and wellness arranged around a lakeside setting, minutes from the suburb’s leafy lanes. Since opening in 2018 it has become the lifestyle anchor of the Karen corridor, and reported 2026 plans to expand onto a 50.6-acre flagship site with homes, offices and a hotel make the surrounding neighbourhood one of the most closely watched addresses in Nairobi.',
  hero: img(
    '/images/waterfront/wf-entrance',
    'The Waterfront Karen — main entrance and signature blue signage on Karen Road',
    1200,
    665
  ),
  stats: [
    { value: '2018', label: 'Opened' },
    { value: '13 acres', label: 'Town-centre campus' },
    { value: '~200,000', label: 'Sq ft of retail & leisure', note: 'Phase 1, reported' },
    { value: '50.6 acres', label: 'Flagship expansion site', note: 'Reported 2026' },
    { value: 'KES 9B', label: 'Reported 2026 transaction', note: 'Incl. expansion site' },
  ],
  amenities: [
    {
      icon: Store,
      title: 'Everyday shopping',
      text: 'Naivas-anchored retail court — supermarkets, fashion, home & appliances and services under one roof.',
    },
    {
      icon: Droplets,
      title: 'Maji Magic Aqua Park',
      text: 'Nairobi’s best-known aqua park: 40+ inflatable water obstacles and slides on the lake. East Africa’s top-rated family day out.',
    },
    {
      icon: Tent,
      title: 'Paintball Fury',
      text: 'Adventure play for teams and birthdays — a weekend ritual for Karen families.',
    },
    {
      icon: UtensilsCrossed,
      title: 'Dining & cafés',
      text: 'From quick bites to leisurely weekend brunch — the suburb’s most complete food court in one place.',
    },
    {
      icon: HeartPulse,
      title: 'Health & wellness',
      text: 'Medical centre, opticians and fitness studios on-site — complete harmony of body, mind and spirit.',
    },
    {
      icon: Banknote,
      title: 'Banking & money',
      text: 'Bank branches, forex and M-Pesa agent banking — diaspora errands done in one stop.',
    },
    {
      icon: Trees,
      title: 'Lakeside & pet-friendly',
      text: 'A lakeside walking track you can walk your dog along — the “waterfront” is literal, not marketing.',
    },
    {
      icon: CalendarDays,
      title: 'Year-round events',
      text: 'Carols Under the Stars, Colour Mania, health & fitness weekends and classic-rally flag-offs animate the calendar.',
    },
  ],
  investmentThesis: [
    {
      icon: Landmark,
      title: 'Institutional validation',
      text: 'A reported KES 9 billion (~USD 70M) 2026 transaction involving the town centre and its expansion land is the kind of institutional conviction that reprices an entire corridor — Nairobi’s most recognised retail asset outside the CBD rings.',
    },
    {
      icon: TrendingUp,
      title: 'The 50.6-acre catalyst',
      text: 'The reported expansion plan — residential units, an offices/business park and a hotel on 50.6 flagship acres — would add homes, jobs and daily footfall to a neighbourhood that already trades at a premium for its quiet. Catalysts like this historically lead price, not follow it.',
    },
    {
      icon: Waves,
      title: 'Karen fundamentals',
      text: 'Nairobi’s premier low-density suburb: half-acre plots, mature trees, diplomatic and executive residents. Keja’s market bands put verified Karen stock at KES 165k–195k per sqm, with capital growth — not rental income — as the story.',
    },
  ],
  gallery: [
    img(
      '/images/waterfront/wf-promenade',
      'The lakeside promenade at The Waterfront Karen — brick paving, palms and open water',
      1000,
      750
    ),
    img(
      '/images/waterfront/wf-lake',
      'The calm lake at The Waterfront Karen — the “waterfront” is literal, not marketing',
      1000,
      750
    ),
    img(
      '/images/waterfront/wf-dining',
      'Outdoor dining terraces under the town centre’s geometric facades',
      1000,
      750
    ),
    img(
      '/images/waterfront/wf-restaurant',
      'Glass-fronted restaurant with a view over the lake',
      1000,
      750
    ),
    img(
      '/images/waterfront/wf-lounge',
      'Lounge terraces with palms — the suburb’s living room',
      1000,
      750
    ),
    img(
      '/images/waterfront/wf-sunset-lake',
      'Maji Magic Aqua Park on the lake at dusk — the weekend family ritual',
      1200,
      675
    ),
    img(
      '/images/waterfront/wf-complex',
      'The Waterfront Karen’s white terraces and glass balconies above the lawns',
      1000,
      750
    ),
    img(
      '/images/waterfront/karen-villa-pool',
      'A Karen home with pool and mature garden, minutes from The Waterfront',
      1600,
      575
    ),
  ],
  video: {
    id: 'zDlefHy09pg',
    title: 'The Waterfront, Karen — Things To Do, Prices & Location',
    channel: 'Kyls Journal (YouTube)',
  },
  sources: [
    { label: 'The Waterfront Karen (official)', url: 'https://thewaterfrontkaren.com' },
    {
      label: 'Business Daily Africa — Mugukus in talks to sell Sh9bn Waterfront Karen mall',
      url: 'https://www.businessdailyafrica.com/bd/corporate/companies/mugukus-in-talks-to-sell-sh9bn-waterfront-mall-5533714',
    },
    {
      label: 'Construction Kenya — Waterfront Karen heads for Sh9bn sale',
      url: 'https://www.constructionkenya.com/13483/waterfront-karen-mall',
    },
  ],
  /** Campus photos captured on the ground; lifestyle shots representative. */
  photoNote:
    'Campus photographs taken at The Waterfront Karen (2026); lifestyle images representative of the Karen market.',
  lastReviewed: '2026-09-01',
};

export const NEIGHBORHOOD_GUIDES: NeighborhoodGuide[] = [WATERFRONT_KAREN];

export const getNeighborhoodGuide = (slug: string) =>
  NEIGHBORHOOD_GUIDES.find((g) => g.slug === slug);

/** Listings inside the guide’s anchor area carry the waterfront halo. */
export const isNearWaterfront = (p: Pick<Property, 'area'>) =>
  NEIGHBORHOOD_GUIDES.some((g) => g.area === p.area);

/** Count of live marketplace listings in a guide’s anchor area. */
export const guideInventoryCount = (g: NeighborhoodGuide, all: Property[]) =>
  all.filter((p) => p.area === g.area).length;
