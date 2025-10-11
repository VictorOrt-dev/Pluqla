/**
 * Transport Optimization Validation Middleware
 *
 * Validates transport optimization requests with security checks
 *
 * Security considerations:
 * - Distance validation (0-1000km)
 * - String length limits for origin/destination
 * - Mode whitelist validation
 * - Input sanitization to prevent injection
 */

const { body, param, query } = require('express-validator');
const { processValidationResults, sanitizeInputs, customValidators } = require('./validationUtils');
const { TRANSPORT_MODES } = require('../../services/transportCostCalculator');

// Valid transport mode keys
const VALID_MODES = Object.keys(TRANSPORT_MODES);

/**
 * Validation for creating transport optimization job
 */
const validateTransportOptimizationCreate = [
  sanitizeInputs,

  // Origin validation
  body('origin')
    .exists().withMessage('Origin is required')
    .isString().withMessage('Origin must be a string')
    .trim()
    .isLength({ min: 1, max: 200 }).withMessage('Origin must be between 1 and 200 characters')
    .notEmpty().withMessage('Origin cannot be empty'),

  // Destination validation
  body('destination')
    .exists().withMessage('Destination is required')
    .isString().withMessage('Destination must be a string')
    .trim()
    .isLength({ min: 1, max: 200 }).withMessage('Destination must be between 1 and 200 characters')
    .notEmpty().withMessage('Destination cannot be empty'),

  // Distance validation
  body('distance')
    .exists().withMessage('Distance is required')
    .isFloat({ min: 0.1, max: 1000 }).withMessage('Distance must be between 0.1 and 1000 km')
    .toFloat(),

  // Modes validation (optional, array of valid mode keys)
  body('modes')
    .optional()
    .isArray().withMessage('Modes must be an array')
    .custom((value) => {
      if (!Array.isArray(value)) {
        throw new Error('Modes must be an array');
      }

      // Check array length
      if (value.length > 13) {
        throw new Error('Modes array cannot exceed 13 items');
      }

      // Validate each mode
      for (const mode of value) {
        if (!VALID_MODES.includes(mode)) {
          throw new Error(`Invalid transport mode: ${mode}. Valid modes: ${VALID_MODES.join(', ')}`);
        }
      }

      return true;
    }),

  // Recurring validation (optional)
  body('recurring')
    .optional()
    .isBoolean().withMessage('Recurring must be a boolean')
    .toBoolean(),

  // Parking needed validation (optional, default true)
  body('parkingNeeded')
    .optional()
    .isBoolean().withMessage('parkingNeeded must be a boolean')
    .toBoolean(),

  // Toll roads validation (optional, default false)
  body('tollRoads')
    .optional()
    .isBoolean().withMessage('tollRoads must be a boolean')
    .toBoolean(),

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
 * Validation for getting transport optimization status
 */
const validateTransportOptimizationStatus = [
  sanitizeInputs,
  param('jobId')
    .exists().withMessage('Job ID is required')
    .custom(customValidators.isSecureUUID),
  processValidationResults
];

/**
 * Validation for getting transport optimization history
 */
const validateTransportOptimizationHistory = [
  sanitizeInputs,

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),

  query('offset')
    .optional()
    .isInt({ min: 0 }).withMessage('Offset must be a positive integer')
    .toInt(),

  query('status')
    .optional()
    .isIn(['pending', 'processing', 'completed', 'failed']).withMessage('Invalid status'),

  processValidationResults
];

module.exports = {
  validateTransportOptimizationCreate,
  validateTransportOptimizationStatus,
  validateTransportOptimizationHistory
};
