// Système de feature flags pour activation/désactivation modulaire
// Impact: Permet le déploiement progressif de fonctionnalités et tests A/B
// Compatible: Avec toute l'architecture existante

import { useState, useEffect } from 'react';
import { SecureStorage } from './secureStorage';
import { globalCache } from './cache';

// Configuration des feature flags
const FEATURE_FLAGS_CONFIG = {
  // Flags par défaut
  defaults: {
    // Améliorations déjà implémentées
    'gamification.enabled': true,
    'gamification.badges.visible': false, // Pas encore intégré visuellement
    'gamification.challenges.daily': true,

    'budget.analytics': true,
    'budget.predictions': true,
    'budget.recommendations': true,

    'cache.intelligent': true,
    'cache.compression': true,

    'validation.strict': true,
    'validation.sanitization': true,

    'theme.dynamic': true,
    'theme.system_preference': true,
    'theme.transitions': true,

    'storage.secure': true,
    'storage.encryption': true,

    'api.adapter': true,
    'api.fallback': true,

    'user.multi_support': false, // Expérimental
    'user.authentication': false, // Futur backend

    // Nouvelles fonctionnalités à venir
    'notifications.intelligent': false,
    'ai.external_api': false,
    'ai.suggestions_v2': false,
    'ai.streaming': false,

    'performance.lazy_loading': false,
    'performance.virtualization': false,
    'performance.memoization': true,

    'ui.animations_advanced': false,
    'ui.micro_interactions': false,
    'ui.skeleton_loading': false,

    'social.sharing': false,
    'social.community': false,

    'offline.support': false,
    'offline.sync': false,

    'analytics.tracking': false,
    'analytics.heatmaps': false,

    // Flags de développement
    'dev.logging': process.env.NODE_ENV === 'development',
    'dev.debug_mode': process.env.NODE_ENV === 'development',
    'dev.performance_monitor': process.env.NODE_ENV === 'development',

    // Flags expérimentaux
    'experimental.voice_input': false,
    'experimental.gesture_nav': false,
    'experimental.ar_scanner': false
  },

  // Environnements
  environments: {
    development: {
      'dev.logging': true,
      'dev.debug_mode': true,
      'gamification.badges.visible': true, // Test en dev
      'notifications.intelligent': true,
      'performance.lazy_loading': true
    },

    staging: {
      'dev.logging': false,
      'gamification.badges.visible': true,
      'notifications.intelligent': true,
      'ai.suggestions_v2': true
    },

    production: {
      'dev.logging': false,
      'dev.debug_mode': false,
      'performance.lazy_loading': true,
      'ui.animations_advanced': true
    }
  },

  // Flags temporaires (avec date d'expiration)
  temporary: {
    'promo.black_friday': {
      enabled: false,
      expires: new Date('2024-12-01').getTime()
    }
  },

  // Règles conditionnelles
  conditions: {
    'user.premium_features': (userData) => userData?.subscription?.isPremium || false,
    'user.beta_tester': (userData) => userData?.profile?.betaTester || false,
    'user.new_user': (userData) => {
      if (!userData?.createdAt) return false;
      const createdDate = new Date(userData.createdAt);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return createdDate > weekAgo;
    }
  }
};

class FeatureFlagsService {
  constructor() {
    this.flags = new Map();
    this.listeners = new Map();
    this.environment = this.detectEnvironment();
    this.initialized = false;
  }

  // Détecter l'environnement
  detectEnvironment() {
    if (process.env.NODE_ENV === 'development') return 'development';
    if (window.location.hostname.includes('staging')) return 'staging';
    return 'production';
  }

  // Initialiser le service
  async initialize(userData = null) {
    try {
      // Charger les flags sauvegardés
      const savedFlags = SecureStorage.load('featureFlags', {});

      // Fusionner avec les defaults et l'environnement
      const envFlags = FEATURE_FLAGS_CONFIG.environments[this.environment] || {};
      const allFlags = {
        ...FEATURE_FLAGS_CONFIG.defaults,
        ...envFlags,
        ...savedFlags
      };

      // Appliquer les conditions utilisateur
      if (userData) {
        Object.entries(FEATURE_FLAGS_CONFIG.conditions).forEach(([condition, check]) => {
          const result = check(userData);
          if (typeof result === 'boolean') {
            allFlags[condition] = result;
          }
        });
      }

      // Vérifier les flags temporaires
      Object.entries(FEATURE_FLAGS_CONFIG.temporary).forEach(([flag, config]) => {
        if (Date.now() > config.expires) {
          allFlags[flag] = false;
        } else {
          allFlags[flag] = config.enabled;
        }
      });

      // Stocker dans la Map
      Object.entries(allFlags).forEach(([flag, value]) => {
        this.flags.set(flag, value);
      });

      this.initialized = true;

      // Logger les flags actifs en développement
      if (this.isEnabled('dev.logging')) {
        const activeFlags = Array.from(this.flags.entries())
          .filter(([, value]) => value === true)
          .map(([flag]) => flag);

        console.group('🚩 Feature Flags Active');
        console.log('Environment:', this.environment);
        console.log('Active flags:', activeFlags);
        console.groupEnd();
      }

      return true;
    } catch (error) {
      console.error('Erreur initialisation feature flags:', error);
      return false;
    }
  }

