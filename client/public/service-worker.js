/**
 * Pluqla PWA Service Worker
 * Offline Mode Implementation with Workbox-like patterns
 *
 * Features:
 * - Static assets caching (HTML, CSS, JS, images)
 * - API responses caching (Network First strategy)
 * - Offline fallback pages
 * - Background sync for favorites
 */

const CACHE_VERSION = 'pluqla-v1.0.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const API_CACHE = `${CACHE_VERSION}-api`;
const IMAGES_CACHE = `${CACHE_VERSION}-images`;

// Static assets to precache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/css/main.css',
  '/static/js/main.js',
  '/assets/logos/pluqla-logo.svg',
  '/assets/logos/pluqla-icon-192.png',
  '/assets/logos/pluqla-icon-512.png',
];

// API endpoints to cache
const API_ROUTES = [
  '/api/recipes',
  '/api/favorites',
  '/api/meal-planning',
];

// Maximum cache sizes
const MAX_CACHE_SIZE = {
  [DYNAMIC_CACHE]: 50,
  [API_CACHE]: 100,
  [IMAGES_CACHE]: 200,
};

// Maximum cache age (in milliseconds)
const MAX_CACHE_AGE = {
  [STATIC_CACHE]: 7 * 24 * 60 * 60 * 1000, // 7 days
  [DYNAMIC_CACHE]: 24 * 60 * 60 * 1000, // 1 day
  [API_CACHE]: 1 * 60 * 60 * 1000, // 1 hour
  [IMAGES_CACHE]: 30 * 24 * 60 * 60 * 1000, // 30 days
};

/**
 * INSTALL EVENT
 * Precache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Precaching static assets...');
        return cache.addAll(STATIC_ASSETS.filter((url) => url !== '/'));
      })
      .then(() => {
        console.log('[SW] Static assets precached');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('[SW] Precaching failed:', error);
      })
  );
});

/**
 * ACTIVATE EVENT
 * Clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (
              cacheName.startsWith('pluqla-') &&
              !cacheName.startsWith(CACHE_VERSION)
            ) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim(); // Take control immediately
      })
  );
});

/**
 * FETCH EVENT
 * Network First for API, Cache First for assets
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // API Requests - Network First with Cache Fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request, API_CACHE));
    return;
  }

  // Images - Cache First with Network Fallback
  if (
    request.destination === 'image' ||
    url.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp|avif)$/i)
  ) {
    event.respondWith(cacheFirstStrategy(request, IMAGES_CACHE));
    return;
  }

  // Static Assets - Cache First with Network Fallback
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    url.pathname.match(/\.(css|js|woff2?|ttf|eot)$/i)
  ) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    return;
  }

  // HTML Documents - Network First with Cache Fallback
  if (request.destination === 'document' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
    return;
  }

  // Default - Network First
  event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
});

/**
 * NETWORK FIRST STRATEGY
 * Try network, fallback to cache if offline
 */
async function networkFirstStrategy(request, cacheName) {
  try {
    // Try network first
    const networkResponse = await fetch(request);

    // Clone response (can only be read once)
    const responseToCache = networkResponse.clone();

    // Cache successful responses (200-299)
    if (networkResponse.ok) {
      caches.open(cacheName).then((cache) => {
        cache.put(request, responseToCache);
      });

      // Limit cache size
      limitCacheSize(cacheName, MAX_CACHE_SIZE[cacheName]);
    }

    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      // Check if cache is stale
      const cacheAge = Date.now() - new Date(cachedResponse.headers.get('date')).getTime();
      if (cacheAge < MAX_CACHE_AGE[cacheName]) {
        return cachedResponse;
      }
    }

    // No cache, return offline fallback
    return offlineFallback(request);
  }
}

/**
 * CACHE FIRST STRATEGY
 * Try cache, fallback to network
 */
async function cacheFirstStrategy(request, cacheName) {
  // Try cache first
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Check if cache is stale
    const cacheAge = Date.now() - new Date(cachedResponse.headers.get('date') || Date.now()).getTime();
    if (cacheAge < MAX_CACHE_AGE[cacheName]) {
      return cachedResponse;
    }
  }

  // Cache miss or stale, try network
  try {
    const networkResponse = await fetch(request);

    // Clone and cache
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      caches.open(cacheName).then((cache) => {
        cache.put(request, responseToCache);
      });

      // Limit cache size
      limitCacheSize(cacheName, MAX_CACHE_SIZE[cacheName]);
    }

    return networkResponse;
  } catch (error) {
    // Network failed, return stale cache if available
    if (cachedResponse) {
      console.log('[SW] Network failed, returning stale cache:', request.url);
      return cachedResponse;
    }

    // No cache, return offline fallback
    return offlineFallback(request);
  }
}

/**
 * OFFLINE FALLBACK
 * Return appropriate offline response based on request type
 */
function offlineFallback(request) {
  const url = new URL(request.url);

  // API requests - return JSON error
  if (url.pathname.startsWith('/api/')) {
    return new Response(
      JSON.stringify({
        error: 'offline',
        message: 'Vous êtes hors ligne. Les données affichées peuvent être obsolètes.',
        offline: true,
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // HTML documents - return offline page
  if (request.destination === 'document') {
    return caches.match('/offline.html').then((response) => {
      return (
        response ||
        new Response('<h1>Offline</h1><p>Vous êtes hors ligne</p>', {
          headers: { 'Content-Type': 'text/html' },
        })
      );
    });
  }

  // Images - return placeholder
  if (request.destination === 'image') {
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#f0f0f0" width="200" height="200"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#999">Offline</text></svg>',
      {
        headers: { 'Content-Type': 'image/svg+xml' },
      }
    );
  }

  // Default - return generic offline response
  return new Response('Offline', {
    status: 503,
    statusText: 'Service Unavailable',
  });
}

/**
 * LIMIT CACHE SIZE
 * Remove oldest entries when cache exceeds limit
 */
async function limitCacheSize(cacheName, maxSize) {
  if (!maxSize) return;

  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxSize) {
    // Delete oldest entries
    const deleteCount = keys.length - maxSize;
    for (let i = 0; i < deleteCount; i++) {
      await cache.delete(keys[i]);
    }
    console.log(`[SW] Cache ${cacheName} limited to ${maxSize} entries`);
  }
}

/**
 * MESSAGE EVENT
 * Handle messages from clients
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith('pluqla-')) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    );
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});

/**
 * SYNC EVENT
 * Background sync for offline actions
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event:', event.tag);

  if (event.tag === 'sync-favorites') {
    event.waitUntil(syncFavorites());
  }
});

/**
 * SYNC FAVORITES
 * Sync offline favorite actions when back online
 */
async function syncFavorites() {
  try {
    // Get pending sync items from IndexedDB or localStorage
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_FAVORITES',
        message: 'Synchronizing favorites...',
      });
    });
  } catch (error) {
    console.error('[SW] Sync favorites failed:', error);
  }
}

console.log('[SW] Service worker script loaded');
