#!/usr/bin/env node
/**
 * sw-version.mjs — mechanical service-worker cache versioning.
 *
 * Problem this solves: the SW cache name (`VERSION`) was bumped by hand
 * (v3 → v4 → v5 were manual edits). A deploy that changes site content
 * without remembering the bump serves stale offline pages indefinitely.
 *
 * Approach: hash the entire dist/ tree (every file's path + content, sw.js
 * itself excluded) and stamp `const VERSION = 'v<hash12>'` into dist/sw.js.
 * Content changes → new hash → new cache names → old caches are evicted on
 * activate. No-content deploys keep the same version (no needless cache
 * churn). Zero npm dependencies — runs in any CI job after the build.
 *
 * Usage:  node scripts/sw-version.mjs          (expects dist/ to exist)
 */
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = resolve(ROOT, 'dist')
const SW = resolve(DIST, 'sw.js')

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, acc)
    else acc.push(full)
  }
  return acc
}

const dist = DIST
if (!existsSync(SW)) {
  console.error('[sw-version] dist/sw.js not found — run the build first')
  process.exit(1)
}

// hash every deployed artifact except the service worker itself
const files = walk(dist).filter((f) => f !== SW).sort()
const hash = createHash('sha256')
for (const f of files) {
  hash.update(f.slice(dist.length))
  hash.update(readFileSync(f))
}
const version = 'v' + hash.digest('hex').slice(0, 12)

const src = readFileSync(SW, 'utf8')
const prev = src.match(/const VERSION = '([^']*)'/)?.[1]
if (!prev) {
  console.error('[sw-version] could not find `const VERSION = ...` in sw.js')
  process.exit(1)
}

if (prev === version) {
  console.log(`[sw-version] cache version unchanged (${version}) — content identical`)
} else {
  writeFileSync(SW, src.replace(/const VERSION = '[^']*'/, `const VERSION = '${version}'`), 'utf8')
  console.log(`[sw-version] cache version ${prev} -> ${version} (stale caches will self-evict)`)
}
