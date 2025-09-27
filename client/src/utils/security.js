/**
 * Utilitaires de sécurité pour Pluqla
 * Protection XSS, CSRF, validation des entrées
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} dirty - Raw HTML string
 * @param {Object} options - DOMPurify options
 * @returns {string} Sanitized HTML
 */
export const sanitizeHtml = (dirty, options = {}) => {
  if (typeof dirty !== 'string') {
    console.warn('sanitizeHtml: Input is not a string', typeof dirty);
    return '';
  }

  const defaultOptions = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
    ...options
  };

  try {
    return DOMPurify.sanitize(dirty, defaultOptions);
  } catch (error) {
    console.error('🔒 Erreur sanitisation HTML:', error);
    return '';
  }
};

/**
 * Sanitize text input to prevent script injection
 * @param {string} input - User input text
 * @returns {string} Sanitized text
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers like onclick=
    .trim();
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!email || typeof email !== 'string') {
    return false;
  }

  // Check basic format
  if (!emailRegex.test(email)) {
    return false;
  }

  // Additional security checks
  if (email.length > 254) { // RFC 5321 limit
    return false;
  }

  // Check for dangerous patterns
  const dangerousPatterns = [
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /<script/i,
    /on\w+=/i
  ];

  return !dangerousPatterns.some(pattern => pattern.test(email));
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with score and feedback
 */
export const validatePassword = (password) => {
  const result = {
    isValid: false,
    score: 0,
    feedback: []
  };

  if (!password || typeof password !== 'string') {
    result.feedback.push('Mot de passe requis');
    return result;
  }

  // Length check
  if (password.length < 6) {
    result.feedback.push('Minimum 6 caractères requis');
  } else if (password.length >= 8) {
    result.score += 2;
  } else {
    result.score += 1;
  }

  // Character variety checks
  if (/[a-z]/.test(password)) result.score += 1;
  if (/[A-Z]/.test(password)) result.score += 1;
  if (/[0-9]/.test(password)) result.score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) result.score += 2;

  // Common password patterns (security)
  const commonPatterns = [
    /^123456/,
    /^password/i,
    /^admin/i,
    /^qwerty/i
  ];

  const hasCommonPattern = commonPatterns.some(pattern => pattern.test(password));
  if (hasCommonPattern) {
    result.score = Math.max(0, result.score - 3);
    result.feedback.push('Évitez les mots de passe courants');
  }

  // Final validation
  result.isValid = password.length >= 6 && result.score >= 3;

  if (result.score <= 2) {
    result.feedback.push('Mot de passe trop faible');
  }

  return result;
};

/**
 * Safe JSON parse with error handling
 * @param {string} jsonString - JSON string to parse
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} Parsed object or default value
 */
export const safeJsonParse = (jsonString, defaultValue = null) => {
  if (typeof jsonString !== 'string') {
    return defaultValue;
  }

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('🔒 JSON parse error:', error.message);
    return defaultValue;
  }
};

/**
 * Generate a cryptographically secure random string
 * @param {number} length - Length of the string
 * @returns {string} Random string
 */
export const generateSecureToken = (length = 32) => {
  const array = new Uint8Array(length);

  if (window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(array);
  } else {
    // Fallback for older browsers
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Validate URL to prevent malicious redirects
 * @param {string} url - URL to validate
 * @param {Array} allowedDomains - List of allowed domains
 * @returns {boolean} True if URL is safe
 */
export const isValidUrl = (url, allowedDomains = []) => {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);

    // Check for dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    if (dangerousProtocols.includes(urlObj.protocol)) {
      return false;
    }

    // Check allowed domains if specified
    if (allowedDomains.length > 0) {
      const isAllowed = allowedDomains.some(domain =>
        urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
      );
      return isAllowed;
    }

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Security headers for API requests
 * @param {Object} existingHeaders - Existing request headers
 * @returns {Object} Headers with security additions
 */
export const addSecurityHeaders = (existingHeaders = {}) => {
  const csrfToken = generateSecureToken(16);

  return {
    ...existingHeaders,
    'X-Requested-With': 'XMLHttpRequest',
    'X-CSRF-Token': csrfToken,
    'Content-Security-Policy': "default-src 'self'",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  };
};

/**
 * Validate and sanitize user profile data
 * @param {Object} profileData - Raw profile data
 * @returns {Object} Sanitized profile data
 */
export const sanitizeProfileData = (profileData) => {
  if (!profileData || typeof profileData !== 'object') {
    return {};
  }

  const sanitized = {};

  // Safe fields with basic sanitization
  if (profileData.name) {
    sanitized.name = sanitizeInput(profileData.name).substring(0, 100);
  }

  if (profileData.email && isValidEmail(profileData.email)) {
    sanitized.email = profileData.email.toLowerCase().trim();
  }

  // Numeric fields
  ['level', 'savedAmount', 'monthlyGoal'].forEach(field => {
    if (typeof profileData[field] === 'number' && !isNaN(profileData[field])) {
      sanitized[field] = Math.max(0, profileData[field]);
    }
  });

  // Boolean fields
  ['isPremium', 'darkMode'].forEach(field => {
    if (typeof profileData[field] === 'boolean') {
      sanitized[field] = profileData[field];
    }
  });

  return sanitized;
};

// Development mode security warnings
if (process.env.NODE_ENV === 'development') {
  console.info('🔒 Security utilities loaded');

  // Check if DOMPurify is properly loaded
  if (!window.DOMPurify && !DOMPurify.isSupported) {
    console.warn('⚠️ DOMPurify may not be properly loaded');
  }
}