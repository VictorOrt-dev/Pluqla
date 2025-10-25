/**
 * Alimentation Feature Constants
 *
 * Phase 7 - Centralized configuration for food/meal planning features
 * Eliminates magic numbers and improves maintainability
 */

/**
 * Food Spending Matcher Configuration
 * Phase 5 - Forecast vs Reality matching
 */
const FOOD_SPENDING_MATCHER = {
  // Matching tolerances
  AMOUNT_TOLERANCE_PERCENT: 10, // ±10% for amount matching
  DATE_RANGE_DAYS: 3, // ±3 days for date matching

  // Archival settings
  ARCHIVE_AFTER_DAYS: 7, // Archive forecasts without match after 7 days
  MATCHING_WINDOW_DAYS: 30, // Process forecasts from last 30 days

  // Match scoring weights
  AMOUNT_WEIGHT: 0.6, // 60% weight for amount similarity
  DATE_WEIGHT: 0.4, // 40% weight for date proximity
  MINIMUM_MATCH_SCORE: 50, // Minimum score to consider a match

  // Food categories for matching
  FOOD_CATEGORIES: [
    'alimentation',
    'supermarché',
    'restaurant',
    'food',
    'grocery',
    'épicerie',
    'courses',
    'marché',
  ],

  // Cron schedule
  CRON_SCHEDULE: '0 2 * * *', // Daily at 2 AM
};

/**
 * Meal Planning Configuration
 */
const MEAL_PLANNING = {
  // AI generation settings
  BATCH_SIZE: 5, // Process 5 meals in parallel
  MAX_RETRIES: 3, // Retry failed meal generation 3 times
  RETRY_BACKOFF_MS: 1000, // Base backoff delay (exponential)

  // Budget settings
  DEFAULT_BUDGET_PER_MEAL: 15, // EUR per meal
  BUDGET_MULTIPLIER_ON_RETRY: 1.5, // Increase budget by 50% on retry

  // Cache settings
  CACHE_TTL_MEAL_SUGGESTION: 3600, // 1 hour
  CACHE_TTL_WEEKLY_PLAN: 1800, // 30 minutes
  CACHE_TTL_PREFERENCES: 3600, // 1 hour

  // Default values
  DEFAULT_HOUSEHOLD_SIZE: 2,
  DEFAULT_SKILL_LEVEL: 'intermediate',
  DEFAULT_COOKING_FREQUENCY: 'daily',
  DEFAULT_MEAL_TYPES: ['lunch', 'dinner'],

  // Meal variety
  MEALS_PER_WEEK: 14, // 7 days × 2 meals/day
  DAYS_PER_WEEK: 7,
};

/**
 * Recipe API Configuration
 */
const RECIPE_API = {
  // Provider settings
  PROVIDERS: ['spoonacular', 'edamam', 'themealdb'],
  PRIMARY_PROVIDER: 'spoonacular',

  // Cache settings
  CACHE_TTL_SEARCH: 86400, // 24 hours for search results
  CACHE_TTL_DETAILS: 604800, // 7 days for recipe details

  // Rate limiting
  RATE_LIMIT_SEARCH: 100, // 100 req/min for recipe search
  RATE_LIMIT_AI_SUGGESTIONS: 30, // 30 req/hour for AI features

  // Search defaults
  DEFAULT_SEARCH_LIMIT: 20,
  DEFAULT_MAX_PRICE: 15, // EUR
  DEFAULT_MAX_COOKING_TIME: 60, // minutes

  // Pagination
  MAX_RESULTS_PER_PAGE: 50,
  DEFAULT_OFFSET: 0,
};

/**
 * AI Quota Configuration
 */
const AI_QUOTA = {
  // Token costs
  MEAL_SUGGESTION_COST: 3, // tokens per meal suggestion request
  SMART_SUGGESTION_COST: 2, // tokens per smart suggestion
  WEEKLY_PLAN_COST: 10, // tokens per weekly plan generation

  // Daily limits (by tier)
  DAILY_LIMITS: {
    FREE: 10, // 10 tokens/day
    PREMIUM: 100, // 100 tokens/day
    UNLIMITED: Infinity,
  },

  // Deduplication
  DEDUP_WINDOW_SECONDS: 3600, // 1 hour deduplication window
  DEDUP_HASH_ALGORITHM: 'sha256',

  // Caching
  RESULT_CACHE_TTL: 604800, // 7 days
};

