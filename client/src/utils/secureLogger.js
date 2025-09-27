/**
 * Logger sécurisé pour Pluqla
 * Évite l'exposition de données sensibles en production
 */

const SENSITIVE_KEYS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'key',
  'authorization',
  'cookie',
  'session'
];

const SENSITIVE_PATTERNS = [
  /bearer\s+/i,
  /jwt\s*/i,
  /password/i,
  /secret/i,
  /private/i
];

/**
 * Check if a key or value contains sensitive information
 * @param {string} key - Object key
 * @param {*} value - Object value
 * @returns {boolean} True if sensitive
 */
const isSensitive = (key, value) => {
  if (typeof key === 'string') {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some(sensitiveKey => lowerKey.includes(sensitiveKey))) {
      return true;
    }
  }

  if (typeof value === 'string') {
    if (SENSITIVE_PATTERNS.some(pattern => pattern.test(value))) {
      return true;
    }

    // Check for JWT tokens (rough pattern)
    if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/]*$/.test(value)) {
      return true;
    }
  }

  return false;
};

/**
 * Sanitize an object by masking sensitive values
 * @param {*} obj - Object to sanitize
 * @param {number} maxDepth - Maximum recursion depth
 * @returns {*} Sanitized object
 */
const sanitizeObject = (obj, maxDepth = 3) => {
  if (maxDepth <= 0) {
    return '[MAX_DEPTH_REACHED]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, maxDepth - 1));
  }

  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    if (isSensitive(key, value)) {
      if (typeof value === 'string') {
        // Show first 4 characters for debugging, mask the rest
        sanitized[key] = value.length > 4
          ? `${value.substring(0, 4)}***[MASKED]`
          : '***[MASKED]';
      } else {
        sanitized[key] = '[SENSITIVE_DATA_MASKED]';
      }
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value, maxDepth - 1);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Format log arguments safely
 * @param {...any} args - Log arguments
 * @returns {Array} Sanitized arguments
 */
const formatArgs = (...args) => {
  return args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      return sanitizeObject(arg);
    }
    if (typeof arg === 'string' && isSensitive('', arg)) {
      return '[SENSITIVE_STRING_MASKED]';
    }
    return arg;
  });
};

/**
 * Create a secure logger that respects environment
 * @param {string} environment - Current environment
 * @returns {Object} Logger instance
 */
const createSecureLogger = (environment = process.env.NODE_ENV) => {
  const isDevelopment = environment === 'development';
  const isTest = environment === 'test';

  const logger = {
    info: (...args) => {
      if (isDevelopment) {
        console.info('ℹ️', ...formatArgs(...args));
      }
    },

    warn: (...args) => {
      if (isDevelopment || isTest) {
        console.warn('⚠️', ...formatArgs(...args));
      }
    },

    error: (...args) => {
      // Always log errors, but sanitize them
      console.error('❌', ...formatArgs(...args));
    },

    debug: (...args) => {
      if (isDevelopment) {
        console.debug('🐛', ...formatArgs(...args));
      }
    },

    success: (...args) => {
      if (isDevelopment) {
        console.log('✅', ...formatArgs(...args));
      }
    },

    api: (method, url, data = null) => {
      if (isDevelopment) {
        const sanitizedData = data ? sanitizeObject(data) : null;
        console.log(`📡 ${method.toUpperCase()} ${url}`, sanitizedData);
      }
    },

    auth: (action, data = null) => {
      if (isDevelopment) {
        const sanitizedData = data ? sanitizeObject(data) : null;
        console.log(`🔐 AUTH: ${action}`, sanitizedData);
      }
    },

    navigation: (from, to, extra = null) => {
      if (isDevelopment) {
        const sanitizedExtra = extra ? sanitizeObject(extra) : null;
        console.log(`🧭 Navigation: ${from} → ${to}`, sanitizedExtra);
      }
    },

    performance: (label, duration) => {
      if (isDevelopment) {
        console.log(`⚡ Performance: ${label} took ${duration}ms`);
      }
    },

    // Special method for sensitive operations (never logs content)
    sensitive: (action) => {
      if (isDevelopment) {
        console.log(`🔒 Sensitive operation: ${action} [content hidden]`);
      }
    }
  };

  // Add environment info in development
  if (isDevelopment) {
    logger.info('Secure Logger initialized for development');
  }

  return logger;
};

// Create default logger instance
const secureLogger = createSecureLogger();

// Export both the logger and the factory
export default secureLogger;
export { createSecureLogger, sanitizeObject, formatArgs };

// Helper for component debugging
export const componentLogger = (componentName) => ({
  mount: (props) => secureLogger.debug(`${componentName} mounted`, { props }),
  unmount: () => secureLogger.debug(`${componentName} unmounted`),
  render: (state) => secureLogger.debug(`${componentName} rendered`, { state }),
  error: (error) => secureLogger.error(`${componentName} error`, error)
});

// Helper for API call logging
export const apiLogger = {
  request: (method, url, data) => secureLogger.api(method, url, data),
  response: (method, url, status, data) => {
    const sanitizedData = sanitizeObject(data);
    secureLogger.debug(`📡 ${method.toUpperCase()} ${url} → ${status}`, sanitizedData);
  },
  error: (method, url, error) => {
    secureLogger.error(`📡 ${method.toUpperCase()} ${url} failed`, error);
  }
};