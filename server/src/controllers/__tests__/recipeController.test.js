/**
 * Tests unitaires - recipeController
 *
 * Coverage des fonctionnalités:
 * - getAllRecipes avec query params et pagination
 * - getRecipeById avec gestion 404
 * - createRecipe avec JSON.stringify
 * - updateRecipe avec gestion 404 et JSON
 * - deleteRecipe avec gestion 404
 * - getFavoriteRecipes avec userId
 * - addFavoriteRecipe avec gestion P2002 duplicate
 * - removeFavoriteRecipe avec gestion 404
 * - Logging et error handling via next()
 */

const recipeController = require('../recipeController');
const recipeService = require('../../services/recipeService');
const logger = require('../../utils/logger');
const { sendSuccess, sendError } = require('../../utils/responseHelper');

// Mock dependencies
jest.mock('../../services/recipeService');
jest.mock('../../utils/logger');
jest.mock('../../utils/responseHelper');

describe('recipeController', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock request
    mockReq = {
      query: {},
      params: {},
      body: {},
      user: {
        userId: 'user-123'
      }
    };

    // Mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Mock next
    mockNext = jest.fn();

    // Mock response helpers
    sendSuccess.mockImplementation((res, data, message, statusCode) => {
      res.status(statusCode || 200).json({ success: true, data, message });
    });

    sendError.mockImplementation((res, message, statusCode, errors) => {
      res.status(statusCode || 500).json({ success: false, message, errors });
    });
  });

  describe('getAllRecipes', () => {
    it('should get all recipes with default pagination', async () => {
      const mockRecipes = [
        { id: '1', title: 'Pasta' },
        { id: '2', title: 'Pizza' }
      ];

      recipeService.getAllRecipes.mockResolvedValueOnce({
        recipes: mockRecipes,
        total: 2
      });

      mockReq.query = {};

      await recipeController.getAllRecipes(mockReq, mockRes, mockNext);

      expect(recipeService.getAllRecipes).toHaveBeenCalledWith({
        category: undefined,
        difficulty: undefined,
        maxPrice: undefined,
        search: undefined,
        limit: 50,
        offset: 0
      });

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {
        recipes: mockRecipes,
        pagination: {
          total: 2,
          limit: 50,
          offset: 0,
          hasMore: false
        }
      });

      expect(logger.info).toHaveBeenCalledWith(
        'Recipes retrieved successfully',
        expect.objectContaining({
          count: 2,
          total: 2
        })
      );
    });

    it('should apply filters from query params', async () => {
      recipeService.getAllRecipes.mockResolvedValueOnce({
        recipes: [],
        total: 0
      });

      mockReq.query = {
        category: 'Italian',
        difficulty: 'easy',
        maxPrice: '15.5',
        search: 'pasta',
        limit: '20',
        offset: '10'
      };

      await recipeController.getAllRecipes(mockReq, mockRes, mockNext);

      expect(recipeService.getAllRecipes).toHaveBeenCalledWith({
        category: 'Italian',
        difficulty: 'easy',
        maxPrice: 15.5,
        search: 'pasta',
        limit: 20,
        offset: 10
      });
    });

    it('should calculate hasMore correctly when more results exist', async () => {
      recipeService.getAllRecipes.mockResolvedValueOnce({
        recipes: new Array(50).fill({ id: '1' }),
        total: 100
      });

      mockReq.query = { limit: '50', offset: '0' };

      await recipeController.getAllRecipes(mockReq, mockRes, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {
        recipes: expect.any(Array),
        pagination: {
          total: 100,
          limit: 50,
          offset: 0,
          hasMore: true
        }
      });
    });

    it('should handle errors and call next', async () => {
      const mockError = new Error('Database error');
      recipeService.getAllRecipes.mockRejectedValueOnce(mockError);

      await recipeController.getAllRecipes(mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get recipes',
        expect.objectContaining({
          error: 'Database error'
        })
      );

      expect(mockNext).toHaveBeenCalledWith(mockError);
      expect(sendSuccess).not.toHaveBeenCalled();
    });
  });

  describe('getRecipeById', () => {
    it('should get recipe by ID successfully', async () => {
      const mockRecipe = {
        id: 'recipe-1',
        title: 'Pasta Carbonara',
        ingredients: [{ name: 'Pasta' }]
      };

      recipeService.getRecipeById.mockResolvedValueOnce(mockRecipe);

      mockReq.params = { id: 'recipe-1' };

      await recipeController.getRecipeById(mockReq, mockRes, mockNext);

      expect(recipeService.getRecipeById).toHaveBeenCalledWith('recipe-1');

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, { recipe: mockRecipe });

      expect(logger.info).toHaveBeenCalledWith(
        'Recipe retrieved successfully',
        { recipeId: 'recipe-1' }
      );
    });

    it('should return 404 when recipe not found', async () => {
      recipeService.getRecipeById.mockResolvedValueOnce(null);

      mockReq.params = { id: 'non-existent' };

      await recipeController.getRecipeById(mockReq, mockRes, mockNext);

      expect(sendError).toHaveBeenCalledWith(
        mockRes,
        'Recipe not found',
        404,
        [{ type: 'RECIPE_NOT_FOUND' }]
      );

      expect(sendSuccess).not.toHaveBeenCalled();
    });

    it('should handle errors and call next', async () => {
      const mockError = new Error('Database connection failed');
      recipeService.getRecipeById.mockRejectedValueOnce(mockError);

      mockReq.params = { id: 'recipe-1' };

      await recipeController.getRecipeById(mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get recipe',
        expect.objectContaining({
          recipeId: 'recipe-1',
          error: 'Database connection failed'
        })
      );

      expect(mockNext).toHaveBeenCalledWith(mockError);
    });
  });

  describe('createRecipe', () => {
    it('should create recipe and stringify JSON fields', async () => {
      const mockCreatedRecipe = {
        id: 'new-recipe-1',
        title: 'New Recipe',
        ingredients: [{ name: 'Ingredient 1' }],
        instructions: ['Step 1'],
        tags: ['tag1']
      };

      recipeService.createRecipe.mockResolvedValueOnce(mockCreatedRecipe);

      mockReq.body = {
        title: 'New Recipe',
        description: 'Test',
        estimatedPrice: 10,
        ingredients: [{ name: 'Ingredient 1' }],
        instructions: ['Step 1'],
        tags: ['tag1'],
        nutritionalInfo: { calories: 500 }
      };

      await recipeController.createRecipe(mockReq, mockRes, mockNext);

      expect(recipeService.createRecipe).toHaveBeenCalledWith({
        title: 'New Recipe',
        description: 'Test',
        estimatedPrice: 10,
        ingredients: JSON.stringify([{ name: 'Ingredient 1' }]),
        instructions: JSON.stringify(['Step 1']),
        tags: JSON.stringify(['tag1']),
        nutritionalInfo: JSON.stringify({ calories: 500 })
      });

      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        { recipe: mockCreatedRecipe },
        'Recipe created successfully',
        201
      );

      expect(logger.info).toHaveBeenCalledWith(
        'Recipe created successfully',
        {
          userId: 'user-123',
          recipeId: 'new-recipe-1'
        }
      );
    });

    it('should handle empty tags as empty array', async () => {
      recipeService.createRecipe.mockResolvedValueOnce({ id: '1' });

      mockReq.body = {
        title: 'Recipe without tags',
        ingredients: [],
        instructions: []
      };

      await recipeController.createRecipe(mockReq, mockRes, mockNext);

      expect(recipeService.createRecipe).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: JSON.stringify([])
        })
      );
    });

    it('should handle null nutritionalInfo', async () => {
      recipeService.createRecipe.mockResolvedValueOnce({ id: '1' });

      mockReq.body = {
        title: 'Recipe',
        ingredients: [],
        instructions: []
      };

      await recipeController.createRecipe(mockReq, mockRes, mockNext);

      expect(recipeService.createRecipe).toHaveBeenCalledWith(
        expect.objectContaining({
          nutritionalInfo: null
        })
      );
    });

    it('should handle errors and call next', async () => {
      const mockError = new Error('Validation error');
      recipeService.createRecipe.mockRejectedValueOnce(mockError);

      mockReq.body = { title: 'Recipe' };

      await recipeController.createRecipe(mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to create recipe',
        expect.objectContaining({
          userId: 'user-123',
          error: 'Validation error'
        })
      );

      expect(mockNext).toHaveBeenCalledWith(mockError);
    });
  });

  describe('updateRecipe', () => {
    it('should update recipe and stringify JSON fields', async () => {
      const mockUpdatedRecipe = {
        id: 'recipe-1',
        title: 'Updated Recipe',
        ingredients: [{ name: 'New Ingredient' }]
      };

      recipeService.updateRecipe.mockResolvedValueOnce(mockUpdatedRecipe);

      mockReq.params = { id: 'recipe-1' };
      mockReq.body = {
        title: 'Updated Recipe',
        ingredients: [{ name: 'New Ingredient' }],
        instructions: ['Updated Step'],
        tags: ['updated'],
        nutritionalInfo: { calories: 600 }
      };

      await recipeController.updateRecipe(mockReq, mockRes, mockNext);

      expect(recipeService.updateRecipe).toHaveBeenCalledWith('recipe-1', {
        title: 'Updated Recipe',
        ingredients: JSON.stringify([{ name: 'New Ingredient' }]),
        instructions: JSON.stringify(['Updated Step']),
        tags: JSON.stringify(['updated']),
        nutritionalInfo: JSON.stringify({ calories: 600 })
      });

      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        { recipe: mockUpdatedRecipe },
        'Recipe updated successfully'
      );

      expect(logger.info).toHaveBeenCalledWith(
        'Recipe updated successfully',
        {
          userId: 'user-123',
          recipeId: 'recipe-1'
        }
      );
    });

    it('should only stringify fields that are present', async () => {
      recipeService.updateRecipe.mockResolvedValueOnce({ id: 'recipe-1' });

      mockReq.params = { id: 'recipe-1' };
      mockReq.body = {
        title: 'Updated Title'
        // No ingredients, instructions, tags, or nutritionalInfo
      };

      await recipeController.updateRecipe(mockReq, mockRes, mockNext);

      expect(recipeService.updateRecipe).toHaveBeenCalledWith('recipe-1', {
        title: 'Updated Title'
      });
    });

    it('should return 404 when recipe not found', async () => {
      recipeService.updateRecipe.mockResolvedValueOnce(null);

      mockReq.params = { id: 'non-existent' };
      mockReq.body = { title: 'Updated' };

      await recipeController.updateRecipe(mockReq, mockRes, mockNext);

      expect(sendError).toHaveBeenCalledWith(
        mockRes,
        'Recipe not found',
        404,
        [{ type: 'RECIPE_NOT_FOUND' }]
      );

      expect(sendSuccess).not.toHaveBeenCalled();
    });

    it('should handle errors and call next', async () => {
      const mockError = new Error('Update failed');
      recipeService.updateRecipe.mockRejectedValueOnce(mockError);

      mockReq.params = { id: 'recipe-1' };
      mockReq.body = { title: 'Updated' };

      await recipeController.updateRecipe(mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to update recipe',
        expect.objectContaining({
          userId: 'user-123',
          recipeId: 'recipe-1',
          error: 'Update failed'
        })
      );

      expect(mockNext).toHaveBeenCalledWith(mockError);
    });
  });

  describe('deleteRecipe', () => {
    it('should delete recipe successfully', async () => {
      const mockDeletedRecipe = { id: 'recipe-1', title: 'Deleted Recipe' };

      recipeService.deleteRecipe.mockResolvedValueOnce(mockDeletedRecipe);

      mockReq.params = { id: 'recipe-1' };

      await recipeController.deleteRecipe(mockReq, mockRes, mockNext);

      expect(recipeService.deleteRecipe).toHaveBeenCalledWith('recipe-1');

      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        null,
        'Recipe deleted successfully'
      );

      expect(logger.info).toHaveBeenCalledWith(
        'Recipe deleted successfully',
        {
          userId: 'user-123',
          recipeId: 'recipe-1'
        }
      );
    });

    it('should return 404 when recipe not found', async () => {
      recipeService.deleteRecipe.mockResolvedValueOnce(null);

      mockReq.params = { id: 'non-existent' };

      await recipeController.deleteRecipe(mockReq, mockRes, mockNext);

      expect(sendError).toHaveBeenCalledWith(
        mockRes,
        'Recipe not found',
        404,
        [{ type: 'RECIPE_NOT_FOUND' }]
      );

      expect(sendSuccess).not.toHaveBeenCalled();
    });

    it('should handle errors and call next', async () => {
      const mockError = new Error('Delete failed');
      recipeService.deleteRecipe.mockRejectedValueOnce(mockError);

      mockReq.params = { id: 'recipe-1' };

      await recipeController.deleteRecipe(mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to delete recipe',
        expect.objectContaining({
          userId: 'user-123',
          recipeId: 'recipe-1',
          error: 'Delete failed'
        })
      );

      expect(mockNext).toHaveBeenCalledWith(mockError);
    });
  });

  describe('getFavoriteRecipes', () => {
    it('should get user favorite recipes', async () => {
      const mockFavorites = [
        { id: 'fav-1', recipe: { id: 'recipe-1', title: 'Pasta' } },
        { id: 'fav-2', recipe: { id: 'recipe-2', title: 'Pizza' } }
      ];

      recipeService.getFavoriteRecipes.mockResolvedValueOnce(mockFavorites);

      await recipeController.getFavoriteRecipes(mockReq, mockRes, mockNext);

      expect(recipeService.getFavoriteRecipes).toHaveBeenCalledWith('user-123');

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, { favorites: mockFavorites });

      expect(logger.info).toHaveBeenCalledWith(
        'Favorite recipes retrieved successfully',
        {
          userId: 'user-123',
          count: 2
        }
      );
    });

    it('should handle empty favorites', async () => {
      recipeService.getFavoriteRecipes.mockResolvedValueOnce([]);

      await recipeController.getFavoriteRecipes(mockReq, mockRes, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, { favorites: [] });

      expect(logger.info).toHaveBeenCalledWith(
        'Favorite recipes retrieved successfully',
        {
          userId: 'user-123',
          count: 0
        }
      );
    });

    it('should handle errors and call next', async () => {
      const mockError = new Error('Fetch failed');
      recipeService.getFavoriteRecipes.mockRejectedValueOnce(mockError);

      await recipeController.getFavoriteRecipes(mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get favorite recipes',
        expect.objectContaining({
          userId: 'user-123',
          error: 'Fetch failed'
        })
      );

      expect(mockNext).toHaveBeenCalledWith(mockError);
    });
  });

  describe('addFavoriteRecipe', () => {
    it('should add recipe to favorites', async () => {
      const mockFavorite = {
        id: 'fav-1',
        userId: 'user-123',
        recipeId: 'recipe-1',
        recipe: { id: 'recipe-1', title: 'Pasta' }
      };

      recipeService.addFavoriteRecipe.mockResolvedValueOnce(mockFavorite);

      mockReq.params = { id: 'recipe-1' };

      await recipeController.addFavoriteRecipe(mockReq, mockRes, mockNext);

      expect(recipeService.addFavoriteRecipe).toHaveBeenCalledWith(
        'user-123',
        'recipe-1'
      );

      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        { favorite: mockFavorite },
        'Recipe added to favorites',
        201
      );

      expect(logger.info).toHaveBeenCalledWith(
        'Recipe added to favorites',
        {
          userId: 'user-123',
          recipeId: 'recipe-1'
        }
      );
    });

    it('should return 409 when recipe already favorited (P2002)', async () => {
      const mockError = new Error('Unique constraint violation');
      mockError.code = 'P2002';

      recipeService.addFavoriteRecipe.mockRejectedValueOnce(mockError);

      mockReq.params = { id: 'recipe-1' };

      await recipeController.addFavoriteRecipe(mockReq, mockRes, mockNext);

      expect(sendError).toHaveBeenCalledWith(
        mockRes,
        'Recipe already in favorites',
        409,
        [{ type: 'ALREADY_FAVORITED' }]
      );

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle other errors and call next', async () => {
      const mockError = new Error('Database error');
      mockError.code = 'P2003';

      recipeService.addFavoriteRecipe.mockRejectedValueOnce(mockError);

      mockReq.params = { id: 'recipe-1' };

      await recipeController.addFavoriteRecipe(mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to add favorite recipe',
        expect.objectContaining({
          userId: 'user-123',
          recipeId: 'recipe-1',
          error: 'Database error'
        })
      );

      expect(mockNext).toHaveBeenCalledWith(mockError);
    });
  });

  describe('removeFavoriteRecipe', () => {
    it('should remove recipe from favorites', async () => {
      recipeService.removeFavoriteRecipe.mockResolvedValueOnce({ count: 1 });

      mockReq.params = { id: 'recipe-1' };

      await recipeController.removeFavoriteRecipe(mockReq, mockRes, mockNext);

      expect(recipeService.removeFavoriteRecipe).toHaveBeenCalledWith(
        'user-123',
        'recipe-1'
      );

      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        null,
        'Recipe removed from favorites'
      );

      expect(logger.info).toHaveBeenCalledWith(
        'Recipe removed from favorites',
        {
          userId: 'user-123',
          recipeId: 'recipe-1'
        }
      );
    });

    it('should return 404 when favorite not found', async () => {
      recipeService.removeFavoriteRecipe.mockResolvedValueOnce(null);

      mockReq.params = { id: 'recipe-1' };

      await recipeController.removeFavoriteRecipe(mockReq, mockRes, mockNext);

      expect(sendError).toHaveBeenCalledWith(
        mockRes,
        'Favorite not found',
        404,
        [{ type: 'FAVORITE_NOT_FOUND' }]
      );

      expect(sendSuccess).not.toHaveBeenCalled();
    });

    it('should handle errors and call next', async () => {
      const mockError = new Error('Remove failed');
      recipeService.removeFavoriteRecipe.mockRejectedValueOnce(mockError);

      mockReq.params = { id: 'recipe-1' };

      await recipeController.removeFavoriteRecipe(mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to remove favorite recipe',
        expect.objectContaining({
          userId: 'user-123',
          recipeId: 'recipe-1',
          error: 'Remove failed'
        })
      );

      expect(mockNext).toHaveBeenCalledWith(mockError);
    });
  });
});
