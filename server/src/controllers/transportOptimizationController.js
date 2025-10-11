/**
 * Transport Optimization Controller
 *
 * HTTP request handlers for transport optimization endpoints
 *
 * Security considerations:
 * - All requests require authentication
 * - Quota enforcement via middleware
 * - Input validation and sanitization
 * - Rate limiting applied
 */

const transportOptimizationService = require('../services/transportOptimizationService');
const logger = require('../utils/logger');
const { getQueueMetrics } = require('../queues/transportOptimizationQueue');
const prisma = require('../lib/prismaClient');

/**
 * Create a new transport optimization job
 * POST /api/transport-optimize
 */
async function createTransportOptimization(req, res) {
  try {
    const userId = req.user.id;
    const {
      origin,
      destination,
      distance,
      modes,
      recurring,
      parkingNeeded,
      tollRoads,
      metadata
    } = req.body;

    // Trip data is validated by middleware, proceed with job creation
    const tripData = {
      origin,
      destination,
      distance,
      modes,
      recurring,
      parkingNeeded,
      tollRoads
    };

    const result = await transportOptimizationService.createTransportOptimizationJob(
      userId,
      tripData,
      metadata
    );

    // Build response
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

    logger.info('Transport optimization created via API', {
      userId,
      jobId: result.jobId,
      duplicate: result.duplicate,
      distance,
      ipAddress: req.ip
    });

    res.status(result.duplicate ? 200 : 202).json(response);

  } catch (error) {
    logger.error('Transport optimization creation failed', {
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
 * Get transport optimization job status
 * GET /api/transport-optimize/:jobId
 */
async function getTransportOptimizationStatus(req, res) {
  try {
    const userId = req.user.id;
    const { jobId } = req.params;

    const result = await transportOptimizationService.getTransportOptimizationJobStatus(
      jobId,
      userId
    );

    logger.info('Transport optimization status retrieved via API', {
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
    logger.error('Transport optimization status retrieval failed', {
      userId: req.user?.id,
      jobId: req.params.jobId,
      error: error.message,
      ipAddress: req.ip
    });

    res.status(error.message.includes('not found') ? 404 : 400).json({
      success: false,
      error: {
        message: error.message,
        code: error.message.includes('not found') ? 'JOB_NOT_FOUND' : 'INVALID_REQUEST'
      }
    });
  }
}

/**
 * Get transport optimization history
 * GET /api/transport-optimize/history
 */
async function getTransportOptimizationHistory(req, res) {
  try {
    const userId = req.user.id;
    const { limit, offset, status } = req.query;

    const options = {
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
      status: status || null
    };

    const result = await transportOptimizationService.getUserTransportOptimizationHistory(
      userId,
      options
    );

    logger.info('Transport optimization history retrieved via API', {
      userId,
      count: result.jobs.length,
      total: result.total,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Transport optimization history retrieval failed', {
      userId: req.user?.id,
      error: error.message,
      ipAddress: req.ip
    });

    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'INVALID_REQUEST'
      }
    });
  }
}

/**
 * Get transport optimization analytics
 * GET /api/transport-optimize/analytics
 */
async function getTransportOptimizationAnalytics(req, res) {
  try {
    const userId = req.user.id;

    const result = await transportOptimizationService.getTransportOptimizationAnalytics(userId);

    logger.info('Transport optimization analytics retrieved via API', {
      userId,
      totalJobs: result.totalJobs,
      totalSavings: result.totalSavingsPotential,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Transport optimization analytics retrieval failed', {
      userId: req.user?.id,
      error: error.message,
      ipAddress: req.ip
    });

    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'INVALID_REQUEST'
      }
    });
  }
}

/**
 * Get transport optimization metrics (admin only)
 * GET /api/transport-optimize/metrics
 */
async function getTransportOptimizationMetrics(req, res) {
  try {
    const userId = req.user.id;

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. Admin privileges required.',
          code: 'FORBIDDEN'
        }
      });
    }

    // Get queue metrics
    const queueMetrics = await getQueueMetrics();

    // Get database metrics
    const [totalJobs, completedJobs, failedJobs, pendingJobs] = await Promise.all([
      prisma.transportOptimizationJob.count(),
      prisma.transportOptimizationJob.count({ where: { status: 'completed' } }),
      prisma.transportOptimizationJob.count({ where: { status: 'failed' } }),
      prisma.transportOptimizationJob.count({ where: { status: 'pending' } })
    ]);

    // Get processing time stats
    const processingStats = await prisma.transportOptimizationResult.aggregate({
      _avg: { processingTimeMs: true },
      _min: { processingTimeMs: true },
      _max: { processingTimeMs: true }
    });

    logger.info('Transport optimization metrics retrieved via API', {
      userId,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      data: {
        queue: queueMetrics,
        database: {
          totalJobs,
          completedJobs,
          failedJobs,
          pendingJobs,
          successRate: totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0
        },
        processing: {
          avgTimeMs: processingStats._avg.processingTimeMs || 0,
          minTimeMs: processingStats._min.processingTimeMs || 0,
          maxTimeMs: processingStats._max.processingTimeMs || 0
        }
      }
    });

  } catch (error) {
    logger.error('Transport optimization metrics retrieval failed', {
      userId: req.user?.id,
      error: error.message,
      ipAddress: req.ip
    });

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve metrics',
        code: 'INTERNAL_ERROR'
      }
    });
  }
}

module.exports = {
  createTransportOptimization,
  getTransportOptimizationStatus,
  getTransportOptimizationHistory,
  getTransportOptimizationAnalytics,
  getTransportOptimizationMetrics
};
