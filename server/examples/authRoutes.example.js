/**
 * Example: Authentication Routes with Session and CSRF Protection
 *
 * This file demonstrates how to integrate session management and CSRF protection
 * in authentication routes.
 *
 * Key Features:
 * - Session rotation on login (prevents session fixation)
 * - CSRF token refresh on login/logout
 * - Session destruction on logout
 * - Protected routes requiring session
 * - CSRF protection for state-changing operations
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { prisma } = require('../src/lib/prisma');
const logger = require('../src/utils/logger');

// Session and CSRF middlewares
const {
  rotateSession,
  destroySession,
  requireSession
} = require('../src/middleware/sessionMiddleware');

const {
  csrfProtection,
  csrfExempt,
  refreshCsrfToken
} = require('../src/middleware/csrfProtection');

/**
 * POST /api/auth/register
 *
 * Register new user account
 * - CSRF protected (creates new user = state change)
 * - No session required (public endpoint)
 */
router.post('/register', csrfProtection, async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and name are required'
      });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists'
      });
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
      }
    });

    logger.info('User registered:', { userId: user.id, email: user.email });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

/**
 * POST /api/auth/login
 *
 * Login user and create session
 * - CSRF protected (creates session = state change)
 * - Rotates session ID (prevents session fixation)
 * - Refreshes CSRF token
 */
router.post('/login', csrfProtection, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check account status
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Account is inactive or suspended'
      });
    }

    // SECURITY: Rotate session to prevent session fixation
    await rotateSession(req, {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isPremium: user.isPremium || false
    });

    // SECURITY: Refresh CSRF token after authentication change
    const newCsrfToken = refreshCsrfToken(req, res);

    logger.info('User logged in:', { userId: user.id, email: user.email });

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isPremium: user.isPremium
      },
      csrfToken: newCsrfToken
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

/**
 * POST /api/auth/logout
 *
 * Logout user and destroy session
 * - Requires active session
 * - CSRF protected (destroys session = state change)
 * - Clears session cookie
 */
router.post('/logout', requireSession, csrfProtection, async (req, res) => {
  try {
    const userId = req.session.userId;

    // SECURITY: Destroy session completely
    await destroySession(req, res);

    logger.info('User logged out:', { userId });

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

/**
 * GET /api/auth/me
 *
 * Get current user session
 * - Requires active session
 * - No CSRF required (GET is safe method)
 */
router.get('/me', requireSession, async (req, res) => {
  try {
    // Fetch fresh user data from database
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isPremium: true,
        status: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        ...user,
        sessionCreatedAt: req.session.createdAt,
        sessionLastActivity: req.session.lastActivity
      }
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user data'
    });
  }
});

/**
 * POST /api/auth/change-password
 *
 * Change user password
 * - Requires active session
 * - CSRF protected (modifies user data)
 * - Rotates session after password change
 */
router.post('/change-password', requireSession, csrfProtection, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current and new password are required'
      });
    }

    // Fetch user with password
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId }
    });

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    // SECURITY: Rotate session after password change
    await rotateSession(req, {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isPremium: user.isPremium
    });

    // SECURITY: Refresh CSRF token
    refreshCsrfToken(req, res);

    logger.info('Password changed:', { userId: user.id });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
});

/**
 * DELETE /api/auth/account
 *
 * Delete user account
 * - Requires active session
 * - CSRF protected (deletes user = destructive action)
 * - Destroys session after deletion
 */
router.delete('/account', requireSession, csrfProtection, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password confirmation required'
      });
    }

    // Fetch user
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId }
    });

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Password is incorrect'
      });
    }

    // Delete user (cascade will delete related data)
    await prisma.user.delete({
      where: { id: user.id }
    });

    // Destroy session
    await destroySession(req, res);

    logger.info('Account deleted:', { userId: user.id, email: user.email });

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    logger.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete account'
    });
  }
});

module.exports = router;
