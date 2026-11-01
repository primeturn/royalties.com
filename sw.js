/* =====================================================================
   PRIME TURN — service worker (makes the site installable as an app)
   - Pages/scripts: network first (customers always get your latest
     upload), saved copy used only if the phone is offline.
   - Images/icons: saved copy first (fast).
   - JSONBin / fonts / any other website is NEVER touched or saved.
   When you upload a new version of the site, change the number below
   (v1 -> v2) so phones drop the old saved files.
   ===================================================================== */
var VERSION = 'v4';
var CACHE = 'primeturn-' + VERSION;

var CORE = [
  './',
  'index.html',
  'dashboard.html',
  'asset.html',
  'app.js',
  'pwa.js',
  'royal.css',
  'royal.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'assets/logo-96.webp',
  'assets/logo-192.webp'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      /* one missing file must not stop the install */
      return Promise.all(CORE.map(function (u) { return c.add(u).catch(function () {}); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.indexOf('primeturn-') === 0 && k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;            /* leave JSONBin, fonts, etc. alone */
  if (url.pathname.slice(-9) === '/admin.html') return;  /* admin is never cached */

  var isPage = req.mode === 'navigate' || /\.(html|js|json|webmanifest)$/.test(url.pathname) || url.pathname.slice(-1) === '/';

  if (isPage) {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
        return res;
      }).catch(function () {
        return caches.match(req, { ignoreSearch: true }).then(function (hit) {
          return hit || caches.match('dashboard.html') || caches.match('index.html');
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
        return res;
      });
    })
  );
});
