#!/usr/bin/env node
/**
 * Keja Auto-Pilot — pipeline orchestrator.
 *
 *   ingest (market scanner + partner feeds)
 *     → enrich (AI descriptions, pricing intelligence, photos)
 *     → dedupe (cross-source signature matching)
 *     → quality gate (anomaly screening, publish/review/reject routing)
 *     → publish (src/data/auto-listings.json)
 *
 * Usage:
 *   node scripts/auto-listings/run.mjs            # live run (writes data file)
 *   node scripts/auto-listings/run.mjs --dry      # report only, no write
 *   node scripts/auto-listings/run.mjs --count 8  # override scanner volume
 *
 * Runs unattended on GitHub Actions (cron every 6h) — see
 * .github/workflows/auto-listings.yml. Zero npm dependencies.
 */
import { scanMarket } from './scanner.mjs'
import { ingestFeeds } from './feeds.mjs'
import { enrich } from './enrich.mjs'
import { dedupe } from './dedupe.mjs'
import { screen } from './quality.mjs'
import { loadState, publish, saveState, nextSequence } from './publish.mjs'

const args = process.argv.slice(2)
const dry = args.includes('--dry')
const countIdx = args.indexOf('--count')
const count = countIdx >= 0 ? Math.max(1, Math.min(12, parseInt(args[countIdx + 1], 10) || 4)) : 4

const runDate = new Date().toISOString().slice(0, 10)
const runId = `run-${runDate}-${String(Date.now()).slice(-5)}`
const state = loadState()
let seq = nextSequence(state)

/* 1 — ingest: market scanner + partner feeds */
const scannerSightings = scanMarket({ runDate, count, sequence: state.runs.length })
const { sightings: feedSightings, status: feedStatus } = ingestFeeds(runDate)
const sightings = [...scannerSightings, ...feedSightings]
console.log(`[autopilot] ingest: ${scannerSightings.length} scanner + ${feedSightings.length} feed sightings`)

/* 2 — enrich */
const enriched = sightings.map((s) => enrich(s, seq++))

/* 3 — dedupe (against each other + inventory + pending + signature graveyard) */
const { unique, dupes } = dedupe(enriched, [...state.listings, ...state.pending], state.seenSignatures ?? [])
console.log(`[autopilot] dedupe: ${dupes.length} duplicates dropped`)

/* 4 — quality gate */
const screened = unique.map((l) => screen(l))
const byRoute = { publish: 0, review: 0, reject: 0 }
for (const s of screened) byRoute[s.auto.route]++
console.log(`[autopilot] quality: ${byRoute.publish} publish · ${byRoute.review} review · ${byRoute.reject} reject`)

/* 5 — publish */
const result = publish({ state, screened, feedStatus, runId })
result.run.deduped = dupes.length

if (dry) {
  console.log('[autopilot] DRY RUN — no data written. Preview:')
  for (const l of result.published) {
    console.log(`  + ${l.id} · ${l.title} · KES ${l.price.toLocaleString()} · quality ${l.auto.qualityScore} · ${l.auto.source}`)
  }
  for (const l of result.pending) {
    console.log(`  ? ${l.id} · ${l.title} · quality ${l.auto.qualityScore} → review queue`)
  }
  for (const r of result.rejected) {
    console.log(`  ✗ ${r.id} · ${r.title} · quality ${r.qualityScore} → rejected`)
  }
  process.exit(0)
}

const path = saveState(result.nextState)
console.log(`[autopilot] wrote ${path}`)
console.log(`[autopilot] run ${runId}: ingested ${result.run.ingested} · published ${result.run.published} · queued ${result.run.queued} · rejected ${result.run.rejected} · deduped ${result.run.deduped}`)
console.log(`[autopilot] inventory: ${result.nextState.listings.length} live auto-listings (cap 60) · ${result.nextState.pending.length} pending review`)

// Exit code signals whether anything changed (used by CI to decide commit)
const changed = result.published.length > 0 || result.pending.length > 0
process.exit(changed ? 0 : 3)
