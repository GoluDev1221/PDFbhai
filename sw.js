
const CACHE_NAME = 'pdfbhai-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/logo.png',
  '/manifest.json'
];

// Install Event: Cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean up old caches
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

// Fetch Event: Network first, fall back to cache (Stale-while-revalidate strategy)
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests (like Google Fonts or CDNs) for strict caching, 
  // or handle them. For now, we try to cache everything to ensure offline usage.
  
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached response if found
      if (cachedResponse) {
        // Update cache in background
        fetch(event.request).then((networkResponse) => {
            if(networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse);
                });
            }
        }).catch(() => {}); // Eat errors on background update
        
        return cachedResponse;
      }

      // Otherwise fetch from network
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // Cache the new resource
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // If offline and not in cache, we could return a fallback page here
        // For this app, simply failing is acceptable as core assets are pre-cached
      });
    })
  );
});
