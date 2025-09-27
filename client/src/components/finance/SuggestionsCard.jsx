import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../common/LoadingSpinner';
import AILoader from '../common/AILoader';
import { financialApi } from '../../services/financialApi';

const SuggestionsCard = ({ darkMode, limit = 5, detailed = false }) => {
  const { t, i18n } = useTranslation();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);

  const getSampleSuggestions = () => {
    return [
      {
        id: 1,
        title: "Réduire les frais de transport",
        description: "Considérez utiliser les transports en commun ou le covoiturage pour vos trajets quotidiens.",
        type: "expense_reduction",
        impact: "medium",
        potentialSaving: 120,
        priority: 7,
        category: "Transport",
        actionRequired: "Comparer les options de transport disponibles dans votre région"
      },
      {
        id: 2,
        title: "Optimiser vos abonnements",
        description: "Vous avez plusieurs abonnements de streaming. Considérez garder seulement ceux que vous utilisez vraiment.",
        type: "budget_optimization",
        impact: "low",
        potentialSaving: 45,
        priority: 5,
        category: "Loisirs"
      },
      {
        id: 3,
        title: "Augmenter votre épargne automatique",
        description: "Votre taux d'épargne est bon ! Vous pourriez augmenter de 50€/mois votre épargne automatique.",
        type: "savings_increase",
        impact: "high",
        potentialSaving: 600,
        priority: 9,
        category: "Épargne",
        actionRequired: "Configurer un virement automatique supplémentaire"
      }
    ].slice(0, limit);
  };

  const fetchSuggestions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await financialApi.getSuggestions(i18n.language, limit);
      setSuggestions(Array.isArray(data) && data.length > 0 ? data : getSampleSuggestions());
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      // Utiliser les données d'exemple en cas d'erreur
      setSuggestions(getSampleSuggestions());
      setError(null); // Ne pas afficher l'erreur, utiliser les données d'exemple
    } finally {
      setLoading(false);
    }
  }, [i18n.language, limit]);

  useEffect(() => {
    // Utiliser directement les données d'exemple
    setSuggestions(getSampleSuggestions());
  }, [limit]);

  const dismissSuggestion = async (suggestionId) => {
    try {
      await financialApi.dismissSuggestion(suggestionId);
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    } catch (error) {
      console.error('Error dismissing suggestion:', error);
    }
  };

  const generateNewSuggestions = async () => {
    try {
      setGenerating(true);
      await fetchSuggestions();
    } finally {
      setGenerating(false);
    }
  };

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'high':
        return 'text-red-500 bg-red-100 dark:bg-red-900/20';
      case 'medium':
        return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/20';
      case 'low':
        return 'text-green-500 bg-green-100 dark:bg-green-900/20';
      default:
        return 'text-gray-500 bg-gray-100 dark:bg-gray-800';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'expense_reduction':
        return '✂️';
      case 'budget_optimization':
        return '📊';
      case 'savings_increase':
        return '💰';
      default:
        return '💡';
    }
  };

  const getTypeDisplayName = (type) => {
    const translations = {
      expense_reduction: t('suggestions.types.expenseReduction'),
      budget_optimization: t('suggestions.types.budgetOptimization'),
      savings_increase: t('suggestions.types.savingsIncrease')
    };
    return translations[type] || type;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  if (loading && !generating) {
    return (
      <div className={`rounded-xl p-6 ${
        darkMode
          ? 'bg-gray-900 border border-gray-700'
          : 'bg-white border border-gray-200'
      } shadow-lg`}>
        <div className="flex items-center justify-center h-48">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-4 sm:p-6 transition-all duration-300 ${
      darkMode
        ? 'bg-gray-900 border border-gray-700'
        : 'bg-white border border-gray-200'
    } shadow-lg`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${
            darkMode
              ? 'bg-red-500/20 text-red-400'
              : 'bg-red-500/20 text-red-600'
          }`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={`text-lg font-semibold truncate ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {detailed ? t('suggestions.detailedTitle') : t('suggestions.title')}
            </h3>
            <p className={`text-sm truncate ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {t('suggestions.subtitle')}
            </p>
          </div>
        </div>

        <button
          onClick={generateNewSuggestions}
          disabled={generating}
          className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto ${
            darkMode
              ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-50'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50'
          }`}
        >
          {generating ? (
            <>
              <AILoader size="sm" />
              <span className="hidden sm:inline">{t('suggestions.generating')}</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">{t('suggestions.refresh')}</span>
            </>
          )}
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Suggestions List */}
      {suggestions.length > 0 ? (
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className={`relative p-4 rounded-lg border transition-all duration-200 ${
                darkMode
                  ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {/* Suggestion Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-3 min-w-0 flex-1">
                  <span className="text-2xl flex-shrink-0">{getTypeIcon(suggestion.type)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mb-1">
                      <h4 className={`font-semibold truncate ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {suggestion.title}
                      </h4>
                      <span className={`inline-block mt-1 sm:mt-0 px-2 py-1 text-xs font-medium rounded-full ${getImpactColor(suggestion.impact)}`}>
                        {t(`suggestions.impact.${suggestion.impact}`)}
                      </span>
                    </div>
                    <p className={`text-sm truncate ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {getTypeDisplayName(suggestion.type)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => dismissSuggestion(suggestion.id)}
                  className={`p-1 rounded-full transition-colors flex-shrink-0 ml-2 ${
                    darkMode
                      ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300'
                      : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                  }`}
                  title={t('suggestions.dismiss')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Suggestion Content */}
              <p className={`text-sm leading-relaxed mb-3 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {suggestion.description}
              </p>

              {/* Action Required */}
              {suggestion.actionRequired && (
                <div className={`p-3 rounded-lg mb-3 ${
                  darkMode
                    ? 'bg-blue-900/20 border border-blue-800'
                    : 'bg-blue-50 border border-blue-200'
                }`}>
                  <div className="flex items-start space-x-2">
                    <svg className="w-4 h-4 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className={`text-sm font-medium mb-1 ${
                        darkMode ? 'text-blue-300' : 'text-blue-700'
                      }`}>
                        {t('suggestions.actionRequired')}
                      </p>
                      <p className={`text-sm ${
                        darkMode ? 'text-blue-200' : 'text-red-600'
                      }`}>
                        {suggestion.actionRequired}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Potential Saving */}
              {suggestion.potentialSaving > 0 && (
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {t('suggestions.potentialSaving')}
                  </span>
                  <span className={`font-semibold text-green-500`}>
                    {formatCurrency(suggestion.potentialSaving)}
                  </span>
                </div>
              )}

              {/* Priority Indicator */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2 sm:space-y-0">
                <div className="flex items-center space-x-2">
                  <span className={`text-xs ${
                    darkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {t('suggestions.priority')}
                  </span>
                  <div className="flex space-x-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i < Math.min(suggestion.priority / 2, 5)
                            ? 'bg-yellow-400'
                            : darkMode
                              ? 'bg-gray-700'
                              : 'bg-gray-300'
                        }`}
                      ></div>
                    ))}
                  </div>
                </div>

                {suggestion.category && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    darkMode
                      ? 'bg-gray-700 text-gray-300'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {suggestion.category}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Empty State
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🤖</div>
          <h4 className={`text-lg font-medium mb-2 ${
            darkMode ? 'text-gray-200' : 'text-gray-700'
          }`}>
            {t('suggestions.noSuggestions')}
          </h4>
          <p className={`text-sm mb-4 ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {t('suggestions.noSuggestionsDescription')}
          </p>
          <button
            onClick={generateNewSuggestions}
            disabled={generating}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              darkMode
                ? 'bg-red-600 hover:bg-blue-700 text-white disabled:opacity-50'
                : 'bg-red-500 hover:bg-red-600 text-white disabled:opacity-50'
            }`}
          >
            {generating ? (
              <div className="flex items-center space-x-2">
                <AILoader size="sm" />
                <span>{t('suggestions.generating')}</span>
              </div>
            ) : (
              t('suggestions.generateSuggestions')
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default SuggestionsCard;