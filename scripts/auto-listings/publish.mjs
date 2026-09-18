/**
 * Keja Auto-Pilot — publisher.
 *
 * Merges screened listings into src/data/auto-listings.json:
 *   • publishes route=publish listings into the public inventory (cap: 60)
 *   • carries route=review listings as pending queue (cap: 24)
 *   • logs rejected items in run metadata (cap: 24) for the admin console
 *   • records every run (id, counts, sources, feed health) for Auto-Pilot tab
 * Ids are stable and monotonic: nextSeq continues from the existing file.
 *
 * The data file is Prettier-formatted when prettier is importable (local dev,
 * any environment with node_modules). In the zero-dependency CI ingest job
 * the raw JSON is written instead and the workflow runs `npx prettier`
 * before committing — either path produces byte-identical output, which is
 * what keeps `npm run lint:prettier` green.
 *
 * Data policy beyond the caps (wave-16):
 *  - HERO-PROMISE PROTECTION — the homepage hero advertises
 *    "2BR Kilimani under 15M" as THE example query; the cap-60 eviction
 *    once culled the only qualifying listing (KJA-A0162, 2026-09-18), the
 *    verify job caught it post-deploy and the guarded revert healed
 *    production — but the bad data had already been live for ~2 minutes.
 *    The promise is now enforced at merge time: if cap eviction would leave
 *    zero hero-qualifying listings, the newest evicted qualifier is restored
 *    in place of the oldest kept non-qualifier. The promise holds before
 *    anything is committed, let alone deployed.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { signature } from './dedupe.mjs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The hero example the homepage advertises (kept in lockstep with the
 *  regression test and the hero copy — one promise, three mirrors). */
export const HERO_QUERY = { area: 'Kilimani', minBeds: 2, maxPriceKes: 15_000_000, purpose: 'buy' }

/** Does a listing satisfy the advertised hero query? (matchesFreeQuery's
 *  predicate, expressed against the bot listing shape) */
export function satisfiesHeroQuery(l) {
  return (
    l.area === HERO_QUERY.area &&
    (l.bedrooms ?? 0) >= HERO_QUERY.minBeds &&
    l.price > 0 &&
    l.price <= HERO_QUERY.maxPriceKes &&
    !l.priceOnApplication &&
    Array.isArray(l.purpose) &&
    l.purpose.includes(HERO_QUERY.purpose)
  )
}

/** Enforce the hero promise on a capped list: if eviction removed every
 *  qualifier, restore the newest evicted one in place of the oldest kept
 *  non-qualifier (stable size, minimal churn, deterministic). */
export function enforceHeroPromise(capped, evicted) {
  if (capped.some(satisfiesHeroQuery)) return { listings: capped, restored: null }
  const candidate = evicted.filter(satisfiesHeroQuery).sort((a, b) => b.listedAt.localeCompare(a.listedAt))[0]
  if (!candidate) return { listings: capped, restored: null }
  const replaceIdx = capped.findIndex((l) => !satisfiesHeroQuery(l))
  if (replaceIdx < 0) return { listings: capped, restored: null }
  const listings = [...capped]
  listings[replaceIdx] = candidate
  return { listings, restored: candidate.id }
}

const DATA_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../../src/data/auto-listings.json')
export const PUBLISHED_CAP = 60
export const PENDING_CAP = 24
export const REJECTED_CAP = 24
export const RUNS_CAP = 40

export function loadState() {
  if (!existsSync(DATA_PATH)) {
    return emptyState()
  }
  try {
    const parsed = JSON.parse(readFileSync(DATA_PATH, 'utf8'))
    return {
      version: 1,
      generatedAt: parsed.generatedAt ?? new Date().toISOString(),
      runs: parsed.runs ?? [],
      listings: parsed.listings ?? [],
      pending: parsed.pending ?? [],
      // Graveyard of every signature ever published/queued/rejected — feed
      // items have stable signatures, so without this the cap-60 eviction
      // would recycle the same partner listings as "new" forever.
      seenSignatures: parsed.seenSignatures ?? [],
    }
  } catch {
    return emptyState()
  }
}

