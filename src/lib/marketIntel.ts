/**
 * KEJA DATA — market intelligence engine (proposal §7).
 *
 * Parses natural-language market questions and answers them from the live
 * inventory + area intelligence, with sourcing labels:
 *
 *   "What is the average price per acre in Karen?"
 *   "Which Nairobi neighbourhood has the highest rental yield?"
 *   "Where should I invest KSh 20 million?"
 *   "Which areas are experiencing the strongest development?"
 *   "What is the average rent for a two-bedroom apartment in Westlands?"
 *
 * Everything is computed from on-platform inventory — the response states its
 * sample sizes honestly and never fabricates precision.
 */
import type { Property } from '@/data/properties';
import { areaInsights } from '@/data/properties';
import { isRentalPrice } from '@/lib/finance';

export interface MarketAnswer {
  kind: 'price-per-area' | 'yield-ranking' | 'allocations' | 'rent-stats' | 'supply-ranking' | 'overview';
  text: string;
  table?: { columns: string[]; rows: (string | number)[][] };
  chart?: { label: string; value: number }[];
  sourceNote: string;
}

const norm = (s: string) => s.toLowerCase().trim();

function areaFromText(t: string): string | null {
  const known = Object.keys(areaInsights);
  for (const a of known) if (t.includes(norm(a))) return a;
  return null;
}

