/* Mi Paraiso app worker (one worker for the whole site, scope ./):
   1) App (Nov 20, 2026): always the latest version (pages are fetched fresh from the internet every time;
      the saved copies are used only when there is no connection) and the "No connection" screen.
   2) Push notifications (neighbor chat). The Firebase settings come in the registration address (?c=...),
      sent by the dashboard, so nothing is hard-coded here. Without ?c= no push is set up. */
var MP_CACHE = 'mp-app-v1';
var MP_KEEP = ['offline.html', 'icon-192.png', 'manifest.webmanifest'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(MP_CACHE).then(function (c) { return c.addAll(MP_KEEP.map(function (u) { return new Request(u, { cache: 'reload' }); })); })
    .catch(function () {}).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== MP_CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return; // the dashboard itself (Google) is always live
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r, { cache: 'no-cache' }).catch(function () {
      return caches.match('offline.html', { ignoreSearch: true });
    }));
    return;
  }
  e.respondWith(fetch(r).then(function (res) {
    if (res && res.ok && MP_KEEP.some(function (k) { return r.url.indexOf(k) !== -1; })) {
      var copy = res.clone(); caches.open(MP_CACHE).then(function (c) { c.put(r, copy); });
    }
    return res;
  }).catch(function () { return caches.match(r, { ignoreSearch: true }); }));
});

try {
  var cfg = JSON.parse(new URL(self.location.href).searchParams.get('c') || 'null');
  if (cfg) {
    importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');
    firebase.initializeApp(cfg); firebase.messaging(); // shows notifications while the app is closed
  }
} catch (e) {}
