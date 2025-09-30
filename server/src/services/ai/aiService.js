/**
 * Unified AI Service
 *
 * Provider-agnostic AI service for Pluqla with full GDPR/PSD2 compliance.
 *
 * Features:
 * - Provider switching via environment variable
 * - Automatic PII sanitization before AI calls
 * - Request validation and business rules enforcement
 * - Graceful degradation and error handling
 * - Cost tracking and rate limiting
 * - Comprehensive logging and monitoring
 *
 * Supported Providers:
 * - OpenAI (GPT-4, GPT-3.5-turbo)
 * - Anthropic (Claude 3.5 Sonnet, Claude 3 Haiku)
 * - Mock (Testing and fallback)
 * - None (AI disabled)
 *
 * @module aiService
 */

const { sanitizer } = require('./utils/piiSanitizer');
const { validator } = require('./utils/aiValidator');
const OpenAIProvider = require('./providers/openaiProvider');
const AnthropicProvider = require('./providers/anthropicProvider');
const MockProvider = require('./providers/mockProvider');
const logger = require('../../utils/logger');

class AIService {
  constructor() {
    this.provider = null;
    this.providerName = 'none';
    this.isEnabled = false;
    this.sanitizer = sanitizer;
    this.validator = validator;
    this.logger = logger;

    // Configuration from environment
    this.config = {
      provider: (process.env.AI_PROVIDER || 'none').toLowerCase(),
      apiKey: process.env.AI_API_KEY || '',
      model: process.env.AI_MODEL || '',
      maxTokens: parseInt(process.env.AI_MAX_TOKENS) || 4000,
      timeout: parseInt(process.env.AI_TIMEOUT) || 30000,
      sanitizerMode: process.env.AI_SANITIZER_MODE || 'strict',
    };

    // Initialize provider
    this.initialize();
  }

  /**
   * Initialize the AI provider
   */
  initialize() {
    try {
      this.providerName = this.config.provider;

      // Provider selection
      switch (this.providerName) {
        case 'openai':
          this.provider = new OpenAIProvider({
            apiKey: process.env.OPENAI_API_KEY || this.config.apiKey,
            model: this.config.model,
            maxTokens: this.config.maxTokens,
            timeout: this.config.timeout
          });
          this.isEnabled = true;
          break;

        case 'anthropic':
        case 'claude':
          this.provider = new AnthropicProvider({
            apiKey: process.env.ANTHROPIC_API_KEY || this.config.apiKey,
            model: this.config.model,
            maxTokens: this.config.maxTokens,
            timeout: this.config.timeout
          });
          this.isEnabled = true;
          break;

        case 'mock':
          this.provider = new MockProvider({
            delay: parseInt(process.env.MOCK_DELAY) || 500
          });
          this.isEnabled = true;
          break;

        case 'none':
        case 'disabled':
          this.isEnabled = false;
          this.provider = null;
          break;

        default:
          this.logger.warn(`Unknown AI provider: ${this.providerName}, AI disabled`);
          this.isEnabled = false;
          this.provider = null;
      }

      if (this.isEnabled && this.provider) {
        this.logger.info('AI Service initialized successfully', {
          provider: this.providerName,
          model: this.config.model || 'default',
          sanitizerMode: this.config.sanitizerMode,
          enabled: true
        });
      } else {
        this.logger.info('AI Service initialized in disabled mode', {
          provider: this.providerName,
          enabled: false
        });
      }

    } catch (error) {
      this.logger.error('Failed to initialize AI Service', {
        error: error.message,
        provider: this.providerName
      });

      // Fall back to disabled mode
      this.isEnabled = false;
      this.provider = null;
      this.providerName = 'none';
    }
  }

  /**
   * Check if AI is enabled and ready
   */
  isAIEnabled() {
    return this.isEnabled && this.provider !== null;
  }

  /**
   * Get AI service status
   */
  getStatus() {
    return {
      enabled: this.isEnabled,
      provider: this.providerName,
      model: this.config.model,
      sanitizerMode: this.config.sanitizerMode,
      ready: this.isAIEnabled(),
      capabilities: this.provider?.getCapabilities() || {}
    };
  }

