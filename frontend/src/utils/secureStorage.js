// Stockage sécurisé pour données locales
// Impact: Sécurité renforcée + compression + chiffrement léger
// Compatible: Avec le storage.js existant (migration automatique)

import { saveToLocalStorage, loadFromLocalStorage } from './storage';

// Configuration de sécurité
const SECURITY_CONFIG = {
  enableEncryption: true,
  compressionThreshold: 1000, // bytes
  maxStorageSize: 5 * 1024 * 1024, // 5MB
  sensitiveKeys: ['userData', 'sessionToken', 'userAnswers'],
};

// Simple chiffrement XOR pour les données sensibles (non crypto-secure mais dissuasif)
const simpleEncrypt = (text, key = 'EcoRide2024') => {
  if (!text || typeof text !== 'string') return text;

  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result); // Base64 encode
};

const simpleDecrypt = (encryptedText, key = 'EcoRide2024') => {
  if (!encryptedText || typeof encryptedText !== 'string') return encryptedText;

  try {
    const decoded = atob(encryptedText);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch (error) {
    console.warn('Erreur de déchiffrement:', error);
    return encryptedText; // Retourner tel quel si erreur
  }
};

// Compression simple
const compress = (str) => {
  if (str.length < SECURITY_CONFIG.compressionThreshold) return str;

  try {
    // Compression basique avec repetition patterns
    return str
      .replace(/(.)\1{2,}/g, (match, char) => `${char}*${match.length}`)
      .replace(/\s{2,}/g, (match) => ` *${match.length}`);
  } catch (error) {
    return str;
  }
};

const decompress = (str) => {
  try {
    return str
      .replace(/(.)\*(\d+)/g, (match, char, count) => char.repeat(parseInt(count)))
      .replace(/ \*(\d+)/g, (match, count) => ' '.repeat(parseInt(count)));
  } catch (error) {
    return str;
  }
};

// Métadonnées pour la gestion du storage
const getStorageMetadata = () => {
  const metadata = loadFromLocalStorage('_storage_metadata', {
    version: '1.0',
    totalSize: 0,
    keys: {},
    lastCleanup: Date.now()
  });
  return metadata;
};

const updateStorageMetadata = (key, size, encrypted = false) => {
  const metadata = getStorageMetadata();

  const oldSize = metadata.keys[key]?.size || 0;
  metadata.totalSize = (metadata.totalSize - oldSize) + size;

  metadata.keys[key] = {
    size,
    encrypted,
    lastAccessed: Date.now(),
    accessCount: (metadata.keys[key]?.accessCount || 0) + 1
  };

  saveToLocalStorage('_storage_metadata', metadata);
};

export class SecureStorage {
  static save(key, data) {
    try {
      const jsonString = JSON.stringify(data);
      const isSensitive = SECURITY_CONFIG.sensitiveKeys.includes(key);

      let processedData = jsonString;

      // Compression
      processedData = compress(processedData);

      // Chiffrement pour données sensibles
      if (isSensitive && SECURITY_CONFIG.enableEncryption) {
        processedData = simpleEncrypt(processedData);
      }

      // Ajouter les métadonnées
      const dataWithMeta = {
        data: processedData,
        meta: {
          encrypted: isSensitive && SECURITY_CONFIG.enableEncryption,
          timestamp: Date.now(),
          version: '1.0'
        }
      };

      saveToLocalStorage(key, dataWithMeta);
      updateStorageMetadata(key, JSON.stringify(dataWithMeta).length, dataWithMeta.meta.encrypted);

      return true;
    } catch (error) {
      console.error('Erreur sauvegarde sécurisée:', error);
      // Fallback vers sauvegarde classique
      saveToLocalStorage(key, data);
      return false;
    }
  }

  static load(key, defaultValue = null) {
    try {
      const stored = loadFromLocalStorage(key, null);

      if (!stored) return defaultValue;

      // Vérifier si c'est le nouveau format avec métadonnées
      if (stored.data && stored.meta) {
        let processedData = stored.data;

        // Déchiffrement si nécessaire
        if (stored.meta.encrypted) {
          processedData = simpleDecrypt(processedData);
        }

        // Décompression
        processedData = decompress(processedData);

        // Mise à jour des métadonnées d'accès
        const metadata = getStorageMetadata();
        if (metadata.keys[key]) {
          metadata.keys[key].lastAccessed = Date.now();
          metadata.keys[key].accessCount++;
          saveToLocalStorage('_storage_metadata', metadata);
        }

        return JSON.parse(processedData);
      }

      // Format ancien - migration automatique
      SecureStorage.save(key, stored);
      return stored;

    } catch (error) {
      console.error('Erreur chargement sécurisé:', error);
      // Fallback vers chargement classique
      return loadFromLocalStorage(key, defaultValue);
    }
  }

  static remove(key) {
    try {
      const metadata = getStorageMetadata();
      if (metadata.keys[key]) {
        metadata.totalSize -= metadata.keys[key].size;
        delete metadata.keys[key];
        saveToLocalStorage('_storage_metadata', metadata);
      }

      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Erreur suppression sécurisée:', error);
      return false;
    }
  }

  static clear() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Erreur nettoyage sécurisé:', error);
      return false;
    }
  }

  // Nettoyage automatique des anciennes données
  static cleanup(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 jours
    try {
      const metadata = getStorageMetadata();
      const now = Date.now();
      let cleanedSize = 0;

      Object.keys(metadata.keys).forEach(key => {
        const keyMeta = metadata.keys[key];
        const age = now - keyMeta.lastAccessed;

        // Nettoyer les clés anciennes et peu utilisées
        if (age > maxAge && keyMeta.accessCount < 5) {
          SecureStorage.remove(key);
          cleanedSize += keyMeta.size;
        }
      });

      metadata.lastCleanup = now;
      saveToLocalStorage('_storage_metadata', metadata);

      return cleanedSize;
    } catch (error) {
      console.error('Erreur nettoyage automatique:', error);
      return 0;
    }
  }

  // Obtenir les statistiques de stockage
  static getStats() {
    const metadata = getStorageMetadata();

    return {
      totalSize: metadata.totalSize,
      totalKeys: Object.keys(metadata.keys).length,
      encryptedKeys: Object.values(metadata.keys).filter(k => k.encrypted).length,
      lastCleanup: new Date(metadata.lastCleanup),
      usage: (metadata.totalSize / SECURITY_CONFIG.maxStorageSize) * 100,
      topKeys: Object.entries(metadata.keys)
        .sort(([,a], [,b]) => b.accessCount - a.accessCount)
        .slice(0, 5)
        .map(([key, meta]) => ({ key, ...meta }))
    };
  }

  // Vérification de l'intégrité des données
  static verifyIntegrity() {
    try {
      const metadata = getStorageMetadata();
      const issues = [];

      Object.keys(metadata.keys).forEach(key => {
        try {
          const data = SecureStorage.load(key);
          if (data === null) {
            issues.push(`Clé ${key}: données corrompues ou inaccessibles`);
          }
        } catch (error) {
          issues.push(`Clé ${key}: erreur de déchiffrement - ${error.message}`);
        }
      });

      return {
        isValid: issues.length === 0,
        issues,
        checkedKeys: Object.keys(metadata.keys).length
      };
    } catch (error) {
      return {
        isValid: false,
        issues: [`Erreur vérification: ${error.message}`],
        checkedKeys: 0
      };
    }
  }

  // Migration des données existantes
  static migrateExistingData() {
    try {
      const keys = Object.keys(localStorage);
      let migratedCount = 0;

      keys.forEach(key => {
        // Ignorer les clés systèmes
        if (key.startsWith('_') || key === '_storage_metadata') return;

        const data = loadFromLocalStorage(key);
        if (data !== null) {
          SecureStorage.save(key, data);
          migratedCount++;
        }
      });

      return migratedCount;
    } catch (error) {
      console.error('Erreur migration données:', error);
      return 0;
    }
  }
}

// Auto-nettoyage périodique (une fois par session)
if (typeof window !== 'undefined') {
  const lastCleanup = loadFromLocalStorage('_last_cleanup', 0);
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  if (now - lastCleanup > oneDay) {
    setTimeout(() => {
      const cleaned = SecureStorage.cleanup();
      if (cleaned > 0) {
        console.log(`Nettoyage automatique: ${cleaned} bytes supprimés`);
      }
      saveToLocalStorage('_last_cleanup', now);
    }, 5000); // Délai pour ne pas impacter le démarrage
  }
}

// Compatibility layer - utiliser SecureStorage par défaut
export const saveToSecureStorage = SecureStorage.save;
export const loadFromSecureStorage = SecureStorage.load;