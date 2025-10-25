/**
 * Sentry Error Tracking Configuration
 *
 * ✨ Phase 8 - Frontend error monitoring and crash reporting
 *
 * Installation:
 * npm install --save @sentry/react
 *
 * Setup Sentry DSN in .env:
 * REACT_APP_SENTRY_DSN=https://YOUR_SENTRY_DSN@sentry.io/PROJECT_ID
 * REACT_APP_SENTRY_ENVIRONMENT=production|staging|development
 */

let Sentry = null;

// Try to import Sentry (graceful fallback if not installed)
try {
  Sentry = require('@sentry/react');
} catch (error) {
  console.warn('⚠️ Sentry not installed. Run: npm install @sentry/react');
}

/**
 * Initialize Sentry error tracking
 * Call this ONCE at app startup (in index.js)
 */
export function initSentry() {
  // Skip if Sentry not installed
  if (!Sentry) {
    console.log('📊 Sentry not available - error tracking disabled');
    return;
  }

  // Skip in development unless explicitly enabled
  const isDevelopment = process.env.NODE_ENV === 'development';
  const sentryDsn = process.env.REACT_APP_SENTRY_DSN;

  if (!sentryDsn) {
    console.warn('⚠️ REACT_APP_SENTRY_DSN not configured - Sentry disabled');
    return;
  }

  try {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.REACT_APP_SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'production',

      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.5, // 10% in prod, 50% in dev

      // Session Replay (optional - high data usage)
      replaysSessionSampleRate: 0.01, // 1% of sessions
      replaysOnErrorSampleRate: 0.5, // 50% of sessions with errors

      // Integrations
      integrations: [
        // Browser tracing for performance monitoring
        Sentry.browserTracingIntegration({
          // Track navigation and page load performance
          tracePropagationTargets: [
            'localhost',
            /^https:\/\/api\.pluqla\.app/,
            /^https:\/\/pluqla\.app/,
          ],
        }),

        // Session replay for debugging (optional)
        Sentry.replayIntegration({
          maskAllText: true, // Privacy: mask all text
          blockAllMedia: true, // Privacy: don't capture images/videos
        }),

        // React profiler for component performance
        Sentry.reactRouterV6BrowserTracingIntegration({
          useEffect: require('react').useEffect,
          useLocation: require('react-router-dom').useLocation,
          useNavigationType: require('react-router-dom').useNavigationType,
          createRoutesFromChildren: require('react-router-dom').createRoutesFromChildren,
          matchRoutes: require('react-router-dom').matchRoutes,
        }),
      ],

      // Release tracking
      release: process.env.REACT_APP_VERSION || '1.0.0',

      // Ignore common non-critical errors
      ignoreErrors: [
        // Browser extensions
        'top.GLOBALS',
        'originalCreateNotification',
        'canvas.contentDocument',
        'MyApp_RemoveAllHighlights',
        'atomicFindClose',

        // Network errors (handled separately)
        'NetworkError',
        'Failed to fetch',
        'Load failed',

        // React DevTools
        '__REACT_DEVTOOLS_GLOBAL_HOOK__',

        // Random plugins/extensions
        'Can\'t find variable: ZiteReader',
        'jigsaw is not defined',
        'ComboSearch is not defined',
        'http://loading.retry.widdit.com/',
      ],

      // Filter sensitive data
      beforeSend(event, hint) {
        // Don't send errors in development unless explicitly enabled
        if (isDevelopment && !process.env.REACT_APP_SENTRY_DEV_ENABLED) {
          return null;
        }

        // Remove sensitive data from event
        if (event.request) {
          // Remove tokens from headers
          if (event.request.headers) {
            delete event.request.headers['Authorization'];
            delete event.request.headers['X-Auth-Token'];
          }

          // Remove sensitive query params
          if (event.request.query_string) {
            event.request.query_string = event.request.query_string
              .replace(/token=[^&]*/gi, 'token=[FILTERED]')
              .replace(/api_key=[^&]*/gi, 'api_key=[FILTERED]')
              .replace(/password=[^&]*/gi, 'password=[FILTERED]');
          }
        }

        // Remove sensitive data from breadcrumbs
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
            if (breadcrumb.data) {
              // Filter sensitive fields
              const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];
              sensitiveFields.forEach(field => {
                if (breadcrumb.data[field]) {
                  breadcrumb.data[field] = '[FILTERED]';
                }
              });
            }
            return breadcrumb;
          });
        }

        // Add custom context
        event.contexts = {
          ...event.contexts,
          app: {
            name: 'Pluqla',
            version: process.env.REACT_APP_VERSION || '1.0.0',
          },
        };

        return event;
      },

      // Normalize breadcrumbs
      beforeBreadcrumb(breadcrumb, hint) {
        // Filter console breadcrumbs in production
        if (breadcrumb.category === 'console' && process.env.NODE_ENV === 'production') {
          return null;
        }

        // Limit XHR breadcrumb size
        if (breadcrumb.category === 'xhr' && breadcrumb.data) {
          if (breadcrumb.data.url && breadcrumb.data.url.length > 200) {
            breadcrumb.data.url = breadcrumb.data.url.substring(0, 200) + '...';
          }
        }

        return breadcrumb;
      },

      // Debug mode (only in development)
      debug: isDevelopment && process.env.REACT_APP_SENTRY_DEBUG === 'true',
    });

    console.log('✅ Sentry initialized:', {
      environment: Sentry.getCurrentHub().getClient()?.getOptions().environment,
      dsn: sentryDsn.substring(0, 30) + '...',
    });
  } catch (error) {
    console.error('❌ Failed to initialize Sentry:', error);
  }
}

/**
 * Manually capture an exception
 */
export function captureException(error, context = {}) {
  if (!Sentry) return;

  Sentry.withScope((scope) => {
    // Add custom context
    Object.keys(context).forEach(key => {
      scope.setContext(key, context[key]);
    });

    Sentry.captureException(error);
  });
}

/**
 * Capture a message (non-error event)
 */
export function captureMessage(message, level = 'info', context = {}) {
  if (!Sentry) return;

  Sentry.withScope((scope) => {
    scope.setLevel(level);
    Object.keys(context).forEach(key => {
      scope.setContext(key, context[key]);
    });

    Sentry.captureMessage(message);
  });
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user) {
  if (!Sentry) return;

  Sentry.setUser({
    id: user?.id,
    email: user?.email,
    username: user?.username,
    // Don't send sensitive data
  });
}

/**
 * Clear user context (e.g., on logout)
 */
export function clearUserContext() {
  if (!Sentry) return;
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message, category = 'custom', data = {}) {
  if (!Sentry) return;

  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data,
  });
}

/**
 * Start a performance transaction
 */
export function startTransaction(name, op) {
  if (!Sentry) return null;

  return Sentry.startTransaction({
    name,
    op,
  });
}

export default {
  initSentry,
  captureException,
  captureMessage,
  setUserContext,
  clearUserContext,
  addBreadcrumb,
  startTransaction,
};
