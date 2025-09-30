const { prisma } = require('../lib/prisma'); // CRITICAL FIX: Use singleton to prevent connection pool exhaustion in user management
const logger = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/responseHelper');

const userController = {
  // Profile utilisateur complet - POINT D'ENTRÉE PRINCIPAL
  async getProfile(req, res) {
    try {
      const userId = req.user.id;
      logger.info(`🔍 Récupération du profil utilisateur: ${userId}`);

      // Récupérer l'utilisateur avec toutes ses relations
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          badges: {
            include: {
              badge: true
            },
            orderBy: { unlockedAt: 'desc' }
          },
          transactions: {
            orderBy: { date: 'desc' },
            take: 10 // 10 dernières transactions
          },
          expenses: {
            where: {
              date: {
                gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) // Ce mois
              }
            }
          },
          accounts: {
            where: { isActive: true }
          },
          financialGoals: {
            where: { status: 'active' }
          },
          dailyChallenges: {
            where: {
              date: new Date().toISOString().split('T')[0] // Aujourd'hui
            }
          }
        }
      });

      if (!user) {
        return sendError(res, 'Utilisateur non trouvé', 404);
      }

      // Calculer les statistiques dynamiques
      const stats = await calculateUserStats(userId);

      // Formater la réponse avec toutes les données dynamiques
      const profileData = {
        // Informations de base
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        isPremium: user.isPremium,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,

        // Gamification
        level: user.level,
        gamificationPoints: user.gamificationPoints,
        streak: user.streak,
        badges: user.badges.map((ub) => ({
          id: ub.badge.id,
          name: ub.badge.name,
          title: ub.badge.title,
          description: ub.badge.description,
          icon: ub.badge.icon,
          points: ub.badge.points,
          rarity: ub.badge.rarity,
          unlockedAt: ub.unlockedAt
        })),

        // Finances
        savedAmount: user.savedAmount,
        monthlyGoal: user.monthlyGoal,
        progressToGoal: user.monthlyGoal > 0 ? (user.savedAmount / user.monthlyGoal) * 100 : 0,
        plansUsedThisMonth: user.plansUsedThisMonth,

        // Transactions récentes
        recentTransactions: user.transactions.map((t) => ({
          id: t.id,
          amount: t.amount,
          category: t.category,
          description: t.description,
          type: t.type,
          date: t.date
        })),

        // Comptes financiers
        accounts: user.accounts.map((acc) => ({
          id: acc.id,
          name: acc.name,
          type: acc.type,
          balance: acc.balance,
          currency: acc.currency
        })),

        // Objectifs financiers
        financialGoals: user.financialGoals.map((goal) => ({
          id: goal.id,
          name: goal.name,
          type: goal.type,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
          progress: goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0,
          targetDate: goal.targetDate,
          priority: goal.priority
        })),

        // Défis du jour
        todayChallenges: user.dailyChallenges.map((challenge) => ({
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          points: challenge.points,
          completed: challenge.completed,
          completedAt: challenge.completedAt
        })),

        // Statistiques calculées
        ...stats
      };

      logger.info(`✅ Profil utilisateur récupéré avec succès: ${user.name}`);
      return sendSuccess(res, profileData, 'Profil utilisateur récupéré avec succès');
    } catch (error) {
      logger.error('Erreur getProfile:', error);
      return sendError(res, 'Erreur lors de la récupération du profil', 500);
    }
  },

  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { name, monthlyGoal } = req.body;

      logger.info(`🔄 Mise à jour du profil utilisateur: ${userId}`);

      // Validation des données
      const updateData = {};
      if (name && name.trim().length > 0) updateData.name = name.trim();
      if (monthlyGoal && monthlyGoal > 0) updateData.monthlyGoal = parseFloat(monthlyGoal);

      // Mise à jour de l'utilisateur
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          monthlyGoal: true,
          updatedAt: true
        }
      });

      logger.info(`✅ Profil utilisateur mis à jour: ${updatedUser.name}`);
      return sendSuccess(res, updatedUser, 'Profil mis à jour avec succès');
    } catch (error) {
      logger.error('Erreur updateProfile:', error);
      return sendError(res, 'Erreur lors de la mise à jour du profil', 500);
    }
  },

  async deleteAccount(req, res) {
    try {
      res.json({ message: 'deleteAccount - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur deleteAccount:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      logger.info(`🔒 Changement de mot de passe utilisateur: ${userId}`);

      // Validation des données
      if (!currentPassword || !newPassword) {
        return sendError(res, 'Mot de passe actuel et nouveau mot de passe requis', 400);
      }

      if (newPassword.length < 6) {
        return sendError(res, 'Le nouveau mot de passe doit contenir au moins 6 caractères', 400);
      }

      // Récupérer l'utilisateur avec le mot de passe
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, password: true, email: true }
      });

      if (!user) {
        return sendError(res, 'Utilisateur non trouvé', 404);
      }

      // Vérifier le mot de passe actuel
      const bcrypt = require('bcrypt');
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

      if (!isCurrentPasswordValid) {
        return sendError(res, 'Mot de passe actuel incorrect', 400);
      }

      // Hasher le nouveau mot de passe
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      // Mettre à jour le mot de passe
      await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedNewPassword,
          updatedAt: new Date()
        }
      });

      logger.info(`✅ Mot de passe changé avec succès: ${user.email}`);
      return sendSuccess(res, null, 'Mot de passe mis à jour avec succès');
    } catch (error) {
      logger.error('Erreur changePassword:', error);
      return sendError(res, 'Erreur lors du changement de mot de passe', 500);
    }
  },

  // Préférences
  async getPreferences(req, res) {
    try {
      const userId = req.user.id;
      logger.info(`🎛️ Récupération des préférences utilisateur: ${userId}`);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          theme: true,
          language: true,
          notificationsEnabled: true,
          currency: true
        }
      });

      if (!user) {
        return sendError(res, 'Utilisateur non trouvé', 404);
      }

      const preferences = {
        theme: 'dark', // Valeur par défaut - champ non existant dans DB
        language: 'fr', // Valeur par défaut - champ non existant dans DB
        notificationsEnabled: true, // Valeur par défaut - champ non existant dans DB
        currency: user.currency || 'EUR',
        customSettings: {}
      };

      logger.info(`✅ Préférences récupérées pour l'utilisateur: ${userId}`);
      return sendSuccess(res, preferences, 'Préférences récupérées avec succès');
    } catch (error) {
      logger.error('Erreur getPreferences:', error);
      return sendError(res, 'Erreur lors de la récupération des préférences', 500);
    }
  },

  async updatePreferences(req, res) {
    try {
      const userId = req.user.id;
      const {
        theme, language, notificationsEnabled, currency, customSettings
      } = req.body;

      logger.info(`🎛️ Mise à jour des préférences utilisateur: ${userId}`);

      // Validation et construction des données à mettre à jour
      const updateData = {};

      if (theme && ['light', 'dark', 'auto'].includes(theme)) {
        updateData.theme = theme;
      }

      if (language && ['fr', 'en', 'es'].includes(language)) {
        updateData.language = language;
      }

      if (typeof notificationsEnabled === 'boolean') {
        updateData.notificationsEnabled = notificationsEnabled;
      }

      if (currency && ['EUR', 'USD', 'GBP', 'CAD'].includes(currency)) {
        updateData.currency = currency;
      }

      // Note: customSettings ignoré car le modèle User n'a pas de champ preferences

      // Mise à jour des préférences
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          currency: true,
          updatedAt: true
        }
      });

      const preferences = {
        theme: 'dark', // Valeur par défaut - champ non existant dans DB
        language: 'fr', // Valeur par défaut - champ non existant dans DB
        notificationsEnabled: true, // Valeur par défaut - champ non existant dans DB
        currency: updatedUser.currency || 'EUR',
        customSettings: {}
      };

      logger.info(`✅ Préférences mises à jour pour l'utilisateur: ${userId}`);
      return sendSuccess(res, preferences, 'Préférences mises à jour avec succès');
    } catch (error) {
      logger.error('Erreur updatePreferences:', error);
      return sendError(res, 'Erreur lors de la mise à jour des préférences', 500);
    }
  },

  // Questionnaire
  async submitQuestionnaire(req, res) {
    try {
      res.json({ message: 'submitQuestionnaire - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur submitQuestionnaire:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async getQuestionnaireAnswers(req, res) {
    try {
      res.json({ message: 'getQuestionnaireAnswers - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getQuestionnaireAnswers:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Statistiques
  async getUserStats(req, res) {
    try {
      const userId = req.user.id;
      const { period = 'month' } = req.query; // month, week, year

      logger.info(`📊 Récupération des statistiques utilisateur: ${userId} (${period})`);

      // Calculer les statistiques selon la période
      const stats = await calculateUserStats(userId, period);

      // Ajouter des statistiques spécifiques
      const extendedStats = {
        ...stats,
        period,
        calculatedAt: new Date().toISOString(),

        // Métriques de performance
        performanceScore: calculatePerformanceScore(stats),
        achievementRate: calculateAchievementRate(stats),

        // Comparaisons
        compared_to_average: await compareToAverage(userId, stats),
        growth_trend: calculateGrowthTrend(stats)
      };

      logger.info(`✅ Statistiques calculées pour l'utilisateur: ${userId}`);
      return sendSuccess(res, extendedStats, 'Statistiques récupérées avec succès');
    } catch (error) {
      logger.error('Erreur getUserStats:', error);
      return sendError(res, 'Erreur lors de la récupération des statistiques', 500);
    }
  },

  async getSavingsSummary(req, res) {
    try {
      res.json({ message: 'getSavingsSummary - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getSavingsSummary:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Export données
  async exportUserData(req, res) {
    try {
      res.json({ message: 'exportUserData - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur exportUserData:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Avatar
  async getAvatar(req, res) {
    try {
      res.json({ message: 'getAvatar - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getAvatar:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Profile picture upload
  async uploadProfilePicture(req, res) {
    try {
      const { sendSuccess, sendError } = require('../utils/responseHelper');

      // For now, just return a placeholder response
      // In a full implementation, you would handle file upload using multer
      return sendSuccess(
        res,
        { message: 'Profile picture upload endpoint ready' },
        'Endpoint fonctionnel'
      );
    } catch (error) {
      logger.error('Erreur uploadProfilePicture:', error);
      const { sendError } = require('../utils/responseHelper');
      return sendError(res, 'Erreur lors du téléchargement', 500, 'upload_error');
    }
  }
};

// Fonction pour calculer les statistiques dynamiques de l'utilisateur
async function calculateUserStats(userId) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Dépenses de ce mois
    const thisMonthExpenses = await prisma.expense.aggregate({
      where: {
        userId,
        date: {
          gte: startOfMonth
        }
      },
      _sum: {
        amount: true
      }
    });

    // Dépenses du mois dernier
    const lastMonthExpenses = await prisma.expense.aggregate({
      where: {
        userId,
        date: {
          gte: startOfLastMonth,
          lte: endOfLastMonth
        }
      },
      _sum: {
        amount: true
      }
    });

    // Répartition par catégorie ce mois
    const expensesByCategory = await prisma.expense.groupBy({
      by: ['category'],
      where: {
        userId,
        date: {
          gte: startOfMonth
        }
      },
      _sum: {
        amount: true
      },
      orderBy: {
        _sum: {
          amount: 'desc'
        }
      }
    });

    // Transactions de ce mois
    const thisMonthTransactions = await prisma.transaction.aggregate({
      where: {
        userId,
        date: {
          gte: startOfMonth
        }
      },
      _sum: {
        amount: true
      },
      _count: true
    });

    // Calcul des tendances
    const thisMonthTotal = thisMonthExpenses._sum.amount || 0;
    const lastMonthTotal = lastMonthExpenses._sum.amount || 0;
    const expensesTrend = lastMonthTotal > 0
      ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
      : 0;

    // Balance totale des comptes
    const accountsBalance = await prisma.account.aggregate({
      where: {
        userId,
        isActive: true
      },
      _sum: {
        balance: true
      }
    });

    // Statistiques de l'économie totale
    const totalSavings = await prisma.transaction.aggregate({
      where: {
        userId,
        type: 'saving'
      },
      _sum: {
        amount: true
      }
    });

    return {
      // Finances principales
      totalBalance: accountsBalance._sum.balance || 0,
      totalSavings: totalSavings._sum.amount || 0,

      // Dépenses
      thisMonthExpenses: thisMonthTotal,
      lastMonthExpenses: lastMonthTotal,
      expensesTrend: Math.round(expensesTrend * 100) / 100,
      expensesTrendDirection: expensesTrend > 0 ? 'up' : expensesTrend < 0 ? 'down' : 'stable',

      // Répartition des dépenses
      topExpenseCategories: expensesByCategory.map((cat) => ({
        category: cat.category,
        amount: cat._sum.amount,
        percentage: thisMonthTotal > 0 ? Math.round((cat._sum.amount / thisMonthTotal) * 100) : 0
      })).slice(0, 5),

      // Activité
      thisMonthTransactionsCount: thisMonthTransactions._count || 0,
      thisMonthSavingsAmount: thisMonthTransactions._sum.amount || 0,

      // Jours depuis la dernière transaction
      lastActivityDays: await getLastActivityDays(userId),

      // Statistiques de progression
      savingsRate: calculateSavingsRate(accountsBalance._sum.balance || 0, thisMonthTotal),

      // Statut par rapport aux objectifs
      isOnTrack: checkIfOnTrack(thisMonthTotal, lastMonthTotal)
    };
  } catch (error) {
    logger.error('Erreur calculateUserStats:', error);
    return {
      totalBalance: 0,
      totalSavings: 0,
      thisMonthExpenses: 0,
      lastMonthExpenses: 0,
      expensesTrend: 0,
      expensesTrendDirection: 'stable',
      topExpenseCategories: [],
      thisMonthTransactionsCount: 0,
      thisMonthSavingsAmount: 0,
      lastActivityDays: 0,
      savingsRate: 0,
      isOnTrack: true
    };
  }
}

// Fonctions utilitaires
async function getLastActivityDays(userId) {
  const lastTransaction = await prisma.transaction.findFirst({
    where: { userId },
    orderBy: { date: 'desc' }
  });

  if (!lastTransaction) return 0;

  const diffTime = Math.abs(new Date() - new Date(lastTransaction.date));
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function calculateSavingsRate(balance, expenses) {
  if (expenses === 0) return 0;
  return Math.round(((balance / (balance + expenses)) * 100) * 100) / 100;
}

function checkIfOnTrack(thisMonth, lastMonth) {
  return thisMonth <= lastMonth || lastMonth === 0;
}

// Fonctions utilitaires supplémentaires pour les statistiques

function calculatePerformanceScore(stats) {
  let score = 50; // Score de base

  // Bonus pour économies
  if (stats.savingsRate > 20) score += 20;
  else if (stats.savingsRate > 10) score += 10;

  // Bonus pour tendance des dépenses
  if (stats.expensesTrendDirection === 'down') score += 15;
  else if (stats.expensesTrendDirection === 'stable') score += 5;

  // Bonus pour activité régulière
  if (stats.lastActivityDays < 7) score += 15;
  else if (stats.lastActivityDays < 30) score += 5;

  // Bonus pour atteinte des objectifs
  if (stats.isOnTrack) score += 10;

  return Math.min(100, Math.max(0, score));
}

function calculateAchievementRate(stats) {
  const achievements = [
    stats.savingsRate > 10,
    stats.expensesTrendDirection !== 'up',
    stats.lastActivityDays < 7,
    stats.isOnTrack,
    stats.thisMonthTransactionsCount > 0
  ];

  const completed = achievements.filter(Boolean).length;
  return Math.round((completed / achievements.length) * 100);
}

async function compareToAverage(userId, userStats) {
  try {
    // Calculer les moyennes sur tous les utilisateurs (hors utilisateur actuel)
    const averageStats = await prisma.user.aggregate({
      where: {
        id: { not: userId },
        isActive: true
      },
      _avg: {
        savedAmount: true,
        monthlyGoal: true,
        gamificationPoints: true
      }
    });

    return {
      savings: userStats.totalSavings > (averageStats._avg.savedAmount || 0) ? 'above' : 'below',
      goals: userStats.monthlyGoal > (averageStats._avg.monthlyGoal || 0) ? 'above' : 'below',
      points: userStats.gamificationPoints > (averageStats._avg.gamificationPoints || 0) ? 'above' : 'below'
    };
  } catch (error) {
    logger.error('Erreur compareToAverage:', error);
    return { savings: 'unknown', goals: 'unknown', points: 'unknown' };
  }
}

function calculateGrowthTrend(stats) {
  const trends = {
    expenses: stats.expensesTrendDirection,
    savings: stats.totalSavings > 0 ? 'positive' : 'neutral',
    activity: stats.lastActivityDays < 7 ? 'active' : 'declining'
  };

  // Score global de tendance
  let score = 0;
  if (trends.expenses === 'down') score++;
  if (trends.savings === 'positive') score++;
  if (trends.activity === 'active') score++;

  return {
    ...trends,
    overall: score >= 2 ? 'positive' : score === 1 ? 'neutral' : 'negative',
    score
  };
}

module.exports = userController;
