/**
 * Meal Planning Validation Middleware
 *
 * Validates input for all meal planning endpoints using express-validator
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to handle validation results
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

/**
 * Validate user meal preferences
 */
const validatePreferences = [
  body('householdSize')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Household size must be between 1 and 20'),

  body('dietaryRestrictions')
    .optional()
    .isArray()
    .withMessage('Dietary restrictions must be an array'),

  body('dietaryRestrictions.*')
    .optional()
    .isString()
    .isIn(['vegetarian', 'vegan', 'pescatarian', 'gluten-free', 'dairy-free', 'low-carb', 'keto', 'halal', 'kosher'])
    .withMessage('Invalid dietary restriction'),

  body('dislikedIngredients')
    .optional()
    .isArray()
    .withMessage('Disliked ingredients must be an array'),

  body('dislikedIngredients.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Each ingredient must be 1-100 characters'),

  body('preferredCuisines')
    .optional()
    .isArray()
    .withMessage('Preferred cuisines must be an array'),

  body('preferredCuisines.*')
    .optional()
    .isString()
    .isIn(['french', 'italian', 'asian', 'mediterranean', 'mexican', 'indian', 'american', 'japanese', 'thai', 'chinese'])
    .withMessage('Invalid cuisine type'),

  body('skillLevel')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Skill level must be beginner, intermediate, or advanced'),

  body('weeklyBudget')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Weekly budget must be between 0 and 1000 EUR'),

  body('cookingFrequency')
    .optional()
    .isIn(['daily', '3-4times', 'weekends', 'rarely'])
    .withMessage('Invalid cooking frequency'),

  body('mealTypes')
    .optional()
    .isArray()
    .withMessage('Meal types must be an array'),

  body('mealTypes.*')
    .optional()
    .isIn(['breakfast', 'lunch', 'dinner', 'snack', 'dessert'])
    .withMessage('Invalid meal type'),

  body('allergies')
    .optional()
    .isArray()
    .withMessage('Allergies must be an array'),

  body('cookingTimeLimit')
    .optional()
    .isInt({ min: 5, max: 300 })
    .withMessage('Cooking time limit must be between 5 and 300 minutes'),

  handleValidationErrors
];

/**
 * Validate weekly plan generation request
 */
const validateWeeklyPlan = [
  body('weekStartDate')
    .optional()
    .isISO8601()
    .withMessage('Week start date must be a valid ISO 8601 date'),

  body('allowDuplicate')
    .optional()
    .isBoolean()
    .withMessage('allowDuplicate must be a boolean'),

  handleValidationErrors
];

/**
 * Validate grocery item update
 */
const validateGroceryItemUpdate = [
  param('itemId')
    .isString()
    .notEmpty()
    .withMessage('Item ID is required')
    .isLength({ min: 20, max: 30 })
    .withMessage('Invalid item ID format'),

  body('isChecked')
    .optional()
    .isBoolean()
    .withMessage('isChecked must be a boolean'),

  body('actualCostEur')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Actual cost must be between 0 and 1000 EUR'),

  body('notes')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .trim()
    .escape()
    .withMessage('Notes must be less than 500 characters'),

  handleValidationErrors
];

/**
 * Validate planned meal update
 */
const validateMealUpdate = [
  param('mealId')
    .isString()
    .notEmpty()
    .withMessage('Meal ID is required')
    .isLength({ min: 20, max: 30 })
    .withMessage('Invalid meal ID format'),

  body('isCooked')
    .optional()
    .isBoolean()
    .withMessage('isCooked must be a boolean'),

  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5'),

  body('notes')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .trim()
    .escape()
    .withMessage('Notes must be less than 1000 characters'),

  handleValidationErrors
];

/**
 * Validate query parameters for getting weekly plans
 */
const validateWeeklyPlansQuery = [
  query('status')
    .optional()
    .isIn(['active', 'archived', 'draft'])
    .withMessage('Status must be active, archived, or draft'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),

  handleValidationErrors
];

/**
 * Validate meal swap request
 */
const validateMealSwap = [
  param('mealId')
    .isString()
    .notEmpty()
    .withMessage('Meal ID is required')
    .isLength({ min: 20, max: 30 })
    .withMessage('Invalid meal ID format'),

  body('preferredCuisine')
    .optional()
    .isString()
    .isIn(['italian', 'french', 'asian', 'mexican', 'mediterranean', 'american', 'indian', 'japanese', 'thai', 'chinese'])
    .withMessage('Invalid cuisine type'),

  handleValidationErrors
];

/**
 * Validate grocery list regeneration request
 */
const validateGroceryListRegeneration = [
  param('planId')
    .isString()
    .notEmpty()
    .withMessage('Plan ID is required')
    .isLength({ min: 20, max: 30 })
    .withMessage('Invalid plan ID format'),

  handleValidationErrors
];

module.exports = {
  validatePreferences,
  validateWeeklyPlan,
  validateGroceryItemUpdate,
  validateMealUpdate,
  validateWeeklyPlansQuery,
  validateMealSwap,
  validateGroceryListRegeneration
};
