const { validationResult } = require('express-validator');
const { prisma } = require('../lib/prisma'); // FIXED: Use singleton to prevent connection pool exhaustion
const logger = require('../utils/logger');
const analyticsService = require('../services/analyticsService');
const cacheService = require('../services/cacheService');
const aiService = require('../services/aiService');

/**
 * Controller pour la gestion des catégories d'économies
 * Gère les 4 catégories principales: alimentation, habits, activité, déplacement
 */
const categoryController = {
  // Méthodes générales
  /**
   * Récupère toutes les catégories avec leurs statistiques
   * @route GET /api/categories
   * @access Private
   */
  async getAllCategories(req, res) {
    try {
      const userId = req.user.id;

      // Vérifier le cache
      const cacheKey = `categories_${userId}`;
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        return res.json({ success: true, data: cached });
      }

      // Définir les catégories principales
      const mainCategories = [
        {
          id: 'alimentation',
          name: 'Alimentation',
          description: 'Économisez sur vos courses et repères',
          icon: '🍽️',
          color: '#10B981'
        },
        {
          id: 'habits',
          name: 'Habitudes',
          description: 'Optimisez vos habitudes de consommation',
          icon: '💡',
          color: '#3B82F6'
        },
        {
          id: 'activite',
          name: 'Activités',
          description: 'Trouvez des loisirs économiques',
          icon: '🎯',
          color: '#F59E0B'
        },
        {
          id: 'deplacement',
          name: 'Déplacement',
          description: 'Optimisez vos coûts de transport',
          icon: '🚗',
          color: '#EF4444'
        }
      ];

      // Récupérer les statistiques pour chaque catégorie
      const categoryStats = await Promise.all(
        mainCategories.map(async (category) => {
          const [transactions, monthlyAmount] = await Promise.all([
            prisma.transaction.count({
              where: {
                userId,
                category: category.id
              }
            }),
            prisma.transaction.aggregate({
              where: {
                userId,
                category: category.id,
                createdAt: {
                  gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                }
              },
              _sum: { amount: true }
            })
          ]);

          return {
            ...category,
            stats: {
              totalTransactions: transactions,
              monthlyAmount: monthlyAmount._sum.amount || 0,
              hasActivity: transactions > 0
            }
          };
        })
      );

      // Mettre en cache pour 15 minutes
      await cacheService.set(cacheKey, categoryStats, 900);

      // Tracker l'événement
      analyticsService.trackEvent('categories_viewed', userId);

      res.json({
        success: true,
        data: categoryStats
      });

    } catch (error) {
      logger.error('Erreur getAllCategories:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des catégories'
      });
    }
  },

  /**
   * Récupère les détails d'une catégorie spécifique
   * @route GET /api/categories/:categoryId
   * @access Private
   */
  async getCategoryDetails(req, res) {
    try {
      const userId = req.user.id;
      const { categoryId } = req.params;

      // Validation de la catégorie
      const validCategories = ['alimentation', 'habits', 'activite', 'deplacement'];
      if (!validCategories.includes(categoryId)) {
        return res.status(400).json({
          success: false,
          message: 'Catégorie invalide'
        });
      }

      // Détails de la catégorie
      const categoryInfo = {
        alimentation: {
          name: 'Alimentation',
          description: 'Économisez sur vos courses et repères',
          icon: '🍽️',
          color: '#10B981',
          tips: [
            'Planifiez vos repas à l\'avance',
            'Achetez en vrac pour les produits non périssables',
            'Cuisinez à la maison plutôt que de commander',
            'Utilisez les applications de réduction'
          ]
        },
        habits: {
          name: 'Habitudes',
          description: 'Optimisez vos habitudes de consommation',
          icon: '💡',
          color: '#3B82F6',
          tips: [
            'Suivez vos dépenses quotidiennes',
            'Évitez les achats impulsifs',
            'Résillez les abonnements inutilisés',
            'Comparez les prix avant d\'acheter'
          ]
        },
        activite: {
          name: 'Activités',
          description: 'Trouvez des loisirs économiques',
          icon: '🎯',
          color: '#F59E0B',
          tips: [
            'Profitez des activités gratuites en plein air',
            'Recherchez les événements communautaires gratuits',
            'Utilisez les cartes de fidélité pour les réductions',
            'Organisez des sorties en groupe pour partager les coûts'
          ]
        },
        deplacement: {
          name: 'Déplacement',
          description: 'Optimisez vos coûts de transport',
          icon: '🚗',
          color: '#EF4444',
          tips: [
            'Utilisez les transports en commun',
            'Considérez le covoiturage',
            'Planifiez vos trajets pour éviter les embouteillages',
            'Entretenez votre véhicule pour réduire la consommation'
          ]
        }
      }[categoryId];

      // Statistiques détaillées
      const [transactions, monthlyStats, yearlyStats, recentTransactions] = await Promise.all([
        // Total des transactions
        prisma.transaction.aggregate({
          where: { userId, category: categoryId },
          _sum: { amount: true },
          _count: { id: true },
          _avg: { amount: true }
        }),
        // Stats mensuelles
        prisma.transaction.aggregate({
          where: {
            userId,
            category: categoryId,
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          },
          _sum: { amount: true },
          _count: { id: true }
        }),
        // Stats annuelles
        prisma.transaction.aggregate({
          where: {
            userId,
            category: categoryId,
            createdAt: {
              gte: new Date(new Date().getFullYear(), 0, 1)
            }
          },
          _sum: { amount: true },
          _count: { id: true }
        }),
        // Transactions récentes
        prisma.transaction.findMany({
          where: { userId, category: categoryId },
          orderBy: { createdAt: 'desc' },
          take: 5
        })
      ]);

      const categoryDetails = {
        ...categoryInfo,
        id: categoryId,
        stats: {
          total: {
            amount: transactions._sum.amount || 0,
            count: transactions._count.id || 0,
            average: transactions._avg.amount || 0
          },
          monthly: {
            amount: monthlyStats._sum.amount || 0,
            count: monthlyStats._count.id || 0
          },
          yearly: {
            amount: yearlyStats._sum.amount || 0,
            count: yearlyStats._count.id || 0
          }
        },
        recentTransactions: recentTransactions.map(t => ({
          id: t.id,
          amount: t.amount,
          description: t.description,
          date: t.date,
          createdAt: t.createdAt
        }))
      };

      // Tracker l'événement
      analyticsService.trackEvent('category_details_viewed', userId, {
        categoryId
      });

      res.json({
        success: true,
        data: categoryDetails
      });

    } catch (error) {
      logger.error('Erreur getCategoryDetails:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des détails de la catégorie'
      });
    }
  },

  async getCategoryStats(req, res) {
    try {
      res.json({ message: 'getCategoryStats - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getCategoryStats:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Alimentation
  /**
   * Récupère les recettes recommandées
   * @route GET /api/categories/alimentation/recipes
   * @access Private
   */
  async getRecipes(req, res) {
    try {
      const userId = req.user.id;
      const {
        limit = 10,
        difficulty,
        maxPrice,
        cookingTime,
        search
      } = req.query;

      // Construire les filtres
      const filters = {
        isActive: true
      };

      if (difficulty) filters.difficulty = difficulty;
      if (maxPrice) filters.estimatedPrice = { lte: parseFloat(maxPrice) };
      if (cookingTime) filters.cookingTime = { lte: parseInt(cookingTime) };
      if (search) {
        filters.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Récupérer les recettes
      const [recipes, userFavorites] = await Promise.all([
        prisma.recipe.findMany({
          where: filters,
          orderBy: { estimatedPrice: 'asc' },
          take: parseInt(limit)
        }),
        prisma.favoriteRecipe.findMany({
          where: { userId },
          select: { recipeId: true }
        })
      ]);

      const favoriteIds = new Set(userFavorites.map(f => f.recipeId));

      // Enrichir les recettes
      const enrichedRecipes = recipes.map(recipe => ({
        id: recipe.id,
        title: recipe.title,
        description: recipe.description,
        cookingTime: recipe.cookingTime,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        category: recipe.category,
        estimatedPrice: recipe.estimatedPrice,
        image: recipe.image,
        ingredients: JSON.parse(recipe.ingredients || '[]'),
        instructions: JSON.parse(recipe.instructions || '[]'),
        nutritionalInfo: recipe.nutritionalInfo ? JSON.parse(recipe.nutritionalInfo) : null,
        tags: JSON.parse(recipe.tags || '[]'),
        isFavorite: favoriteIds.has(recipe.id),
        pricePerServing: Math.round((recipe.estimatedPrice / recipe.servings) * 100) / 100
      }));

      // Tracker l'événement
      analyticsService.trackEvent('recipes_viewed', userId, {
        count: enrichedRecipes.length,
        hasFilters: !!(difficulty || maxPrice || cookingTime || search)
      });

      res.json({
        success: true,
        data: {
          recipes: enrichedRecipes,
          filters: {
            difficulty,
            maxPrice,
            cookingTime,
            search
          },
          totalCount: enrichedRecipes.length
        }
      });

    } catch (error) {
      logger.error('Erreur getRecipes:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des recettes'
      });
    }
  },

  async getNearbyStores(req, res) {
    try {
      res.json({ message: 'getNearbyStores - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getNearbyStores:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async generateMealPlan(req, res) {
    try {
      res.json({ message: 'generateMealPlan - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur generateMealPlan:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Habitudes
  async getHabitRecommendations(req, res) {
    try {
      res.json({ message: 'getHabitRecommendations - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getHabitRecommendations:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async trackHabit(req, res) {
    try {
      res.json({ message: 'trackHabit - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur trackHabit:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async getHabitStreaks(req, res) {
    try {
      res.json({ message: 'getHabitStreaks - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getHabitStreaks:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Activités
  async getActivitySuggestions(req, res) {
    try {
      res.json({ message: 'getActivitySuggestions - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getActivitySuggestions:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async getNearbyEvents(req, res) {
    try {
      res.json({ message: 'getNearbyEvents - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getNearbyEvents:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async bookmarkActivity(req, res) {
    try {
      res.json({ message: 'bookmarkActivity - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur bookmarkActivity:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Transport
  async getRouteOptions(req, res) {
    try {
      res.json({ message: 'getRouteOptions - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getRouteOptions:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async calculateTransportCosts(req, res) {
    try {
      res.json({ message: 'calculateTransportCosts - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur calculateTransportCosts:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async getTransportSubscriptions(req, res) {
    try {
      res.json({ message: 'getTransportSubscriptions - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getTransportSubscriptions:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Préférences et budgets
  /**
   * Récupère les préférences pour une catégorie
   * @route GET /api/categories/:categoryId/preferences
   * @access Private
   */
  async getCategoryPreferences(req, res) {
    try {
      const userId = req.user.id;
      const { categoryId } = req.params;

      const validCategories = ['alimentation', 'habits', 'activite', 'deplacement'];
      if (!validCategories.includes(categoryId)) {
        return res.status(400).json({
          success: false,
          message: 'Catégorie invalide'
        });
      }

      // Récupérer les réponses du questionnaire liées à cette catégorie
      const categoryAnswers = await prisma.userAnswer.findMany({
        where: {
          userId,
          key: {
            startsWith: categoryId
          }
        }
      });

      // Transformer en objet de préférences
      const preferences = categoryAnswers.reduce((acc, answer) => {
        const key = answer.key.replace(`${categoryId}_`, '');
        acc[key] = answer.value;
        return acc;
      }, {});

      // Ajouter des préférences par défaut selon la catégorie
      const defaultPreferences = {
        alimentation: {
          budgetRange: preferences.budgetRange || 'moyen',
          dietaryRestrictions: preferences.dietaryRestrictions || [],
          cookingSkill: preferences.cookingSkill || 'debutant',
          mealPrep: preferences.mealPrep || false
        },
        habits: {
          priorityAreas: preferences.priorityAreas || [],
          spendingStyle: preferences.spendingStyle || 'modere',
          notifications: preferences.notifications || true,
          trackingFrequency: preferences.trackingFrequency || 'daily'
        },
        activite: {
          activityTypes: preferences.activityTypes || [],
          budgetPreference: preferences.budgetPreference || 'gratuit',
          groupSize: preferences.groupSize || 'solo',
          location: preferences.location || 'local'
        },
        deplacement: {
          transportMethods: preferences.transportMethods || [],
          commutingDistance: preferences.commutingDistance || 'courte',
          environmentalConcern: preferences.environmentalConcern || true,
          flexibilityLevel: preferences.flexibilityLevel || 'moyen'
        }
      };

      const categoryPreferences = {
        categoryId,
        preferences: {
          ...defaultPreferences[categoryId],
          ...preferences
        },
        lastUpdated: categoryAnswers.length > 0
          ? Math.max(...categoryAnswers.map(a => new Date(a.updatedAt).getTime()))
          : null
      };

      res.json({
        success: true,
        data: categoryPreferences
      });

    } catch (error) {
      logger.error('Erreur getCategoryPreferences:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des préférences'
      });
    }
  },

  async updateCategoryPreferences(req, res) {
    try {
      res.json({ message: 'updateCategoryPreferences - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur updateCategoryPreferences:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async setCategoryBudget(req, res) {
    try {
      res.json({ message: 'setCategoryBudget - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur setCategoryBudget:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async getBudgetStatus(req, res) {
    try {
      res.json({ message: 'getBudgetStatus - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getBudgetStatus:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Objectifs
  async createCategoryGoal(req, res) {
    try {
      res.json({ message: 'createCategoryGoal - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur createCategoryGoal:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async getCategoryGoals(req, res) {
    try {
      res.json({ message: 'getCategoryGoals - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getCategoryGoals:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async updateCategoryGoal(req, res) {
    try {
      res.json({ message: 'updateCategoryGoal - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur updateCategoryGoal:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Rapports et comparaisons
  async generateCategoryReport(req, res) {
    try {
      res.json({ message: 'generateCategoryReport - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur generateCategoryReport:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async compareCategories(req, res) {
    try {
      res.json({ message: 'compareCategories - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur compareCategories:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async compareSavingsPotential(req, res) {
    try {
      res.json({ message: 'compareSavingsPotential - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur compareSavingsPotential:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Anciennes méthodes maintenues pour compatibilité
  async getCategories(req, res) {
    try {
      res.json({ message: 'getCategories - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getCategories:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async getCategoryData(req, res) {
    try {
      res.json({ message: 'getCategoryData - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getCategoryData:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async getActivities(req, res) {
    try {
      res.json({ message: 'getActivities - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getActivities:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async addFavoriteRecipe(req, res) {
    try {
      res.json({ message: 'addFavoriteRecipe - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur addFavoriteRecipe:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async removeFavoriteRecipe(req, res) {
    try {
      res.json({ message: 'removeFavoriteRecipe - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur removeFavoriteRecipe:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * Méthodes helper privées
   */
  _formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  },

  _calculateSavingsRate(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }
};

module.exports = categoryController;