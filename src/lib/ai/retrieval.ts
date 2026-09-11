/**
 * Hybrid retrieval over the approved corpus (audit ch.10 "Retrieval policy").
 *
 * The order of operations IS the security model:
 *   1. authorization first — only `public` corpus entries are retrievable,
 *      checked before any scoring runs (the audit's "apply authorization
 *      filters before vector similarity", adapted to our local corpus)
 *   2. structured pre-filter — area/type/metadata boosts when the question
 *      names them (like structured DB filters)
 *   3. lexical scoring — BM25-lite term scoring over the corpus text
 *   4. freshness gate — stale entries are ranked out (with their age kept
 *      so the answer can say how old the freshest source is)
 *   5. rerank — the top lexical candidates are reranked by coverage of
 *      distinct query terms
 *
 * Everything is deterministic and local: no embeddings service, no network,
 * so it also runs offline inside the PWA.
 */
import { CORPUS, type CorpusEntry, isFresh } from './corpus';

export interface RetrievedChunk {
  entry: CorpusEntry;
  /** Lexical score before reranking (for diagnostics). */
  score: number;
  /** Rerank score (0..1 coverage of distinct query terms). */
  coverage: number;
  /** Entry age in days at retrieval time. */
  ageDays: number;
}

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'do', 'does', 'did', 'of', 'in', 'on',
  'at', 'for', 'to', 'and', 'or', 'but', 'if', 'it', 'its', 'this', 'that', 'these',
  'those', 'with', 'from', 'by', 'as', 'about', 'what', 'which', 'who', 'whom', 'how',
  'can', 'could', 'should', 'would', 'i', 'you', 'we', 'they', 'me', 'my', 'your',
  'want', 'need', 'find', 'show', 'get', 'have', 'has', 'am', 'be', 'been', 'any',
  'please', 'much', 'many', 'there', 'here', 'near', 'best', 'good',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Area gazetteer-lite: common Nairobi/major-town names get a structured boost. */
const AREAS = new Set(
  CORPUS.filter((e) => e.kind === 'area-insight').map((e) =>
    e.title.replace(' market insight', '').toLowerCase(),
  ),
);

export interface RetrievalOptions {
  topK?: number;
  /** Minimum coverage to consider a chunk relevant. */
  minCoverage?: number;
  /** Override "now" for tests. */
  now?: Date;
}

/**
 * Retrieve the most relevant public corpus chunks for a question.
 * Authorization is applied BEFORE scoring (see module doc).
 */
export function retrieve(question: string, opts: RetrievalOptions = {}): RetrievedChunk[] {
  const topK = opts.topK ?? 4;
  const minCoverage = opts.minCoverage ?? 0.15;
  const now = opts.now ?? new Date();

  const terms = tokenize(question);
  if (terms.length === 0) return [];

  // 1 — authorization gate: public only (enforced by corpus construction,
  //     re-asserted here so the invariant is testable).
  const authorized = CORPUS.filter((e) => e.accessClass === 'public');

  // 2 — lexical scoring with document-frequency weighting (BM25-lite)
  const df = new Map<string, number>();
  for (const e of authorized) {
    const seen = new Set(tokenize(`${e.title} ${e.text}`));
    for (const t of new Set(terms)) if (seen.has(t)) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const N = authorized.length || 1;
  const scored: RetrievedChunk[] = authorized.map((entry) => {
    const bag = tokenize(`${entry.title} ${entry.text}`);
    const counts = new Map<string, number>();
    for (const t of bag) counts.set(t, (counts.get(t) ?? 0) + 1);

    let score = 0;
    let distinct = 0;
    for (const t of new Set(terms)) {
      const tf = counts.get(t) ?? 0;
      if (tf === 0) continue;
      distinct++;
      const idf = Math.log(1 + N / (1 + (df.get(t) ?? 0)));
      score += (tf / (tf + 1.2)) * idf;
    }

    // 3 — structured boost: the question names an area the entry covers
    let boost = 1;
    const questionAreas = terms.filter((t) => AREAS.has(t));
    if (questionAreas.length > 0 && entry.kind === 'area-insight') {
      const entryArea = entry.title.replace(' market insight', '').toLowerCase();
      if (questionAreas.includes(entryArea)) boost *= 2.5;
    }

    const ageDays = Math.max(0, Math.round((now.getTime() - Date.parse(entry.asOf)) / 86_400_000));
    return {
      entry,
      score: score * boost,
      coverage: distinct / new Set(terms).size,
      ageDays,
    };
  });

  // 4 — freshness gate: stale entries drop out of the candidate set
  const fresh = scored.filter((c) => isFresh(c.entry, now));

  // 5 — rerank by coverage, then lexical score
  return fresh
    .filter((c) => c.coverage >= minCoverage && c.score > 0)
    .sort((a, b) => b.coverage - a.coverage || b.score - a.score)
    .slice(0, topK);
}

/**
 * Retrieval sufficiency check (audit: "a response without citations should
 * be considered incomplete for evidence-sensitive tasks" — so decide up
 * front whether the corpus can support ANY answer).
 */
export function isSufficient(chunks: RetrievedChunk[]): boolean {
  return chunks.length > 0 && chunks[0].coverage >= 0.3;
}
