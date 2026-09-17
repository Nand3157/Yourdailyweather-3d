/* Atmospheric Weather service worker: offline shell + stale API fallback. */
const SHELL = "aw-shell-v1";
const API_TTL = 10 * 60 * 1000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(["/", "/manifest.webmanifest"])).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // API: network-first, fall back to cache when offline (§28).
  if (url.pathname.startsWith("/api/weather")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit || Response.error()))
    );
    return;
  }

  // Navigations & static: cache-first shell.
  event.respondWith(
    caches.match(request).then((hit) => hit || fetch(request).then((res) => {
      if (url.origin === location.origin) {
        const copy = res.clone();
        caches.open(SHELL).then((c) => c.put(request, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match("/")))
  );
});
