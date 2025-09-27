// Cache intelligent avec TTL (Time To Live) et compression
// Impact: Améliore les performances et réduit les recalculs
// Utilisé par: hooks de données, suggestions IA, localStorage

import { useCallback, useEffect, useRef } from 'react';

export class SmartCache {
  constructor(defaultTTL = 5 * 60 * 1000) { // 5 minutes par défaut
    this.cache = new Map();
    this.timers = new Map();
    this.defaultTTL = defaultTTL;
  }

  set(key, value, ttl = this.defaultTTL) {
    // Nettoyer l'ancien timer si il existe
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Stocker la valeur avec timestamp
    const entry = {
      value,
      timestamp: Date.now(),
      ttl
    };

    this.cache.set(key, entry);

    // Programmer l'expiration automatique
    if (ttl > 0) {
      const timer = setTimeout(() => {
        this.delete(key);
      }, ttl);
      this.timers.set(key, timer);
    }
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Vérifier si l'entrée a expiré
    if (entry.ttl > 0 && Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return null;
    }

    return entry.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    // Nettoyer le timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }

    return this.cache.delete(key);
  }

  clear() {
    // Nettoyer tous les timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.cache.clear();
  }

  // Obtenir les statistiques du cache
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        age: Date.now() - entry.timestamp,
        ttl: entry.ttl
      }))
    };
  }

  // Invalider les entrées expirées
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.ttl > 0 && now - entry.timestamp > entry.ttl) {
        this.delete(key);
      }
    }
  }
}

// Instance globale du cache
export const globalCache = new SmartCache();


export const useCache = (ttl) => {
  const cacheRef = useRef(new SmartCache(ttl));

  useEffect(() => {
    const cache = cacheRef.current;
    return () => cache.clear(); // Nettoyage au démontage
  }, []);

  const setCache = useCallback((key, value, customTTL) => {
    cacheRef.current.set(key, value, customTTL);
  }, []);

  const getCache = useCallback((key) => {
    return cacheRef.current.get(key);
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return { setCache, getCache, clearCache, cache: cacheRef.current };
};