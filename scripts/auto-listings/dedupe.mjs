/**
 * Keja Auto-Pilot — duplicate detection.
 *
 * Cross-source fuzzy matching: two listings describing the same physical
 * posting (from different feeds or the scanner) produce a collision
 * signature. Signature = (type, area, bedroom bucket, price band) with
 * title-token overlap as a secondary signal — the same heuristics the
 * trust-by-design layer advertises on /trust.
 */

function titleTokens(title) {
  return new Set(
    String(title)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !['with', 'near', 'the', 'sale', 'rent', 'sqm'].includes(w)),
  )
}

function overlap(a, b) {
  if (!a.size || !b.size) return 0
  let hit = 0
  for (const t of a) if (b.has(t)) hit++
  return hit / Math.min(a.size, b.size)
}

/** Stable signature for a listing — same posting ⇒ same signature bucket. */
export function signature(listing) {
  const priceBand = listing.price >= 500000
    ? Math.round(listing.price / 1_000_000) // ±1M buckets for sales
    : Math.round(listing.price / 5000) // ±5k buckets for rents
  return `${listing.type}|${listing.area}|${listing.bedrooms ?? 0}br|${priceBand}`
}

/**
 * Deduplicate candidates against (a) each other and (b) existing inventory.
 * Keeps the earliest-seen / most complete candidate of each signature group.
 */
export function dedupe(candidates, existing = []) {
  const existingSigs = new Map()
  for (const e of existing) {
    const sig = signature({ ...e, bedrooms: e.bedrooms, price: e.price, type: e.type, area: e.area })
    const tokens = titleTokens(e.title ?? '')
    if (!existingSigs.has(sig)) existingSigs.set(sig, tokens)
  }

  const groups = new Map()
  const dupes = []
  for (const c of candidates) {
    const sig = signature(c)
    const tokens = titleTokens(c.title)
    // 1. exact-ish signature + strong title overlap vs existing inventory
    if (existingSigs.has(sig)) {
      const exTok = existingSigs.get(sig)
      if (overlap(tokens, exTok) >= 0.5) {
        dupes.push({ id: c.id, reason: `matches existing inventory signature (${sig})` })
        continue
      }
    }
    // 2. duplicate within this batch?
    const group = groups.get(sig)
    if (group) {
      const prior = group[group.length - 1]
      if (overlap(tokens, titleTokens(prior.title)) >= 0.5) {
        dupes.push({ id: c.id, reason: `duplicate of ${prior.id} in same ingest batch` })
        continue
      }
      group.push(c)
    } else {
      groups.set(sig, [c])
    }
  }

  const unique = [...groups.values()].flat()
  return { unique, dupes }
}
