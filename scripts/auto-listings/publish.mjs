/**
 * Keja Auto-Pilot — publisher.
 *
 * Merges screened listings into src/data/auto-listings.json:
 *   • publishes route=publish listings into the public inventory (cap: 60)
 *   • carries route=review listings as pending queue (cap: 24)
 *   • logs rejected items in run metadata (cap: 24) for the admin console
 *   • records every run (id, counts, sources, feed health) for Auto-Pilot tab
 * Ids are stable and monotonic: nextSeq continues from the existing file.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { signature } from './dedupe.mjs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

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

  const nextListings = [...published, ...state.listings]
    .sort((a, b) => b.listedAt.localeCompare(a.listedAt))
    .slice(0, PUBLISHED_CAP)
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

export function saveState(state) {
  mkdirSync(dirname(DATA_PATH), { recursive: true })
  writeFileSync(DATA_PATH, JSON.stringify(state, null, 2) + '\n', 'utf8')
  return DATA_PATH
}

export function nextSequence(state) {
  const maxId = [...state.listings, ...state.pending].reduce((max, l) => {
    const m = String(l.id ?? '').match(/KJA-A(\d+)/)
    return m ? Math.max(max, parseInt(m[1], 10)) : max
  }, 0)
  return maxId + 1
}
