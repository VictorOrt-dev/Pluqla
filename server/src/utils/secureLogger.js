const winston = require('winston');
const path = require('path');

/**
 * SECURE LOGGING UTILITY FOR PLUQLA
 *
 * SECURITY FEATURES:
 * - Automatic sanitization of sensitive fields
 * - Masking of API keys, tokens, passwords
 * - Safe request/error logging
 * - Redaction of PII and credentials
 * - Production-safe configuration
 */

// Configuration des niveaux de log
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};

// Couleurs pour la console
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'gray',
};

winston.addColors(colors);

/**
 * SENSITIVE FIELD PATTERNS - These will be masked/removed
 */
const SENSITIVE_PATTERNS = {
  // API Keys and tokens
  apiKey: /(api[_-]?key|apikey)/i,
  token: /(token|jwt|bearer)/i,
  auth: /(authorization|auth)/i,
  secret: /(secret|password|pwd|pass)/i,

  // Database credentials
  database: /(database_url|db_url|connection_string)/i,

  // Email credentials
  email: /(smtp_pass|email_pass|mail_pass)/i,

  // Crypto/sensitive values
  crypto: /(private_key|cert|certificate)/i,

  // User PII
  pii: /(ssn|social|credit|card)/i,
};

/**
 * SENSITIVE VALUE PATTERNS - Detect API keys, JWTs, etc. in values
 */
const SENSITIVE_VALUE_PATTERNS = {
  // OpenAI API key pattern
  openaiKey: /sk-[A-Za-z0-9]{32,}/g,

  // Anthropic API key pattern
  anthropicKey: /sk-ant-[A-Za-z0-9_-]+/g,

  // Generic API key patterns
  genericApiKey: /[A-Za-z0-9]{32,}/g,

  // JWT token pattern
  jwtToken: /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]*/g,

  // Database connection string
  dbConnection: /(?:postgres|mysql|mongodb):\/\/[^\s]+/g,

  // Email/password combinations
  emailPassword: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}:[^\s]+/g,

  // Generic secrets (32+ chars alphanumeric)
  genericSecret: /[A-Za-z0-9]{32,}/g,
};

/**
 * Sanitize an object by removing/masking sensitive fields
 * @param {any} obj - Object to sanitize
 * @param {number} depth - Current recursion depth (prevent infinite loops)
 * @returns {any} Sanitized object
 */
const sanitizeObject = (obj, depth = 0) => {
  // Prevent infinite recursion
  if (depth > 10) {
    return '[MAX_DEPTH_REACHED]';
  }

  // Handle null/undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitives
  if (typeof obj !== 'object') {
    return sanitizeValue(obj);
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }

  // Handle Error objects specially
  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: sanitizeValue(obj.message),
      // Don't include stack in production
      ...(process.env.NODE_ENV !== 'production' && {
        stack: sanitizeValue(obj.stack?.split('\n')[0] || '') // Only first line
      })
    };
  }

  // Handle regular objects
  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Check if key is sensitive
    const isSensitiveKey = Object.values(SENSITIVE_PATTERNS).some(pattern =>
      pattern.test(lowerKey)
    );

    if (isSensitiveKey) {
      sanitized[key] = maskSensitiveValue(value);
    } else {
      sanitized[key] = sanitizeObject(value, depth + 1);
    }
  }

  return sanitized;
};

/**
 * Sanitize a string value by masking sensitive patterns
 * @param {any} value - Value to sanitize
 * @returns {string} Sanitized value
 */
const sanitizeValue = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  let sanitized = value;

  // Apply all sensitive value patterns
  Object.entries(SENSITIVE_VALUE_PATTERNS).forEach(([patternName, pattern]) => {
    sanitized = sanitized.replace(pattern, (match) => {
      // Show first 4 and last 4 characters for debugging, mask the rest
      if (match.length > 8) {
        const start = match.substring(0, 4);
        const end = match.substring(match.length - 4);
        const middle = '*'.repeat(Math.min(match.length - 8, 20));
        return `${start}${middle}${end}`;
      } else {
        return '*'.repeat(match.length);
      }
    });
  });

  return sanitized;
};

