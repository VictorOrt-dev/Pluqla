/**
 * Photo Match Validation Middleware
 *
 * Validates photo match requests with security checks
 *
 * Security considerations:
 * - Image size and format validation
 * - Base64 validation to prevent injection
 * - URL whitelist validation
 * - Metadata sanitization
 */

const { body, param, query } = require('express-validator');
const { processValidationResults, sanitizeInputs, customValidators } = require('./validationUtils');

/**
 * Validation for creating photo match job
 */
const validatePhotoMatchCreate = [
  sanitizeInputs,

  // Image validation (base64 or URL)
  body('image')
    .exists().withMessage('Image is required')
    .isString().withMessage('Image must be a string')
    .custom((value) => {
      // Base64 validation
      if (value.startsWith('data:image')) {
        const base64Regex = /^data:image\/(jpeg|png|webp|heic);base64,([A-Za-z0-9+/=]+)$/;
        if (!base64Regex.test(value)) {
          throw new Error('Invalid base64 image format');
        }

        // Check base64 size (max 10MB)
        const base64Data = value.split(',')[1];
        const sizeInBytes = (base64Data.length * 3) / 4;
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB

        if (sizeInBytes > MAX_SIZE) {
          throw new Error(`Image size exceeds maximum ${MAX_SIZE} bytes`);
        }

        return true;
      }

      // URL validation
      if (value.startsWith('http://') || value.startsWith('https://')) {
        try {
          const url = new URL(value);

          // Whitelist allowed domains
          const allowedDomains = [
            's3.amazonaws.com',
            'storage.googleapis.com',
            'cloudinary.com',
            'cloudfront.net'
            // Add your CDN domains
          ];

          const isAllowed = allowedDomains.some(domain => url.hostname.includes(domain));
          if (!isAllowed) {
            throw new Error('Image URL domain not allowed');
          }

          return true;
        } catch (error) {
          throw new Error(`Invalid image URL: ${error.message}`);
        }
      }

      throw new Error('Image must be base64 or valid URL');
    }),

  // Optional metadata validation
  body('metadata')
    .optional()
    .isObject().withMessage('Metadata must be an object')
    .custom((value) => {
      // Validate metadata size (max 1KB)
      const metadataSize = JSON.stringify(value).length;
      const MAX_METADATA_SIZE = 1024; // 1KB

      if (metadataSize > MAX_METADATA_SIZE) {
        throw new Error(`Metadata size exceeds maximum ${MAX_METADATA_SIZE} bytes`);
      }

      // Sanitize metadata keys and values
      const allowedKeys = ['priority', 'tags', 'source', 'category'];
      const keys = Object.keys(value);

      for (const key of keys) {
        if (!allowedKeys.includes(key)) {
          throw new Error(`Invalid metadata key: ${key}`);
        }

        // Validate priority
        if (key === 'priority' && (typeof value[key] !== 'number' || value[key] < 1 || value[key] > 10)) {
          throw new Error('Priority must be a number between 1 and 10');
        }

        // Validate tags
        if (key === 'tags' && !Array.isArray(value[key])) {
          throw new Error('Tags must be an array');
        }

        // Validate string fields
        if ((key === 'source' || key === 'category') && typeof value[key] !== 'string') {
          throw new Error(`${key} must be a string`);
        }
      }

      return true;
    }),

  processValidationResults
];

/**
 * Validation for getting photo match status
 */
const validatePhotoMatchStatus = [
  sanitizeInputs,
  param('jobId')
    .exists().withMessage('Job ID is required')
    .custom(customValidators.isSecureUUID),
  processValidationResults
];

/**
 * Validation for getting photo match history
 */
const validatePhotoMatchHistory = [
  sanitizeInputs,

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

  query('offset')
    .optional()
    .isInt({ min: 0 }).withMessage('Offset must be a positive integer'),

  query('status')
    .optional()
    .isIn(['pending', 'processing', 'completed', 'failed']).withMessage('Invalid status'),

  processValidationResults
];

module.exports = {
  validatePhotoMatchCreate,
  validatePhotoMatchStatus,
  validatePhotoMatchHistory
};
