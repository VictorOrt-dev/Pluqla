/**
 * Feature Flags Service
 *
 * Système de feature flags pour activer/désactiver fonctionnalités dynamiquement
 * Sans redéploiement - configuration en base de données + cache Redis
 */

const { PrismaClient } = require('@prisma/client');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

const prisma = new PrismaClient();
const redis = getRedisClient();

// Cache TTL: 5 minutes
const CACHE_TTL = 300;
const CACHE_PREFIX = 'feature-flag:';

/**
 * Liste des feature flags disponibles
 * Définir ici tous les flags avec leurs valeurs par défaut
 */
const DEFAULT_FLAGS = {
  // Phase 1A - Smart Recommendations
  RECIPE_ENRICHMENT_ENABLED: true,
  POPULARITY_SCORING_ENABLED: true,
  SMART_SUGGESTIONS_ENABLED: true,

  // Phase 1B - Security
  RATE_LIMITING_ENABLED: true,
  FRAUD_DETECTION_ENABLED: true,
  IP_DEDUPLICATION_ENABLED: true,

  // Phase 1B - GDPR
  GDPR_EXPORT_ENABLED: true,
  GDPR_DELETE_ENABLED: true,

  // Phase 1B - Observability
  PROMETHEUS_METRICS_ENABLED: true,
  SENTRY_ENABLED: true,

  // Features Premium
  AI_SUGGESTIONS_ENABLED: false, // Sera activé plus tard
  UNLIMITED_RECIPES_ENABLED: false,
  PREMIUM_ANALYTICS_ENABLED: false,

  // Features expérimentales
  RECIPE_COLLAB_MODE: false,
  MEAL_PLAN_SHARING: false,
  SOCIAL_FEATURES: false,

  // Maintenance
  MAINTENANCE_MODE: false,
  READ_ONLY_MODE: false
};

/**
 * Récupérer la valeur d'un feature flag
 * Avec cache Redis + fallback base de données
 *
 * @param {string} flagName - Nom du flag
 * @param {Object} context - Contexte (userId, role, etc.)
 * @returns {Promise<boolean>} Valeur du flag
 */
async function getFlag(flagName, context = {}) {
  try {
    // 1. Vérifier le cache Redis
    const cacheKey = `${CACHE_PREFIX}${flagName}`;
    const cached = await redis.get(cacheKey);

    if (cached !== null) {
      return JSON.parse(cached).enabled;
    }

    // 2. Récupérer depuis la base de données
    const flag = await prisma.featureFlag.findUnique({
      where: { name: flagName }
    });

    let enabled = DEFAULT_FLAGS[flagName] ?? false;

    if (flag) {
      enabled = flag.enabled;

      // Vérifier les règles de ciblage
      if (flag.targetingRules) {
        enabled = evaluateTargetingRules(flag.targetingRules, context);
      }
    }

    // 3. Mettre en cache
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify({ enabled }));

    return enabled;

  } catch (error) {
    logger.error('Error getting feature flag', {
      flagName,
      error: error.message
    });

    // Fallback sur valeur par défaut
    return DEFAULT_FLAGS[flagName] ?? false;
  }
}

/**
 * Récupérer plusieurs flags en une fois
 * @param {Array<string>} flagNames - Liste des noms de flags
 * @param {Object} context - Contexte
 * @returns {Promise<Object>} Map des flags et leurs valeurs
 */
async function getFlags(flagNames, context = {}) {
  const flags = {};

  await Promise.all(
    flagNames.map(async (name) => {
      flags[name] = await getFlag(name, context);
    })
  );

  return flags;
}

/**
 * Récupérer TOUS les flags (pour admin dashboard)
 * @returns {Promise<Object>} Tous les flags avec métadonnées
 */
async function getAllFlags() {
  try {
    const dbFlags = await prisma.featureFlag.findMany({
      orderBy: { name: 'asc' }
    });

    // Merger avec les flags par défaut
    const allFlags = { ...DEFAULT_FLAGS };

    dbFlags.forEach(flag => {
      allFlags[flag.name] = flag.enabled;
    });

    return {
      flags: allFlags,
      dbFlags,
      defaults: DEFAULT_FLAGS
    };

  } catch (error) {
    logger.error('Error getting all flags', {
      error: error.message
    });

    return {
      flags: DEFAULT_FLAGS,
      dbFlags: [],
      defaults: DEFAULT_FLAGS
    };
  }
}

/**
 * Activer/Désactiver un flag
 * @param {string} flagName - Nom du flag
 * @param {boolean} enabled - Nouvelle valeur
 * @param {string} updatedBy - ID utilisateur qui fait la modif
 * @returns {Promise<Object>} Flag mis à jour
 */
