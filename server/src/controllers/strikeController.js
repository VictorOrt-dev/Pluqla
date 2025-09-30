const logger = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const strikeService = require('../services/strikeService');

const strikeController = {
  /**
   * Récupère le strike actuel de l'utilisateur
   * @route GET /api/strikes/current
   * @access Private
   */
  async getCurrentStrike(req, res) {
    try {
      const userId = req.user.id;
      logger.info(`🔥 Récupération du strike pour l'utilisateur: ${userId}`);

      // Vérifier d'abord si le strike doit être reset
      await strikeService.checkAndResetStrikeIfNeeded(userId);

      // Récupérer le strike actuel
      const { strike, lastSavingDate } = await strikeService.getCurrentStrike(userId);

      const data = {
        currentStrike: strike,
        lastSavingDate,
        message: strike === 0
          ? 'Commencez votre première économie pour démarrer votre série !'
          : strike === 1
            ? 'Bravo ! Continuez demain pour allonger votre série !'
            : `Fantastique ! ${strike} jours consécutifs d'économies !`
      };

      return sendSuccess(res, data, 'Strike récupéré avec succès');
    } catch (error) {
      logger.error('Erreur lors de la récupération du strike:', error);
      return sendError(res, 'Erreur lors de la récupération du strike', 500);
    }
  },

  /**
   * Récupère les statistiques détaillées des strikes
   * @route GET /api/strikes/stats
   * @access Private
   */
  async getStrikeStats(req, res) {
    try {
      const userId = req.user.id;
      logger.info(`📊 Récupération des stats de strike pour l'utilisateur: ${userId}`);

      // Vérifier d'abord si le strike doit être reset
      await strikeService.checkAndResetStrikeIfNeeded(userId);

      const stats = await strikeService.getStrikeStats(userId);

      const data = {
        ...stats,
        encouragementMessage: this.getEncouragementMessage(stats.currentStreak)
      };

      return sendSuccess(res, data, 'Statistiques de strike récupérées avec succès');
    } catch (error) {
      logger.error('Erreur lors de la récupération des stats de strike:', error);
      return sendError(res, 'Erreur lors de la récupération des statistiques', 500);
    }
  },

  /**
   * Force la vérification et la remise à zéro du strike si nécessaire
   * Cette route peut être appelée lors de la connexion ou périodiquement
   * @route POST /api/strikes/check-reset
   * @access Private
   */
  async checkAndResetStrike(req, res) {
    try {
      const userId = req.user.id;
      logger.info(`🔍 Vérification du strike pour l'utilisateur: ${userId}`);

      const { strike, wasReset } = await strikeService.checkAndResetStrikeIfNeeded(userId);

      const data = {
        currentStrike: strike,
        wasReset,
        message: wasReset
          ? 'Votre série a été remise à zéro car vous n\'avez pas fait d\'économie hier. Recommencez dès aujourd\'hui !'
          : strike === 0
            ? 'Commencez votre première économie pour démarrer votre série !'
            : `Votre série continue : ${strike} jours !`
      };

      return sendSuccess(res, data, 'Vérification du strike effectuée');
    } catch (error) {
      logger.error('Erreur lors de la vérification du strike:', error);
      return sendError(res, 'Erreur lors de la vérification du strike', 500);
    }
  },

  /**
   * Génère un message d'encouragement basé sur le strike actuel
   * @param {number} strike - Le strike actuel
   * @returns {string} Message d'encouragement
   */
  getEncouragementMessage(strike) {
    if (strike === 0) {
      return 'Commencez votre série d\'économies dès aujourd\'hui ! 💪';
    } if (strike < 7) {
      return `Excellent début ! ${strike} jour${strike > 1 ? 's' : ''} d'économies. Continuez ! 🚀`;
    } if (strike < 30) {
      return `Impressionnant ! ${strike} jours consécutifs. Vous êtes sur la bonne voie ! 🔥`;
    } if (strike < 100) {
      return `Incroyable ! ${strike} jours de suite ! Vous êtes un maître de l'épargne ! 🏆`;
    }
    return `LÉGENDAIRE ! ${strike} jours consécutifs ! Vous êtes un exemple pour tous ! 👑`;
  }
};

module.exports = strikeController;
