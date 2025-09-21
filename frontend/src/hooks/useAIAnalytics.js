// Hook spécialisé pour analytics IA et interactions utilisateur
// Impact: Tracking précis des interactions avec l'IA pour optimisation UX
// Intégré avec: analyticsService, components de suggestions, gamification

import { useCallback } from 'react';
import { useAnalytics } from '../services/analyticsService';
import { useGamification } from './useGamification';

export const useAIAnalytics = () => {
  const { trackUserAction } = useAnalytics();
  const { completeChallenge, addPoints } = useGamification();

  // Tracker l'affichage d'une suggestion IA
  const trackSuggestionView = useCallback((suggestionId, category, data = {}) => {
    trackUserAction('ai_suggestion_viewed', 'ai', {
      suggestionId,
      category,
      ...data
    });

    // Compléter le défi "check_suggestions" si applicable
    completeChallenge('check_suggestions');
  }, [trackUserAction, completeChallenge]);

  // Tracker l'application d'une suggestion IA
  const trackSuggestionApply = useCallback((suggestionId, category, estimatedSavings = 0, data = {}) => {
    trackUserAction('ai_suggestion_applied', 'ai', {
      suggestionId,
      category,
      estimatedSavings,
      ...data
    });

    // Attribuer des points pour application de suggestion
    const points = Math.min(Math.max(Math.floor(estimatedSavings / 5), 2), 10); // 2-10 points selon économies
    addPoints(points, `Suggestion IA appliquée (${category})`);
  }, [trackUserAction, addPoints]);

  // Tracker le rejet d'une suggestion IA
  const trackSuggestionDismiss = useCallback((suggestionId, category, reason = '', data = {}) => {
    trackUserAction('ai_suggestion_dismissed', 'ai', {
      suggestionId,
      category,
      reason,
      ...data
    });
  }, [trackUserAction]);

  // Tracker l'évaluation d'une suggestion (like/dislike)
  const trackSuggestionRating = useCallback((suggestionId, category, rating, data = {}) => {
    trackUserAction('ai_suggestion_rated', 'ai', {
      suggestionId,
      category,
      rating, // 'like' ou 'dislike'
      ...data
    });

    // Attribuer des points pour feedback
    if (rating === 'like' || rating === 'dislike') {
      addPoints(1, 'Feedback suggestion IA');
    }
  }, [trackUserAction, addPoints]);

  // Tracker l'ouverture d'une catégorie de suggestions
  const trackCategoryExploration = useCallback((category, source = 'navigation') => {
    trackUserAction('category_explored', 'navigation', {
      category,
      source
    });
  }, [trackUserAction]);

  // Tracker l'utilisation d'un filtre ou tri
  const trackFilterUsage = useCallback((filterType, filterValue, category) => {
    trackUserAction('filter_applied', 'ui', {
      filterType,
      filterValue,
      category
    });
  }, [trackUserAction]);

  // Tracker la recherche dans les suggestions
  const trackSuggestionSearch = useCallback((searchTerm, category, resultsCount = 0) => {
    trackUserAction('suggestion_search', 'search', {
      searchTerm: searchTerm.substring(0, 50), // Limiter pour privacy
      category,
      resultsCount
    });
  }, [trackUserAction]);

  // Tracker le temps passé sur une suggestion (détail)
  const trackSuggestionDetailTime = useCallback((suggestionId, category, timeSpent) => {
    trackUserAction('suggestion_detail_time', 'engagement', {
      suggestionId,
      category,
      timeSpent,
      engagementLevel: timeSpent > 30000 ? 'high' : timeSpent > 10000 ? 'medium' : 'low'
    });

    // Bonus points pour engagement élevé
    if (timeSpent > 30000) { // Plus de 30 secondes
      addPoints(2, 'Engagement élevé avec suggestion');
    }
  }, [trackUserAction, addPoints]);

  // Tracker le partage d'une suggestion
  const trackSuggestionShare = useCallback((suggestionId, category, method = 'unknown') => {
    trackUserAction('suggestion_shared', 'social', {
      suggestionId,
      category,
      shareMethod: method
    });

    // Points pour partage
    addPoints(5, 'Suggestion partagée');
  }, [trackUserAction, addPoints]);

  // Tracker l'ajout aux favoris
  const trackSuggestionFavorite = useCallback((suggestionId, category, action = 'add') => {
    trackUserAction('suggestion_favorited', 'engagement', {
      suggestionId,
      category,
      action // 'add' ou 'remove'
    });

    if (action === 'add') {
      addPoints(3, 'Suggestion ajoutée aux favoris');
    }
  }, [trackUserAction, addPoints]);

  // Tracker les erreurs liées à l'IA
  const trackAIError = useCallback((errorType, category, details = {}) => {
    trackUserAction('ai_error_encountered', 'error', {
      errorType,
      category,
      ...details
    });
  }, [trackUserAction]);

  // Tracker l'utilisation des conseils/tips
  const trackTipUsage = useCallback((tipId, category, action = 'viewed') => {
    trackUserAction('tip_interaction', 'education', {
      tipId,
      category,
      action // 'viewed', 'applied', 'shared'
    });

    if (action === 'applied') {
      addPoints(2, 'Conseil appliqué');
    }
  }, [trackUserAction, addPoints]);

  // Tracker les interactions avec l'onboarding IA
  const trackOnboardingStep = useCallback((step, action, data = {}) => {
    trackUserAction('onboarding_ai_step', 'onboarding', {
      step,
      action, // 'start', 'complete', 'skip'
      ...data
    });
  }, [trackUserAction]);

  // Tracker la configuration des préférences IA
  const trackAIPreferences = useCallback((preferenceType, value, previousValue = null) => {
    trackUserAction('ai_preference_changed', 'settings', {
      preferenceType,
      value,
      previousValue
    });

    // Points pour personnalisation
    addPoints(1, 'Préférences IA mises à jour');
  }, [trackUserAction, addPoints]);

  // Méthode utilitaire pour créer des métriques d'engagement
  const createEngagementMetrics = useCallback((interactionData) => {
    const {
      timeSpent = 0,
      actionsCount = 0,
      suggestionsViewed = 0,
      suggestionsApplied = 0,
      category = 'unknown'
    } = interactionData;

    const engagementScore = Math.min(100,
      (timeSpent / 1000) * 0.5 +        // Temps en secondes * 0.5
      actionsCount * 2 +                // Actions * 2
      suggestionsViewed * 1 +           // Vues * 1
      suggestionsApplied * 10           // Applications * 10
    );

    const engagementLevel = engagementScore > 50 ? 'high' :
                           engagementScore > 20 ? 'medium' : 'low';

    trackUserAction('engagement_session_summary', 'analytics', {
      category,
      timeSpent,
      actionsCount,
      suggestionsViewed,
      suggestionsApplied,
      engagementScore: Math.round(engagementScore),
      engagementLevel
    });

    return { engagementScore, engagementLevel };
  }, [trackUserAction]);

  // Tracker les conversions (passage de vue à application)
  const trackConversion = useCallback((fromAction, toAction, category, conversionData = {}) => {
    trackUserAction('conversion_tracked', 'analytics', {
      fromAction,
      toAction,
      category,
      ...conversionData
    });
  }, [trackUserAction]);

  return {
    // Actions principales
    trackSuggestionView,
    trackSuggestionApply,
    trackSuggestionDismiss,
    trackSuggestionRating,

    // Navigation et exploration
    trackCategoryExploration,
    trackFilterUsage,
    trackSuggestionSearch,

    // Engagement
    trackSuggestionDetailTime,
    trackSuggestionShare,
    trackSuggestionFavorite,

    // Système et erreurs
    trackAIError,
    trackTipUsage,
    trackOnboardingStep,
    trackAIPreferences,

    // Analytics avancés
    createEngagementMetrics,
    trackConversion
  };
};