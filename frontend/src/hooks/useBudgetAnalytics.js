// Suivi budgétaire intelligent avec analytics avancées
// Impact: Aide l'utilisateur à visualiser et prédire ses dépenses/économies
// Intégré avec: HomeScreen, transactions, gamification

import { useMemo, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useCache } from '../utils/cache';

export const useBudgetAnalytics = () => {
  const { state } = useAppContext();
  const { getCache, setCache } = useCache(5 * 60 * 1000); // Cache de 5 minutes

  // Calculs des analytics budgétaires
  const budgetAnalytics = useMemo(() => {
    const cacheKey = `budget_analytics_${JSON.stringify(state.transactions)}_${state.userData.savedAmount}`;

    // Vérifier le cache
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const { transactions, userData } = state;
    const now = new Date();

    // Filtres temporels
    const thisMonth = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() === now.getMonth() &&
             transactionDate.getFullYear() === now.getFullYear();
    });

    const lastMonth = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
      return transactionDate.getMonth() === lastMonthDate.getMonth() &&
             transactionDate.getFullYear() === lastMonthDate.getFullYear();
    });

    const last30Days = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return transactionDate >= thirtyDaysAgo;
    });

    // Calculs par période
    const thisMonthSavings = thisMonth.reduce((sum, t) => sum + t.amount, 0);
    const lastMonthSavings = lastMonth.reduce((sum, t) => sum + t.amount, 0);
    const last30DaysSavings = last30Days.reduce((sum, t) => sum + t.amount, 0);

    // Progression mensuelle
    const monthlyProgress = userData.monthlyGoal > 0
      ? (thisMonthSavings / userData.monthlyGoal) * 100
      : 0;

    // Tendance (comparaison avec le mois dernier)
    const trend = lastMonthSavings > 0
      ? ((thisMonthSavings - lastMonthSavings) / lastMonthSavings) * 100
      : thisMonthSavings > 0 ? 100 : 0;

    // Analytics par catégorie
    const categoryAnalytics = ['alimentation', 'habits', 'activite', 'deplacement'].map(category => {
      const categoryTransactions = transactions.filter(t => t.category === category);
      const monthlyTransactions = thisMonth.filter(t => t.category === category);

      const totalSavings = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
      const monthlySavings = monthlyTransactions.reduce((sum, t) => sum + t.amount, 0);
      const transactionCount = categoryTransactions.length;

      const averagePerTransaction = transactionCount > 0 ? totalSavings / transactionCount : 0;

      return {
        category,
        totalSavings,
        monthlySavings,
        transactionCount,
        averagePerTransaction,
        percentage: transactions.length > 0
          ? (categoryTransactions.length / transactions.length) * 100
          : 0
      };
    }).sort((a, b) => b.totalSavings - a.totalSavings);

    // Prédictions basées sur la tendance actuelle
    const dailyAverage = last30Days.length > 0
      ? last30DaysSavings / 30
      : 0;

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = now.getDate();
    const daysRemaining = daysInMonth - daysPassed;

    const projectedMonthlyTotal = thisMonthSavings + (dailyAverage * daysRemaining);

    // Objectifs et alertes
    const isOnTrack = projectedMonthlyTotal >= userData.monthlyGoal;
    const requiredDailyToReachGoal = daysRemaining > 0
      ? (userData.monthlyGoal - thisMonthSavings) / daysRemaining
      : 0;

    // Performance scores
    const consistencyScore = calculateConsistencyScore(transactions);
    const categoryDiversityScore = calculateDiversityScore(categoryAnalytics);

    const analytics = {
      // Montants
      thisMonthSavings,
      lastMonthSavings,
      last30DaysSavings,
      projectedMonthlyTotal,

      // Progression et tendances
      monthlyProgress,
      trend,
      dailyAverage,

      // Objectifs
      isOnTrack,
      requiredDailyToReachGoal,

      // Analytics par catégorie
      categoryAnalytics,

      // Scores de performance
      consistencyScore,
      categoryDiversityScore,

      // Statistiques temporelles
      totalTransactions: transactions.length,
      monthlyTransactionCount: thisMonth.length,
      streak: userData.streak || 0,

      // Données pour graphiques
      last7Days: getLast7DaysData(transactions),
      monthlyTrend: getMonthlyTrendData(transactions)
    };

    // Mettre en cache
    setCache(cacheKey, analytics);
    return analytics;
  }, [state.transactions, state.userData, getCache, setCache]);

  // Obtenir les recommandations budgétaires
  const getBudgetRecommendations = useCallback(() => {
    const recommendations = [];

    if (budgetAnalytics.monthlyProgress < 50 && budgetAnalytics.requiredDailyToReachGoal > budgetAnalytics.dailyAverage * 2) {
      recommendations.push({
        type: 'warning',
        title: 'Objectif difficile à atteindre',
        message: `Il faudrait économiser ${budgetAnalytics.requiredDailyToReachGoal.toFixed(2)}€/jour pour atteindre votre objectif`,
        action: 'Réviser l\'objectif ou intensifier les efforts'
      });
    }

    if (budgetAnalytics.trend > 20) {
      recommendations.push({
        type: 'success',
        title: 'Excellente progression !',
        message: `Vous économisez ${budgetAnalytics.trend.toFixed(1)}% de plus que le mois dernier`,
        action: 'Continuez sur cette lancée'
      });
    }

    if (budgetAnalytics.categoryDiversityScore < 50) {
      const topCategory = budgetAnalytics.categoryAnalytics[0];
      recommendations.push({
        type: 'info',
        title: 'Diversifiez vos économies',
        message: `${topCategory.percentage.toFixed(0)}% de vos économies viennent de ${topCategory.category}`,
        action: 'Explorez d\'autres catégories'
      });
    }

    if (budgetAnalytics.consistencyScore < 60) {
      recommendations.push({
        type: 'tip',
        title: 'Améliorez votre régularité',
        message: 'Des économies plus fréquentes et régulières sont plus efficaces',
        action: 'Essayez de faire des économies quotidiennes'
      });
    }

    return recommendations;
  }, [budgetAnalytics]);

  // Obtenir les alertes budgétaires
  const getBudgetAlerts = useCallback(() => {
    const alerts = [];
    const now = new Date();
    const daysPassed = now.getDate();
    const monthProgress = (daysPassed / 30) * 100; // Approximation

    // Alerte si on est en retard sur l'objectif
    if (budgetAnalytics.monthlyProgress < monthProgress - 20) {
      alerts.push({
        type: 'danger',
        message: 'Vous êtes en retard sur votre objectif mensuel',
        severity: 'high'
      });
    }

    // Alerte si aucune économie depuis 3 jours
    const lastTransaction = state.transactions[0];
    if (lastTransaction) {
      const daysSinceLastSave = (Date.now() - new Date(lastTransaction.date)) / (1000 * 60 * 60 * 24);
      if (daysSinceLastSave > 3) {
        alerts.push({
          type: 'warning',
          message: `Aucune économie depuis ${Math.floor(daysSinceLastSave)} jours`,
          severity: 'medium'
        });
      }
    }

    return alerts;
  }, [budgetAnalytics, state.transactions]);

  return {
    budgetAnalytics,
    getBudgetRecommendations,
    getBudgetAlerts
  };
};

