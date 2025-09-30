const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');
const { recordAIRequest, recordAICacheHit } = require('./monitoringService');

class AIService {
  constructor() {
    // Configuration des clients IA
    this.openai = process.env.OPENAI_API_KEY
      ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      : null;

    this.anthropic = process.env.ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null;

    this.defaultModel = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS) || 1000;
    this.fallbackSuggestions = this.loadFallbackSuggestions();
  }

  /**
   * Obtenir des suggestions IA pour une catégorie donnée
   * @param {string} userId - ID de l'utilisateur
   * @param {string} category - Catégorie (alimentation, habits, activite, deplacement)
   * @param {Object} context - Contexte utilisateur (réponses questionnaire, historique)
   * @param {string} language - Langue pour les suggestions (fr, en, es)
   * @returns {Promise<Array>} Liste de suggestions (toujours un tableau)
   */
  async getSuggestions(userId, category, context = {}, language = 'fr') {
    try {
      // Vérifier le cache en premier (inclure la langue dans la clé)
      const cacheKey = `ai_suggestions_${userId}_${category}_${language}`;
      const cached = await cacheService.get(cacheKey);

      if (cached && Array.isArray(cached)) {
        logger.info(`Suggestions IA récupérées du cache pour ${userId}, catégorie: ${category}`);
        recordAICacheHit('suggestions');
        return cached;
      }

      let suggestions = [];

      // Tenter d'utiliser l'IA externe
      if (this.openai || this.anthropic) {
        const provider = this.openai ? 'openai' : 'anthropic';
        const startTime = Date.now();

        try {
          const aiSuggestions = await this.generateAISuggestions(category, context, language);
          suggestions = Array.isArray(aiSuggestions) ? aiSuggestions : [];

          const duration = (Date.now() - startTime) / 1000;
          recordAIRequest(provider, 'suggestions', true, duration);
        } catch (aiError) {
          const duration = (Date.now() - startTime) / 1000;
          const errorType = aiError.status === 429 ? 'rate_limit' :
                           aiError.message?.includes('timeout') ? 'timeout' :
                           'api_error';

          recordAIRequest(provider, 'suggestions', false, duration, errorType);
          logger.warn('Erreur IA externe, fallback vers suggestions statiques:', aiError.message);
          suggestions = [];
        }
      }

      // Fallback vers suggestions pré-définies si nécessaire
      if (!Array.isArray(suggestions) || suggestions.length === 0) {
        logger.warn(`Fallback vers suggestions statiques pour catégorie: ${category}`);
        suggestions = this.getFallbackSuggestions(category, context, language);
      }

      // Personnaliser les suggestions selon le contexte utilisateur
      suggestions = this.personalizeSuggestions(suggestions, context);

      // Vérification finale de sécurité
      const safeSuggestions = Array.isArray(suggestions) ? suggestions : [];

      // Mettre en cache les suggestions
      if (safeSuggestions.length > 0) {
        await cacheService.set(cacheKey, safeSuggestions, 3600); // 1 heure
      }

      logger.info(`${safeSuggestions.length} suggestions générées pour ${userId}, catégorie: ${category}`);
      return safeSuggestions;
    } catch (error) {
      // SECURITY FIX: Never log AI service errors that could contain API keys
      logger.logError(error, {
        action: 'ai_suggestions_generation',
        category,
        language,
        hasContext: !!context
      });

      // Retourner les suggestions de fallback en cas d'erreur
      const fallbackSuggestions = this.getFallbackSuggestions(category, context, language);
      return Array.isArray(fallbackSuggestions) ? fallbackSuggestions : [];
    }
  }

  /**
   * Générer des suggestions via API IA externe
   * @param {string} category - Catégorie de suggestions
   * @param {Object} context - Contexte utilisateur
   * @param {string} language - Langue pour les suggestions
   * @returns {Promise<Array>} Tableau de suggestions
   */
  async generateAISuggestions(category, context, language = 'fr') {
    const prompt = this.buildPrompt(category, context, language);

    try {
      if (this.openai) {
        const response = await this.openai.chat.completions.create({
          model: this.defaultModel,
          messages: [
            {
              role: 'system',
              content: 'Tu es un assistant IA spécialisé dans les conseils d\'économies personnalisées pour l\'application Pluqla. Réponds UNIQUEMENT en JSON valide avec un tableau de suggestions. Ne pas inclure de texte supplémentaire.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: this.maxTokens,
          temperature: 0.7
        });

        const content = response.choices[0]?.message?.content;
        const parsed = this.parseAIResponse(content, category);
        return Array.isArray(parsed) ? parsed : [];
      }

      if (this.anthropic) {
        const response = await this.anthropic.messages.create({
          model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
          max_tokens: this.maxTokens,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        });

        const parsed = this.parseAIResponse(response.content[0]?.text, category);
        return Array.isArray(parsed) ? parsed : [];
      }

      // Si aucun service IA n'est configuré
      return [];
    } catch (error) {
      // SECURITY FIX: CRITICAL - Never log external AI API errors (contain API keys)
      logger.logError(new Error('AI API request failed'), {
        action: 'external_ai_api_call',
        provider: this.openai ? 'openai' : (this.anthropic ? 'anthropic' : 'none'),
        errorType: error.name || 'unknown'
      });
      throw error;
    }
  }

  /**
   * Construire le prompt pour l'IA
   */
  buildPrompt(category, context, language = 'fr') {
    const languageInstructions = {
      fr: {
        instruction: 'en français',
        difficulty: 'facile|moyen|difficile',
        timeframe: '1 semaine'
      },
      en: {
        instruction: 'in English',
        difficulty: 'easy|medium|hard',
        timeframe: '1 week'
      },
      es: {
        instruction: 'en español',
        difficulty: 'fácil|medio|difícil',
        timeframe: '1 semana'
      }
    };

    const langConfig = languageInstructions[language] || languageInstructions.fr;

    const categoryPrompts = {
      alimentation: `Génère 5 suggestions d'économies pour l'alimentation ${langConfig.instruction}.
        Contexte utilisateur: ${JSON.stringify(context)}

        Format JSON attendu:
        [
          {
            "title": "Titre court",
            "description": "Description détaillée de 50-100 mots",
            "estimatedSavings": 25.50,
            "difficulty": "${langConfig.difficulty}",
            "timeframe": "${langConfig.timeframe}",
            "category": "alimentation"
          }
        ]`,

      habits: `Génère 5 suggestions d'habitudes économiques ${langConfig.instruction}.
        Contexte utilisateur: ${JSON.stringify(context)}

        Format JSON avec même structure que alimentation mais category: "habits"`,

      activite: `Génère 5 suggestions d'activités économiques ${langConfig.instruction}.
        Contexte utilisateur: ${JSON.stringify(context)}

        Format JSON avec même structure mais category: "activite"`,

      deplacement: `Génère 5 suggestions d'économies de transport ${langConfig.instruction}.
        Contexte utilisateur: ${JSON.stringify(context)}

        Format JSON avec même structure mais category: "deplacement"`
    };

    return categoryPrompts[category] || categoryPrompts.alimentation;
  }

  /**
   * Parser la réponse IA avec vérifications de sécurité
   * @param {string} content - Contenu de la réponse IA
   * @param {string} category - Catégorie de suggestions
   * @returns {Array} Tableau de suggestions validées
   */
  parseAIResponse(content, category) {
    try {
      if (!content || typeof content !== 'string') {
        logger.warn('Contenu de réponse IA invalide ou vide');
        return [];
      }

      // Nettoyer le contenu pour extraire le JSON
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        logger.warn('Format JSON non trouvé dans la réponse IA');
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const suggestions = Array.isArray(parsed) ? parsed : [parsed];

      // Valider et nettoyer les suggestions
      const validSuggestions = suggestions
        .filter((s) => s && typeof s === 'object' && s.title && s.description)
        .map((s) => ({
          id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: String(s.title).substring(0, 100),
          description: String(s.description).substring(0, 500),
          estimatedSavings: parseFloat(s.estimatedSavings) || 0,
          difficulty: ['facile', 'moyen', 'difficile'].includes(s.difficulty) ? s.difficulty : 'moyen',
          timeframe: s.timeframe || '1 semaine',
          category,
          source: 'ai',
          createdAt: new Date().toISOString()
        }))
        .slice(0, 5); // Maximum 5 suggestions

      return validSuggestions;
    } catch (error) {
      // SECURITY FIX: Don't log AI response parsing errors (could contain prompts/API data)
      logger.logError(new Error('AI response parsing failed'), {
        action: 'ai_response_parsing',
        category,
        hasContent: !!content
      });
      return []; // Retourner un tableau vide au lieu de throw
    }
  }

  /**
   * Personnaliser les suggestions selon le contexte utilisateur
   * @param {Array} suggestions - Tableau de suggestions
   * @param {Object} context - Contexte utilisateur
   * @returns {Array} Suggestions personnalisées
   */
  personalizeSuggestions(suggestions, context) {
    // Vérification de sécurité
    if (!Array.isArray(suggestions)) {
      logger.warn('personalizeSuggestions: suggestions n\'est pas un tableau');
      return [];
    }

    if (!context || !context.userAnswers) {
      return suggestions;
    }

    try {
      const { userAnswers } = context;
      const age = userAnswers.find((a) => a.key === 'age')?.value;
      const budget = userAnswers.find((a) => a.key === 'monthlyBudget')?.value;

      return suggestions.map((suggestion) => {
        if (!suggestion || typeof suggestion !== 'object') {
          return suggestion;
        }

        const personalizedSuggestion = { ...suggestion };

        // Ajuster les économies estimées selon le budget
        if (budget && suggestion.estimatedSavings) {
          const budgetMultiplier = this.getBudgetMultiplier(budget);
          personalizedSuggestion.estimatedSavings = Math.round(suggestion.estimatedSavings * budgetMultiplier * 100) / 100;
        }

        // Ajuster la difficulté selon l'âge
        if (age && age.includes('18-24')) {
          personalizedSuggestion.difficulty = 'facile'; // Plus simple pour les jeunes
        }

        return personalizedSuggestion;
      });
    } catch (error) {
      logger.error('Erreur personnalisation suggestions:', error);
      return suggestions; // Retourner les suggestions originales en cas d'erreur
    }
  }

  /**
   * Multiplier selon le budget utilisateur
   */
  getBudgetMultiplier(budget) {
    const budgetMap = {
      'moins-500': 0.5,
      '500-1000': 0.8,
      '1000-2000': 1.0,
      '2000-3000': 1.5,
      'plus-3000': 2.0
    };

    return budgetMap[budget] || 1.0;
  }

  /**
   * Obtenir des suggestions de fallback pré-définies
   * @param {string} category - Catégorie de suggestions
   * @param {Object} context - Contexte utilisateur
   * @param {string} language - Langue pour les suggestions
   * @returns {Array} Suggestions de fallback
   */
  getFallbackSuggestions(category, context, language = 'fr') {
    try {
      const suggestions = this.fallbackSuggestions?.[language]?.[category] || this.fallbackSuggestions?.fr?.[category] || [];

      if (!Array.isArray(suggestions)) {
        logger.warn(`Fallback suggestions pour ${category} (${language}) n'est pas un tableau`);
        return [];
      }

      return suggestions
        .sort(() => Math.random() - 0.5) // Mélanger
        .slice(0, 5) // Prendre 5 suggestions
        .map((s) => ({
          ...s,
          id: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          source: 'fallback',
          createdAt: new Date().toISOString()
        }));
    } catch (error) {
      logger.error('Erreur récupération fallback suggestions:', error);
      return [];
    }
  }

  /**
   * Charger les suggestions de fallback multilingues
   */
  loadFallbackSuggestions() {
    return {
      fr: {
        alimentation: [
          {
            title: 'Planifiez vos repas hebdomadaires',
            description: 'Établissez un menu pour la semaine et faites une liste de courses précise. Cela évite les achats impulsifs et réduit le gaspillage alimentaire.',
            estimatedSavings: 40,
            difficulty: 'facile',
            timeframe: '1 semaine',
            category: 'alimentation'
          },
          {
            title: 'Cuisinez en grandes quantités',
            description: 'Préparez des plats en grande quantité et congelez les portions. Vous économiserez du temps et de l\'argent en évitant les plats préparés.',
            estimatedSavings: 60,
            difficulty: 'moyen',
            timeframe: '2 semaines',
            category: 'alimentation'
          },
          {
            title: 'Achetez des produits de saison',
            description: 'Privilégiez les fruits et légumes de saison qui sont moins chers et plus savoureux. Visitez les marchés locaux en fin de journée pour de meilleures affaires.',
            estimatedSavings: 25,
            difficulty: 'facile',
            timeframe: '1 mois',
            category: 'alimentation'
          }
        ],
        habits: [
          {
            title: 'Débranchez vos appareils électriques',
            description: 'Débranchez les appareils en veille. Ils consomment de l\'énergie même éteints. Un simple geste qui peut réduire votre facture électrique.',
            estimatedSavings: 15,
            difficulty: 'facile',
            timeframe: '1 mois',
            category: 'habits'
          },
          {
            title: 'Utilisez des ampoules LED',
            description: 'Remplacez progressivement vos ampoules par des LED. Elles consomment 80% moins d\'énergie et durent 10 fois plus longtemps.',
            estimatedSavings: 30,
            difficulty: 'facile',
            timeframe: '6 mois',
            category: 'habits'
          }
        ],
        activite: [
          {
            title: 'Explorez les activités gratuites',
            description: 'Découvrez les parcs, musées gratuits, événements culturels et festivals de votre ville. De nombreuses activités enrichissantes ne coûtent rien.',
            estimatedSavings: 50,
            difficulty: 'facile',
            timeframe: '1 mois',
            category: 'activite'
          }
        ],
        deplacement: [
          {
            title: 'Utilisez les transports en commun',
            description: 'Optez pour les transports en commun au lieu de la voiture. C\'est plus économique, plus écologique et souvent plus rapide en ville.',
            estimatedSavings: 80,
            difficulty: 'moyen',
            timeframe: '1 mois',
            category: 'deplacement'
          }
        ]
      },
      en: {
        alimentation: [
          {
            title: 'Plan your weekly meals',
            description: 'Create a weekly menu and make a precise shopping list. This avoids impulse purchases and reduces food waste.',
            estimatedSavings: 40,
            difficulty: 'easy',
            timeframe: '1 week',
            category: 'alimentation'
          },
          {
            title: 'Cook in large quantities',
            description: 'Prepare large portions and freeze them. You\'ll save time and money by avoiding prepared meals.',
            estimatedSavings: 60,
            difficulty: 'medium',
            timeframe: '2 weeks',
            category: 'alimentation'
          },
          {
            title: 'Buy seasonal products',
            description: 'Choose seasonal fruits and vegetables that are cheaper and tastier. Visit local markets at the end of the day for better deals.',
            estimatedSavings: 25,
            difficulty: 'easy',
            timeframe: '1 month',
            category: 'alimentation'
          }
        ],
        habits: [
          {
            title: 'Unplug your electrical devices',
            description: 'Unplug devices on standby. They consume energy even when turned off. A simple gesture that can reduce your electricity bill.',
            estimatedSavings: 15,
            difficulty: 'easy',
            timeframe: '1 month',
            category: 'habits'
          },
          {
            title: 'Use LED bulbs',
            description: 'Gradually replace your bulbs with LEDs. They consume 80% less energy and last 10 times longer.',
            estimatedSavings: 30,
            difficulty: 'easy',
            timeframe: '6 months',
            category: 'habits'
          }
        ],
        activite: [
          {
            title: 'Explore free activities',
            description: 'Discover parks, free museums, cultural events and festivals in your city. Many enriching activities cost nothing.',
            estimatedSavings: 50,
            difficulty: 'easy',
            timeframe: '1 month',
            category: 'activite'
          }
        ],
        deplacement: [
          {
            title: 'Use public transportation',
            description: 'Choose public transport instead of the car. It\'s more economical, more ecological and often faster in the city.',
            estimatedSavings: 80,
            difficulty: 'medium',
            timeframe: '1 month',
            category: 'deplacement'
          }
        ]
      },
      es: {
        alimentation: [
          {
            title: 'Planifica tus comidas semanales',
            description: 'Crea un menú semanal y haz una lista de compras precisa. Esto evita las compras impulsivas y reduce el desperdicio de alimentos.',
            estimatedSavings: 40,
            difficulty: 'fácil',
            timeframe: '1 semana',
            category: 'alimentation'
          },
          {
            title: 'Cocina en grandes cantidades',
            description: 'Prepara porciones grandes y congélalas. Ahorrarás tiempo y dinero evitando las comidas preparadas.',
            estimatedSavings: 60,
            difficulty: 'medio',
            timeframe: '2 semanas',
            category: 'alimentation'
          }
        ],
        habits: [
          {
            title: 'Desconecta tus aparatos eléctricos',
            description: 'Desconecta los dispositivos en standby. Consumen energía incluso cuando están apagados. Un gesto simple que puede reducir tu factura eléctrica.',
            estimatedSavings: 15,
            difficulty: 'fácil',
            timeframe: '1 mes',
            category: 'habits'
          }
        ],
        activite: [
          {
            title: 'Explora actividades gratuitas',
            description: 'Descubre parques, museos gratuitos, eventos culturales y festivales en tu ciudad. Muchas actividades enriquecedoras no cuestan nada.',
            estimatedSavings: 50,
            difficulty: 'fácil',
            timeframe: '1 mes',
            category: 'activite'
          }
        ],
        deplacement: [
          {
            title: 'Usa el transporte público',
            description: 'Elige el transporte público en lugar del coche. Es más económico, más ecológico y a menudo más rápido en la ciudad.',
            estimatedSavings: 80,
            difficulty: 'medio',
            timeframe: '1 mes',
            category: 'deplacement'
          }
        ]
      }
    };
  }

  /**
   * Analyser une image (reçu, vêtement, etc.)
   */
  async analyzeImage(imageUrl, analysisType = 'general') {
    try {
      if (!this.openai) {
        throw new Error('Service IA non configuré pour l\'analyse d\'image');
      }

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analysez cette image de type "${analysisType}" et fournissez des conseils d'économies en JSON français.`
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        max_tokens: 500
      });

      const analysis = response.choices[0]?.message?.content;
      return this.parseImageAnalysis(analysis, analysisType);
    } catch (error) {
      logger.error('Erreur analyse image IA:', error);
      return this.getDefaultImageAnalysis(analysisType);
    }
  }

  parseImageAnalysis(content, type) {
    try {
      return {
        type,
        analysis: content,
        suggestions: [
          'Conseil personnalisé basé sur votre image',
          'Suggestion d\'économie adaptée'
        ],
        confidence: 0.8,
        processedAt: new Date().toISOString()
      };
    } catch (error) {
      return this.getDefaultImageAnalysis(type);
    }
  }

  getDefaultImageAnalysis(type) {
    const defaults = {
      clothing: {
        analysis: 'Image de vêtement détectée',
        suggestions: ['Vérifiez les prix en ligne avant d\'acheter', 'Considérez les ventes de seconde main']
      },
      receipt: {
        analysis: 'Reçu détecté',
        suggestions: ['Analysez vos dépenses récurrentes', 'Identifiez les postes d\'économie possibles']
      },
      general: {
        analysis: 'Image analysée',
        suggestions: ['Conseil d\'économie général basé sur votre image']
      }
    };

    return {
      type,
      ...defaults[type] || defaults.general,
      confidence: 0.5,
      processedAt: new Date().toISOString()
    };
  }
}

