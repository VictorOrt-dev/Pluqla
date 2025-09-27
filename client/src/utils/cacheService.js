// Service de cache intelligent pour suggestions IA avec IndexedDB et TTL
// Impact: Performance IA optimisée avec persistance avancée et invalidation automatique
// Intégré avec: AIService, useAISuggestions, système de suggestions

// Configuration du cache
const CACHE_CONFIG = {
  DB_NAME: 'PlusClair_Cache',
  DB_VERSION: 1,
  STORE_NAME: 'ai_suggestions',
  DEFAULT_TTL: 24 * 60 * 60 * 1000, // 24 heures
  MAX_CACHE_SIZE: 50, // Maximum 50 entrées
  COMPRESSION_THRESHOLD: 1024 // Compresser si > 1KB
};

class CacheService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.initPromise = null;
  }

  // Initialisation de la base IndexedDB
  async init() {
    if (this.isInitialized) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      // Fallback localStorage si IndexedDB non disponible
      if (!window.indexedDB) {
        console.warn('IndexedDB non disponible, fallback vers localStorage');
        this.isInitialized = true;
        resolve(null);
        return;
      }

      const request = indexedDB.open(CACHE_CONFIG.DB_NAME, CACHE_CONFIG.DB_VERSION);

      request.onerror = () => {
        console.error('Erreur ouverture IndexedDB:', request.error);
        this.isInitialized = true;
        resolve(null); // Fallback localStorage
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.isInitialized = true;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Créer le store s'il n'existe pas
        if (!db.objectStoreNames.contains(CACHE_CONFIG.STORE_NAME)) {
          const store = db.createObjectStore(CACHE_CONFIG.STORE_NAME, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('category', 'category', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  // Générer une clé de cache basée sur les paramètres
  generateCacheKey(userId, category, params = {}) {
    const paramsStr = JSON.stringify(params);
    const hash = this.simpleHash(paramsStr);
    return `${userId}_${category}_${hash}`;
  }

  // Hash simple pour les paramètres
  simpleHash(str) {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir en 32bit integer
    }
    return Math.abs(hash).toString();
  }

  // Compression simple des données volumineuses
  compressData(data) {
    const jsonStr = JSON.stringify(data);
    if (jsonStr.length < CACHE_CONFIG.COMPRESSION_THRESHOLD) {
      return { data, compressed: false };
    }

    try {
      // Compression basique avec encodage base64
      const compressed = btoa(jsonStr);
      return { data: compressed, compressed: true };
    } catch (error) {
      console.warn('Erreur compression:', error);
      return { data, compressed: false };
    }
  }

  // Décompression des données
  decompressData(cacheEntry) {
    if (!cacheEntry.compressed) {
      return cacheEntry.data;
    }

    try {
      const decompressed = atob(cacheEntry.data);
      return JSON.parse(decompressed);
    } catch (error) {
      console.error('Erreur décompression:', error);
      return null;
    }
  }

  // Récupérer une entrée du cache
  async get(key, category = 'general') {
    await this.init();

    try {
      if (this.db) {
        // Utiliser IndexedDB
        return await this.getFromIndexedDB(key);
      } else {
        // Fallback localStorage
        return this.getFromLocalStorage(key);
      }
    } catch (error) {
      console.error('Erreur récupération cache:', error);
      return null;
    }
  }

  // Récupération depuis IndexedDB
  async getFromIndexedDB(key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([CACHE_CONFIG.STORE_NAME], 'readonly');
      const store = transaction.objectStore(CACHE_CONFIG.STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;

        if (!result) {
          resolve(null);
          return;
        }

        // Vérifier TTL
        const now = Date.now();
        if (result.expiresAt && now > result.expiresAt) {
          // Entrée expirée, la supprimer
          this.delete(key);
          resolve(null);
          return;
        }

        // Décompresser les données si nécessaire
        const data = this.decompressData(result);
        resolve(data);
      };

      request.onerror = () => {
        console.error('Erreur lecture IndexedDB:', request.error);
        resolve(null);
      };
    });
  }

  // Récupération depuis localStorage (fallback)
  getFromLocalStorage(key) {
    try {
      const cached = localStorage.getItem(`cache_${key}`);
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      const now = Date.now();

      // Vérifier TTL
      if (parsed.expiresAt && now > parsed.expiresAt) {
        localStorage.removeItem(`cache_${key}`);
        return null;
      }

      return this.decompressData(parsed);
    } catch (error) {
      console.error('Erreur lecture localStorage cache:', error);
      return null;
    }
  }

  // Stocker une entrée dans le cache
  async set(key, data, ttl = CACHE_CONFIG.DEFAULT_TTL, category = 'general') {
    await this.init();

    const now = Date.now();
    const expiresAt = ttl > 0 ? now + ttl : null;
    const compressed = this.compressData(data);

    const cacheEntry = {
      key,
      data: compressed.data,
      compressed: compressed.compressed,
      category,
      timestamp: now,
      expiresAt,
      size: JSON.stringify(compressed.data).length
    };

    try {
      if (this.db) {
        await this.setToIndexedDB(cacheEntry);
      } else {
        this.setToLocalStorage(key, cacheEntry);
      }

      // Nettoyer le cache si nécessaire
      this.cleanupCache();
    } catch (error) {
      console.error('Erreur stockage cache:', error);
    }
  }

  // Stockage dans IndexedDB
  async setToIndexedDB(cacheEntry) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([CACHE_CONFIG.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(CACHE_CONFIG.STORE_NAME);
      const request = store.put(cacheEntry);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Erreur écriture IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  // Stockage dans localStorage (fallback)
  setToLocalStorage(key, cacheEntry) {
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify(cacheEntry));
    } catch (error) {
      console.error('Erreur écriture localStorage cache:', error);
    }
  }

  // Supprimer une entrée du cache
  async delete(key) {
    await this.init();

    try {
      if (this.db) {
        const transaction = this.db.transaction([CACHE_CONFIG.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(CACHE_CONFIG.STORE_NAME);
        store.delete(key);
      } else {
        localStorage.removeItem(`cache_${key}`);
      }
    } catch (error) {
      console.error('Erreur suppression cache:', error);
    }
  }

  // Invalider le cache par catégorie
  async invalidateCategory(category) {
    await this.init();

    try {
      if (this.db) {
        const transaction = this.db.transaction([CACHE_CONFIG.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(CACHE_CONFIG.STORE_NAME);
        const index = store.index('category');
        const request = index.openCursor(IDBKeyRange.only(category));

        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };
      } else {
        // Nettoyer localStorage
        const keysToDelete = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('cache_')) {
            try {
              const cached = JSON.parse(localStorage.getItem(key));
              if (cached.category === category) {
                keysToDelete.push(key);
              }
            } catch (e) {
              // Ignorer les entrées corrompues
            }
          }
        }
        keysToDelete.forEach(key => localStorage.removeItem(key));
      }
    } catch (error) {
      console.error('Erreur invalidation cache:', error);
    }
  }

  // Nettoyer le cache (supprimer les anciennes entrées)
  async cleanupCache() {
    await this.init();

    try {
      if (this.db) {
        const transaction = this.db.transaction([CACHE_CONFIG.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(CACHE_CONFIG.STORE_NAME);
        const index = store.index('timestamp');
        const request = index.openCursor();

        const entries = [];
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            entries.push(cursor.value);
            cursor.continue();
          } else {
            // Trier par timestamp et garder les plus récents
            entries.sort((a, b) => b.timestamp - a.timestamp);
            if (entries.length > CACHE_CONFIG.MAX_CACHE_SIZE) {
              const toDelete = entries.slice(CACHE_CONFIG.MAX_CACHE_SIZE);
              toDelete.forEach(entry => {
                store.delete(entry.key);
              });
            }
          }
        };
      }
    } catch (error) {
      console.error('Erreur nettoyage cache:', error);
    }
  }

  // Obtenir les statistiques du cache
  async getStats() {
    await this.init();

    try {
      if (this.db) {
        return await this.getIndexedDBStats();
      } else {
        return this.getLocalStorageStats();
      }
    } catch (error) {
      console.error('Erreur stats cache:', error);
      return { totalEntries: 0, totalSize: 0, categories: {} };
    }
  }

  async getIndexedDBStats() {
    return new Promise((resolve) => {
      const transaction = this.db.transaction([CACHE_CONFIG.STORE_NAME], 'readonly');
      const store = transaction.objectStore(CACHE_CONFIG.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result;
        const stats = {
          totalEntries: entries.length,
          totalSize: entries.reduce((sum, entry) => sum + (entry.size || 0), 0),
          categories: {}
        };

        entries.forEach(entry => {
          const cat = entry.category || 'general';
          if (!stats.categories[cat]) {
            stats.categories[cat] = { count: 0, size: 0 };
          }
          stats.categories[cat].count++;
          stats.categories[cat].size += entry.size || 0;
        });

        resolve(stats);
      };
    });
  }

  getLocalStorageStats() {
    const stats = { totalEntries: 0, totalSize: 0, categories: {} };

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cache_')) {
        try {
          const value = localStorage.getItem(key);
          const cached = JSON.parse(value);

          stats.totalEntries++;
          stats.totalSize += value.length;

          const cat = cached.category || 'general';
          if (!stats.categories[cat]) {
            stats.categories[cat] = { count: 0, size: 0 };
          }
          stats.categories[cat].count++;
          stats.categories[cat].size += value.length;
        } catch (e) {
          // Ignorer les entrées corrompues
        }
      }
    }

    return stats;
  }

  // Vider complètement le cache
  async clear() {
    await this.init();

    try {
      if (this.db) {
        const transaction = this.db.transaction([CACHE_CONFIG.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(CACHE_CONFIG.STORE_NAME);
        store.clear();
      } else {
        const keysToDelete = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('cache_')) {
            keysToDelete.push(key);
          }
        }
        keysToDelete.forEach(key => localStorage.removeItem(key));
      }
    } catch (error) {
      console.error('Erreur vidage cache:', error);
    }
  }
}

// Instance globale du service de cache
export const cacheService = new CacheService();

// Hook React pour utiliser le cache
export const useCache = () => {
  return {
    get: cacheService.get.bind(cacheService),
    set: cacheService.set.bind(cacheService),
    delete: cacheService.delete.bind(cacheService),
    invalidateCategory: cacheService.invalidateCategory.bind(cacheService),
    clear: cacheService.clear.bind(cacheService),
    getStats: cacheService.getStats.bind(cacheService),
    generateCacheKey: cacheService.generateCacheKey.bind(cacheService)
  };
};