// Fonctions utilitaires

const calculateConsistencyScore = (transactions) => {
  if (transactions.length === 0) return 0;

  // Analyser la régularité des transactions sur les 30 derniers jours
  const last30Days = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return transactionDate >= thirtyDaysAgo;
  });

  if (last30Days.length === 0) return 0;

  // Calculer les jours avec transactions
  const transactionDays = new Set(
    last30Days.map(t => new Date(t.date).toDateString())
  );

  const daysWithTransactions = transactionDays.size;
  const consistencyScore = (daysWithTransactions / 30) * 100;

  return Math.min(100, consistencyScore);
};

const calculateDiversityScore = (categoryAnalytics) => {
  const totalTransactions = categoryAnalytics.reduce((sum, cat) => sum + cat.transactionCount, 0);

  if (totalTransactions === 0) return 0;

  // Calculer l'entropie de Shannon pour mesurer la diversité
  const entropy = categoryAnalytics.reduce((entropy, category) => {
    if (category.transactionCount === 0) return entropy;

    const p = category.transactionCount / totalTransactions;
    return entropy - (p * Math.log2(p));
  }, 0);

  // Normaliser sur une échelle de 0 à 100
  const maxEntropy = Math.log2(categoryAnalytics.length);
  return maxEntropy > 0 ? (entropy / maxEntropy) * 100 : 0;
};

const getLast7DaysData = (transactions) => {
  const days = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateString = date.toDateString();

    const dayTransactions = transactions.filter(t =>
      new Date(t.date).toDateString() === dateString
    );

    const amount = dayTransactions.reduce((sum, t) => sum + t.amount, 0);

    days.push({
      date: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
      amount,
      count: dayTransactions.length
    });
  }

  return days;
};

const getMonthlyTrendData = (transactions) => {
  const months = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);

    const monthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() === date.getMonth() &&
             transactionDate.getFullYear() === date.getFullYear();
    });

    const amount = monthTransactions.reduce((sum, t) => sum + t.amount, 0);

    months.push({
      month: date.toLocaleDateString('fr-FR', { month: 'short' }),
      amount,
      count: monthTransactions.length
    });
  }

  return months;
};