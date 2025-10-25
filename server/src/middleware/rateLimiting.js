/**
 * Rate Limiting Middleware
 *
 * Protection contre les abus et attaques DDoS
 * Utilise Redis comme store pour partager les limites entre instances
 * Basé sur IP hash (RGPD-compliant)
 */

const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getRedisClient } = require('../config/redis');
const { hashRequestIP } = require('../services/ipDeduplicationService');
const logger = require('../utils/logger');

/**
 * Rate limiter général (API publique)
 * 100 requêtes par 15 minutes
 */
const generalLimiter = rateLimit({
  store: new RedisStore({
    client: getRedisClient(),
    prefix: 'rl:general:',
    sendCommand: (...args) => getRedisClient().call(...args)
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes max
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  keyGenerator: (req) => {
    // Utiliser IP hash au lieu de l'IP brute
    return hashRequestIP(req);
  },
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ipHash: req.ipHash || hashRequestIP(req),
      path: req.path,
      method: req.method
    });

    res.status(429).json({
      error: 'Too many requests',
      message: 'Vous avez dépassé la limite de requêtes. Veuillez réessayer dans 15 minutes.',
      retryAfter: res.getHeader('Retry-After')
    });
  },
  skip: (req) => {
    // Skip rate limiting pour les health checks
    return req.path === '/health' || req.path === '/api/health';
  }
});

/**
 * Rate limiter strict pour authentification
 * 5 tentatives par 15 minutes (protection brute-force)
 */
const authLimiter = rateLimit({
  store: new RedisStore({
    client: getRedisClient(),
    prefix: 'rl:auth:',
    sendCommand: (...args) => getRedisClient().call(...args)
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives max
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Combiner IP + email pour éviter les attaques distribuées
    const ipHash = hashRequestIP(req);
    const email = req.body?.email || 'no-email';
    return `${ipHash}:${email}`;
  },
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ipHash: req.ipHash || hashRequestIP(req),
      email: req.body?.email,
      path: req.path
    });

    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

/**
 * Rate limiter pour les endpoints d'IA
 * 20 requêtes par heure (coûts API)
 */
const aiLimiter = rateLimit({
  store: new RedisStore({
    client: getRedisClient(),
    prefix: 'rl:ai:',
    sendCommand: (...args) => getRedisClient().call(...args)
  }),
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 20, // 20 requêtes max
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Par utilisateur authentifié OU par IP
    const userId = req.user?.id || 'anonymous';
    const ipHash = hashRequestIP(req);
    return `${userId}:${ipHash}`;
  },
  handler: (req, res) => {
    logger.warn('AI rate limit exceeded', {
      userId: req.user?.id,
      ipHash: req.ipHash || hashRequestIP(req),
      path: req.path
    });

    res.status(429).json({
      error: 'AI quota exceeded',
      message: 'Vous avez atteint votre quota d\'IA pour cette heure. Passez à Premium pour plus de requêtes.',
      retryAfter: res.getHeader('Retry-After'),
      upgradeUrl: '/api/subscription/plans'
    });
  }
});

/**
 * Rate limiter pour création de recettes
 * 10 recettes par jour
 */
const recipeCreationLimiter = rateLimit({
  store: new RedisStore({
    client: getRedisClient(),
    prefix: 'rl:recipe-create:',
    sendCommand: (...args) => getRedisClient().call(...args)
  }),
  windowMs: 24 * 60 * 60 * 1000, // 24 heures
  max: 10, // 10 recettes max
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.user?.id || 'anonymous';
    return userId;
  },
  handler: (req, res) => {
    logger.warn('Recipe creation rate limit exceeded', {
      userId: req.user?.id,
      ipHash: req.ipHash || hashRequestIP(req)
    });

    res.status(429).json({
      error: 'Recipe creation limit exceeded',
      message: 'Vous avez atteint votre limite de 10 recettes par jour. Passez à Premium pour créer illimité.',
      retryAfter: res.getHeader('Retry-After'),
      upgradeUrl: '/api/subscription/plans'
    });
  },
  skip: (req) => {
    // Premium users skip this limit
    return req.user?.isPremium === true;
  }
});

/**
 * Rate limiter pour interactions avec recettes
 * 100 interactions par heure (view, cook, favorite)
 */
const recipeInteractionLimiter = rateLimit({
  store: new RedisStore({
    client: getRedisClient(),
    prefix: 'rl:recipe-interact:',
    sendCommand: (...args) => getRedisClient().call(...args)
  }),
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.user?.id || 'anonymous';
    const ipHash = hashRequestIP(req);
    return `${userId}:${ipHash}`;
  },
  handler: (req, res) => {
    logger.warn('Recipe interaction rate limit exceeded', {
      userId: req.user?.id,
      ipHash: req.ipHash || hashRequestIP(req),
      interactionType: req.body?.interactionType
    });

    res.status(429).json({
      error: 'Too many recipe interactions',
      message: 'Vous avez atteint votre limite d\'interactions pour cette heure.',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

/**
 * Rate limiter pour export GDPR
 * 3 exports par jour (processus coûteux)
 */
const gdprExportLimiter = rateLimit({
  store: new RedisStore({
    client: getRedisClient(),
    prefix: 'rl:gdpr-export:',
    sendCommand: (...args) => getRedisClient().call(...args)
  }),
  windowMs: 24 * 60 * 60 * 1000, // 24 heures
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.user?.id || 'anonymous';
    return userId;
  },
  handler: (req, res) => {
    logger.warn('GDPR export rate limit exceeded', {
      userId: req.user?.id,
      ipHash: req.ipHash || hashRequestIP(req)
    });

    res.status(429).json({
      error: 'Export limit exceeded',
      message: 'Vous avez atteint votre limite de 3 exports de données par jour.',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

/**
 * Middleware pour logger les rate limit hits
 * À placer APRÈS les rate limiters
 */
function logRateLimitHits(req, res, next) {
  const rateLimitRemaining = res.getHeader('RateLimit-Remaining');

  if (rateLimitRemaining !== undefined && parseInt(rateLimitRemaining) < 10) {
    logger.info('Rate limit approaching', {
      ipHash: req.ipHash,
      userId: req.user?.id,
      path: req.path,
      remaining: rateLimitRemaining,
      limit: res.getHeader('RateLimit-Limit')
    });
  }

  next();
}

/**
 * Fonction pour reset manuellement un rate limit (admin)
 * @param {string} key - Clé Redis à supprimer
 */
async function resetRateLimit(key) {
  try {
    const redis = getRedisClient();
    await redis.del(key);
    logger.info('Rate limit reset', { key });
    return true;
  } catch (error) {
    logger.error('Failed to reset rate limit', {
      key,
      error: error.message
    });
    return false;
  }
}

/**
 * Récupérer les statistiques de rate limiting
 * @param {string} prefix - Préfixe Redis (ex: 'rl:general:')
 */
async function getRateLimitStats(prefix) {
  try {
    const redis = getRedisClient();
    const keys = await redis.keys(`${prefix}*`);

    const stats = {
      prefix,
      totalKeys: keys.length,
      keys: keys.slice(0, 100) // Limiter à 100 pour éviter surcharge
    };

    return stats;
  } catch (error) {
    logger.error('Failed to get rate limit stats', {
      prefix,
      error: error.message
    });
    return null;
  }
}

module.exports = {
  generalLimiter,
  authLimiter,
  aiLimiter,
  recipeCreationLimiter,
  recipeInteractionLimiter,
  gdprExportLimiter,
  logRateLimitHits,
  resetRateLimit,
  getRateLimitStats
};
