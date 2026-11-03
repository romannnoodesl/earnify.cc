const CACHE = "earnify-v3";
// Core app shell only: feeds/metadata (sitemap.xml, rss.xml, llms.txt)
// are intentionally NOT precached — they are network-first below.
const ASSETS = [
  "/",
  "/index.html",
  "/demo/",
  "/blog/",
  "/miner.js",
  "/favicon.svg",
  "/favicon-96x96.png",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/manifest.json"
];

// Always fetch fresh from network, fall back to cache only when offline.
const NETWORK_FIRST_PATHS = new Set(["/sitemap.xml", "/rss.xml", "/llms.txt"]);

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  // Query-string URLs: skip cache entirely, go straight to network.
  if (url.search) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Feeds/metadata: network-first so crawlers and readers never get stale XML.
  if (NETWORK_FIRST_PATHS.has(url.pathname)) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((cache) => cache.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Everything else: stale-while-revalidate — serve cached immediately,
  // refresh from network in the background for next time.
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const networked = fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((cache) => cache.put(e.request, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || networked;
    })
  );
});
