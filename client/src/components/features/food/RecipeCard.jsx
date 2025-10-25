import React, { useState } from 'react';
import { motion } from '../../../utils/lazyFramerMotion';
import { Sparkles, Flame, ChefHat, DollarSign } from 'lucide-react';
import BudgetQuickLogModal from '../../common/BudgetQuickLogModal';

const RecipeCard = ({
  recipe,
  darkMode,
  onSelect,
  onFavoriteToggle,
  isFavorite,
  showAIBadge = false, // ✨ Phase 1C - Show AI recommendation badge
  showPopularityScore = false // ✨ Phase 1A - Show popularity score
}) => {
  const [showQuickLogModal, setShowQuickLogModal] = useState(false);
  const pricePerServing = (recipe.price / recipe.servings).toFixed(2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg ${
        showAIBadge ? 'ring-2 ring-red-500/20' : ''
      }`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Voir les détails de la recette ${recipe.name || recipe.title}`}
    >
      <div className="relative">
        <div className={`h-32 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} flex items-center justify-center`}>
          <span className="text-4xl" role="img" aria-label={`Icône recette ${recipe.name || recipe.title}`}>
            {recipe.image}
          </span>
        </div>

        {/* ✨ Phase 1C - AI Recommendation Badge (top right corner) */}
        {showAIBadge && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="absolute top-3 right-3 flex items-center gap-2"
          >
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gradient-to-r from-red-500 to-red-600 shadow-lg">
              <Sparkles className="w-3 h-3 text-white" />
              <span className="text-xs font-bold text-white">IA</span>
            </div>
          </motion.div>
        )}

        {/* Action buttons */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {/* Favorite button */}
          {!showAIBadge && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFavoriteToggle();
              }}
              aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              aria-pressed={isFavorite}
              className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <span className={`text-lg ${isFavorite ? 'text-red-400' : 'text-gray-300'}`} aria-hidden="true">
                {isFavorite ? '❤️' : '🤍'}
              </span>
            </button>
          )}

          {/* Add to Budget button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowQuickLogModal(true);
            }}
            aria-label="Ajouter au budget alimentaire"
            className="w-8 h-8 bg-green-600/90 rounded-full flex items-center justify-center hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            title="Ajouter au budget"
          >
            <DollarSign className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="absolute top-3 left-3 flex gap-2 flex-wrap max-w-[70%]">
          {/* ✨ Phase 1A: Popularity Score Badge */}
          {showPopularityScore && recipe.popularity_score !== undefined && recipe.popularity_score > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded-full shadow-lg"
            >
              <Flame className="w-3 h-3" />
              <span>{recipe.popularity_score.toFixed(0)}</span>
            </motion.div>
          )}

          {/* Difficulty badge */}
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            recipe.difficulty === 'Facile' || recipe.difficulty === 'easy'
              ? 'bg-green-500 text-white'
              : recipe.difficulty === 'Moyen' || recipe.difficulty === 'intermediate'
                ? 'bg-yellow-500 text-white'
                : 'bg-red-500 text-white'
          }`}>
            {recipe.difficulty === 'easy' ? 'Facile' :
             recipe.difficulty === 'intermediate' ? 'Moyen' :
             recipe.difficulty === 'hard' ? 'Difficile' :
             recipe.difficulty}
          </span>

          {/* Time badge */}
          <span className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-full">
            {recipe.prep_time || recipe.prepTime || recipe.cookingTime || 0} min
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
            {recipe.name || recipe.title}
          </h3>
          <div className="text-right">
            <p className="text-lg font-bold text-green-500">{recipe.price?.toFixed(2) || '0.00'}€</p>
            <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {pricePerServing}€/pers
            </p>
          </div>
        </div>

        <p className={`text-sm mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Pour {recipe.servings} personne{recipe.servings > 1 ? 's' : ''} • {recipe.category}
        </p>

        {/* ✨ Phase 1A - AI Health Score */}
        {recipe.health_score !== undefined && recipe.health_score > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <div className={`flex-1 h-2 rounded-full overflow-hidden ${
              darkMode ? 'bg-gray-800' : 'bg-gray-200'
            }`}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${recipe.health_score}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`h-full rounded-full ${
                  recipe.health_score >= 70 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                  recipe.health_score >= 40 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                  'bg-gradient-to-r from-red-500 to-red-600'
                }`}
              />
            </div>
            <span className={`text-xs font-semibold ${
              recipe.health_score >= 70 ? 'text-green-500' :
              recipe.health_score >= 40 ? 'text-yellow-500' :
              'text-red-500'
            }`}>
              {recipe.health_score}/100
            </span>
          </div>
        )}

        {/* ✨ Phase 1A - AI-Enriched Tags */}
        <div className="flex gap-1 flex-wrap">
          {(recipe.tags || []).slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className={`px-2 py-1 text-xs rounded-full ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}
            >
              {tag}
            </span>
          ))}
          {showAIBadge && recipe.ai_tags && recipe.ai_tags.length > 0 && (
            <span className="px-2 py-1 text-xs rounded-full bg-red-500/10 text-red-500 border border-red-500/20 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              {recipe.ai_tags[0]}
            </span>
          )}
        </div>
      </div>

      {/* Budget Quick-Log Modal */}
      <BudgetQuickLogModal
        isOpen={showQuickLogModal}
        onClose={() => setShowQuickLogModal(false)}
        recipe={recipe}
      />
    </motion.div>
  );
};

export default RecipeCard;