async function setFlag(flagName, enabled, updatedBy) {
  try {
    // Upsert dans la DB
    const flag = await prisma.featureFlag.upsert({
      where: { name: flagName },
      update: {
        enabled,
        updatedAt: new Date()
      },
      create: {
        name: flagName,
        enabled,
        description: `Auto-created flag: ${flagName}`
      }
    });

    // Invalider le cache
    const cacheKey = `${CACHE_PREFIX}${flagName}`;
    await redis.del(cacheKey);

    // Logger le changement
    logger.info('Feature flag updated', {
      flagName,
      enabled,
      updatedBy,
      previousValue: !enabled
    });

    // Créer un audit log
    await prisma.auditLog.create({
      data: {
        userId: updatedBy,
        action: 'feature_flag_updated',
        entityType: 'FeatureFlag',
        entityId: flag.id,
        changes: {
          flagName,
          enabled,
          timestamp: new Date().toISOString()
        }
      }
    });

    return flag;

  } catch (error) {
    logger.error('Error setting feature flag', {
      flagName,
      enabled,
      error: error.message
    });
    throw error;
  }
}

/**
 * Évaluer les règles de ciblage (targeting)
 * Permet d'activer un flag pour certains users seulement
 *
 * @param {Object} rules - Règles de ciblage
 * @param {Object} context - Contexte (userId, role, etc.)
 * @returns {boolean} Flag enabled pour ce contexte
 */
function evaluateTargetingRules(rules, context) {
  if (!rules || typeof rules !== 'object') {
    return true;
  }

  // Rule: userIds (whitelist)
  if (rules.userIds && context.userId) {
    return rules.userIds.includes(context.userId);
  }

  // Rule: roles
  if (rules.roles && context.role) {
    return rules.roles.includes(context.role);
  }

  // Rule: isPremium
  if (rules.isPremium !== undefined && context.isPremium !== undefined) {
    return rules.isPremium === context.isPremium;
  }

  // Rule: percentage rollout (ex: activer pour 10% des users)
  if (rules.percentage !== undefined && context.userId) {
    const hash = simpleHash(context.userId);
    const userPercentage = hash % 100;
    return userPercentage < rules.percentage;
  }

  return true;
}

/**
 * Hash simple pour percentage rollout
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Middleware Express pour vérifier un feature flag
 * Usage: router.get('/path', requireFlag('FLAG_NAME'), handler)
 *
 * @param {string} flagName - Nom du flag requis
 * @returns {Function} Middleware Express
 */
function requireFlag(flagName) {
  return async (req, res, next) => {
    try {
      const context = {
        userId: req.user?.id,
        role: req.user?.role,
        isPremium: req.user?.isPremium
      };

      const enabled = await getFlag(flagName, context);

      if (!enabled) {
        logger.warn('Feature flag blocked request', {
          flagName,
          userId: req.user?.id,
          path: req.path
        });

        return res.status(403).json({
          error: 'Feature not available',
          message: 'Cette fonctionnalité n\'est pas disponible actuellement.',
          feature: flagName
        });
      }

      // Ajouter le flag au request pour usage ultérieur
      req.featureFlags = req.featureFlags || {};
      req.featureFlags[flagName] = true;

      next();

    } catch (error) {
      logger.error('Error in requireFlag middleware', {
        flagName,
        error: error.message
      });

      // En cas d'erreur, bloquer par sécurité
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Impossible de vérifier la disponibilité de cette fonctionnalité.'
      });
    }
  };
}

/**
 * Middleware pour attacher tous les flags au request
 * Usage: app.use(attachAllFlags)
 */
async function attachAllFlags(req, res, next) {
  try {
    const context = {
      userId: req.user?.id,
      role: req.user?.role,
      isPremium: req.user?.isPremium
    };

    // Récupérer les flags les plus utilisés
    const commonFlags = [
      'RECIPE_ENRICHMENT_ENABLED',
      'FRAUD_DETECTION_ENABLED',
      'RATE_LIMITING_ENABLED',
      'MAINTENANCE_MODE'
    ];

    req.featureFlags = await getFlags(commonFlags, context);
    next();

  } catch (error) {
    logger.error('Error in attachAllFlags middleware', {
      error: error.message
    });

    // Continuer malgré l'erreur
    req.featureFlags = {};
    next();
  }
}

/**
 * Invalider tout le cache des flags
 * À appeler après modifications massives
 */
async function invalidateAllCache() {
  try {
    const keys = await redis.keys(`${CACHE_PREFIX}*`);

    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info('Feature flags cache invalidated', {
        keysDeleted: keys.length
      });
    }

    return keys.length;

  } catch (error) {
    logger.error('Error invalidating flags cache', {
      error: error.message
    });
    return 0;
  }
}

/**
 * Initialiser les flags par défaut dans la DB
 * À appeler au premier déploiement
 */
async function initializeDefaultFlags() {
  try {
    logger.info('Initializing default feature flags...');

    const promises = Object.entries(DEFAULT_FLAGS).map(async ([name, enabled]) => {
      return prisma.featureFlag.upsert({
        where: { name },
        update: {}, // Ne rien mettre à jour si existe déjà
        create: {
          name,
          enabled,
          description: `Default flag: ${name}`
        }
      });
    });

    await Promise.all(promises);

    logger.info('Default feature flags initialized', {
      count: Object.keys(DEFAULT_FLAGS).length
    });

  } catch (error) {
    logger.error('Error initializing default flags', {
      error: error.message
    });
  }
}

module.exports = {
  getFlag,
  getFlags,
  getAllFlags,
  setFlag,
  requireFlag,
  attachAllFlags,
  invalidateAllCache,
  initializeDefaultFlags,
  DEFAULT_FLAGS
};
