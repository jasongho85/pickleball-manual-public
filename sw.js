const CACHE_NAME = 'pb-kata-v1';

// Install event: skip waiting to activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: Network-first, fallback to cache
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET requests and http/https
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Handle _assets (Vite bundles) with Cache-First since they are hashed and immutable
  if (url.pathname.includes('/_assets/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return networkResponse;
        });
      })
    );
    return;
  }

  // For everything else (HTML, JSON, Images), use Network-First, fallback to Cache
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // If it's a navigation request and we're offline, return the offline page if cached
        if (request.mode === 'navigate') {
          const offlineResponse = await caches.match(new Request(url.origin + '/pickleball-manual-public/offline/'));
          if (offlineResponse) return offlineResponse;
        }
      })
  );
});
