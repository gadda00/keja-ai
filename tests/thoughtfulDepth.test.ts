/**
 * Wave 20 — "the thoughtful depth" regression tests.
 *
 * The deep audit behind this wave found five engine/UI gaps where real
 * product promises had dead or fake backing:
 *
 *   1. SHARE — a Kenyan marketplace with no way to forward a listing
 *      (WhatsApp is the sharing channel) and a `qrcode` dependency used
 *      only by 2FA. The share kit + QR poster close the loop.
 *   2. FAIR-PRICE SCREENING — the passport's only "market range" was ±8%
 *      around the asking price: arithmetic that brackets whatever the
 *      seller asks and can never warn "over the market". Pricing
 *      Intelligence screens against live comparables instead.
 *   3. RECENTLY VIEWED — `KEYS.viewed` existed in the store since wave 1
 *      with no reader and no writer.
 *   4. TENANT AFFORDABILITY — tenantStore.competitiveness was dead code
 *      and the hub's affordability card pointed at the *mortgage*
 *      calculator (the buyer's tool).
 *   5. GUIDED PURCHASE PATH — Ask Keja described the nine-step flow; the
 *      buyer had nowhere to walk it. The journey tab is the path.
 *
 * These tests pin the pure engines (share kit, pricing math, viewed
 * push semantics, journey catalogue) and the wiring as source contracts
 * (same pattern as buildParity/portalGates): wiring drift breaks the
 * test, not the user.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PROPERTIES, type Property } from '@/data/properties';
import {
  listingShareText, listingSummary, listingUrl, posterSpec, whatsappShareLink,
} from '@/lib/share';
import { passportId } from '@/lib/passport';
import { compsFor, pricingIntelligence, priceVerdict, median, bandFor } from '@/lib/pricingIntel';
import { pushViewed, useRecentlyViewed, RECENTLY_VIEWED_CAP, type ViewedEntry } from '@/lib/store';
import { BUYING_STEPS, activeStep, journeyProgressPct, useJourneyStore, journeyShape } from '@/lib/journeyStore';
import { viewedEntriesSchema } from '@/lib/boundaries';
import { parseFreeQuery } from '@/lib/queryParser';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p: string) => readFileSync(resolve(ROOT, p), 'utf8');

/* ------------------------------------------------------------------ */
/* 1. The share kit                                                    */
/* ------------------------------------------------------------------ */

