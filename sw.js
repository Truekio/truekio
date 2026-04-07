// ── Truquo Service Worker v4 ──
const CACHE_NAME = 'truquo-v4';

self.addEventListener('install', event => {
  console.log('[SW] Installing v4');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('[SW] Activating v4');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.hostname.includes('supabase.co') || url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com') || request.method !== 'GET') return;
  if (request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(fetch(request).then(response => {
      const clone = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
      return response;
    }).catch(() => caches.match(request).then(cached => cached || caches.match('/'))));
    return;
  }
  event.respondWith(caches.match(request).then(cached => {
    if (cached) return cached;
    return fetch(request).then(response => {
      const clone = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
      return response;
    });
  }));
});

// ── PUSH ──
self.addEventListener('push', event => {
  console.log('[SW] Push recibido:', event.data ? 'con datos' : 'sin datos');

  let title = 'Truquo';
  let body  = 'Tienes una novedad';
  let url   = '/';
  let tag   = 'truquo';

  if (event.data) {
    try {
      const text = event.data.text();
      console.log('[SW] Push data text:', text.substring(0, 100));
      const data = JSON.parse(text);
      title = data.title || title;
      body  = data.body  || body;
      url   = data.url   || url;
      tag   = data.tag   || tag;
    } catch(e) {
      console.log('[SW] Push data no es JSON:', e.message);
      body = event.data.text() || body;
    }
  }

  console.log('[SW] Mostrando notificación:', title, body);

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:    '/icon.png',
      badge:   '/icon.png',
      tag,
      data:    { url },
      vibrate: [200, 100, 200],
    })
  );
});

// ── CLICK ──
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
