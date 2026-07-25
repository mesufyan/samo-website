/* SAMO service worker
   Cache-first for local assets, network-first for navigation so a redeploy
   is picked up on the next visit. Bump CACHE_VERSION when you ship. */

var CACHE_VERSION = 'samo-v1';
var BASE = self.registration.scope;

var PRECACHE = [
  '',
  'index.html',
  'offline.html',
  'manifest.json',
  'assets/css/style.css',
  'assets/js/data.js',
  'assets/js/app.js',
  'assets/images/favicon.svg',
  'assets/images/map-pattern.svg',
  'assets/images/icon-192.png',
  'assets/images/icon-512.png'
].map(function (p) { return new URL(p, BASE).toString(); });

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(function (cache) { return cache.addAll(PRECACHE); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () { /* a missing file must not block install */ })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE_VERSION) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  // Never cache cross-origin requests (fonts CDN, Tailwind CDN, form endpoint)
  if (new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(function () {
        return caches.match(new URL('offline.html', BASE).toString())
          .then(function (r) { return r || caches.match(new URL('index.html', BASE).toString()); });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(function (cached) {
      return cached || fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE_VERSION).then(function (c) { c.put(req, copy); });
        return res;
      });
    })
  );
});
