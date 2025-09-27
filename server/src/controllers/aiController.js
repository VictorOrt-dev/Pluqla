const { validationResult } = require('express-validator');
const { prisma } = require('../lib/prisma'); // FIXED: Use singleton to prevent connection pool exhaustion
const logger = require('../utils/logger');
const aiService = require('../services/aiService');
const analyticsService = require('../services/analyticsService');
const cacheService = require('../services/cacheService');

/**
 * Controller pour les fonctionnalités IA de Pluqla
 * Gère les suggestions, analyses, prédictions et recommandations personnalisées
 */
const aiController = {
  /**
   * Obtient des suggestions IA pour une catégorie donnée
   * @route GET /api/ai/suggestions
   * @access Private
   */
  async getSuggestions(req, res) {
    try {
      const userId = req.user.id;
      const { category = 'general', limit = 5, lang = 'fr' } = req.query;

      // Validation des catégories
      const validCategories = ['general', 'alimentation', 'habits', 'activite', 'deplacement'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: 'Catégorie invalide'
        });
      }

      // Validation des langues
      const validLanguages = ['fr', 'en', 'es'];
      const normalizedLang = lang.toLowerCase().slice(0, 2); // Normaliser 'en-US' -> 'en'
      if (!validLanguages.includes(normalizedLang)) {
        return res.status(400).json({
          success: false,
          message: 'Langue non supportée'
        });
      }

      // Vérifier les limites pour les utilisateurs free
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isPremium: true, plansUsedThisMonth: true }
      });

      if (!user.isPremium && user.plansUsedThisMonth >= 5) {
        return res.status(429).json({
          success: false,
          message: 'Limite mensuelle de suggestions atteinte. Passez à Premium pour plus de suggestions.',
          remainingPlans: 0
        });
      }

      // Construire le contexte utilisateur avec la langue
      const context = await aiController._buildUserContext(userId);
      context.language = normalizedLang;

      // Obtenir les suggestions IA avec vérification de sécurité
      const rawSuggestions = await aiService.getSuggestions(userId, category, context, normalizedLang);
      const suggestions = Array.isArray(rawSuggestions) ? rawSuggestions : [];

      // Incrémenter le compteur pour les utilisateurs free seulement si des suggestions ont été obtenues
      if (!user.isPremium && suggestions.length > 0) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            plansUsedThisMonth: {
              increment: 1
            }
          }
        });
      }

      // Limiter le nombre de suggestions retournées
      const limitedSuggestions = suggestions.slice(0, parseInt(limit));

      // Tracker l'événement
      analyticsService.trackEvent('ai_suggestions_requested', userId, {
        category,
        count: limitedSuggestions.length,
        isPremium: user.isPremium,
        success: limitedSuggestions.length > 0
      });

      res.json({
        success: true,
        data: {
          suggestions: limitedSuggestions,
          category,
          remainingPlans: user.isPremium ? -1 : Math.max(0, 5 - user.plansUsedThisMonth - (suggestions.length > 0 ? 1 : 0)),
          isPremium: user.isPremium,
          hasMore: suggestions.length > parseInt(limit)
        }
      });

    } catch (error) {
      logger.error('Erreur getSuggestions:', error);

      // En cas d'erreur, retourner une réponse structurée avec des suggestions de fallback
      try {
        const fallbackSuggestions = await aiService.getFallbackSuggestions(req.query.category, {});
        const safeFallback = Array.isArray(fallbackSuggestions) ? fallbackSuggestions.slice(0, parseInt(req.query.limit || 5)) : [];

        res.status(503).json({
          success: false,
          message: 'Service IA temporairement indisponible',
          data: {
            suggestions: safeFallback,
            category: req.query.category,
            remainingPlans: user?.isPremium ? -1 : Math.max(0, 5 - (user?.plansUsedThisMonth || 0)),
            isPremium: user?.isPremium || false,
            fallback: true
          },
          error: 'ai_service_unavailable'
        });
      } catch (fallbackError) {
        logger.error('Erreur fallback suggestions:', fallbackError);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la génération des suggestions',
          data: {
            suggestions: [],
            category: req.query.category || 'general',
            remainingPlans: 0,
            isPremium: false
          },
          error: 'service_error'
        });
      }
    }
  },

  /**
   * Obtient des suggestions IA pour une catégorie (version publique pour les tests)
   * @route GET /api/ai/suggestions
   * @access Public
   */
  async getSuggestionsPublic(req, res) {
    try {
      const { category = 'general', limit = 5, lang = 'fr' } = req.query;

      // Validation des catégories
      const validCategories = ['general', 'alimentation', 'habits', 'activite', 'deplacement'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: 'Catégorie invalide'
        });
      }

      // Validation des langues
      const validLanguages = ['fr', 'en', 'es'];
      const normalizedLang = lang.toLowerCase().slice(0, 2);
      if (!validLanguages.includes(normalizedLang)) {
        return res.status(400).json({
          success: false,
          message: 'Langue non supportée'
        });
      }

      // Obtenir les suggestions IA avec contexte minimal
      const context = { language: normalizedLang };
      const rawSuggestions = await aiService.getSuggestions(null, category, context, normalizedLang);
      const suggestions = Array.isArray(rawSuggestions) ? rawSuggestions : [];

      // Limiter le nombre de suggestions retournées
      const limitedSuggestions = suggestions.slice(0, parseInt(limit));

      res.json({
        success: true,
        data: {
          suggestions: limitedSuggestions,
          category,
          remainingPlans: -1, // Illimité pour la version publique
          isPremium: false,
          hasMore: suggestions.length > parseInt(limit)
        }
      });

    } catch (error) {
      logger.error('Erreur getSuggestionsPublic:', error);

      // En cas d'erreur, retourner des suggestions de fallback
      try {
        const fallbackSuggestions = await aiService.getFallbackSuggestions(req.query.category, {});
        const safeFallback = Array.isArray(fallbackSuggestions) ? fallbackSuggestions.slice(0, parseInt(req.query.limit || 5)) : [];

        res.status(503).json({
          success: false,
          message: 'Service IA temporairement indisponible',
          data: {
            suggestions: safeFallback,
            category: req.query.category,
            remainingPlans: -1,
            isPremium: false,
            fallback: true
          },
          error: 'ai_service_unavailable'
        });
      } catch (fallbackError) {
        logger.error('Erreur fallback suggestions publiques:', fallbackError);
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la génération des suggestions',
          data: {
            suggestions: [],
            category: req.query.category || 'general',
            remainingPlans: -1,
            isPremium: false
          },
          error: 'service_error'
        });
      }
    }
  },

  /**
   * Évalue une suggestion (like/dislike pour améliorer l'IA)
   * @route POST /api/ai/suggestions/:suggestionId/rate
   * @access Private
   */
  async rateSuggestion(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const { suggestionId } = req.params;
      const { rating, feedback } = req.body; // rating: 1-5, feedback: optionnel

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'La note doit être entre 1 et 5'
        });
      }

      // Stocker le feedback dans les analytics
      analyticsService.trackEvent('suggestion_rated', userId, {
        suggestionId,
        rating: parseInt(rating),
        hasFeedback: !!feedback,
        timestamp: new Date().toISOString()
      });

      // Donner des points de gamification pour le feedback
      await prisma.user.update({
        where: { id: userId },
        data: {
          gamificationPoints: {
            increment: 5 // 5 points pour chaque évaluation
          }
        }
      });

      logger.info(`Suggestion évaluée: ${suggestionId} avec note ${rating} par utilisateur ${userId}`);

      res.json({
        success: true,
        message: 'Évaluation enregistrée avec succès',
        data: {
          pointsEarned: 5
        }
      });

    } catch (error) {
      logger.error('Erreur rateSuggestion:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'enregistrement de l\'évaluation'
      });
    }
  },

  /**
   * Obtient des suggestions hautement personnalisées basées sur l'historique utilisateur
   * @route GET /api/ai/personalized-suggestions
   * @access Private
   */
  async getPersonalizedSuggestions(req, res) {
    try {
      const userId = req.user.id;
      const { categories = 'all', includeAnalysis = false } = req.query;

      // Vérifier les limites Premium
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isPremium: true, plansUsedThisMonth: true }
      });

      if (!user.isPremium && user.plansUsedThisMonth >= 5) {
        return res.status(429).json({
          success: false,
          message: 'Fonctionnalité Premium requise',
          requiresPremium: true
        });
      }

      // Vérifier le cache
      const cacheKey = `personalized_suggestions_${userId}_${categories}`;
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        return res.json({ success: true, data: cached });
      }

      // Construire un contexte utilisateur détaillé
      const context = await this._buildDetailedUserContext(userId);

      // Obtenir des suggestions pour chaque catégorie demandée
      let targetCategories = ['alimentation', 'habits', 'activite', 'deplacement'];
      if (categories !== 'all') {
        targetCategories = categories.split(',').filter(cat =>
          ['alimentation', 'habits', 'activite', 'deplacement'].includes(cat)
        );
      }

      const suggestionPromises = targetCategories.map(async (category) => {
        const suggestions = await aiService.getSuggestions(userId, category, context);
        return {
          category,
          suggestions: suggestions.slice(0, 3) // Top 3 pour chaque catégorie
        };
      });

      const categorySuggestions = await Promise.all(suggestionPromises);

      // Générer une analyse si demandée
      let analysis = null;
      if (includeAnalysis === 'true') {
        analysis = await this._generateUserAnalysis(userId, context);
      }

      const result = {
        suggestions: categorySuggestions,
        analysis,
        generatedAt: new Date().toISOString(),
        isPremium: user.isPremium
      };

      // Mettre en cache pour 30 minutes
      await cacheService.set(cacheKey, result, 1800);

      // Incrémenter le compteur si pas Premium
      if (!user.isPremium) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            plansUsedThisMonth: {
              increment: 1
            }
          }
        });
      }

      // Tracker l'événement
      analyticsService.trackEvent('personalized_suggestions_requested', userId, {
        categories: targetCategories,
        includeAnalysis: includeAnalysis === 'true'
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Erreur getPersonalizedSuggestions:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération des suggestions personnalisées'
      });
    }
  },

  /**
   * Génère des suggestions basées sur l'analyse d'une image
   * @route POST /api/ai/analyze-image
   * @access Private
   */
  async generateSuggestionsFromImage(req, res) {
    try {
      const userId = req.user.id;
      const { imageId, analysisType = 'general' } = req.body;

      if (!imageId) {
        return res.status(400).json({
          success: false,
          message: 'ID d\'image requis'
        });
      }

      // Vérifier que l'image existe et appartient à l'utilisateur
      const image = await prisma.image.findFirst({
        where: {
          id: imageId,
          OR: [
            { userId },
            { userId: null } // Images publiques
          ]
        }
      });

      if (!image) {
        return res.status(404).json({
          success: false,
          message: 'Image non trouvée'
        });
      }

      // Vérifier les limites Premium pour l'analyse d'images
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isPremium: true, plansUsedThisMonth: true }
      });

      if (!user.isPremium && user.plansUsedThisMonth >= 3) {
        return res.status(429).json({
          success: false,
          message: 'Limite d\'analyse d\'images atteinte. Premium requis pour plus d\'analyses.',
          requiresPremium: true
        });
      }

      // Analyser l'image si pas déjà fait
      let analysisData = null;
      if (image.analyzed && image.analysisData) {
        analysisData = JSON.parse(image.analysisData);
      } else {
        try {
          // Utiliser aiService pour analyser l'image
          analysisData = await aiService.analyzeImage(image.path, analysisType);

          // Sauvegarder les résultats
          await prisma.image.update({
            where: { id: imageId },
            data: {
              analyzed: true,
              analysisData: JSON.stringify(analysisData)
            }
          });
        } catch (aiError) {
          logger.error('Erreur analyse IA image:', aiError);
          return res.status(503).json({
            success: false,
            message: 'Service d\'analyse temporairement indisponible'
          });
        }
      }

      // Générer des suggestions basées sur l'analyse
      const context = await this._buildUserContext(userId);
      const suggestions = await this._generateSuggestionsFromAnalysis(analysisData, context, analysisType);

      // Incrémenter le compteur si pas Premium
      if (!user.isPremium) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            plansUsedThisMonth: {
              increment: 1
            }
          }
        });
      }

      // Tracker l'événement
      analyticsService.trackEvent('image_analyzed', userId, {
        imageId,
        analysisType,
        suggestionsCount: suggestions.length
      });

      res.json({
        success: true,
        data: {
          analysis: analysisData,
          suggestions,
          imageId,
          analyzedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Erreur generateSuggestionsFromImage:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'analyse de l\'image'
      });
    }
  },

  // Méthodes spécialisées par catégorie
  /**
   * Obtient des suggestions spécialisées pour l'alimentation
   * @route GET /api/ai/food-suggestions
   * @access Private
   */
  async getFoodSuggestions(req, res) {
    try {
      const userId = req.user.id;
      const { includeRecipes = false } = req.query;

      // Vérifier les limites
      const rateLimit = await this._checkRateLimit(userId);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          success: false,
          message: 'Limite mensuelle atteinte',
          requiresPremium: rateLimit.requiresPremium
        });
      }

      const context = await this._buildUserContext(userId);
      const rawSuggestions = await aiService.getSuggestions(userId, 'alimentation', context);
      const suggestions = Array.isArray(rawSuggestions) ? rawSuggestions : [];

      let recipes = [];
      if (includeRecipes === 'true') {
        // Récupérer des recettes recommandées
        try {
          recipes = await prisma.recipe.findMany({
            where: {
              isActive: true,
              category: {
                in: ['economique', 'facile', 'rapide']
              }
            },
            orderBy: { estimatedPrice: 'asc' },
            take: 5
          });
        } catch (recipeError) {
          logger.warn('Erreur récupération recettes:', recipeError);
          recipes = [];
        }
      }

      // Incrémenter le compteur seulement si des suggestions ont été obtenues
      if (!context.user?.isPremium && suggestions.length > 0) {
        await prisma.user.update({
          where: { id: userId },
          data: { plansUsedThisMonth: { increment: 1 } }
        });
      }

      analyticsService.trackEvent('food_suggestions_requested', userId, {
        suggestionsCount: suggestions.length,
        recipesIncluded: includeRecipes === 'true',
        recipesFound: recipes.length
      });

      res.json({
        success: true,
        data: {
          suggestions,
          recipes: Array.isArray(recipes) ? recipes : [],
          category: 'alimentation',
          hasMore: false
        }
      });

    } catch (error) {
      logger.error('Erreur getFoodSuggestions:', error);

      // Retourner des suggestions de fallback
      try {
        const fallbackSuggestions = await aiService.getFallbackSuggestions('alimentation', {});
        res.status(503).json({
          success: false,
          message: 'Service IA temporairement indisponible',
          data: {
            suggestions: Array.isArray(fallbackSuggestions) ? fallbackSuggestions : [],
            recipes: [],
            category: 'alimentation',
            fallback: true
          },
          error: 'service_unavailable'
        });
      } catch (fallbackError) {
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la génération des suggestions alimentaires',
          data: {
            suggestions: [],
            recipes: [],
            category: 'alimentation'
          },
          error: 'service_error'
        });
      }
    }
  },

  /**
   * Obtient des suggestions pour améliorer les habitudes de consommation
   * @route GET /api/ai/habit-suggestions
   * @access Private
   */
  async getHabitSuggestions(req, res) {
    return this._getCategorySuggestions(req, res, 'habits', 'habit_suggestions_requested', 'Erreur lors de la génération des suggestions d\'habitudes');
  },

  /**
   * Obtient des suggestions d'activités économiques
   * @route GET /api/ai/activity-suggestions
   * @access Private
   */
  async getActivitySuggestions(req, res) {
    return this._getCategorySuggestions(req, res, 'activite', 'activity_suggestions_requested', 'Erreur lors de la génération des suggestions d\'activités');
  },

  /**
   * Obtient des suggestions pour optimiser les déplacements
   * @route GET /api/ai/transport-suggestions
   * @access Private
   */
  async getTransportSuggestions(req, res) {
    return this._getCategorySuggestions(req, res, 'deplacement', 'transport_suggestions_requested', 'Erreur lors de la génération des suggestions de transport');
  },

  // Analyse des données
  async analyzeUserData(req, res) {
    try {
      res.json({ message: 'analyzeUserData - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur analyzeUserData:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async analyzeSpendingPattern(req, res) {
    try {
      res.json({ message: 'analyzeSpendingPattern - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur analyzeSpendingPattern:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async analyzeSavingsPotential(req, res) {
    try {
      res.json({ message: 'analyzeSavingsPotential - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur analyzeSavingsPotential:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async analyzeImage(req, res) {
    try {
      res.json({ message: 'analyzeImage - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur analyzeImage:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Recommandations personnalisées
  async getPersonalizedRecommendations(req, res) {
    try {
      res.json({ message: 'getPersonalizedRecommendations - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getPersonalizedRecommendations:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async getDailyRecommendations(req, res) {
    try {
      res.json({ message: 'getDailyRecommendations - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getDailyRecommendations:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async getUserInsights(req, res) {
    try {
      res.json({ message: 'getUserInsights - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getUserInsights:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async getSpendingTrends(req, res) {
    try {
      res.json({ message: 'getSpendingTrends - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getSpendingTrends:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Prédictions
  async predictSavings(req, res) {
    try {
      res.json({ message: 'predictSavings - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur predictSavings:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async predictBudget(req, res) {
    try {
      res.json({ message: 'predictBudget - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur predictBudget:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Feedback et historique
  async submitFeedback(req, res) {
    try {
      res.json({ message: 'submitFeedback - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur submitFeedback:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async getFeedback(req, res) {
    try {
      res.json({ message: 'getFeedback - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getFeedback:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async getSuggestionHistory(req, res) {
    try {
      res.json({ message: 'getSuggestionHistory - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getSuggestionHistory:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Prompt personnalisé
  async processCustomPrompt(req, res) {
    try {
      res.json({ message: 'processCustomPrompt - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur processCustomPrompt:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * Traite une conversation IA interactive avec contexte persistant
   * @route POST /api/ai/chat
   * @access Private
   */
  async processAIChat(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const { message, conversationId, context } = req.body;

      // Validation des paramètres
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Le message ne peut pas être vide'
        });
      }

      if (message.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Le message est trop long (max 1000 caractères)'
        });
      }

      // Vérifier les limites pour les utilisateurs free
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isPremium: true, plansUsedThisMonth: true }
      });

      if (!user.isPremium && user.plansUsedThisMonth >= 10) {
        return res.status(429).json({
          success: false,
          message: 'Limite mensuelle de conversations IA atteinte. Passez à Premium pour plus de conversations.',
          remainingChats: 0
        });
      }

      // Construire le contexte utilisateur enrichi
      const userContext = await aiController._buildUserContext(userId);
      const enrichedContext = {
        ...userContext,
        conversationId: conversationId || `chat_${Date.now()}`,
        userMessage: message,
        additionalContext: context || {}
      };

      // Traiter la conversation avec l'IA
      const response = await aiService.processAIChat(userId, message, enrichedContext);

      // Incrémenter le compteur pour les utilisateurs free
      if (!user.isPremium) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            plansUsedThisMonth: {
              increment: 1
            }
          }
        });
      }

      // Tracker l'événement
      analyticsService.trackEvent('ai_chat_processed', userId, {
        conversationId: enrichedContext.conversationId,
        messageLength: message.length,
        isPremium: user.isPremium,
        hasContext: Boolean(context)
      });

      logger.info(`Conversation IA traitée pour l'utilisateur ${userId}: ${message.slice(0, 50)}...`);

      res.json({
        success: true,
        data: {
          response: response || 'Désolé, je n\'ai pas pu traiter votre demande pour le moment.',
          conversationId: enrichedContext.conversationId,
          remainingChats: user.isPremium ? -1 : Math.max(0, 9 - user.plansUsedThisMonth),
          isPremium: user.isPremium
        }
      });

    } catch (error) {
      logger.error('Erreur processAIChat:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du traitement de la conversation IA'
      });
    }
  },

  // Configuration
  async getAIConfig(req, res) {
    try {
      res.json({ message: 'getAIConfig - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getAIConfig:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async updateAIConfig(req, res) {
    try {
      res.json({ message: 'updateAIConfig - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur updateAIConfig:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async getAIServiceStatus(req, res) {
    try {
      res.json({ message: 'getAIServiceStatus - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getAIServiceStatus:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * Méthodes helper privées pour construction du contexte et analyse
   */

  /**
   * Construit le contexte utilisateur de base
   */
  async _buildUserContext(userId) {
    try {
      const [user, answers, recentTransactions] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            savedAmount: true,
            monthlyGoal: true,
            level: true,
            gamificationPoints: true,
            isPremium: true
          }
        }),
        prisma.userAnswer.findMany({
          where: { userId }
        }),
        prisma.transaction.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 10
        })
      ]);

      const userAnswers = answers.reduce((acc, answer) => {
        acc[answer.key] = answer.value;
        return acc;
      }, {});

      return {
        user,
        preferences: userAnswers,
        recentTransactions: recentTransactions.map(t => ({
          amount: t.amount,
          category: t.category,
          description: t.description,
          date: t.date
        }))
      };
    } catch (error) {
      logger.error('Erreur construction contexte utilisateur:', error);
      return {
        user: null,
        preferences: {},
        recentTransactions: []
      };
    }
  },

  /**
   * Construit un contexte utilisateur détaillé pour les analyses approfondies
   */
  async _buildDetailedUserContext(userId) {
    try {
      const basicContext = await this._buildUserContext(userId);

      const [categoryStats, monthlyTrends, favoriteRecipes] = await Promise.all([
        // Stats par catégorie
        prisma.transaction.groupBy({
          by: ['category'],
          where: { userId },
          _sum: { amount: true },
          _count: { id: true }
        }),
        // Tendance mensuelle des 6 derniers mois
        prisma.$queryRaw`
          SELECT
            strftime('%Y-%m', createdAt) as month,
            category,
            SUM(amount) as total_amount,
            COUNT(*) as transaction_count
          FROM transactions
          WHERE userId = ${userId}
            AND createdAt >= date('now', '-6 months')
          GROUP BY strftime('%Y-%m', createdAt), category
          ORDER BY month ASC
        `,
        // Recettes favorites
        prisma.favoriteRecipe.findMany({
          where: { userId },
          include: { recipe: true },
          take: 5
        })
      ]);

      return {
        ...basicContext,
        analytics: {
          categoryStats: categoryStats.map(stat => ({
            category: stat.category,
            totalAmount: stat._sum.amount || 0,
            transactionCount: stat._count.id || 0
          })),
          monthlyTrends,
          favoriteRecipes: favoriteRecipes.map(fr => fr.recipe.title)
        }
      };
    } catch (error) {
      logger.error('Erreur construction contexte détaillé:', error);
      return this._buildUserContext(userId);
    }
  },

  /**
   * Génère une analyse personnalisée des habitudes utilisateur
   */
  async _generateUserAnalysis(userId, context) {
    try {
      // Analyser les patterns de dépenses
      const spendingAnalysis = this._analyzeSpendingPatterns(context);

      // Générer des insights IA
      const prompt = `
        Analyse les habitudes d'économies de cet utilisateur et fournis des insights personnalisés :
        - Montant total économisé : ${context.user?.savedAmount || 0}€
        - Objectif mensuel : ${context.user?.monthlyGoal || 0}€
        - Transactions récentes : ${context.recentTransactions.length}
        - Catégories préférées : ${context.analytics?.categoryStats?.map(c => c.category).join(', ') || 'Aucune'}

        Fournis 3 insights clés et 3 recommandations d'amélioration.
      `;

      const aiInsights = await aiService.generateInsights(prompt, context);

      return {
        spendingAnalysis,
        aiInsights,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Erreur génération analyse utilisateur:', error);
      return {
        spendingAnalysis: { insights: ['Analyse indisponible'] },
        aiInsights: { insights: ['Service temporairement indisponible'] }
      };
    }
  },

  /**
   * Analyse les patterns de dépenses
   */
  _analyzeSpendingPatterns(context) {
    try {
      const { analytics, recentTransactions } = context;

      if (!analytics || !analytics.categoryStats) {
        return { insights: ['Pas assez de données pour l\'analyse'] };
      }

      const totalSpent = analytics.categoryStats.reduce((sum, cat) => sum + cat.totalAmount, 0);
      const dominantCategory = analytics.categoryStats.reduce((max, cat) =>
        cat.totalAmount > max.totalAmount ? cat : max
      );

      const averageTransaction = recentTransactions.length > 0
        ? recentTransactions.reduce((sum, t) => sum + t.amount, 0) / recentTransactions.length
        : 0;

      return {
        totalSpent,
        dominantCategory: dominantCategory.category,
        averageTransaction: Math.round(averageTransaction * 100) / 100,
        insights: [
          `Votre catégorie principale d'économies est ${dominantCategory.category}`,
          `Montant moyen par transaction : ${Math.round(averageTransaction * 100) / 100}€`,
          `Total économisé dans toutes catégories : ${totalSpent}€`
        ]
      };
    } catch (error) {
      logger.error('Erreur analyse patterns:', error);
      return { insights: ['Erreur d\'analyse'] };
    }
  },

  /**
   * Génère des suggestions basées sur l'analyse d'image
   */
  async _generateSuggestionsFromAnalysis(analysisData, context, analysisType) {
    try {
      // Construire le prompt basé sur le type d'analyse
      let prompt = '';

      switch (analysisType) {
        case 'receipt':
          prompt = `Voici l'analyse d'un reçu : ${JSON.stringify(analysisData)}.
            Génère des suggestions d'économies basées sur ces achats.`;
          break;
        case 'clothing':
          prompt = `Voici l'analyse d'un vêtement : ${JSON.stringify(analysisData)}.
            Suggère des alternatives moins chères ou des occasions d'achat.`;
          break;
        case 'food':
          prompt = `Voici l'analyse d'un produit alimentaire : ${JSON.stringify(analysisData)}.
            Suggère des alternatives plus économiques ou des recettes.`;
          break;
        default:
          prompt = `Analyse cette image : ${JSON.stringify(analysisData)}.
            Génère des suggestions d'économies pertinentes.`;
      }

      // Ajouter le contexte utilisateur
      prompt += `\n\nContexte utilisateur : objectif ${context.user?.monthlyGoal || 0}€/mois,
        économisé ${context.user?.savedAmount || 0}€ au total.`;

      const suggestions = await aiService.generateSuggestionsFromPrompt(prompt, context);

      return Array.isArray(suggestions) ? suggestions.slice(0, 5) : [];
    } catch (error) {
      logger.error('Erreur génération suggestions depuis analyse:', error);
      return [{
        title: 'Suggestion indisponible',
        description: 'Le service de suggestions est temporairement indisponible.',
        category: 'general',
        potentialSaving: 0
      }];
    }
  },

  /**
   * Méthode helper générique pour les suggestions par catégorie
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {string} category - Catégorie de suggestions
   * @param {string} eventName - Nom de l'événement analytics
   * @param {string} errorMessage - Message d'erreur personnalisé
   */
  async _getCategorySuggestions(req, res, category, eventName, errorMessage) {
    try {
      const userId = req.user.id;

      // Vérifier les limites
      const rateLimit = await this._checkRateLimit(userId);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          success: false,
          message: 'Limite mensuelle atteinte',
          data: {
            suggestions: [],
            category,
            requiresPremium: true
          },
          requiresPremium: rateLimit.requiresPremium
        });
      }

      // Construire le contexte et obtenir les suggestions
      const context = await this._buildUserContext(userId);
      const rawSuggestions = await aiService.getSuggestions(userId, category, context);
      const suggestions = Array.isArray(rawSuggestions) ? rawSuggestions : [];

      // Incrémenter le compteur seulement si des suggestions ont été obtenues
      if (!context.user?.isPremium && suggestions.length > 0) {
        await prisma.user.update({
          where: { id: userId },
          data: { plansUsedThisMonth: { increment: 1 } }
        });
      }

      // Tracker l'événement
      analyticsService.trackEvent(eventName, userId, {
        suggestionsCount: suggestions.length,
        success: suggestions.length > 0
      });

      res.json({
        success: true,
        data: {
          suggestions,
          category,
          hasMore: false
        }
      });

    } catch (error) {
      logger.error(`Erreur ${category} suggestions:`, error);

      // Retourner des suggestions de fallback
      try {
        const fallbackSuggestions = await aiService.getFallbackSuggestions(category, {});
        res.status(503).json({
          success: false,
          message: 'Service IA temporairement indisponible',
          data: {
            suggestions: Array.isArray(fallbackSuggestions) ? fallbackSuggestions : [],
            category,
            fallback: true
          },
          error: 'service_unavailable'
        });
      } catch (fallbackError) {
        res.status(500).json({
          success: false,
          message: errorMessage,
          data: {
            suggestions: [],
            category
          },
          error: 'service_error'
        });
      }
    }
  },

  /**
   * Vérifie les limites de taux pour les utilisateurs
   */
  async _checkRateLimit(userId, action = 'suggestion') {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isPremium: true, plansUsedThisMonth: true }
      });

      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      const limits = {
        suggestion: user.isPremium ? -1 : 5, // -1 = illimité
        analysis: user.isPremium ? -1 : 3,
        prediction: user.isPremium ? -1 : 2
      };

      const limit = limits[action] || limits.suggestion;

      if (limit !== -1 && user.plansUsedThisMonth >= limit) {
        return {
          allowed: false,
          remaining: 0,
          requiresPremium: true
        };
      }

      return {
        allowed: true,
        remaining: limit === -1 ? -1 : Math.max(0, limit - user.plansUsedThisMonth),
        requiresPremium: false
      };
    } catch (error) {
      logger.error('Erreur vérification limite taux:', error);
      return { allowed: false, remaining: 0, requiresPremium: true };
    }
  }
};

module.exports = aiController;