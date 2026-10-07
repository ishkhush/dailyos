// DailyOS Service Worker
// Registered by the inline <script> in index.html <head> on every page load.
// Strategy: network-first with cache fallback for public app assets.
// Cache name is versioned — bumping the version here forces all clients to
// drop the old cache on next activate, which is how you push a forced update.

const CACHE = 'dailyos-1791398334';
const PUBLIC_FILES = ['./','./index.html','./sw.js','./dailyos-sync.js','./dailyos-photos.js','./dailyos-xp.js','./dailyos-audio.js','./sync-config.js','./supabase.min.js'];
const PUBLIC_SCRIPTS = [
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.29.6/babel.min.js',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js'
];
const PUBLIC_URLS = new Set(PUBLIC_FILES.concat(PUBLIC_SCRIPTS).map(path => new URL(path, self.location.href).href));

// On install: pre-cache './' so the app loads instantly from cache next visit.
// skipWaiting() makes the new SW take control immediately instead of waiting
// for all tabs to close first — important for a single-tab personal app.
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(PUBLIC_FILES.filter(path => path !== './index.html' && path !== './sw.js').concat(PUBLIC_SCRIPTS));
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
        keys.filter(function(k) { return k.startsWith('dailyos-') && k !== CACHE; })
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
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || e.request.headers.has('Authorization') || url.hostname.endsWith('.supabase.co')) return;
  const publicFont = ['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname) && url.protocol === 'https:';
  if (!PUBLIC_URLS.has(url.href) && !publicFont) return;
  // Only handle same-origin navigation requests (the app itself).
  // cache:'no-cache' forces revalidation past the CDN/HTTP cache (GitHub
  // Pages serves max-age=600, which otherwise hands back stale HTML for up
  // to 10 minutes). Fresh copies also refresh the offline fallback, which
  // install() only seeds once. fetch(url, init) instead of fetch(e.request,
  // init) because navigate-mode Requests can't be reconstructed with an init.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request.url, { cache: 'no-cache' }).then(function(resp) {
        if (resp && resp.status === 200) {
          var clone = resp.clone();
          e.waitUntil(caches.open(CACHE).then(function(cache) { return cache.put('./', clone); }).catch(function() {}));
        }
        return resp;
      }).catch(function() {
        return caches.open(CACHE).then(function(cache) { return cache.match('./'); });
      })
    );
    return;
  }
  // For all other requests, try network first, fall back to cache
  e.respondWith(
    fetch(e.request).then(function(resp) {
      // Cache a copy of successful responses
      if (resp && resp.status === 200 && ['basic','cors'].includes(resp.type)) {
        var clone = resp.clone();
        e.waitUntil(caches.open(CACHE).then(function(cache) {
          return cache.put(e.request, clone);
        }).catch(function() {}));
      }
      return resp;
    }).catch(function() {
      return caches.open(CACHE).then(function(cache) { return cache.match(e.request); });
    })
  );
});
