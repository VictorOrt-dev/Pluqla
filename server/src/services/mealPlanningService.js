/**
 * Meal Planning Service (Jow-inspired)
 *
 * Handles weekly meal planning, grocery list generation, and user preferences
 * Integrates with existing meal suggestions and AI services
 *
 * Features:
 * - User meal preferences management
 * - Weekly meal plan generation
 * - Grocery list consolidation
 * - Recipe variety tracking
 * - Budget-aware planning
 */

const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const crypto = require('crypto');
const { generateMealSuggestions } = require('./aiMealService');
const { getRedisClient } = require('../lib/redisClient');
const analyticsService = require('./analyticsService');

// Cache TTL constants (in seconds)
const CACHE_TTL = {
  MEAL_SUGGESTION: 3600, // 1 hour - AI responses can be cached longer
  WEEKLY_PLAN: 1800, // 30 minutes
  PREFERENCES: 3600 // 1 hour
};

/**
 * Generate cache key for meal suggestions
 */
function generateMealCacheKey(params) {
  const keyData = {
    mealType: params.mealType,
    servings: params.servings,
    budget: Math.round(params.budget || 0),
    dietaryRestrictions: (params.dietaryRestrictions || []).sort(),
    cuisineType: params.cuisineType,
    skillLevel: params.skillLevel,
    maxCookingTime: params.maxCookingTime
  };

  const hash = crypto.createHash('md5').update(JSON.stringify(keyData)).digest('hex');
  return `meal:suggestion:${hash}`;
}

/**
 * Cached AI meal suggestion wrapper
 */
async function getCachedMealSuggestion(params) {
  const redis = getRedisClient();
  const cacheKey = generateMealCacheKey(params);

  try {
    // Try to get from cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug('Meal suggestion cache hit', { cacheKey });
      return JSON.parse(cached);
    }
  } catch (error) {
    logger.warn('Redis cache read error, falling back to AI', {
      error: error.message,
      cacheKey
    });
  }

  // Generate fresh suggestion
  const suggestion = await generateMealSuggestions(params);

  // Cache the result
  try {
    await redis.setex(cacheKey, CACHE_TTL.MEAL_SUGGESTION, JSON.stringify(suggestion));
    logger.debug('Meal suggestion cached', { cacheKey, ttl: CACHE_TTL.MEAL_SUGGESTION });
  } catch (error) {
    logger.warn('Redis cache write error', {
      error: error.message,
      cacheKey
    });
  }

  return suggestion;
}

/**
 * Save or update user meal preferences
 */
