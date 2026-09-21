// Deliberately conservative: this app is auth-heavy (JWT bearer tokens) and
// its locale comes from a cookie (see src/i18n/request.ts), so HTML/API
// responses are never written to the cache — only navigations get an
// offline fallback, and static build assets get cache-first.
const CACHE_VERSION = "duck-cache-v4"
const PRECACHE_URLS = ["/offline.html", "/logo-transparent.png", "/icon-192.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS)),
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname.startsWith("/videos/")
  )
}

function isImage(request, url) {
  return (
    request.destination === "image" ||
    /\.(png|jpe?g|webp|svg|gif|avif|ico)$/i.test(url.pathname)
  )
}

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET" || request.headers.has("range")) return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith("/api/")) return // never cache API responses

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html")),
    )
    return
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            // Never persist a failed chunk response: it would otherwise keep
            // breaking navigation even after the visitor's connection recovers.
            if (response.ok) {
              const copy = response.clone()
              event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)).catch(() => {}))
            }
            return response
          }),
      ),
    )
    return
  }

  if (isImage(request, url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone()
              event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)).catch(() => {}))
            }
            return response
          })
          .catch(() => cached)
        return cached || network
      }),
    )
  }
})
