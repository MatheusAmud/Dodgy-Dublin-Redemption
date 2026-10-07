// Bump this number every time you upload a new version of the game,
// so phones that installed it pick up the update.
const CACHE = 'dodgy-dublin-v7';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './favicon.ico',
  './icons/logo.png', './icons/icon-192.png', './icons/icon-512.png',
  './icons/icon-maskable-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {
    // Game page: try the network first so updates arrive, fall back to the saved copy offline.
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return res; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // The voice list changes when new recordings are added: always ask the network first.
  if (req.url.includes('/voices/clips.json')) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }
  // Everything else (icons, font, voice clips): saved copy first, then network.
  // Only good responses are saved, so a missing file is never remembered as missing.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
