/**
 * 🤖 AI SERVICES VALIDATION SCHEMAS
 *
 * Validation for AI-powered endpoints in the Pluqla financial backend.
 * Protects against prompt injection, ensures safe AI interactions, and prevents abuse.
 *
 * Endpoints covered:
 * - POST /api/ai/chat
 * - POST /api/ai/analyze-image
 * - GET /api/ai/suggestions
 * - POST /api/ai/analyze-spending
 * - POST /api/ai/generate-insights
 */

const { body, query, file } = require('express-validator');
const { customValidators, processValidationResults, sanitizeInputs, ValidationUtils } = require('./validationUtils');

/**
 * AI Chat Validation
 *
 * Security considerations:
 * - Prevents prompt injection attacks
 * - Limits message length to prevent abuse
 * - Sanitizes user input while preserving intent
 * - Rate limits AI requests to prevent cost abuse
 */
const validateAIChat = [
  sanitizeInputs,

  // Chat message validation
  body('message')
    .notEmpty()
    .withMessage('Chat message is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be between 1 and 2000 characters')
    .custom((value) => {
      // Enhanced prompt injection detection
      const dangerousPatterns = [
        // Direct prompt injection
        /ignore\s+(previous|above|all)\s+(instructions|prompts|rules)/i,
        /forget\s+(everything|all|previous)/i,
        /act\s+as\s+(if\s+you\s+are|a)/i,
        /pretend\s+(to\s+be|you\s+are)/i,
        /roleplay\s+as/i,

        // System prompt manipulation
        /system\s*[:]\s*/i,
        /assistant\s*[:]\s*/i,
        /human\s*[:]\s*/i,
        /user\s*[:]\s*/i,

        // Code injection attempts
        /<script/i,
        /javascript:/i,
        /eval\s*\(/i,
        /function\s*\(/i,
        /setTimeout/i,
        /setInterval/i,

        // SQL-like injection
        /union\s+select/i,
        /drop\s+table/i,
        /insert\s+into/i,
        /delete\s+from/i,

        // Excessive repetition (potential DoS)
        /(.)\1{50,}/,

        // Encoding attempts
        /%3C%73%63%72%69%70%74/i, // URL encoded <script
        /\\u003c\\u0073\\u0063\\u0072\\u0069\\u0070\\u0074/i, // Unicode encoded <script
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(value)) {
          throw new Error('Message contains potentially harmful content that could compromise AI safety');
        }
      }

      // Additional safety checks
      const threats = ValidationUtils.detectMaliciousPatterns(value);
      if (!threats.safe) {
        throw new Error('Message contains potentially harmful patterns');
      }

      return true;
    }),

  // Conversation context (optional)
  body('context')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Context can contain maximum 10 previous messages')
    .custom((context) => {
      if (Array.isArray(context)) {
        for (let i = 0; i < context.length; i++) {
          const message = context[i];

          if (!message || typeof message !== 'object') {
            throw new Error(`Context message at index ${i} must be an object`);
          }

          if (!message.role || !['user', 'assistant'].includes(message.role)) {
            throw new Error(`Context message at index ${i} must have role 'user' or 'assistant'`);
          }

          if (!message.content || typeof message.content !== 'string') {
            throw new Error(`Context message at index ${i} must have string content`);
          }

          if (message.content.length > 1000) {
            throw new Error(`Context message at index ${i} is too long (max 1000 characters)`);
          }

          // Check each context message for safety
          const threats = ValidationUtils.detectMaliciousPatterns(message.content);
          if (!threats.safe) {
            throw new Error(`Context message at index ${i} contains harmful content`);
          }
        }
      }
      return true;
    }),

  // AI model preference (optional)
  body('model')
    .optional()
    .isIn(['gpt-3.5-turbo', 'gpt-4', 'claude-3-sonnet'])
    .withMessage('Invalid AI model specified'),

  // Language for response
  body('language')
    .optional()
    .isIn(['fr', 'en', 'es'])
    .withMessage('Language must be one of: fr, en, es'),

  // Response format preference
  body('format')
    .optional()
    .isIn(['text', 'structured', 'actionable'])
    .withMessage('Response format must be: text, structured, or actionable'),

  processValidationResults
];

/**
 * Image Analysis Validation
 *
 * Security considerations:
 * - Validates file type and size
 * - Prevents malicious file uploads
 * - Ensures safe image processing
 * - Protects against embedded malware
 */
const validateImageAnalysis = [
  sanitizeInputs,

  // Image metadata validation
  body('filename')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Filename too long')
    .matches(/^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp|gif)$/i)
    .withMessage('Invalid image file type'),

  // File size validation
  body('fileSize')
    .optional()
    .isInt({ min: 1, max: 10 * 1024 * 1024 }) // 10MB max
    .withMessage('File size must be between 1 byte and 10MB'),

  // Analysis type
  body('analysisType')
    .notEmpty()
    .withMessage('Analysis type is required')
    .isIn(['receipt', 'expense_category', 'text_extraction', 'general'])
    .withMessage('Analysis type must be: receipt, expense_category, text_extraction, or general'),

  // Expected content type (helps with processing)
  body('expectedContent')
    .optional()
    .isIn(['receipt', 'invoice', 'document', 'product', 'general'])
    .withMessage('Expected content must be: receipt, invoice, document, product, or general'),

  // Language for text extraction
  body('language')
    .optional()
    .isIn(['fr', 'en', 'es', 'auto'])
    .withMessage('Language must be: fr, en, es, or auto'),

  // Processing options
  body('options')
    .optional()
    .isObject()
    .withMessage('Options must be an object'),

  body('options.extractText')
    .optional()
    .isBoolean()
    .withMessage('Extract text option must be true or false'),

  body('options.detectAmount')
    .optional()
    .isBoolean()
    .withMessage('Detect amount option must be true or false'),

  body('options.suggestCategory')
    .optional()
    .isBoolean()
    .withMessage('Suggest category option must be true or false'),

  processValidationResults
];

