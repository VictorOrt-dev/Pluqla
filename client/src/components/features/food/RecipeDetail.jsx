import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from '../../../utils/lazyFramerMotion';
import { X, Flame, Sparkles, ChefHat, Check, DollarSign } from 'lucide-react';
import BudgetQuickLogModal from '../../common/BudgetQuickLogModal';

const RecipeDetail = ({ recipe, darkMode, onClose, onMarkAsCooked }) => {
  const [isMarkedCooked, setIsMarkedCooked] = useState(false);
  const [showQuickLogModal, setShowQuickLogModal] = useState(false);
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);

  if (!recipe) return null;

  // ✨ P1.1.2 - Keyboard navigation: Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // ✨ P1.1.2 - Focus management: Auto-focus close button on open
  useEffect(() => {
    if (closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, []);

  // ✨ P1.1.2 - Focus trap inside modal
  useEffect(() => {
    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, []);

  const handleMarkAsCooked = async () => {
    if (onMarkAsCooked) {
      await onMarkAsCooked(recipe.id);
      setIsMarkedCooked(true);
      setTimeout(() => setIsMarkedCooked(false), 3000); // Reset after 3s
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recipe-modal-title"
        aria-describedby="recipe-modal-description"
      >
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative">
            <div className={`h-48 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} flex items-center justify-center`}>
              <span className="text-8xl" role="img" aria-label={`Image recette ${recipe.name || recipe.title}`}>
                {recipe.image}
              </span>
            </div>

            <button
              ref={closeButtonRef}
              onClick={onClose}
              aria-label="Fermer la fenêtre de détail de la recette"
              className="absolute top-4 right-4 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* ✨ Phase 1A - Popularity Score Badge */}
            {recipe.popularity_score !== undefined && recipe.popularity_score > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg"
              >
                <Flame className="w-4 h-4" />
                <span className="text-sm font-bold">{recipe.popularity_score.toFixed(0)}</span>
              </motion.div>
            )}

            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-start justify-between mb-2">
                <h1
                  id="recipe-modal-title"
                  className="text-2xl font-bold text-white"
                >
                  {recipe.name || recipe.title}
                </h1>

                {/* ✨ Phase 1A - AI Badge */}
                {recipe.ai_enriched && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-red-500 to-red-600 shadow-lg ml-2"
                  >
                    <Sparkles className="w-3 h-3 text-white" />
                    <span className="text-xs font-bold text-white">IA</span>
                  </motion.div>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                <span className="px-3 py-1 bg-black/50 text-white text-sm rounded-full">
                  {recipe.prep_time || recipe.prepTime} min
                </span>
                <span className="px-3 py-1 bg-black/50 text-white text-sm rounded-full">
                  {recipe.servings} pers
                </span>
                <span className="px-3 py-1 bg-black/50 text-white text-sm rounded-full">
                  {recipe.difficulty === 'easy' ? 'Facile' : recipe.difficulty === 'intermediate' ? 'Moyen' : recipe.difficulty === 'hard' ? 'Difficile' : recipe.difficulty}
                </span>

                {/* ✨ Phase 1A - Health Score Badge */}
                {recipe.health_score !== undefined && recipe.health_score > 0 && (
                  <span className={`px-3 py-1 text-white text-sm rounded-full ${
                    recipe.health_score >= 70 ? 'bg-green-500/80' :
                    recipe.health_score >= 40 ? 'bg-yellow-500/80' :
                    'bg-red-500/80'
                  }`}>
                    🏥 {recipe.health_score}/100
                  </span>
                )}
              </div>
            </div>
          </div>

        {/* Content */}
        <div id="recipe-modal-description" className="overflow-y-auto max-h-[calc(90vh-12rem)]">
          <div className="p-6 space-y-6">
            {/* Prix et nutrition */}
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl`}>
                <h3 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-black'}`}>
                  Coût total
                </h3>
                <p className="text-2xl font-bold text-green-500">{recipe.price.toFixed(2)}€</p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {(recipe.price / recipe.servings).toFixed(2)}€ par personne
                </p>
              </div>
              
              <div className={`p-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl`}>
                <h3 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-black'}`}>
                  Nutrition
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {recipe.nutrition.calories} cal
                </p>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  P: {recipe.nutrition.protein}g • G: {recipe.nutrition.carbs}g • L: {recipe.nutrition.fat}g
                </p>
              </div>
            </div>

            {/* Ingrédients */}
            <div>
              <h3 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-black'}`}>
                Ingrédients
              </h3>
              <div className="space-y-2">
                {recipe.ingredients.map((ingredient, idx) => (
                  <div
                    key={idx}
                    className={`flex justify-between items-center p-3 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl`}
                  >
                    <div className="flex-1">
                      <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {ingredient.name}
                      </span>
                      <span className={`ml-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        ({ingredient.quantity})
                      </span>
                    </div>
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-black'}`}>
                      {ingredient.price.toFixed(2)}€
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div>
              <h3 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-black'}`}>
                Instructions
              </h3>
              <div className="space-y-3">
                {recipe.instructions.map((instruction, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
                      {idx + 1}
                    </div>
                    <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} flex-1`}>
                      {instruction}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ✨ Phase 1A - AI Tags */}
            {recipe.ai_tags && recipe.ai_tags.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={`p-4 rounded-xl border ${
                  darkMode ? 'bg-red-900/10 border-red-800/30' : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className={`w-4 h-4 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                  <h4 className={`font-semibold ${darkMode ? 'text-red-400' : 'text-red-800'}`}>
                    Tags IA
                  </h4>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {recipe.ai_tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className={`px-3 py-1.5 text-sm rounded-lg ${
                        darkMode ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Conseil */}
            {recipe.tips && (
              <div className={`p-4 ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} border rounded-xl`}>
                <h4 className={`font-semibold mb-2 ${darkMode ? 'text-red-400' : 'text-blue-800'}`}>
                  💡 Conseil du chef
                </h4>
                <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  {recipe.tips}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              {/* Add to Budget Button */}
              <motion.button
                onClick={() => setShowQuickLogModal(true)}
                aria-label="Ajouter au budget alimentaire"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="py-4 rounded-xl font-semibold text-base transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 bg-gradient-to-r from-green-600 to-green-700 text-white hover:shadow-lg"
              >
                <DollarSign className="w-5 h-5" />
                Ajouter au budget
              </motion.button>

              {/* ✨ Phase 1B - Mark as Cooked Button */}
              <motion.button
                onClick={handleMarkAsCooked}
                disabled={isMarkedCooked}
                aria-label={isMarkedCooked ? 'Recette marquée comme cuisinée' : 'Marquer cette recette comme cuisinée'}
                aria-disabled={isMarkedCooked}
                whileHover={!isMarkedCooked ? { scale: 1.02, y: -2 } : {}}
                whileTap={!isMarkedCooked ? { scale: 0.98 } : {}}
                className={`py-4 rounded-xl font-semibold text-base transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                  isMarkedCooked
                    ? 'bg-green-500 text-white cursor-default'
                    : 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:shadow-lg'
                }`}
              >
                {isMarkedCooked ? (
                  <>
                    <Check className="w-5 h-5" />
                    Cuisinée! 🎉
                  </>
                ) : (
                  <>
                    <ChefHat className="w-5 h-5" />
                    Marquer cuisiné
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>
        </motion.div>
      </motion.div>

      {/* Budget Quick-Log Modal */}
      <BudgetQuickLogModal
        isOpen={showQuickLogModal}
        onClose={() => setShowQuickLogModal(false)}
        recipe={recipe}
      />
    </AnimatePresence>
  );
};

export default RecipeDetail;