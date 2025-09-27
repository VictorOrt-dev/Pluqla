// Service Worker avancé pour Pluqla PWA
// Impact: Mode hors-ligne, notifications push, cache intelligent
// Optimisé pour: Performance, rétention utilisateur, expérience native

const CACHE_NAME = 'plus-clair-v1';
const RUNTIME_CACHE = 'plus-clair-runtime';
const API_CACHE = 'plus-clair-api';
const IMAGES_CACHE = 'plus-clair-images';

// Ressources critiques à mettre en cache lors de l'installation
const CRITICAL_RESOURCES = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png'
];

// Ressources à précharger en arrière-plan
const PREFETCH_RESOURCES = [
  '/category/alimentation',
  '/category/habits',
  '/category/activite',
  '/category/deplacement'
];

// Patterns d'URLs pour différentes stratégies de cache
const CACHE_STRATEGIES = {
  // Cache First pour les ressources statiques
  CACHE_FIRST: [
    /\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2)$/,
    /^\/static\//
  ],

  // Network First pour l'API et contenu dynamique
  NETWORK_FIRST: [
    /\/api\//,
    /\/analytics/
  ],

  // Stale While Revalidate pour les données IA
  STALE_WHILE_REVALIDATE: [
    /\/suggestions/,
    /\/ai-data/
  ]
};

// Installation du service worker
self.addEventListener('install', event => {
  console.log('🔧 Service Worker: Installation en cours...');

  event.waitUntil(
    Promise.all([
      // Mettre en cache les ressources critiques
      caches.open(CACHE_NAME).then(cache => {
        console.log('📦 Mise en cache des ressources critiques');
        return cache.addAll(CRITICAL_RESOURCES);
      }),

      // Précharger les ressources secondaires
      caches.open(RUNTIME_CACHE).then(cache => {
        console.log('⚡ Préchargement des ressources secondaires');
        return cache.addAll(PREFETCH_RESOURCES.map(url => new Request(url, { cache: 'no-cache' })));
      })
    ]).then(() => {
      console.log('✅ Service Worker installé avec succès');
      // Forcer l'activation immédiate
      return self.skipWaiting();
    })
  );
});

// Activation du service worker
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker: Activation en cours...');

  event.waitUntil(
    Promise.all([
      // Nettoyer les anciens caches
      cleanupOldCaches(),
      // Prendre le contrôle de tous les clients
      self.clients.claim(),
      // Configurer les notifications
      setupNotifications()
    ]).then(() => {
      console.log('✅ Service Worker activé avec succès');
    })
  );
});

// Nettoyage des anciens caches
async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const validCaches = [CACHE_NAME, RUNTIME_CACHE, API_CACHE, IMAGES_CACHE];

  return Promise.all(
    cacheNames.map(cacheName => {
      if (!validCaches.includes(cacheName)) {
        console.log('🗑️ Suppression ancien cache:', cacheName);
        return caches.delete(cacheName);
      }
    })
  );
}

// Gestion des requêtes (stratégies de cache)
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET ou cross-origin (sauf API)
  if (request.method !== 'GET' || (url.origin !== self.location.origin && !isAPIRequest(url))) {
    return;
  }

  event.respondWith(handleRequest(request));
});

// Router les requêtes selon la stratégie appropriée
async function handleRequest(request) {
  const url = new URL(request.url);

  try {
    // Cache First pour ressources statiques
    if (matchesPattern(url.pathname, CACHE_STRATEGIES.CACHE_FIRST)) {
      return await cacheFirstStrategy(request);
    }

    // Network First pour API et contenu dynamique
    if (matchesPattern(url.pathname, CACHE_STRATEGIES.NETWORK_FIRST)) {
      return await networkFirstStrategy(request);
    }

    // Stale While Revalidate pour données IA
    if (matchesPattern(url.pathname, CACHE_STRATEGIES.STALE_WHILE_REVALIDATE)) {
      return await staleWhileRevalidateStrategy(request);
    }

    // Stratégie par défaut : Network First avec fallback
    return await networkFirstWithFallback(request);

  } catch (error) {
    console.error('❌ Erreur lors du traitement de la requête:', error);
    return createErrorResponse();
  }
}

// Stratégie Cache First
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Mettre à jour le cache en arrière-plan si possible
    updateCacheInBackground(request);
    return cachedResponse;
  }

  const response = await fetch(request);
  await cacheResponse(request, response.clone(), CACHE_NAME);
  return response;
}

// Stratégie Network First
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request, { timeout: 3000 });
    await cacheResponse(request, response.clone(), API_CACHE);
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('📱 Réponse depuis le cache (mode hors-ligne)');
      return cachedResponse;
    }
    throw error;
  }
}

// Stratégie Stale While Revalidate
async function staleWhileRevalidateStrategy(request) {
  const cachedResponse = await caches.match(request);

  const fetchPromise = fetch(request).then(response => {
    cacheResponse(request, response.clone(), API_CACHE);
    return response;
  }).catch(error => {
    console.warn('⚠️ Échec mise à jour cache:', error);
  });

  return cachedResponse || await fetchPromise;
}

// Stratégie par défaut avec fallback
async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);

    // Mettre en cache si la réponse est OK
    if (response.ok) {
      await cacheResponse(request, response.clone(), RUNTIME_CACHE);
    }

    return response;
  } catch (error) {
    // Chercher dans tous les caches
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fallback pour les pages HTML
    if (request.headers.get('accept').includes('text/html')) {
      return caches.match('/') || createOfflinePage();
    }

    throw error;
  }
}

// Mettre en cache une réponse
async function cacheResponse(request, response, cacheName) {
  // Ne mettre en cache que les réponses valides
  if (response.status === 200 && response.type === 'basic') {
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
  }
}

