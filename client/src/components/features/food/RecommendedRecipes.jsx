/**
 * Phase 9A - ML Recommended Recipes Component
 * ============================================
 *
 * Displays personalized recipe recommendations powered by ML.
 * Shows match percentage and explanations for each recommendation.
 *
 * Author: Pluqla Dev Team
 * Date: 2025-10-25
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import RecipeCard from './RecipeCard';
import PluqlaLoader from '../../common/PluqlaLoader';
import PluqlaEmptyState from '../../common/PluqlaEmptyState';
import { sanitizeOutput } from '../../../utils/sanitize';

/**
 * Hook to fetch ML recommendations
 */
function useMLRecommendations(options = {}) {
  const { n = 10, budgetMax, excludeIds = [], enabled = true } = options;
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null);

  useEffect(() => {
    if (!enabled) return;

    const fetchRecommendations = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          n: n.toString(),
        });

        if (budgetMax) {
          params.append('budgetMax', budgetMax.toString());
        }

        if (excludeIds.length > 0) {
          params.append('excludeIds', excludeIds.join(','));
        }

        const response = await fetch(`/api/v1/ml/recommendations?${params}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des recommandations');
        }

        const data = await response.json();

        setRecommendations(data.recommendations || []);
        setSource(data.source);
      } catch (err) {
        console.error('ML recommendations error:', err);
        setError(err.message);
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [n, budgetMax, excludeIds.join(','), enabled]);

  return { recommendations, loading, error, source };
}

/**
 * RecommendedRecipes Component
 */
function RecommendedRecipes({ budgetMax, excludeRecipeIds = [], limit = 10 }) {
  const { t } = useTranslation();
  const { recommendations, loading, error, source } = useMLRecommendations({
    n: limit,
    budgetMax,
    excludeIds: excludeRecipeIds,
    enabled: true,
  });

  /**
   * Record feedback when user interacts with a recommendation
   */
  const recordFeedback = async (recipeId, action) => {
    try {
      await fetch('/api/v1/ml/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          recipeId,
          action, // 'like' | 'dislike' | 'view' | 'favorite'
        }),
      });
    } catch (err) {
      console.error('Failed to record feedback:', err);
    }
  };

  /**
   * Handle recipe click (view action)
   */
  const handleRecipeClick = (recipe) => {
    recordFeedback(recipe.recipeId, 'view');
  };

  /**
   * Handle recipe favorite
   */
  const handleRecipeFavorite = (recipe) => {
    recordFeedback(recipe.recipeId, 'favorite');
  };

  // Loading state
  if (loading) {
    return (
      <div className="recommended-recipes">
        <h2 className="recommended-recipes__title">
          🤖 {t('alimentation.recommendations.title', 'Recettes recommandées pour vous')}
        </h2>
        <PluqlaLoader
          text={t('alimentation.recommendations.loading', 'Génération de recommandations personnalisées...')}
        />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="recommended-recipes">
        <h2 className="recommended-recipes__title">
          🤖 {t('alimentation.recommendations.title', 'Recettes recommandées pour vous')}
        </h2>
        <PluqlaEmptyState
          icon="⚠️"
          title={t('alimentation.recommendations.error_title', 'Erreur de recommandations')}
          message={sanitizeOutput(error)}
        />
      </div>
    );
  }

  // Empty state
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="recommended-recipes">
        <h2 className="recommended-recipes__title">
          🤖 {t('alimentation.recommendations.title', 'Recettes recommandées pour vous')}
        </h2>
        <PluqlaEmptyState
          icon="🍽️"
          title={t('alimentation.recommendations.empty_title', 'Aucune recommandation disponible')}
          message={t(
            'alimentation.recommendations.empty_message',
            'Ajoutez quelques recettes à vos favoris pour obtenir des recommandations personnalisées.'
          )}
        />
      </div>
    );
  }

  return (
    <div className="recommended-recipes">
      {/* Header */}
      <div className="recommended-recipes__header">
        <h2 className="recommended-recipes__title">
          🤖 {t('alimentation.recommendations.title', 'Recettes recommandées pour vous')}
        </h2>
        {source && (
          <div className="recommended-recipes__source">
            {source === 'ml' ? (
              <span className="badge badge--success">
                ✨ {t('alimentation.recommendations.ml_powered', 'IA personnalisée')}
              </span>
            ) : (
              <span className="badge badge--info">
                📊 {t('alimentation.recommendations.popular', 'Recettes populaires')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Recommendations Grid */}
      <div className="recommended-recipes__grid">
        {recommendations.map((rec) => (
          <div key={rec.recipeId} className="recommended-recipes__item">
            {/* Match Badge */}
            {rec.matchPercentage > 0 && (
              <div className="recommended-recipes__match-badge">
                <span className={`match-percentage match-percentage--${getMatchLevel(rec.matchPercentage)}`}>
                  {rec.matchPercentage}% {t('alimentation.recommendations.match', 'match')}
                </span>
              </div>
            )}

            {/* Reason */}
            {rec.reason && (
              <div className="recommended-recipes__reason">
                💡 {sanitizeOutput(rec.reason)}
              </div>
            )}

            {/* Recipe Card */}
            <RecipeCard
              recipe={rec.recipe}
              onClick={() => handleRecipeClick(rec)}
              onFavorite={() => handleRecipeFavorite(rec)}
            />
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="recommended-recipes__footer">
        <p className="text-muted">
          {t(
            'alimentation.recommendations.footer_info',
            'Ces recommandations sont personnalisées selon vos goûts, votre budget et vos habitudes alimentaires.'
          )}
        </p>
      </div>
    </div>
  );
}

/**
 * Get match level for styling
 */
function getMatchLevel(percentage) {
  if (percentage >= 80) return 'excellent';
  if (percentage >= 60) return 'good';
  if (percentage >= 40) return 'fair';
  return 'low';
}

export default RecommendedRecipes;
