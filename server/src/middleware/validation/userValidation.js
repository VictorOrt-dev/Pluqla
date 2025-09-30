/**
 * 👤 USER PROFILE VALIDATION SCHEMAS
 *
 * Validation for user profile management endpoints in the Pluqla financial backend.
 * Protects user data integrity and prevents malicious profile manipulation.
 *
 * Endpoints covered:
 * - GET /api/users/profile
 * - PUT /api/users/profile
 * - GET /api/users/stats
 * - PUT /api/users/preferences
 * - DELETE /api/users/account
 * - GET /api/users/export-data
 */

const { body, query, param } = require('express-validator');
const { customValidators, processValidationResults, sanitizeInputs } = require('./validationUtils');

/**
 * Profile Update Validation
 *
 * Security considerations:
 * - Sanitizes all text inputs
 * - Validates email changes carefully
 * - Prevents profile pollution attacks
 * - Maintains data consistency
 */
const validateProfileUpdate = [
  sanitizeInputs,

  // Name validation (optional update)
  body('name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]{1,100}$/)
    .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes')
    .custom(customValidators.isSafe),

  // Email validation (requires re-verification)
  body('email')
    .optional()
    .isLength({ max: 254 })
    .withMessage('Email must not exceed 254 characters')
    .custom(customValidators.isSecureEmail)
    .normalizeEmail(),

  // Phone number validation (optional)
  body('phone')
    .optional()
    .isMobilePhone(['fr-FR', 'en-US', 'es-ES'])
    .withMessage('Phone number must be valid')
    .isLength({ max: 20 })
    .withMessage('Phone number too long'),

  // Date of birth validation
  body('dateOfBirth')
    .optional()
    .custom((value) => {
      if (!value) return true;

      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Date of birth must be a valid date');
      }

      // Must be at least 13 years old (COPPA compliance)
      const minAge = new Date();
      minAge.setFullYear(minAge.getFullYear() - 13);

      // Must not be more than 120 years old (reasonable limit)
      const maxAge = new Date();
      maxAge.setFullYear(maxAge.getFullYear() - 120);

      if (date > minAge) {
        throw new Error('Must be at least 13 years old');
      }

      if (date < maxAge) {
        throw new Error('Date of birth seems unrealistic');
      }

      return true;
    }),

  // Language preference
  body('language')
    .optional()
    .isIn(['fr', 'en', 'es'])
    .withMessage('Language must be one of: fr, en, es'),

  // Currency preference
  body('currency')
    .optional()
    .isIn(['EUR', 'USD', 'GBP'])
    .withMessage('Currency must be one of: EUR, USD, GBP'),

  // Timezone
  body('timezone')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Timezone identifier too long')
    .matches(/^[A-Za-z_\/]{1,50}$/)
    .withMessage('Invalid timezone format'),

  // Avatar URL (if provided)
  body('avatar')
    .optional()
    .isURL({ require_protocol: true, protocols: ['https'] })
    .withMessage('Avatar must be a valid HTTPS URL')
    .isLength({ max: 500 })
    .withMessage('Avatar URL too long'),

  processValidationResults
];

/**
 * User Preferences Validation
 *
 * Security considerations:
 * - Validates preference structure
 * - Prevents preference injection
 * - Ensures valid notification settings
 */
const validatePreferencesUpdate = [
  sanitizeInputs,

  // Notification preferences
  body('notifications')
    .optional()
    .isObject()
    .withMessage('Notifications must be an object'),

  body('notifications.email')
    .optional()
    .isBoolean()
    .withMessage('Email notifications must be true or false'),

  body('notifications.push')
    .optional()
    .isBoolean()
    .withMessage('Push notifications must be true or false'),

  body('notifications.sms')
    .optional()
    .isBoolean()
    .withMessage('SMS notifications must be true or false'),

  // Privacy preferences
  body('privacy')
    .optional()
    .isObject()
    .withMessage('Privacy settings must be an object'),

  body('privacy.shareData')
    .optional()
    .isBoolean()
    .withMessage('Share data preference must be true or false'),

  body('privacy.analytics')
    .optional()
    .isBoolean()
    .withMessage('Analytics preference must be true or false'),

  // Dashboard preferences
  body('dashboard')
    .optional()
    .isObject()
    .withMessage('Dashboard preferences must be an object'),

  body('dashboard.defaultView')
    .optional()
    .isIn(['overview', 'transactions', 'categories', 'goals'])
    .withMessage('Default view must be one of: overview, transactions, categories, goals'),

  body('dashboard.showTips')
    .optional()
    .isBoolean()
    .withMessage('Show tips preference must be true or false'),

  // AI preferences
  body('ai')
    .optional()
    .isObject()
    .withMessage('AI preferences must be an object'),

  body('ai.enableSuggestions')
    .optional()
    .isBoolean()
    .withMessage('AI suggestions preference must be true or false'),

  body('ai.personalizedContent')
    .optional()
    .isBoolean()
    .withMessage('Personalized content preference must be true or false'),

  processValidationResults
];

/**
 * User Stats Query Validation
 *
 * Security considerations:
 * - Validates date ranges to prevent abuse
 * - Limits query complexity
 * - Prevents information disclosure
 */