/**
 * Mask a sensitive value completely
 * @param {any} value - Value to mask
 * @returns {string} Masked value
 */
const maskSensitiveValue = (value) => {
  if (value === null || value === undefined) {
    return value;
  }

  const str = String(value);
  if (str.length === 0) {
    return str;
  }

  // For very short values, mask completely
  if (str.length <= 4) {
    return '*'.repeat(str.length);
  }

  // For longer values, show first 2 and mask the rest
  return `${str.substring(0, 2)}${'*'.repeat(Math.min(str.length - 2, 20))}`;
};

/**
 * Sanitize request headers, removing sensitive headers
 * @param {Object} headers - Request headers object
 * @returns {Object} Sanitized headers
 */
const sanitizeHeaders = (headers) => {
  if (!headers || typeof headers !== 'object') {
    return headers;
  }

  const sanitized = { ...headers };

  // Remove sensitive headers completely
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
    'x-access-token',
    'x-refresh-token'
  ];

  sensitiveHeaders.forEach(header => {
    Object.keys(sanitized).forEach(key => {
      if (key.toLowerCase() === header) {
        sanitized[key] = '[REDACTED]';
      }
    });
  });

  return sanitized;
};

/**
 * Sanitize request body, removing sensitive fields
 * @param {any} body - Request body
 * @returns {any} Sanitized body
 */
const sanitizeRequestBody = (body) => {
  if (!body) return body;

  const sanitized = sanitizeObject(body);

  // Additional request body sanitization
  if (typeof sanitized === 'object' && sanitized !== null) {
    // Mask password fields
    ['password', 'newPassword', 'confirmPassword', 'currentPassword'].forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
  }

  return sanitized;
};

/**
 * Format pour la console (développement) - with sanitization
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;

    // Sanitize all metadata
    const sanitizedMeta = sanitizeObject(meta);

    let metaStr = '';
    if (Object.keys(sanitizedMeta).length > 0) {
      metaStr = `\n${JSON.stringify(sanitizedMeta, null, 2)}`;
    }

    // Sanitize the message itself
    const sanitizedMessage = sanitizeValue(message);

    return `${timestamp} [${level}]: ${sanitizedMessage}${metaStr}`;
  })
);

/**
 * Format pour les fichiers (production) - with sanitization
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.printf((info) => {
    // Sanitize all log data before writing to file
    const sanitizedInfo = sanitizeObject(info);
    return JSON.stringify(sanitizedInfo);
  })
);

// Transports (où envoyer les logs)
const transports = [
  // Console (toujours actif)
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  }),
];

// Fichiers de log (uniquement si activé et sécurisés)
if (process.env.LOG_FILE_ENABLED === 'true') {
  // Log général
  transports.push(
    new winston.transports.File({
      filename: path.join('logs', 'app.log'),
      format: fileFormat,
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Log des erreurs uniquement
  transports.push(
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      format: fileFormat,
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Créer le logger sécurisé
const secureLogger = winston.createLogger({
  levels,
  transports,
  exitOnError: false,
});

/**
 * SECURE LOGGING METHODS
 */

/**
 * Log HTTP requests securely
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {number} responseTime - Response time in ms
 */
secureLogger.logRequest = (req, res, responseTime) => {
  secureLogger.http('HTTP Request', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userId: req.user?.id,
    // Headers are automatically sanitized
    headers: sanitizeHeaders(req.headers),
  });
};

/**
 * Log errors securely - NEVER logs sensitive data
 * @param {Error|string} error - Error to log
 * @param {Object} context - Additional context (will be sanitized)
 */
secureLogger.logError = (error, context = {}) => {
  secureLogger.error('Application Error', {
    error: sanitizeObject(error),
    context: sanitizeObject(context),
    timestamp: new Date().toISOString(),
  });
};

