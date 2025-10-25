import React from 'react';
import PropTypes from 'prop-types';

/**
 * ✨ Phase 1C - Smart Suggestions Panel
 *
 * Displays AI-powered recipe suggestions based on:
 * - User preferences (dietary restrictions, cuisines, skill level)
 * - Popularity scores (Phase 1A)
 * - User interaction history
 *
 * Each suggestion includes:
 * - Recipe card with image
 * - Reason for suggestion (e.g., "Matches your vegetarian preference")
 * - Popularity score indicator
 * - Quick actions (view, favorite)
 */
const SmartSuggestionsPanel = ({
  suggestions = [],
  isLoading = false,
  darkMode = false,
  onRecipeSelect,
  onFavoriteToggle,
  favorites = []
}) => {
  if (isLoading) {
    return (
      <div className={`glass-effect p-6 rounded-2xl ${
        darkMode ? 'glass-effect-dark' : ''
      }`}>
        <div className="flex items-center justify-center space-x-3 py-8">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-red-500 to-red-600 animate-pulse"></div>
          <span className={`text-lg font-medium ${
            darkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            🧠 Génération de suggestions intelligentes...
          </span>
        </div>
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className={`glass-effect p-6 rounded-2xl ${
        darkMode ? 'glass-effect-dark' : ''
      }`}>
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🤔</div>
          <h3 className={`text-lg font-semibold mb-2 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Aucune suggestion pour le moment
          </h3>
          <p className={`text-sm ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Complétez votre profil alimentaire pour recevoir des suggestions personnalisées
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`glass-effect p-4 rounded-2xl ${
        darkMode ? 'glass-effect-dark' : ''
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-lg font-semibold ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              🧠 Suggestions Intelligentes
            </h3>
            <p className={`text-sm ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Basées sur vos préférences et l'IA
            </p>
          </div>
          <div className={`px-4 py-2 rounded-full text-sm font-bold ${
            darkMode
              ? 'bg-gradient-to-r from-red-600/30 to-red-700/30 text-red-400 border border-red-600/50'
              : 'bg-gradient-to-r from-red-100 to-red-200 text-red-700 border border-red-300'
          }`}>
            {suggestions.length} {suggestions.length > 1 ? 'recettes' : 'recette'}
          </div>
        </div>
      </div>

      {/* Suggestions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {suggestions.map((suggestion, index) => {
          const recipe = suggestion.recipe || {};
          const isFav = favorites.includes(recipe.id);

          return (
            <div
              key={recipe.id || index}
              className={`glass-effect rounded-2xl overflow-hidden transition-all duration-300 hover:scale-102 hover:shadow-xl ${
                darkMode ? 'glass-effect-dark' : ''
              }`}
              style={{
                animationDelay: `${index * 100}ms`
              }}
            >
              {/* Recipe Image */}
              <div className="relative h-48 overflow-hidden">
                {recipe.image ? (
                  <img
                    src={recipe.image}
                    alt={recipe.title}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
                    }}
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${
                    darkMode ? 'bg-gray-800' : 'bg-gray-200'
                  }`}>
                    <span className="text-6xl">🍽️</span>
                  </div>
                )}

                {/* Popularity Score Badge */}
                {recipe.popularityScore !== undefined && (
                  <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full backdrop-blur-xl bg-black/40 border border-white/20 flex items-center space-x-1.5 shadow-lg">
                    <span className="text-yellow-400 text-sm">🔥</span>
                    <span className="text-white font-bold text-sm">
                      {recipe.popularityScore.toFixed(0)}
                    </span>
                  </div>
                )}

                {/* Favorite Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFavoriteToggle?.(recipe.id);
                  }}
                  className="absolute top-3 left-3 p-2.5 rounded-full backdrop-blur-xl bg-black/40 border border-white/20 transition-all duration-200 hover:scale-110 hover:bg-black/60 shadow-lg"
                >
                  <span className="text-xl">
                    {isFav ? '❤️' : '🤍'}
                  </span>
                </button>

                {/* Suggestion Reason Badge */}
                {suggestion.reason && (
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center space-x-2 text-white">
                      <span className="text-sm">💡</span>
                      <span className="text-xs font-medium">
                        {suggestion.reason}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Recipe Info */}
              <div className="p-4">
                <h4 className={`font-bold text-lg mb-2 line-clamp-1 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {recipe.title || 'Sans titre'}
                </h4>

                <p className={`text-sm mb-4 line-clamp-2 ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {recipe.description || 'Aucune description'}
                </p>

                {/* Recipe Meta */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <span>⏱️</span>
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                        {recipe.cookingTime || 0} min
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>💰</span>
                      <span className="font-semibold text-red-500">
                        {recipe.estimatedPrice || 0}€
                      </span>
                    </div>
                  </div>

                  {/* Difficulty Badge */}
                  {recipe.difficulty && (
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      recipe.difficulty === 'easy' || recipe.difficulty === 'facile'
                        ? darkMode
                          ? 'bg-green-900/30 text-green-400 border border-green-700/50'
                          : 'bg-green-100 text-green-700 border border-green-300'
                        : recipe.difficulty === 'intermediate' || recipe.difficulty === 'intermédiaire'
                        ? darkMode
                          ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700/50'
                          : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                        : darkMode
                        ? 'bg-red-900/30 text-red-400 border border-red-700/50'
                        : 'bg-red-100 text-red-700 border border-red-300'
                    }`}>
                      {recipe.difficulty === 'easy' ? 'Facile' :
                       recipe.difficulty === 'intermediate' ? 'Moyen' :
                       recipe.difficulty === 'hard' ? 'Difficile' :
                       recipe.difficulty}
                    </div>
                  )}
                </div>

                {/* View Button */}
                <button
                  onClick={() => onRecipeSelect?.(recipe.id)}
                  className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                    darkMode
                      ? 'bg-gradient-to-r from-red-600/80 to-red-700/80 hover:from-red-600 hover:to-red-700 text-white border border-red-500/50'
                      : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                  } shadow-lg hover:shadow-xl hover:scale-105`}
                >
                  Voir la recette 👁️
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tips Section */}
      <div className={`glass-effect p-4 rounded-2xl ${
        darkMode ? 'glass-effect-dark' : ''
      }`}>
        <div className="flex items-start space-x-3">
          <span className="text-2xl">💡</span>
          <div>
            <h4 className={`font-semibold mb-1 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Améliorez vos suggestions
            </h4>
            <p className={`text-sm ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Plus vous interagissez avec les recettes (vues, favoris, cuisinées),
              plus nos suggestions deviennent précises!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

SmartSuggestionsPanel.propTypes = {
  suggestions: PropTypes.arrayOf(PropTypes.shape({
    recipe: PropTypes.shape({
      id: PropTypes.string,
      title: PropTypes.string,
      description: PropTypes.string,
      image: PropTypes.string,
      cookingTime: PropTypes.number,
      estimatedPrice: PropTypes.number,
      difficulty: PropTypes.string,
      popularityScore: PropTypes.number
    }),
    reason: PropTypes.string,
    score: PropTypes.number
  })),
  isLoading: PropTypes.bool,
  darkMode: PropTypes.bool,
  onRecipeSelect: PropTypes.func,
  onFavoriteToggle: PropTypes.func,
  favorites: PropTypes.array
};

export default SmartSuggestionsPanel;
