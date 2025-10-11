/**
 * Meal Plan Sharing Controller
 */

const sharingService = require('../services/mealPlanSharingService');
const logger = require('../utils/logger');

/**
 * POST /api/meal-planning/weekly-plans/:planId/share
 * Create share link for a meal plan
 */
async function createShare(req, res) {
  try {
    const userId = req.user.id;
    const { planId } = req.params;
    const { expiresInDays, allowCopy, isPublic } = req.body;

    const sharedPlan = await sharingService.createShareLink(userId, planId, {
      expiresInDays,
      allowCopy,
      isPublic
    });

    // Build share URL
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/shared/meal-plan/${sharedPlan.shareToken}`;

    res.status(201).json({
      success: true,
      data: {
        ...sharedPlan,
        shareUrl
      },
      message: 'Share link created'
    });
  } catch (error) {
    logger.error('Error creating share link', {
      userId: req.user?.id,
      planId: req.params?.planId,
      error: error.message
    });

    const statusCode = error.message.includes('not found') ? 404 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/shared/meal-plan/:token
 * Get shared meal plan (public endpoint, no auth required)
 */
async function getShared(req, res) {
  try {
    const { token } = req.params;

    const sharedPlan = await sharingService.getSharedPlan(token);

    res.status(200).json({
      success: true,
      data: sharedPlan
    });
  } catch (error) {
    logger.error('Error getting shared plan', {
      token: req.params?.token,
      error: error.message
    });

    const statusCode = error.message.includes('not found') || error.message.includes('expired') ? 404 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/shared/meal-plan/:token/copy
 * Copy shared plan to user's account
 */
async function copyShared(req, res) {
  try {
    const userId = req.user.id;
    const { token } = req.params;

    const copiedPlan = await sharingService.copySharedPlan(token, userId);

    res.status(201).json({
      success: true,
      data: copiedPlan,
      message: 'Plan copied to your account'
    });
  } catch (error) {
    logger.error('Error copying shared plan', {
      userId: req.user?.id,
      token: req.params?.token,
      error: error.message
    });

    const statusCode = error.message.includes('not found') || error.message.includes('not allow') ? 404 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * DELETE /api/meal-planning/shares/:token
 * Revoke share link
 */
async function revokeShare(req, res) {
  try {
    const userId = req.user.id;
    const { token } = req.params;

    await sharingService.revokeShareLink(userId, token);

    res.status(200).json({
      success: true,
      message: 'Share link revoked'
    });
  } catch (error) {
    logger.error('Error revoking share link', {
      userId: req.user?.id,
      token: req.params?.token,
      error: error.message
    });

    const statusCode = error.message.includes('not found') ? 404 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/meal-planning/shares
 * Get user's shared plans
 */
async function getUserShares(req, res) {
  try {
    const userId = req.user.id;

    const sharedPlans = await sharingService.getUserSharedPlans(userId);

    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const enrichedPlans = sharedPlans.map(plan => ({
      ...plan,
      shareUrl: `${baseUrl}/shared/meal-plan/${plan.shareToken}`
    }));

    res.status(200).json({
      success: true,
      data: enrichedPlans
    });
  } catch (error) {
    logger.error('Error getting user shares', {
      userId: req.user?.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  createShare,
  getShared,
  copyShared,
  revokeShare,
  getUserShares
};
