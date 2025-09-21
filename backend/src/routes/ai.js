const express = require('express');
const { body, param, query } = require('express-validator');
const aiController = require('../controllers/aiController');
const { handleValidationErrors } = require('../middleware/validateInput');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

// Route sans authentification pour les suggestions de base (mode test)
router.get('/suggestions',
  rateLimit.ai,
  query('category').isIn(['alimentation', 'habits', 'activite', 'deplacement']).withMessage('Catégorie invalide'),
  query('limit').optional().isInt({ min: 1, max: 10 }).withMessage('Limite entre 1 et 10'),
  handleValidationErrors,
  aiController.getSuggestionsPublic
);

// Toutes les autres routes nécessitent une authentification
router.use(authenticateToken);

// Validation schemas
const categoryValidation = [
  body('category')
    .isIn(['alimentation', 'habits', 'activite', 'deplacement'])
    .withMessage('Catégorie invalide'),
];

const customPromptValidation = [
  body('prompt')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Prompt entre 5 et 500 caractères'),
  body('context')
    .optional()
    .isObject()
    .withMessage('Contexte doit être un objet'),
];

const analysisValidation = [
  body('data')
    .isObject()
    .withMessage('Données requises pour l\'analyse'),
  body('analysisType')
    .isIn(['spending_pattern', 'savings_potential', 'budget_optimization', 'habit_analysis'])
    .withMessage('Type d\'analyse invalide'),
];

const feedbackValidation = [
  body('suggestionId')
    .isUUID()
    .withMessage('ID de suggestion invalide'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Note entre 1 et 5'),
  body('feedback')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Commentaire maximum 500 caractères'),
  body('implemented')
    .optional()
    .isBoolean()
    .withMessage('Statut d\'implémentation invalide'),
];

// Routes pour les suggestions IA par catégorie
router.post('/suggestions/alimentation',
  rateLimit.ai,
  body('category').equals('alimentation'),
  handleValidationErrors,
  aiController.getFoodSuggestions
);

router.post('/suggestions/habits',
  rateLimit.ai,
  body('category').equals('habits'),
  handleValidationErrors,
  aiController.getHabitSuggestions
);

router.post('/suggestions/activite',
  rateLimit.ai,
  body('category').equals('activite'),
  handleValidationErrors,
  aiController.getActivitySuggestions
);

router.post('/suggestions/deplacement',
  rateLimit.ai,
  body('category').equals('deplacement'),
  handleValidationErrors,
  aiController.getTransportSuggestions
);

// Route générique pour les suggestions (GET pour compatibilité frontend) - Authentifiée
router.get('/suggestions/auth',
  rateLimit.ai,
  query('category').isIn(['alimentation', 'habits', 'activite', 'deplacement']).withMessage('Catégorie invalide'),
  query('limit').optional().isInt({ min: 1, max: 10 }).withMessage('Limite entre 1 et 10'),
  handleValidationErrors,
  aiController.getSuggestions
);

// Route générique pour les suggestions (POST)
router.post('/suggestions',
  rateLimit.ai,
  categoryValidation,
  handleValidationErrors,
  aiController.getSuggestions
);

// Routes pour les analyses personnalisées
router.post('/analyze',
  rateLimit.ai,
  analysisValidation,
  handleValidationErrors,
  aiController.analyzeUserData
);

router.post('/analyze/spending',
  rateLimit.ai,
  aiController.analyzeSpendingPattern
);

router.post('/analyze/savings',
  rateLimit.ai,
  aiController.analyzeSavingsPotential
);

// Routes pour l'analyse d'images
router.post('/analyze/image',
  rateLimit.ai,
  body('imageUrl').optional().isURL(),
  body('imageBase64').optional().isBase64(),
  body('analysisType').isIn(['clothing', 'receipt', 'food']),
  handleValidationErrors,
  aiController.analyzeImage
);

// Routes pour les recommandations personnalisées
router.get('/recommendations',
  query('category').optional().isIn(['alimentation', 'habits', 'activite', 'deplacement']),
  query('limit').optional().isInt({ min: 1, max: 10 }),
  handleValidationErrors,
  aiController.getPersonalizedRecommendations
);

router.get('/recommendations/daily',
  aiController.getDailyRecommendations
);

// Routes pour les insights et tendances
router.get('/insights',
  query('period').optional().isIn(['week', 'month', 'quarter', 'year']),
  handleValidationErrors,
  aiController.getUserInsights
);

router.get('/trends',
  query('category').optional().isIn(['alimentation', 'habits', 'activite', 'deplacement']),
  handleValidationErrors,
  aiController.getSpendingTrends
);

// Routes pour les prédictions
router.get('/predictions/savings',
  query('months').optional().isInt({ min: 1, max: 12 }),
  handleValidationErrors,
  aiController.predictSavings
);

router.get('/predictions/budget',
  query('category').optional().isIn(['alimentation', 'habits', 'activite', 'deplacement']),
  handleValidationErrors,
  aiController.predictBudget
);

// Routes pour le feedback des suggestions
router.post('/feedback',
  rateLimit.standard,
  feedbackValidation,
  handleValidationErrors,
  aiController.submitFeedback
);

router.get('/suggestions/:id/feedback',
  param('id').isUUID(),
  handleValidationErrors,
  aiController.getFeedback
);

// Routes pour l'historique des suggestions
router.get('/history',
  query('category').optional().isIn(['alimentation', 'habits', 'activite', 'deplacement']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  handleValidationErrors,
  aiController.getSuggestionHistory
);

// Routes pour les prompts personnalisés (premium)
router.post('/custom-prompt',
  rateLimit.ai,
  customPromptValidation,
  handleValidationErrors,
  aiController.processCustomPrompt
);

// Routes pour la configuration IA
router.get('/config',
  aiController.getAIConfig
);

router.put('/config',
  rateLimit.standard,
  body('preferences').optional().isObject(),
  body('riskTolerance').optional().isIn(['low', 'medium', 'high']),
  body('suggestionFrequency').optional().isIn(['daily', 'weekly', 'monthly']),
  handleValidationErrors,
  aiController.updateAIConfig
);

// Route pour tester la connectivité IA
router.get('/status',
  aiController.getAIServiceStatus
);

module.exports = router;