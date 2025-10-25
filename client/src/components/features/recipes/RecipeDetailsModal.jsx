/**
 * RecipeDetailsModal Component
 *
 * Full-screen modal displaying detailed recipe information
 * Includes: Ingredients, Instructions, Nutrition, Price, EcoScore
 * Design: Pluqla DA Glassmorphism with scroll
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Heart,
  Clock,
  Users,
  DollarSign,
  ChefHat,
  ShoppingCart,
  ExternalLink,
  Share2,
  Loader2,
} from 'lucide-react';
import EcoBadge, { EcoScoreDetail } from '../../common/EcoBadge';
import RecipeShareButton from './RecipeShareButton';
import { useRecipeDetails, useAddFavorite, useRemoveFavorite } from '../../../hooks/useRecipesQuery';

/**
 * RecipeDetailsModal Component
 */
const RecipeDetailsModal = ({
  provider,
  recipeId,
  isOpen,
  onClose,
  initialIsFavorite = false,
  className = '',
}) => {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [activeTab, setActiveTab] = useState('ingredients'); // ingredients, instructions, nutrition

  // Fetch recipe details
  const { data: recipe, isLoading, error } = useRecipeDetails(provider, recipeId, {
    enabled: isOpen && !!provider && !!recipeId,
  });

  // Favorite mutations
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();

  /**
   * Handle favorite toggle
   */
  const handleToggleFavorite = async () => {
    try {
      if (isFavorite) {
        await removeFavorite.mutateAsync({ externalId: recipeId, provider });
        setIsFavorite(false);
      } else {
        await addFavorite.mutateAsync({ externalId: recipeId, provider });
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  /**
   * Format price in EUR
   */
  const formatPrice = (price) => {
    if (!price) return '—';
    return `${price.toFixed(2).replace('.', ',')} €`;
  };

  /**
   * Render tabs
   */
  const tabs = [
    { id: 'ingredients', label: 'Ingrédients', icon: ShoppingCart },
    { id: 'instructions', label: 'Préparation', icon: ChefHat },
    { id: 'nutrition', label: 'Nutrition', icon: DollarSign },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`
              fixed
              inset-4
              md:inset-8
              lg:inset-16
              bg-white/95
              backdrop-blur-xl
              rounded-3xl
              shadow-2xl
              border border-white/20
              z-50
              overflow-hidden
              flex flex-col
              ${className}
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Loading State */}
            {isLoading && (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={40} className="animate-spin text-[#E63946]" />
                  <p className="text-gray-600">Chargement de la recette...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-red-600 mb-4">Erreur lors du chargement de la recette</p>
                  <button
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            )}

            {/* Content */}
            {recipe && !isLoading && !error && (
              <>
                {/* Header with Image */}
                <div className="relative h-64 md:h-80 flex-shrink-0">
                  {recipe.image ? (
                    <img
                      src={recipe.image}
                      alt={recipe.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <ChefHat size={80} className="text-gray-400" />
                    </div>
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                  {/* Close Button */}
                  <button
                    onClick={onClose}
                    className="
                      absolute top-4 right-4
                      p-2.5
                      rounded-full
                      bg-white/90
                      backdrop-blur-sm
                      shadow-lg
                      hover:bg-white
                      transition-all duration-200
                      text-gray-700
                      hover:text-gray-900
                    "
                    aria-label="Fermer"
                  >
                    <X size={24} />
                  </button>

                  {/* Action Buttons */}
                  <div className="absolute top-4 left-4 flex gap-2">
                    {/* Favorite Button */}
                    <button
                      onClick={handleToggleFavorite}
                      disabled={addFavorite.isLoading || removeFavorite.isLoading}
                      className={`
                        p-2.5
                        rounded-full
                        backdrop-blur-sm
                        shadow-lg
                        transition-all duration-200
                        ${isFavorite
                          ? 'bg-[#E63946] text-white'
                          : 'bg-white/90 text-gray-700 hover:text-[#E63946]'
                        }
                        disabled:opacity-50
                      `}
                      aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    >
                      <Heart
                        size={24}
                        fill={isFavorite ? 'currentColor' : 'none'}
                        strokeWidth={2}
                      />
                    </button>

                    {/* Share Button - Enhanced with tracking */}
                    <RecipeShareButton
                      recipe={{
                        id: recipeId,
                        provider: provider,
                        title: recipe.title,
                        image: recipe.image,
                      }}
                      variant="icon"
                      onShareSuccess={(method) => {
                        console.log(`Recipe shared via ${method}`);
                      }}
                    />
                  </div>

                  {/* Title & Provider */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                          {recipe.title}
                        </h1>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 bg-black/50 text-white rounded-full backdrop-blur-sm">
                            {recipe.provider}
                          </span>
                        </div>
                      </div>
                      {recipe.ecoScore !== null && recipe.ecoScore !== undefined && (
                        <EcoBadge
                          score={recipe.ecoScore}
                          grade={recipe.ecoScoreGrade}
                          size="lg"
                          showScore={true}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Meta Information Bar */}
                <div className="
                  flex-shrink-0
                  grid grid-cols-3 gap-4
                  px-6 py-4
                  bg-white/60
                  backdrop-blur-md
                  border-b border-gray-200
                ">
                  {recipe.readyInMinutes > 0 && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Clock size={20} className="text-[#E63946]" />
                      <div>
                        <p className="text-xs text-gray-500">Temps</p>
                        <p className="font-semibold">{recipe.readyInMinutes} min</p>
                      </div>
                    </div>
                  )}

                  {recipe.servings > 0 && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Users size={20} className="text-[#E63946]" />
                      <div>
                        <p className="text-xs text-gray-500">Portions</p>
                        <p className="font-semibold">{recipe.servings} pers.</p>
                      </div>
                    </div>
                  )}

                  {recipe.pricePerServingEur && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <DollarSign size={20} className="text-[#E63946]" />
                      <div>
                        <p className="text-xs text-gray-500">Prix/portion</p>
                        <p className="font-semibold text-[#E63946]">
                          {formatPrice(recipe.pricePerServingEur)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tabs */}
                <div className="
                  flex-shrink-0
                  flex
                  border-b border-gray-200
                  bg-white/40
                  backdrop-blur-sm
                  px-6
                ">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                          flex items-center gap-2
                          px-4 py-3
                          font-medium
                          transition-all duration-200
                          border-b-2
                          ${activeTab === tab.id
                            ? 'border-[#E63946] text-[#E63946]'
                            : 'border-transparent text-gray-600 hover:text-gray-900'
                          }
                        `}
                      >
                        <Icon size={18} />
                        <span className="hidden sm:inline">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                  {/* Ingredients Tab */}
                  {activeTab === 'ingredients' && (
                    <div className="space-y-4 max-w-3xl">
                      <h2 className="text-xl font-bold text-gray-900">Ingrédients</h2>
                      {recipe.ingredients && recipe.ingredients.length > 0 ? (
                        <ul className="space-y-2">
                          {recipe.ingredients.map((ingredient, index) => (
                            <li
                              key={index}
                              className="
                                flex items-start gap-3
                                p-3
                                bg-white/60
                                backdrop-blur-sm
                                rounded-lg
                                border border-gray-200
                              "
                            >
                              <span className="text-[#E63946] font-bold">•</span>
                              <span className="flex-1 text-gray-700">
                                {ingredient.original || ingredient.name}
                                {ingredient.amount && (
                                  <span className="text-gray-500 ml-2">
                                    ({ingredient.amount} {ingredient.unit})
                                  </span>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500 italic">Ingrédients non disponibles</p>
                      )}

                      {/* Total Price */}
                      {recipe.totalPriceEur && (
                        <div className="
                          mt-6 p-4
                          bg-[#E63946]/10
                          border-2 border-[#E63946]/30
                          rounded-xl
                        ">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-700">
                              Coût total estimé
                            </span>
                            <span className="text-2xl font-bold text-[#E63946]">
                              {formatPrice(recipe.totalPriceEur)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Instructions Tab */}
                  {activeTab === 'instructions' && (
                    <div className="space-y-4 max-w-3xl">
                      <h2 className="text-xl font-bold text-gray-900">Préparation</h2>

                      {/* Summary */}
                      {recipe.summary && (
                        <div
                          className="
                            p-4
                            bg-blue-50
                            border border-blue-200
                            rounded-xl
                            text-gray-700
                            prose prose-sm
                          "
                          dangerouslySetInnerHTML={{ __html: recipe.summary }}
                        />
                      )}

                      {/* Instructions */}
                      {recipe.instructions && recipe.instructions.length > 0 ? (
                        <ol className="space-y-3">
                          {recipe.instructions.map((instruction, index) => (
                            <li
                              key={index}
                              className="
                                flex gap-4
                                p-4
                                bg-white/60
                                backdrop-blur-sm
                                rounded-xl
                                border border-gray-200
                              "
                            >
                              <span className="
                                flex-shrink-0
                                w-8 h-8
                                rounded-full
                                bg-[#E63946]
                                text-white
                                flex items-center justify-center
                                font-bold
                              ">
                                {index + 1}
                              </span>
                              <p className="flex-1 text-gray-700 leading-relaxed">
                                {instruction.step || instruction}
                              </p>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="text-gray-500 italic">Instructions non disponibles</p>
                      )}

                      {/* External Link */}
                      {recipe.sourceUrl && (
                        <a
                          href={recipe.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="
                            inline-flex items-center gap-2
                            px-5 py-3
                            rounded-lg
                            bg-white/80
                            backdrop-blur-md
                            border border-gray-200
                            text-gray-700
                            hover:bg-[#E63946]
                            hover:text-white
                            hover:border-[#E63946]
                            transition-all duration-200
                            shadow-md
                            hover:shadow-lg
                          "
                        >
                          <ExternalLink size={18} />
                          Voir la recette originale
                        </a>
                      )}
                    </div>
                  )}

                  {/* Nutrition Tab */}
                  {activeTab === 'nutrition' && (
                    <div className="space-y-6 max-w-3xl">
                      <h2 className="text-xl font-bold text-gray-900">Informations nutritionnelles</h2>

                      {/* EcoScore Detail */}
                      {recipe.ecoScore !== null && recipe.ecoScore !== undefined && (
                        <EcoScoreDetail
                          score={recipe.ecoScore}
                          grade={recipe.ecoScoreGrade}
                          details={recipe.ecoScoreBreakdown}
                        />
                      )}

                      {/* Nutrition Facts */}
                      {recipe.nutrition && (
                        <div className="
                          p-5
                          bg-white/60
                          backdrop-blur-sm
                          rounded-xl
                          border border-gray-200
                        ">
                          <h3 className="font-semibold text-gray-900 mb-4">Par portion</h3>
                          <div className="grid grid-cols-2 gap-4">
                            {recipe.nutrition.calories && (
                              <div>
                                <p className="text-sm text-gray-500">Calories</p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {recipe.nutrition.calories} kcal
                                </p>
                              </div>
                            )}
                            {recipe.nutrition.protein && (
                              <div>
                                <p className="text-sm text-gray-500">Protéines</p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {recipe.nutrition.protein}
                                </p>
                              </div>
                            )}
                            {recipe.nutrition.fat && (
                              <div>
                                <p className="text-sm text-gray-500">Lipides</p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {recipe.nutrition.fat}
                                </p>
                              </div>
                            )}
                            {recipe.nutrition.carbs && (
                              <div>
                                <p className="text-sm text-gray-500">Glucides</p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {recipe.nutrition.carbs}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Diet Tags */}
                      {(recipe.vegetarian || recipe.vegan || recipe.glutenFree) && (
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-3">Régimes</h3>
                          <div className="flex flex-wrap gap-2">
                            {recipe.vegetarian && (
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                Végétarien
                              </span>
                            )}
                            {recipe.vegan && (
                              <span className="px-3 py-1 bg-lime-100 text-lime-700 rounded-full text-sm font-medium">
                                Vegan
                              </span>
                            )}
                            {recipe.glutenFree && (
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                Sans gluten
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

RecipeDetailsModal.propTypes = {
  /** Recipe provider */
  provider: PropTypes.string,
  /** Recipe ID from provider */
  recipeId: PropTypes.string,
  /** Is modal open */
  isOpen: PropTypes.bool.isRequired,
  /** Callback when modal is closed */
  onClose: PropTypes.func.isRequired,
  /** Initial favorite state */
  initialIsFavorite: PropTypes.bool,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default RecipeDetailsModal;
