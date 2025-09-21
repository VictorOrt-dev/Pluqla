const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttlTimers = new Map();
    this.defaultTTL = parseInt(process.env.CACHE_TTL_DEFAULT, 10) || 600; // 10 minutes par défaut
    this.maxSize = 1000; // Limite pour éviter la surcharge mémoire
    this.isRedisEnabled = process.env.FEATURE_CACHE_REDIS === 'true';

    logger.info(`🗄️  Cache service initialized (Redis: ${this.isRedisEnabled ? 'enabled' : 'disabled'})`);
  }

  /**
   * Stocke une valeur dans le cache avec TTL
   * @param {string} key - Clé du cache
   * @param {any} value - Valeur à stocker
   * @param {number} ttl - Durée de vie en secondes (optionnel)
   */
  set(key, value, ttl = null) {
    try {
      // Nettoyer les anciens éléments si nécessaire
      if (this.cache.size >= this.maxSize) {
        this.cleanup();
      }

      const expiresAt = ttl ? Date.now() + (ttl * 1000) : Date.now() + (this.defaultTTL * 1000);

      // Stocker la valeur avec métadonnées
      this.cache.set(key, {
        value,
        createdAt: Date.now(),
        expiresAt,
        accessed: 0,
      });

      // Programmer l'expiration automatique
      this.setExpiration(key, ttl || this.defaultTTL);

      logger.debug(`🗄️  Cache SET: ${key} (TTL: ${ttl || this.defaultTTL}s)`);
      return true;
    } catch (error) {
      logger.error(`Failed to set cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Récupère une valeur du cache
   * @param {string} key - Clé du cache
   * @returns {any|null} Valeur ou null si expirée/inexistante
   */
  get(key) {
    try {
      const item = this.cache.get(key);

      if (!item) {
        logger.debug(`🗄️  Cache MISS: ${key}`);
        return null;
      }

      // Vérifier l'expiration
      if (Date.now() > item.expiresAt) {
        this.delete(key);
        logger.debug(`🗄️  Cache EXPIRED: ${key}`);
        return null;
      }

      // Mettre à jour les statistiques d'accès
      item.accessed += 1;
      item.lastAccessed = Date.now();

      logger.debug(`🗄️  Cache HIT: ${key}`);
      return item.value;
    } catch (error) {
      logger.error(`Failed to get cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Supprime une entrée du cache
   * @param {string} key - Clé à supprimer
   */
  delete(key) {
    try {
      const deleted = this.cache.delete(key);

      // Annuler le timer d'expiration
      if (this.ttlTimers.has(key)) {
        clearTimeout(this.ttlTimers.get(key));
        this.ttlTimers.delete(key);
      }

      if (deleted) {
        logger.debug(`🗄️  Cache DELETE: ${key}`);
      }

      return deleted;
    } catch (error) {
      logger.error(`Failed to delete cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Vérifie si une clé existe dans le cache
   * @param {string} key - Clé à vérifier
   */
  has(key) {
    const item = this.cache.get(key);
    return item && Date.now() <= item.expiresAt;
  }

  /**
   * Vide complètement le cache
   */
  clear() {
    try {
      // Annuler tous les timers
      for (const timer of this.ttlTimers.values()) {
        clearTimeout(timer);
      }

      this.cache.clear();
      this.ttlTimers.clear();

      logger.info('🗄️  Cache cleared completely');
      return true;
    } catch (error) {
      logger.error('Failed to clear cache:', error);
      return false;
    }
  }

  /**
   * Cache spécialisé pour les suggestions IA
   * @param {string} userId - ID utilisateur
   * @param {string} category - Catégorie de suggestion
   * @param {any} suggestions - Suggestions à cacher
   */
  setAISuggestions(userId, category, suggestions) {
    const key = `ai_suggestions:${userId}:${category}`;
    const ttl = parseInt(process.env.CACHE_TTL_AI, 10) || 3600; // 1 heure par défaut
    return this.set(key, suggestions, ttl);
  }

  /**
   * Récupère les suggestions IA en cache
   * @param {string} userId - ID utilisateur
   * @param {string} category - Catégorie de suggestion
   */
  getAISuggestions(userId, category) {
    const key = `ai_suggestions:${userId}:${category}`;
    return this.get(key);
  }

  /**
   * Cache pour les données utilisateur
   * @param {string} userId - ID utilisateur
   * @param {any} userData - Données utilisateur
   */
  setUserData(userId, userData) {
    const key = `user_data:${userId}`;
    return this.set(key, userData, 1800); // 30 minutes
  }

  /**
   * Récupère les données utilisateur en cache
   * @param {string} userId - ID utilisateur
   */
  getUserData(userId) {
    const key = `user_data:${userId}`;
    return this.get(key);
  }

  /**
   * Cache pour les résultats d'analytics
   * @param {string} key - Clé analytics
   * @param {any} data - Données analytics
   */
  setAnalytics(key, data) {
    const cacheKey = `analytics:${key}`;
    return this.set(cacheKey, data, 300); // 5 minutes
  }

  /**
   * Récupère les données analytics en cache
   * @param {string} key - Clé analytics
   */
  getAnalytics(key) {
    const cacheKey = `analytics:${key}`;
    return this.get(cacheKey);
  }

  /**
   * Programme l'expiration automatique d'une clé
   * @param {string} key - Clé du cache
   * @param {number} ttl - TTL en secondes
   */
  setExpiration(key, ttl) {
    // Annuler l'ancien timer s'il existe
    if (this.ttlTimers.has(key)) {
      clearTimeout(this.ttlTimers.get(key));
    }

    // Programmer le nouveau timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl * 1000);

    this.ttlTimers.set(key, timer);
  }

  /**
   * Nettoie les entrées expirées et les moins utilisées
   */
  cleanup() {
    try {
      const now = Date.now();
      const toDelete = [];

      // Identifier les clés expirées
      for (const [key, item] of this.cache.entries()) {
        if (now > item.expiresAt) {
          toDelete.push(key);
        }
      }

      // Supprimer les clés expirées
      toDelete.forEach(key => this.delete(key));

      // Si encore trop d'éléments, supprimer les moins utilisés
      if (this.cache.size >= this.maxSize) {
        const items = Array.from(this.cache.entries())
          .map(([key, item]) => ({ key, ...item }))
          .sort((a, b) => a.accessed - b.accessed);

        const toRemove = items.slice(0, Math.floor(this.maxSize * 0.1)); // Supprimer 10%
        toRemove.forEach(item => this.delete(item.key));
      }

      if (toDelete.length > 0) {
        logger.info(`🗄️  Cache cleanup: removed ${toDelete.length} expired entries`);
      }
    } catch (error) {
      logger.error('Cache cleanup failed:', error);
    }
  }

  /**
   * Statistiques du cache
   */
  getStats() {
    const items = Array.from(this.cache.values());
    const now = Date.now();

    return {
      totalItems: this.cache.size,
      expiredItems: items.filter(item => now > item.expiresAt).length,
      totalAccesses: items.reduce((sum, item) => sum + item.accessed, 0),
      averageAge: items.length > 0 ? items.reduce((sum, item) => sum + (now - item.createdAt), 0) / items.length / 1000 : 0,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Estime l'utilisation mémoire du cache
   */
  estimateMemoryUsage() {
    try {
      return JSON.stringify(Array.from(this.cache.entries())).length;
    } catch {
      return 0;
    }
  }

  /**
   * Wrapper pour fonction avec mise en cache automatique
   * @param {string} key - Clé du cache
   * @param {Function} fn - Fonction à exécuter si pas en cache
   * @param {number} ttl - TTL en secondes
   */
  async wrap(key, fn, ttl = null) {
    try {
      // Vérifier le cache d'abord
      const cached = this.get(key);
      if (cached !== null) {
        return cached;
      }

      // Exécuter la fonction et cacher le résultat
      const result = await fn();
      this.set(key, result, ttl);

      return result;
    } catch (error) {
      logger.error(`Cache wrap failed for key ${key}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new CacheService();