// Export d'une instance singleton
const aiServiceInstance = new AIService();

// Export de fonctions helper pour l'intégration frontend
module.exports = {
  // Instance principale du service
  ...aiServiceInstance,

  // Méthodes liées à l'instance
  getSuggestions: aiServiceInstance.getSuggestions.bind(aiServiceInstance),
  analyzeImage: aiServiceInstance.analyzeImage.bind(aiServiceInstance),

  // Fonction helper pour compatibilité frontend
  async getAISuggestions(userId, category, context = {}) {
    try {
      const suggestions = await aiServiceInstance.getSuggestions(userId, category, context);
      return Array.isArray(suggestions) ? suggestions : [];
    } catch (error) {
      logger.error('Erreur getAISuggestions helper:', error);
      return [];
    }
  },

  // Fonction helper pour générer des insights
  async generateInsights(prompt, context = {}) {
    try {
      if (aiServiceInstance.openai) {
        const response = await aiServiceInstance.openai.chat.completions.create({
          model: aiServiceInstance.defaultModel,
          messages: [{
            role: 'user',
            content: prompt
          }],
          max_tokens: 500,
          temperature: 0.7
        });

        return {
          insights: [response.choices[0]?.message?.content || 'Analyse indisponible'],
          confidence: 0.8
        };
      }

      return {
        insights: ['Service IA temporairement indisponible'],
        confidence: 0.0
      };
    } catch (error) {
      logger.error('Erreur generateInsights:', error);
      return {
        insights: ['Erreur lors de la génération d\'insights'],
        confidence: 0.0
      };
    }
  },

  // Fonction pour générer des suggestions à partir d'un prompt
  async generateSuggestionsFromPrompt(prompt, context = {}) {
    try {
      if (aiServiceInstance.openai) {
        const response = await aiServiceInstance.openai.chat.completions.create({
          model: aiServiceInstance.defaultModel,
          messages: [{
            role: 'user',
            content: `${prompt}\n\nFournis 3-5 suggestions concrètes d'économies en français.`
          }],
          max_tokens: 800,
          temperature: 0.7
        });

        const content = response.choices[0]?.message?.content;
        // Essayer de parser JSON, sinon créer une suggestion basée sur le texte
        try {
          const parsed = JSON.parse(content);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          return [{
            title: 'Suggestion personnalisée',
            description: content || 'Suggestion basée sur votre demande',
            category: 'general',
            potentialSaving: 10
          }];
        }
      }

      return [];
    } catch (error) {
      logger.error('Erreur generateSuggestionsFromPrompt:', error);
      return [];
    }
  },

  // Fonction pour traiter une conversation IA interactive
  async processAIChat(userId, message, context = {}) {
    try {
      const cacheKey = `ai_chat_${userId}_${Date.now()}`;

      logger.info(`Traitement conversation IA pour utilisateur ${userId}: ${message.slice(0, 100)}`);

      if (aiServiceInstance.openai) {
        const response = await aiServiceInstance.openai.chat.completions.create({
          model: aiServiceInstance.defaultModel,
          messages: [{
            role: 'system',
            content: `Tu es l'assistant IA de Pluqla, une application d'économies intelligentes.
                     Tu aides les utilisateurs français à économiser de l'argent avec des conseils pratiques et personnalisés.
                     Réponds toujours en français, de manière claire et concise (max 200 mots).
                     Concentre-toi sur les économies dans les domaines: alimentation, mode/habits, activités, transport.`
          }, {
            role: 'user',
            content: `Contexte utilisateur:
                     Économies totales: ${context.savedAmount || 0}€
                     Objectif mensuel: ${context.monthlyGoal || 0}€
                     Niveau: ${context.level || 1}
                     ${context.additionalContext ? JSON.stringify(context.additionalContext) : ''}

                     Question: ${message}`
          }],
          max_tokens: 300,
          temperature: 0.8
        });

        const aiResponse = response.choices[0]?.message?.content;

        if (aiResponse) {
          // Mettre en cache pour éviter les répétitions
          await cacheService.set(cacheKey, aiResponse, 3600); // 1 heure
          return aiResponse;
        }
      }

      // Fallback si l'IA n'est pas disponible
      return `Merci pour votre question ! Je ne peux pas vous répondre précisément pour le moment,
              mais je vous recommande de consulter nos suggestions d'économies dans l'application.
              N'hésitez pas à réessayer dans quelques minutes.`;
    } catch (error) {
      logger.error('Erreur processAIChat:', error);
      return `Désolé, je ne peux pas traiter votre demande pour le moment.
              Veuillez réessayer plus tard ou consulter nos conseils d'économies dans l'application.`;
    }
  }
};
