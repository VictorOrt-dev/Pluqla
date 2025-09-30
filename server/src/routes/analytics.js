const express = require('express');
const { body, param, query } = require('express-validator');
const analyticsController = require('../controllers/analyticsController');
const { handleValidationErrors } = require('../middleware/validateInput');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Validation schemas
const eventValidation = [
  body('event')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Nom d\'événement entre 1 et 100 caractères'),
  body('category')
    .optional()
    .isIn(['user_action', 'app_interaction', 'ai_usage', 'transaction', 'goal'])
    .withMessage('Catégorie d\'événement invalide'),
  body('properties')
    .optional()
    .isObject()
    .withMessage('Propriétés doivent être un objet'),
  body('value')
    .optional()
    .isNumeric()
    .withMessage('Valeur doit être numérique')
];

const goalEventValidation = [
  body('goalId')
    .isUUID()
    .withMessage('ID d\'objectif invalide'),
  body('eventType')
    .isIn(['created', 'updated', 'achieved', 'missed', 'deleted'])
    .withMessage('Type d\'événement invalide'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Métadonnées doivent être un objet')
];

const dashboardFiltersValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Date de début invalide'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Date de fin invalide'),
  query('category')
    .optional()
    .isIn(['alimentation', 'habits', 'activite', 'deplacement'])
    .withMessage('Catégorie invalide')
];

// Routes pour le tracking des événements
router.post(
  '/track',
  rateLimit.analytics || rateLimit.standard,
  body('eventName').trim().isLength({ min: 1, max: 100 }),
  body('properties').optional().isObject(),
  handleValidationErrors,
  analyticsController.trackEvent
);

router.post(
  '/events',
  rateLimit.analytics,
  eventValidation,
  handleValidationErrors,
  analyticsController.trackEvent
);

router.post(
  '/events/batch',
  rateLimit.analytics,
  body('events').isArray({ min: 1, max: 50 }),
  body('events.*').custom((event) => {
    const requiredFields = ['event', 'timestamp'];
    return requiredFields.every((field) => event.hasOwnProperty(field));
  }),
  handleValidationErrors,
  analyticsController.trackBatchEvents
);

// Routes pour les métriques de gamification
router.post(
  '/gamification/points',
  rateLimit.standard,
  body('action').isIn(['suggestion_implemented', 'goal_achieved', 'streak_maintained', 'challenge_completed']),
  body('points').isInt({ min: 1, max: 1000 }),
  handleValidationErrors,
  analyticsController.awardPoints
);

router.post(
  '/gamification/badge',
  rateLimit.standard,
  body('badgeId').notEmpty(),
  body('badgeType').isIn(['savings_master', 'eco_warrior', 'goal_crusher', 'streak_keeper']),
  handleValidationErrors,
  analyticsController.awardBadge
);

router.get(
  '/gamification/leaderboard',
  query('period').optional().isIn(['week', 'month', 'all']),
  query('limit').optional().isInt({ min: 5, max: 100 }),
  handleValidationErrors,
  analyticsController.getLeaderboard
);

// Routes pour les objectifs et challenges
router.post(
  '/goals/track',
  rateLimit.standard,
  goalEventValidation,
  handleValidationErrors,
  analyticsController.trackGoalEvent
);

router.get(
  '/goals/progress',
  query('goalId').optional().isUUID(),
  handleValidationErrors,
  analyticsController.getGoalProgress
);

// Routes pour le dashboard analytics
router.get(
  '/dashboard',
  dashboardFiltersValidation,
  handleValidationErrors,
  analyticsController.getDashboard
);

router.get(
  '/dashboard/overview',
  dashboardFiltersValidation,
  handleValidationErrors,
  analyticsController.getDashboardOverview
);

router.get(
  '/dashboard/savings-trend',
  query('period').optional().isIn(['7d', '30d', '90d', '1y']),
  handleValidationErrors,
  analyticsController.getSavingsTrend
);

router.get(
  '/dashboard/category-breakdown',
  dashboardFiltersValidation,
  handleValidationErrors,
  analyticsController.getCategoryBreakdown
);

// Routes pour les métriques d'engagement
router.get(
  '/engagement',
  query('period').optional().isIn(['week', 'month', 'quarter']),
  handleValidationErrors,
  analyticsController.getEngagementMetrics
);

router.get(
  '/engagement/heatmap',
  query('year').optional().isInt({ min: 2020, max: 2030 }),
  handleValidationErrors,
  analyticsController.getEngagementHeatmap
);

// Routes pour les métriques d'usage de l'IA
router.get(
  '/ai-usage',
  dashboardFiltersValidation,
  handleValidationErrors,
  analyticsController.getAIUsageMetrics
);

router.get(
  '/ai-usage/effectiveness',
  dashboardFiltersValidation,
  handleValidationErrors,
  analyticsController.getAIEffectiveness
);

// Routes pour les rapports personnalisés
router.post(
  '/reports/custom',
  rateLimit.slow,
  body('reportType').isIn(['savings_report', 'habit_analysis', 'goal_performance', 'ai_impact']),
  body('dateRange').isObject(),
  body('filters').optional().isObject(),
  body('format').optional().isIn(['json', 'csv']),
  handleValidationErrors,
  analyticsController.generateCustomReport
);

router.get(
  '/reports/:id',
  param('id').isUUID(),
  handleValidationErrors,
  analyticsController.getReport
);

// Routes pour les insights automatiques
router.get(
  '/insights/weekly',
  analyticsController.getWeeklyInsights
);

router.get(
  '/insights/monthly',
  analyticsController.getMonthlyInsights
);

router.get(
  '/insights/trends',
  query('metric').optional().isIn(['savings', 'spending', 'goals', 'ai_usage']),
  handleValidationErrors,
  analyticsController.getTrendInsights
);

// Routes pour les comparaisons et benchmarks
router.get(
  '/benchmarks',
  query('category').optional().isIn(['alimentation', 'habits', 'activite', 'deplacement']),
  handleValidationErrors,
  analyticsController.getBenchmarks
);

router.get(
  '/comparisons/peers',
  query('anonymous').optional().isBoolean(),
  handleValidationErrors,
  analyticsController.getPeerComparison
);

// Routes pour l'export des données analytics
router.get(
  '/export',
  rateLimit.slow,
  query('format').optional().isIn(['json', 'csv']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  handleValidationErrors,
  analyticsController.exportAnalytics
);

// Routes pour les notifications analytics
router.get(
  '/notifications/alerts',
  analyticsController.getAnalyticsAlerts
);

router.post(
  '/notifications/subscribe',
  rateLimit.standard,
  body('alertType').isIn(['goal_missed', 'spending_spike', 'savings_milestone', 'unusual_activity']),
  body('threshold').optional().isNumeric(),
  handleValidationErrors,
  analyticsController.subscribeToAlert
);

module.exports = router;
