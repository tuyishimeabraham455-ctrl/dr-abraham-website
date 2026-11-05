/* Service worker: offline support for the installed app. Version 20261105103606 */
const CACHE = 'yo-20261105103606';
const PRECACHE = ["","offline/","book/","speaking/","agent-yo/","portal/","assets/css/yo.css?v=20261105103606","assets/js/yo.js?v=20261105103606","assets/js/app.js?v=20261105103606","assets/app/icon-192.png","images/yolanda.jpg"];
const base = new URL('./', self.location).href;
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(PRECACHE.map((p) => c.add(new Request(base + p, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('yo-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/api/') || url.pathname.includes('/admin') || url.pathname.includes('/uploads/videos/') || req.headers.has('range')) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; })
      .catch(() => caches.match(req).then((hit) => hit || caches.match(base + 'offline/'))));
    return;
  }
  // Code and styles: always the newest when online, the saved copy when offline
  if (req.destination === 'script' || req.destination === 'style' || req.destination === 'manifest') {
    e.respondWith(fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; })
      .catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }
  // Images and fonts: saved copy first, refreshed in the background
  e.respondWith(caches.match(req).then((hit) => {
    const net = fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
