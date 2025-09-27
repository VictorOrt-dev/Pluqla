const { validationResult } = require('express-validator');
const { prisma } = require('../lib/prisma'); // FIXED: Use singleton to prevent connection pool exhaustion
const logger = require('../utils/logger');
const analyticsService = require('../services/analyticsService');
const cacheService = require('../services/cacheService');
const aiService = require('../services/aiService');
const strikeService = require('../services/strikeService');

/**
 * Controller pour la gestion des transactions d'économies
 * Gère les transactions CRUD, statistiques, objectifs et analyses
 */
const transactionController = {
  /**
   * Récupère les transactions de l'utilisateur avec pagination et filtres
   * @route GET /api/transactions
   * @access Private
   */
  async getTransactions(req, res) {
    try {
      const userId = req.user.id;
      const {
        page = 1,
        limit = 20,
        category,
        type,
        startDate,
        endDate,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Construire les filtres
      const filters = { userId };
      if (category) filters.category = category;
      if (type) filters.type = type;
      if (startDate || endDate) {
        filters.createdAt = {};
        if (startDate) filters.createdAt.gte = new Date(startDate);
        if (endDate) filters.createdAt.lte = new Date(endDate);
      }

      // Calculer l'offset
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Récupérer les transactions avec pagination
      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where: filters,
          orderBy: { [sortBy]: sortOrder },
          skip: offset,
          take: parseInt(limit)
        }),
        prisma.transaction.count({ where: filters })
      ]);

      // Calculer les métadonnées de pagination
      const totalPages = Math.ceil(total / parseInt(limit));

      // Tracker l'événement
      analyticsService.trackEvent('transactions_viewed', userId, {
        page: parseInt(page),
        filters: Object.keys(filters).filter(key => key !== 'userId')
      });

      res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages,
            hasNext: parseInt(page) < totalPages,
            hasPrev: parseInt(page) > 1
          }
        }
      });

    } catch (error) {
      logger.error('Erreur getTransactions:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des transactions'
      });
    }
  },

  /**
   * Crée une nouvelle transaction d'économie
   * @route POST /api/transactions
   * @access Private
   */
  async createTransaction(req, res) {
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
      const { amount, category, description, type = 'saving', date } = req.body;

      // Validation business rules
      const validCategories = ['alimentation', 'habits', 'activite', 'deplacement'];
      const validTypes = ['saving', 'expense', 'goal'];

      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: 'Catégorie invalide'
        });
      }

      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Type de transaction invalide'
        });
      }

      if (amount <= 0 || amount > 10000) {
        return res.status(400).json({
          success: false,
          message: 'Le montant doit être entre 0.01€ et 10,000€'
        });
      }

      // Transaction Prisma pour garantir la cohérence - timeout augmenté
      const result = await prisma.$transaction(async (tx) => {
        // Créer la transaction
        const transaction = await tx.transaction.create({
          data: {
            userId,
            amount: parseFloat(amount),
            category,
            description: description || `Économie ${category}`,
            type,
            date: date ? new Date(date) : new Date()
          }
        });

        // Mettre à jour le montant total économisé de l'utilisateur
        const user = await tx.user.findUnique({ where: { id: userId } });

        let pointsToAdd = 0;
        let updatedSavedAmount = user.savedAmount;

        if (type === 'saving') {
          updatedSavedAmount += parseFloat(amount);
          // Points basés sur le montant (1 point par euro)
          pointsToAdd = Math.floor(parseFloat(amount));
        }

        // Le streak sera géré après la transaction
        let newStreak = user.streak;

        // Mettre à jour l'utilisateur (le streak est déjà mis à jour par strikeService)
        await tx.user.update({
          where: { id: userId },
          data: {
            savedAmount: updatedSavedAmount,
            gamificationPoints: {
              increment: pointsToAdd
            }
          }
        });

        return { transaction, pointsEarned: pointsToAdd, newStreak };
      }, {
        timeout: 10000 // 10 secondes
      });

      // Gérer le streak après la transaction principale pour éviter les timeouts
      if (type === 'saving') {
        try {
          const { strike, isNewStreak } = await strikeService.updateStrikeAfterSaving(userId);
          result.newStreak = strike;

          // Points bonus pour le streak
          if (isNewStreak && strike > 1) {
            const strikePoints = Math.min(strike * 5, 100);
            await prisma.user.update({
              where: { id: userId },
              data: {
                gamificationPoints: {
                  increment: strikePoints
                }
              }
            });
            result.pointsEarned += strikePoints;
          }
        } catch (error) {
          logger.error('Erreur lors de la mise à jour du strike:', error);
        }
      }

      // Invalider les caches
      await cacheService.delete(`user_profile_${userId}`);
      await cacheService.delete(`user_stats_${userId}`);
      await cacheService.delete(`transaction_stats_${userId}`);

      // Tracker l'événement
      analyticsService.trackEvent('transaction_created', userId, {
        amount: parseFloat(amount),
        category,
        type,
        pointsEarned: result.pointsEarned
      });

      logger.info(`Transaction créée pour l'utilisateur ${userId}: ${amount}€ (${category})`);

      res.status(201).json({
        success: true,
        message: 'Transaction créée avec succès',
        data: {
          transaction: result.transaction,
          pointsEarned: result.pointsEarned,
          newStreak: result.newStreak
        }
      });

    } catch (error) {
      logger.error('Erreur createTransaction:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création de la transaction'
      });
    }
  },

  /**
   * Met à jour une transaction existante
   * @route PUT /api/transactions/:id
   * @access Private
   */
  async updateTransaction(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const userId = req.user.id;
      const { amount, category, description, type, date } = req.body;

      // Vérifier que la transaction existe et appartient à l'utilisateur
      const existingTransaction = await prisma.transaction.findFirst({
        where: { id, userId }
      });

      if (!existingTransaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction non trouvée'
        });
      }

      // Construire les données à mettre à jour
      const updateData = { updatedAt: new Date() };
      let amountChanged = false;

      if (amount !== undefined) {
        if (amount <= 0 || amount > 10000) {
          return res.status(400).json({
            success: false,
            message: 'Le montant doit être entre 0.01€ et 10,000€'
          });
        }
        updateData.amount = parseFloat(amount);
        amountChanged = parseFloat(amount) !== existingTransaction.amount;
      }

      if (category !== undefined) {
        const validCategories = ['alimentation', 'habits', 'activite', 'deplacement'];
        if (!validCategories.includes(category)) {
          return res.status(400).json({
            success: false,
            message: 'Catégorie invalide'
          });
        }
        updateData.category = category;
      }

      if (description !== undefined) updateData.description = description;
      if (type !== undefined) {
        const validTypes = ['saving', 'expense', 'goal'];
        if (!validTypes.includes(type)) {
          return res.status(400).json({
            success: false,
            message: 'Type de transaction invalide'
          });
        }
        updateData.type = type;
      }
      if (date !== undefined) updateData.date = new Date(date);

      // Transaction Prisma pour la cohérence
      const result = await prisma.$transaction(async (tx) => {
        // Mettre à jour la transaction
        const updatedTransaction = await tx.transaction.update({
          where: { id },
          data: updateData
        });

        // Si le montant a changé, recalculer le total économisé
        if (amountChanged && existingTransaction.type === 'saving') {
          const oldAmount = existingTransaction.amount;
          const newAmount = updateData.amount;
          const difference = newAmount - oldAmount;

          await tx.user.update({
            where: { id: userId },
            data: {
              savedAmount: {
                increment: difference
              }
            }
          });
        }

        return updatedTransaction;
      });

      // Invalider les caches
      await cacheService.delete(`user_profile_${userId}`);
      await cacheService.delete(`user_stats_${userId}`);
      await cacheService.delete(`transaction_stats_${userId}`);

      // Tracker l'événement
      analyticsService.trackEvent('transaction_updated', userId, {
        transactionId: id,
        amountChanged
      });

      logger.info(`Transaction mise à jour: ${id}`);
      res.json({
        success: true,
        message: 'Transaction mise à jour avec succès',
        data: result
      });

    } catch (error) {
      logger.error('Erreur updateTransaction:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour de la transaction'
      });
    }
  },

  /**
   * Supprime une transaction
   * @route DELETE /api/transactions/:id
   * @access Private
   */
  async deleteTransaction(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Vérifier que la transaction existe et appartient à l'utilisateur
      const existingTransaction = await prisma.transaction.findFirst({
        where: { id, userId }
      });

      if (!existingTransaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction non trouvée'
        });
      }

      // Transaction Prisma pour la cohérence
      await prisma.$transaction(async (tx) => {
        // Supprimer la transaction
        await tx.transaction.delete({ where: { id } });

        // Ajuster le montant total économisé si c'était une économie
        if (existingTransaction.type === 'saving') {
          await tx.user.update({
            where: { id: userId },
            data: {
              savedAmount: {
                decrement: existingTransaction.amount
              }
            }
          });
        }
      });

      // Invalider les caches
      await cacheService.delete(`user_profile_${userId}`);
      await cacheService.delete(`user_stats_${userId}`);
      await cacheService.delete(`transaction_stats_${userId}`);

      // Tracker l'événement
      analyticsService.trackEvent('transaction_deleted', userId, {
        transactionId: id,
        amount: existingTransaction.amount,
        category: existingTransaction.category
      });

      logger.info(`Transaction supprimée: ${id}`);
      res.json({
        success: true,
        message: 'Transaction supprimée avec succès'
      });

    } catch (error) {
      logger.error('Erreur deleteTransaction:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression de la transaction'
      });
    }
  },

  /**
   * Récupère une transaction spécifique par ID
   * @route GET /api/transactions/:id
   * @access Private
   */
  async getTransactionById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const transaction = await prisma.transaction.findFirst({
        where: { id, userId }
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction non trouvée'
        });
      }

      res.json({
        success: true,
        data: transaction
      });

    } catch (error) {
      logger.error('Erreur getTransactionById:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de la transaction'
      });
    }
  },

  /**
   * Récupère les statistiques globales des transactions
   * @route GET /api/transactions/stats
   * @access Private
   */
  async getTransactionStats(req, res) {
    try {
      const userId = req.user.id;
      const { period = 'all' } = req.query; // all, month, week, year

      // Vérifier le cache
      const cacheKey = `transaction_stats_${userId}_${period}`;
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        return res.json({ success: true, data: cached });
      }

      // Calculer les dates selon la période
      let dateFilter = {};
      const now = new Date();

      switch (period) {
        case 'week':
          dateFilter = {
            createdAt: {
              gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            }
          };
          break;
        case 'month':
          dateFilter = {
            createdAt: {
              gte: new Date(now.getFullYear(), now.getMonth(), 1)
            }
          };
          break;
        case 'year':
          dateFilter = {
            createdAt: {
              gte: new Date(now.getFullYear(), 0, 1)
            }
          };
          break;
        default:
          // Toutes les transactions
          break;
      }

      // Récupérer les statistiques
      const [totalStats, categoryStats, typeStats, recentTrends] = await Promise.all([
        // Statistiques totales
        prisma.transaction.aggregate({
          where: { userId, ...dateFilter },
          _sum: { amount: true },
          _count: { id: true },
          _avg: { amount: true }
        }),
        // Répartition par catégorie
        prisma.transaction.groupBy({
          by: ['category'],
          where: { userId, ...dateFilter },
          _sum: { amount: true },
          _count: { id: true }
        }),
        // Répartition par type
        prisma.transaction.groupBy({
          by: ['type'],
          where: { userId, ...dateFilter },
          _sum: { amount: true },
          _count: { id: true }
        }),
        // Tendance des 30 derniers jours
        prisma.transaction.groupBy({
          by: ['date'],
          where: {
            userId,
            createdAt: {
              gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            }
          },
          _sum: { amount: true },
          _count: { id: true }
        })
      ]);

      const stats = {
        period,
        total: {
          amount: totalStats._sum.amount || 0,
          count: totalStats._count.id || 0,
          average: totalStats._avg.amount || 0
        },
        byCategory: categoryStats.map(cat => ({
          category: cat.category,
          amount: cat._sum.amount || 0,
          count: cat._count.id || 0
        })),
        byType: typeStats.map(type => ({
          type: type.type,
          amount: type._sum.amount || 0,
          count: type._count.id || 0
        })),
        trends: recentTrends.map(trend => ({
          date: trend.date,
          amount: trend._sum.amount || 0,
          count: trend._count.id || 0
        })).sort((a, b) => new Date(a.date) - new Date(b.date))
      };

      // Mettre en cache pour 10 minutes
      await cacheService.set(cacheKey, stats, 600);

      // Tracker l'événement
      analyticsService.trackEvent('transaction_stats_viewed', userId, { period });

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Erreur getTransactionStats:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques'
      });
    }
  },

  /**
   * Récupère les transactions récentes
   * @route GET /api/transactions/recent
   * @access Private
   */
  async getRecentTransactions(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 10 } = req.query;

      const transactions = await prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit)
      });

      res.json({
        success: true,
        data: transactions
      });

    } catch (error) {
      logger.error('Erreur getRecentTransactions:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des transactions récentes'
      });
    }
  },

  /**
   * Récupère un résumé détaillé des transactions
   * @route GET /api/transactions/summary
   * @access Private
   */
  async getTransactionSummary(req, res) {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;

      // Construire les filtres de date
      let dateFilter = {};
      if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.gte = new Date(startDate);
        if (endDate) dateFilter.createdAt.lte = new Date(endDate);
      }

      // Récupérer les données
      const [summary, topCategories, monthlyTrend] = await Promise.all([
        // Résumé général
        prisma.transaction.aggregate({
          where: { userId, ...dateFilter },
          _sum: { amount: true },
          _count: { id: true },
          _min: { amount: true },
          _max: { amount: true }
        }),
        // Top catégories
        prisma.transaction.groupBy({
          by: ['category'],
          where: { userId, ...dateFilter },
          _sum: { amount: true },
          _count: { id: true },
          orderBy: {
            _sum: {
              amount: 'desc'
            }
          }
        }),
        // Tendance mensuelle
        prisma.$queryRaw`
          SELECT
            strftime('%Y-%m', date) as month,
            SUM(amount) as total_amount,
            COUNT(*) as transaction_count
          FROM transactions
          WHERE userId = ${userId}
            AND date >= date('now', '-12 months')
          GROUP BY strftime('%Y-%m', date)
          ORDER BY month ASC
        `
      ]);

      const result = {
        summary: {
          totalAmount: summary._sum.amount || 0,
          totalTransactions: summary._count.id || 0,
          averageAmount: summary._sum.amount && summary._count.id
            ? (summary._sum.amount / summary._count.id)
            : 0,
          minAmount: summary._min.amount || 0,
          maxAmount: summary._max.amount || 0
        },
        topCategories: topCategories.map(cat => ({
          category: cat.category,
          amount: cat._sum.amount || 0,
          count: cat._count.id || 0,
          average: (cat._sum.amount || 0) / (cat._count.id || 1)
        })),
        monthlyTrend: monthlyTrend.map(month => ({
          month: month.month,
          amount: parseFloat(month.total_amount) || 0,
          count: parseInt(month.transaction_count) || 0
        }))
      };

      // Tracker l'événement
      analyticsService.trackEvent('transaction_summary_viewed', userId);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Erreur getTransactionSummary:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du résumé des transactions'
      });
    }
  },

  /**
   * Récupère les statistiques mensuelles détaillées
   * @route GET /api/transactions/monthly-stats
   * @access Private
   */
  async getMonthlyStats(req, res) {
    try {
      const userId = req.user.id;
      const { year, month } = req.query;

      const currentDate = new Date();
      const targetYear = year ? parseInt(year) : currentDate.getFullYear();
      const targetMonth = month ? parseInt(month) - 1 : currentDate.getMonth();

      // Calculer les dates de début et fin du mois
      const startOfMonth = new Date(targetYear, targetMonth, 1);
      const endOfMonth = new Date(targetYear, targetMonth + 1, 0);

      // Récupérer les statistiques du mois
      const [monthStats, dailyStats, user] = await Promise.all([
        // Stats globales du mois
        prisma.transaction.aggregate({
          where: {
            userId,
            createdAt: {
              gte: startOfMonth,
              lte: endOfMonth
            }
          },
          _sum: { amount: true },
          _count: { id: true }
        }),
        // Stats par jour
        prisma.$queryRaw`
          SELECT
            DATE(createdAt) as day,
            SUM(amount) as daily_amount,
            COUNT(*) as daily_count
          FROM transactions
          WHERE userId = ${userId}
            AND createdAt >= ${startOfMonth.toISOString()}
            AND createdAt <= ${endOfMonth.toISOString()}
          GROUP BY DATE(createdAt)
          ORDER BY day ASC
        `,
        // Objectif mensuel de l'utilisateur
        prisma.user.findUnique({
          where: { id: userId },
          select: { monthlyGoal: true }
        })
      ]);

      const monthlyAmount = monthStats._sum.amount || 0;
      const monthlyGoal = user?.monthlyGoal || 0;
      const progressPercentage = monthlyGoal > 0 ? (monthlyAmount / monthlyGoal) * 100 : 0;

      // Calculer les jours restants dans le mois
      const today = new Date();
      const daysInMonth = endOfMonth.getDate();
      const daysPassed = today > endOfMonth ? daysInMonth : today.getDate();
      const daysRemaining = Math.max(0, daysInMonth - daysPassed);

      // Projection pour atteindre l'objectif
      const dailyNeeded = daysRemaining > 0 && monthlyGoal > monthlyAmount
        ? (monthlyGoal - monthlyAmount) / daysRemaining
        : 0;

      const stats = {
        period: {
          year: targetYear,
          month: targetMonth + 1,
          startDate: startOfMonth,
          endDate: endOfMonth
        },
        summary: {
          totalAmount: monthlyAmount,
          totalTransactions: monthStats._count.id || 0,
          monthlyGoal,
          progressPercentage: Math.round(progressPercentage * 100) / 100,
          remainingAmount: Math.max(0, monthlyGoal - monthlyAmount),
          daysInMonth,
          daysPassed,
          daysRemaining,
          averageDaily: daysPassed > 0 ? monthlyAmount / daysPassed : 0,
          projectedDaily: dailyNeeded
        },
        dailyBreakdown: dailyStats.map(day => ({
          date: day.day,
          amount: parseFloat(day.daily_amount) || 0,
          transactions: parseInt(day.daily_count) || 0
        })),
        insights: {
          isOnTrack: progressPercentage >= ((daysPassed / daysInMonth) * 100),
          bestDay: dailyStats.reduce((max, day) =>
            (parseFloat(day.daily_amount) || 0) > (parseFloat(max?.daily_amount) || 0) ? day : max,
            dailyStats[0]
          ),
          averagePerTransaction: monthStats._count.id > 0 ? monthlyAmount / monthStats._count.id : 0
        }
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Erreur getMonthlyStats:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques mensuelles'
      });
    }
  },

  /**
   * Récupère les statistiques par catégorie
   * @route GET /api/transactions/category-stats
   * @access Private
   */
  async getCategoryStats(req, res) {
    try {
      const userId = req.user.id;
      const { category, period = 'all' } = req.query;

      // Calculer les dates selon la période
      let dateFilter = {};
      const now = new Date();

      switch (period) {
        case 'week':
          dateFilter = {
            createdAt: {
              gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            }
          };
          break;
        case 'month':
          dateFilter = {
            createdAt: {
              gte: new Date(now.getFullYear(), now.getMonth(), 1)
            }
          };
          break;
        case 'year':
          dateFilter = {
            createdAt: {
              gte: new Date(now.getFullYear(), 0, 1)
            }
          };
          break;
      }

      let whereClause = { userId, ...dateFilter };
      if (category) {
        whereClause.category = category;
      }

      // Si une catégorie spécifique est demandée
      if (category) {
        const [stats, recentTransactions, trends] = await Promise.all([
          prisma.transaction.aggregate({
            where: whereClause,
            _sum: { amount: true },
            _count: { id: true },
            _avg: { amount: true },
            _min: { amount: true },
            _max: { amount: true }
          }),
          prisma.transaction.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: 5
          }),
          prisma.$queryRaw`
            SELECT
              DATE(createdAt) as date,
              SUM(amount) as amount,
              COUNT(*) as count
            FROM transactions
            WHERE userId = ${userId}
              AND category = ${category}
              AND createdAt >= date('now', '-30 days')
            GROUP BY DATE(createdAt)
            ORDER BY date ASC
          `
        ]);

        const result = {
          category,
          period,
          stats: {
            totalAmount: stats._sum.amount || 0,
            totalTransactions: stats._count.id || 0,
            averageAmount: stats._avg.amount || 0,
            minAmount: stats._min.amount || 0,
            maxAmount: stats._max.amount || 0
          },
          recentTransactions,
          trends: trends.map(trend => ({
            date: trend.date,
            amount: parseFloat(trend.amount) || 0,
            count: parseInt(trend.count) || 0
          }))
        };

        return res.json({
          success: true,
          data: result
        });
      }

      // Sinon, récupérer toutes les catégories
      const [categoryStats, comparison] = await Promise.all([
        prisma.transaction.groupBy({
          by: ['category'],
          where: { userId, ...dateFilter },
          _sum: { amount: true },
          _count: { id: true },
          _avg: { amount: true }
        }),
        // Comparaison avec la période précédente
        prisma.transaction.groupBy({
          by: ['category'],
          where: {
            userId,
            createdAt: {
              gte: new Date(now.getTime() - (period === 'week' ? 14 : period === 'month' ? 60 : 365) * 24 * 60 * 60 * 1000),
              lt: period === 'week'
                ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                : period === 'month'
                ? new Date(now.getFullYear(), now.getMonth() - 1, 1)
                : new Date(now.getFullYear() - 1, 0, 1)
            }
          },
          _sum: { amount: true },
          _count: { id: true }
        })
      ]);

      const totalAmount = categoryStats.reduce((sum, cat) => sum + (cat._sum.amount || 0), 0);

      const result = {
        period,
        totalAmount,
        categories: categoryStats.map(cat => {
          const previousPeriod = comparison.find(c => c.category === cat.category);
          const currentAmount = cat._sum.amount || 0;
          const previousAmount = previousPeriod?._sum.amount || 0;
          const growth = previousAmount > 0 ? ((currentAmount - previousAmount) / previousAmount) * 100 : 0;

          return {
            category: cat.category,
            amount: currentAmount,
            count: cat._count.id || 0,
            average: cat._avg.amount || 0,
            percentage: totalAmount > 0 ? (currentAmount / totalAmount) * 100 : 0,
            growth: Math.round(growth * 100) / 100,
            trend: growth > 5 ? 'up' : growth < -5 ? 'down' : 'stable'
          };
        }).sort((a, b) => b.amount - a.amount)
      };

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Erreur getCategoryStats:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques par catégorie'
      });
    }
  },

  /**
   * Exporte les transactions au format CSV ou JSON
   * @route GET /api/transactions/export
   * @access Private
   */
  async exportTransactions(req, res) {
    try {
      const userId = req.user.id;
      const { format = 'csv', startDate, endDate, category } = req.query;

      // Construire les filtres
      const filters = { userId };
      if (category) filters.category = category;
      if (startDate || endDate) {
        filters.createdAt = {};
        if (startDate) filters.createdAt.gte = new Date(startDate);
        if (endDate) filters.createdAt.lte = new Date(endDate);
      }

      // Récupérer toutes les transactions
      const transactions = await prisma.transaction.findMany({
        where: filters,
        orderBy: { createdAt: 'desc' }
      });

      // Tracker l'événement
      analyticsService.trackEvent('transactions_exported', userId, {
        format,
        count: transactions.length,
        hasFilters: Object.keys(filters).length > 1
      });

      if (format === 'csv') {
        // Export CSV
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');

        // Headers CSV
        let csv = '\ufeffDate,Catégorie,Type,Montant,Description\n'; // \ufeff pour BOM UTF-8

        // Données
        transactions.forEach(transaction => {
          const date = new Date(transaction.createdAt).toLocaleDateString('fr-FR');
          const description = `"${transaction.description.replace(/"/g, '""')}"`; // Échapper les guillemets
          csv += `${date},${transaction.category},${transaction.type},${transaction.amount},${description}\n`;
        });

        res.send(csv);
      } else {
        // Export JSON
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="transactions.json"');

        const exportData = {
          exportDate: new Date().toISOString(),
          filters,
          totalTransactions: transactions.length,
          totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
          transactions: transactions.map(t => ({
            id: t.id,
            date: t.date,
            createdAt: t.createdAt,
            category: t.category,
            type: t.type,
            amount: t.amount,
            description: t.description
          }))
        };

        res.json(exportData);
      }

      logger.info(`Transactions exportées: ${transactions.length} transactions (${format})`);

    } catch (error) {
      logger.error('Erreur exportTransactions:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'export des transactions'
      });
    }
  },

  /**
   * Crée un objectif d'économie (utilise monthlyGoal de User)
   * @route POST /api/transactions/savings-goal
   * @access Private
   */
  async createSavingsGoal(req, res) {
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
      const { monthlyGoal } = req.body;

      if (!monthlyGoal || monthlyGoal <= 0 || monthlyGoal > 10000) {
        return res.status(400).json({
          success: false,
          message: 'L\'objectif mensuel doit être entre 1€ et 10,000€'
        });
      }

      // Mettre à jour l'objectif mensuel
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          monthlyGoal: parseFloat(monthlyGoal)
        },
        select: {
          monthlyGoal: true,
          savedAmount: true
        }
      });

      // Invalider les caches
      await cacheService.delete(`user_profile_${userId}`);
      await cacheService.delete(`user_stats_${userId}`);

      // Tracker l'événement
      analyticsService.trackEvent('savings_goal_set', userId, {
        goal: parseFloat(monthlyGoal)
      });

      logger.info(`Objectif d'économie défini: ${monthlyGoal}€ pour l'utilisateur ${userId}`);

      res.status(201).json({
        success: true,
        message: 'Objectif d\'économie défini avec succès',
        data: {
          monthlyGoal: updatedUser.monthlyGoal,
          currentProgress: updatedUser.savedAmount,
          progressPercentage: Math.round((updatedUser.savedAmount / updatedUser.monthlyGoal) * 100)
        }
      });

    } catch (error) {
      logger.error('Erreur createSavingsGoal:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création de l\'objectif d\'économie'
      });
    }
  },

  /**
   * Récupère l'objectif d'économie et les progrès
   * @route GET /api/transactions/savings-goal
   * @access Private
   */
  async getSavingsGoals(req, res) {
    try {
      const userId = req.user.id;

      // Récupérer l'utilisateur avec ses statistiques
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          monthlyGoal: true,
          savedAmount: true,
          streak: true
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      // Calculer les statistiques du mois en cours
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const monthlyStats = await prisma.transaction.aggregate({
        where: {
          userId,
          type: 'saving',
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        },
        _sum: { amount: true },
        _count: { id: true }
      });

      const monthlyProgress = monthlyStats._sum.amount || 0;
      const progressPercentage = user.monthlyGoal > 0
        ? Math.round((monthlyProgress / user.monthlyGoal) * 100)
        : 0;

      const daysInMonth = endOfMonth.getDate();
      const daysPassed = now.getDate();
      const daysRemaining = Math.max(0, daysInMonth - daysPassed);

      const dailyTarget = user.monthlyGoal / daysInMonth;
      const dailyNeeded = daysRemaining > 0 && user.monthlyGoal > monthlyProgress
        ? (user.monthlyGoal - monthlyProgress) / daysRemaining
        : 0;

      const goalData = {
        monthlyGoal: user.monthlyGoal,
        currentProgress: monthlyProgress,
        totalSaved: user.savedAmount,
        progressPercentage,
        remainingAmount: Math.max(0, user.monthlyGoal - monthlyProgress),
        streak: user.streak,
        monthInfo: {
          daysInMonth,
          daysPassed,
          daysRemaining,
          dailyTarget: Math.round(dailyTarget * 100) / 100,
          dailyNeeded: Math.round(dailyNeeded * 100) / 100
        },
        insights: {
          isOnTrack: progressPercentage >= ((daysPassed / daysInMonth) * 100),
          status: progressPercentage >= 100 ? 'completed'
                : progressPercentage >= 75 ? 'on_track'
                : progressPercentage >= 50 ? 'behind'
                : 'far_behind',
          projectedTotal: daysPassed > 0 ? (monthlyProgress / daysPassed) * daysInMonth : 0
        }
      };

      res.json({
        success: true,
        data: goalData
      });

    } catch (error) {
      logger.error('Erreur getSavingsGoals:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de l\'objectif d\'économie'
      });
    }
  },

  /**
   * Met à jour l'objectif d'économie
   * @route PUT /api/transactions/savings-goal
   * @access Private
   */
  async updateSavingsGoal(req, res) {
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
      const { monthlyGoal } = req.body;

      if (!monthlyGoal || monthlyGoal <= 0 || monthlyGoal > 10000) {
        return res.status(400).json({
          success: false,
          message: 'L\'objectif mensuel doit être entre 1€ et 10,000€'
        });
      }

      // Mettre à jour l'objectif
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          monthlyGoal: parseFloat(monthlyGoal)
        },
        select: {
          monthlyGoal: true,
          savedAmount: true
        }
      });

      // Invalider les caches
      await cacheService.delete(`user_profile_${userId}`);
      await cacheService.delete(`user_stats_${userId}`);

      // Tracker l'événement
      analyticsService.trackEvent('savings_goal_updated', userId, {
        newGoal: parseFloat(monthlyGoal)
      });

      logger.info(`Objectif d'économie mis à jour: ${monthlyGoal}€ pour l'utilisateur ${userId}`);

      res.json({
        success: true,
        message: 'Objectif d\'économie mis à jour avec succès',
        data: {
          monthlyGoal: updatedUser.monthlyGoal,
          currentProgress: updatedUser.savedAmount,
          progressPercentage: Math.round((updatedUser.savedAmount / updatedUser.monthlyGoal) * 100)
        }
      });

    } catch (error) {
      logger.error('Erreur updateSavingsGoal:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour de l\'objectif d\'économie'
      });
    }
  },

  /**
   * Supprime l'objectif d'économie (remet à 0)
   * @route DELETE /api/transactions/savings-goal
   * @access Private
   */
  async deleteSavingsGoal(req, res) {
    try {
      const userId = req.user.id;

      // Remettre l'objectif à 0
      await prisma.user.update({
        where: { id: userId },
        data: {
          monthlyGoal: 0
        }
      });

      // Invalider les caches
      await cacheService.delete(`user_profile_${userId}`);
      await cacheService.delete(`user_stats_${userId}`);

      // Tracker l'événement
      analyticsService.trackEvent('savings_goal_removed', userId);

      logger.info(`Objectif d'économie supprimé pour l'utilisateur ${userId}`);

      res.json({
        success: true,
        message: 'Objectif d\'économie supprimé avec succès'
      });

    } catch (error) {
      logger.error('Erreur deleteSavingsGoal:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression de l\'objectif d\'économie'
      });
    }
  },

  /**
   * Crée plusieurs transactions en une seule opération
   * @route POST /api/transactions/bulk
   * @access Private
   */
  async createBulkTransactions(req, res) {
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
      const { transactions } = req.body;

      // Validation business rules
      const validCategories = ['alimentation', 'habits', 'activite', 'deplacement'];
      const validTypes = ['saving', 'expense', 'goal'];

      if (!Array.isArray(transactions) || transactions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Au moins une transaction doit être fournie'
        });
      }

      if (transactions.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 50 transactions par lot'
        });
      }

      // Valider chaque transaction
      const validationErrors = [];
      let totalSavingsAmount = 0;
      let totalPoints = 0;

      transactions.forEach((transaction, index) => {
        const { amount, category, description, type = 'saving', date } = transaction;

        if (!amount || isNaN(amount) || amount <= 0 || amount > 10000) {
          validationErrors.push(`Transaction ${index + 1}: Le montant doit être entre 0.01€ et 10,000€`);
        }

        if (!validCategories.includes(category)) {
          validationErrors.push(`Transaction ${index + 1}: Catégorie invalide (${category})`);
        }

        if (!validTypes.includes(type)) {
          validationErrors.push(`Transaction ${index + 1}: Type invalide (${type})`);
        }

        if (type === 'saving') {
          totalSavingsAmount += parseFloat(amount);
          totalPoints += Math.floor(parseFloat(amount));
        }
      });

      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Erreurs de validation',
          errors: validationErrors
        });
      }

      // Transaction Prisma pour garantir la cohérence - timeout augmenté pour bulk
      const result = await prisma.$transaction(async (tx) => {
        // Créer toutes les transactions
        const createdTransactions = [];

        for (const transactionData of transactions) {
          const { amount, category, description, type = 'saving', date } = transactionData;

          const transaction = await tx.transaction.create({
            data: {
              userId,
              amount: parseFloat(amount),
              category,
              description: description || `Économie ${category}`,
              type,
              date: date ? new Date(date) : new Date()
            }
          });

          createdTransactions.push(transaction);
        }

        // Mettre à jour le montant total économisé et les points de l'utilisateur
        const user = await tx.user.findUnique({ where: { id: userId } });
        const updatedSavedAmount = user.savedAmount + totalSavingsAmount;

        await tx.user.update({
          where: { id: userId },
          data: {
            savedAmount: updatedSavedAmount,
            gamificationPoints: {
              increment: totalPoints
            }
          }
        });

        return {
          transactions: createdTransactions,
          pointsEarned: totalPoints,
          totalAmount: totalSavingsAmount,
          newStreak: user.streak
        };
      }, {
        timeout: 15000 // 15 secondes pour bulk operations
      });

      // Gérer le streak après la transaction principale pour les économies
      if (totalSavingsAmount > 0) {
        try {
          const { strike, isNewStreak } = await strikeService.updateStrikeAfterSaving(userId);
          result.newStreak = strike;

          // Points bonus pour le streak
          if (isNewStreak && strike > 1) {
            const strikePoints = Math.min(strike * 5, 100);
            await prisma.user.update({
              where: { id: userId },
              data: {
                gamificationPoints: {
                  increment: strikePoints
                }
              }
            });
            result.pointsEarned += strikePoints;
          }
        } catch (error) {
          logger.error('Erreur lors de la mise à jour du strike:', error);
        }
      }

      // Invalider les caches
      await cacheService.delete(`user_profile_${userId}`);
      await cacheService.delete(`user_stats_${userId}`);
      await cacheService.delete(`transaction_stats_${userId}`);

      // Tracker l'événement
      analyticsService.trackEvent('bulk_transactions_created', userId, {
        count: transactions.length,
        totalAmount: totalSavingsAmount,
        pointsEarned: result.pointsEarned,
        categories: [...new Set(transactions.map(t => t.category))]
      });

      logger.info(`Transactions bulk créées pour l'utilisateur ${userId}: ${transactions.length} transactions, ${totalSavingsAmount}€ total`);

      res.status(201).json({
        success: true,
        message: `${transactions.length} transactions créées avec succès`,
        data: {
          transactions: result.transactions,
          count: result.transactions.length,
          totalAmount: result.totalAmount,
          pointsEarned: result.pointsEarned,
          newStreak: result.newStreak
        }
      });

    } catch (error) {
      logger.error('Erreur createBulkTransactions:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création des transactions en lot'
      });
    }
  }
};

module.exports = transactionController;