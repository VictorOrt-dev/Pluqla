const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const analyticsService = require('../services/analyticsService');
const cacheService = require('../services/cacheService');

const prisma = new PrismaClient();

/**
 * Controller pour les analytics et la gamification
 * Gère le tracking, les dashboards, les métriques et les insights
 */
const analyticsController = {
  /**
   * Trace un événement analytique
   * @route POST /api/analytics/track
   * @access Private
   */
  async trackEvent(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const userId = req.user?.id;
      const { type, eventName, properties = {}, sessionId } = req.body;

      // Support both 'type' and 'eventName' for backward compatibility
      const eventType = type || eventName;

      if (!eventType) {
        return res.status(400).json({
          success: false,
          message: 'Type d\'événement requis'
        });
      }

      // Enrichir les propriétés avec des infos de req
      const enrichedProperties = {
        ...properties,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        timestamp: new Date().toISOString()
      };

      // Stocker en base de données
      const event = await prisma.analyticsEvent.create({
        data: {
          userId,
          sessionId: sessionId || `session_${Date.now()}`,
          type: eventType,
          properties: JSON.stringify(enrichedProperties),
          metadata: JSON.stringify({
            source: 'web',
            version: '1.0'
          })
        }
      });

      // Utiliser aussi le service analytique interne
      analyticsService.trackEvent(eventType, userId, enrichedProperties);

      logger.debug(`Événement tracé: ${eventType} pour utilisateur ${userId}`);

      res.json({
        success: true,
        message: 'Événement tracé avec succès',
        data: {
          eventId: event.id,
          type: event.type,
          timestamp: event.timestamp
        }
      });

    } catch (error) {
      logger.error('Erreur trackEvent:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du tracking de l\'événement'
      });
    }
  },

  /**
   * Récupère les données analytiques pour un utilisateur
   * @route GET /api/analytics
   * @access Private
   */
  async getAnalytics(req, res) {
    try {
      const userId = req.user.id;
      const { period = '30d', types } = req.query;

      // Vérifier le cache
      const cacheKey = `analytics_${userId}_${period}_${types || 'all'}`;
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        return res.json({ success: true, data: cached });
      }

      // Calculer la date de début selon la période
      let startDate = new Date();
      switch (period) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }

      // Construire les filtres
      const whereClause = {
        userId,
        timestamp: {
          gte: startDate
        }
      };

      if (types) {
        const typeList = types.split(',');
        whereClause.type = {
          in: typeList
        };
      }

      // Récupérer les événements
      const [events, eventCounts, dailyStats] = await Promise.all([
        // Événements récents
        prisma.analyticsEvent.findMany({
          where: whereClause,
          orderBy: { timestamp: 'desc' },
          take: 100
        }),
        // Comptages par type
        prisma.analyticsEvent.groupBy({
          by: ['type'],
          where: whereClause,
          _count: { type: true }
        }),
        // Statistiques quotidiennes
        prisma.$queryRaw`
          SELECT
            DATE(timestamp) as date,
            type,
            COUNT(*) as count
          FROM analytics_events
          WHERE userId = ${userId}
            AND timestamp >= ${startDate.toISOString()}
          GROUP BY DATE(timestamp), type
          ORDER BY date DESC
        `
      ]);

      const analytics = {
        period,
        totalEvents: events.length,
        eventTypes: eventCounts.map(ec => ({
          type: ec.type,
          count: ec._count.type
        })),
        dailyBreakdown: dailyStats.map(stat => ({
          date: stat.date,
          type: stat.type,
          count: parseInt(stat.count)
        })),
        recentEvents: events.slice(0, 20).map(event => ({
          id: event.id,
          type: event.type,
          timestamp: event.timestamp,
          properties: JSON.parse(event.properties || '{}')
        }))
      };

      // Mettre en cache pour 5 minutes
      await cacheService.set(cacheKey, analytics, 300);

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      logger.error('Erreur getAnalytics:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des analytics'
      });
    }
  },

  /**
   * Récupère les données du dashboard analytique principal
   * @route GET /api/analytics/dashboard
   * @access Private
   */
  async getDashboard(req, res) {
    try {
      const userId = req.user.id;
      const { period = '30d' } = req.query;

      // Vérifier le cache
      const cacheKey = `dashboard_${userId}_${period}`;
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        return res.json({ success: true, data: cached });
      }

      // Période de comparaison
      const now = new Date();
      let startDate, compareStartDate;

      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          compareStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          compareStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          compareStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      }

      // Récupérer les données de l'utilisateur et ses stats
      const [user, currentPeriodStats, previousPeriodStats, transactionStats, eventStats] = await Promise.all([
        // Utilisateur
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            savedAmount: true,
            monthlyGoal: true,
            gamificationPoints: true,
            level: true,
            streak: true,
            isPremium: true
          }
        }),
        // Stats période courante
        prisma.transaction.aggregate({
          where: {
            userId,
            createdAt: { gte: startDate }
          },
          _sum: { amount: true },
          _count: { id: true }
        }),
        // Stats période précédente
        prisma.transaction.aggregate({
          where: {
            userId,
            createdAt: {
              gte: compareStartDate,
              lt: startDate
            }
          },
          _sum: { amount: true },
          _count: { id: true }
        }),
        // Stats par catégorie
        prisma.transaction.groupBy({
          by: ['category'],
          where: {
            userId,
            createdAt: { gte: startDate }
          },
          _sum: { amount: true },
          _count: { id: true }
        }),
        // Événements analytiques
        prisma.analyticsEvent.groupBy({
          by: ['type'],
          where: {
            userId,
            timestamp: { gte: startDate }
          },
          _count: { type: true }
        })
      ]);

      // Calculer les métriques
      const currentAmount = currentPeriodStats._sum.amount || 0;
      const previousAmount = previousPeriodStats._sum.amount || 0;
      const amountGrowth = previousAmount > 0
        ? ((currentAmount - previousAmount) / previousAmount) * 100
        : currentAmount > 0 ? 100 : 0;

      const currentTransactions = currentPeriodStats._count.id || 0;
      const previousTransactions = previousPeriodStats._count.id || 0;
      const transactionGrowth = previousTransactions > 0
        ? ((currentTransactions - previousTransactions) / previousTransactions) * 100
        : currentTransactions > 0 ? 100 : 0;

      const dashboard = {
        period,
        summary: {
          totalSaved: user.savedAmount,
          monthlyGoal: user.monthlyGoal,
          goalProgress: user.monthlyGoal > 0 ? (user.savedAmount / user.monthlyGoal) * 100 : 0,
          currentPeriodSavings: currentAmount,
          savingsGrowth: Math.round(amountGrowth * 100) / 100,
          transactionCount: currentTransactions,
          transactionGrowth: Math.round(transactionGrowth * 100) / 100
        },
        gamification: {
          points: user.gamificationPoints,
          level: user.level,
          streak: user.streak,
          isPremium: user.isPremium,
          nextLevelPoints: (user.level * 1000) - user.gamificationPoints
        },
        categoryBreakdown: transactionStats.map(stat => ({
          category: stat.category,
          amount: stat._sum.amount || 0,
          count: stat._count.id || 0,
          percentage: currentAmount > 0 ? ((stat._sum.amount || 0) / currentAmount) * 100 : 0
        })),
        engagement: {
          totalEvents: eventStats.reduce((sum, event) => sum + event._count.type, 0),
          eventBreakdown: eventStats.map(event => ({
            type: event.type,
            count: event._count.type
          }))
        },
        generatedAt: new Date().toISOString()
      };

      // Mettre en cache pour 10 minutes
      await cacheService.set(cacheKey, dashboard, 600);

      res.json({
        success: true,
        data: dashboard
      });

    } catch (error) {
      logger.error('Erreur getDashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération du dashboard'
      });
    }
  },

  async exportAnalytics(req, res) {
    try {
      res.json({ message: 'exportAnalytics - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur exportAnalytics:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Événements batch
  async trackBatchEvents(req, res) {
    try {
      res.json({ message: 'trackBatchEvents - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur trackBatchEvents:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Gamification
  /**
   * Attribue des points de gamification à un utilisateur
   * @route POST /api/analytics/award-points
   * @access Private (Admin/System)
   */
  async awardPoints(req, res) {
    try {
      const { userId: targetUserId, points, reason } = req.body;
      const adminUserId = req.user.id;

      if (!targetUserId || !points || points <= 0) {
        return res.status(400).json({
          success: false,
          message: 'ID utilisateur et points (> 0) requis'
        });
      }

      if (points > 10000) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 10,000 points par attribution'
        });
      }

      // Vérifier que l'utilisateur existe
      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { gamificationPoints: true, level: true }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      // Attribuer les points
      const updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: {
          gamificationPoints: {
            increment: parseInt(points)
          }
        },
        select: {
          gamificationPoints: true,
          level: true
        }
      });

      // Vérifier si le niveau a changé
      const newLevel = Math.floor(updatedUser.gamificationPoints / 1000) + 1;
      let levelUp = false;

      if (newLevel > user.level) {
        await prisma.user.update({
          where: { id: targetUserId },
          data: { level: newLevel }
        });
        levelUp = true;
      }

      // Enregistrer l'événement
      analyticsService.trackEvent('points_awarded', targetUserId, {
        points: parseInt(points),
        reason: reason || 'Manuel',
        awardedBy: adminUserId,
        newTotal: updatedUser.gamificationPoints,
        levelUp
      });

      logger.info(`${points} points attribués à l'utilisateur ${targetUserId} par ${adminUserId}`);

      res.json({
        success: true,
        message: 'Points attribués avec succès',
        data: {
          pointsAwarded: parseInt(points),
          newTotal: updatedUser.gamificationPoints,
          levelUp,
          newLevel: levelUp ? newLevel : user.level
        }
      });

    } catch (error) {
      logger.error('Erreur awardPoints:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'attribution des points'
      });
    }
  },

  async awardBadge(req, res) {
    try {
      res.json({ message: 'awardBadge - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur awardBadge:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async getLeaderboard(req, res) {
    try {
      res.json({ message: 'getLeaderboard - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getLeaderboard:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Objectifs
  async trackGoalEvent(req, res) {
    try {
      res.json({ message: 'trackGoalEvent - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur trackGoalEvent:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async getGoalProgress(req, res) {
    try {
      res.json({ message: 'getGoalProgress - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getGoalProgress:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Dashboard étendu
  async getDashboardOverview(req, res) {
    try {
      res.json({ message: 'getDashboardOverview - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getDashboardOverview:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async getSavingsTrend(req, res) {
    try {
      res.json({ message: 'getSavingsTrend - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getSavingsTrend:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async getCategoryBreakdown(req, res) {
    try {
      res.json({ message: 'getCategoryBreakdown - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getCategoryBreakdown:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Métriques d'engagement
  /**
   * Récupère les métriques d'engagement utilisateur
   * @route GET /api/analytics/engagement
   * @access Private
   */
  async getEngagementMetrics(req, res) {
    try {
      const userId = req.user.id;
      const { period = '30d' } = req.query;

      // Calculer la période
      let startDate = new Date();
      switch (period) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }

      // Récupérer les métriques d'engagement
      const [analyticsEvents, transactions, sessionStats] = await Promise.all([
        // Événements par jour
        prisma.$queryRaw`
          SELECT
            DATE(timestamp) as date,
            COUNT(DISTINCT sessionId) as sessions,
            COUNT(*) as events
          FROM analytics_events
          WHERE userId = ${userId}
            AND timestamp >= ${startDate.toISOString()}
          GROUP BY DATE(timestamp)
          ORDER BY date DESC
        `,
        // Activité des transactions
        prisma.$queryRaw`
          SELECT
            DATE(createdAt) as date,
            COUNT(*) as transactions,
            SUM(amount) as total_amount
          FROM transactions
          WHERE userId = ${userId}
            AND createdAt >= ${startDate.toISOString()}
          GROUP BY DATE(createdAt)
          ORDER BY date DESC
        `,
        // Statistiques de session
        prisma.analyticsEvent.groupBy({
          by: ['sessionId'],
          where: {
            userId,
            timestamp: { gte: startDate }
          },
          _count: { sessionId: true },
          _min: { timestamp: true },
          _max: { timestamp: true }
        })
      ]);

      // Calculer les métriques d'engagement
      const totalEvents = analyticsEvents.reduce((sum, day) => sum + parseInt(day.events || 0), 0);
      const totalSessions = [...new Set(sessionStats.map(s => s.sessionId))].length;
      const totalDays = analyticsEvents.length;

      // Calculer la durée moyenne des sessions
      const sessionDurations = sessionStats.map(session => {
        const start = new Date(session._min.timestamp);
        const end = new Date(session._max.timestamp);
        return (end - start) / 1000; // en secondes
      });

      const averageSessionDuration = sessionDurations.length > 0
        ? sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length
        : 0;

      const metrics = {
        period,
        summary: {
          totalEvents,
          totalSessions,
          activeDays: totalDays,
          eventsPerDay: totalDays > 0 ? Math.round(totalEvents / totalDays * 100) / 100 : 0,
          eventsPerSession: totalSessions > 0 ? Math.round(totalEvents / totalSessions * 100) / 100 : 0,
          averageSessionDuration: Math.round(averageSessionDuration * 100) / 100
        },
        dailyActivity: analyticsEvents.map(day => ({
          date: day.date,
          sessions: parseInt(day.sessions || 0),
          events: parseInt(day.events || 0)
        })),
        transactionActivity: transactions.map(day => ({
          date: day.date,
          transactions: parseInt(day.transactions || 0),
          amount: parseFloat(day.total_amount || 0)
        })),
        engagementScore: this._calculateEngagementScore({
          eventsPerDay: totalDays > 0 ? totalEvents / totalDays : 0,
          sessionsPerDay: totalDays > 0 ? totalSessions / totalDays : 0,
          averageSessionDuration: averageSessionDuration / 60 // en minutes
        })
      };

      res.json({
        success: true,
        data: metrics
      });

    } catch (error) {
      logger.error('Erreur getEngagementMetrics:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des métriques d\'engagement'
      });
    }
  },

  async getEngagementHeatmap(req, res) {
    try {
      res.json({ message: 'getEngagementHeatmap - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getEngagementHeatmap:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Métriques IA
  async getAIUsageMetrics(req, res) {
    try {
      res.json({ message: 'getAIUsageMetrics - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getAIUsageMetrics:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async getAIEffectiveness(req, res) {
    try {
      res.json({ message: 'getAIEffectiveness - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getAIEffectiveness:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Rapports
  async generateCustomReport(req, res) {
    try {
      res.json({ message: 'generateCustomReport - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur generateCustomReport:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async getReport(req, res) {
    try {
      res.json({ message: 'getReport - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getReport:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Insights
  async getWeeklyInsights(req, res) {
    try {
      res.json({ message: 'getWeeklyInsights - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getWeeklyInsights:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async getMonthlyInsights(req, res) {
    try {
      res.json({ message: 'getMonthlyInsights - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getMonthlyInsights:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async getTrendInsights(req, res) {
    try {
      res.json({ message: 'getTrendInsights - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getTrendInsights:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Benchmarks
  async getBenchmarks(req, res) {
    try {
      res.json({ message: 'getBenchmarks - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getBenchmarks:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async getPeerComparison(req, res) {
    try {
      res.json({ message: 'getPeerComparison - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getPeerComparison:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Alertes
  async getAnalyticsAlerts(req, res) {
    try {
      res.json({ message: 'getAnalyticsAlerts - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getAnalyticsAlerts:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async subscribeToAlert(req, res) {
    try {
      res.json({ message: 'subscribeToAlert - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur subscribeToAlert:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * Calcule le score d'engagement basé sur les métriques
   */
  _calculateEngagementScore(metrics) {
    const { eventsPerDay, sessionsPerDay, averageSessionDuration } = metrics;

    // Normaliser les métriques (sur 100)
    const eventScore = Math.min(eventsPerDay * 2, 40); // Max 40 points pour les événements
    const sessionScore = Math.min(sessionsPerDay * 10, 30); // Max 30 points pour les sessions
    const durationScore = Math.min(averageSessionDuration * 2, 30); // Max 30 points pour la durée

    const totalScore = Math.round(eventScore + sessionScore + durationScore);

    // Déterminer le niveau d'engagement
    let level = 'Faible';
    if (totalScore >= 80) level = 'Très élevé';
    else if (totalScore >= 60) level = 'Élevé';
    else if (totalScore >= 40) level = 'Modéré';
    else if (totalScore >= 20) level = 'Faible';
    else level = 'Très faible';

    return {
      score: totalScore,
      level,
      breakdown: {
        events: Math.round(eventScore),
        sessions: Math.round(sessionScore),
        duration: Math.round(durationScore)
      }
    };
  }
};

module.exports = analyticsController;