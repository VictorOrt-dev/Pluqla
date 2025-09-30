/**
 * Mistral AI Provider Adapter
 *
 * Implements the AI provider interface for Mistral AI models,
 * handling authentication, request formatting, and response processing.
 */

const https = require('https');
const logger = require('../../../utils/logger');

class MistralAdapter {
  constructor(config) {
    this.config = {
      apiKey: config.apiKey,
      model: config.model || 'mistral-large-latest',
      baseURL: config.baseURL || 'https://api.mistral.ai/v1',
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      maxTokens: config.maxTokens || 4000,
      temperature: config.temperature || 0.7
    };

    this.headers = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Pluqla-AI/1.0'
    };

    // Validate configuration
    if (!this.config.apiKey) {
      throw new Error('Invalid Mistral API key');
    }

    logger.info('Mistral adapter initialized', {
      model: this.config.model,
      baseURL: this.config.baseURL,
      maxTokens: this.config.maxTokens
    });
  }

  /**
   * Test connection to Mistral API
   */
  async testConnection() {
    try {
      const response = await this.makeRequest('/models', {
        method: 'GET'
      });

      if (response.data && Array.isArray(response.data)) {
        logger.info('Mistral connection test successful', {
          modelsCount: response.data.length
        });
        return true;
      }

      throw new Error('Unexpected response format from Mistral');

    } catch (error) {
      logger.error('Mistral connection test failed', {
        error: error.message
      });
      throw new Error(`Mistral connection failed: ${error.message}`);
    }
  }

  /**
   * Generate AI response using Mistral
   */
  async generateResponse(request) {
    const startTime = Date.now();

    try {
      // Convert our request format to Mistral format
      const mistralRequest = this.formatRequest(request);

      // Make the API call
      const response = await this.makeRequest('/chat/completions', {
        method: 'POST',
        body: JSON.stringify(mistralRequest)
      });

      // Process and return the response
      const processedResponse = this.processResponse(response, request);

      logger.info('Mistral response generated successfully', {
        model: this.config.model,
        requestType: request.type,
        duration: Date.now() - startTime,
        usage: processedResponse.usage
      });

      return processedResponse;

    } catch (error) {
      logger.error('Mistral response generation failed', {
        error: error.message,
        requestType: request.type,
        duration: Date.now() - startTime
      });

      throw new Error(`Mistral request failed: ${error.message}`);
    }
  }

  /**
   * Format our request to Mistral API format
   */
  formatRequest(request) {
    // Build the system prompt based on request type
    const systemPrompt = this.buildSystemPrompt(request.type, request.subtype);

    // Build the user message from request data
    const userMessage = this.buildUserMessage(request);

    const mistralRequest = {
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      max_tokens: request.options?.maxTokens || this.config.maxTokens,
      temperature: request.options?.temperature || this.config.temperature,
      stream: false,
      response_format: { type: 'json_object' } // Force JSON response
    };

    return mistralRequest;
  }

  /**
   * Build system prompt based on request type
   */
  buildSystemPrompt(type, subtype) {
    const basePrompt = `You are a professional financial advisor AI assistant specialized in providing accurate, helpful financial guidance. You must always respond in valid JSON format.

CRITICAL RULES:
1. Never request or reference specific personal identifiers
2. Provide actionable, practical advice
3. Always include confidence levels for recommendations
4. Respond only in valid JSON format
5. Keep responses concise but comprehensive
6. Include relevant disclaimers for financial advice`;

    const typeSpecificPrompts = {
      financial_analysis: `${basePrompt}

For financial analysis requests, provide insights on spending patterns, budget optimization, and financial health. Structure your response as:
{
  "analysis": "detailed analysis text",
  "insights": ["key insight 1", "key insight 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "confidence": 0.85,
  "disclaimer": "appropriate financial disclaimer"
}`,

      transaction_classification: `${basePrompt}

For transaction classification, categorize transactions accurately. Structure your response as:
{
  "category": "suggested category",
  "subcategory": "more specific classification",
  "confidence": 0.92,
  "alternatives": ["alternative category 1", "alternative category 2"],
  "reasoning": "explanation of classification decision"
}`,

      financial_insights: `${basePrompt}

For financial insights, provide comprehensive analysis and actionable recommendations. Structure your response as:
{
  "overview": "high-level financial health summary",
  "insights": [
    {
      "type": "insight type",
      "description": "detailed insight",
      "impact": "high|medium|low",
      "action": "recommended action"
    }
  ],
  "trends": ["positive trend 1", "concerning trend 1"],
  "recommendations": [
    {
      "priority": "high|medium|low",
      "action": "specific action to take",
      "expected_impact": "description of expected outcome",
      "timeframe": "suggested timeframe"
    }
  ],
  "confidence": 0.88,
  "disclaimer": "financial advice disclaimer"
}`,

      spending_recommendations: `${basePrompt}

For spending recommendations, provide specific, actionable advice. Structure your response as:
{
  "summary": "overview of current spending situation",
  "recommendations": [
    {
      "category": "spending category",
      "current_amount": "estimated current spending",
      "recommended_amount": "suggested spending target",
      "savings_potential": "estimated monthly savings",
      "difficulty": "easy|moderate|challenging",
      "actions": ["specific action 1", "specific action 2"]
    }
  ],
  "priority_areas": ["area 1", "area 2"],
  "quick_wins": ["easy savings opportunity 1", "easy savings opportunity 2"],
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
    message += '\nData to analyze:\n';
    message += JSON.stringify(request.data, null, 2);

    // Add specific guidance based on request type
    if (request.type === 'transaction_classification') {
      message += '\n\nPlease classify this transaction and explain your reasoning.';
    } else if (request.type === 'financial_analysis') {
      message += '\n\nPlease analyze this financial data and provide insights and recommendations.';
    } else if (request.type === 'financial_insights') {
      message += '\n\nPlease generate comprehensive financial insights and actionable recommendations.';
    } else if (request.type === 'spending_recommendations') {
      message += '\n\nPlease analyze spending patterns and provide specific recommendations for optimization.';
    }

    return message;
  }

  /**
   * Process Mistral response and standardize format
   */
  processResponse(response, originalRequest) {
    try {
      if (!response.choices || !response.choices[0]) {
        throw new Error('Invalid response format from Mistral');
      }

      const choice = response.choices[0];

      // Parse JSON response
      let content;
      try {
        content = JSON.parse(choice.message.content);
      } catch (parseError) {
        logger.warn('Failed to parse Mistral JSON response, using text fallback', {
          parseError: parseError.message,
          rawContent: choice.message.content.substring(0, 200)
        });

        // Fallback to structured text response
        content = {
          response: choice.message.content,
          format: 'text',
          parsing_error: 'Response was not valid JSON'
        };
      }

      // Add response metadata
      const processedResponse = {
        content: content,
        model: response.model || this.config.model,
        usage: {
          prompt_tokens: response.usage?.prompt_tokens || 0,
          completion_tokens: response.usage?.completion_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0
        },
        finish_reason: choice.finish_reason,
        provider: 'mistral',
        timestamp: new Date().toISOString()
      };

      return processedResponse;

    } catch (error) {
      logger.error('Failed to process Mistral response', {
        error: error.message,
        response: JSON.stringify(response).substring(0, 500)
      });

      throw new Error(`Response processing failed: ${error.message}`);
    }
  }

  /**
   * Make HTTP request to Mistral API with retry logic
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
          logger.warn(`Mistral request failed, retrying in ${delay}ms`, {
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
              const error = new Error(`Mistral API error: ${parsedData.error?.message || 'Unknown error'}`);
              error.status = res.statusCode;
              error.response = parsedData;
              reject(error);
            }
          } catch (parseError) {
            const error = new Error(`Failed to parse Mistral response: ${parseError.message}`);
            error.status = res.statusCode;
            error.rawResponse = data;
            reject(error);
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Mistral request timeout after ${this.config.timeout}ms`));
      });

      req.on('error', (error) => {
        reject(new Error(`Mistral request failed: ${error.message}`));
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
      name: 'Mistral',
      model: this.config.model,
      maxTokens: this.config.maxTokens,
      features: [
        'text_generation',
        'json_responses',
        'financial_analysis',
        'multilingual',
        'cost_effective'
      ],
      pricing: {
        model: this.config.model,
        approximate_cost_per_1k_tokens: 0.0007 // Approximate, actual pricing varies
      }
    };
  }
}

module.exports = MistralAdapter;