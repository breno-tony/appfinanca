const CACHE = "meu-financeiro-v4";
const STATIC_ASSETS = [
  "./styles.css",
  "./manifest.json"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Nunca cacheia os arquivos que mudam configuração/comportamento.
  if (
    url.pathname.endsWith("/supabase-config.js") ||
    url.pathname.endsWith("/app.js") ||
    url.pathname.endsWith("/index.html") ||
    url.pathname === "/" ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
