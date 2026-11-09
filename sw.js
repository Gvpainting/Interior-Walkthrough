// Grandview Walkthrough service worker: keeps the app usable with no signal.
// Bump VERSION whenever index.html changes so iPads pick up the new copy.
const VERSION = 'gv-walkthrough-v9';
const ASSETS = ['./', './index.html', './manifest.json', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Cache first (instant + offline), refresh the cache in the background when online.
self.addEventListener('fetch', e => {
  const req = e.request;
  // Only same-origin GETs are cached. Address lookups (photon.komoot.io / Google) and uploads always go to the network.
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // Only the app page itself is stored as the offline copy (v9: never some other page on the same site).
  if (req.mode === 'navigate' && !/\/(index\.html)?$/.test(url.pathname)) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const key = req.mode === 'navigate' ? './index.html' : req;
    const hit = await cache.match(key, { ignoreSearch: true });
    const net = fetch(req).then(res => { if (res.ok) cache.put(key, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || new Response('Offline', { status: 503 });
  }));
});
