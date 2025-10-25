/**
 * RecipeList Component
 *
 * Displays a grid of recipe cards with infinite scroll
 * Includes loading states, empty states, and error handling
 */

import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from '../../../utils/lazyFramerMotion';
import RecipeCard from './RecipeCard';
import { Loader2, ChefHat, AlertCircle } from 'lucide-react';

/**
 * Loading Skeleton for Recipe Card
 */
const RecipeCardSkeleton = () => (
  <div className="
    bg-white/60
    backdrop-blur-sm
    rounded-2xl
    shadow-md
    border border-white/20
    overflow-hidden
    animate-pulse
  ">
    <div className="h-48 bg-gray-200"></div>
    <div className="p-4 space-y-3">
      <div className="h-6 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
    </div>
  </div>
);

/**
 * Empty State Component
 */
const EmptyState = ({ message, icon: Icon = ChefHat }) => (
  <div className="
    col-span-full
    flex flex-col items-center justify-center
    py-16 px-4
    text-center
  ">
    <div className="
      w-20 h-20
      rounded-full
      bg-gray-100
      flex items-center justify-center
      mb-4
    ">
      <Icon size={40} className="text-gray-400" />
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">
      Aucune recette trouvée
    </h3>
    <p className="text-gray-600 max-w-md">
      {message || "Essayez de modifier vos filtres ou votre recherche pour découvrir de délicieuses recettes."}
    </p>
  </div>
);

EmptyState.propTypes = {
  message: PropTypes.string,
  icon: PropTypes.elementType,
};

/**
 * Error State Component
 */
const ErrorState = ({ error, onRetry }) => (
  <div className="
    col-span-full
    flex flex-col items-center justify-center
    py-16 px-4
    text-center
  ">
    <div className="
      w-20 h-20
      rounded-full
      bg-red-50
      flex items-center justify-center
      mb-4
    ">
      <AlertCircle size={40} className="text-red-500" />
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">
      Erreur de chargement
    </h3>
    <p className="text-gray-600 max-w-md mb-4">
      {error?.message || "Une erreur est survenue lors du chargement des recettes."}
    </p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="
          px-5 py-2.5
          rounded-lg
          bg-[#E63946]
          text-white
          font-medium
          hover:bg-[#d32f3a]
          transition-all duration-200
          shadow-md
          hover:shadow-lg
        "
      >
        Réessayer
      </button>
    )}
  </div>
);

ErrorState.propTypes = {
  error: PropTypes.object,
  onRetry: PropTypes.func,
};

/**
 * RecipeList Component
 */
const RecipeList = ({
  recipes = [],
  isLoading = false,
  isFetchingNextPage = false,
  hasNextPage = false,
  error = null,
  favoriteRecipeIds = [],
  onRecipeClick,
  onToggleFavorite,
  onLoadMore,
  onRetry,
  emptyMessage,
  className = '',
}) => {
  const loadMoreRef = useRef(null);

  /**
   * Infinite scroll observer
   */
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && onLoadMore) {
          onLoadMore();
        }
      },
      {
        root: null,
        rootMargin: '200px', // Load more when 200px from bottom
        threshold: 0.1,
      }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasNextPage, isFetchingNextPage, isLoading, onLoadMore]);

  /**
   * Check if recipe is favorited
   */
  const isRecipeFavorited = (recipe) => {
    const recipeId = `${recipe.provider}-${recipe.id}`;
    return favoriteRecipeIds.includes(recipeId);
  };

  /**
   * Container variants for stagger animation
   */
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  /**
   * Item variants for fade-in animation
   */
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
      },
    },
  };

  // Show error state
  if (error && !isLoading) {
    return (
      <div className={`grid grid-cols-1 ${className}`}>
        <ErrorState error={error} onRetry={onRetry} />
      </div>
    );
  }

  // Show initial loading state
  if (isLoading && recipes.length === 0) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${className}`}>
        {[...Array(8)].map((_, index) => (
          <RecipeCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  // Show empty state
  if (!isLoading && recipes.length === 0) {
    return (
      <div className={`grid grid-cols-1 ${className}`}>
        <EmptyState message={emptyMessage} />
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Recipe Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        <AnimatePresence>
          {recipes.map((recipe) => (
            <motion.div
              key={`${recipe.provider}-${recipe.id}`}
              variants={itemVariants}
              layout
            >
              <RecipeCard
                recipe={recipe}
                isFavorite={isRecipeFavorited(recipe)}
                onToggleFavorite={onToggleFavorite}
                onClick={() => onRecipeClick?.(recipe)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Infinite Scroll Trigger */}
      {hasNextPage && (
        <div
          ref={loadMoreRef}
          className="flex justify-center items-center py-8"
        >
          {isFetchingNextPage && (
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">Chargement...</span>
            </div>
          )}
        </div>
      )}

      {/* Load More Button (fallback for browsers without IntersectionObserver) */}
      {hasNextPage && !isFetchingNextPage && onLoadMore && (
        <div className="flex justify-center py-6">
          <button
            onClick={onLoadMore}
            className="
              px-6 py-3
              rounded-lg
              bg-white/80
              backdrop-blur-md
              border border-white/20
              text-gray-700
              font-medium
              hover:bg-[#E63946]
              hover:text-white
              hover:border-[#E63946]
              transition-all duration-200
              shadow-md
              hover:shadow-lg
            "
          >
            Charger plus de recettes
          </button>
        </div>
      )}

      {/* End of Results Message */}
      {!hasNextPage && recipes.length > 0 && (
        <div className="flex justify-center py-6">
          <p className="text-sm text-gray-500">
            Vous avez vu toutes les recettes disponibles
          </p>
        </div>
      )}
    </div>
  );
};

RecipeList.propTypes = {
  /** Array of recipe objects */
  recipes: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      provider: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
    })
  ),
  /** Is initial data loading */
  isLoading: PropTypes.bool,
  /** Is fetching next page */
  isFetchingNextPage: PropTypes.bool,
  /** Has more pages to load */
  hasNextPage: PropTypes.bool,
  /** Error object if any */
  error: PropTypes.object,
  /** Array of favorite recipe IDs (format: "provider-id") */
  favoriteRecipeIds: PropTypes.arrayOf(PropTypes.string),
  /** Callback when recipe card is clicked */
  onRecipeClick: PropTypes.func,
  /** Callback when favorite button is toggled */
  onToggleFavorite: PropTypes.func,
  /** Callback to load more recipes */
  onLoadMore: PropTypes.func,
  /** Callback to retry on error */
  onRetry: PropTypes.func,
  /** Custom empty state message */
  emptyMessage: PropTypes.string,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default RecipeList;
