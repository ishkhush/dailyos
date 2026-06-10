// DailyOS Service Worker
// Registered by the inline <script> in index.html <head> on every page load.
// Strategy: network-first with cache fallback for all requests.
// Cache name is versioned — bumping the version here forces all clients to
// drop the old cache on next activate, which is how you push a forced update.
// Only index.html and sw.js are deployed (see deploy.sh); nothing else is served.

const CACHE = 'dailyos-v4';

// On install: pre-cache './' so the app loads instantly from cache next visit.
// skipWaiting() makes the new SW take control immediately instead of waiting
// for all tabs to close first — important for a single-tab personal app.
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(['./']);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// On activate: delete every cache except the current version.
// This is the only cleanup path — old caches are never pruned otherwise.
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// On fetch: network-first for everything.
// Navigation requests (page loads) fall back to cached './' so the app
// opens offline. All other requests (CDN scripts, API calls) also try
// network first, and only the CDN scripts get cached — API calls are
// never cached because they require auth headers.
self.addEventListener('fetch', function(e) {
  // Only handle same-origin navigation requests (the app itself)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(function() {
        return caches.match('./');
      })
    );
    return;
  }
  // For all other requests, try network first, fall back to cache
  e.respondWith(
    fetch(e.request).then(function(resp) {
      // Cache a copy of successful responses
      if (resp && resp.status === 200 && resp.type === 'basic') {
        var clone = resp.clone();
        caches.open(CACHE).then(function(cache) {
          cache.put(e.request, clone);
        });
      }
      return resp;
    }).catch(function() {
      return caches.match(e.request);
    })
  );
});