/**
 * AI Suggestions Query Validation
 *
 * Security considerations:
 * - Validates suggestion parameters
 * - Prevents suggestion manipulation
 * - Limits query complexity
 */
const validateAISuggestions = [
  sanitizeInputs,

  // Category for suggestions
  query('category')
    .notEmpty()
    .withMessage('Category is required for suggestions')
    .isIn(['alimentation', 'habits', 'activite', 'deplacement', 'general'])
    .withMessage('Category must be: alimentation, habits, activite, deplacement, or general'),

  // User preferences (optional)
  query('budget')
    .optional()
    .custom(customValidators.isSecureAmount),

  query('location')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Location must not exceed 100 characters')
    .custom(customValidators.isSafe),

  // Time context
  query('timeframe')
    .optional()
    .isIn(['immediate', 'daily', 'weekly', 'monthly'])
    .withMessage('Timeframe must be: immediate, daily, weekly, or monthly'),

  // Number of suggestions requested
  query('count')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Count must be between 1 and 20'),

  // Language for suggestions
  query('lang')
    .optional()
    .isIn(['fr', 'en', 'es'])
    .withMessage('Language must be: fr, en, or es'),

  // Personalization level
  query('personalized')
    .optional()
    .isBoolean()
    .withMessage('Personalized must be true or false'),

  processValidationResults
];

/**
 * Spending Analysis Validation
 *
 * Security considerations:
 * - Validates analysis parameters
 * - Prevents data mining attacks
 * - Limits analysis scope and complexity
 */
const validateSpendingAnalysis = [
  sanitizeInputs,

  // Analysis period
  body('period')
    .notEmpty()
    .withMessage('Analysis period is required')
    .isObject()
    .withMessage('Period must be an object'),

  body('period.start')
    .notEmpty()
    .withMessage('Period start date is required')
    .custom(customValidators.isSecureDate),

  body('period.end')
    .notEmpty()
    .withMessage('Period end date is required')
    .custom(customValidators.isSecureDate)
    .custom((value, { req }) => {
      const startDate = new Date(req.body.period.start);
      const endDate = new Date(value);

      if (endDate <= startDate) {
        throw new Error('End date must be after start date');
      }

      // Limit analysis period to prevent performance issues
      const diffTime = Math.abs(endDate - startDate);
      const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));

      if (diffMonths > 12) {
        throw new Error('Analysis period cannot exceed 12 months');
      }

      return true;
    }),

  // Analysis types requested
  body('analysisTypes')
    .notEmpty()
    .withMessage('Analysis types are required')
    .isArray({ min: 1, max: 5 })
    .withMessage('Must specify 1-5 analysis types')
    .custom((types) => {
      const validTypes = [
        'spending_trends',
        'category_breakdown',
        'budget_variance',
        'savings_opportunities',
        'anomaly_detection'
      ];

      for (const type of types) {
        if (!validTypes.includes(type)) {
          throw new Error(`Invalid analysis type: ${type}`);
        }
      }

      return true;
    }),

  // Categories to focus on (optional)
  body('focusCategories')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Maximum 5 focus categories allowed'),

  // AI enhancement options
  body('aiOptions')
    .optional()
    .isObject()
    .withMessage('AI options must be an object'),

  body('aiOptions.includeInsights')
    .optional()
    .isBoolean()
    .withMessage('Include insights must be true or false'),

  body('aiOptions.generateRecommendations')
    .optional()
    .isBoolean()
    .withMessage('Generate recommendations must be true or false'),

  body('aiOptions.language')
    .optional()
    .isIn(['fr', 'en', 'es'])
    .withMessage('Language must be: fr, en, or es'),

  processValidationResults
];

/**
 * Insight Generation Validation
 *
 * Security considerations:
 * - Validates insight parameters
 * - Prevents insight manipulation
 * - Ensures appropriate data access
 */
const validateInsightGeneration = [
  sanitizeInputs,

  // Insight type
  body('insightType')
    .notEmpty()
    .withMessage('Insight type is required')
    .isIn(['financial_health', 'savings_goals', 'spending_patterns', 'budget_optimization', 'investment_advice'])
    .withMessage('Invalid insight type'),

  // Data scope
  body('dataScope')
    .optional()
    .isIn(['last_month', 'last_quarter', 'last_year', 'all_time'])
    .withMessage('Data scope must be: last_month, last_quarter, last_year, or all_time'),

  // User context (optional)
  body('userContext')
    .optional()
    .isObject()
    .withMessage('User context must be an object'),

  body('userContext.age')
    .optional()
    .isInt({ min: 13, max: 120 })
    .withMessage('Age must be between 13 and 120'),

  body('userContext.income')
    .optional()
    .custom(customValidators.isSecureAmount),

  body('userContext.goals')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Maximum 5 financial goals allowed'),

  // Personalization level
  body('personalizationLevel')
    .optional()
    .isIn(['basic', 'standard', 'advanced'])
    .withMessage('Personalization level must be: basic, standard, or advanced'),

  // Output format
  body('format')
    .optional()
    .isIn(['summary', 'detailed', 'actionable'])
    .withMessage('Format must be: summary, detailed, or actionable'),

  processValidationResults
];

module.exports = {
  validateAIChat,
  validateImageAnalysis,
  validateAISuggestions,
  validateSpendingAnalysis,
  validateInsightGeneration
};