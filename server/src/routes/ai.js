const express = require('express');
const aiController = require('../controllers/aiController');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const {
  validateAIChat,
  validateImageAnalysis,
  validateAISuggestions,
  validateSpendingAnalysis,
  validateInsightGeneration
} = require('../middleware/validation/aiValidation');
const { param, body, query } = require('express-validator');
const { processValidationResults, sanitizeInputs, customValidators } = require('../middleware/validation/validationUtils');

// Simple validation for AI feedback
const validateAIFeedback = [
  sanitizeInputs,
  body('suggestionId').custom(customValidators.isSecureUUID),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('feedback').optional().isLength({ max: 500 }).withMessage('Feedback must not exceed 500 characters').custom(customValidators.isSafe),
  body('implemented').optional().isBoolean().withMessage('Implemented must be true or false'),
  processValidationResults
];

// Simple validation for AI configuration
const validateAIConfig = [
  sanitizeInputs,
  body('preferences').optional().isObject().withMessage('Preferences must be an object'),
  body('riskTolerance').optional().isIn(['low', 'medium', 'high']).withMessage('Risk tolerance must be: low, medium, or high'),
  body('suggestionFrequency').optional().isIn(['daily', 'weekly', 'monthly']).withMessage('Suggestion frequency must be: daily, weekly, or monthly'),
  processValidationResults
];

// Simple validation for suggestion ID
const validateSuggestionId = [
  sanitizeInputs,
  param('id').custom(customValidators.isSecureUUID),
  processValidationResults
];

const router = express.Router();

// Public AI suggestions route (no authentication for testing)
router.get('/suggestions',
  rateLimit.ai,
  validateAISuggestions,
  aiController.getSuggestionsPublic
);

// All other routes require authentication
router.use(authenticateToken);

// AI suggestion routes with enhanced security validation
router.post('/suggestions/alimentation',
  rateLimit.ai,
  validateAISuggestions,
  aiController.getFoodSuggestions
);

router.post('/suggestions/habits',
  rateLimit.ai,
  validateAISuggestions,
  aiController.getHabitSuggestions
);

router.post('/suggestions/activite',
  rateLimit.ai,
  validateAISuggestions,
  aiController.getActivitySuggestions
);

router.post('/suggestions/deplacement',
  rateLimit.ai,
  validateAISuggestions,
  aiController.getTransportSuggestions
);

// Generic suggestion routes with comprehensive validation
router.get('/suggestions/auth',
  rateLimit.ai,
  validateAISuggestions,
  aiController.getSuggestions
);

router.post('/suggestions',
  rateLimit.ai,
  validateAISuggestions,
  aiController.getSuggestions
);

// AI analysis routes with enhanced security validation
router.post('/analyze',
  rateLimit.ai,
  validateSpendingAnalysis,
  aiController.analyzeUserData
);

router.post('/analyze/spending',
  rateLimit.ai,
  validateSpendingAnalysis,
  aiController.analyzeSpendingPattern
);

router.post('/analyze/savings',
  rateLimit.ai,
  validateSpendingAnalysis,
  aiController.analyzeSavingsPotential
);

// Image analysis route with comprehensive validation
router.post('/analyze/image',
  rateLimit.ai,
  validateImageAnalysis,
  aiController.analyzeImage
);

// AI recommendations routes with enhanced validation
router.get('/recommendations',
  validateAISuggestions,
  aiController.getPersonalizedRecommendations
);

router.get('/recommendations/daily',
  aiController.getDailyRecommendations
);

// AI insights and trends routes with comprehensive validation
router.get('/insights',
  validateInsightGeneration,
  aiController.getUserInsights
);

router.get('/trends',
  validateAISuggestions,
  aiController.getSpendingTrends
);

// AI prediction routes with comprehensive validation
router.get('/predictions/savings',
  validateInsightGeneration,
  aiController.predictSavings
);

router.get('/predictions/budget',
  validateAISuggestions,
  aiController.predictBudget
);

// AI feedback routes with enhanced validation
router.post('/feedback',
  rateLimit.standard,
  validateAIFeedback,
  aiController.submitFeedback
);

router.get('/suggestions/:id/feedback',
  validateSuggestionId,
  aiController.getFeedback
);

// AI suggestion history route with comprehensive validation
router.get('/history',
  validateAISuggestions,
  aiController.getSuggestionHistory
);

// Custom AI prompt route with enhanced security
router.post('/custom-prompt',
  rateLimit.ai,
  validateAIChat,
  aiController.processCustomPrompt
);

// AI chat route for interactive conversations
router.post('/chat',
  rateLimit.ai,
  validateAIChat,
  aiController.processAIChat
);

// AI configuration routes with validation
router.get('/config',
  aiController.getAIConfig
);

router.put('/config',
  rateLimit.standard,
  validateAIConfig,
  aiController.updateAIConfig
);

// AI service status route (no validation needed)
router.get('/status',
  aiController.getAIServiceStatus
);

module.exports = router;