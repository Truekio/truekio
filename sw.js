// ── Truquo Service Worker v1 ──
// Estrategia: Network First para HTML, Cache First para assets estáticos
// El HTML siempre se intenta desde red → garantiza versión fresca

const CACHE_NAME = 'truquo-v1';
const CACHE_ASSETS = [
  // Solo assets verdaderamente estáticos (no el HTML principal)
];

// Instalar: precachear assets estáticos
self.addEventListener('install', event => {
  self.skipWaiting(); // activar inmediatamente sin esperar a que cierren las tabs
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_ASSETS);
    })
  );
});

// Activar: limpiar caches antiguas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim()) // tomar control de todas las tabs inmediatamente
  );
});

// Fetch: Network First para todo
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // No interceptar requests a Supabase ni a APIs externas
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    request.method !== 'GET'
  ) {
    return; // dejar pasar sin interceptar
  }

  // Para el HTML principal: Network First con fallback a cache
  if (request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Guardar copia fresca en cache
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          // Sin red: servir desde cache (modo offline)
          return caches.match(request).then(cached => cached || caches.match('/'));
        })
    );
    return;
  }

  // Para assets estáticos (fuentes, iconos, etc.): Cache First
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return response;
      });
    })
  );
});

// Escuchar mensaje de la app para forzar actualización
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
