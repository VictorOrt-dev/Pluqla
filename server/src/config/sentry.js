/**
 * Sentry Configuration
 *
 * Error tracking et monitoring avec Sentry
 * Capture automatiquement les erreurs non gérées
 */

const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');
const logger = require('../utils/logger');

/**
 * Initialise Sentry
 * À appeler au démarrage de l'application AVANT tout autre code
 */
function initSentry(app) {
  // Skip si pas de DSN configuré
  if (!process.env.SENTRY_DSN) {
    logger.warn('⚠️  SENTRY_DSN not configured. Error tracking disabled.');
    return;
  }

  try {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.npm_package_version || 'unknown',

      // Intégrations
      integrations: [
        // Capture toutes les requêtes HTTP
        new Sentry.Integrations.Http({ tracing: true }),

        // Express instrumentation
        new Sentry.Integrations.Express({ app }),

        // Profiling des performances
        new ProfilingIntegration(),
      ],

      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Profiling
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Options avancées
      beforeSend(event, hint) {
        // Filtrer les erreurs non critiques
        if (event.level === 'info' || event.level === 'debug') {
          return null; // Ne pas envoyer
        }

        // Anonymiser les données sensibles
        if (event.user) {
          delete event.user.ip_address; // Ne pas envoyer l'IP réelle
          if (event.user.email) {
            event.user.email = event.user.email.replace(/(.{2}).*(@.*)/, '$1***$2'); // Masquer email
          }
        }

        // Logger localement aussi
        logger.error('Sentry error captured', {
          eventId: event.event_id,
          message: event.message,
          level: event.level
        });

        return event;
      },

      // Ne pas capturer certaines erreurs
      ignoreErrors: [
        // Erreurs connues non critiques
        'Invalid token',
        'jwt expired',
        'jwt malformed',
        'Too many requests',
        /Network error/i,
        /timeout/i,
        'AbortError'
      ],

      // Tags par défaut
      initialScope: {
        tags: {
          service: 'pluqla-api',
          version: process.env.npm_package_version || 'unknown'
        }
      }
    });

    logger.info('✅ Sentry initialized', {
      environment: process.env.NODE_ENV,
      dsn: process.env.SENTRY_DSN?.substring(0, 30) + '...'
    });

  } catch (error) {
    logger.error('Failed to initialize Sentry', {
      error: error.message
    });
  }
}

/**
 * Middleware Express pour Sentry Request Handler
 * À placer AVANT toutes les routes
 */
function sentryRequestHandler() {
  return Sentry.Handlers.requestHandler({
    user: ['id', 'email', 'role'],
    ip: false // Ne pas capturer l'IP (RGPD)
  });
}

/**
 * Middleware Express pour Sentry Tracing
 * À placer AVANT toutes les routes
 */
function sentryTracingHandler() {
  return Sentry.Handlers.tracingHandler();
}

/**
 * Middleware Express pour Sentry Error Handler
 * À placer APRÈS toutes les routes mais AVANT le error handler final
 */
function sentryErrorHandler() {
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capturer toutes les erreurs >= 500
      if (error.status >= 500) {
        return true;
      }

      // Capturer certaines erreurs spécifiques même si < 500
      const criticalErrors = [
        'DatabaseError',
        'PrismaClientKnownRequestError',
        'RedisError',
        'QueueError'
      ];

      return criticalErrors.some(type => error.name?.includes(type));
    }
  });
}

/**
 * Capturer une exception manuellement
 * @param {Error} error - Erreur à capturer
 * @param {Object} context - Contexte additionnel
 */
function captureException(error, context = {}) {
  Sentry.captureException(error, {
    extra: context
  });

  logger.error('Exception captured by Sentry', {
    error: error.message,
    stack: error.stack,
    context
  });
}

/**
 * Capturer un message (non-erreur)
 * @param {string} message - Message à capturer
 * @param {string} level - Niveau (info, warning, error)
 * @param {Object} context - Contexte additionnel
 */
function captureMessage(message, level = 'info', context = {}) {
  Sentry.captureMessage(message, {
    level,
    extra: context
  });
}

/**
 * Ajouter un breadcrumb (fil d'Ariane)
 * Utile pour tracer le parcours avant une erreur
 * @param {Object} breadcrumb - { message, category, level, data }
 */
function addBreadcrumb(breadcrumb) {
  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Définir l'utilisateur courant pour les erreurs suivantes
 * @param {Object} user - { id, email, username }
 */
function setUser(user) {
  Sentry.setUser({
    id: user.id,
    email: user.email ? user.email.replace(/(.{2}).*(@.*)/, '$1***$2') : undefined,
    role: user.role
  });
}

/**
 * Nettoyer le contexte utilisateur
 */
function clearUser() {
  Sentry.setUser(null);
}

/**
 * Middleware Express pour enrichir Sentry avec contexte utilisateur
 * À placer APRÈS authenticateToken
 */
function sentryUserContext(req, res, next) {
  if (req.user) {
    setUser(req.user);
  }
  next();
}

/**
 * Capturer les performance metrics
 * @param {string} operation - Nom de l'opération
 * @param {Function} callback - Fonction à mesurer
 */
async function measurePerformance(operation, callback) {
  const transaction = Sentry.startTransaction({
    op: operation,
    name: operation
  });

  try {
    const result = await callback();
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    captureException(error, { operation });
    throw error;
  } finally {
    transaction.finish();
  }
}

/**
 * Health check Sentry
 * @returns {boolean} True si Sentry est fonctionnel
 */
function isSentryEnabled() {
  return !!process.env.SENTRY_DSN && Sentry.getCurrentHub().getClient() !== undefined;
}

/**
 * Flush tous les events Sentry (avant shutdown)
 * @param {number} timeout - Timeout en ms
 */
async function flushSentry(timeout = 2000) {
  try {
    await Sentry.close(timeout);
    logger.info('Sentry events flushed');
  } catch (error) {
    logger.error('Error flushing Sentry', { error: error.message });
  }
}

module.exports = {
  initSentry,
  sentryRequestHandler,
  sentryTracingHandler,
  sentryErrorHandler,
  sentryUserContext,
  captureException,
  captureMessage,
  addBreadcrumb,
  setUser,
  clearUser,
  measurePerformance,
  isSentryEnabled,
  flushSentry,
  Sentry // Export pour usage avancé
};
