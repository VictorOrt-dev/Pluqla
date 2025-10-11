/**
 * Photo Match Controller
 *
 * HTTP request handlers for photo matching endpoints
 *
 * Security considerations:
 * - All requests require authentication
 * - Quota enforcement via middleware
 * - Input validation and sanitization
 * - Rate limiting applied
 */

const photoMatchService = require('../services/photoMatchService');
const logger = require('../utils/logger');
const { getQueueMetrics } = require('../queues/photoMatchQueue');

/**
 * Create a new photo match job
 * POST /api/ia/photo-match
 */
async function createPhotoMatch(req, res) {
  try {
    const userId = req.user.id;
    const { image, metadata } = req.body;

    // Image is validated by middleware, proceed with job creation
    const result = await photoMatchService.createPhotoMatchJob(userId, image, metadata);

    // Add quota info to response (from middleware)
    const response = {
      success: true,
      data: {
        jobId: result.jobId,
        status: result.status,
        duplicate: result.duplicate,
        estimatedCompletionTime: result.estimatedCompletionTime,
        createdAt: result.createdAt
      }
    };

    // Add quota info if available from middleware
    if (req.aiQuota) {
      response.quota = {
        remaining: req.aiQuota.remaining - req.aiQuota.tokenCost,
        limit: req.aiQuota.quota,
        resetAt: req.aiQuota.resetAt
      };
    }

    logger.info('Photo match created via API', {
      userId,
      jobId: result.jobId,
      duplicate: result.duplicate,
      ipAddress: req.ip
    });

    res.status(result.duplicate ? 200 : 202).json(response);

  } catch (error) {
    logger.error('Photo match creation failed', {
      userId: req.user?.id,
      error: error.message,
      ipAddress: req.ip
    });

    res.status(error.message.includes('quota') ? 429 : 400).json({
      success: false,
      error: {
        message: error.message,
        code: error.message.includes('quota') ? 'QUOTA_EXCEEDED' : 'INVALID_REQUEST'
      }
    });
  }
}

/**
 * Get photo match job status
 * GET /api/ia/photo-match/:jobId
 */
async function getPhotoMatchStatus(req, res) {
  try {
    const userId = req.user.id;
    const { jobId } = req.params;

    const result = await photoMatchService.getPhotoMatchJobStatus(jobId, userId);

    logger.info('Photo match status retrieved via API', {
      userId,
      jobId,
      status: result.status,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Photo match status retrieval failed', {
      userId: req.user?.id,
      jobId: req.params.jobId,
      error: error.message,
      ipAddress: req.ip
    });

    const statusCode = error.message.includes('not found') ? 404 : 500;

    res.status(statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: error.message.includes('not found') ? 'JOB_NOT_FOUND' : 'INTERNAL_ERROR'
      }
    });
  }
}

/**
 * Get photo match history
 * GET /api/ia/photo-match/history
 */
async function getPhotoMatchHistory(req, res) {
  try {
    const userId = req.user.id;
    const { limit, offset, status } = req.query;

    const options = {
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
      status
    };

    const result = await photoMatchService.getUserPhotoMatchHistory(userId, options);

    logger.info('Photo match history retrieved via API', {
      userId,
      count: result.jobs.length,
      total: result.pagination.total,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Photo match history retrieval failed', {
      userId: req.user?.id,
      error: error.message,
      ipAddress: req.ip
    });

    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'INTERNAL_ERROR'
      }
    });
  }
}

/**
 * Get photo match analytics
 * GET /api/ia/photo-match/analytics
 */
async function getPhotoMatchAnalytics(req, res) {
  try {
    const userId = req.user.id;

    const result = await photoMatchService.getPhotoMatchAnalytics(userId);

    logger.info('Photo match analytics retrieved via API', {
      userId,
      totalJobs: result.totalJobs,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Photo match analytics retrieval failed', {
      userId: req.user?.id,
      error: error.message,
      ipAddress: req.ip
    });

    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'INTERNAL_ERROR'
      }
    });
  }
}

/**
 * Get queue metrics (admin only)
 * GET /api/ia/photo-match/metrics
 */
async function getPhotoMatchMetrics(req, res) {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Admin access required',
          code: 'FORBIDDEN'
        }
      });
    }

    const metrics = await getQueueMetrics();

    logger.info('Photo match metrics retrieved via API', {
      userId: req.user.id,
      metrics,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('Photo match metrics retrieval failed', {
      userId: req.user?.id,
      error: error.message,
      ipAddress: req.ip
    });

    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'INTERNAL_ERROR'
      }
    });
  }
}

module.exports = {
  createPhotoMatch,
  getPhotoMatchStatus,
  getPhotoMatchHistory,
  getPhotoMatchAnalytics,
  getPhotoMatchMetrics
};
