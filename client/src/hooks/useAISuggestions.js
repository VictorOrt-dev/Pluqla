import { useCallback, useState } from 'react';
import { generateIASuggestions } from '../utils/aiSuggestions';
import { useAnalytics } from '../services/analyticsService';
import { getLanguageForAPI } from '../i18n';
import tokenManager from '../utils/tokenManager';
import secureLogger from '../utils/secureLogger';

export const useAISuggestions = (answers = []) => {
  const [isLoading, setIsLoading] = useState(false);
  const { trackAIRequest } = useAnalytics();

  const getAISuggestions = useCallback(async (category, userId = 'default') => {
    const startTime = Date.now();

    try {
      setIsLoading(true);

      // Tracker le début de requête IA
      trackAIRequest('start', category, { userId, answersHash: JSON.stringify(answers).substring(0, 50) });

      let suggestions = [];

      // 1. Essayer d'abord l'API backend
      try {
        const token = tokenManager.getAccessToken();
        if (!token) {
          throw new Error('No valid authentication token available');
        }

        const lang = getLanguageForAPI();
        const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/ai/suggestions?category=${category}&limit=5&lang=${lang}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.data?.suggestions)) {
            suggestions = data.data.suggestions;
            secureLogger.success(`Suggestions IA récupérées via API backend pour ${category}`, { count: suggestions.length });
          }
        } else if (response.status === 401) {
          // Token expiré ou invalide, utiliser fallback local
          secureLogger.warn('Token expired or invalid for AI suggestions');
          throw new Error('Authentication required - using fallback');
        }
      } catch (apiError) {
        secureLogger.warn('API backend indisponible, utilisation du fallback local:', apiError.message);

        // 2. Fallback: utiliser la fonction locale si API indisponible
        suggestions = generateIASuggestions(category, answers, {}, () => {});
        secureLogger.info(`Suggestions IA locales générées pour ${category}`, { count: suggestions?.length || 0 });
      }

      // Tracker le succès de la requête IA
      const duration = Date.now() - startTime;
      trackAIRequest('success', category, {
        userId,
        duration,
        suggestionsCount: suggestions?.length || 0,
        source: Array.isArray(suggestions) && suggestions.length > 0 ? 'backend' : 'local'
      });

      // S'assurer qu'on retourne toujours un tableau
      return Array.isArray(suggestions) ? suggestions : [];
    } catch (error) {
      secureLogger.error('Erreur récupération suggestions IA:', error.message);

      // Tracker l'erreur
      const duration = Date.now() - startTime;
      trackAIRequest('error', category, {
        userId,
        duration,
        error: error.message
      });

      // Fallback final: générer localement et s'assurer que c'est un tableau
      const fallbackSuggestions = generateIASuggestions(category, answers, {}, () => {});
      return Array.isArray(fallbackSuggestions) ? fallbackSuggestions : [];
    } finally {
      setIsLoading(false);
    }
  }, [answers, trackAIRequest]);

  // Invalider le cache pour une catégorie (appel API si disponible)
  const invalidateCategory = useCallback(async (category) => {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        secureLogger.warn('No valid token for cache invalidation');
        return;
      }

      // Essayer d'invalider le cache côté backend
      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/ai/cache/invalidate`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ category })
      });

      if (response.ok) {
        secureLogger.success(`Cache backend invalidé pour ${category}`);
      }
    } catch (error) {
      secureLogger.warn('Impossible d\'invalider le cache backend:', error.message);
    }
  }, []);

  // Obtenir les statistiques IA
  const getAIStats = useCallback(async () => {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        secureLogger.warn('No valid token for AI stats');
        return {};
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/ai/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.data || {};
      }
    } catch (error) {
      secureLogger.warn('Impossible de récupérer les stats IA:', error.message);
    }
    return {};
  }, []);

  return {
    getAISuggestions,
    invalidateCategory,
    getAIStats,
    isLoading
  };
};