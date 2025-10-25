/**
 * RecipeCard Component
 *
 * Displays recipe information with Pluqla DA (Glassmorphism)
 * Includes: Image, Title, Price (EUR), EcoScore, Cooking Time
 */

import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import EcoBadge from '../../common/EcoBadge';
import { Heart, Clock, Users, TrendingUp } from 'lucide-react';

/**
 * RecipeCard Component
 */
const RecipeCard = ({
  recipe,
  isFavorite = false,
  onToggleFavorite,
  onClick,
  className = '',
}) => {
  const {
    id,
    title,
    image,
    servings,
    readyInMinutes,
    pricePerServingEur,
    totalPriceEur,
    ecoScore,
    ecoScoreGrade,
    provider,
    vegetarian,
    vegan,
    glutenFree,
    aggregateLikes,
  } = recipe;

  /**
   * Format price in EUR
   */
  const formatPrice = (price) => {
    if (!price) return '—';
    return `${price.toFixed(2).replace('.', ',')} €`;
  };

  /**
   * Get diet badges
   */
  const getDietBadges = () => {
    const badges = [];
    if (vegetarian) badges.push({ label: 'Végétarien', color: 'bg-green-100 text-green-700' });
    if (vegan) badges.push({ label: 'Vegan', color: 'bg-lime-100 text-lime-700' });
    if (glutenFree) badges.push({ label: 'Sans gluten', color: 'bg-blue-100 text-blue-700' });
    return badges;
  };

  const dietBadges = getDietBadges();

  /**
   * Handle favorite toggle
   */
  const handleFavoriteClick = (e) => {
    e.stopPropagation(); // Prevent card click
    if (onToggleFavorite) {
      onToggleFavorite(recipe);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={`
        relative
        bg-white/80
        backdrop-blur-md
        rounded-2xl
        shadow-lg
        hover:shadow-xl
        border border-white/20
        overflow-hidden
        cursor-pointer
        transition-all duration-300
        ${className}
      `}
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative h-48 w-full overflow-hidden bg-gray-100">
        {image ? (
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-6xl">🍽️</span>
          </div>
        )}

        {/* Favorite Button */}
        <button
          onClick={handleFavoriteClick}
          className={`
            absolute top-3 right-3
            p-2
            rounded-full
            bg-white/90
            backdrop-blur-sm
            shadow-md
            hover:shadow-lg
            transition-all duration-200
            ${isFavorite ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}
          `}
          aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Heart
            size={20}
            fill={isFavorite ? 'currentColor' : 'none'}
            strokeWidth={2}
          />
        </button>

        {/* EcoScore Badge */}
        {ecoScore !== null && ecoScore !== undefined && (
          <div className="absolute top-3 left-3">
            <EcoBadge score={ecoScore} grade={ecoScoreGrade} size="sm" showScore={false} />
          </div>
        )}

        {/* Provider Badge */}
        <div className="absolute bottom-2 right-2">
          <span className="text-xs px-2 py-1 bg-black/50 text-white rounded-full backdrop-blur-sm">
            {provider}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 min-h-[3.5rem]">
          {title}
        </h3>

        {/* Diet Badges */}
        {dietBadges.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {dietBadges.map((badge, index) => (
              <span
                key={index}
                className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}
              >
                {badge.label}
              </span>
            ))}
          </div>
        )}

        {/* Meta Information */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {/* Time */}
          {readyInMinutes > 0 && (
            <div className="flex items-center gap-1.5 text-gray-600">
              <Clock size={16} className="text-gray-400" />
              <span>{readyInMinutes} min</span>
            </div>
          )}

          {/* Servings */}
          {servings > 0 && (
            <div className="flex items-center gap-1.5 text-gray-600">
              <Users size={16} className="text-gray-400" />
              <span>{servings} pers.</span>
            </div>
          )}
        </div>

        {/* Price Section */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">Prix par portion</span>
            <span className="text-lg font-bold text-[#E63946]">
              {formatPrice(pricePerServingEur)}
            </span>
          </div>

          {totalPriceEur && (
            <div className="text-right">
              <span className="text-xs text-gray-500">Total</span>
              <div className="text-sm font-semibold text-gray-700">
                {formatPrice(totalPriceEur)}
              </div>
            </div>
          )}
        </div>

        {/* Popularity (if available) */}
        {aggregateLikes > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-500 pt-2">
            <TrendingUp size={14} />
            <span>{aggregateLikes} j'aime</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

RecipeCard.propTypes = {
  /** Recipe object */
  recipe: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    image: PropTypes.string,
    servings: PropTypes.number,
    readyInMinutes: PropTypes.number,
    pricePerServingEur: PropTypes.number,
    totalPriceEur: PropTypes.number,
    ecoScore: PropTypes.number,
    ecoScoreGrade: PropTypes.string,
    provider: PropTypes.string,
    vegetarian: PropTypes.bool,
    vegan: PropTypes.bool,
    glutenFree: PropTypes.bool,
    aggregateLikes: PropTypes.number,
  }).isRequired,
  /** Is recipe favorited */
  isFavorite: PropTypes.bool,
  /** Toggle favorite callback */
  onToggleFavorite: PropTypes.func,
  /** Card click callback */
  onClick: PropTypes.func,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default RecipeCard;
