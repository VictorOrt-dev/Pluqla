/**
 * Validation and Error Handling Integration Examples
 *
 * Complete examples showing how to integrate validation and error handling
 * in Express routes and controllers.
 *
 * @module examples/validationIntegration
 */

const express = require('express');
const router = express.Router();

// Import validation schemas
const {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  createTransactionSchema,
  updateTransactionSchema,
  aiSuggestionSchema
} = require('../src/validation/schemas');

// Import validation middleware
const {
  validate,
  validateMultiple,
  asyncHandler,
  sanitize
} = require('../src/middleware/validationMiddleware');

// Import error classes
const {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError
} = require('../src/middleware/centralizedErrorHandler');

// Import services (example)
const { prisma } = require('../src/lib/prisma');
const bcrypt = require('bcryptjs');

// ========================================
// AUTHENTICATION ROUTES
// ========================================

/**
 * Register new user
 *
 * POST /api/auth/register
 * Body: { email, password, name }
 *
 * Validation:
 * - Email: valid format, max 255 chars
 * - Password: min 10 chars, uppercase, lowercase, number, special char
 * - Name: min 2 chars, max 100 chars
 */
router.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      // Throw ConflictError - will be caught by error handler
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'user',
        status: 'active'
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user
    });
  })
);

/**
 * Login user
 *
 * POST /api/auth/login
 * Body: { email, password }
 *
 * Validation:
 * - Email: valid format
 * - Password: required
 */
router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Don't reveal if user exists or not (security)
      throw new UnauthorizedError('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check account status
    if (user.status !== 'active') {
      throw new ForbiddenError('Account is inactive or suspended');
    }

    // In real app: create session/JWT here
    const token = 'generated-jwt-token';

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  })
);

/**
 * Change password
 *
 * POST /api/auth/change-password
 * Body: { currentPassword, newPassword, confirmPassword }
 *
 * Validation:
 * - Current password: required
 * - New password: min 10 chars, complexity rules
 * - Confirm password: must match new password
 * - New password must be different from current
 */
router.post(
  '/change-password',
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id; // Assumes auth middleware sets req.user

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    // Fetch user with password
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);

    if (!isValidPassword) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  })
);

// ========================================
// TRANSACTION ROUTES
// ========================================

/**
 * Create transaction
 *
 * POST /api/transactions
 * Body: { type, amount, currency, category, description, date, tags }
 *
 * Validation:
 * - Type: enum (income, expense, savings)
 * - Amount: positive number, max 2 decimals
 * - Currency: enum (EUR, USD, GBP, CHF, CAD)
 * - Category: required, max 50 chars
 * - Description: optional, max 500 chars
 * - Tags: optional, max 10 tags, each max 30 chars
 */
router.post(
  '/transactions',
  validate(createTransactionSchema),
  sanitize(['description']), // Sanitize HTML from description
  asyncHandler(async (req, res) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const { type, amount, currency, category, description, date, tags } = req.body;

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type,
        amount,
        currency,
        category,
        description,
        date: date || new Date(),
        tags: tags || []
      }
    });

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      transaction
    });
  })
);

/**
 * Update transaction
 *
 * PUT /api/transactions/:id
 * Params: { id }
 * Body: { type?, amount?, currency?, category?, description?, tags? }
 *
 * Validation:
 * - ID: required in params
 * - All fields optional (partial update)
 */
router.put(
  '/transactions/:id',
  validateMultiple({
    params: z.object({ id: idSchema }),
    body: updateTransactionSchema
  }),
  sanitize(['description']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    // Check if transaction exists and belongs to user
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id }
    });

    if (!existingTransaction) {
      throw new NotFoundError('Transaction not found');
    }

    if (existingTransaction.userId !== userId) {
      throw new ForbiddenError('You do not have permission to update this transaction');
    }

    // Update transaction
    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: req.body
    });

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      transaction: updatedTransaction
    });
  })
);

/**
 * Delete transaction
 *
 * DELETE /api/transactions/:id
 * Params: { id }
 */
router.delete(
  '/transactions/:id',
  validate(z.object({ id: idSchema }), 'params'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    // Check ownership
    const transaction = await prisma.transaction.findUnique({
      where: { id }
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    if (transaction.userId !== userId) {
      throw new ForbiddenError('You do not have permission to delete this transaction');
    }

    // Delete transaction
    await prisma.transaction.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  })
);

// ========================================
// AI FEATURE ROUTES
// ========================================

/**
 * Get AI suggestions
 *
 * POST /api/ai/suggestions
 * Body: { category, context, preferences }
 *
 * Validation:
 * - Category: required, max 50 chars
 * - Context: optional, max 1000 chars
 * - Preferences: optional { tone, length }
 */
router.post(
  '/ai/suggestions',
  validate(aiSuggestionSchema),
  sanitize(['context']),
  asyncHandler(async (req, res) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    // Check if user is premium (AI feature restricted)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isPremium: true }
    });

    if (!user.isPremium) {
      throw new ForbiddenError('Premium subscription required for AI features');
    }

    const { category, context, preferences } = req.body;

    // Call AI service (example)
    const suggestions = await aiService.generateSuggestions({
      category,
      context,
      preferences,
      userId
    });

    res.json({
      success: true,
      message: 'Suggestions generated successfully',
      suggestions
    });
  })
);

// ========================================
// ERROR HANDLING EXAMPLES
// ========================================

/**
 * Example: Handling database errors
 *
 * Prisma errors are automatically handled by the centralized error handler.
 * No need for try/catch when using asyncHandler.
 */
router.get(
  '/examples/database-error',
  asyncHandler(async (req, res) => {
    // This will throw Prisma error if user doesn't exist
    // Error handler will catch it and return proper JSON response
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: 'nonexistent-id' }
    });

    res.json({ user });
  })
);

/**
 * Example: Custom business logic errors
 *
 * Use AppError classes to throw semantic errors that will be
 * properly formatted by the centralized error handler.
 */
router.post(
  '/examples/custom-error',
  asyncHandler(async (req, res) => {
    const { action } = req.body;

    if (action === 'throw-error') {
      // Different error types for different situations
      throw new AppError('Custom business logic error', 422, 'BUSINESS_ERROR');
    }

    if (action === 'not-found') {
      throw new NotFoundError('Resource not found');
    }

    if (action === 'forbidden') {
      throw new ForbiddenError('Access denied');
    }

    res.json({
      success: true,
      message: 'Action completed'
    });
  })
);

module.exports = router;
