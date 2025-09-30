/**
 * Anthropic (Claude) Provider Adapter
 *
 * Implements the AI provider interface for Anthropic Claude models,
 * handling authentication, request formatting, and response processing.
 */

const https = require('https');
const logger = require('../../../utils/logger');

class AnthropicAdapter {
  constructor(config) {
    this.config = {
      apiKey: config.apiKey,
      model: config.model || 'claude-3-5-sonnet-20241022',
      baseURL: config.baseURL || 'https://api.anthropic.com/v1',
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      maxTokens: config.maxTokens || 4000,
      temperature: config.temperature || 0.7,
      anthropicVersion: '2023-06-01'
    };

    this.headers = {
      'x-api-key': this.config.apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': this.config.anthropicVersion,
      'User-Agent': 'Pluqla-AI/1.0'
    };

    // Validate configuration
    if (!this.config.apiKey || !this.config.apiKey.startsWith('sk-ant-')) {
      throw new Error('Invalid Anthropic API key format');
    }

    logger.info('Anthropic adapter initialized', {
      model: this.config.model,
      baseURL: this.config.baseURL,
      maxTokens: this.config.maxTokens,
      version: this.config.anthropicVersion
    });
  }

  /**
   * Test connection to Anthropic API
   */
  async testConnection() {
    try {
      // Anthropic doesn't have a simple models endpoint, so we'll make a minimal completion request
      const testRequest = {
        model: this.config.model,
        max_tokens: 10,
        messages: [{
          role: 'user',
          content: 'Hello'
        }]
      };

      const response = await this.makeRequest('/messages', {
        method: 'POST',
        body: JSON.stringify(testRequest)
      });

      if (response.content && Array.isArray(response.content)) {
        logger.info('Anthropic connection test successful', {
          model: response.model
        });
        return true;
      }

      throw new Error('Unexpected response format from Anthropic');

    } catch (error) {
      logger.error('Anthropic connection test failed', {
        error: error.message
      });
      throw new Error(`Anthropic connection failed: ${error.message}`);
    }
  }

  /**
   * Generate AI response using Anthropic Claude
   */
  async generateResponse(request) {
    const startTime = Date.now();

    try {
      // Convert our request format to Anthropic format
      const anthropicRequest = this.formatRequest(request);

      // Make the API call
      const response = await this.makeRequest('/messages', {
        method: 'POST',
        body: JSON.stringify(anthropicRequest)
      });

      // Process and return the response
      const processedResponse = this.processResponse(response, request);

      logger.info('Anthropic response generated successfully', {
        model: this.config.model,
        requestType: request.type,
        duration: Date.now() - startTime,
        usage: processedResponse.usage
      });

      return processedResponse;

    } catch (error) {
      logger.error('Anthropic response generation failed', {
        error: error.message,
        requestType: request.type,
        duration: Date.now() - startTime
      });

      throw new Error(`Anthropic request failed: ${error.message}`);
    }
  }

