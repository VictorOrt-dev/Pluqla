const { prisma } = require('../lib/prisma'); // FIXED: Use singleton to prevent connection pool exhaustion
const logger = require('../utils/logger');

class StrikeService {
  constructor() {
    this.logger = logger;
  }

  /**
   * Calcule et met à jour le strike d'un utilisateur après une économie
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<{strike: number, isNewStreak: boolean}>}
   */
  async updateStrikeAfterSaving(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          streak: true,
          lastSavingDate: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to midnight for accurate date comparison

      const lastSavingDate = user.lastSavingDate ? new Date(user.lastSavingDate) : null;

      let newStreak = user.streak;
      let isNewStreak = false;

      if (!lastSavingDate) {
        // Premier économie ever, on commence le streak
        newStreak = 1;
        isNewStreak = true;
      } else {
        const lastSavingDateOnly = new Date(lastSavingDate);
        lastSavingDateOnly.setHours(0, 0, 0, 0);

        const daysDifference = Math.floor((today - lastSavingDateOnly) / (24 * 60 * 60 * 1000));

        if (daysDifference === 0) {
          // Économie le même jour, le streak reste le même
          isNewStreak = false;
        } else if (daysDifference === 1) {
          // Économie le jour suivant, on incrémente le streak
          newStreak = user.streak + 1;
          isNewStreak = true;
        } else {
          // Plus d'un jour de différence, le streak repart à 1
          newStreak = 1;
          isNewStreak = true;
        }
      }

      // Mettre à jour l'utilisateur avec le nouveau streak et la date
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          streak: newStreak,
          lastSavingDate: new Date()
        },
        select: {
          streak: true
        }
      });

      this.logger.info(`🔥 Strike updated for user ${userId}: ${updatedUser.streak} days`, {
        userId,
        previousStreak: user.streak,
        newStreak: updatedUser.streak,
        isNewStreak,
        lastSavingDate: lastSavingDate?.toISOString()
      });

      return {
        strike: updatedUser.streak,
        isNewStreak
      };
    } catch (error) {
      this.logger.error('Failed to update user strike:', error);
      throw new Error('Failed to update strike');
    }
  }

  /**
   * Récupère le strike actuel d'un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<{strike: number, lastSavingDate: Date|null}>}
   */
  async getCurrentStrike(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          streak: true,
          lastSavingDate: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return {
        strike: user.streak,
        lastSavingDate: user.lastSavingDate
      };
    } catch (error) {
      this.logger.error('Failed to get current strike:', error);
      throw new Error('Failed to get current strike');
    }
  }

  /**
   * Vérifie si l'utilisateur a perdu son streak (n'a pas fait d'économie depuis plus d'un jour)
   * Cette méthode peut être appelée périodiquement ou lors de la connexion
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<{strike: number, wasReset: boolean}>}
   */
  async checkAndResetStrikeIfNeeded(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          streak: true,
          lastSavingDate: true
        }
      });

      if (!user || !user.lastSavingDate || user.streak === 0) {
        return {
          strike: user?.streak || 0,
          wasReset: false
        };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const lastSavingDate = new Date(user.lastSavingDate);
      lastSavingDate.setHours(0, 0, 0, 0);

      const daysDifference = Math.floor((today - lastSavingDate) / (24 * 60 * 60 * 1000));

      // Si plus d'un jour s'est écoulé sans économie, reset le streak
      if (daysDifference > 1) {
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: {
            streak: 0
          },
          select: {
            streak: true
          }
        });

        this.logger.info(`💥 Strike reset for user ${userId} (inactive for ${daysDifference} days)`, {
          userId,
          previousStreak: user.streak,
          daysSinceLastSaving: daysDifference
        });

        return {
          strike: 0,
          wasReset: true
        };
      }

      return {
        strike: user.streak,
        wasReset: false
      };
    } catch (error) {
      this.logger.error('Failed to check and reset strike:', error);
      throw new Error('Failed to check strike status');
    }
  }

  /**
   * Obtient les statistiques de strike pour un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<{currentStreak: number, bestStreak: number, lastSavingDate: Date|null}>}
   */
  async getStrikeStats(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          streak: true,
          lastSavingDate: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Pour le meilleur streak, on pourrait l'ajouter au modèle plus tard
      // Pour l'instant, on retourne le streak actuel comme meilleur
      return {
        currentStreak: user.streak,
        bestStreak: user.streak, // TODO: ajouter un champ bestStreak au modèle User
        lastSavingDate: user.lastSavingDate
      };
    } catch (error) {
      this.logger.error('Failed to get strike stats:', error);
      throw new Error('Failed to get strike statistics');
    }
  }
}

module.exports = new StrikeService();
