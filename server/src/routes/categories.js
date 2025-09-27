const express = require('express');
const { param, query, body } = require('express-validator');
const categoryController = require('../controllers/categoryController');
const { handleValidationErrors } = require('../middleware/validateInput');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Validation schemas
const categoryParamValidation = [
  param('category')
    .isIn(['alimentation', 'habits', 'activite', 'deplacement'])
    .withMessage('Catégorie invalide'),
];

const preferencesValidation = [
  body('preferences')
    .isObject()
    .withMessage('Préférences doivent être un objet'),
  body('preferences.budget')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget invalide'),
  body('preferences.priority')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Priorité entre 1 et 5'),
];

const budgetValidation = [
  body('monthlyBudget')
    .isFloat({ min: 0.01 })
    .withMessage('Budget mensuel doit être positif'),
  body('alertThreshold')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Seuil d\'alerte entre 0 et 1'),
];

// Routes pour obtenir les informations des catégories
router.get('/',
  categoryController.getAllCategories
);

router.get('/:category',
  categoryParamValidation,
  handleValidationErrors,
  categoryController.getCategoryDetails
);

router.get('/:category/stats',
  categoryParamValidation,
  query('period').optional().isIn(['week', 'month', 'quarter', 'year']),
  handleValidationErrors,
  categoryController.getCategoryStats
);

// Routes pour l'alimentation
router.get('/alimentation/recipes',
  query('diet').optional().isIn(['vegetarian', 'vegan', 'gluten_free', 'keto', 'mediterranean']),
  query('budget').optional().isIn(['low', 'medium', 'high']),
  query('difficulty').optional().isIn(['easy', 'medium', 'hard']),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  handleValidationErrors,
  categoryController.getRecipes
);

router.get('/alimentation/stores',
  query('location').optional().isString(),
  query('type').optional().isIn(['supermarket', 'organic', 'discount', 'local']),
  handleValidationErrors,
  categoryController.getNearbyStores
);

router.post('/alimentation/meal-plan',
  rateLimit.standard,
  body('duration').isIn(['week', 'month']),
  body('budget').optional().isFloat({ min: 0 }),
  body('preferences').optional().isArray(),
  handleValidationErrors,
  categoryController.generateMealPlan
);

// Routes pour les habitudes
router.get('/habits/recommendations',
  query('type').optional().isIn(['eco', 'health', 'productivity', 'financial']),
  query('difficulty').optional().isIn(['easy', 'medium', 'hard']),
  handleValidationErrors,
  categoryController.getHabitRecommendations
);

router.post('/habits/track',
  rateLimit.standard,
  body('habitId').isUUID(),
  body('completed').isBoolean(),
  body('notes').optional().isString(),
  handleValidationErrors,
  categoryController.trackHabit
);

router.get('/habits/streaks',
  categoryController.getHabitStreaks
);

// Routes pour les activités
router.get('/activite/suggestions',
  query('type').optional().isIn(['indoor', 'outdoor', 'cultural', 'sport', 'social']),
  query('budget').optional().isIn(['free', 'low', 'medium', 'high']),
  query('duration').optional().isIn(['short', 'medium', 'long']),
  query('location').optional().isString(),
  handleValidationErrors,
  categoryController.getActivitySuggestions
);

router.get('/activite/events',
  query('location').optional().isString(),
  query('date').optional().isISO8601(),
  query('category').optional().isString(),
  handleValidationErrors,
  categoryController.getNearbyEvents
);

router.post('/activite/bookmark',
  rateLimit.standard,
  body('activityId').isUUID(),
  body('bookmarked').isBoolean(),
  handleValidationErrors,
  categoryController.bookmarkActivity
);

// Routes pour les déplacements
router.get('/deplacement/routes',
  query('origin').isString(),
  query('destination').isString(),
  query('mode').optional().isIn(['walking', 'cycling', 'public_transport', 'car', 'mixed']),
  query('optimize').optional().isIn(['time', 'cost', 'eco', 'comfort']),
  handleValidationErrors,
  categoryController.getRouteOptions
);

router.post('/deplacement/calculate',
  rateLimit.standard,
  body('origin').isString(),
  body('destination').isString(),
  body('transportModes').isArray(),
  handleValidationErrors,
  categoryController.calculateTransportCosts
);

router.get('/deplacement/subscriptions',
  query('location').optional().isString(),
  handleValidationErrors,
  categoryController.getTransportSubscriptions
);

// Routes pour la configuration des catégories
router.get('/:category/preferences',
  categoryParamValidation,
  handleValidationErrors,
  categoryController.getCategoryPreferences
);

router.put('/:category/preferences',
  rateLimit.standard,
  categoryParamValidation,
  preferencesValidation,
  handleValidationErrors,
  categoryController.updateCategoryPreferences
);

router.put('/:category/budget',
  rateLimit.standard,
  categoryParamValidation,
  budgetValidation,
  handleValidationErrors,
  categoryController.setCategoryBudget
);

router.get('/:category/budget/status',
  categoryParamValidation,
  handleValidationErrors,
  categoryController.getBudgetStatus
);

// Routes pour les objectifs par catégorie
router.post('/:category/goals',
  rateLimit.standard,
  categoryParamValidation,
  body('title').trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('targetValue').isFloat({ min: 0.01 }),
  body('targetDate').isISO8601(),
  body('unit').isIn(['euros', 'percent', 'count']),
  handleValidationErrors,
  categoryController.createCategoryGoal
);

router.get('/:category/goals',
  categoryParamValidation,
  handleValidationErrors,
  categoryController.getCategoryGoals
);

router.put('/:category/goals/:goalId',
  rateLimit.standard,
  categoryParamValidation,
  param('goalId').isUUID(),
  handleValidationErrors,
  categoryController.updateCategoryGoal
);

// Routes pour les rapports par catégorie
router.get('/:category/report',
  categoryParamValidation,
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('format').optional().isIn(['json', 'pdf']),
  handleValidationErrors,
  categoryController.generateCategoryReport
);

// Routes pour les comparaisons entre catégories
router.get('/compare/spending',
  query('categories').optional().isString(),
  query('period').optional().isIn(['week', 'month', 'quarter', 'year']),
  handleValidationErrors,
  categoryController.compareCategories
);

router.get('/compare/savings-potential',
  categoryController.compareSavingsPotential
);

module.exports = router;