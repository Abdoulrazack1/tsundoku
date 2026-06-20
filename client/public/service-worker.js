/* Tsundoku — Service Worker (PWA hors-ligne) */
const VERSION = 'tsundoku-v1';
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;

const PRECACHE = [
  '/',
  '/articles.html',
  '/assets/css/reset.css',
  '/assets/css/tokens.css',
  '/assets/css/typography.css',
  '/assets/css/layout.css',
  '/assets/css/components.css',
  '/assets/css/animations.css',
  '/assets/css/dark-mode.css',
  '/assets/js/main.js',
  '/assets/img/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // API : réseau uniquement (données fraîches)
  if (url.pathname.startsWith('/api/')) return;

  // Pages HTML : network-first, repli cache puis accueil
  if (request.mode === 'navigate' || request.destination === 'document') {
    e.respondWith(
      fetch(request).then((res) => { caches.open(PAGES).then((c) => c.put(request, res.clone())); return res; })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    );
    return;
  }

  // Assets (css/js/img/fonts) : cache-first, mise à jour en arrière-plan
  e.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((res) => {
        if (res.ok && (url.origin === location.origin || url.hostname.includes('gstatic') || url.hostname.includes('jsdelivr')))
          caches.open(STATIC).then((c) => c.put(request, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