// Mise à jour cache en arrière-plan
function updateCacheInBackground(request) {
  fetch(request).then(response => {
    if (response.ok) {
      cacheResponse(request, response, CACHE_NAME);
    }
  }).catch(() => {
    // Silencieux car c'est juste une mise à jour en arrière-plan
  });
}

// Utilitaires
function matchesPattern(pathname, patterns) {
  return patterns.some(pattern => {
    if (pattern instanceof RegExp) {
      return pattern.test(pathname);
    }
    return pathname.includes(pattern);
  });
}

function isAPIRequest(url) {
  return url.hostname.includes('api') || url.pathname.startsWith('/api');
}

function createErrorResponse() {
  return new Response('Service temporairement indisponible', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain' }
  });
}

function createOfflinePage() {
  const offlineHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Pluqla - Mode hors-ligne</title>
      <style>
        body { font-family: system-ui; text-align: center; padding: 2rem; color: #333; }
        .offline-icon { font-size: 4rem; margin: 2rem 0; }
        .offline-title { color: #10B981; margin: 1rem 0; }
        .offline-message { margin: 1rem 0; opacity: 0.8; }
        .retry-btn {
          background: #10B981; color: white; padding: 1rem 2rem;
          border: none; border-radius: 8px; cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div class="offline-icon">📱</div>
      <h1 class="offline-title">Pluqla</h1>
      <p class="offline-message">
        Vous êtes hors-ligne. Vos données sauvegardées restent accessibles.
      </p>
      <button class="retry-btn" onclick="location.reload()">
        Réessayer
      </button>
      <script>
        // Recharger automatiquement quand la connexion revient
        window.addEventListener('online', () => location.reload());
      </script>
    </body>
    </html>
  `;

  return new Response(offlineHTML, {
    headers: { 'Content-Type': 'text/html' }
  });
}

// === NOTIFICATIONS PUSH ===

function setupNotifications() {
  console.log('🔔 Configuration des notifications push');

  // Enregistrer les types de notifications supportées
  self.registration.showNotification('Service activé', {
    body: 'Pluqla est maintenant disponible hors-ligne !',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: 'service-ready',
    silent: true,
    data: { type: 'service_ready' }
  });
}

// Écouter les événements de notification
self.addEventListener('notificationclick', event => {
  console.log('🔔 Notification cliquée:', event.notification.data);

  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = '/';

  switch (data.type) {
    case 'daily_reminder':
      targetUrl = '/category/alimentation';
      break;
    case 'savings_milestone':
      targetUrl = '/progress';
      break;
    case 'new_suggestion':
      targetUrl = `/category/${data.category}`;
      break;
  }

  // Ouvrir ou focus sur l'app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        if (clientList.length > 0) {
          const client = clientList[0];
          client.navigate(targetUrl);
          return client.focus();
        }
        return clients.openWindow(targetUrl);
      })
  );
});

// Écouter les messages push
self.addEventListener('push', event => {
  if (!event.data) return;

  try {
    const data = event.data.json();

    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: data.icon || '/logo192.png',
        badge: '/logo192.png',
        tag: data.tag || 'general',
        data: data.data || {},
        actions: data.actions || [],
        requireInteraction: data.requireInteraction || false
      })
    );
  } catch (error) {
    console.error('❌ Erreur traitement push:', error);
  }
});

// === SYNCHRONISATION ARRIÈRE-PLAN ===

self.addEventListener('sync', event => {
  console.log('🔄 Synchronisation en arrière-plan:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(syncOfflineData());
  }

  if (event.tag === 'analytics-sync') {
    event.waitUntil(syncAnalytics());
  }
});

async function syncOfflineData() {
  try {
    console.log('📤 Synchronisation des données hors-ligne');

    // Récupérer les données en attente depuis IndexedDB/localStorage
    const offlineData = await getOfflineData();

    if (offlineData.length > 0) {
      // Envoyer vers le serveur ou traiter localement
      await processOfflineData(offlineData);
      console.log(`✅ ${offlineData.length} éléments synchronisés`);
    }
  } catch (error) {
    console.error('❌ Erreur synchronisation:', error);
  }
}

async function syncAnalytics() {
  try {
    console.log('📊 Synchronisation analytics');
    // Logique de sync analytics si nécessaire
  } catch (error) {
    console.error('❌ Erreur sync analytics:', error);
  }
}

// Simulation - à adapter selon le système de données
async function getOfflineData() {
  return []; // Placeholder
}

async function processOfflineData(data) {
  // Placeholder pour traitement des données
  return true;
}

// === MESSAGES DEPUIS L'APP ===

self.addEventListener('message', event => {
  console.log('💬 Message reçu:', event.data);

  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CACHE_SUGGESTION':
      cacheSuggestion(event.data.suggestion);
      break;

    case 'PREFETCH_CATEGORY':
      prefetchCategory(event.data.category);
      break;

    case 'CLEAR_CACHE':
      clearCache(event.data.cacheType);
      break;
  }
});

async function cacheSuggestion(suggestion) {
  const cache = await caches.open(API_CACHE);
  const response = new Response(JSON.stringify(suggestion));
  await cache.put(`/suggestion/${suggestion.id}`, response);
}

async function prefetchCategory(category) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(`/category/${category}`);
    if (response.ok) {
      await cache.put(`/category/${category}`, response);
    }
  } catch (error) {
    console.warn(`⚠️ Impossible de précharger ${category}:`, error);
  }
}

async function clearCache(cacheType) {
  if (cacheType && cacheType !== 'all') {
    await caches.delete(cacheType);
  } else {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
  }
}

console.log('🎉 Pluqla Service Worker chargé et prêt !');