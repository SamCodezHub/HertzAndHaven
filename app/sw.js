const CACHE = 'hertz-haven-shell-v2';
const SHELL = ['./', './index.html', './styles.css', './app.js', './manifest.webmanifest', './new_logo_mark.jpg'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname.includes('/api/')) return;
  if (event.request.method === 'GET' && url.origin === self.location.origin) event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
