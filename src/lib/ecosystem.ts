'use client';
/**
 * KEJA ecosystem map (proposal §2) — the nine products, their routes and
 * positioning. Single source of truth for the navbar mega-menu, the homepage
 * ecosystem grid, the footer and the ecosystem page.
 */
import {
  BarChart3,
  Building2,
  Coins,
  FileSignature,
  Home,
  Landmark,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

export interface EcosystemProduct {
  key: string;
  name: string;
  tagline: string;
  description: string;
  route: string;
  icon: LucideIcon;
  status: 'LIVE' | 'TRIAL' | 'PILOT';
  accent: string;
}

export const ECOSYSTEM: EcosystemProduct[] = [
  {
    key: 'home',
    name: 'Keja Home',
    tagline: 'Discover',
    description: 'Property discovery and listings — verified homes, land and commercial assets across Kenya.',
    route: '/properties',
    icon: Home,
    status: 'LIVE',
    accent: 'text-primary',
  },
  {
    key: 'verify',
    name: 'Keja Verify',
    tagline: 'Verify',
    description: 'Property, ownership, documentation and listing verification — the trust layer under every listing.',
    route: '/trust',
    icon: ShieldCheck,
    status: 'LIVE',
    accent: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'ai',
    name: 'Keja AI',
    tagline: 'Analyse',
    description: 'AI property advisor and deal analysis — the Deal Analyst reads your documents before you commit.',
    route: '/ask',
    icon: Sparkles,
    status: 'LIVE',
    accent: 'text-gold',
  },
  {
    key: 'invest',
    name: 'Keja Invest',
    tagline: 'Invest',
    description: 'Investment analysis, ROI, yield and opportunity assessment — with the investor dashboard.',
    route: '/invest',
    icon: TrendingUp,
    status: 'LIVE',
    accent: 'text-primary',
  },
  {
    key: 'finance',
    name: 'Keja Finance',
    tagline: 'Finance',
    description: 'Property financing — mortgages, eligibility and bank comparison, development to diaspora finance.',
    route: '/finance',
    icon: Landmark,
    status: 'PILOT',
    accent: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'transact',
    name: 'Keja Transact',
    tagline: 'Transact',
    description: 'Digital transaction support and professional-service integration — lawyers, valuers, conveyancing.',
    route: '/transact',
    icon: FileSignature,
    status: 'PILOT',
    accent: 'text-gold',
  },
  {
    key: 'token',
    name: 'Keja Token',
    tagline: 'Tokenize',
    description: 'Fractional real-estate ownership — TRIAL MODE with fictional assets and a virtual wallet.',
    route: '/tokenize',
    icon: Coins,
    status: 'TRIAL',
    accent: 'text-gold',
  },
  {
    key: 'manage',
    name: 'Keja Manage',
    tagline: 'Manage',
    description: 'Property and rental management — rent collection, tenants, maintenance and AI alerts.',
    route: '/manage',
    icon: Building2,
    status: 'PILOT',
    accent: 'text-primary',
  },
  {
    key: 'data',
    name: 'Keja Data',
    tagline: 'Understand',
    description: 'Real-estate market intelligence and analytics — ask the market anything, get sourced answers.',
    route: '/data',
    icon: BarChart3,
    status: 'LIVE',
    accent: 'text-emerald-600 dark:text-emerald-400',
  },
];

/** The stakeholder portals (proposal §8 §10 §11 §17). */
export const PORTALS = [
  { name: 'Diaspora', route: '/diaspora', description: 'Invest in Kenya from anywhere in the world.' },
  { name: 'Developers', route: '/develop', description: 'Verified project profiles and the Development Score.' },
  { name: 'Institutional', route: '/institutional', description: 'Banks, pension funds, REITs, SACCOs and insurers.' },
  { name: 'Partners', route: '/partners', description: 'Partner with Keja — request the partnership deck.' },
];

/** Verified platform metrics for social proof (proposal §16). */
export const PLATFORM_METRICS = [
  { value: '86', label: 'Properties verified', suffix: '+' },
  { value: '124', label: 'Trust analyses run daily', suffix: '' },
  { value: '9', label: 'Ecosystem products', suffix: '' },
  { value: '3', label: 'Languages — EN · SW · FR', suffix: '' },
];
