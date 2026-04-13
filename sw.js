// ── Truquo Service Worker v5 ──
const CACHE_NAME = 'truquo-v5';

self.addEventListener('install', event => {
  console.log('[SW] Installing v5');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('[SW] Activating v5');
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
  let title = 'Truquo', body = 'Tienes una novedad', url = '/', tag = 'truquo';
  if (event.data) {
    try {
      const data = JSON.parse(event.data.text());
      title = data.title || title; body = data.body || body;
      url = data.url || url; tag = data.tag || tag;
    } catch(e) { body = event.data.text() || body; }
  }

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body, icon: '/icon.png', badge: '/icon.png', tag, data: { url }, vibrate: [200, 100, 200],
      }),
      // Incrementar badge del icono de la app
      self.registration.getNotifications().then(notifications => {
        const count = notifications.length + 1;
        if ('setAppBadge' in navigator) navigator.setAppBadge(count).catch(() => {});
        if ('setAppBadge' in self) self.setAppBadge(count).catch(() => {});
      })
    ])
  );
});

// ── CLICK en notificación ──
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    Promise.all([
      // Limpiar badge al abrir
      self.registration.getNotifications().then(notifications => {
        if (notifications.length === 0) {
          if ('clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {});
          if ('clearAppBadge' in self) self.clearAppBadge().catch(() => {});
        }
      }),
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow(targetUrl);
      })
    ])
  );
});

// ── Limpiar badge cuando el usuario abre la app ──
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'CLEAR_BADGE') {
    if ('clearAppBadge' in self) self.clearAppBadge().catch(() => {});
  }
});
