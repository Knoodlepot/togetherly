// Togetherly — Service Worker
const CACHE = 'togetherly-v1';
const PRECACHE = ['/', '/user', '/family', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('push', e => {
  const data = e.data?.json() ?? { title: 'Togetherly', body: 'New update', type: 'checkin' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      requireInteraction: data.type === 'sos',
      tag: data.type === 'sos' ? 'sos' : 'checkin',
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/family'));
});

self.addEventListener('fetch', e => {
  // Network-first for API/Supabase calls; cache-first for app shell
  const url = new URL(e.request.url);
  const isApi = url.hostname.includes('supabase') || url.pathname.startsWith('/api/');

  if (isApi) {
    e.respondWith(fetch(e.request).catch(() => new Response('Offline', { status: 503 })));
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      const fresh = fetch(e.request).then(res => {
        if (res.ok && e.request.method === 'GET') {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      });
      return cached || fresh;
    })
  );
});
