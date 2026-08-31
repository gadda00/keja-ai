/* Service worker — app shell + asset caching for GitHub Pages hosting.
   Strategy:
   - /assets/* (hashed): cache-first (immutable), only 200s
   - images: cache-first (only 200s), versioned cache
   - navigations: network-first (8s timeout) -> cached page -> cached shell -> offline page
   Cache version is stamped mechanically by scripts/sw-version.mjs from a
   hash of the deployed files — no manual bumping, stale caches self-evict.
*/
const VERSION = 'v4'
const ASSET_CACHE = `${VERSION}-assets`
const IMG_CACHE = `${VERSION}-images`
const PAGE_CACHE = `${VERSION}-pages`
const BASE = self.registration.scope

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.allSettled([
      caches.open(PAGE_CACHE).then((c) => c.add(BASE)),
      caches.open(PAGE_CACHE).then((c) => c.add(`${BASE}index.html`)),
      caches.open(PAGE_CACHE).then((c) => c.add(`${BASE}offline.html`)),
    ]),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
    ),
  )
  self.clients.claim()
})

const ok = (res) => res && res.status === 200

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== location.origin) return

  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (ok(res)) {
              const copy = res.clone()
              // waitUntil: keep the SW alive until the cache write lands —
              // a bare .then() chain can be killed mid-put and silently
              // drop the entry
              event.waitUntil(caches.open(ASSET_CACHE).then((c) => c.put(request, copy)))
            }
            return res
          }),
      ),
    )
    return
  }

  if (/\.(?:png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((hit) => {
        if (hit) return hit
        return fetch(request).then((res) => {
          if (ok(res)) {
            const copy = res.clone()
            event.waitUntil(caches.open(IMG_CACHE).then((c) => c.put(request, copy)))
          }
          return res
        })
      }),
    )
    return
  }

  if (request.mode === 'navigate') {
    // 8s timeout: on slow/lie-fi connections a hanging fetch used to block
    // the cache fallback indefinitely (stuck blank page). Race it instead.
    const timedFetch = Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('sw-timeout')), 8000)),
    ])
    event.respondWith(
      timedFetch
        .then((res) => {
          if (ok(res)) {
            const copy = res.clone()
            event.waitUntil(caches.open(PAGE_CACHE).then((c) => c.put(request, copy)))
          }
          return res
        })
        .catch(async () => {
          const cached = (await caches.match(request)) || (await caches.match(`${BASE}index.html`))
          if (cached) return cached
          return (
            (await caches.match(`${BASE}offline.html`)) ||
            new Response('<h1>Offline</h1><p>Please reconnect to load this page.</p>', {
              status: 200,
              headers: { 'Content-Type': 'text/html' },
            })
          )
        }),
    )
  }
})
