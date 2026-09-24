/* Atmospheric Weather service worker: offline shell + stale API fallback. */
const SHELL = "aw-shell-v2";

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

  // API: network-first with its own timeout, fall back to cache (§28).
  // The SW must never hang a page fetch: dead networks resolve to a real
  // 504 JSON so the app's error state can engage.
  if (url.pathname.startsWith("/api/weather")) {
    event.respondWith(
      fetch(request, { signal: AbortSignal.timeout(10_000) })
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(async () => {
          const hit = await caches.match(request);
          if (hit) return hit;
          return new Response(JSON.stringify({ error: "The request timed out. Check your connection, then refresh.", suggestions: ["Ahmedabad", "Mumbai", "London", "Tokyo", "New York"] }), { status: 504, headers: { "content-type": "application/json" } });
        })
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
