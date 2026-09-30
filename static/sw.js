const CACHE = 'la-outdoors-unified-v2';
const SHELL = ['/', '/static/css/fishing.css', '/static/js/fishing.js', '/manifest.webmanifest', '/radio'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/proxy/')) return;
  e.respondWith(fetch(e.request).then(r => { if(r.ok && e.request.method === 'GET') caches.open(CACHE).then(c => c.put(e.request, r.clone())); return r; }).catch(() => caches.match(e.request)));
});