/**
 * Grocery List Configuration
 */
const GROCERY_LIST = {
  // Ingredient grouping
  CATEGORIES: {
    PRODUCE: ['tomato', 'lettuce', 'onion', 'garlic', 'carrot', 'potato', 'apple', 'banana', 'vegetable', 'fruit'],
    DAIRY: ['milk', 'cheese', 'butter', 'yogurt', 'cream', 'egg'],
    MEAT: ['chicken', 'beef', 'pork', 'fish', 'salmon', 'turkey', 'lamb'],
    PANTRY: ['flour', 'sugar', 'salt', 'pepper', 'oil', 'rice', 'pasta', 'bread'],
    SPICES: ['cumin', 'paprika', 'oregano', 'basil', 'thyme', 'cinnamon'],
  },

  // Units
  SUPPORTED_UNITS: ['kg', 'g', 'l', 'ml', 'cup', 'tbsp', 'tsp', 'piece', 'pieces'],

  // Price estimation
  DEFAULT_INGREDIENT_PRICE: 0.5, // EUR per item if unknown
};

/**
 * EcoScore Configuration
 */
const ECO_SCORE = {
  // Scoring ranges
  GRADE_A: { min: 80, max: 100, label: 'Excellent' },
  GRADE_B: { min: 60, max: 79, label: 'Bon' },
  GRADE_C: { min: 40, max: 59, label: 'Moyen' },
  GRADE_D: { min: 20, max: 39, label: 'Faible' },
  GRADE_E: { min: 0, max: 19, label: 'Très faible' },

  // Factor weights
  WEIGHTS: {
    LOCAL_INGREDIENTS: 0.3, // 30%
    SEASONAL: 0.25, // 25%
    ORGANIC: 0.2, // 20%
    LOW_WASTE: 0.15, // 15%
    ENERGY_EFFICIENT: 0.1, // 10%
  },
};

/**
 * Interaction Tracking Configuration
 */
const INTERACTION_TRACKING = {
  // Interaction types
  TYPES: ['view', 'cook', 'favorite', 'share', 'rate'],

  // Fraud detection
  FRAUD_THRESHOLDS: {
    MAX_INTERACTIONS_PER_HOUR: 50,
    MAX_FAVORITES_PER_DAY: 20,
    SUSPICIOUS_PATTERN_THRESHOLD: 0.7,
  },

  // Popularity scoring
  VIEW_WEIGHT: 1,
  COOK_WEIGHT: 5,
  FAVORITE_WEIGHT: 3,
  SHARE_WEIGHT: 2,

  // IP deduplication
  IP_HASH_ALGORITHM: 'sha256',
  IP_HASH_SALT: 'pluqla-ip-salt-v1',
};

/**
 * Performance Thresholds
 */
const PERFORMANCE = {
  // API response targets
  TARGET_SEARCH_RESPONSE_MS: 500,
  TARGET_DETAILS_RESPONSE_MS: 300,
  TARGET_AI_RESPONSE_MS: 1000,

  // Frontend targets
  TARGET_DEBOUNCE_MS: 300,
  TARGET_VIRTUAL_SCROLL_THRESHOLD: 100, // Items before enabling virtual scroll

  // Timeouts
  API_TIMEOUT_MS: 10000, // 10 seconds
  AI_TIMEOUT_MS: 30000, // 30 seconds
};

/**
 * Export all constants
 */
module.exports = {
  FOOD_SPENDING_MATCHER,
  MEAL_PLANNING,
  RECIPE_API,
  AI_QUOTA,
  GROCERY_LIST,
  ECO_SCORE,
  INTERACTION_TRACKING,
  PERFORMANCE,
};
