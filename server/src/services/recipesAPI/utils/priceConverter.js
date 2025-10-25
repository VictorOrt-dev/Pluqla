/**
 * Price Converter
 *
 * Converts USD prices to EUR with France market adjustment
 */

const logger = require('../../../utils/logger');

// Exchange rate USD → EUR (updated periodically)
const USD_TO_EUR_RATE = 0.93;

// France market adjustment multiplier
// French grocery prices are typically ~8% higher than US equivalent
const FRANCE_ADJUSTMENT = 1.08;

/**
 * Convert price from USD to EUR with France adjustment
 * @param {number} priceUsd - Price in USD
 * @returns {number} - Price in EUR, rounded to 2 decimals
 */
function convertPrice(priceUsd) {
  if (!priceUsd || isNaN(priceUsd)) {
    return 0;
  }

  const priceEur = priceUsd * USD_TO_EUR_RATE * FRANCE_ADJUSTMENT;

  return Math.round(priceEur * 100) / 100; // Round to 2 decimals
}

/**
 * Format price for display
 * @param {number} priceEur - Price in EUR
 * @returns {string} - Formatted price (e.g., "3,50 €")
 */
function formatPrice(priceEur) {
  if (!priceEur || isNaN(priceEur)) {
    return '0,00 €';
  }

  return priceEur.toFixed(2).replace('.', ',') + ' €';
}

/**
 * Calculate total meal cost
 * @param {number} pricePerServing - Price per serving in EUR
 * @param {number} servings - Number of servings
 * @returns {number} - Total cost in EUR
 */
function calculateTotalCost(pricePerServing, servings) {
  if (!pricePerServing || !servings || isNaN(pricePerServing) || isNaN(servings)) {
    return 0;
  }

  return Math.round(pricePerServing * servings * 100) / 100;
}

/**
 * Determine price category
 * @param {number} pricePerServing - Price per serving in EUR
 * @returns {string} - Category: 'budget', 'moderate', 'premium'
 */
function getPriceCategory(pricePerServing) {
  if (!pricePerServing || isNaN(pricePerServing)) {
    return 'unknown';
  }

  if (pricePerServing < 3) return 'budget';
  if (pricePerServing < 6) return 'moderate';
  return 'premium';
}

/**
 * Get price badge emoji
 * @param {number} pricePerServing - Price per serving in EUR
 * @returns {string} - Emoji indicator
 */
function getPriceBadge(pricePerServing) {
  const category = getPriceCategory(pricePerServing);

  switch (category) {
    case 'budget':
      return '💚'; // Green heart = économique
    case 'moderate':
      return '💛'; // Yellow heart = modéré
    case 'premium':
      return '💙'; // Blue heart = premium
    default:
      return '💰';
  }
}

module.exports = {
  convertPrice,
  formatPrice,
  calculateTotalCost,
  getPriceCategory,
  getPriceBadge,
  USD_TO_EUR_RATE,
  FRANCE_ADJUSTMENT
};
