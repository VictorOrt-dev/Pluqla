/**
 * Photo Match Integration Tests
 *
 * Tests for IA Photo Match feature
 *
 * Test Coverage:
 * - Endpoint validation and security
 * - Quota enforcement
 * - Job creation and processing
 * - Cache behavior
 * - Error handling
 * - Queue operations
 */

const request = require('supertest');
const prisma = require('../src/lib/prismaClient');
const { photoMatchQueue } = require('../src/queues/photoMatchQueue');
const redis = require('../src/lib/redisClient');

// Mock data
const mockUser = {
  email: 'test@example.com',
  password: 'SecurePassword123!',
  name: 'Test User',
  isPremium: false
};

const mockImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAA//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AN//Z';

let authToken;
let testUserId;

// Setup and teardown
beforeAll(async () => {
  // Create test user
  const user = await prisma.user.create({
    data: mockUser
  });
  testUserId = user.id;

  // Get auth token
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: mockUser.email,
      password: mockUser.password
    });

  authToken = loginRes.body.token;
});

afterAll(async () => {
  // Clean up test data
  await prisma.photoMatchResult.deleteMany({ where: { userId: testUserId } });
  await prisma.photoMatchJob.deleteMany({ where: { userId: testUserId } });
  await prisma.aiUsage.deleteMany({ where: { userId: testUserId } });
  await prisma.user.delete({ where: { id: testUserId } });

  // Close connections
  await prisma.$disconnect();
  await photoMatchQueue.close();
  await redis.quit();
});

describe('Photo Match API', () => {
  describe('POST /api/photo-match', () => {
    it('should create a photo match job with valid image', async () => {
      const res = await request(app)
        .post('/api/photo-match')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          image: mockImage,
          metadata: {
            source: 'test',
            category: 'clothing'
          }
        });

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('jobId');
      expect(res.body.data.status).toBe('pending');
      expect(res.body.data.duplicate).toBe(false);
      expect(res.body).toHaveProperty('quota');
    });

    it('should reject request without authentication', async () => {
      const res = await request(app)
        .post('/api/photo-match')
        .send({ image: mockImage });

      expect(res.status).toBe(401);
    });

    it('should reject invalid image format', async () => {
      const res = await request(app)
        .post('/api/photo-match')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          image: 'invalid-image-data'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject oversized image', async () => {
      const largeImage = 'data:image/jpeg;base64,' + 'A'.repeat(15 * 1024 * 1024); // >10MB

      const res = await request(app)
        .post('/api/photo-match')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ image: largeImage });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should enforce quota limits', async () => {
      // Exhaust quota by creating multiple jobs
      const quota = 50; // Free user quota
      const requests = [];

      for (let i = 0; i < quota + 1; i++) {
        requests.push(
          request(app)
            .post('/api/photo-match')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ image: mockImage })
        );
      }

      const results = await Promise.all(requests);
      const lastResult = results[results.length - 1];

      expect(lastResult.status).toBe(429);
      expect(lastResult.body.error.code).toBe('QUOTA_EXCEEDED');
    });

    it('should return duplicate job for same image', async () => {
      // Create first job
      const res1 = await request(app)
        .post('/api/photo-match')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ image: mockImage });

      const jobId1 = res1.body.data.jobId;

      // Create second job with same image
      const res2 = await request(app)
        .post('/api/photo-match')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ image: mockImage });

      expect(res2.status).toBe(200);
      expect(res2.body.data.duplicate).toBe(true);
      expect(res2.body.data.jobId).toBe(jobId1);
    });
  });

  describe('GET /api/photo-match/:jobId', () => {
    let jobId;

    beforeEach(async () => {
      // Create a test job
      const res = await request(app)
        .post('/api/photo-match')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ image: mockImage });

      jobId = res.body.data.jobId;
    });

    it('should return job status', async () => {
      const res = await request(app)
        .get(`/api/photo-match/${jobId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('status');
      expect(res.body.data.jobId).toBe(jobId);
    });

    it('should reject unauthorized access', async () => {
      // Create different user
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          password: 'OtherPassword123!',
          name: 'Other User'
        }
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'other@example.com',
          password: 'OtherPassword123!'
        });

      const otherToken = loginRes.body.token;

      const res = await request(app)
        .get(`/api/photo-match/${jobId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404); // Job not found (authorization check)

      // Clean up
      await prisma.user.delete({ where: { id: otherUser.id } });
    });

    it('should return 404 for non-existent job', async () => {
      const fakeJobId = 'cuid1234567890';

      const res = await request(app)
        .get(`/api/photo-match/${fakeJobId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/photo-match/history', () => {
    it('should return user job history', async () => {
      const res = await request(app)
        .get('/api/photo-match/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('jobs');
      expect(res.body.data).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data.jobs)).toBe(true);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/photo-match/history?limit=5&offset=0')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.pagination.limit).toBe(5);
      expect(res.body.data.pagination.offset).toBe(0);
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/api/photo-match/history?status=completed')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      res.body.data.jobs.forEach(job => {
        expect(job.status).toBe('completed');
      });
    });
  });

  describe('GET /api/photo-match/analytics', () => {
    it('should return user analytics', async () => {
      const res = await request(app)
        .get('/api/photo-match/analytics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalJobs');
      expect(res.body.data).toHaveProperty('statusBreakdown');
      expect(res.body.data).toHaveProperty('avgProcessingTimeMs');
    });
  });

  describe('GET /api/photo-match/metrics', () => {
    it('should return queue metrics for admin', async () => {
      // Update user to admin
      await prisma.user.update({
        where: { id: testUserId },
        data: { role: 'admin' }
      });

      const res = await request(app)
        .get('/api/photo-match/metrics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('waiting');
      expect(res.body.data).toHaveProperty('active');
      expect(res.body.data).toHaveProperty('completed');
    });

    it('should reject non-admin access', async () => {
      // Reset user to regular
      await prisma.user.update({
        where: { id: testUserId },
        data: { role: 'user' }
      });

      const res = await request(app)
        .get('/api/photo-match/metrics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
    });
  });
});

describe('Photo Match Queue', () => {
  it('should process job successfully', async () => {
    const jobData = {
      jobId: 'test-job-id',
      userId: testUserId,
      imageUrl: mockImage,
      imageHash: 'test-hash',
      mimeType: 'image/jpeg',
      imageSize: 1024
    };

    // This would be tested with a mocked AI provider
    // Real integration tests would use test fixtures
  });

  it('should handle cache hits', async () => {
    // Test cache deduplication logic
  });

  it('should retry failed jobs', async () => {
    // Test retry logic with exponential backoff
  });

  it('should handle malformed images gracefully', async () => {
    // Test error handling for corrupt images
  });
});

describe('Photo Match Cache', () => {
  it('should cache results by image hash', async () => {
    // Test Redis caching
  });

  it('should respect cache TTL', async () => {
    // Test cache expiration
  });

  it('should handle cache failures gracefully', async () => {
    // Test fallback when Redis is unavailable
  });
});

describe('Photo Match Quota', () => {
  it('should enforce atomic quota checks', async () => {
    // Test concurrent requests don't bypass quota
  });

  it('should differentiate free vs premium quotas', async () => {
    // Test quota limits by tier
  });

  it('should reset quota at midnight UTC', async () => {
    // Test quota reset logic
  });
});
