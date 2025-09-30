/**
 * ⚡ STRIKES (STREAK) VALIDATION SCHEMAS
 *
 * Validation for streak/gamification endpoints in the Pluqla financial backend.
 * Protects streak integrity, prevents manipulation, and ensures fair gamification.
 *
 * Endpoints covered:
 * - GET /api/strikes/current
 * - GET /api/strikes/stats
 * - POST /api/strikes/check-reset
 */

const { body, query, param } = require('express-validator');
const { customValidators, processValidationResults, sanitizeInputs } = require('./validationUtils');

/**
 * Current Strike Query Validation
 * GET /api/strikes/current
 *
 * Security considerations:
 * - Validates optional filters
 * - Prevents data manipulation
 * - Ensures read-only access
 */
const validateCurrentStrike = [
  sanitizeInputs,

  // Optional date filter for specific date
  query('date')
    .optional()
    .custom(customValidators.isSecureDate),

  // Include additional metadata
  query('includeMetadata')
    .optional()
    .isBoolean()
    .withMessage('Include metadata must be true or false'),

  // Force refresh from database
  query('forceRefresh')
    .optional()
    .isBoolean()
    .withMessage('Force refresh must be true or false'),

  processValidationResults
];

/**
 * Strike Statistics Query Validation
 * GET /api/strikes/stats
 *
 * Security considerations:
 * - Validates date range parameters
 * - Limits query complexity
 * - Prevents performance abuse
 */
const validateStrikeStats = [
  sanitizeInputs,

  // Date range validation
  query('startDate')
    .optional()
    .custom(customValidators.isSecureDate),

  query('endDate')
    .optional()
    .custom(customValidators.isSecureDate)
    .custom((value, { req }) => {
      if (value && req.query.startDate) {
        const startDate = new Date(req.query.startDate);
        const endDate = new Date(value);

        if (endDate <= startDate) {
          throw new Error('End date must be after start date');
        }

        // Limit range to prevent performance issues (max 1 year)
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 365) {
          throw new Error('Date range cannot exceed 1 year');
        }
      }
      return true;
    }),

  // Statistics granularity
  query('granularity')
    .optional()
    .isIn(['daily', 'weekly', 'monthly'])
    .withMessage('Granularity must be: daily, weekly, or monthly'),

  // Include historical data
  query('includeHistory')
    .optional()
    .isBoolean()
    .withMessage('Include history must be true or false'),

  // Include encouragement messages
  query('includeMessages')
    .optional()
    .isBoolean()
    .withMessage('Include messages must be true or false'),

  processValidationResults
];

/**
 * Check and Reset Strike Validation
 * POST /api/strikes/check-reset
 *
 * Security considerations:
 * - Validates reset parameters
 * - Prevents unauthorized resets
 * - Ensures data integrity
 */
const validateCheckReset = [
  sanitizeInputs,

  // Force reset flag (optional)
  body('forceReset')
    .optional()
    .isBoolean()
    .withMessage('Force reset must be true or false'),

  // Reference date for reset calculation
  body('referenceDate')
    .optional()
    .custom(customValidators.isSecureDate)
    .custom((value) => {
      if (value) {
        const refDate = new Date(value);
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Don't allow reference dates too far in the past or future
        if (refDate < oneWeekAgo || refDate > now) {
          throw new Error('Reference date must be within the last week');
        }
      }
      return true;
    }),

  // Client timezone for accurate date calculation
  body('timezone')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Timezone identifier too long')
    .matches(/^[A-Za-z_\/]{1,50}$/)
    .withMessage('Invalid timezone format')
    .custom(customValidators.isSafe),

  // Include detailed response
  body('includeDetails')
    .optional()
    .isBoolean()
    .withMessage('Include details must be true or false'),

  processValidationResults
];

module.exports = {
  validateCurrentStrike,
  validateStrikeStats,
  validateCheckReset
};
