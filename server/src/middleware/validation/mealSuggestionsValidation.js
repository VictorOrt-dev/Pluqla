/**
 * Meal Suggestions Validation Middleware
 *
 * Validates meal suggestion requests with security checks
 *
 * Security considerations:
 * - Budget validation (0-200 EUR)
 * - Servings validation (1-20)
 * - Cooking time validation (5-300 minutes)
 * - Array length limits for restrictions and ingredients
 * - String length limits for all text fields
 * - Input sanitization to prevent injection
 */

const { body, param, query } = require('express-validator');
const { processValidationResults, sanitizeInputs, customValidators } = require('./validationUtils');

// Valid meal types
const VALID_MEAL_TYPES = [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'dessert',
  'appetizer',
  'brunch',
  'any'
];

// Valid dietary restrictions
const VALID_DIETARY_RESTRICTIONS = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'dairy-free',
  'nut-free',
  'low-carb',
  'keto',
  'paleo',
  'halal',
  'kosher',
  'pescatarian',
  'low-sodium',
  'diabetic-friendly'
];

// Valid cuisine types
const VALID_CUISINE_TYPES = [
  'italian',
  'french',
  'chinese',
  'japanese',
  'indian',
  'mexican',
  'thai',
  'greek',
  'spanish',
  'mediterranean',
  'middle-eastern',
  'american',
  'korean',
  'vietnamese',
  'international',
  'fusion'
];

// Valid skill levels
const VALID_SKILL_LEVELS = ['beginner', 'easy', 'intermediate', 'advanced', 'expert'];

/**
 * Validation for creating meal suggestion job
 */
const validateMealSuggestionCreate = [
  sanitizeInputs,

  // Meal type validation (optional)
  body('mealType')
    .optional()
    .isString().withMessage('Meal type must be a string')
    .trim()
    .toLowerCase()
    .isIn(VALID_MEAL_TYPES).withMessage(`Invalid meal type. Valid types: ${VALID_MEAL_TYPES.join(', ')}`),

  // Dietary restrictions validation (optional, array)
  body('dietaryRestrictions')
    .optional()
    .isArray().withMessage('Dietary restrictions must be an array')
    .custom((value) => {
      if (!Array.isArray(value)) {
        throw new Error('Dietary restrictions must be an array');
      }

      // Check array length
      if (value.length > 10) {
        throw new Error('Cannot specify more than 10 dietary restrictions');
      }

      // Validate each restriction
      for (const restriction of value) {
        if (typeof restriction !== 'string') {
          throw new Error('Each dietary restriction must be a string');
        }

        const normalized = restriction.toLowerCase().trim();
        if (!VALID_DIETARY_RESTRICTIONS.includes(normalized)) {
          throw new Error(`Invalid dietary restriction: ${restriction}. Valid restrictions: ${VALID_DIETARY_RESTRICTIONS.join(', ')}`);
        }
      }

      return true;
    }),

  // Budget validation (optional)
  body('budget')
    .optional()
    .isFloat({ min: 0, max: 200 }).withMessage('Budget must be between 0 and 200 EUR')
    .toFloat(),

  // Servings validation (optional)
  body('servings')
    .optional()
    .isInt({ min: 1, max: 20 }).withMessage('Servings must be between 1 and 20')
    .toInt(),

  // Cuisine type validation (optional)
  body('cuisineType')
    .optional()
    .isString().withMessage('Cuisine type must be a string')
    .trim()
    .toLowerCase()
    .isIn(VALID_CUISINE_TYPES).withMessage(`Invalid cuisine type. Valid types: ${VALID_CUISINE_TYPES.join(', ')}`),

  // Max cooking time validation (optional)
  body('maxCookingTime')
    .optional()
    .isInt({ min: 5, max: 300 }).withMessage('Max cooking time must be between 5 and 300 minutes')
    .toInt(),

  // Skill level validation (optional)
  body('skillLevel')
    .optional()
    .isString().withMessage('Skill level must be a string')
    .trim()
    .toLowerCase()
    .isIn(VALID_SKILL_LEVELS).withMessage(`Invalid skill level. Valid levels: ${VALID_SKILL_LEVELS.join(', ')}`),

  // Ingredients to avoid validation (optional, array)
  body('avoidIngredients')
    .optional()
    .isArray().withMessage('Avoid ingredients must be an array')
    .custom((value) => {
      if (!Array.isArray(value)) {
        throw new Error('Avoid ingredients must be an array');
      }

      // Check array length
      if (value.length > 20) {
        throw new Error('Cannot specify more than 20 ingredients to avoid');
      }

      // Validate each ingredient
      for (const ingredient of value) {
        if (typeof ingredient !== 'string') {
          throw new Error('Each ingredient must be a string');
        }

        if (ingredient.trim().length > 50) {
          throw new Error('Each ingredient name must be 50 characters or less');
        }
      }

      return true;
    }),

  // Preferred ingredients validation (optional, array)
  body('preferredIngredients')
    .optional()
    .isArray().withMessage('Preferred ingredients must be an array')
    .custom((value) => {
      if (!Array.isArray(value)) {
        throw new Error('Preferred ingredients must be an array');
      }

      // Check array length
      if (value.length > 20) {
        throw new Error('Cannot specify more than 20 preferred ingredients');
      }

      // Validate each ingredient
      for (const ingredient of value) {
        if (typeof ingredient !== 'string') {
          throw new Error('Each ingredient must be a string');
        }

        if (ingredient.trim().length > 50) {
          throw new Error('Each ingredient name must be 50 characters or less');
        }
      }

      return true;
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
 * Validation for getting meal suggestion status
 */
const validateMealSuggestionStatus = [
  sanitizeInputs,
  param('jobId')
    .exists().withMessage('Job ID is required')
    .custom(customValidators.isSecureUUID),
  processValidationResults
];

/**
 * Validation for getting meal suggestion history
 */
const validateMealSuggestionHistory = [
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

  query('mealType')
    .optional()
    .isString().withMessage('Meal type must be a string')
    .trim()
    .toLowerCase()
    .isIn(VALID_MEAL_TYPES).withMessage(`Invalid meal type. Valid types: ${VALID_MEAL_TYPES.join(', ')}`),

  processValidationResults
];

module.exports = {
  validateMealSuggestionCreate,
  validateMealSuggestionStatus,
  validateMealSuggestionHistory,
  VALID_MEAL_TYPES,
  VALID_DIETARY_RESTRICTIONS,
  VALID_CUISINE_TYPES,
  VALID_SKILL_LEVELS
};
