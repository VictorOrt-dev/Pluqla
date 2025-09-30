/**
 * Mock AI Provider
 *
 * Testing and fallback provider that returns predefined responses.
 * Useful for:
 * - Development without API keys
 * - Testing and CI/CD pipelines
 * - Graceful degradation when AI providers are unavailable
 *
 * @module mockProvider
 */

const logger = require('../../../utils/logger');

/**
 * Predefined mock responses for different request types
 */
const MOCK_RESPONSES = {
  suggestions: {
    alimentation: [
      { title: 'Planifier les repas à l\'avance', description: 'Préparez un menu hebdomadaire pour éviter les achats impulsifs', category: 'alimentation', potentialSaving: 50 },
      { title: 'Acheter en vrac', description: 'Les produits en vrac sont souvent 20-30% moins chers', category: 'alimentation', potentialSaving: 30 },
      { title: 'Cuisiner plutôt que commander', description: 'Économisez jusqu\'à 200€/mois en cuisinant vous-même', category: 'alimentation', potentialSaving: 200 }
    ],
    habits: [
      { title: 'Comparer avant d\'acheter', description: 'Utilisez des comparateurs de prix en ligne', category: 'habits', potentialSaving: 40 },
      { title: 'Privilégier le seconde-main', description: 'Vêtements et accessoires d\'occasion peuvent être 70% moins chers', category: 'habits', potentialSaving: 100 }
    ],
    activite: [
      { title: 'Activités gratuites en plein air', description: 'Randonnée, vélo, parcs publics - gratuits et sains', category: 'activite', potentialSaving: 60 },
      { title: 'Bibliothèque municipale', description: 'Livres, films, magazines gratuits', category: 'activite', potentialSaving: 30 }
    ],
    deplacement: [
      { title: 'Transports en commun', description: 'Abonnement mensuel vs voiture = 200€ d\'économie', category: 'deplacement', potentialSaving: 200 },
      { title: 'Covoiturage', description: 'Partagez les frais de trajet avec d\'autres', category: 'deplacement', potentialSaving: 80 }
    ]
  },

  analysis: {
    insights: [
      'Vos dépenses en alimentation représentent 35% de votre budget total',
      'Tendance à la baisse de 12% sur les dépenses de transport ce mois-ci',
      'Les dépenses impulsives le week-end représentent 20% de vos sorties d\'argent'
    ],
    recommendations: [
      'Réduisez les dépenses alimentaires de 15% en planifiant vos repas',
      'Continuez à utiliser les transports en commun - excellente économie',
      'Fixez un budget hebdomadaire pour les loisirs du week-end'
    ],
    healthScore: 75,
    summary: 'Bonne gestion financière globale avec quelques opportunités d\'optimisation'
  },

  chat: [
    'Je suis là pour vous aider avec vos finances! Comment puis-je vous aider aujourd\'hui?',
    'C\'est une excellente question. Basé sur vos habitudes, je recommande de...',
    'Vous faites déjà du bon travail! Continuez comme ça et vous atteindrez vos objectifs.'
  ]
};

class MockProvider {
  constructor(config = {}) {
    this.delay = config.delay || 500; // Simulate API latency
    this.shouldFail = config.shouldFail || false; // For testing error handling
    this.failureRate = config.failureRate || 0; // 0-1, probability of random failure

    this.logger = logger;
  }

  /**
   * Test connection (always succeeds for mock)
   */
  async testConnection() {
    await this._simulateDelay(100);
    this.logger.info('Mock provider connection test successful');
    return true;
  }

  /**
   * Generate text completion
   *
   * @param {String} prompt - Text prompt
   * @param {Object} options - Generation options
   * @returns {Object} Mock response
   */
  async generateText(prompt, options = {}) {
    await this._simulateDelay();
    this._maybeThrowError();

    const context = options.context || 'general';
    const content = this._getMockContent(context, prompt);

    return {
      content,
      model: 'mock-gpt-4',
      usage: {
        promptTokens: prompt.length / 4, // Rough estimate
        completionTokens: content.length / 4,
        totalTokens: (prompt.length + content.length) / 4,
      },
      metadata: {
        provider: 'mock',
        duration: `${this.delay}ms`,
        finishReason: 'stop'
      }
    };
  }

  /**
   * Analyze transactions
   *
   * @param {Array} transactions - Array of transactions
   * @param {Object} userContext - User context
   * @returns {Object} Mock analysis
   */
  async analyzeTransactions(transactions, userContext = {}) {
    await this._simulateDelay();
    this._maybeThrowError();

    if (!Array.isArray(transactions) || transactions.length === 0) {
      throw new Error('Transactions array is required and cannot be empty');
    }

    // Calculate real statistics from transactions
    const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const categories = [...new Set(transactions.map(t => t.category))];
    const avgAmount = totalAmount / transactions.length;

    // Generate contextual insights
    const insights = [
      `Analysé ${transactions.length} transactions pour un total de €${totalAmount.toFixed(2)}`,
      `Montant moyen par transaction: €${avgAmount.toFixed(2)}`,
      `Catégories actives: ${categories.join(', ')}`,
      ...MOCK_RESPONSES.analysis.insights.slice(0, 2)
    ];

    const recommendations = [
      `Objectif mensuel: €${userContext.monthlyGoal || 0} - Économies actuelles: €${userContext.savedAmount || 0}`,
      ...MOCK_RESPONSES.analysis.recommendations
    ];

    return {
      insights,
      recommendations,
      healthScore: MOCK_RESPONSES.analysis.healthScore,
      summary: MOCK_RESPONSES.analysis.summary,
      metadata: {
        provider: 'mock',
        duration: `${this.delay}ms`,
        transactionsAnalyzed: transactions.length
      },
      usage: {
        promptTokens: 500,
        completionTokens: 300,
        totalTokens: 800
      }
    };
  }