async function saveUserMealPreferences(userId, preferences) {
  try {
    const existingPrefs = await prisma.userMealPreferences.findUnique({
      where: { userId }
    });

    const data = {
      householdSize: preferences.householdSize || 2,
      dietaryRestrictions: preferences.dietaryRestrictions
        ? JSON.stringify(preferences.dietaryRestrictions)
        : null,
      dislikedIngredients: preferences.dislikedIngredients
        ? JSON.stringify(preferences.dislikedIngredients)
        : null,
      preferredCuisines: preferences.preferredCuisines
        ? JSON.stringify(preferences.preferredCuisines)
        : null,
      skillLevel: preferences.skillLevel || 'intermediate',
      weeklyBudget: preferences.weeklyBudget || null,
      cookingFrequency: preferences.cookingFrequency || 'daily',
      mealTypes: preferences.mealTypes
        ? JSON.stringify(preferences.mealTypes)
        : null,
      allergies: preferences.allergies
        ? JSON.stringify(preferences.allergies)
        : null,
      cookingTimeLimit: preferences.cookingTimeLimit || null,
      eatingHabits: preferences.eatingHabits
        ? JSON.stringify(preferences.eatingHabits)
        : null
    };

    let result;
    if (existingPrefs) {
      result = await prisma.userMealPreferences.update({
        where: { userId },
        data
      });
    } else {
      result = await prisma.userMealPreferences.create({
        data: {
          userId,
          ...data
        }
      });
    }

    logger.info('User meal preferences saved', {
      userId,
      householdSize: data.householdSize,
      skillLevel: data.skillLevel
    });

    // Track analytics event
    analyticsService.trackUserAction(userId, 'meal_preferences_saved', {
      householdSize: data.householdSize,
      skillLevel: data.skillLevel,
      dietaryRestrictionsCount: preferences.dietaryRestrictions?.length || 0,
      hasWeeklyBudget: !!preferences.weeklyBudget
    });

    return result;
  } catch (error) {
    logger.error('Failed to save user meal preferences', {
      userId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get user meal preferences
 */
async function getUserMealPreferences(userId) {
  try {
    const preferences = await prisma.userMealPreferences.findUnique({
      where: { userId }
    });

    if (!preferences) {
      return null;
    }

    return {
      ...preferences,
      dietaryRestrictions: preferences.dietaryRestrictions
        ? JSON.parse(preferences.dietaryRestrictions)
        : [],
      dislikedIngredients: preferences.dislikedIngredients
        ? JSON.parse(preferences.dislikedIngredients)
        : [],
      preferredCuisines: preferences.preferredCuisines
        ? JSON.parse(preferences.preferredCuisines)
        : [],
      mealTypes: preferences.mealTypes
        ? JSON.parse(preferences.mealTypes)
        : ['breakfast', 'lunch', 'dinner'],
      allergies: preferences.allergies
        ? JSON.parse(preferences.allergies)
        : [],
      eatingHabits: preferences.eatingHabits
        ? JSON.parse(preferences.eatingHabits)
        : {}
    };
  } catch (error) {
    logger.error('Failed to get user meal preferences', {
      userId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Generate hash for weekly meal plan (for deduplication)
 */
function generatePlanHash(userId, weekStartDate, preferences) {
  const hashInput = JSON.stringify({
    userId,
    weekStartDate: weekStartDate.toISOString().split('T')[0],
    householdSize: preferences.householdSize,
    dietaryRestrictions: preferences.dietaryRestrictions?.sort() || [],
    weeklyBudget: preferences.weeklyBudget,
    cookingFrequency: preferences.cookingFrequency
  });

  return crypto.createHash('sha256').update(hashInput).digest('hex');
}

/**
 * Generate weekly meal plan using AI
 */
async function generateWeeklyMealPlan(userId, options = {}) {
  try {
    // 1. Get user preferences
    let preferences = await getUserMealPreferences(userId);

    if (!preferences) {
      // Create default preferences
      preferences = {
        householdSize: 2,
        dietaryRestrictions: [],
        dislikedIngredients: [],
        preferredCuisines: [],
        skillLevel: 'intermediate',
        weeklyBudget: null,
        cookingFrequency: 'daily',
        mealTypes: ['lunch', 'dinner'],
        allergies: [],
        cookingTimeLimit: null,
        eatingHabits: {}
      };
    }

    // 2. Determine week dates
    const weekStartDate = options.weekStartDate
      ? new Date(options.weekStartDate)
      : getNextMonday();

    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    // 3. Generate plan hash
    const planHash = generatePlanHash(userId, weekStartDate, preferences);

    // 4. Check for existing plan
    const existingPlan = await prisma.weeklyMealPlan.findFirst({
      where: {
        userId,
        weekStartDate,
        status: { in: ['active', 'draft'] }
      },
      include: {
        meals: true,
        groceryLists: true
      }
    });

    if (existingPlan && options.allowDuplicate !== true) {
      logger.info('Existing weekly meal plan found', {
        userId,
        planId: existingPlan.id,
        weekStartDate
      });
      return formatWeeklyMealPlan(existingPlan);
    }

    // 5. Determine meals to generate
    const mealsPerDay = determineMealsPerDay(preferences);
    const totalMeals = mealsPerDay.reduce((sum, day) => sum + day.meals.length, 0);
    const budgetPerMeal = preferences.weeklyBudget
      ? preferences.weeklyBudget / totalMeals
      : 15;

    // 6. Generate meals using AI with fallback strategies (batch parallel mode)
    const generatedMeals = [];
    const failedMeals = [];

    // Build all meal requests for parallel processing
    const mealRequests = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const dayMeals = mealsPerDay[dayIndex];
      for (const mealType of dayMeals.meals) {
        mealRequests.push({ dayIndex, mealType });
      }
    }

    // Process in batches of 5 to avoid overwhelming the AI service
    const batchSize = 5;
    for (let i = 0; i < mealRequests.length; i += batchSize) {
      const batch = mealRequests.slice(i, i + batchSize);

      // Generate all meals in this batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map(({ dayIndex, mealType }) =>
          generateSingleMealWithRetry(
            userId,
            dayIndex,
            mealType,
            preferences,
            budgetPerMeal
          )
        )
      );

      // Process batch results
      batchResults.forEach((result, batchIndex) => {
        const { dayIndex, mealType } = batch[batchIndex];

        if (result.status === 'fulfilled' && result.value) {
          generatedMeals.push(result.value);
        } else {
          // Use fallback meal
          const fallbackMeal = generateFallbackMeal(mealType, preferences.householdSize, budgetPerMeal);
          generatedMeals.push({
            dayOfWeek: dayIndex,
            mealType,
            meal: fallbackMeal,
            isFallback: true
          });

          failedMeals.push({ dayIndex, mealType });

          logger.warn('Using fallback meal in batch generation', {
            userId,
            dayIndex,
            mealType,
            error: result.reason?.message
          });
        }
      });
    }

    /* OLD SEQUENTIAL CODE - KEPT FOR REFERENCE
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const dayMeals = mealsPerDay[dayIndex];

      for (const mealType of dayMeals.meals) {
        let mealGenerated = false;
        let retryCount = 0;
        const maxRetries = 3;

        while (!mealGenerated && retryCount < maxRetries) {
          try {
            // Progressive fallback: simplify constraints on retries
            const requestParams = {
              mealType,
              servings: preferences.householdSize,
              budget: retryCount === 0 ? budgetPerMeal : budgetPerMeal * 1.5, // Increase budget on retry
              dietaryRestrictions: preferences.dietaryRestrictions,
              cuisineType: retryCount < 2 ? getRandomCuisine(preferences.preferredCuisines) : null, // Remove cuisine constraint on 2nd retry
              skillLevel: retryCount < 1 ? preferences.skillLevel : null, // Remove skill level on 1st retry
              maxCookingTime: retryCount < 2 ? preferences.cookingTimeLimit : null, // Remove time limit on 2nd retry
              avoidIngredients: retryCount < 1 ? preferences.dislikedIngredients : [] // Remove dislikes on 1st retry
            };

            const mealSuggestion = await getCachedMealSuggestion(requestParams);

            if (mealSuggestion && mealSuggestion.meals && mealSuggestion.meals.length > 0) {
              const meal = mealSuggestion.meals[0];
              generatedMeals.push({
                dayOfWeek: dayIndex,
                mealType,
                meal,
                retriedCount: retryCount
              });
              mealGenerated = true;

              if (retryCount > 0) {
                logger.warn('Meal generated after retry', {
                  userId,
                  dayIndex,
                  mealType,
                  retryCount
                });
              }
            } else {
              throw new Error('AI returned empty meal suggestions');
            }
          } catch (error) {
            retryCount++;
            logger.error('Failed to generate meal (attempt ' + retryCount + '/' + maxRetries + ')', {
              userId,
              dayIndex,
              mealType,
              retryCount,
              error: error.message
            });

            // Wait briefly before retry (exponential backoff)
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
          }
        }

        // If all retries failed, add fallback basic meal
        if (!mealGenerated) {
          const fallbackMeal = generateFallbackMeal(mealType, preferences.householdSize, budgetPerMeal);
          generatedMeals.push({
            dayOfWeek: dayIndex,
            mealType,
            meal: fallbackMeal,
            isFallback: true
          });

          failedMeals.push({ dayIndex, mealType });

          logger.warn('Using fallback meal after all retries failed', {
            userId,
            dayIndex,
            mealType,
            retriedCount: maxRetries
          });
        }
      }
    }

    // Log failure summary if any meals used fallback
    if (failedMeals.length > 0) {
      logger.warn('Weekly plan generated with fallback meals', {
        userId,
        totalMeals: generatedMeals.length,
        fallbackCount: failedMeals.length,
        failedMeals
      });
    }

    if (generatedMeals.length === 0) {
      throw new Error('Failed to generate any meals for the weekly plan');
    }

    // 7. Create weekly meal plan
    const weeklyPlan = await prisma.weeklyMealPlan.create({
      data: {
        userId,
        weekStartDate,
        weekEndDate,
        status: 'active',
        totalBudget: preferences.weeklyBudget,
        actualCost: 0,
        mealsCount: generatedMeals.length,
        planHash,
        generatedBy: 'ai',
        preferencesId: preferences.id
      }
    });

    // 8. Create planned meals
    const plannedMeals = await Promise.all(
      generatedMeals.map(({ dayOfWeek, mealType, meal }) =>
        prisma.plannedMeal.create({
          data: {
            weeklyPlanId: weeklyPlan.id,
            dayOfWeek,
            mealType,
            mealName: meal.name,
            servings: meal.servings,
            cookingTimeMin: meal.cookingTimeMin,
            totalCostEur: meal.totalCostEur,
            ingredients: JSON.stringify(meal.ingredients),
            recipe: JSON.stringify(meal.recipe),
            nutritionInfo: meal.nutritionInfo
              ? JSON.stringify(meal.nutritionInfo)
              : null,
            difficulty: meal.difficulty || 'intermediate',
            cuisineType: meal.cuisineType || null,
            tags: meal.tags ? JSON.stringify(meal.tags) : null
          }
        })
      )
    );

    // 9. Calculate actual cost
    const totalCost = plannedMeals.reduce(
      (sum, meal) => sum + meal.totalCostEur,
      0
    );

    await prisma.weeklyMealPlan.update({
      where: { id: weeklyPlan.id },
      data: { actualCost: totalCost }
    });

    // 10. Generate grocery list
    const groceryList = await generateGroceryList(weeklyPlan.id, plannedMeals);

    logger.info('Weekly meal plan generated successfully', {
      userId,
      planId: weeklyPlan.id,
      mealsCount: plannedMeals.length,
      totalCost,
      weekStartDate
    });

    // Track analytics event
    analyticsService.trackUserAction(userId, 'weekly_meal_plan_generated', {
      planId: weeklyPlan.id,
      mealsCount: plannedMeals.length,
      totalCost,
      fallbackMealsUsed: failedMeals.length,
      groceryItemsCount: groceryList.items?.length || 0,
      weekStartDate: weekStartDate.toISOString()
    });

    return formatWeeklyMealPlan({
      ...weeklyPlan,
      meals: plannedMeals,
      groceryLists: [groceryList],
      actualCost: totalCost
    });

  } catch (error) {
    logger.error('Failed to generate weekly meal plan', {
      userId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Generate grocery list from planned meals
 */
async function generateGroceryList(weeklyPlanId, plannedMeals) {
  try {
    // Get weekly plan
    const weeklyPlan = await prisma.weeklyMealPlan.findUnique({
      where: { id: weeklyPlanId },
      include: {
        meals: plannedMeals ? false : true
      }
    });

    if (!weeklyPlan) {
      throw new Error('Weekly plan not found');
    }

    const meals = plannedMeals || weeklyPlan.meals;

    // Consolidate ingredients
    const ingredientsMap = new Map();

    for (const meal of meals) {
      const ingredients = JSON.parse(meal.ingredients);

      for (const ingredient of ingredients) {
        const key = ingredient.item.toLowerCase().trim();

        if (ingredientsMap.has(key)) {
          const existing = ingredientsMap.get(key);
          existing.quantity = combineQuantities(
            existing.quantity,
            ingredient.quantity
          );
          existing.estimatedCostEur += ingredient.estimatedCostEur || 0;
          existing.usedInMeals.push(meal.id);
        } else {
          ingredientsMap.set(key, {
            name: ingredient.item,
            quantity: ingredient.quantity,
            unit: extractUnit(ingredient.quantity),
            category: categorizeIngredient(ingredient.item),
            estimatedCostEur: ingredient.estimatedCostEur || 0,
            usedInMeals: [meal.id]
          });
        }
      }
    }

    // Create grocery list
    const groceryList = await prisma.groceryList.create({
      data: {
        weeklyPlanId,
        userId: weeklyPlan.userId,
        status: 'pending',
        totalItems: ingredientsMap.size,
        checkedItems: 0,
        estimatedCost: Array.from(ingredientsMap.values()).reduce(
          (sum, item) => sum + item.estimatedCostEur,
          0
        )
      }
    });

    // Create grocery items
    const sortedItems = Array.from(ingredientsMap.values()).sort(
      (a, b) => a.category.localeCompare(b.category)
    );

    const groceryItems = await Promise.all(
      sortedItems.map((item, index) =>
        prisma.groceryItem.create({
          data: {
            groceryListId: groceryList.id,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            category: item.category,
            estimatedCostEur: item.estimatedCostEur,
            usedInMeals: JSON.stringify(item.usedInMeals),
            sortOrder: index
          }
        })
      )
    );

    logger.info('Grocery list generated', {
      groceryListId: groceryList.id,
      weeklyPlanId,
      totalItems: groceryItems.length,
      estimatedCost: groceryList.estimatedCost
    });

    return {
      ...groceryList,
      items: groceryItems
    };

  } catch (error) {
    logger.error('Failed to generate grocery list', {
      weeklyPlanId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Helper: Generate single meal with retry logic (for parallel batch processing)
 */
async function generateSingleMealWithRetry(userId, dayIndex, mealType, preferences, budgetPerMeal) {
  const maxRetries = 3;

  for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
    try {
      const requestParams = {
        mealType,
        servings: preferences.householdSize,
        budget: retryCount === 0 ? budgetPerMeal : budgetPerMeal * 1.5,
        dietaryRestrictions: preferences.dietaryRestrictions,
        cuisineType: retryCount < 2 ? getRandomCuisine(preferences.preferredCuisines) : null,
        skillLevel: retryCount < 1 ? preferences.skillLevel : null,
        maxCookingTime: retryCount < 2 ? preferences.cookingTimeLimit : null,
        avoidIngredients: retryCount < 1 ? preferences.dislikedIngredients : []
      };

      const mealSuggestion = await getCachedMealSuggestion(requestParams);

      if (mealSuggestion && mealSuggestion.meals && mealSuggestion.meals.length > 0) {
        const meal = mealSuggestion.meals[0];

        if (retryCount > 0) {
          logger.warn('Meal generated after retry (batch mode)', {
            userId,
            dayIndex,
            mealType,
            retryCount
          });
        }

        return {
          dayOfWeek: dayIndex,
          mealType,
          meal,
          retriedCount: retryCount
        };
      } else {
        throw new Error('AI returned empty meal suggestions');
      }
    } catch (error) {
      logger.error(`Failed to generate meal (attempt ${retryCount + 1}/${maxRetries})`, {
        userId,
        dayIndex,
        mealType,
        retryCount: retryCount + 1,
        error: error.message
      });

      // Wait briefly before retry (exponential backoff)
      if (retryCount < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      }
    }
  }

  // All retries failed
  throw new Error(`Failed to generate meal after ${maxRetries} attempts`);
}

/**
 * Helper: Get next Monday
 */
function getNextMonday() {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? 1 : 8 - day; // If Sunday, next day, else days until next Monday
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + diff);
  nextMonday.setHours(0, 0, 0, 0);
  return nextMonday;
}

/**
 * Helper: Determine meals per day based on preferences
 */
function determineMealsPerDay(preferences) {
  const mealsPerDay = [];
  const mealTypes = preferences.mealTypes || ['lunch', 'dinner'];

  for (let i = 0; i < 7; i++) {
    mealsPerDay.push({ day: i, meals: [...mealTypes] });
  }

  return mealsPerDay;
}

/**
 * Helper: Get random cuisine from preferences
 */
function getRandomCuisine(cuisines) {
  if (!cuisines || cuisines.length === 0) {
    return null;
  }
  return cuisines[Math.floor(Math.random() * cuisines.length)];
}

/**
 * Helper: Generate fallback meal when AI fails
 */
function generateFallbackMeal(mealType, servings, budgetPerMeal) {
  const fallbackMeals = {
    breakfast: {
      name: 'Simple Breakfast',
      ingredients: [
        { item: 'Eggs', quantity: `${servings * 2} pieces`, estimatedCostEur: 0.5 * servings },
        { item: 'Bread', quantity: `${servings * 2} slices`, estimatedCostEur: 0.3 * servings },
        { item: 'Butter', quantity: '20g', estimatedCostEur: 0.2 }
      ],
      recipe: {
        steps: [
          'Toast the bread slices',
          'Scramble or fry the eggs',
          'Serve with butter'
        ]
      },
      cookingTimeMin: 10,
      difficulty: 'beginner'
    },
    lunch: {
      name: 'Simple Pasta',
      ingredients: [
        { item: 'Pasta', quantity: `${servings * 100}g`, estimatedCostEur: 0.5 * servings },
        { item: 'Tomato sauce', quantity: '400g', estimatedCostEur: 1.5 },
        { item: 'Olive oil', quantity: '2 tbsp', estimatedCostEur: 0.3 },
        { item: 'Garlic', quantity: '2 cloves', estimatedCostEur: 0.2 }
      ],
      recipe: {
        steps: [
          'Boil pasta according to package instructions',
          'Heat olive oil and sauté garlic',
          'Add tomato sauce and simmer',
          'Mix with drained pasta'
        ]
      },
      cookingTimeMin: 20,
      difficulty: 'beginner'
    },
    dinner: {
      name: 'Simple Chicken & Rice',
      ingredients: [
        { item: 'Chicken breast', quantity: `${servings * 150}g`, estimatedCostEur: 2.0 * servings },
        { item: 'Rice', quantity: `${servings * 100}g`, estimatedCostEur: 0.4 * servings },
        { item: 'Vegetables (mixed)', quantity: '300g', estimatedCostEur: 1.5 },
        { item: 'Olive oil', quantity: '2 tbsp', estimatedCostEur: 0.3 }
      ],
      recipe: {
        steps: [
          'Cook rice according to package instructions',
          'Season and pan-fry chicken until cooked through',
          'Sauté vegetables in olive oil',
          'Serve together'
        ]
      },
      cookingTimeMin: 30,
      difficulty: 'intermediate'
    },
    snack: {
      name: 'Simple Snack',
      ingredients: [
        { item: 'Fresh fruit', quantity: `${servings} pieces`, estimatedCostEur: 0.5 * servings },
        { item: 'Nuts', quantity: '50g', estimatedCostEur: 1.0 }
      ],
      recipe: {
        steps: [
          'Wash fruit',
          'Serve with nuts'
        ]
      },
      cookingTimeMin: 2,
      difficulty: 'beginner'
    }
  };

  const baseMeal = fallbackMeals[mealType] || fallbackMeals.lunch;

  return {
    name: baseMeal.name,
    servings,
    ingredients: baseMeal.ingredients,
    recipe: baseMeal.recipe,
    cookingTimeMin: baseMeal.cookingTimeMin,
    totalCostEur: Math.min(
      baseMeal.ingredients.reduce((sum, ing) => sum + ing.estimatedCostEur, 0),
      budgetPerMeal
    ),
    difficulty: baseMeal.difficulty,
    cuisineType: 'simple',
    tags: ['fallback', 'basic'],
    nutritionInfo: null
  };
}

/**
 * Helper: Combine quantities (simple approach)
 */
function combineQuantities(qty1, qty2) {
  // Simple string concatenation for now
  // In production, parse and add numeric values
  return `${qty1}, ${qty2}`;
}

/**
 * Helper: Extract unit from quantity string
 */
function extractUnit(quantity) {
  const units = ['kg', 'g', 'l', 'ml', 'cup', 'tbsp', 'tsp', 'piece', 'pieces'];
  const qtyLower = quantity.toLowerCase();

  for (const unit of units) {
    if (qtyLower.includes(unit)) {
      return unit;
    }
  }

  return null;
}

/**
 * Helper: Categorize ingredient
 */
function categorizeIngredient(ingredient) {
  const ingredientLower = ingredient.toLowerCase();

  const categories = {
    produce: ['tomato', 'lettuce', 'onion', 'garlic', 'carrot', 'potato', 'apple', 'banana', 'vegetable', 'fruit'],
    dairy: ['milk', 'cheese', 'butter', 'yogurt', 'cream', 'egg'],
    meat: ['chicken', 'beef', 'pork', 'fish', 'salmon', 'turkey', 'lamb'],
    pantry: ['flour', 'sugar', 'salt', 'pepper', 'oil', 'rice', 'pasta', 'bread'],
    spices: ['cumin', 'paprika', 'oregano', 'basil', 'thyme', 'cinnamon']
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => ingredientLower.includes(keyword))) {
      return category;
    }
  }

  return 'other';
}

/**
 * Helper: Format weekly meal plan for response
 */
function formatWeeklyMealPlan(plan) {
  return {
    id: plan.id,
    weekStartDate: plan.weekStartDate,
    weekEndDate: plan.weekEndDate,
    status: plan.status,
    totalBudget: plan.totalBudget,
    actualCost: plan.actualCost,
    mealsCount: plan.mealsCount,
    meals: plan.meals?.map(meal => ({
      id: meal.id,
      dayOfWeek: meal.dayOfWeek,
      mealType: meal.mealType,
      name: meal.mealName,
      servings: meal.servings,
      cookingTimeMin: meal.cookingTimeMin,
      totalCostEur: meal.totalCostEur,
      difficulty: meal.difficulty,
      cuisineType: meal.cuisineType,
      isCooked: meal.isCooked,
      rating: meal.rating,
      ingredients: JSON.parse(meal.ingredients),
      recipe: JSON.parse(meal.recipe),
      nutritionInfo: meal.nutritionInfo ? JSON.parse(meal.nutritionInfo) : null
    })),
    groceryList: plan.groceryLists?.[0] ? {
      id: plan.groceryLists[0].id,
      status: plan.groceryLists[0].status,
      totalItems: plan.groceryLists[0].totalItems,
      checkedItems: plan.groceryLists[0].checkedItems,
      estimatedCost: plan.groceryLists[0].estimatedCost,
      items: plan.groceryLists[0].items?.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        category: item.category,
        estimatedCostEur: item.estimatedCostEur,
        isChecked: item.isChecked
      }))
    } : null,
    createdAt: plan.createdAt
  };
}

/**
 * Get user's weekly meal plans
 */
async function getUserWeeklyMealPlans(userId, options = {}) {
  try {
    const { status = 'active', limit = 10, offset = 0 } = options;

    const where = { userId };
    if (status) {
      where.status = status;
    }

    const [plans, total] = await Promise.all([
      prisma.weeklyMealPlan.findMany({
        where,
        include: {
          meals: true,
          groceryLists: {
            include: {
              items: true
            }
          }
        },
        orderBy: {
          weekStartDate: 'desc'
        },
        take: limit,
        skip: offset
      }),
      prisma.weeklyMealPlan.count({ where })
    ]);

    return {
      plans: plans.map(formatWeeklyMealPlan),
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    };

  } catch (error) {
    logger.error('Failed to get user weekly meal plans', {
      userId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Update grocery item status
 */
async function updateGroceryItem(itemId, userId, updates) {
  try {
    // Verify ownership
    const item = await prisma.groceryItem.findFirst({
      where: {
        id: itemId,
        groceryList: {
          userId
        }
      },
      include: {
        groceryList: true
      }
    });

    if (!item) {
      throw new Error('Grocery item not found or access denied');
    }

    const updatedItem = await prisma.groceryItem.update({
      where: { id: itemId },
      data: {
        isChecked: updates.isChecked ?? item.isChecked,
        checkedAt: updates.isChecked ? new Date() : null,
        actualCostEur: updates.actualCostEur ?? item.actualCostEur,
        notes: updates.notes ?? item.notes
      }
    });

    // Update grocery list stats
    if (updates.isChecked !== undefined) {
      const checkedCount = await prisma.groceryItem.count({
        where: {
          groceryListId: item.groceryListId,
          isChecked: true
        }
      });

      await prisma.groceryList.update({
        where: { id: item.groceryListId },
        data: { checkedItems: checkedCount }
      });
    }

    logger.info('Grocery item updated', {
      itemId,
      userId,
      isChecked: updatedItem.isChecked
    });

    return updatedItem;

  } catch (error) {
    logger.error('Failed to update grocery item', {
      itemId,
      userId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Swap a planned meal with a new AI-generated suggestion
 */
async function swapPlannedMeal(userId, mealId, options = {}) {
  try {
    // 1. Get the existing meal and verify ownership
    const existingMeal = await prisma.plannedMeal.findFirst({
      where: {
        id: mealId,
        weeklyPlan: {
          userId
        }
      },
      include: {
        weeklyPlan: {
          include: {
            preferences: true
          }
        }
      }
    });

    if (!existingMeal) {
      throw new Error('Meal not found or access denied');
    }

    // 2. Get user preferences
    const preferences = existingMeal.weeklyPlan.preferences || await getUserMealPreferences(userId);

    if (!preferences) {
      throw new Error('User preferences not found');
    }

    // 3. Generate new meal suggestion with AI
    const budgetPerMeal = existingMeal.totalCostEur || 15;
    let newMealSuggestion = null;
    let retryCount = 0;
    const maxRetries = 3;

    while (!newMealSuggestion && retryCount < maxRetries) {
      try {
        const requestParams = {
          mealType: existingMeal.mealType,
          servings: existingMeal.servings,
          budget: retryCount === 0 ? budgetPerMeal : budgetPerMeal * 1.5,
          dietaryRestrictions: preferences.dietaryRestrictions,
          cuisineType: options.preferredCuisine || (retryCount < 2 ? getRandomCuisine(preferences.preferredCuisines) : null),
          skillLevel: retryCount < 1 ? preferences.skillLevel : null,
          maxCookingTime: retryCount < 2 ? preferences.cookingTimeLimit : null,
          avoidIngredients: retryCount < 1 ? preferences.dislikedIngredients : []
        };

        const suggestion = await getCachedMealSuggestion(requestParams);

        if (suggestion && suggestion.meals && suggestion.meals.length > 0) {
          newMealSuggestion = suggestion.meals[0];
        } else {
          throw new Error('AI returned empty meal suggestions');
        }
      } catch (error) {
        retryCount++;
        logger.error('Failed to generate swap meal (attempt ' + retryCount + '/' + maxRetries + ')', {
          userId,
          mealId,
          retryCount,
          error: error.message
        });

        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
    }

    // 4. If AI failed, use fallback
    if (!newMealSuggestion) {
      newMealSuggestion = generateFallbackMeal(existingMeal.mealType, existingMeal.servings, budgetPerMeal);
      logger.warn('Using fallback meal for swap', { userId, mealId });
    }

    // 5. Update the meal in database
    const updatedMeal = await prisma.plannedMeal.update({
      where: { id: mealId },
      data: {
        mealName: newMealSuggestion.name,
        servings: newMealSuggestion.servings,
        cookingTimeMin: newMealSuggestion.cookingTimeMin,
        totalCostEur: newMealSuggestion.totalCostEur,
        ingredients: JSON.stringify(newMealSuggestion.ingredients),
        recipe: JSON.stringify(newMealSuggestion.recipe),
        nutritionInfo: newMealSuggestion.nutritionInfo
          ? JSON.stringify(newMealSuggestion.nutritionInfo)
          : null,
        difficulty: newMealSuggestion.difficulty || 'intermediate',
        cuisineType: newMealSuggestion.cuisineType || null,
        tags: newMealSuggestion.tags ? JSON.stringify(newMealSuggestion.tags) : null,
        // Reset cooking status for new meal
        isCooked: false,
        cookedAt: null,
        rating: null,
        notes: null
      }
    });

    // 6. Update weekly plan cost
    const allMeals = await prisma.plannedMeal.findMany({
      where: { weeklyPlanId: existingMeal.weeklyPlanId }
    });

    const totalCost = allMeals.reduce((sum, meal) => sum + meal.totalCostEur, 0);

    await prisma.weeklyMealPlan.update({
      where: { id: existingMeal.weeklyPlanId },
      data: { actualCost: totalCost }
    });

    logger.info('Meal swapped successfully', {
      userId,
      mealId,
      oldMeal: existingMeal.mealName,
      newMeal: updatedMeal.mealName,
      retriedCount: retryCount
    });

    // Track analytics event
    analyticsService.trackUserAction(userId, 'meal_swapped', {
      mealId,
      oldMeal: existingMeal.mealName,
      newMeal: updatedMeal.mealName,
      mealType: updatedMeal.mealType,
      dayOfWeek: updatedMeal.dayOfWeek,
      retriedCount: retryCount,
      preferredCuisine: options.preferredCuisine || null
    });

    return {
      meal: updatedMeal,
      weeklyPlanId: existingMeal.weeklyPlanId,
      needsGroceryListUpdate: true
    };

  } catch (error) {
    logger.error('Failed to swap meal', {
      userId,
      mealId,
      error: error.message
    });
    throw error;
  }
}

module.exports = {
  saveUserMealPreferences,
  getUserMealPreferences,
  generateWeeklyMealPlan,
  generateGroceryList,
  getUserWeeklyMealPlans,
  updateGroceryItem,
  swapPlannedMeal
};
