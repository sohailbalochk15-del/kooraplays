const CACHE_NAME = "kooraplays-v4";
const STATIC_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png"
];

const API_CACHE_NAME = "kooraplays-api-v4";
const API_CACHE_DURATION = 60 * 1000;

function isCacheable(url) {
  return url.startsWith("http://") || url.startsWith("https://");
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== API_CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (!isCacheable(request.url)) return;

  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/proxy/")) {
    return;
  }

  if (url.pathname.startsWith("/api/worldcup/")) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    return;
  }

  if (
    request.destination === "document" ||
    url.pathname.startsWith("/src/") ||
    url.pathname.startsWith("/assets/")
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function networkFirstWithCache(request) {
  const cache = await caches.open(API_CACHE_NAME);
  try {
    const response = await fetch(request.clone());
    if (response.ok && isCacheable(request.url)) {
      const cloned = response.clone();
      const headers = new Headers(cloned.headers);
      headers.set("sw-cached-at", Date.now().toString());
      const body = await cloned.arrayBuffer();
      cache.put(request, new Response(body, { status: 200, headers }));
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      const cachedAt = Number(cached.headers.get("sw-cached-at") ?? 0);
      if (Date.now() - cachedAt < API_CACHE_DURATION * 5) return cached;
    }
    return new Response(JSON.stringify({ error: "Offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok && isCacheable(request.url)) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? caches.match("/");
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok && isCacheable(request.url)) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}