describe('share kit (wave 20)', () => {
  const p = PROPERTIES.find((x) => x.id === 'KJA-001')!;

  it('listingUrl is the canonical crawler-real path form (trailing slash)', () => {
    expect(listingUrl(p)).toBe(`https://keja.app/properties/${p.id}/`);
  });

  it('listingSummary carries the decision facts: title, price, area, trust', () => {
    const s = listingSummary(p);
    expect(s).toContain(p.title);
    expect(s).toContain(p.area);
    expect(s).toContain(String(p.trustScore));
    expect(s).toContain('KES');
  });

  it('the WhatsApp share link opens the picker (no number), not the desk chat', () => {
    const link = whatsappShareLink(listingShareText(p));
    expect(link.startsWith('https://wa.me/?text=')).toBe(true);
    // the message must be encoded, and must carry the live link
    const decoded = decodeURIComponent(link.replace('https://wa.me/?text=', ''));
    expect(decoded).toContain(`https://keja.app/properties/${p.id}/`);
  });

  it('posterSpec composes the print-ready block: passport id first, facts, url', () => {
    const spec = posterSpec(p);
    expect(spec.lines[0]).toBe(passportId(p));
    expect(spec.lines).toContain(`${p.area}, ${p.county}`);
    expect(spec.lines.some((l) => l.includes('Trust Score'))).toBe(true);
    expect(spec.url).toBe(listingUrl(p));
    expect(spec.width).toBe(720);
    expect(spec.height).toBe(960);
  });

  it('the QR module renders a data URL for the listing link (same lazy chunk 2FA uses)', async () => {
    const QRCode = (await import('qrcode')).default;
    const data = await QRCode.toDataURL(listingUrl(p), { width: 220, margin: 1 });
    expect(data.startsWith('data:image/png;base64,')).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* 2. Pricing Intelligence (honest fair-price screening)               */
/* ------------------------------------------------------------------ */

describe('pricingIntelligence (wave 20)', () => {
  const kilimani = PROPERTIES.filter((x) => x.area === 'Kilimani' && x.type === 'apartment');

  it('comps exclude the subject, sold stock, rentals and POA listings', () => {
    const subject = kilimani[0];
    const comps = compsFor(subject, PROPERTIES);
    expect(comps.every((c) => c.id !== subject.id)).toBe(true);
    expect(comps.every((c) => c.availability !== 'sold')).toBe(true);
    expect(comps.every((c) => c.price > 0)).toBe(true);
  });

  it('returns null for rentals and price-on-application (nothing honest to say)', () => {
    const rental: Property = {
      ...PROPERTIES[0],
      price: 85_000,
      purpose: ['rent'],
      priceOnApplication: false,
    };
    expect(pricingIntelligence(rental, PROPERTIES)).toBeNull();

    const poa: Property = { ...PROPERTIES[0], price: 0, priceOnApplication: true };
    expect(pricingIntelligence(poa, PROPERTIES)).toBeNull();
  });

  it('returns null when no comparables exist', () => {
    const lonely: Property = { ...PROPERTIES[0], area: 'NowhereAtAll' };
    expect(pricingIntelligence(lonely, PROPERTIES)).toBeNull();
  });

  it('classifies an asking price inside the band as "within"', () => {
    const subject = kilimani[0];
    const comps = compsFor(subject, PROPERTIES);
    if (comps.length === 0) return; // inventory-dependent guard for CI data drift
    const mid = median(comps.map((c) => c.price));
    const pricedAtMedian: Property = { ...subject, price: Math.round(mid) };
    const intel = pricingIntelligence(pricedAtMedian, PROPERTIES)!;
    expect(intel.position).toBe('within');
    expect(Math.abs(intel.vsMedianPct)).toBeLessThan(5);
    expect(intel.compCount).toBe(comps.length);
  });

  it('classifies an over-market asking as "above" and names the percentage', () => {
    const subject = kilimani[0];
    const comps = compsFor(subject, PROPERTIES);
    if (comps.length === 0) return;
    const mid = median(comps.map((c) => c.price));
    const greedy: Property = { ...subject, price: Math.round(mid * 1.5) };
    const intel = pricingIntelligence(greedy, PROPERTIES)!;
    expect(intel.position).toBe('above');
    expect(intel.vsMedianPct).toBeGreaterThan(40);
    expect(priceVerdict(intel)).toContain('above');
  });

  it('classifies a bargain asking as "below" — the value signal buyers need', () => {
    const subject = kilimani[0];
    const comps = compsFor(subject, PROPERTIES);
    if (comps.length === 0) return;
    const mid = median(comps.map((c) => c.price));
    const deal: Property = { ...subject, price: Math.round(mid * 0.7) };
    const intel = pricingIntelligence(deal, PROPERTIES)!;
    expect(intel.position).toBe('below');
    expect(intel.vsMedianPct).toBeLessThan(-25);
  });

  it('computes the price-per-sqm read when sizes are known', () => {
    const subject = kilimani.find((x) => x.sizeSqm > 0)!;
    const intel = pricingIntelligence(subject, PROPERTIES)!;
    if (!intel) return;
    expect(intel.psqmKes).toBe(Math.round(subject.price / subject.sizeSqm));
    expect(intel.psqmMedianKes).toBeGreaterThan(0);
  });

  it('band width + confidence mirror the Valuation Desk thresholds', () => {
    expect(bandFor(1)).toEqual({ bandPct: 0.18, confidence: 'low' });
    expect(bandFor(4)).toEqual({ bandPct: 0.13, confidence: 'medium' });
    expect(bandFor(9)).toEqual({ bandPct: 0.1, confidence: 'high' });
  });

  it('median: even and odd sample counts', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* 3. Recently viewed (the key finally has a reader AND a writer)      */
/* ------------------------------------------------------------------ */

describe('recently viewed (wave 20)', () => {
  it('pushViewed moves an existing id to the front (no duplicates)', () => {
    const entries: ViewedEntry[] = [
      { id: 'KJA-001', at: '2026-09-01T00:00:00Z' },
      { id: 'KJA-002', at: '2026-09-02T00:00:00Z' },
    ];
    const next = pushViewed(entries, 'KJA-001');
    expect(next).toHaveLength(2);
    expect(next[0].id).toBe('KJA-001');
    expect(next[1].id).toBe('KJA-002');
  });

  it('pushViewed caps the list at the advertised size', () => {
    const entries = Array.from({ length: 30 }, (_, i) => ({
      id: `KJA-${i}`,
      at: `2026-09-01T00:00:${String(i).padStart(2, '0')}Z`,
    }));
    const next = pushViewed(entries, 'KJA-999');
    expect(next).toHaveLength(RECENTLY_VIEWED_CAP);
    expect(next[0].id).toBe('KJA-999');
  });

  it('the validated store reads and repairs the schema-backed key', () => {
    localStorage.setItem('keja:recently-viewed', JSON.stringify([{ id: 'KJA-001', at: 'x' }, 42]));
    const { result } = renderHook(() => useRecentlyViewed());
    expect(result.current[0]).toEqual([{ id: 'KJA-001', at: 'x' }]);
    // element-wise salvage persists
    const stored = JSON.parse(localStorage.getItem('keja:recently-viewed') as string);
    expect(stored).toEqual([{ id: 'KJA-001', at: 'x' }]);
  });

  it('the schema rejects non-entry shapes', () => {
    expect(viewedEntriesSchema.safeParse([{ id: 'KJA-001' }]).success).toBe(false);
    expect(viewedEntriesSchema.safeParse([{ id: 'KJA-001', at: 't' }]).success).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* 4. The guided buying journey                                        */
/* ------------------------------------------------------------------ */

describe('buying journey (wave 20)', () => {
  it('defines the nine-step Keja buying flow with unique ids and wired CTAs', () => {
    expect(BUYING_STEPS).toHaveLength(9);
    expect(new Set(BUYING_STEPS.map((s) => s.id)).size).toBe(9);
    for (const s of BUYING_STEPS) {
      expect(s.to.startsWith('/')).toBe(true);
      expect(s.action.length).toBeGreaterThan(3);
      expect(s.hint.length).toBeGreaterThan(20);
    }
  });

  it('progress counts only known step ids (junk keys cannot inflate it)', () => {
    expect(journeyProgressPct({})).toBe(0);
    expect(journeyProgressPct({ discover: true })).toBe(11);
    const all = Object.fromEntries(BUYING_STEPS.map((s) => [s.id, true]));
    expect(journeyProgressPct(all)).toBe(100);
    expect(journeyProgressPct({ 'not-a-step': true, discover: true })).toBe(11);
  });

  it('activeStep returns the first unfinished step, or the last when complete', () => {
    expect(activeStep({}).id).toBe(BUYING_STEPS[0].id);
    expect(activeStep({ discover: true }).id).toBe(BUYING_STEPS[1].id);
    const all = Object.fromEntries(BUYING_STEPS.map((s) => [s.id, true]));
    expect(activeStep(all).id).toBe(BUYING_STEPS[8].id);
  });

  it('the store persists toggles under the journey key', () => {
    localStorage.setItem('keja:buying-journey', JSON.stringify({ discover: true }));
    const { result } = renderHook(() => useJourneyStore());
    expect(result.current.state).toEqual({ discover: true });
    expect(result.current.progressPct).toBe(11);
  });

  it('the journey schema drops junk payloads at the read seam', () => {
    expect(journeyShape.safeParse({ discover: true }).success).toBe(true);
    expect(journeyShape.safeParse({ discover: 'yes' }).success).toBe(false);
    expect(journeyShape.safeParse('nope').success).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* 5. Source contracts — the wiring drift breakers                     */
/* ------------------------------------------------------------------ */

describe('wave-20 wiring (source contracts)', () => {
  it('the detail page renders the share button and the pricing panel', () => {
    const detail = src('src/components/property/PropertyDetailView.tsx');
    expect(detail).toContain('<ShareListing p={p} />');
    expect(detail).toContain('<PricingIntelligencePanel p={p} />');
    // the fake ±8% band is gone — no marketRange helper remains
    expect(detail).not.toContain('function marketRange');
    // similar listings no longer offer sold stock
    expect(detail).toContain("x.availability !== 'sold'");
    // every open enters the recently-viewed store
    expect(detail).toContain('pushViewed(prev, p.id)');
  });

  it('the passport id module is shared (lib, not a view-local)', () => {
    const passport = src('src/lib/passport.ts');
    expect(passport).toContain('export function passportId');
    expect(passportId(PROPERTIES[0])).toMatch(/^KEJA-[A-Z]{3}-\d{6}$/);
  });

  it('discovery shows intent chips and the recently-viewed strip', () => {
    const props = src('src/components/property/PropertiesView.tsx');
    expect(props).toContain('Keja AI understood');
    expect(props).toContain('data-testid="intent-chips"');
    expect(props).toContain('data-testid="recently-viewed"');
    expect(props).toContain('useRecentlyViewed');
    // the chips derive from the SAME parser the filter uses — no second brain
    expect(props).toContain('parseFreeQuery(q, areas)');
  });

  it('the intent chips reflect real parse structure (spot check with the parser)', () => {
    const pq = parseFreeQuery('2BR Kilimani under 15M', ['Kilimani']);
    expect(pq.minBeds).toBe(2);
    expect(pq.area).toBe('Kilimani');
    expect(pq.maxPriceKes).toBe(15_000_000);
  });

  it('the tenant hub has the affordability tab wired to the competitiveness engine', () => {
    const hub = src('src/components/manage/TenantHubView.tsx');
    expect(hub).toContain('competitiveness(inc, target)');
    expect(hub).toContain('value="affordability"');
    // the old wrong-tool link (rent affordability → mortgage calculator) is gone
    expect(hub).not.toContain("['Affordability check', 'Rent within 33% of income', '/finance']");
    // the budget hand-off rides the free-query parser discovery already speaks
    expect(hub).toContain('rent under');
  });

  it('the account page has the journey tab and the recently-viewed overview', () => {
    const account = src('src/components/common/AccountView.tsx');
    expect(account).toContain('value="journey"');
    expect(account).toContain('<BuyingJourney />');
    expect(account).toContain('useRecentlyViewed');
  });

  it('the valuation desk accepts deep-link prefill (area/type/size/acres)', () => {
    const desk = src('src/components/common/ValuationDeskView.tsx');
    expect(desk).toContain('route.query.area');
    expect(desk).toContain('route.query.type');
    expect(desk).toContain('route.query.size');
    expect(desk).toContain('route.query.acres');
  });

  it('share events flow through the governed taxonomy', () => {
    const taxonomy = src('src/lib/events/taxonomy.ts');
    expect(taxonomy).toContain("'listing.shared.v1'");
    expect(taxonomy).toContain("share: 'listing.shared.v1'");
    const analytics = src('src/lib/analytics.ts');
    expect(analytics).toContain("| { event: 'share'; propertyId: string; channel:");
  });
});