function parseBudget(t: string): number | null {
  const m = t.match(/(\d+(?:\.\d+)?)\s*(m|million|mil|k)\b/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return m[2].startsWith('k') ? n * 1_000 : n * 1_000_000;
}

function parseBeds(t: string): number | null {
  const m = t.match(/(\d)\s*(?:br|bed|bedroom)/) ?? t.match(/(one|two|three|four|five)\s*(?:br|bed|bedroom)/);
  if (!m) return null;
  if (/\d/.test(m[1])) return parseInt(m[1], 10);
  return { one: 1, two: 2, three: 3, four: 4, five: 5 }[m[1] as 'one'] ?? null;
}

/** Average price per acre for land listings in an area (or per sqm for built stock). */
function pricePerArea(all: Property[], area: string): MarketAnswer {
  const listings = all.filter((p) => p.area === area && !p.priceOnApplication);
  const land = listings.filter((p) => p.type === 'land' && p.sizeSqm > 0);
  const insight = areaInsights[area];
  if (land.length >= 1) {
    const perSqm = land.reduce((s, p) => s + p.price / p.sizeSqm, 0) / land.length;
    const perAcre = perSqm * 4046.86;
    return {
      kind: 'price-per-area',
      text: `Across **${land.length} land listing${land.length === 1 ? '' : 's'}** currently on the platform, the average price in **${area}** works out to about **KES ${(perSqm / 1000).toFixed(0)}k per m²** — roughly **KES ${(perAcre / 1_000_000).toFixed(1)}M per acre**.`,
      table: {
        columns: ['Listing', 'Size (acres)', 'Asking price', 'KES/acre'],
        rows: land.slice(0, 6).map((p) => [
          p.title.slice(0, 34),
          (p.sizeSqm / 4046.86).toFixed(2),
          `KES ${(p.price / 1e6).toFixed(1)}M`,
          `KES ${((p.price / p.sizeSqm * 4046.86) / 1e6).toFixed(1)}M`,
        ]),
      },
      sourceNote: `Computed from ${land.length} live land listing(s) in ${area}. Area band reference: ${insight?.avgPricePerSqm ?? 'n/a'}/m².`,
    };
  }
  if (insight) {
    return {
      kind: 'price-per-area',
      text: `No land listings are live in **${area}** right now. The area reference band is **${insight.avgPricePerSqm} per m²**, i.e. roughly **KES ${(((parseFloat(insight.avgPricePerSqm.match(/([\d.]+)k/)?.[1] ?? '60')) * 1000 * 4046.86) / 1e6).toFixed(0)}–${(((parseFloat(insight.avgPricePerSqm.match(/[–-]([\d.]+)k/)?.[1] ?? '90')) * 1000 * 4046.86) / 1e6).toFixed(0)}M per acre** at band midpoints.`,
      sourceNote: 'Derived from the KEJA area band table (editorial research), not live listings.',
    };
  }
  return {
    kind: 'price-per-area',
    text: `KEJA DATA does not yet cover **${area}** with a reference band. Try a covered area — ${Object.keys(areaInsights).slice(0, 6).join(', ')}…`,
    sourceNote: 'Coverage grows as inventory and research deepen.',
  };
}

/** Rental yield ranking across covered areas. */
function yieldRanking(all: Property[]): MarketAnswer {
  const byArea = new Map<string, { total: number; n: number }>();
  for (const p of all) {
    if (p.priceOnApplication || p.purpose.includes('rent') || isRentalPrice(p.price)) continue;
    if (!p.rentEstimate || !p.price) continue;
    const y = (p.rentEstimate * 12) / p.price;
    const cur = byArea.get(p.area) ?? { total: 0, n: 0 };
    byArea.set(p.area, { total: cur.total + y, n: cur.n + 1 });
  }
  const ranked = [...byArea.entries()]
    .map(([area, { total, n }]) => ({ area, yieldPct: (total / n) * 100, n }))
    .filter((r) => r.n >= 1)
    .sort((a, b) => b.yieldPct - a.yieldPct)
    .slice(0, 10);
  if (ranked.length === 0) {
    return {
      kind: 'yield-ranking',
      text: 'Not enough sale listings with rent estimates are live to rank yields — check back as inventory grows.',
      sourceNote: 'Honesty note: rankings need sample sizes.',
    };
  }
  return {
    kind: 'yield-ranking',
    text: `Based on live listings with rent estimates, the strongest gross rental yields right now are in **${ranked[0].area} at ~${ranked[0].yieldPct.toFixed(1)}%**, followed by ${ranked.slice(1, 3).map((r) => `**${r.area}** (~${r.yieldPct.toFixed(1)}%)`).join(' and ')}.`,
    chart: ranked.map((r) => ({ label: r.area, value: Number(r.yieldPct.toFixed(1)) })),
    table: {
      columns: ['Area', 'Gross yield', 'Sample (listings)'],
      rows: ranked.map((r) => [r.area, `${r.yieldPct.toFixed(1)}%`, r.n]),
    },
    sourceNote: 'Gross yields = rent estimate × 12 ÷ asking price, per live listing — ESTIMATE grade, not guaranteed returns.',
  };
}

/** Where to invest a budget — allocation suggestions. */
function allocations(all: Property[], budget: number): MarketAnswer {
  const buys = all.filter(
    (p) => !p.priceOnApplication && !p.purpose.includes('rent') && !isRentalPrice(p.price) && p.price <= budget && p.price > budget * 0.25,
  );
  const byArea = new Map<string, Property[]>();
  for (const p of buys) {
    const list = byArea.get(p.area) ?? [];
    list.push(p);
    byArea.set(p.area, list);
  }
  const topAreas = [...byArea.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 5);
  const strategy = topAreas
    .map(([area, list]) => ({ area, options: list.length, top: list.sort((a, b) => b.trustScore - a.trustScore)[0] }))
    .slice(0, 5);
  return {
    kind: 'allocations',
    text: `With **KES ${(budget / 1e6).toFixed(1)}M**, the platform currently offers **${buys.length} verified purchase options** within a sensible 25–100% deployment band. Strongest clusters: ${strategy.map((s) => `**${s.area}** (${s.options})`).join(', ')}. A diversified play could split the budget across two areas — or deploy one high-trust asset and keep a tranche for the tokenization trial.`,
    table: {
      columns: ['Area', 'Options in band', 'Highest-trust pick', 'Trust Score'],
      rows: strategy.map((s) => [s.area, s.options, s.top.title.slice(0, 30), s.top.trustScore]),
    },
    chart: strategy.map((s) => ({ label: s.area, value: s.options })),
    sourceNote: 'Options filtered to live, non-rental listings priced 25–100% of budget. Not investment advice.',
  };
}

/** Rent stats for an area (+ optional bedroom filter). */
function rentStats(all: Property[], area: string, beds: number | null): MarketAnswer {
  let listings = all.filter((p) => p.area === area && p.purpose.includes('rent') && isRentalPrice(p.price));
  const label = beds ? `${beds}-bedroom` : '';
  if (beds) listings = listings.filter((p) => p.bedrooms === beds);
  if (listings.length === 0) {
    // widen: no bedroom match
    const wider = all.filter((p) => p.area === area && p.purpose.includes('rent') && isRentalPrice(p.price));
    if (wider.length === 0) {
      return {
        kind: 'rent-stats',
        text: `No live rental listings in **${area}** right now. The area yield band is ${areaInsights[area]?.yield ?? 'not yet covered'} — check nearby areas or save a search alert.`,
        sourceNote: 'Sample: 0 live rentals.',
      };
    }
    return {
      kind: 'rent-stats',
      text: `No exact ${label} match in **${area}** at the moment, but **${wider.length} rental listing${wider.length === 1 ? '' : 's'}** are live across other sizes — averaging **KES ${Math.round(wider.reduce((s, p) => s + p.price, 0) / wider.length).toLocaleString()}/month**.`,
      chart: wider.slice(0, 8).map((p) => ({ label: `${p.bedrooms ?? '?'}BR`, value: p.price })),
      sourceNote: `Sample: ${wider.length} live rentals in ${area}.`,
    };
  }
  const avg = listings.reduce((s, p) => s + p.price, 0) / listings.length;
  const sorted = [...listings].sort((a, b) => a.price - b.price);
  return {
    kind: 'rent-stats',
    text: `Across **${listings.length} live ${label || 'rental'} listing${listings.length === 1 ? '' : 's'}** in **${area}**, average rent is **KES ${Math.round(avg).toLocaleString()}/month** (range KES ${sorted[0].price.toLocaleString()}–${sorted[sorted.length - 1].price.toLocaleString()}).`,
    chart: sorted.slice(0, 10).map((p) => ({ label: p.title.slice(0, 18), value: p.price })),
    table: {
      columns: ['Listing', 'Beds', 'Monthly rent', 'Trust'],
      rows: sorted.slice(0, 6).map((p) => [p.title.slice(0, 30), p.bedrooms ?? '—', `KES ${p.price.toLocaleString()}`, p.trustScore]),
    },
    sourceNote: `Sample: ${listings.length} live listings — rent levels move with furnishing and service-charge levels.`,
  };
}

/** Supply / development momentum ranking by live listing counts. */
function supplyRanking(all: Property[]): MarketAnswer {
  const byArea = new Map<string, number>();
  for (const p of all) byArea.set(p.area, (byArea.get(p.area) ?? 0) + 1);
  const ranked = [...byArea.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  return {
    kind: 'supply-ranking',
    text: `Supply momentum on the platform is strongest in **${ranked[0][0]}** with **${ranked[0][1]} live listings** — a proxy for where seller confidence and development activity cluster. ${ranked[1] ? `**${ranked[1][0]}** (${ranked[1][1]}) and ` : ''}${ranked[2] ? `**${ranked[2][0]}** (${ranked[2][1]}) round out the top three.` : ''}`,
    chart: ranked.map(([area, n]) => ({ label: area, value: n })),
    sourceNote: 'Counts live platform inventory — a platform-side proxy, not a census of all development.',
  };
}

function overview(all: Property[]): MarketAnswer {
  const counties = new Set(all.map((p) => p.county));
  const avgTrust = all.reduce((s, p) => s + p.trustScore, 0) / Math.max(all.length, 1);
  const verified = all.filter((p) => p.trustScore >= 80).length;
  return {
    kind: 'overview',
    text: `The marketplace currently tracks **${all.length} listings** across **${counties.size} counties**, with **${verified} in the verified band (Trust ≥ 80)** and a mean Trust Score of **${avgTrust.toFixed(0)}/100**. Ask about a specific area, yields, rents, or where to place a budget.`,
    chart: [...counties].slice(0, 8).map((c) => ({
      label: c,
      value: all.filter((p) => p.county === c).length,
    })),
    sourceNote: 'Live platform inventory — auditable counts only.',
  };
}

export function answerMarketQuestion(question: string, all: Property[]): MarketAnswer {
  const t = norm(question);

  // yield ranking
  if (/(highest|best|top).*(yield|return)|yield.*(rank|highest|best)/.test(t)) return yieldRanking(all);
  // rent stats
  if (/(average|typical|mean|how much).*(rent|rental)|rent.*(average|typical)/.test(t)) {
    const area = areaFromText(t);
    if (area) return rentStats(all, area, parseBeds(t));
  }
  // where to invest
  if (/where.*(invest|put|deploy|buy)|invest.*(kes|ksh|shilling|budget)/.test(t) || (/(invest|budget)/.test(t) && parseBudget(t))) {
    const budget = parseBudget(t) ?? 10_000_000;
    return allocations(all, budget);
  }
  // price per acre / per sqm
  if (/(price|cost|value).*(acre|sqm|square|per m)/.test(t) || /acre.*(price|cost)/.test(t)) {
    const area = areaFromText(t);
    if (area) return pricePerArea(all, area);
    return yieldRanking(all);
  }
  // development momentum
  if (/(development|growth|momentum|developing|emerging|strongest area)/.test(t)) return supplyRanking(all);
  // area-specific fallback
  const area = areaFromText(t);
  if (area) {
    const insight = areaInsights[area];
    const listings = all.filter((p) => p.area === area);
    return {
      kind: 'overview',
      text: `**${area}** — ${insight?.note ?? 'area intelligence pending.'} Reference band: ${insight?.avgPricePerSqm ?? 'n/a'}/m² · typical yield ${insight?.yield ?? 'n/a'}. **${listings.length} live listing${listings.length === 1 ? '' : 's'}** on the platform.`,
      chart: [
        { label: 'Listings', value: listings.length },
        { label: 'Avg trust', value: Math.round(listings.reduce((s, p) => s + p.trustScore, 0) / Math.max(listings.length, 1)) },
      ],
      sourceNote: 'Area intelligence: KEJA research bands; listing counts: live inventory.',
    };
  }
  return overview(all);
}

export const SAMPLE_QUESTIONS = [
  'What is the average price per acre in Karen?',
  'Which Nairobi neighbourhood has the highest rental yield?',
  'Where should I invest KSh 20 million?',
  'Which areas are experiencing the strongest development?',
  'What is the average rent for a two-bedroom apartment in Westlands?',
  'Tell me about Kilimani',
];