/**
 * Log authentication events securely
 * @param {string} action - Auth action (login, logout, etc.)
 * @param {string} email - User email (will be masked for privacy)
 * @param {boolean} success - Whether action succeeded
 * @param {Object} meta - Additional metadata (will be sanitized)
 */
secureLogger.logAuth = (action, email, success, meta = {}) => {
  secureLogger.info('Authentication Event', {
    action,
    // Mask email for privacy - show domain only
    email: email ? `***@${email.split('@')[1] || 'unknown'}` : 'unknown',
    success,
    timestamp: new Date().toISOString(),
    meta: sanitizeObject(meta),
  });
};

/**
 * Log transaction events securely
 * @param {string} userId - User ID
 * @param {Object} transaction - Transaction object (will be sanitized)
 * @param {string} action - Action performed
 */
secureLogger.logTransaction = (userId, transaction, action = 'created') => {
  secureLogger.info('Transaction Event', {
    userId,
    transactionId: transaction.id,
    action,
    amount: transaction.amount,
    category: transaction.category,
    // Don't log sensitive transaction details
    timestamp: new Date().toISOString(),
  });
};

/**
 * Log AI requests securely - NEVER logs API keys or prompts
 * @param {string} userId - User ID
 * @param {string} category - AI category
 * @param {boolean} success - Whether request succeeded
 * @param {Object} meta - Additional metadata (will be sanitized)
 */
secureLogger.logAI = (userId, category, success, meta = {}) => {
  secureLogger.info('AI Request', {
    userId,
    category,
    success,
    timestamp: new Date().toISOString(),
    // Meta is sanitized to remove any API keys or sensitive prompts
    meta: sanitizeObject(meta),
  });
};

/**
 * Log security events (failed logins, token issues, etc.)
 * @param {string} event - Security event type
 * @param {Object} details - Event details (will be sanitized)
 */
secureLogger.logSecurity = (event, details = {}) => {
  secureLogger.warn('Security Event', {
    event,
    details: sanitizeObject(details),
    timestamp: new Date().toISOString(),
  });
};

/**
 * Override Winston's default logging methods to ensure sanitization
 */

// Store original Winston methods
const originalError = secureLogger.error;
const originalInfo = secureLogger.info;
const originalWarn = secureLogger.warn;
const originalDebug = secureLogger.debug;

/**
 * Safe error logging - strips all sensitive data from errors
 * @param {string} message - Error message
 * @param {any} data - Data to log
 */
secureLogger.error = function(message, data) {
  const sanitizedMessage = sanitizeValue(message);
  const sanitizedData = sanitizeObject(data);
  return originalError.call(this, sanitizedMessage, sanitizedData);
};

/**
 * Safe info logging
 * @param {string} message - Info message
 * @param {any} data - Data to log
 */
secureLogger.info = function(message, data) {
  const sanitizedMessage = sanitizeValue(message);
  const sanitizedData = sanitizeObject(data);
  return originalInfo.call(this, sanitizedMessage, sanitizedData);
};

/**
 * Safe warn logging
 * @param {string} message - Warning message
 * @param {any} data - Data to log
 */
secureLogger.warn = function(message, data) {
  const sanitizedMessage = sanitizeValue(message);
  const sanitizedData = sanitizeObject(data);
  return originalWarn.call(this, sanitizedMessage, sanitizedData);
};

/**
 * Safe debug logging (only in development)
 * @param {string} message - Debug message
 * @param {any} data - Data to log
 */
secureLogger.debug = function(message, data) {
  if (process.env.NODE_ENV !== 'production') {
    const sanitizedMessage = sanitizeValue(message);
    const sanitizedData = sanitizeObject(data);
    return originalDebug.call(this, sanitizedMessage, sanitizedData);
  }
};

// Export the secure logger with all safety methods
module.exports = secureLogger;