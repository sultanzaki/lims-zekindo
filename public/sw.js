// Minimal service worker — exists mainly to satisfy PWA installability
// criteria (a fetch handler + a valid manifest). Lab data must always be
// fresh, so this deliberately does NOT cache any app page or API response;
// it only caches a few truly static assets and offers an offline fallback
// page when a navigation can't reach the network at all.
const CACHE_NAME = "zekindo-lims-static-v1";
const STATIC_ASSETS = [
  "/zekindo-logo.png",
  "/zekindo-logo-white.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/offline.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
  }
});
