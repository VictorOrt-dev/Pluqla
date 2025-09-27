// Système de gamification avancée avec analytics intégrés
// Impact: Augmente l'engagement utilisateur et la motivation aux économies
// Intégré avec: AppContext, HomeScreen, transactions, analyticsService

import { useCallback, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useAnalytics } from '../services/analyticsService';

// Configuration des badges et récompenses
export const BADGES = {
  // Badges d'économies
  FIRST_SAVE: {
    id: 'first_save',
    name: 'Première économie',
    description: 'Tu as fait ta première économie !',
    icon: '🌱',
    points: 10,
    rarity: 'common'
  },
  SAVER_BRONZE: {
    id: 'saver_bronze',
    name: 'Épargnant Bronze',
    description: '50€ économisés au total',
    icon: '🥉',
    points: 25,
    rarity: 'common',
    requirement: { type: 'totalSaved', value: 50 }
  },
  SAVER_SILVER: {
    id: 'saver_silver',
    name: 'Épargnant Argent',
    description: '200€ économisés au total',
    icon: '🥈',
    points: 50,
    rarity: 'uncommon',
    requirement: { type: 'totalSaved', value: 200 }
  },
  SAVER_GOLD: {
    id: 'saver_gold',
    name: 'Épargnant Or',
    description: '500€ économisés au total',
    icon: '🥇',
    points: 100,
    rarity: 'rare',
    requirement: { type: 'totalSaved', value: 500 }
  },

  // Badges de régularité
  STREAK_WEEK: {
    id: 'streak_week',
    name: 'Une semaine de suite',
    description: '7 jours d\'économies consécutives',
    icon: '🔥',
    points: 30,
    rarity: 'uncommon',
    requirement: { type: 'streak', value: 7 }
  },
  STREAK_MONTH: {
    id: 'streak_month',
    name: 'Un mois de suite',
    description: '30 jours d\'économies consécutives',
    icon: '⚡',
    points: 75,
    rarity: 'rare',
    requirement: { type: 'streak', value: 30 }
  },

  // Badges de catégories
  FOOD_MASTER: {
    id: 'food_master',
    name: 'Maître Cuisinier',
    description: '10 économies en alimentation',
    icon: '👨‍🍳',
    points: 40,
    rarity: 'uncommon',
    requirement: { type: 'categoryCount', category: 'alimentation', value: 10 }
  },
  TRANSPORT_EXPERT: {
    id: 'transport_expert',
    name: 'Expert Transport',
    description: '15 trajets optimisés',
    icon: '🚀',
    points: 45,
    rarity: 'uncommon',
    requirement: { type: 'categoryCount', category: 'deplacement', value: 15 }
  },

  // Badges spéciaux
  DAILY_CHALLENGER: {
    id: 'daily_challenger',
    name: 'Challenger Quotidien',
    description: '5 défis quotidiens complétés',
    icon: '🎯',
    points: 35,
    rarity: 'uncommon',
    requirement: { type: 'dailyChallenges', value: 5 }
  },
  GOAL_ACHIEVER: {
    id: 'goal_achiever',
    name: 'Objectif Atteint',
    description: 'Objectif mensuel atteint pour la première fois',
    icon: '🎉',
    points: 80,
    rarity: 'rare',
    requirement: { type: 'monthlyGoal', value: 1 }
  }
};

// Niveaux utilisateur
export const LEVELS = {
  1: { name: 'Débutant', minPoints: 0, icon: '🌱', color: '#10B981' },
  2: { name: 'Économe', minPoints: 100, icon: '🌿', color: '#059669' },
  3: { name: 'Expert', minPoints: 300, icon: '🍀', color: '#047857' },
  4: { name: 'Maître', minPoints: 600, icon: '🏆', color: '#F59E0B' },
  5: { name: 'Champion', minPoints: 1000, icon: '👑', color: '#DC2626' }
};

