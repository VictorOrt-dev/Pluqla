const express = require('express');

const router = express.Router();
const shoppingListController = require('../controllers/shoppingListController');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * /api/shopping-list/generate:
 *   post:
 *     summary: Générer une liste de courses à partir de recettes
 *     tags: [Shopping List]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - selectedRecipes
 *             properties:
 *               selectedRecipes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     ingredients:
 *                       type: array
 *                       items:
 *                         type: string
 *               language:
 *                 type: string
 *                 enum: [fr, en, es]
 *                 default: fr
 *     responses:
 *       200:
 *         description: Liste de courses générée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           quantity:
 *                             type: string
 *                           unit:
 *                             type: string
 *                           category:
 *                             type: string
 *                           estimatedPrice:
 *                             type: number
 *                     totalEstimatedCost:
 *                       type: number
 *                     tips:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.post('/generate', authenticateToken, shoppingListController.generateShoppingList);

/**
 * @swagger
 * /api/shopping-list/optimize:
 *   post:
 *     summary: Optimiser une liste de courses selon un budget
 *     tags: [Shopping List]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shoppingList
 *             properties:
 *               shoppingList:
 *                 type: object
 *               budget:
 *                 type: number
 *               preferences:
 *                 type: object
 *     responses:
 *       200:
 *         description: Liste optimisée avec succès
 */
router.post('/optimize', authenticateToken, shoppingListController.optimizeShoppingList);

module.exports = router;