function emptyState() {
  return { version: 1, generatedAt: new Date().toISOString(), runs: [], listings: [], pending: [], seenSignatures: [] }
}

export function publish({ state, screened, feedStatus, runId }) {
  const published = []
  const pending = []
  const rejected = []

  for (const s of screened) {
    if (s.auto.route === 'publish') published.push(s)
    else if (s.auto.route === 'review') pending.push(s)
    else rejected.push({ id: s.id, title: s.title, source: s.auto.source, qualityScore: s.auto.qualityScore, checks: s.auto.checks })
  }

  const allSorted = [...published, ...state.listings].sort((a, b) => b.listedAt.localeCompare(a.listedAt))
  const capped = allSorted.slice(0, PUBLISHED_CAP)
  const evicted = allSorted.slice(PUBLISHED_CAP)
  const { listings: nextListings, restored } = enforceHeroPromise(capped, evicted)
  if (restored) {
    console.log(`[autopilot] hero-promise protection: restored ${restored} over the cap eviction (the advertised example query must keep resolving)`)
  }
  const nextPending = [...pending, ...state.pending]
    .sort((a, b) => b.listedAt.localeCompare(a.listedAt))
    .slice(0, PENDING_CAP)

  // Signature graveyard: grows monotonically, never pruned (bounded by the
  // realistic universe of postings, ~hundreds — negligible vs the data file).
  const sigOf = (l) => signature({ ...l, bedrooms: l.bedrooms, price: l.price, type: l.type, area: l.area })
  const nextSeen = [
    ...new Set([
      ...(state.seenSignatures ?? []),
      ...screened.map(sigOf),
    ]),
  ].slice(-2000)

  const run = {
    id: runId,
    startedAt: new Date().toISOString(),
    ingested: screened.length,
    published: published.length,
    queued: pending.length,
    rejected: rejected.length,
    deduped: 0, // filled by orchestrator
    heroPromiseRestored: restored, // null = the promise held without intervention
    sources: {
      scanner: screened.filter((s) => s.auto.source === 'market-scanner').length,
      feeds: screened.filter((s) => s.auto.source.startsWith('feed:')).length,
    },
    feedStatus,
  }

  const nextState = {
    version: 1,
    generatedAt: new Date().toISOString(),
    runs: [run, ...(state.runs ?? [])].slice(0, RUNS_CAP),
    listings: nextListings,
    pending: nextPending,
    seenSignatures: nextSeen,
    rejected: rejected.slice(0, REJECTED_CAP),
  }
  return { nextState, run, published, pending, rejected }
}

export async function saveState(state) {
  mkdirSync(dirname(DATA_PATH), { recursive: true })
  let code = JSON.stringify(state, null, 2) + '\n'
  try {
    // Non-literal specifier ON PURPOSE: vite/vitest static import analysis
    // hard-fails on an unresolvable literal 'prettier' (it is an
    // npx-provided tool in CI, not a dependency). Local dev formats via the
    // import when prettier happens to be installed; the workflow formats
    // via `npx prettier` — byte-identical output either way.
    const pkg = 'prettier'
    const { format } = await import(pkg)
    code = await format(code, { parser: 'json' })
  } catch {
    // zero-dep environment (CI ingest job): the workflow formats via npx prettier
  }
  writeFileSync(DATA_PATH, code, 'utf8')
  return DATA_PATH
}

export function nextSequence(state) {
  const maxId = [...state.listings, ...state.pending].reduce((max, l) => {
    const m = String(l.id ?? '').match(/KJA-A(\d+)/)
    return m ? Math.max(max, parseInt(m[1], 10)) : max
  }, 0)
  return maxId + 1
}