  /**
   * Classify expenses
   *
   * @param {Array} expenses - Array of expenses
   * @returns {Array} Classified expenses
   */
  async classifyExpenses(expenses) {
    await this._simulateDelay();
    this._maybeThrowError();

    if (!Array.isArray(expenses) || expenses.length === 0) {
      throw new Error('Expenses array is required and cannot be empty');
    }

    // Simple keyword-based classification for mock
    const categoryKeywords = {
      alimentation: ['restaurant', 'supermarché', 'marché', 'boulangerie', 'café', 'nourriture', 'courses'],
      transport: ['essence', 'métro', 'bus', 'train', 'taxi', 'uber', 'parking'],
      logement: ['loyer', 'électricité', 'eau', 'gaz', 'internet', 'assurance'],
      loisirs: ['cinéma', 'concert', 'spectacle', 'sport', 'gym', 'vacances'],
      sante: ['pharmacie', 'médecin', 'dentiste', 'hopital', 'mutuelle'],
      habits: ['vêtements', 'chaussures', 'mode', 'coiffeur'],
      education: ['école', 'université', 'formation', 'livre', 'cours']
    };

    return expenses.map(expense => {
      const description = (expense.description || '').toLowerCase();
      let category = 'autres';
      let confidence = 0.5;

      // Find matching category
      for (const [cat, keywords] of Object.entries(categoryKeywords)) {
        for (const keyword of keywords) {
          if (description.includes(keyword)) {
            category = cat;
            confidence = 0.85;
            break;
          }
        }
        if (confidence > 0.5) break;
      }

      return {
        ...expense,
        category,
        confidence
      };
    });
  }

  /**
   * Conversational chat
   *
   * @param {String} conversationId - Conversation ID
   * @param {String} message - User message
   * @param {Array} history - Conversation history
   * @returns {Object} Chat response
   */
  async chat(conversationId, message, history = []) {
    await this._simulateDelay();
    this._maybeThrowError();

    // Simple response selection based on message content
    let responseText;

    if (message.toLowerCase().includes('économi') || message.toLowerCase().includes('sauv')) {
      responseText = 'Pour économiser plus efficacement, je recommande de suivre la règle du 50/30/20: 50% pour les besoins essentiels, 30% pour les envies, et 20% pour l\'épargne.';
    } else if (message.toLowerCase().includes('budget')) {
      responseText = 'Un bon budget commence par suivre vos dépenses pendant un mois. Ensuite, identifiez les catégories où vous pouvez réduire de 10-15%.';
    } else if (message.toLowerCase().includes('merci')) {
      responseText = 'De rien! Je suis là pour vous aider à atteindre vos objectifs financiers. N\'hésitez pas si vous avez d\'autres questions!';
    } else {
      // Random response from chat templates
      const randomIndex = Math.floor(Math.random() * MOCK_RESPONSES.chat.length);
      responseText = MOCK_RESPONSES.chat[randomIndex];
    }

    return {
      conversationId,
      message: responseText,
      model: 'mock-gpt-4',
      usage: {
        promptTokens: message.length / 4,
        completionTokens: responseText.length / 4,
        totalTokens: (message.length + responseText.length) / 4,
      },
      metadata: {
        provider: 'mock',
        duration: `${this.delay}ms`
      }
    };
  }

  /**
   * Get mock content based on context
   */
  _getMockContent(context, prompt) {
    const promptLower = prompt.toLowerCase();

    if (context === 'financial_analysis' || promptLower.includes('analys')) {
      return JSON.stringify(MOCK_RESPONSES.analysis, null, 2);
    } else if (context === 'classification' || promptLower.includes('classif')) {
      return JSON.stringify([
        { index: 0, category: 'alimentation', confidence: 0.9 },
        { index: 1, category: 'transport', confidence: 0.85 },
        { index: 2, category: 'loisirs', confidence: 0.8 }
      ], null, 2);
    } else if (promptLower.includes('suggestion')) {
      const category = this._detectCategory(prompt);
      const suggestions = MOCK_RESPONSES.suggestions[category] || MOCK_RESPONSES.suggestions.alimentation;
      return JSON.stringify(suggestions, null, 2);
    } else {
      return 'Voici une réponse d\'exemple du fournisseur Mock. Dans un environnement de production, cela serait généré par un vrai modèle d\'IA.';
    }
  }

  /**
   * Detect category from prompt
   */
  _detectCategory(prompt) {
    const categories = ['alimentation', 'habits', 'activite', 'deplacement'];
    for (const cat of categories) {
      if (prompt.toLowerCase().includes(cat)) {
        return cat;
      }
    }
    return 'alimentation';
  }

  /**
   * Simulate API latency
   */
  async _simulateDelay(customDelay) {
    const delay = customDelay || this.delay;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Maybe throw error (for testing error handling)
   */
  _maybeThrowError() {
    if (this.shouldFail) {
      throw new Error('Mock provider configured to fail');
    }

    if (this.failureRate > 0 && Math.random() < this.failureRate) {
      throw new Error('Mock provider random failure');
    }
  }

  /**
   * Get provider name
   */
  getName() {
    return 'mock';
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
      maxTokens: 4000,
      supportedModels: ['mock-gpt-4'],
      isMock: true
    };
  }

  /**
   * Set mock responses (for testing)
   */
  setMockResponses(responses) {
    Object.assign(MOCK_RESPONSES, responses);
  }

  /**
   * Reset to default responses
   */
  resetResponses() {
    // Responses are already defined, no need to reset
    this.logger.info('Mock responses reset to defaults');
  }
}

module.exports = MockProvider;