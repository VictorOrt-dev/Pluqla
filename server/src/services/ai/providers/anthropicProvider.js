/**
 * Anthropic (Claude) Provider Adapter
 *
 * Implements the standard AI provider interface for Anthropic's Claude models.
 * Supports Claude 3.5 Sonnet, Claude 3 Haiku, and other Claude models.
 *
 * Features:
 * - Text generation for suggestions and insights
 * - Transaction analysis
 * - Expense classification
 * - Conversational chat
 *
 * @module anthropicProvider
 */

const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../../../utils/logger');

class AnthropicProvider {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    this.model = config.model || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
    this.maxTokens = config.maxTokens || parseInt(process.env.AI_MAX_TOKENS) || 4000;
    this.temperature = config.temperature || 0.7;
    this.timeout = config.timeout || parseInt(process.env.AI_TIMEOUT) || 30000;

    if (!this.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    this.client = new Anthropic({
      apiKey: this.apiKey,
      timeout: this.timeout,
    });

    this.logger = logger;
  }

  /**
   * Test connection to Anthropic API
   */
  async testConnection() {
    try {
      // Make a minimal request to test the connection
      await this.client.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }]
      });

      this.logger.info('Anthropic connection test successful', {
        model: this.model
      });
      return true;
    } catch (error) {
      this.logger.error('Anthropic connection test failed', {
        error: error.message
      });
      throw new Error(`Anthropic connection failed: ${error.message}`);
    }
  }

  /**
   * Generate text completion
   *
   * @param {String} prompt - Text prompt
   * @param {Object} options - Generation options
   * @returns {Object} Generated response
   */
  async generateText(prompt, options = {}) {
    const startTime = Date.now();

    try {
      const systemPrompt = this._getSystemPrompt(options.context || 'general');

      const response = await this.client.messages.create({
        model: options.model || this.model,
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature !== undefined ? options.temperature : this.temperature,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const duration = Date.now() - startTime;

      const result = {
        content: response.content[0].text,
        model: response.model,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        metadata: {
          provider: 'anthropic',
          duration: `${duration}ms`,
          stopReason: response.stop_reason
        }
      };

      this.logger.info('Anthropic text generation successful', {
        model: response.model,
        tokens: result.usage.totalTokens,
        duration: `${duration}ms`
      });

      return result;

    } catch (error) {
      this.logger.error('Anthropic text generation failed', {
        error: error.message,
        model: this.model
      });

      throw this._handleError(error);
    }
  }

  /**
   * Analyze transactions and provide insights
   *
   * @param {Array} transactions - Array of sanitized transactions
   * @param {Object} userContext - Anonymized user context
   * @returns {Object} Analysis results
   */
  async analyzeTransactions(transactions, userContext = {}) {
    if (!Array.isArray(transactions) || transactions.length === 0) {
      throw new Error('Transactions array is required and cannot be empty');
    }

    const prompt = this._buildTransactionAnalysisPrompt(transactions, userContext);

    const response = await this.generateText(prompt, {
      context: 'financial_analysis',
      temperature: 0.5,
    });

    try {
      const analysis = this._parseAnalysisResponse(response.content);

      return {
        ...analysis,
        metadata: response.metadata,
        usage: response.usage
      };

    } catch (error) {
      this.logger.warn('Failed to parse structured analysis', {
        error: error.message
      });

      return {
        insights: [response.content],
        recommendations: [],
        metadata: response.metadata,
        usage: response.usage
      };
    }
  }

  /**
   * Classify expenses into categories
   *
   * @param {Array} expenses - Array of expenses to classify
   * @returns {Array} Classified expenses
   */
  async classifyExpenses(expenses) {
    if (!Array.isArray(expenses) || expenses.length === 0) {
      throw new Error('Expenses array is required and cannot be empty');
    }

    const prompt = this._buildClassificationPrompt(expenses);

    const response = await this.generateText(prompt, {
      context: 'classification',
      temperature: 0.3,
      maxTokens: 2000
    });

    try {
      return this._parseClassificationResponse(response.content, expenses);
    } catch (error) {
      this.logger.warn('Failed to parse classification response', {
        error: error.message
      });

      return expenses.map(expense => ({
        ...expense,
        category: expense.category || 'autres',
        confidence: 0.5
      }));
    }
  }

  /**
   * Conversational chat
   *
   * @param {String} conversationId - Conversation identifier
   * @param {String} message - User message
   * @param {Array} history - Conversation history (optional)
   * @returns {Object} Chat response
   */
  async chat(conversationId, message, history = []) {
    try {
      const systemPrompt = this._getSystemPrompt('chat');

      const messages = [
        ...history.map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        })),
        {
          role: 'user',
          content: message
        }
      ];

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: 0.8,
        system: systemPrompt,
        messages: messages
      });

      return {
        conversationId,
        message: response.content[0].text,
        model: response.model,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        metadata: {
          provider: 'anthropic',
          stopReason: response.stop_reason
        }
      };

    } catch (error) {
      this.logger.error('Anthropic chat failed', {
        error: error.message,
        conversationId
      });

      throw this._handleError(error);
    }
  }

  /**
   * Get system prompt for different contexts
   */
  _getSystemPrompt(context) {
    const prompts = {
      general: `You are Pluqla, a helpful AI assistant specialized in personal finance and savings.
You provide practical, actionable advice to help users save money and manage their finances better.
Always be concise, friendly, and focused on financial well-being.`,

      financial_analysis: `You are a financial analysis AI for Pluqla.
Analyze spending patterns and provide structured insights and recommendations.
Focus on:
- Spending trends and patterns
- Areas for potential savings
- Budget optimization opportunities
- Financial health indicators

Provide responses in JSON format with clear insights and actionable recommendations.`,

      classification: `You are an expense classification AI for Pluqla.
Classify expenses into these categories: alimentation, habits, activite, deplacement, logement, transport, loisirs, sante, education, autres.
Be consistent and accurate. Respond in JSON format.`,

      chat: `You are Pluqla, a friendly AI financial advisor.
Help users with financial questions, provide savings tips, and offer encouragement.
Keep responses concise (2-3 sentences) and actionable.
Focus on practical advice that users can implement immediately.`
    };

    return prompts[context] || prompts.general;
  }

  /**
   * Build transaction analysis prompt
   */
  _buildTransactionAnalysisPrompt(transactions, userContext) {
    const summary = {
      totalTransactions: transactions.length,
      categories: [...new Set(transactions.map(t => t.category))],
      totalAmount: transactions.reduce((sum, t) => sum + (t.amount || 0), 0),
      dateRange: {
        start: transactions[0]?.date,
        end: transactions[transactions.length - 1]?.date
      }
    };

    return `Analyze these anonymized financial transactions and provide insights:

**Transaction Summary:**
- Total transactions: ${summary.totalTransactions}
- Categories: ${summary.categories.join(', ')}
- Total amount: €${summary.totalAmount.toFixed(2)}
- Date range: ${summary.dateRange.start} to ${summary.dateRange.end}

**User Context:**
- Monthly goal: €${userContext.monthlyGoal || 0}
- Current savings: €${userContext.savedAmount || 0}
- User level: ${userContext.level || 1}
- Premium: ${userContext.isPremium ? 'Yes' : 'No'}

**Sample Transactions (first 10):**
${transactions.slice(0, 10).map((t, i) =>
  `${i + 1}. €${t.amount} - ${t.category} - ${t.date}`
).join('\n')}

Please provide:
1. **3-5 key insights** about spending patterns
2. **3-5 actionable recommendations** for saving money
3. **Overall financial health assessment**

Format your response as JSON:
{
  "insights": ["insight 1", "insight 2", ...],
  "recommendations": ["recommendation 1", "recommendation 2", ...],
  "healthScore": 0-100,
  "summary": "brief overall assessment"
}`;
  }

  /**
   * Build classification prompt
   */
  _buildClassificationPrompt(expenses) {
    return `Classify these expenses into appropriate categories.

Available categories: alimentation, habits, activite, deplacement, logement, transport, loisirs, sante, education, autres

Expenses to classify:
${expenses.map((e, i) => `${i + 1}. Amount: €${e.amount}, Description: "${e.description}"`).join('\n')}

Respond with JSON array:
[
  { "index": 0, "category": "alimentation", "confidence": 0.95 },
  { "index": 1, "category": "transport", "confidence": 0.88 },
  ...
]`;
  }

  /**
   * Parse analysis response
   */
  _parseAnalysisResponse(content) {
    // Try to extract JSON from markdown code blocks or plain JSON
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
                     content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } catch (e) {
        // Fall through to text parsing
      }
    }

    // Fallback: parse as text
    const insights = [];
    const recommendations = [];

    const lines = content.split('\n');
    let currentSection = null;

    for (const line of lines) {
      if (line.match(/insight/i)) {
        currentSection = 'insights';
      } else if (line.match(/recommend/i)) {
        currentSection = 'recommendations';
      } else if (line.trim().match(/^[-•*]\s+(.+)/) || line.trim().match(/^\d+\.\s+(.+)/)) {
        const text = line.trim().replace(/^[-•*]\s+/, '').replace(/^\d+\.\s+/, '');
        if (currentSection === 'insights') {
          insights.push(text);
        } else if (currentSection === 'recommendations') {
          recommendations.push(text);
        }
      }
    }

    return {
      insights: insights.length > 0 ? insights : [content],
      recommendations,
      healthScore: 75,
      summary: 'Analysis completed'
    };
  }

  /**
   * Parse classification response
   */
  _parseClassificationResponse(content, expenses) {
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
                       content.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        const classifications = JSON.parse(jsonMatch[1] || jsonMatch[0]);

        return expenses.map((expense, index) => {
          const classification = classifications.find(c => c.index === index);
          return {
            ...expense,
            category: classification?.category || 'autres',
            confidence: classification?.confidence || 0.5
          };
        });
      }
    } catch (error) {
      // Fall through to default
    }

    return expenses.map(expense => ({
      ...expense,
      category: expense.category || 'autres',
      confidence: 0.5
    }));
  }

  /**
   * Handle Anthropic API errors
   */
  _handleError(error) {
    if (error.status === 401) {
      return new Error('Anthropic API authentication failed - check API key');
    } else if (error.status === 429) {
      return new Error('Anthropic API rate limit exceeded - please try again later');
    } else if (error.status === 500) {
      return new Error('Anthropic API server error - service temporarily unavailable');
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new Error('Anthropic API request timeout - please try again');
    } else {
      return new Error(`Anthropic API error: ${error.message}`);
    }
  }

  /**
   * Get provider name
   */
  getName() {
    return 'anthropic';
  }

  /**
   * Get provider capabilities
   */
  getCapabilities() {
    return {
      textGeneration: true,
      transactionAnalysis: true,
      expenseClassification: true,
      chat: true,
      maxTokens: this.maxTokens,
      supportedModels: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229']
    };
  }
}

module.exports = AnthropicProvider;