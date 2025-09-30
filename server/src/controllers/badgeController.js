const { prisma } = require('../lib/prisma'); // FIXED: Use singleton to prevent connection pool exhaustion
const logger = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/responseHelper');

const badgeController = {
  // Récupérer tous les badges disponibles
  async getAllBadges(req, res) {
    try {
      logger.info('🏆 Récupération de tous les badges disponibles');

      const badges = await prisma.badge.findMany({
        orderBy: [
          { rarity: 'asc' },
          { points: 'asc' }
        ]
      });

      const groupedBadges = {
        common: badges.filter((b) => b.rarity === 'common'),
        rare: badges.filter((b) => b.rarity === 'rare'),
        epic: badges.filter((b) => b.rarity === 'epic'),
        legendary: badges.filter((b) => b.rarity === 'legendary')
      };

      logger.info(`✅ ${badges.length} badges récupérés`);
      return sendSuccess(res, {
        badges,
        grouped: groupedBadges,
        total: badges.length
      }, 'Badges récupérés avec succès');
    } catch (error) {
      logger.error('Erreur getAllBadges:', error);
      return sendError(res, 'Erreur lors de la récupération des badges', 500);
    }
  },

  // Récupérer les badges d'un utilisateur
  async getUserBadges(req, res) {
    try {
      const userId = req.user.id;
      logger.info(`🏆 Récupération des badges utilisateur: ${userId}`);

      // Récupérer les badges débloqués par l'utilisateur
      const userBadges = await prisma.userBadge.findMany({
        where: { userId },
        include: {
          badge: true
        },
        orderBy: {
          unlockedAt: 'desc'
        }
      });

      // Récupérer tous les badges disponibles pour montrer les progrès
      const allBadges = await prisma.badge.findMany({
        orderBy: { points: 'asc' }
      });

      // Calculer les statistiques de l'utilisateur pour les badges de progression
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          gamificationPoints: true,
          savedAmount: true,
          streak: true,
          level: true,
          _count: {
            select: {
              transactions: {
                where: { type: 'saving' }
              }
            }
          }
        }
      });

      const unlockedBadgeIds = userBadges.map((ub) => ub.badgeId);

      // Formater les badges avec statut de déverrouillage
      const badgesWithStatus = allBadges.map((badge) => {
        const userBadge = userBadges.find((ub) => ub.badgeId === badge.id);
        const isUnlocked = unlockedBadgeIds.includes(badge.id);

        // Calculer le progrès vers ce badge
        let progress = 0;
        let progressMax = 1;
        let progressDescription = '';

        switch (badge.condition) {
        case 'points':
          progress = user.gamificationPoints;
          progressMax = badge.conditionValue;
          progressDescription = `${progress}/${progressMax} points`;
          break;
        case 'savings':
          progress = user.savedAmount;
          progressMax = badge.conditionValue;
          progressDescription = `${progress}€/${progressMax}€ économisés`;
          break;
        case 'streak':
          progress = user.streak;
          progressMax = badge.conditionValue;
          progressDescription = `${progress}/${progressMax} jours consécutifs`;
          break;
        case 'transactions':
          progress = user._count.transactions;
          progressMax = badge.conditionValue;
          progressDescription = `${progress}/${progressMax} transactions`;
          break;
        default:
          progressDescription = isUnlocked ? 'Débloqué' : 'Condition spéciale';
        }

        return {
          id: badge.id,
          name: badge.name,
          title: badge.title,
          description: badge.description,
          icon: badge.icon,
          points: badge.points,
          rarity: badge.rarity,
          condition: badge.condition,
          conditionValue: badge.conditionValue,
          isUnlocked,
          unlockedAt: userBadge?.unlockedAt || null,
          progress: Math.min(progress, progressMax),
          progressMax,
          progressPercentage: Math.min(100, (progress / progressMax) * 100),
          progressDescription
        };
      });

      const stats = {
        totalBadges: allBadges.length,
        unlockedBadges: userBadges.length,
        completionPercentage: Math.round((userBadges.length / allBadges.length) * 100),
        totalPoints: userBadges.reduce((sum, ub) => sum + ub.badge.points, 0),
        byRarity: {
          common: userBadges.filter((ub) => ub.badge.rarity === 'common').length,
          rare: userBadges.filter((ub) => ub.badge.rarity === 'rare').length,
          epic: userBadges.filter((ub) => ub.badge.rarity === 'epic').length,
          legendary: userBadges.filter((ub) => ub.badge.rarity === 'legendary').length
        }
      };

      logger.info(`✅ ${userBadges.length} badges débloqués pour l'utilisateur: ${userId}`);
      return sendSuccess(res, {
        userBadges: badgesWithStatus,
        stats,
        recentlyUnlocked: userBadges.slice(0, 3)
      }, 'Badges utilisateur récupérés avec succès');
    } catch (error) {
      logger.error('Erreur getUserBadges:', error);
      return sendError(res, 'Erreur lors de la récupération des badges utilisateur', 500);
    }
  },

  // Débloquer un badge automatiquement (système interne)
  async unlockBadge(req, res) {
    try {
      const { userId, badgeId } = req.body;

      if (!userId || !badgeId) {
        return sendError(res, 'userId et badgeId requis', 400);
      }

      logger.info(`🏆 Tentative de déverrouillage badge ${badgeId} pour utilisateur ${userId}`);

      // Vérifier que le badge existe
      const badge = await prisma.badge.findUnique({
        where: { id: badgeId }
      });

      if (!badge) {
        return sendError(res, 'Badge non trouvé', 404);
      }

      // Vérifier si l'utilisateur a déjà ce badge
      const existingUserBadge = await prisma.userBadge.findFirst({
        where: { userId, badgeId }
      });

      if (existingUserBadge) {
        return sendError(res, 'Badge déjà débloqué', 400);
      }

      // Vérifier les conditions du badge
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          _count: {
            select: {
              transactions: {
                where: { type: 'saving' }
              }
            }
          }
        }
      });

      if (!user) {
        return sendError(res, 'Utilisateur non trouvé', 404);
      }

      let conditionMet = false;

      switch (badge.condition) {
      case 'points':
        conditionMet = user.gamificationPoints >= badge.conditionValue;
        break;
      case 'savings':
        conditionMet = user.savedAmount >= badge.conditionValue;
        break;
      case 'streak':
        conditionMet = user.streak >= badge.conditionValue;
        break;
      case 'transactions':
        conditionMet = user._count.transactions >= badge.conditionValue;
        break;
      case 'manual':
        conditionMet = true; // Badge manuel
        break;
      default:
        conditionMet = false;
      }

      if (!conditionMet) {
        return sendError(res, 'Conditions du badge non remplies', 400);
      }

      // Transaction pour débloquer le badge et mettre à jour les points
      const result = await prisma.$transaction(async (tx) => {
        // Créer l'association UserBadge
        const userBadge = await tx.userBadge.create({
          data: {
            userId,
            badgeId,
            unlockedAt: new Date()
          },
          include: {
            badge: true
          }
        });

        // Ajouter les points du badge à l'utilisateur
        await tx.user.update({
          where: { id: userId },
          data: {
            gamificationPoints: {
              increment: badge.points
            }
          }
        });

        return userBadge;
      });

      logger.info(`✅ Badge ${badge.name} débloqué pour l'utilisateur: ${userId}`);
      return sendSuccess(res, {
        badge: result.badge,
        unlockedAt: result.unlockedAt,
        pointsEarned: badge.points
      }, 'Badge débloqué avec succès', 201);
    } catch (error) {
      logger.error('Erreur unlockBadge:', error);
      return sendError(res, 'Erreur lors du déverrouillage du badge', 500);
    }
  },

  // Vérifier automatiquement les conditions de badges pour un utilisateur
  async checkBadgeConditions(req, res) {
    try {
      const userId = req.user.id;
      logger.info(`🔍 Vérification des conditions de badges pour l'utilisateur: ${userId}`);

      // Récupérer l'utilisateur avec ses statistiques
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          _count: {
            select: {
              transactions: {
                where: { type: 'saving' }
              }
            }
          }
        }
      });

      if (!user) {
        return sendError(res, 'Utilisateur non trouvé', 404);
      }

      // Récupérer tous les badges
      const allBadges = await prisma.badge.findMany();

      // Récupérer les badges déjà débloqués
      const userBadges = await prisma.userBadge.findMany({
        where: { userId },
        select: { badgeId: true }
      });

      const unlockedBadgeIds = userBadges.map((ub) => ub.badgeId);

      // Vérifier les conditions pour chaque badge non débloqué
      const eligibleBadges = [];

      for (const badge of allBadges) {
        if (unlockedBadgeIds.includes(badge.id)) {
          continue; // Badge déjà débloqué
        }

        let conditionMet = false;

        switch (badge.condition) {
        case 'points':
          conditionMet = user.gamificationPoints >= badge.conditionValue;
          break;
        case 'savings':
          conditionMet = user.savedAmount >= badge.conditionValue;
          break;
        case 'streak':
          conditionMet = user.streak >= badge.conditionValue;
          break;
        case 'transactions':
          conditionMet = user._count.transactions >= badge.conditionValue;
          break;
        default:
          continue; // Ignorer les badges manuels ou avec conditions spéciales
        }

        if (conditionMet) {
          eligibleBadges.push(badge);
        }
      }

      logger.info(`✅ ${eligibleBadges.length} badges éligibles trouvés pour l'utilisateur: ${userId}`);
      return sendSuccess(res, {
        eligibleBadges,
        count: eligibleBadges.length,
        userStats: {
          points: user.gamificationPoints,
          savings: user.savedAmount,
          streak: user.streak,
          transactions: user._count.transactions
        }
      }, 'Vérification des conditions terminée');
    } catch (error) {
      logger.error('Erreur checkBadgeConditions:', error);
      return sendError(res, 'Erreur lors de la vérification des conditions', 500);
    }
  },

  // Auto-débloquer tous les badges éligibles pour un utilisateur
  async autoUnlockEligibleBadges(req, res) {
    try {
      const userId = req.user.id;
      logger.info(`🔄 Déverrouillage automatique des badges pour l'utilisateur: ${userId}`);

      // Utiliser la fonction de vérification des conditions
      const { eligibleBadges } = await this.checkBadgeConditionsInternal(userId);

      if (eligibleBadges.length === 0) {
        return sendSuccess(res, {
          unlockedBadges: [],
          count: 0
        }, 'Aucun nouveau badge à débloquer');
      }

      // Débloquer tous les badges éligibles
      const unlockedBadges = [];
      let totalPointsEarned = 0;

      for (const badge of eligibleBadges) {
        try {
          const result = await prisma.$transaction(async (tx) => {
            // Créer l'association UserBadge
            const userBadge = await tx.userBadge.create({
              data: {
                userId,
                badgeId: badge.id,
                unlockedAt: new Date()
              },
              include: {
                badge: true
              }
            });

            // Ajouter les points du badge
            await tx.user.update({
              where: { id: userId },
              data: {
                gamificationPoints: {
                  increment: badge.points
                }
              }
            });

            return userBadge;
          });

          unlockedBadges.push(result);
          totalPointsEarned += badge.points;

          logger.info(`✅ Badge auto-débloqué: ${badge.name} pour utilisateur ${userId}`);
        } catch (error) {
          logger.error(`Erreur déverrouillage badge ${badge.id}:`, error);
          // Continue avec les autres badges
        }
      }

      logger.info(`✅ ${unlockedBadges.length} badges auto-débloqués pour l'utilisateur: ${userId}`);
      return sendSuccess(res, {
        unlockedBadges: unlockedBadges.map((ub) => ({
          badge: ub.badge,
          unlockedAt: ub.unlockedAt
        })),
        count: unlockedBadges.length,
        totalPointsEarned
      }, 'Badges débloqués automatiquement', 201);
    } catch (error) {
      logger.error('Erreur autoUnlockEligibleBadges:', error);
      return sendError(res, 'Erreur lors du déverrouillage automatique', 500);
    }
  },

  // Fonction interne pour vérifier les conditions (sans réponse HTTP)
  async checkBadgeConditionsInternal(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            transactions: {
              where: { type: 'saving' }
            }
          }
        }
      }
    });

    if (!user) {
      return { eligibleBadges: [] };
    }

    const allBadges = await prisma.badge.findMany();
    const userBadges = await prisma.userBadge.findMany({
      where: { userId },
      select: { badgeId: true }
    });

    const unlockedBadgeIds = userBadges.map((ub) => ub.badgeId);
    const eligibleBadges = [];

    for (const badge of allBadges) {
      if (unlockedBadgeIds.includes(badge.id)) {
        continue;
      }

      let conditionMet = false;

      switch (badge.condition) {
      case 'points':
        conditionMet = user.gamificationPoints >= badge.conditionValue;
        break;
      case 'savings':
        conditionMet = user.savedAmount >= badge.conditionValue;
        break;
      case 'streak':
        conditionMet = user.streak >= badge.conditionValue;
        break;
      case 'transactions':
        conditionMet = user._count.transactions >= badge.conditionValue;
        break;
      }

      if (conditionMet) {
        eligibleBadges.push(badge);
      }
    }

    return { eligibleBadges };
  },

  // Obtenir le classement des utilisateurs par badges
  async getBadgeLeaderboard(req, res) {
    try {
      const { limit = 20 } = req.query;

      logger.info('🏆 Récupération du classement des badges');

      // Récupérer le top des utilisateurs par nombre de badges
      const leaderboard = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          gamificationPoints: true,
          level: true,
          _count: {
            select: {
              badges: true
            }
          }
        },
        orderBy: [
          {
            badges: {
              _count: 'desc'
            }
          },
          {
            gamificationPoints: 'desc'
          }
        ],
        take: parseInt(limit)
      });

      const formattedLeaderboard = leaderboard.map((user, index) => ({
        rank: index + 1,
        userId: user.id,
        name: user.name,
        badgeCount: user._count.badges,
        points: user.gamificationPoints,
        level: user.level
      }));

      logger.info(`✅ Classement récupéré: ${leaderboard.length} utilisateurs`);
      return sendSuccess(res, {
        leaderboard: formattedLeaderboard,
        total: leaderboard.length
      }, 'Classement des badges récupéré avec succès');
    } catch (error) {
      logger.error('Erreur getBadgeLeaderboard:', error);
      return sendError(res, 'Erreur lors de la récupération du classement', 500);
    }
  }
};

module.exports = badgeController;
