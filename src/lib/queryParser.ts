/**
 * Free-text query understanding for property search (2026-09-12).
 *
 * Problem (found testing the live product): the hero search invites
 * “2BR Kilimani under 15M”, but the results page matched the query as a
 * literal substring against the listing haystack — so the product's own
 * advertised example returned 0 results while a qualifying listing
 * (KJA-A0162: 2BR Kilimani, KES 10.1M, sale) existed in inventory.
 *
 * This module turns a free-text query into structured intent, then matches
 * listings against that intent plus AND-semantics over the remaining tokens:
 *
 *   “2BR Kilimani under 15M”
 *     → { minBeds: 2, area: 'Kilimani', maxPriceKes: 15_000_000, tokens: [] }
 *
 * Parsing is deliberately conservative: anything not confidently a
 * bedroom count, price ceiling, purpose, type or known area stays a plain
 * search token — so a query that parses to nothing degrades to today's
 * token search rather than to nothing.
 */

export type PurposeIntent = 'rent' | 'buy' | 'invest';

export interface ParsedQuery {
  /** Original query, trimmed. */
  raw: string;
  /** Lowercased free tokens that must ALL appear in the listing haystack. */
  tokens: string[];
  /** Minimum bedrooms (from “3BR”, “two bedroom”, …). */
  minBeds?: number;
  /** Price ceiling in absolute KES (from “under 15M”, “below 150k”, …). */
  maxPriceKes?: number;
  /** Deal intent (rent / buy / invest). */
  purpose?: PurposeIntent;
  /** Property type (apartment, house, villa, …). */
  type?: string;
  /** Known marketplace area name, canonical casing. */
  area?: string;
}

/* ------------------------------- extraction ------------------------------- */

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
};

/** “2br” · “2 bed” · “2-bedroom” · “two bedrooms” */
const BEDS_RE = /\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine)\s*[-\s]?\s*(?:br\b|beds?\b|bedrooms?\b)/i;

/** “under 15M” · “below 15m” · “less than 15 million” · “max 150k” · “under 15,000,000” · “under 15.5m ksh” */
const PRICE_RE =
  /\b(?:under|below|less than|max(?:imum)?(?: of)?|up to|cheaper than)\s+(\d+(?:[.,]\d+)?)\s*(m\b|million\b|k\b|thousand\b|ksh\b|kes\b)?/i;

/** Absolute price: “under 15,000,000” (needs ≥5 digits to avoid “under 15”). */
const PRICE_ABS_RE =
  /\b(?:under|below|less than|max(?:imum)?(?: of)?|up to)\s+(\d[\d,]{4,})\b/i;

const TYPE_KEYWORDS: Array<[RegExp, string]> = [
  [/\bstudios?\b/i, 'studio'],
  [/\bapartments?\b|\bflats?\b/i, 'apartment'],
  [/\bhouses?\b|\bmaisonettes?\b/i, 'house'],
  [/\btownhouses?\b|\bmaisonettes?\b/i, 'townhouse'],
  [/\bvillas?\b/i, 'villa'],
  [/\bbungalows?\b/i, 'bungalow'],
  [/\bpenthouses?\b/i, 'penthouse'],
  [/\bduplex(es)?\b/i, 'duplex'],
  [/\boffices?\b|\bcommercial\b/i, 'office'],
  [/\b(?:plots?|land|acreage)\b/i, 'land'],
];

const PURPOSE_KEYWORDS: Array<[RegExp, PurposeIntent]> = [
  [/\b(?:for rent|to let|rent(?:ing|al)?)\b/i, 'rent'],
  [/\b(?:for sale|to buy|buy(?:ing)?)\b/i, 'buy'],
  [/\b(?:invest(?:ment|ing)?|yield|airbnb|short[- ]stay)\b/i, 'invest'],
];

/** Words stripped from token matching once consumed (or meaningless). */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'in', 'at', 'for', 'of', 'with', 'and', 'or', 'to', 'under',
  'below', 'less', 'than', 'max', 'maximum', 'up', 'cheaper', 'br', 'bed',
  'beds', 'bedroom', 'bedrooms', 'million', 'thousand', 'ksh', 'kes', 'want',
  'looking', 'find', 'show', 'me', 'please', 'k', 'm',
]);

function parseNumberWord(word: string): number | undefined {
  if (/^\d{1,2}$/.test(word)) return parseInt(word, 10);
  return NUMBER_WORDS[word.toLowerCase()];
}