const validateStatsQuery = [
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

        // Limit range to prevent abuse (max 2 years)
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 730) {
          throw new Error('Date range cannot exceed 2 years');
        }
      }
      return true;
    }),

  // Category filter
  query('category')
    .optional()
    .isIn(['alimentation', 'habits', 'activite', 'deplacement', 'autres', 'all'])
    .withMessage('Category must be one of: alimentation, habits, activite, deplacement, autres, all'),

  // Metrics to include
  query('metrics')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        const metrics = value.split(',');
        const validMetrics = ['total', 'average', 'count', 'trend', 'categories', 'monthly'];

        for (const metric of metrics) {
          if (!validMetrics.includes(metric.trim())) {
            throw new Error(`Invalid metric: ${metric}. Valid metrics: ${validMetrics.join(', ')}`);
          }
        }

        // Limit number of metrics to prevent abuse
        if (metrics.length > 6) {
          throw new Error('Too many metrics requested (max 6)');
        }
      }
      return true;
    }),

  processValidationResults
];

/**
 * Account Deletion Validation
 *
 * Security considerations:
 * - Requires password confirmation
 * - Validates deletion request authenticity
 * - Prevents accidental account deletion
 */
const validateAccountDeletion = [
  sanitizeInputs,

  // Password confirmation for account deletion
  body('password')
    .notEmpty()
    .withMessage('Password confirmation is required for account deletion')
    .isLength({ min: 1, max: 128 })
    .withMessage('Password must not exceed 128 characters')
    .custom(customValidators.isSafe),

  // Deletion confirmation
  body('confirmDeletion')
    .notEmpty()
    .withMessage('Deletion confirmation is required')
    .equals('DELETE_MY_ACCOUNT')
    .withMessage('Please type DELETE_MY_ACCOUNT to confirm account deletion'),

  // Reason for deletion (optional, for analytics)
  body('reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters')
    .custom(customValidators.isSafe),

  processValidationResults
];

/**
 * Data Export Validation
 *
 * Security considerations:
 * - Validates export format
 * - Limits data scope
 * - Ensures GDPR compliance
 */
const validateDataExport = [
  sanitizeInputs,

  // Export format
  query('format')
    .optional()
    .isIn(['json', 'csv'])
    .withMessage('Export format must be json or csv'),

  // Data types to export
  query('dataTypes')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        const types = value.split(',');
        const validTypes = ['profile', 'transactions', 'preferences', 'stats'];

        for (const type of types) {
          if (!validTypes.includes(type.trim())) {
            throw new Error(`Invalid data type: ${type}. Valid types: ${validTypes.join(', ')}`);
          }
        }

        if (types.length > 4) {
          throw new Error('Too many data types requested');
        }
      }
      return true;
    }),

  // Date range for transaction data
  query('startDate')
    .optional()
    .custom(customValidators.isSecureDate),

  query('endDate')
    .optional()
    .custom(customValidators.isSecureDate),

  processValidationResults
];

/**
 * Profile Picture Upload Validation
 *
 * Security considerations:
 * - Validates file type and size
 * - Prevents malicious file uploads
 * - Ensures safe file processing
 */
const validateProfilePictureUpload = [
  sanitizeInputs,

  // File metadata validation
  body('filename')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Filename too long')
    .matches(/^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$/i)
    .withMessage('Filename must be valid image file (jpg, jpeg, png, webp)'),

  // File size validation (handled by multer, but validate here too)
  body('fileSize')
    .optional()
    .isInt({ min: 1, max: 5 * 1024 * 1024 }) // 5MB max
    .withMessage('File size must be between 1 byte and 5MB'),

  processValidationResults
];

/**
 * Questionnaire Submission Validation
 *
 * Security considerations:
 * - Validates questionnaire structure
 * - Prevents injection attacks
 * - Ensures data integrity
 */
const validateQuestionnaireSubmission = [
  sanitizeInputs,

  // Answers array validation
  body('answers')
    .notEmpty()
    .withMessage('Questionnaire answers are required')
    .isArray({ min: 1, max: 50 })
    .withMessage('Must provide 1-50 answers')
    .custom((answers) => {
      for (let i = 0; i < answers.length; i++) {
        const answer = answers[i];

        if (!answer || typeof answer !== 'object') {
          throw new Error(`Answer at index ${i} must be an object`);
        }

        if (!answer.questionId || typeof answer.questionId !== 'string') {
          throw new Error(`Answer at index ${i} must have a valid questionId`);
        }

        if (!answer.answer || typeof answer.answer !== 'string') {
          throw new Error(`Answer at index ${i} must have a valid answer`);
        }

        // Validate question ID format (prevent injection)
        if (!/^[a-zA-Z0-9_-]{1,50}$/.test(answer.questionId)) {
          throw new Error(`Answer at index ${i} has invalid questionId format`);
        }

        // Validate answer content
        if (answer.answer.length > 1000) {
          throw new Error(`Answer at index ${i} is too long (max 1000 characters)`);
        }

        // Security check for answer content
        try {
          customValidators.isSafe(answer.answer);
        } catch (error) {
          throw new Error(`Answer at index ${i} contains potentially harmful content`);
        }
      }
      return true;
    }),

  // Questionnaire metadata (optional)
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),

  body('metadata.completedAt')
    .optional()
    .custom(customValidators.isSecureDate),

  body('metadata.version')
    .optional()
    .isLength({ max: 10 })
    .withMessage('Version identifier too long')
    .matches(/^[0-9.]{1,10}$/)
    .withMessage('Invalid version format'),

  processValidationResults
];

module.exports = {
  validateProfileUpdate,
  validatePreferencesUpdate,
  validateStatsQuery,
  validateAccountDeletion,
  validateDataExport,
  validateProfilePictureUpload,
  validateQuestionnaireSubmission
};