  /**
   * Format our request to Anthropic API format
   */
  formatRequest(request) {
    // Build the system prompt based on request type
    const systemPrompt = this.buildSystemPrompt(request.type, request.subtype);

    // Build the user message from request data
    const userMessage = this.buildUserMessage(request);

    const anthropicRequest = {
      model: this.config.model,
      max_tokens: request.options?.maxTokens || this.config.maxTokens,
      temperature: request.options?.temperature || this.config.temperature,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: userMessage
      }]
    };

    return anthropicRequest;
  }

  /**
   * Build system prompt based on request type
   */
  buildSystemPrompt(type, subtype) {
    const basePrompt = `You are Claude, a professional financial advisor AI assistant created by Anthropic. You specialize in providing accurate, helpful financial guidance while maintaining strict privacy and security standards.

CRITICAL RULES:
1. Never request or reference specific personal identifiers
2. Provide actionable, practical financial advice
3. Always include confidence levels for recommendations
4. Respond only in valid JSON format
5. Keep responses concise but comprehensive
6. Include relevant disclaimers for financial advice
7. Be honest about limitations and uncertainties`;

    const typeSpecificPrompts = {
      financial_analysis: `${basePrompt}

For financial analysis requests, provide insights on spending patterns, budget optimization, and financial health. Your response must be valid JSON with this structure:
{
  "analysis": "detailed analysis text",
  "insights": ["key insight 1", "key insight 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "confidence": 0.85,
  "risk_factors": ["potential risk 1", "potential risk 2"],
  "disclaimer": "appropriate financial disclaimer"
}`,

      transaction_classification: `${basePrompt}

For transaction classification, categorize transactions accurately based on description, amount, and context. Your response must be valid JSON with this structure:
{
  "category": "suggested category",
  "subcategory": "more specific classification",
  "confidence": 0.92,
  "alternatives": ["alternative category 1", "alternative category 2"],
  "reasoning": "explanation of classification decision",
  "flags": ["unusual_amount", "merchant_mismatch"] // if applicable
}`,

      financial_insights: `${basePrompt}

For financial insights, provide comprehensive analysis and actionable recommendations. Your response must be valid JSON with this structure:
{
  "overview": "high-level financial health summary",
  "insights": [
    {
      "type": "insight type",
      "description": "detailed insight",
      "impact": "high|medium|low",
      "action": "recommended action",
      "urgency": "immediate|soon|eventually"
    }
  ],
  "trends": {
    "positive": ["positive trend 1", "positive trend 2"],
    "concerning": ["concerning trend 1", "concerning trend 2"]
  },
  "recommendations": [
    {
      "priority": "high|medium|low",
      "action": "specific action to take",
      "expected_impact": "description of expected outcome",
      "timeframe": "suggested timeframe",
      "difficulty": "easy|moderate|challenging"
    }
  ],
  "confidence": 0.88,
  "disclaimer": "financial advice disclaimer"
}`,

      spending_recommendations: `${basePrompt}

For spending recommendations, provide specific, actionable advice based on spending patterns and goals. Your response must be valid JSON with this structure:
{
  "summary": "overview of current spending situation",
  "recommendations": [
    {
      "category": "spending category",
      "current_analysis": "assessment of current spending",
      "target_adjustment": "recommended change",
      "savings_potential": "estimated monthly savings",
      "difficulty": "easy|moderate|challenging",
      "actions": ["specific action 1", "specific action 2"],
      "timeline": "suggested implementation timeline"
    }
  ],
  "priority_areas": ["area 1", "area 2"],
  "quick_wins": ["easy savings opportunity 1", "easy savings opportunity 2"],
  "behavioral_insights": ["spending pattern insight 1", "spending pattern insight 2"],
  "confidence": 0.86,
  "disclaimer": "financial advice disclaimer"
}`
    };

    return typeSpecificPrompts[type] || typeSpecificPrompts.financial_analysis;
  }

  /**
   * Build user message from request data
   */
  buildUserMessage(request) {
    let message = '';

    // Add request type context
    message += `Request Type: ${request.type}\n`;
    if (request.subtype) {
      message += `Subtype: ${request.subtype}\n`;
    }

    // Add custom instructions if provided
    if (request.instructions) {
      message += `\nSpecific Instructions: ${request.instructions}\n`;
    }

    // Add data context
    message += '\nFinancial data to analyze (anonymized for privacy):\n';
    message += JSON.stringify(request.data, null, 2);

    // Add specific guidance based on request type
    const typeGuidance = {
      transaction_classification: '\n\nPlease classify this transaction accurately and explain your reasoning. Consider the merchant, amount, and any contextual clues.',
      financial_analysis: '\n\nPlease analyze this financial data comprehensively. Look for patterns, opportunities, and potential concerns. Provide actionable insights.',
      financial_insights: '\n\nPlease generate detailed financial insights with specific, actionable recommendations. Focus on practical steps the user can take.',
      spending_recommendations: '\n\nPlease analyze the spending patterns and provide specific recommendations for optimization. Consider the user\'s goals and constraints.'
    };

    message += typeGuidance[request.type] || '\n\nPlease analyze this data and provide helpful financial guidance.';

    return message;
  }

  /**
   * Process Anthropic response and standardize format
   */
  processResponse(response, originalRequest) {
    try {
      if (!response.content || !Array.isArray(response.content) || response.content.length === 0) {
        throw new Error('Invalid response format from Anthropic');
      }

      const textContent = response.content[0];
      if (textContent.type !== 'text') {
        throw new Error('Unexpected content type from Anthropic');
      }

      // Parse JSON response
      let content;
      try {
        content = JSON.parse(textContent.text);
      } catch (parseError) {
        logger.warn('Failed to parse Anthropic JSON response, using text fallback', {
          parseError: parseError.message,
          rawContent: textContent.text.substring(0, 200)
        });

        // Fallback to structured text response
        content = {
          response: textContent.text,
          format: 'text',
          parsing_error: 'Response was not valid JSON'
        };
      }

      // Add response metadata
      const processedResponse = {
        content: content,
        model: response.model || this.config.model,
        usage: {
          input_tokens: response.usage?.input_tokens || 0,
          output_tokens: response.usage?.output_tokens || 0,
          total_tokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
        },
        stop_reason: response.stop_reason,
        provider: 'anthropic',
        timestamp: new Date().toISOString()
      };

      return processedResponse;

    } catch (error) {
      logger.error('Failed to process Anthropic response', {
        error: error.message,
        response: JSON.stringify(response).substring(0, 500)
      });

      throw new Error(`Response processing failed: ${error.message}`);
    }
  }

  /**
   * Make HTTP request to Anthropic API with retry logic
   */
  async makeRequest(endpoint, options) {
    const url = `${this.config.baseURL}${endpoint}`;
    let lastError;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await this.httpRequest(url, {
          ...options,
          headers: { ...this.headers, ...options.headers }
        });

        return response;

      } catch (error) {
        lastError = error;

        // Don't retry for certain errors
        if (error.status === 401 || error.status === 403) {
          throw error;
        }

        // Exponential backoff for retries
        if (attempt < this.config.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          logger.warn(`Anthropic request failed, retrying in ${delay}ms`, {
            attempt,
            error: error.message,
            endpoint
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Low-level HTTP request implementation
   */
  httpRequest(url, options) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: this.config.timeout
      };

      const req = https.request(requestOptions, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsedData = JSON.parse(data);

            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsedData);
            } else {
              const error = new Error(`Anthropic API error: ${parsedData.error?.message || 'Unknown error'}`);
              error.status = res.statusCode;
              error.response = parsedData;
              reject(error);
            }
          } catch (parseError) {
            const error = new Error(`Failed to parse Anthropic response: ${parseError.message}`);
            error.status = res.statusCode;
            error.rawResponse = data;
            reject(error);
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Anthropic request timeout after ${this.config.timeout}ms`));
      });

      req.on('error', (error) => {
        reject(new Error(`Anthropic request failed: ${error.message}`));
      });

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  }

  /**
   * Get provider-specific information
   */
  getProviderInfo() {
    return {
      name: 'Anthropic',
      model: this.config.model,
      maxTokens: this.config.maxTokens,
      features: [
        'text_generation',
        'json_responses',
        'financial_analysis',
        'transaction_classification',
        'ethical_reasoning',
        'safety_focused'
      ],
      pricing: {
        model: this.config.model,
        approximate_cost_per_1k_tokens: 0.003 // Approximate, actual pricing varies
      }
    };
  }
}

module.exports = AnthropicAdapter;