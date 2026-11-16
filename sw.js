/* Service worker: zorgt dat Kluspunten ook zonder internet opent.
   Eerst het netwerk proberen (zodat een nieuwe versie meteen binnenkomt), anders de bewaarde kopie. */
const CACHE = 'kluspunten-v1';
const BESTANDEN = [
  './',
  'index.html',
  'styles.css',
  'js/avatar.js',
  'js/app.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(BESTANDEN)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((namen) => Promise.all(namen.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  ev.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const vers = await Promise.race([
        fetch(req),
        new Promise((_, nee) => setTimeout(() => nee(new Error('te traag')), 3000)),
      ]);
      if (vers.ok) cache.put(req, vers.clone());
      return vers;
    } catch (e) {
      const bewaard = await cache.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' && await cache.match('index.html'));
      if (bewaard) return bewaard;
      throw e;
    }
  })());
});
