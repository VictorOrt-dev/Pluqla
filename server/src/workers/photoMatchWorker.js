/**
 * Photo Match Worker
 *
 * Background worker that processes photo match jobs from Bull queue
 * Uses AI providers (OpenAI Vision, Anthropic Claude, etc.) for image analysis
 *
 * Security considerations:
 * - Validates image content before processing
 * - Sanitizes AI responses
 * - Implements timeout and retry logic
 * - Stores results securely in DB and Redis cache
 * - Logs all processing steps for audit trail
 */

const { photoMatchQueue } = require('../queues/photoMatchQueue');
const prisma = require('../lib/prismaClient');
const redis = require('../lib/redisClient');
const logger = require('../utils/logger');
const crypto = require('crypto');
const sharp = require('sharp');
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');

// AI Provider configuration
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Cache configuration
const CACHE_TTL = 3600 * 24 * 7; // 7 days
const CACHE_KEY_PREFIX = 'photo-match:';

// Processing configuration
const MAX_IMAGE_DIMENSION = 2048; // Resize large images
const SUPPORTED_FORMATS = ['jpeg', 'png', 'webp'];

/**
 * Process photo match job
 * @param {Object} job - Bull job object
 * @returns {Promise<Object>} Processing result
 */
async function processPhotoMatchJob(job) {
  const startTime = Date.now();
  const { jobId, userId, imageUrl, imageHash, mimeType } = job.data;

  logger.info('Processing photo match job', {
    jobId,
    userId,
    imageHash,
    attempt: job.attemptsMade + 1
  });

  try {
    // 1. Update job status to 'processing' in DB
    await prisma.photoMatchJob.update({
      where: { id: jobId },
      data: {
        status: 'processing',
        processingStartedAt: new Date()
      }
    });

    // 2. Check cache first (deduplication by image hash)
    const cachedResult = await checkCache(imageHash);
    if (cachedResult) {
      logger.info('Cache hit for photo match', {
        jobId,
        imageHash,
        cacheHit: true
      });

      // Store cached result for this user
      await storeCachedResult(jobId, userId, cachedResult);
      return { success: true, cached: true, result: cachedResult };
    }

    // 3. Download and validate image
    job.progress(20);
    const imageBuffer = await downloadAndValidateImage(imageUrl, mimeType);

    // 4. Preprocess image (resize, optimize)
    job.progress(40);
    const processedImage = await preprocessImage(imageBuffer);

    // 5. Send to AI for analysis
    job.progress(60);
    const aiResult = await analyzeImageWithAI(processedImage, userId);

    // 6. Post-process and validate AI response
    job.progress(80);
    const matchResult = await processAIResponse(aiResult);

    // 7. Store result in DB
    const cacheKey = `${CACHE_KEY_PREFIX}${imageHash}`;
    const cachedUntil = new Date(Date.now() + CACHE_TTL * 1000);
    const processingTimeMs = Date.now() - startTime;

    await prisma.photoMatchResult.create({
      data: {
        jobId,
        userId,
        matchType: matchResult.matchType,
        matchScore: matchResult.matchScore,
        matchData: JSON.stringify(matchResult.data),
        aiProvider: aiResult.provider,
        tokensUsed: aiResult.tokensUsed,
        processingTimeMs,
        cacheKey,
        cachedUntil
      }
    });

    // 8. Cache the result
    await cacheResult(imageHash, matchResult, CACHE_TTL);

    // 9. Update job status to 'completed'
    await prisma.photoMatchJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        processingCompletedAt: new Date()
      }
    });

    job.progress(100);

    logger.info('Photo match job completed successfully', {
      jobId,
      userId,
      processingTimeMs,
      matchScore: matchResult.matchScore,
      matchType: matchResult.matchType,
      aiProvider: aiResult.provider
    });

    return {
      success: true,
      cached: false,
      result: matchResult,
      processingTimeMs
    };

  } catch (error) {
    logger.error('Photo match job processing failed', {
      jobId,
      userId,
      error: error.message,
      stack: error.stack,
      attempt: job.attemptsMade + 1
    });

    // Update job status to 'failed' in DB
    await prisma.photoMatchJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errorMessage: sanitizeErrorMessage(error.message),
        processingCompletedAt: new Date(),
        retryCount: job.attemptsMade + 1
      }
    }).catch(err => {
      logger.error('Failed to update job status', {
        jobId,
        error: err.message
      });
    });

    throw error; // Rethrow for Bull to handle retries
  }
}