export const useGamification = () => {
  const { state, dispatch } = useAppContext();
  const { trackGamificationEvent } = useAnalytics();

  // Calculer les statistiques de gamification
  const gamificationStats = useMemo(() => {
    const { transactions, userData } = state;

    // Points totaux
    const totalPoints = userData.gamificationPoints || 0;

    // Niveau actuel
    const currentLevel = Object.entries(LEVELS)
      .reverse()
      .find(([level, data]) => totalPoints >= data.minPoints)?.[0] || 1;

    // Progression vers le prochain niveau
    const nextLevel = parseInt(currentLevel) + 1;
    const nextLevelData = LEVELS[nextLevel];
    const currentLevelData = LEVELS[currentLevel];

    const progressToNextLevel = nextLevelData
      ? ((totalPoints - currentLevelData.minPoints) / (nextLevelData.minPoints - currentLevelData.minPoints)) * 100
      : 100;

    // Statistiques des badges
    const unlockedBadges = userData.badges || [];
    const availableBadges = Object.values(BADGES).length;
    const badgeProgress = (unlockedBadges.length / availableBadges) * 100;

    // Calculs pour les badges
    const totalSaved = userData.savedAmount || 0;
    const streak = userData.streak || 0;

    // Compter les transactions par catégorie
    const categoryStats = transactions.reduce((acc, transaction) => {
      acc[transaction.category] = (acc[transaction.category] || 0) + 1;
      return acc;
    }, {});

    return {
      totalPoints,
      currentLevel: parseInt(currentLevel),
      currentLevelData: LEVELS[currentLevel],
      nextLevel: nextLevelData,
      progressToNextLevel: Math.min(100, Math.max(0, progressToNextLevel)),
      unlockedBadges,
      badgeProgress,
      availableBadges,
      totalSaved,
      streak,
      categoryStats
    };
  }, [state]);

  // Vérifier si de nouveaux badges peuvent être débloqués
  const checkForNewBadges = useCallback(() => {
    const { totalSaved, streak, categoryStats } = gamificationStats;
    const unlockedBadges = gamificationStats.unlockedBadges.map(b => b.id);
    const newBadges = [];

    Object.values(BADGES).forEach(badge => {
      // Skip si déjà débloqué
      if (unlockedBadges.includes(badge.id)) return;

      let shouldUnlock = false;

      switch (badge.requirement?.type) {
        case 'totalSaved':
          shouldUnlock = totalSaved >= badge.requirement.value;
          break;
        case 'streak':
          shouldUnlock = streak >= badge.requirement.value;
          break;
        case 'categoryCount':
          const categoryCount = categoryStats[badge.requirement.category] || 0;
          shouldUnlock = categoryCount >= badge.requirement.value;
          break;
        case 'monthlyGoal':
          shouldUnlock = totalSaved >= (state.userData.monthlyGoal || 0);
          break;
        default:
          break;
      }

      if (shouldUnlock) {
        newBadges.push(badge);
      }
    });

    return newBadges;
  }, [gamificationStats, state.userData.monthlyGoal]);

  // Débloquer des badges et attribuer des points
  const unlockBadges = useCallback((newBadges) => {
    if (newBadges.length === 0) return;

    const totalNewPoints = newBadges.reduce((sum, badge) => sum + badge.points, 0);
    const updatedUserData = {
      ...state.userData,
      badges: [...(state.userData.badges || []), ...newBadges],
      gamificationPoints: (state.userData.gamificationPoints || 0) + totalNewPoints
    };

    dispatch({ type: 'SET_USER_DATA', payload: updatedUserData });

    // Tracker l'événement analytics pour chaque badge
    newBadges.forEach(badge => {
      trackGamificationEvent('badge_unlocked', {
        badgeId: badge.id,
        badgeName: badge.name,
        points: badge.points,
        rarity: badge.rarity,
        totalPoints: updatedUserData.gamificationPoints
      });
    });

    // Les notifications sont maintenant gérées par le système global
    // Retourner les badges pour que l'appelant puisse les afficher
    return newBadges;
  }, [state.userData, dispatch, trackGamificationEvent]);

  // Ajouter des points pour une action
  const addPoints = useCallback((points, reason) => {
    const oldPoints = state.userData.gamificationPoints || 0;
    const updatedUserData = {
      ...state.userData,
      gamificationPoints: oldPoints + points
    };

    dispatch({ type: 'SET_USER_DATA', payload: updatedUserData });

    // Vérifier si changement de niveau
    const oldLevel = Object.entries(LEVELS).reverse()
      .find(([level, data]) => oldPoints >= data.minPoints)?.[0] || 1;
    const newLevel = Object.entries(LEVELS).reverse()
      .find(([level, data]) => updatedUserData.gamificationPoints >= data.minPoints)?.[0] || 1;

    // Tracker l'attribution de points
    trackGamificationEvent('points_earned', {
      points,
      reason,
      totalPoints: updatedUserData.gamificationPoints,
      oldLevel: parseInt(oldLevel),
      newLevel: parseInt(newLevel)
    });

    // Tracker level up si applicable
    if (newLevel > oldLevel) {
      trackGamificationEvent('level_up', {
        oldLevel: parseInt(oldLevel),
        newLevel: parseInt(newLevel),
        levelName: LEVELS[newLevel].name,
        totalPoints: updatedUserData.gamificationPoints
      });
    }

    // Retourner l'info pour notification externe
    return { points, reason, levelUp: newLevel > oldLevel, newLevel };
  }, [state.userData, dispatch, trackGamificationEvent]);

  // Vérifier les réalisations après une transaction
  const checkAchievements = useCallback(() => {
    const newBadges = checkForNewBadges();
    if (newBadges.length > 0) {
      unlockBadges(newBadges);
    }
  }, [checkForNewBadges, unlockBadges]);

  // Obtenir les défis quotidiens disponibles
  const getDailyChallenges = useCallback(() => {
    const today = new Date().toDateString();
    const completedToday = state.userData.dailyChallenges?.[today] || [];

    const challenges = [
      {
        id: 'save_once',
        title: 'Économise au moins 1€ aujourd\'hui',
        points: 5,
        completed: completedToday.includes('save_once')
      },
      {
        id: 'check_suggestions',
        title: 'Consulte 3 suggestions IA',
        points: 3,
        completed: completedToday.includes('check_suggestions')
      },
      {
        id: 'transport_track',
        title: 'Enregistre un trajet optimisé',
        points: 4,
        completed: completedToday.includes('transport_track')
      }
    ];

    return challenges;
  }, [state.userData.dailyChallenges]);

  // Marquer un défi comme complété
  const completeChallenge = useCallback((challengeId) => {
    const today = new Date().toDateString();
    const completedToday = state.userData.dailyChallenges?.[today] || [];

    if (completedToday.includes(challengeId)) return;

    const challenge = getDailyChallenges().find(c => c.id === challengeId);
    if (!challenge) return;

    const updatedUserData = {
      ...state.userData,
      dailyChallenges: {
        ...state.userData.dailyChallenges,
        [today]: [...completedToday, challengeId]
      }
    };

    dispatch({ type: 'SET_USER_DATA', payload: updatedUserData });

    // Tracker l'événement de défi complété
    trackGamificationEvent('challenge_completed', {
      challengeId,
      challengeTitle: challenge.title,
      points: challenge.points,
      completedChallengesTotal: completedToday.length + 1
    });

    addPoints(challenge.points, `Défi complété : ${challenge.title}`);
  }, [state.userData, dispatch, addPoints, getDailyChallenges, trackGamificationEvent]);

  return {
    gamificationStats,
    checkAchievements,
    addPoints,
    getDailyChallenges,
    completeChallenge,
    BADGES,
    LEVELS
  };
};