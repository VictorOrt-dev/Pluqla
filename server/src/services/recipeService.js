/**
 * Recipe Service
 *
 * Business logic for recipe management
 */

const { prisma } = require('../lib/prisma');
const logger = require('../utils/logger');

/**
 * Safely parse a field that might be JSON or plain string
 */
const safeParseField = (field, defaultValue = null) => {
  if (!field) return defaultValue;

  try {
    // If already an object/array, return as-is
    if (typeof field !== 'string') return field;

    // Try to parse as JSON
    return JSON.parse(field);
  } catch (error) {
    // If parsing fails, check if it's a comma-separated string (tags case)
    if (field.includes(',')) {
      return field.split(',').map(s => s.trim());
    }
    // Otherwise return as-is
    return field;
  }
};

/**
 * Parse recipe JSON fields safely
 */
const parseRecipeFields = (recipe) => ({
  ...recipe,
  ingredients: safeParseField(recipe.ingredients, []),
  instructions: safeParseField(recipe.instructions, []),
  tags: safeParseField(recipe.tags, []),
  nutritionalInfo: safeParseField(recipe.nutritionalInfo, null)
});

/**
 * Get all recipes with filters and pagination
 */
const getAllRecipes = async (filters) => {
  const { category, difficulty, maxPrice, search, limit, offset } = filters;

  const where = {
    isActive: true
  };

  if (category) {
    where.category = category;
  }

  if (difficulty) {
    where.difficulty = difficulty;
  }

  if (maxPrice) {
    where.estimatedPrice = {
      lte: maxPrice
    };
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [recipes, total] = await Promise.all([
    prisma.recipe.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: {
        createdAt: 'desc'
      }
    }),
    prisma.recipe.count({ where })
  ]);

  // Parse JSON fields safely
  const parsedRecipes = recipes.map(parseRecipeFields);

  return {
    recipes: parsedRecipes,
    total
  };
};

/**
 * Get recipe by ID
 */
const getRecipeById = async (id) => {
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      favorites: {
        select: {
          userId: true
        }
      }
    }
  });

  if (!recipe) {
    return null;
  }

  // Parse JSON fields safely
  return {
    ...parseRecipeFields(recipe),
    favoritesCount: recipe.favorites.length
  };
};

/**
 * Create new recipe
 */
const createRecipe = async (data) => {
  const recipe = await prisma.recipe.create({
    data
  });

  // Parse JSON fields for response
  return parseRecipeFields(recipe);
};

/**
 * Update recipe
 */
const updateRecipe = async (id, data) => {
  try {
    const recipe = await prisma.recipe.update({
      where: { id },
      data
    });

    // Parse JSON fields for response
    return parseRecipeFields(recipe);
  } catch (error) {
    if (error.code === 'P2025') {
      return null; // Recipe not found
    }
    throw error;
  }
};

/**
 * Delete recipe
 */
const deleteRecipe = async (id) => {
  try {
    const recipe = await prisma.recipe.delete({
      where: { id }
    });

    return recipe;
  } catch (error) {
    if (error.code === 'P2025') {
      return null; // Recipe not found
    }
    throw error;
  }
};

/**
 * Get user's favorite recipes
 */
const getFavoriteRecipes = async (userId) => {
  const favorites = await prisma.favoriteRecipe.findMany({
    where: { userId },
    include: {
      recipe: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Parse JSON fields and format response
  return favorites.map(fav => ({
    id: fav.id,
    createdAt: fav.createdAt,
    recipe: parseRecipeFields(fav.recipe)
  }));
};

/**
 * Add recipe to favorites
 */
const addFavoriteRecipe = async (userId, recipeId) => {
  // Check if recipe exists
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId }
  });

  if (!recipe) {
    const error = new Error('Recipe not found');
    error.code = 'RECIPE_NOT_FOUND';
    throw error;
  }

  const favorite = await prisma.favoriteRecipe.create({
    data: {
      userId,
      recipeId
    },
    include: {
      recipe: true
    }
  });

  return {
    id: favorite.id,
    createdAt: favorite.createdAt,
    recipe: parseRecipeFields(favorite.recipe)
  };
};

/**
 * Remove recipe from favorites
 */
const removeFavoriteRecipe = async (userId, recipeId) => {
  try {
    const favorite = await prisma.favoriteRecipe.deleteMany({
      where: {
        userId,
        recipeId
      }
    });

    if (favorite.count === 0) {
      return null; // Favorite not found
    }

    return favorite;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getAllRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getFavoriteRecipes,
  addFavoriteRecipe,
  removeFavoriteRecipe
};