/**
 * Check cache for existing result
 * @param {string} imageHash - Image hash
 * @returns {Promise<Object|null>} Cached result or null
 */
async function checkCache(imageHash) {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${imageHash}`;
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      return JSON.parse(cachedData);
    }

    return null;
  } catch (error) {
    logger.warn('Cache check failed', {
      imageHash,
      error: error.message
    });
    return null; // Don't fail on cache errors
  }
}

/**
 * Store cached result for new user
 * @param {string} jobId - Job ID
 * @param {string} userId - User ID
 * @param {Object} cachedResult - Cached result data
 */
async function storeCachedResult(jobId, userId, cachedResult) {
  const cacheKey = `${CACHE_KEY_PREFIX}${crypto.randomBytes(16).toString('hex')}`;
  const cachedUntil = new Date(Date.now() + CACHE_TTL * 1000);

  await prisma.photoMatchResult.create({
    data: {
      jobId,
      userId,
      matchType: cachedResult.matchType,
      matchScore: cachedResult.matchScore,
      matchData: JSON.stringify(cachedResult.data),
      aiProvider: 'cached',
      tokensUsed: 0,
      processingTimeMs: 0,
      cacheKey,
      cachedUntil
    }
  });

  await prisma.photoMatchJob.update({
    where: { id: jobId },
    data: {
      status: 'completed',
      processingCompletedAt: new Date()
    }
  });
}

/**
 * Download and validate image
 * @param {string} imageUrl - Image URL or base64
 * @param {string} mimeType - Expected MIME type
 * @returns {Promise<Buffer>} Image buffer
 */
async function downloadAndValidateImage(imageUrl, mimeType) {
  try {
    let imageBuffer;

    // Handle base64 images
    if (imageUrl.startsWith('data:image')) {
      const base64Data = imageUrl.split(',')[1];
      imageBuffer = Buffer.from(base64Data, 'base64');
    }
    // Handle URLs (S3, CDN, etc.)
    else {
      const axios = require('axios');
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000, // 30s timeout
        maxContentLength: 10 * 1024 * 1024 // 10MB max
      });
      imageBuffer = Buffer.from(response.data);
    }

    // Validate image using sharp
    const metadata = await sharp(imageBuffer).metadata();

    // Security: Validate format
    if (!SUPPORTED_FORMATS.includes(metadata.format)) {
      throw new Error(`Unsupported image format: ${metadata.format}`);
    }

    // Security: Validate dimensions (prevent decompression bombs)
    const MAX_PIXELS = 25_000_000; // 25MP
    if (metadata.width * metadata.height > MAX_PIXELS) {
      throw new Error(`Image too large: ${metadata.width}x${metadata.height} pixels`);
    }

    logger.info('Image validated', {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      size: imageBuffer.length
    });

    return imageBuffer;
  } catch (error) {
    logger.error('Image validation failed', {
      error: error.message
    });
    throw new Error(`Image validation failed: ${error.message}`);
  }
}

/**
 * Preprocess image (resize, optimize)
 * @param {Buffer} imageBuffer - Raw image buffer
 * @returns {Promise<Buffer>} Processed image buffer
 */
async function preprocessImage(imageBuffer) {
  try {
    const processedBuffer = await sharp(imageBuffer)
      .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();

    logger.info('Image preprocessed', {
      originalSize: imageBuffer.length,
      processedSize: processedBuffer.length,
      compressionRatio: (processedBuffer.length / imageBuffer.length).toFixed(2)
    });

    return processedBuffer;
  } catch (error) {
    logger.error('Image preprocessing failed', {
      error: error.message
    });
    throw error;
  }
}

/**
 * Generate mock photo analysis for testing
 * @returns {Object} Mock analysis result
 */
function generateMockPhotoAnalysis() {
  const mockItems = [
    { type: 'shirt', color: 'blue', style: 'casual' },
    { type: 'jeans', color: 'denim', style: 'casual' },
    { type: 'sneakers', color: 'white', style: 'sporty' }
  ];

  const mockColors = ['#1E3A8A', '#DBEAFE', '#FFFFFF'];
  const mockRecommendations = [
    'white t-shirt',
    'navy jacket',
    'canvas shoes',
    'casual watch'
  ];

  return {
    provider: 'mock',
    tokensUsed: 0,
    data: {
      items: mockItems,
      styleCategory: 'casual',
      colorPalette: mockColors,
      recommendations: mockRecommendations,
      confidenceScore: 85
    }
  };
}

/**
 * Analyze image with AI
 * @param {Buffer} imageBuffer - Processed image buffer
 * @param {string} userId - User ID (for provider selection)
 * @returns {Promise<Object>} AI analysis result
 */
async function analyzeImageWithAI(imageBuffer, userId) {
  try {
    // Check if mock mode is enabled
    const aiProvider = (process.env.AI_PROVIDER || 'anthropic').toLowerCase();

    if (aiProvider === 'mock') {
      logger.info('Using MOCK provider for photo match analysis', { userId });
      return generateMockPhotoAnalysis();
    }

    // Use Anthropic Claude for image analysis (preferred for accuracy)
    const base64Image = imageBuffer.toString('base64');

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: base64Image
            }
          },
          {
            type: 'text',
            text: `Analyze this image for fashion/clothing items. Provide:
1. Main clothing items identified (type, color, style)
2. Style category (casual, formal, sporty, etc.)
3. Color palette (dominant colors)
4. Recommended similar items or matching pieces
5. Overall style confidence score (0-100)

Return results as JSON with this structure:
{
  "items": [{"type": "shirt", "color": "blue", "style": "casual"}],
  "styleCategory": "casual",
  "colorPalette": ["#1E3A8A", "#FFFFFF"],
  "recommendations": ["white sneakers", "blue jeans"],
  "confidenceScore": 85
}`
          }
        ]
      }]
    });

    // Extract JSON from response
    const content = response.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const analysisData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    // Calculate token usage (approximate)
    const tokensUsed = response.usage?.input_tokens + response.usage?.output_tokens || 0;

    logger.info('AI analysis completed', {
      userId,
      provider: 'anthropic',
      tokensUsed,
      confidenceScore: analysisData.confidenceScore
    });

    return {
      provider: 'anthropic',
      tokensUsed,
      data: analysisData
    };

  } catch (error) {
    logger.error('AI analysis failed', {
      error: error.message,
      userId
    });
    throw new Error(`AI analysis failed: ${error.message}`);
  }
}

/**
 * Process and validate AI response
 * @param {Object} aiResult - Raw AI result
 * @returns {Promise<Object>} Processed match result
 */
async function processAIResponse(aiResult) {
  const { data } = aiResult;

  // Validate and sanitize response
  const matchResult = {
    matchType: 'clothing_analysis',
    matchScore: Math.min(100, Math.max(0, data.confidenceScore || 0)),
    data: {
      items: Array.isArray(data.items) ? data.items : [],
      styleCategory: data.styleCategory || 'unknown',
      colorPalette: Array.isArray(data.colorPalette) ? data.colorPalette : [],
      recommendations: Array.isArray(data.recommendations) ? data.recommendations.slice(0, 10) : [], // Limit to 10
      metadata: {
        analysisVersion: '1.0',
        timestamp: new Date().toISOString()
      }
    }
  };

  return matchResult;
}

/**
 * Cache result in Redis
 * @param {string} imageHash - Image hash
 * @param {Object} result - Match result
 * @param {number} ttl - TTL in seconds
 */
async function cacheResult(imageHash, result, ttl) {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${imageHash}`;
    await redis.setex(cacheKey, ttl, JSON.stringify(result));

    logger.info('Result cached', {
      imageHash,
      cacheKey,
      ttl
    });
  } catch (error) {
    logger.warn('Failed to cache result', {
      imageHash,
      error: error.message
    });
    // Don't throw - caching is optional
  }
}

/**
 * Sanitize error messages (remove sensitive info)
 * @param {string} message - Error message
 * @returns {string} Sanitized message
 */
function sanitizeErrorMessage(message) {
  // Remove file paths, API keys, tokens
  return message
    .replace(/\/[\w\/\-\.]+/g, '[PATH]')
    .replace(/sk-[a-zA-Z0-9]+/g, '[API_KEY]')
    .replace(/Bearer\s+[^\s]+/g, '[TOKEN]');
}

// Start worker processing
photoMatchQueue.process(1, processPhotoMatchJob); // Process 1 job at a time

logger.info('Photo match worker started', {
  concurrency: 1,
  queueName: 'photo-match-jobs'
});

module.exports = {
  processPhotoMatchJob
};