  // Vérifier si un flag est activé
  isEnabled(flagName, userData = null) {
    if (!this.initialized) {
      return FEATURE_FLAGS_CONFIG.defaults[flagName] || false;
    }

    // Vérifier le cache d'abord
    const cacheKey = `flag_${flagName}_${userData?.id || 'anonymous'}`;
    const cached = globalCache.get(cacheKey);
    if (cached !== null) return cached;

    let result = this.flags.get(flagName) || false;

    // Appliquer les conditions spécifiques à l'utilisateur
    if (userData) {
      const condition = FEATURE_FLAGS_CONFIG.conditions[flagName];
      if (condition && typeof condition === 'function') {
        result = condition(userData);
      }
    }

    // Mettre en cache le résultat
    globalCache.set(cacheKey, result, 5 * 60 * 1000); // 5 minutes

    return result;
  }

  // Activer/désactiver un flag
  setFlag(flagName, value, persist = true) {
    this.flags.set(flagName, value);

    if (persist) {
      const savedFlags = SecureStorage.load('featureFlags', {});
      savedFlags[flagName] = value;
      SecureStorage.save('featureFlags', savedFlags);
    }

    // Invalider le cache
    globalCache.clear();

    // Notifier les listeners
    const listeners = this.listeners.get(flagName) || [];
    listeners.forEach(callback => {
      try {
        callback(value, flagName);
      } catch (error) {
        console.error('Erreur listener feature flag:', error);
      }
    });

    if (this.isEnabled('dev.logging')) {
      console.log(`🚩 Flag ${flagName} ${value ? 'activé' : 'désactivé'}`);
    }
  }

  // Écouter les changements d'un flag
  onFlagChange(flagName, callback) {
    if (!this.listeners.has(flagName)) {
      this.listeners.set(flagName, []);
    }
    this.listeners.get(flagName).push(callback);

    // Retourner une fonction de nettoyage
    return () => {
      const listeners = this.listeners.get(flagName) || [];
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  // Obtenir tous les flags
  getAllFlags() {
    return Object.fromEntries(this.flags);
  }

  // Obtenir les flags actifs
  getActiveFlags() {
    return Array.from(this.flags.entries())
      .filter(([, value]) => value === true)
      .map(([flag]) => flag);
  }

  // Réinitialiser aux valeurs par défaut
  resetToDefaults() {
    Object.entries(FEATURE_FLAGS_CONFIG.defaults).forEach(([flag, value]) => {
      this.flags.set(flag, value);
    });

    SecureStorage.remove('featureFlags');
    globalCache.clear();

    if (this.isEnabled('dev.logging')) {
      console.log('🚩 Feature flags réinitialisés');
    }
  }

  // Tests A/B
  getABTestVariant(testName, userId = 'anonymous') {
    // Hash simple pour déterminer la variante
    const hash = this.simpleHash(`${testName}_${userId}`);
    return hash % 2 === 0 ? 'A' : 'B';
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Utilitaires pour les développeurs
  enableDev(flagName) {
    if (this.environment === 'development') {
      this.setFlag(flagName, true, false);
    }
  }

  // Export des flags pour debug
  exportFlags() {
    return {
      environment: this.environment,
      flags: this.getAllFlags(),
      activeFlags: this.getActiveFlags(),
      conditions: Object.keys(FEATURE_FLAGS_CONFIG.conditions)
    };
  }
}

// Instance globale
export const featureFlags = new FeatureFlagsService();

// Hook React pour utiliser les feature flags

export const useFeatureFlag = (flagName, userData = null) => {
  const [isEnabled, setIsEnabled] = useState(
    featureFlags.isEnabled(flagName, userData)
  );

  useEffect(() => {
    // Écouter les changements du flag
    const unsubscribe = featureFlags.onFlagChange(flagName, (newValue) => {
      setIsEnabled(newValue);
    });

    // Mettre à jour si les données utilisateur changent
    setIsEnabled(featureFlags.isEnabled(flagName, userData));

    return unsubscribe;
  }, [flagName, userData]);

  return isEnabled;
};

// Hook pour plusieurs flags
export const useFeatureFlags = (flagNames, userData = null) => {
  const [flags, setFlags] = useState(() => {
    const result = {};
    flagNames.forEach(flag => {
      result[flag] = featureFlags.isEnabled(flag, userData);
    });
    return result;
  });

  useEffect(() => {
    const unsubscribes = flagNames.map(flagName =>
      featureFlags.onFlagChange(flagName, (newValue) => {
        setFlags(prev => ({ ...prev, [flagName]: newValue }));
      })
    );

    // Mettre à jour tous les flags
    const updated = {};
    flagNames.forEach(flag => {
      updated[flag] = featureFlags.isEnabled(flag, userData);
    });
    setFlags(updated);

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [flagNames, userData]);

  return flags;
};

// Hook pour les tests A/B
export const useABTest = (testName, userId = null) => {
  const variant = featureFlags.getABTestVariant(testName, userId);
  return variant;
};

// Composant conditionnel basé sur feature flag
export const FeatureGate = ({ flag, userData, children, fallback = null }) => {
  const isEnabled = useFeatureFlag(flag, userData);
  return isEnabled ? children : fallback;
};

// HOC pour les composants avec feature flags
export const withFeatureFlag = (flagName) => (Component) => {
  return function WrappedComponent(props) {
    const isEnabled = useFeatureFlag(flagName, props.userData);

    if (!isEnabled) {
      return props.fallback || null;
    }

    return <Component {...props} />;
  };
};

// Utilitaires d'export
export const getActiveFeatureFlags = () => featureFlags.getActiveFlags();
export const isFeatureEnabled = (flag, userData) => featureFlags.isEnabled(flag, userData);