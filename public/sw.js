/* Keja.ai service worker — app shell + asset caching for GitHub Pages hosting.
   Strategy:
   - /assets/* (hashed): cache-first (immutable)
   - images: cache-first with 30-day TTL
   - navigations: network-first, fall back to cached index, then offline page
*/
const VERSION = 'keja-v3'
const ASSET_CACHE = `${VERSION}-assets`
const IMG_CACHE = `${VERSION}-images`
const PAGE_CACHE = `${VERSION}-pages`
const BASE = self.registration.scope // includes trailing /keja-ai/

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PAGE_CACHE).then((c) => c.addAll([BASE, `${BASE}index.html`, `${BASE}offline.html`]).catch(() => {})),
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
            const copy = res.clone()
            caches.open(ASSET_CACHE).then((c) => c.put(request, copy))
            return res
          }),
      ),
    )
    return
  }

  if (/\.(?:png|jpg|jpeg|webp|svg|woff2?)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((hit) => {
        if (hit) return hit
        return fetch(request).then((res) => {
          const copy = res.clone()
          caches.open(IMG_CACHE).then((c) => c.put(request, copy))
          return res
        })
      }),
    )
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(PAGE_CACHE).then((c) => c.put(request, copy))
          return res
        })
        .catch(async () => {
          const cached = await caches.match(request)
          if (cached) return cached
          const shell = await caches.match(`${BASE}index.html`)
          if (shell) return shell
          return new Response('<h1>Offline</h1><p>Keja.ai needs a connection to load this page.</p>', {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
          })
        }),
    )
  }
})
