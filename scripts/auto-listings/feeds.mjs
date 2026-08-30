/**
 * Keja Auto-Pilot — partner feed adapters.
 *
 * Parses the three feed formats advertised on /partners (JSON, CSV, XML) from
 * the feeds/ directory. Each file is one partner source. Real deployments
 * would fetch these over HTTP; the file-based shape keeps the pipeline fully
 * automated and reproducible in CI while matching production contracts.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AREAS, hashString } from './market.mjs'

const FEEDS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../feeds')

function normArea(name) {
  const hit = AREAS.find((a) => a.area.toLowerCase() === String(name || '').toLowerCase().trim())
  return hit ? { area: hit.area, county: hit.county, yield: hit.yield, ppsm: hit.ppsm } : null
}

function toSighting(source, raw, idx, runDate) {
  const area = normArea(raw.area)
  const price = Math.round(Number(String(raw.price ?? raw.price_kes ?? '').replace(/[^\d.]/g, '')) || 0)
  const seed = hashString(`${runDate}:${source}:${idx}:${raw.id ?? raw.ref ?? raw.title ?? ''}`)
  return {
    source,
    raw: {
      type: String(raw.type || 'apartment').toLowerCase(),
      area: area?.area ?? String(raw.area || 'Nairobi'),
      county: area?.county ?? 'Nairobi',
      price,
      isRental: price > 0 && price < 500000,
      sqm: Math.round(Number(raw.sqm || raw.size || raw.size_sqm || 0)) || undefined,
      bedrooms: raw.beds ? Number(raw.beds) : raw.bedrooms ? Number(raw.bedrooms) : undefined,
      bathrooms: raw.baths ? Number(raw.baths) : raw.bathrooms ? Number(raw.bathrooms) : undefined,
      agency: String(raw.agency || 'Keja Verified Partner'),
      agentName: String(raw.agent || 'Partner Desk'),
      agentPhone: raw.phone ? String(raw.phone) : '',
      purpose: price < 500000 ? ['rent'] : ['buy', 'invest'],
      areaYield: area?.yield ?? 7,
      areaPpsm: area?.ppsm ?? [50000, 100000],
      areaAcre: area?.acre ?? [2, 15],
      offPlan: String(raw.offPlan || raw.off_plan || '').toLowerCase() === 'yes',
      furnished: false,
      feedTitle: raw.title ? String(raw.title) : undefined,
    },
    seed,
    firstSeenAt: new Date().toISOString(),
  }
}

/* -------------------------------- JSON feed ------------------------------- */

function parseJsonFeed(file, content, runDate) {
  const data = JSON.parse(content)
  const rows = Array.isArray(data) ? data : Array.isArray(data.listings) ? data.listings : []
  return rows.map((r, i) => toSighting(`feed:json:${file}`, { ...r, agency: r.agency ?? data.agency }, i, runDate))
}

/* -------------------------------- CSV feed -------------------------------- */

function parseCsv(content) {
  const lines = content.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const header = lines[0].split(',').map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim())
    const row = {}
    header.forEach((h, i) => (row[h] = cells[i] ?? ''))
    return row
  })
}

function parseCsvFeed(file, content, runDate) {
  return parseCsv(content).map((r, i) =>
    toSighting(`feed:csv:${file}`, {
      id: r.ref,
      title: r.title,
      type: r.type,
      area: r.area,
      price: r.price_kes,
      sqm: r.sqm,
      beds: r.beds,
      baths: r.baths,
      agency: r.agency,
      agent: r.agent,
      phone: r.phone,
      offPlan: r.off_plan,
    }, i, runDate),
  )
}

/* -------------------------------- XML feed -------------------------------- */

/** Minimal, dependency-free XML → rows for our controlled feed shape. */
function parseXmlRows(content) {
  const rows = []
  const listingBlocks = content.match(/<listing>[\s\S]*?<\/listing>/g) ?? []
  for (const block of listingBlocks) {
    const get = (tag) => {
      const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))
      return m ? m[1].trim() : ''
    }
    rows.push({
      id: get('ref'),
      title: get('title'),
      type: get('type'),
      area: get('area'),
      price_kes: get('price'),
      sqm: get('size_sqm'),
      beds: get('bedrooms'),
      baths: get('bathrooms'),
      agency: get('agency'),
      agent: get('agent'),
      phone: get('phone'),
      off_plan: get('off_plan'),
    })
  }
  return rows
}

function parseXmlFeed(file, content, runDate) {
  return parseXmlRows(content).map((r, i) => toSighting(`feed:xml:${file}`, r, i, runDate))
}

/* --------------------------------- public --------------------------------- */

export function ingestFeeds(runDate) {
  const results = []
  const status = []
  if (!existsSync(FEEDS_DIR)) return { sightings: [], status }
  for (const file of readdirSync(FEEDS_DIR).filter((f) => /\.(json|csv|xml)$/i.test(f)).sort()) {
    const path = join(FEEDS_DIR, file)
    try {
      const content = readFileSync(path, 'utf8')
      let sightings = []
      if (file.endsWith('.json')) sightings = parseJsonFeed(file, content, runDate)
      else if (file.endsWith('.csv')) sightings = parseCsvFeed(file, content, runDate)
      else sightings = parseXmlFeed(file, content, runDate)
      results.push(...sightings)
      status.push({ feed: file, format: file.split('.').pop().toUpperCase(), items: sightings.length, state: 'ok' })
    } catch (err) {
      status.push({ feed: file, format: file.split('.').pop().toUpperCase(), items: 0, state: `error: ${err.message}` })
    }
  }
  return { sightings: results, status }
}
