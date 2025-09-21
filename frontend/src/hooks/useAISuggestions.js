import { useCallback, useState } from 'react';
import { generateIASuggestions } from '../utils/aiSuggestions';
import { useAnalytics } from '../services/analyticsService';
import { getLanguageForAPI } from '../i18n';

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
        const lang = getLanguageForAPI();
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3004/api'}/ai/suggestions?category=${category}&limit=5&lang=${lang}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}` // JWT token
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.data?.suggestions)) {
            suggestions = data.data.suggestions;
            console.log(`🤖 Suggestions IA récupérées via API backend pour ${category}`);
          }
        } else if (response.status === 401) {
          // Token expiré ou invalide, utiliser fallback local
          throw new Error('Authentication required - using fallback');
        }
      } catch (apiError) {
        console.warn('⚠️ API backend indisponible, utilisation du fallback local:', apiError.message);

        // 2. Fallback: utiliser la fonction locale si API indisponible
        suggestions = generateIASuggestions(category, answers, {}, () => {});
        console.log(`🏠 Suggestions IA locales générées pour ${category}`);
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
      console.error('Erreur récupération suggestions IA:', error);

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
      // Essayer d'invalider le cache côté backend
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3004/api'}/ai/cache/invalidate`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ category })
      });

      if (response.ok) {
        console.log(`🗑️ Cache backend invalidé pour ${category}`);
      }
    } catch (error) {
      console.warn('Impossible d\'invalider le cache backend:', error.message);
    }
  }, []);

  // Obtenir les statistiques IA
  const getAIStats = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3004/api'}/ai/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.data || {};
      }
    } catch (error) {
      console.warn('Impossible de récupérer les stats IA:', error.message);
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