/**
 * Turn a free-text query into structured intent + leftover tokens.
 * @param q raw query text
 * @param knownAreas area names known to the marketplace (any casing);
 *                   matched case-insensitively, returned in canonical casing
 */
export function parseFreeQuery(q: string, knownAreas: string[] = []): ParsedQuery {
  const raw = q.trim();
  const lower = raw.toLowerCase();
  if (!raw) return { raw: '', tokens: [] };

  let rest = lower;
  const parsed: ParsedQuery = { raw, tokens: [] };

  /* bedrooms */
  const beds = BEDS_RE.exec(rest);
  if (beds) {
    const n = parseNumberWord(beds[1]);
    if (n && n > 0 && n <= 10) parsed.minBeds = n;
    rest = rest.replace(beds[0], ' ');
  }

  /* price ceiling */
  const abs = PRICE_ABS_RE.exec(rest);
  const rel = PRICE_RE.exec(rest);
  if (abs) {
    const value = Number(abs[1].replace(/,/g, ''));
    if (Number.isFinite(value) && value >= 10_000) parsed.maxPriceKes = value;
    rest = rest.replace(abs[0], ' ');
  } else if (rel) {
    const value = Number(rel[1].replace(/,/g, ''));
    const unit = rel[2]?.replace(/\s+/g, '');
    if (Number.isFinite(value) && value > 0) {
      if (unit === 'm' || unit === 'million') parsed.maxPriceKes = value * 1_000_000;
      else if (unit === 'k' || unit === 'thousand') parsed.maxPriceKes = value * 1_000;
      else if (/^k/.test(unit ?? '')) parsed.maxPriceKes = value * 1_000; // ksh/kes: thousands on rent scales
      else if (value >= 10_000) parsed.maxPriceKes = value; // bare ≥10k: absolute KES
      else parsed.maxPriceKes = value * 1_000; // bare small number: rent shorthand (“under 150”)
    }
    rest = rest.replace(rel[0], ' ');
  }

  /* purpose — first keyword wins (rent before buy so “for rent” is not read as buy) */
  for (const [re, intent] of PURPOSE_KEYWORDS) {
    const m = re.exec(rest);
    if (m) {
      parsed.purpose = intent;
      rest = rest.replace(m[0], ' ');
      break;
    }
  }

  /* type */
  for (const [re, type] of TYPE_KEYWORDS) {
    const m = re.exec(rest);
    if (m) {
      parsed.type = type;
      rest = rest.replace(m[0], ' ');
      break;
    }
  }

  /* known area — longest match wins (“karen” over “are”, real names only) */
  const areaHit = knownAreas
    .filter(Boolean)
    .map((a) => ({ a, i: rest.indexOf(a.toLowerCase()) }))
    .filter(({ i }) => i >= 0)
    .sort((x, y) => y.a.length - x.a.length)[0];
  if (areaHit) {
    parsed.area = areaHit.a;
    rest = rest.replace(areaHit.a.toLowerCase(), ' ');
  }

  /* remaining tokens, minus stopwords */
  parsed.tokens = rest
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));

  return parsed;
}

/* -------------------------------- matching -------------------------------- */

/** Minimal property shape the matcher needs — both authored and auto listings satisfy it. */
export interface QueryProperty {
  title: string;
  area: string;
  county?: string;
  type: string;
  description?: string;
  price: number;
  purpose: string[];
  bedrooms?: number | null;
  priceOnApplication?: boolean;
}

/**
 * Does a property satisfy a parsed query? Structured intent is applied
 * exactly; leftover tokens use AND semantics over the listing haystack
 * (every token must appear somewhere in title/area/county/type/description).
 */
export function matchesFreeQuery(p: QueryProperty, pq: ParsedQuery): boolean {
  if (pq.minBeds != null && (p.bedrooms ?? 0) < pq.minBeds) return false;

  if (pq.maxPriceKes != null) {
    // Price-on-application listings cannot satisfy a price ceiling.
    if (p.priceOnApplication) return false;
    if (p.price > pq.maxPriceKes) return false;
  }

  if (pq.purpose && !p.purpose?.includes(pq.purpose)) return false;
  if (pq.type && p.type !== pq.type) return false;
  if (pq.area && p.area !== pq.area) return false;

  if (pq.tokens.length) {
    const hay = `${p.title} ${p.area} ${p.county ?? ''} ${p.type} ${p.description ?? ''}`.toLowerCase();
    if (!pq.tokens.every((t) => hay.includes(t))) return false;
  }

  return true;
}
