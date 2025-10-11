/**
 * Input Sanitization Utilities
 * XSS Protection for user-generated content
 * Uses DOMPurify for comprehensive sanitization
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize text content (strip all HTML)
 * Use for displaying user input like transaction descriptions, names, etc.
 */
export const sanitizeText = (text) => {
  if (!text) return '';
  if (typeof text !== 'string') return String(text);

  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [], // Strip all HTML tags
    KEEP_CONTENT: true, // Keep text content
  });
};

/**
 * Sanitize HTML content (allow safe tags only)
 * Use for rich text content where some formatting is allowed
 */
export const sanitizeHTML = (html) => {
  if (!html) return '';
  if (typeof html !== 'string') return String(html);

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'title', 'target'],
    ALLOW_DATA_ATTR: false,
  });
};

/**
 * Sanitize URL
 * Prevents javascript: and data: URLs
 */
export const sanitizeURL = (url) => {
  if (!url) return '';
  if (typeof url !== 'string') return '';

  // Block dangerous protocols
  const dangerous = /^(javascript|data|vbscript):/i;
  if (dangerous.test(url.trim())) {
    return '';
  }

  return DOMPurify.sanitize(url, {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: false,
  });
};

/**
 * Sanitize number input
 * Ensures valid number, prevents NaN and Infinity
 */
export const sanitizeNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined) return defaultValue;

  const num = Number(value);

  if (isNaN(num) || !isFinite(num)) {
    return defaultValue;
  }

  return num;
};

/**
 * Sanitize object for API responses
 * Recursively sanitizes all string values
 */
export const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Validate and sanitize email
 */
export const sanitizeEmail = (email) => {
  if (!email || typeof email !== 'string') return '';

  const sanitized = email.trim().toLowerCase();

  // Basic email regex (not comprehensive, but catches common XSS attempts)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(sanitized)) {
    return '';
  }

  return DOMPurify.sanitize(sanitized, {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true,
  });
};

/**
 * Sanitize file name
 * Removes path traversal attempts and dangerous characters
 */
export const sanitizeFileName = (filename) => {
  if (!filename || typeof filename !== 'string') return '';

  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, '');

  // Remove dangerous characters
  sanitized = sanitized.replace(/[<>:"|?*\\/]/g, '');

  // Limit length
  sanitized = sanitized.substring(0, 255);

  return DOMPurify.sanitize(sanitized, {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true,
  });
};

export default {
  sanitizeText,
  sanitizeHTML,
  sanitizeURL,
  sanitizeNumber,
  sanitizeObject,
  sanitizeEmail,
  sanitizeFileName,
};