  /**
   * Get suggestions for a category
   *
   * @param {String} userId - User ID (for consistent anonymization)
   * @param {String} category - Category (alimentation, habits, etc.)
   * @param {Object} userContext - User context
   * @param {String} language - Language (fr, en, es)
   * @returns {Array} Suggestions
   */
  async getSuggestions(userId, category, userContext = {}, language = 'fr') {
    const startTime = Date.now();

    try {
      // Check if AI is enabled
      if (!this.isAIEnabled()) {
        return this._getDisabledResponse('suggestions');
      }

      // Build request
      const request = {
        type: 'suggestions',
        category,
        language,
        userContext
      };

      // Validate request
      const validation = this.validator.validate(request, userContext);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Sanitize user context
      const sanitizedContext = this.sanitizer.sanitizeUserContext(userContext);

      // Build prompt
      const prompt = this._buildSuggestionsPrompt(category, sanitizedContext, language);

      // Call AI provider
      const response = await this.provider.generateText(prompt, {
        context: 'suggestions',
        temperature: 0.7
      });

      // Parse and validate response
      const suggestions = this._parseSuggestionsResponse(response.content, category);

      // Log success
      const duration = Date.now() - startTime;
      this.logger.info('AI suggestions generated successfully', {
        userId,
        category,
        provider: this.providerName,
        suggestionsCount: suggestions.length,
        duration: `${duration}ms`,
        tokens: response.usage?.totalTokens
      });

      return suggestions;

    } catch (error) {
      this.logger.error('Failed to generate AI suggestions', {
        userId,
        category,
        error: error.message,
        provider: this.providerName
      });

      // Return fallback suggestions
      return this._getFallbackSuggestions(category);
    }
  }

  /**
   * Analyze spending patterns
   *
   * @param {String} userId - User ID
   * @param {Array} transactions - Transactions to analyze
   * @param {Object} userContext - User context
   * @returns {Object} Analysis results
   */
  async analyzeSpending(userId, transactions, userContext = {}) {
    const startTime = Date.now();

    try {
      if (!this.isAIEnabled()) {
        return this._getDisabledResponse('analysis');
      }

      // Build and validate request
      const request = {
        type: 'analyze_spending',
        transactions,
        userContext
      };

      const validation = this.validator.validate(request, userContext);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Sanitize transactions
      const sanitizedTransactions = this.sanitizer.sanitizeTransactions(transactions, { userId });
      const sanitizedContext = this.sanitizer.sanitizeUserContext(userContext);

      // Call AI provider
      const response = await this.provider.analyzeTransactions(sanitizedTransactions, sanitizedContext);

      // Log success
      const duration = Date.now() - startTime;
      this.logger.info('Spending analysis completed', {
        userId,
        provider: this.providerName,
        transactionsAnalyzed: transactions.length,
        duration: `${duration}ms`,
        tokens: response.usage?.totalTokens
      });

      return {
        success: true,
        data: {
          insights: response.insights || [],
          recommendations: response.recommendations || [],
          healthScore: response.healthScore || 75,
          summary: response.summary || 'Analysis completed'
        },
        metadata: response.metadata
      };

    } catch (error) {
      this.logger.error('Spending analysis failed', {
        userId,
        error: error.message,
        provider: this.providerName
      });

      return {
        success: false,
        error: 'Analysis temporarily unavailable',
        data: {
          insights: ['Unable to analyze at this time. Please try again later.'],
          recommendations: [],
          healthScore: null,
          summary: 'Analysis failed'
        }
      };
    }
  }

  /**
   * Classify expenses
   *
   * @param {Array} expenses - Expenses to classify
   * @param {Object} userContext - User context
   * @returns {Array} Classified expenses
   */
  async classifyExpenses(expenses, userContext = {}) {
    try {
      if (!this.isAIEnabled()) {
        return expenses.map(e => ({ ...e, category: e.category || 'autres', confidence: 0.5 }));
      }

      // Validate request
      const request = { type: 'classify_transaction', expenses };
      const validation = this.validator.validate(request, userContext);

      if (!validation.isValid) {
        throw new Error('Validation failed');
      }

      // Sanitize expenses
      const sanitizedExpenses = expenses.map(expense => ({
        ...expense,
        description: this.sanitizer.sanitize(expense.description || '', { userId: userContext.userId })
      }));

      // Call provider
      const classified = await this.provider.classifyExpenses(sanitizedExpenses);

      this.logger.info('Expenses classified successfully', {
        userId: userContext.userId,
        count: expenses.length,
        provider: this.providerName
      });

      return classified;

    } catch (error) {
      this.logger.error('Expense classification failed', {
        error: error.message,
        provider: this.providerName
      });

      return expenses.map(e => ({ ...e, category: e.category || 'autres', confidence: 0.5 }));
    }
  }

