/**
 * Tests unitaires - recipeService
 *
 * Coverage des fonctionnalités:
 * - safeParseField pour JSON/string/CSV/arrays
 * - getAllRecipes avec filtres et pagination
 * - getRecipeById avec favorites count
 * - createRecipe avec parsing JSON
 * - updateRecipe avec gestion erreurs P2025
 * - deleteRecipe avec gestion erreurs P2025
 * - getFavoriteRecipes avec parsing
 * - addFavoriteRecipe avec validation recipe existence
 * - removeFavoriteRecipe avec gestion not found
 */

const recipeService = require('../recipeService');
const { prisma } = require('../../lib/prisma');
const logger = require('../../utils/logger');

// Mock Prisma client
jest.mock('../../lib/prisma', () => ({
  prisma: {
    recipe: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    favoriteRecipe: {
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn()
    }
  }
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

describe('recipeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllRecipes', () => {
    it('should fetch recipes with pagination', async () => {
      const mockRecipes = [
        {
          id: '1',
          title: 'Pasta Carbonara',
          description: 'Italian pasta',
          estimatedPrice: 8.5,
          difficulty: 'easy',
          category: 'Italian',
          isActive: true,
          ingredients: JSON.stringify([{ name: 'Pasta', quantity: '400g' }]),
          instructions: JSON.stringify(['Cook pasta', 'Add sauce']),
          tags: JSON.stringify(['pasta', 'italian']),
          nutritionalInfo: JSON.stringify({ calories: 450 }),
          createdAt: new Date()
        },
        {
          id: '2',
          title: 'Pizza Margherita',
          description: 'Classic pizza',
          estimatedPrice: 12,
          difficulty: 'intermediate',
          category: 'Italian',
          isActive: true,
          ingredients: JSON.stringify([{ name: 'Dough', quantity: '1 ball' }]),
          instructions: JSON.stringify(['Prepare dough', 'Add toppings']),
          tags: JSON.stringify(['pizza', 'italian']),
          nutritionalInfo: JSON.stringify({ calories: 650 }),
          createdAt: new Date()
        }
      ];

      prisma.recipe.findMany.mockResolvedValueOnce(mockRecipes);
      prisma.recipe.count.mockResolvedValueOnce(2);

      const result = await recipeService.getAllRecipes({
        limit: 50,
        offset: 0
      });

      expect(prisma.recipe.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        take: 50,
        skip: 0,
        orderBy: { createdAt: 'desc' }
      });

      expect(prisma.recipe.count).toHaveBeenCalledWith({
        where: { isActive: true }
      });

      expect(result.recipes).toHaveLength(2);
      expect(result.total).toBe(2);

      // Verify JSON parsing
      expect(Array.isArray(result.recipes[0].ingredients)).toBe(true);
      expect(Array.isArray(result.recipes[0].instructions)).toBe(true);
      expect(Array.isArray(result.recipes[0].tags)).toBe(true);
      expect(result.recipes[0].nutritionalInfo).toEqual({ calories: 450 });
    });

    it('should apply category filter', async () => {
      prisma.recipe.findMany.mockResolvedValueOnce([]);
      prisma.recipe.count.mockResolvedValueOnce(0);

      await recipeService.getAllRecipes({
        category: 'Italian',
        limit: 50,
        offset: 0
      });

      expect(prisma.recipe.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          category: 'Italian'
        },
        take: 50,
        skip: 0,
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should apply difficulty filter', async () => {
      prisma.recipe.findMany.mockResolvedValueOnce([]);
      prisma.recipe.count.mockResolvedValueOnce(0);

      await recipeService.getAllRecipes({
        difficulty: 'easy',
        limit: 50,
        offset: 0
      });

      expect(prisma.recipe.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          difficulty: 'easy'
        },
        take: 50,
        skip: 0,
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should apply maxPrice filter', async () => {
      prisma.recipe.findMany.mockResolvedValueOnce([]);
      prisma.recipe.count.mockResolvedValueOnce(0);

      await recipeService.getAllRecipes({
        maxPrice: 10,
        limit: 50,
        offset: 0
      });

      expect(prisma.recipe.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          estimatedPrice: { lte: 10 }
        },
        take: 50,
        skip: 0,
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should apply search filter with OR condition', async () => {
      prisma.recipe.findMany.mockResolvedValueOnce([]);
      prisma.recipe.count.mockResolvedValueOnce(0);

      await recipeService.getAllRecipes({
        search: 'pasta',
        limit: 50,
        offset: 0
      });

      expect(prisma.recipe.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          OR: [
            { title: { contains: 'pasta', mode: 'insensitive' } },
            { description: { contains: 'pasta', mode: 'insensitive' } }
          ]
        },
        take: 50,
        skip: 0,
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should apply multiple filters simultaneously', async () => {
      prisma.recipe.findMany.mockResolvedValueOnce([]);
      prisma.recipe.count.mockResolvedValueOnce(0);

      await recipeService.getAllRecipes({
        category: 'Italian',
        difficulty: 'easy',
        maxPrice: 10,
        search: 'pasta',
        limit: 20,
        offset: 10
      });

      expect(prisma.recipe.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          category: 'Italian',
          difficulty: 'easy',
          estimatedPrice: { lte: 10 },
          OR: [
            { title: { contains: 'pasta', mode: 'insensitive' } },
            { description: { contains: 'pasta', mode: 'insensitive' } }
          ]
        },
        take: 20,
        skip: 10,
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('getRecipeById', () => {
    it('should fetch recipe by ID with favorites count', async () => {
      const mockRecipe = {
        id: '1',
        title: 'Pasta Carbonara',
        description: 'Italian pasta',
        estimatedPrice: 8.5,
        ingredients: JSON.stringify([{ name: 'Pasta', quantity: '400g' }]),
        instructions: JSON.stringify(['Cook pasta']),
        tags: JSON.stringify(['pasta']),
        nutritionalInfo: JSON.stringify({ calories: 450 }),
        favorites: [
          { userId: 'user-1' },
          { userId: 'user-2' }
        ]
      };

      prisma.recipe.findUnique.mockResolvedValueOnce(mockRecipe);

      const result = await recipeService.getRecipeById('1');

      expect(prisma.recipe.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          favorites: {
            select: { userId: true }
          }
        }
      });

      expect(result.id).toBe('1');
      expect(result.favoritesCount).toBe(2);
      expect(Array.isArray(result.ingredients)).toBe(true);
    });

    it('should return null when recipe not found', async () => {
      prisma.recipe.findUnique.mockResolvedValueOnce(null);

      const result = await recipeService.getRecipeById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('createRecipe', () => {
    it('should create recipe and parse JSON fields', async () => {
      const recipeData = {
        title: 'New Recipe',
        description: 'Test recipe',
        estimatedPrice: 10,
        difficulty: 'easy',
        category: 'Test',
        ingredients: [{ name: 'Ingredient 1' }],
        instructions: ['Step 1'],
        tags: ['test']
      };

      const mockCreatedRecipe = {
        id: 'new-recipe-id',
        ...recipeData,
        ingredients: JSON.stringify(recipeData.ingredients),
        instructions: JSON.stringify(recipeData.instructions),
        tags: JSON.stringify(recipeData.tags),
        createdAt: new Date()
      };

      prisma.recipe.create.mockResolvedValueOnce(mockCreatedRecipe);

      const result = await recipeService.createRecipe(recipeData);

      expect(prisma.recipe.create).toHaveBeenCalledWith({
        data: recipeData
      });

      expect(result.id).toBe('new-recipe-id');
      expect(Array.isArray(result.ingredients)).toBe(true);
      expect(Array.isArray(result.instructions)).toBe(true);
      expect(Array.isArray(result.tags)).toBe(true);
    });
  });

  describe('updateRecipe', () => {
    it('should update recipe successfully', async () => {
      const updateData = {
        title: 'Updated Recipe',
        estimatedPrice: 15
      };

      const mockUpdatedRecipe = {
        id: '1',
        title: 'Updated Recipe',
        description: 'Test',
        estimatedPrice: 15,
        ingredients: JSON.stringify([]),
        instructions: JSON.stringify([]),
        tags: JSON.stringify([])
      };

      prisma.recipe.update.mockResolvedValueOnce(mockUpdatedRecipe);

      const result = await recipeService.updateRecipe('1', updateData);

      expect(prisma.recipe.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateData
      });

      expect(result.title).toBe('Updated Recipe');
      expect(result.estimatedPrice).toBe(15);
    });

    it('should return null when recipe not found (P2025)', async () => {
      const error = new Error('Record not found');
      error.code = 'P2025';

      prisma.recipe.update.mockRejectedValueOnce(error);

      const result = await recipeService.updateRecipe('non-existent', {
        title: 'Test'
      });

      expect(result).toBeNull();
    });

    it('should throw error for other errors', async () => {
      const error = new Error('Database error');
      error.code = 'P2002';

      prisma.recipe.update.mockRejectedValueOnce(error);

      await expect(
        recipeService.updateRecipe('1', { title: 'Test' })
      ).rejects.toThrow('Database error');
    });
  });

  describe('deleteRecipe', () => {
    it('should delete recipe successfully', async () => {
      const mockDeletedRecipe = {
        id: '1',
        title: 'Deleted Recipe'
      };

      prisma.recipe.delete.mockResolvedValueOnce(mockDeletedRecipe);

      const result = await recipeService.deleteRecipe('1');

      expect(prisma.recipe.delete).toHaveBeenCalledWith({
        where: { id: '1' }
      });

      expect(result.id).toBe('1');
    });

    it('should return null when recipe not found (P2025)', async () => {
      const error = new Error('Record not found');
      error.code = 'P2025';

      prisma.recipe.delete.mockRejectedValueOnce(error);

      const result = await recipeService.deleteRecipe('non-existent');

      expect(result).toBeNull();
    });

    it('should throw error for other errors', async () => {
      const error = new Error('Database error');
      error.code = 'P2003';

      prisma.recipe.delete.mockRejectedValueOnce(error);

      await expect(
        recipeService.deleteRecipe('1')
      ).rejects.toThrow('Database error');
    });
  });

  describe('getFavoriteRecipes', () => {
    it('should fetch user favorites with parsed recipes', async () => {
      const mockFavorites = [
        {
          id: 'fav-1',
          userId: 'user-1',
          recipeId: 'recipe-1',
          createdAt: new Date('2025-01-01'),
          recipe: {
            id: 'recipe-1',
            title: 'Pasta',
            ingredients: JSON.stringify([{ name: 'Pasta' }]),
            instructions: JSON.stringify(['Cook']),
            tags: JSON.stringify(['pasta'])
          }
        },
        {
          id: 'fav-2',
          userId: 'user-1',
          recipeId: 'recipe-2',
          createdAt: new Date('2025-01-02'),
          recipe: {
            id: 'recipe-2',
            title: 'Pizza',
            ingredients: JSON.stringify([{ name: 'Dough' }]),
            instructions: JSON.stringify(['Bake']),
            tags: JSON.stringify(['pizza'])
          }
        }
      ];

      prisma.favoriteRecipe.findMany.mockResolvedValueOnce(mockFavorites);

      const result = await recipeService.getFavoriteRecipes('user-1');

      expect(prisma.favoriteRecipe.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { recipe: true },
        orderBy: { createdAt: 'desc' }
      });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('fav-1');
      expect(result[0].recipe.title).toBe('Pasta');
      expect(Array.isArray(result[0].recipe.ingredients)).toBe(true);
      expect(Array.isArray(result[1].recipe.tags)).toBe(true);
    });

    it('should return empty array when no favorites', async () => {
      prisma.favoriteRecipe.findMany.mockResolvedValueOnce([]);

      const result = await recipeService.getFavoriteRecipes('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('addFavoriteRecipe', () => {
    it('should add recipe to favorites', async () => {
      const mockRecipe = {
        id: 'recipe-1',
        title: 'Pasta Carbonara',
        ingredients: JSON.stringify([{ name: 'Pasta' }]),
        instructions: JSON.stringify(['Cook pasta']),
        tags: JSON.stringify(['pasta'])
      };

      const mockFavorite = {
        id: 'fav-1',
        userId: 'user-1',
        recipeId: 'recipe-1',
        createdAt: new Date(),
        recipe: mockRecipe
      };

      prisma.recipe.findUnique.mockResolvedValueOnce(mockRecipe);
      prisma.favoriteRecipe.create.mockResolvedValueOnce(mockFavorite);

      const result = await recipeService.addFavoriteRecipe('user-1', 'recipe-1');

      expect(prisma.recipe.findUnique).toHaveBeenCalledWith({
        where: { id: 'recipe-1' }
      });

      expect(prisma.favoriteRecipe.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          recipeId: 'recipe-1'
        },
        include: { recipe: true }
      });

      expect(result.id).toBe('fav-1');
      expect(result.recipe.title).toBe('Pasta Carbonara');
      expect(Array.isArray(result.recipe.ingredients)).toBe(true);
    });

    it('should throw error when recipe not found', async () => {
      prisma.recipe.findUnique.mockResolvedValueOnce(null);

      await expect(
        recipeService.addFavoriteRecipe('user-1', 'non-existent')
      ).rejects.toThrow('Recipe not found');

      // Verify error code
      try {
        await recipeService.addFavoriteRecipe('user-1', 'non-existent');
      } catch (error) {
        expect(error.code).toBe('RECIPE_NOT_FOUND');
      }

      expect(prisma.favoriteRecipe.create).not.toHaveBeenCalled();
    });
  });

  describe('removeFavoriteRecipe', () => {
    it('should remove recipe from favorites', async () => {
      const mockDeleteResult = { count: 1 };

      prisma.favoriteRecipe.deleteMany.mockResolvedValueOnce(mockDeleteResult);

      const result = await recipeService.removeFavoriteRecipe('user-1', 'recipe-1');

      expect(prisma.favoriteRecipe.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          recipeId: 'recipe-1'
        }
      });

      expect(result.count).toBe(1);
    });

    it('should return null when favorite not found', async () => {
      const mockDeleteResult = { count: 0 };

      prisma.favoriteRecipe.deleteMany.mockResolvedValueOnce(mockDeleteResult);

      const result = await recipeService.removeFavoriteRecipe('user-1', 'recipe-1');

      expect(result).toBeNull();
    });

    it('should throw error on database error', async () => {
      const error = new Error('Database connection error');

      prisma.favoriteRecipe.deleteMany.mockRejectedValueOnce(error);

      await expect(
        recipeService.removeFavoriteRecipe('user-1', 'recipe-1')
      ).rejects.toThrow('Database connection error');
    });
  });

  describe('Edge Cases - JSON Parsing', () => {
    it('should handle recipes with already-parsed arrays', async () => {
      const mockRecipe = {
        id: '1',
        title: 'Test Recipe',
        ingredients: [{ name: 'Ingredient 1' }], // Already an array
        instructions: ['Step 1'], // Already an array
        tags: ['tag1'], // Already an array
        nutritionalInfo: { calories: 500 }, // Already an object
        favorites: []
      };

      prisma.recipe.findUnique.mockResolvedValueOnce(mockRecipe);

      const result = await recipeService.getRecipeById('1');

      expect(Array.isArray(result.ingredients)).toBe(true);
      expect(Array.isArray(result.instructions)).toBe(true);
      expect(Array.isArray(result.tags)).toBe(true);
      expect(result.nutritionalInfo).toEqual({ calories: 500 });
    });

    it('should handle recipes with comma-separated string tags', async () => {
      const mockRecipe = {
        id: '1',
        title: 'Test Recipe',
        ingredients: JSON.stringify([]),
        instructions: JSON.stringify([]),
        tags: 'pasta, italian, quick', // Comma-separated string
        nutritionalInfo: null,
        favorites: []
      };

      prisma.recipe.findUnique.mockResolvedValueOnce(mockRecipe);

      const result = await recipeService.getRecipeById('1');

      expect(Array.isArray(result.tags)).toBe(true);
      expect(result.tags).toEqual(['pasta', 'italian', 'quick']);
    });

    it('should handle recipes with null/undefined fields', async () => {
      const mockRecipe = {
        id: '1',
        title: 'Test Recipe',
        ingredients: null,
        instructions: undefined,
        tags: null,
        nutritionalInfo: null,
        favorites: []
      };

      prisma.recipe.findUnique.mockResolvedValueOnce(mockRecipe);

      const result = await recipeService.getRecipeById('1');

      expect(result.ingredients).toEqual([]);
      expect(result.instructions).toEqual([]);
      expect(result.tags).toEqual([]);
      expect(result.nutritionalInfo).toBeNull();
    });

    it('should handle recipes with invalid JSON gracefully', async () => {
      const mockRecipe = {
        id: '1',
        title: 'Test Recipe',
        ingredients: '{invalid json}',
        instructions: 'plain string instruction',
        tags: JSON.stringify(['valid']),
        nutritionalInfo: null,
        favorites: []
      };

      prisma.recipe.findUnique.mockResolvedValueOnce(mockRecipe);

      const result = await recipeService.getRecipeById('1');

      // Invalid JSON should return as-is (string)
      expect(result.ingredients).toBe('{invalid json}');
      expect(result.instructions).toBe('plain string instruction');
      expect(Array.isArray(result.tags)).toBe(true);
    });
  });
});
