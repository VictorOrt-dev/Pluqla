const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const financialRateLimit = require('./financialRateLimit');
const enhancedLimiter = require('./rateLimiter');

// ⚠️  DEPRECATED - Use ./rateLimiter.js instead
// This file is kept for backward compatibility only.
//
// New code should use ./rateLimiter.js which includes:
// - Full Redis support with fallback
// - User-tier aware limits (free/premium/admin)
// - Better error messages with retry-after
// - Health check utilities
// - Improved headers and logging
//
// Migration guide: See docs/RATE_LIMIT_MIGRATION.md

// Configuration générale du rate limiting
const createLimiter = (options) => {
  // En développement, limites très permissives
  const isDevelopment = process.env.NODE_ENV === 'development';

  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes par défaut
    max: isDevelopment ? (options.max * 10) || 1000 : (options.max || 100), // 10x plus en dev
    message: {
      error: options.message || 'Trop de requêtes depuis cette IP',
      retryAfter: Math.ceil(options.windowMs / 1000) || 900
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessful || false,
    skipFailedRequests: options.skipFailed || false,
    keyGenerator: (req) =>
      // Utiliser l'ID utilisateur si authentifié, sinon l'IP
      req.user?.id || req.ip,
    handler: (req, res, next, options) => {
      logger.warn('Rate limit atteint:', {
        ip: req.ip,
        userId: req.user?.id,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent')
      });

      res.status(options.statusCode).json(options.message);
    }
  });
};

// Rate limiters spécifiques
const limiters = {
  // Limites globales
  global: createLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000,
    message: 'Trop de requêtes depuis cette IP. Réessayez dans 15 minutes.'
  }),

  // Limites pour l'authentification
  auth: createLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Plus strict pour l'auth
    message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
    skipSuccessful: true // Ne pas compter les connexions réussies
  }),

  // Limites strictes pour l'IA
  ai: createLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: process.env.NODE_ENV === 'production' ? 5 : 20,
    message: 'Limite de requêtes IA atteinte. Attendez 1 minute.',
    keyGenerator: (req) =>
      // Limiter par utilisateur pour l'IA
      req.user?.id || req.ip

  }),

  // Limites pour les uploads
  upload: createLimiter({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: process.env.NODE_ENV === 'production' ? 20 : 100,
    message: 'Trop d\'uploads. Réessayez dans 10 minutes.'
  }),

  // Limites standard pour les opérations normales
  standard: createLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 200 : 1000,
    message: 'Limite de requêtes atteinte. Réessayez dans 15 minutes.'
  }),

  // Limites pour les rapports et exports (plus restrictif)
  slow: createLimiter({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: process.env.NODE_ENV === 'production' ? 10 : 50,
    message: 'Limite d\'exports atteinte. Réessayez dans 1 heure.'
  }),

  // Limites pour les analytics
  analytics: createLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 500,
    message: 'Trop d\'événements analytics. Réessayez dans 5 minutes.'
  }),

  // Limites pour les admins
  admin: createLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 50 : 200,
    message: 'Limite d\'opérations admin atteinte.'
  }),

  // Limites strictes pour les opérations critiques
  strict: createLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 20 : 100,
    message: 'Limite d\'opérations critiques atteinte. Réessayez dans 15 minutes.'
  })
};

// Rate limiter dynamique basé sur l'abonnement
const createSubscriptionBasedLimiter = (freeLimit, premiumLimit, windowMs = 15 * 60 * 1000) => (req, res, next) => {
  const { user } = req;
  let maxRequests = freeLimit;

  if (user && user.subscription && user.subscription.plan !== 'free') {
    maxRequests = premiumLimit;
  }

  const limiter = createLimiter({
    windowMs,
    max: maxRequests,
    message: user && user.subscription && user.subscription.plan === 'free'
      ? 'Limite gratuite atteinte. Passez à Premium pour plus de requêtes.'
      : 'Limite de requêtes atteinte.'
  });

  limiter(req, res, next);
};

// Rate limiter pour les suggestions IA basé sur l'abonnement
const aiSubscriptionLimiter = createSubscriptionBasedLimiter(
  5, // Limite gratuite: 5 par heure
  50, // Limite premium: 50 par heure
  60 * 60 * 1000 // 1 heure
);

// Middleware pour skip le rate limiting en développement
const skipInDevelopment = (limiter) => (req, res, next) => {
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMIT === 'true') {
    return next();
  }
  limiter(req, res, next);
};

// Exporter tous les limiters avec possibilité de skip en dev
const exportedLimiters = {};
Object.keys(limiters).forEach((key) => {
  exportedLimiters[key] = skipInDevelopment(limiters[key]);
});

module.exports = {
  ...exportedLimiters,
  aiSubscriptionLimiter: skipInDevelopment(aiSubscriptionLimiter),
  createLimiter,
  createSubscriptionBasedLimiter,

  // Financial rate limiters - production-grade security
  financial: {
    transactions: financialRateLimit.transactions,
    payments: financialRateLimit.payments,
    subscriptions: financialRateLimit.subscriptions,
    reports: financialRateLimit.reports,

    // Enhanced variants
    transactionsBurst: financialRateLimit.transactionsBurst,
    paymentsProgressive: financialRateLimit.paymentsProgressive,
    transactionsMulti: financialRateLimit.transactionsMulti,
    reportsMulti: financialRateLimit.reportsMulti,

    // API limiting
    apiCalls: financialRateLimit.apiCalls,
    aiRequests: financialRateLimit.aiRequests
  },

  // Financial rate limit utilities
  createFinancialRateLimit: financialRateLimit.createFinancialRateLimit,
  getUserSubscriptionTier: financialRateLimit.getUserSubscriptionTier,
  getRateLimitConfig: financialRateLimit.getRateLimitConfig,
  financialHealthCheck: financialRateLimit.healthCheck,

  // Enhanced limiters (new, recommended for new code)
  enhanced: enhancedLimiter,

  // 🆕 Direct exports from enhanced limiter (for easy migration)
  // These are the RECOMMENDED limiters - they use Redis + tier awareness
  globalLimiter: enhancedLimiter.globalLimiter,
  authLimiter: enhancedLimiter.authLimiter,
  aiLimiter: enhancedLimiter.aiLimiter,
  uploadLimiter: enhancedLimiter.uploadLimiter,
  standardLimiter: enhancedLimiter.standardLimiter,
  analyticsLimiter: enhancedLimiter.analyticsLimiter,
  strictLimiter: enhancedLimiter.strictLimiter,
  slowLimiter: enhancedLimiter.slowLimiter,

  // Health check
  rateLimiterHealth: enhancedLimiter.getHealthStatus
};