  /**
   * Process AI chat
   *
   * @param {String} userId - User ID
   * @param {String} message - User message
   * @param {Object} context - Conversation context
   * @returns {String} AI response
   */
  async processAIChat(userId, message, context = {}) {
    try {
      if (!this.isAIEnabled()) {
        return 'Le service AI est actuellement désactivé. Veuillez réessayer plus tard.';
      }

      // Validate request
      const request = { type: 'chat', message, conversationId: context.conversationId };
      const validation = this.validator.validate(request, { userId });

      if (!validation.isValid) {
        return 'Désolé, votre message contient des données invalides. Veuillez reformuler.';
      }

      // Sanitize message
      const sanitizedMessage = this.sanitizer.sanitize(message, { userId });

      // Call provider
      const response = await this.provider.chat(
        context.conversationId || `chat_${Date.now()}`,
        sanitizedMessage,
        context.history || []
      );

      this.logger.info('AI chat processed', {
        userId,
        provider: this.providerName,
        conversationId: response.conversationId
      });

      return response.message;

    } catch (error) {
      this.logger.error('AI chat failed', {
        userId,
        error: error.message,
        provider: this.providerName
      });

      return 'Désolé, je ne peux pas traiter votre demande pour le moment. Veuillez réessayer.';
    }
  }

  /**
   * Build suggestions prompt
   */
  _buildSuggestionsPrompt(category, userContext, language) {
    const categoryNames = {
      alimentation: 'food and groceries',
      habits: 'clothing and personal care',
      activite: 'activities and entertainment',
      deplacement: 'transportation'
    };

    const categoryName = categoryNames[category] || category;
    const lang = language === 'fr' ? 'French' : language === 'es' ? 'Spanish' : 'English';

    return `Generate 3-5 practical money-saving suggestions for the category: ${categoryName}

User context:
- Monthly savings goal: €${userContext.monthlyGoal || 0}
- Current savings: €${userContext.savedAmount || 0}
- User level: ${userContext.level || 1}

Requirements:
- Suggestions must be actionable and specific
- Include estimated potential savings in euros
- Keep each suggestion concise (1-2 sentences)
- Respond in ${lang}

Format as JSON array:
[
  {
    "title": "suggestion title",
    "description": "brief description",
    "category": "${category}",
    "potentialSaving": 50
  }
]`;
  }

  /**
   * Parse suggestions response
   */
  _parseSuggestionsResponse(content, category) {
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
                       content.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        return Array.isArray(suggestions) ? suggestions.slice(0, 5) : [];
      }

      // Fallback parsing
      return this._getFallbackSuggestions(category);

    } catch (error) {
      this.logger.warn('Failed to parse suggestions response', { error: error.message });
      return this._getFallbackSuggestions(category);
    }
  }

  /**
   * Get fallback suggestions when AI fails
   */
  _getFallbackSuggestions(category) {
    const fallbacks = {
      alimentation: [
        { title: 'Planifier les repas', description: 'Préparez vos menus à l\'avance pour économiser', category, potentialSaving: 50 },
        { title: 'Acheter en vrac', description: 'Les produits en vrac sont souvent moins chers', category, potentialSaving: 30 }
      ],
      habits: [
        { title: 'Acheter d\'occasion', description: 'Explorez les vêtements de seconde main', category, potentialSaving: 100 },
        { title: 'Comparer les prix', description: 'Utilisez des comparateurs en ligne', category, potentialSaving: 40 }
      ],
      activite: [
        { title: 'Activités gratuites', description: 'Profitez des parcs et événements gratuits', category, potentialSaving: 60 },
        { title: 'Bibliothèque', description: 'Empruntez des livres et films gratuitement', category, potentialSaving: 30 }
      ],
      deplacement: [
        { title: 'Transports en commun', description: 'Préférez l\'abonnement mensuel', category, potentialSaving: 150 },
        { title: 'Covoiturage', description: 'Partagez vos trajets quotidiens', category, potentialSaving: 80 }
      ]
    };

    return fallbacks[category] || fallbacks.alimentation;
  }

  /**
   * Get disabled response
   */
  _getDisabledResponse(type) {
    if (type === 'suggestions') {
      return [];
    } else if (type === 'analysis') {
      return {
        success: false,
        message: 'AI features are currently disabled',
        data: {
          insights: [],
          recommendations: [],
          healthScore: null,
          summary: 'AI service disabled'
        }
      };
    } else {
      return null;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    const status = this.getStatus();

    if (this.isAIEnabled()) {
      try {
        await this.provider.testConnection();
        status.connection = 'healthy';
      } catch (error) {
        status.connection = 'unhealthy';
        status.error = error.message;
      }
    } else {
      status.connection = 'disabled';
    }

    return status;
  }

  /**
   * Reinitialize with new configuration (for runtime changes)
   */
  reconfigure(newConfig) {
    Object.assign(this.config, newConfig);
    this.initialize();
    return this.getStatus();
  }
}

// Export singleton instance
const aiService = new AIService();

module.exports = aiService;
module.exports.AIService = AIService;