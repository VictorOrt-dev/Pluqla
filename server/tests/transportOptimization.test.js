/**
 * Transport Optimization Tests
 *
 * Comprehensive test suite for transport cost optimization feature
 * Tests: service layer, controller, validation, caching, quota enforcement
 */

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prismaClient');
const redis = require('../src/lib/redisClient');
const { generateTripHash } = require('../src/services/transportOptimizationService');
const {
  calculateModeCost,
  calculateAllModeCosts,
  validateTripInput
} = require('../src/services/transportCostCalculator');

// Test user credentials
let authToken;
let userId;

beforeAll(async () => {
  // Create test user and get auth token
  const testUser = {
    email: `test-transport-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Test User'
  };

  const registerRes = await request(app)
    .post('/api/auth/register')
    .send(testUser);

  authToken = registerRes.body.token;
  userId = registerRes.body.user.id;
});

afterAll(async () => {
  // Clean up test data
  await prisma.transportOptimizationResult.deleteMany({ where: { userId } });
  await prisma.transportOptimizationJob.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
  await redis.quit();
  await prisma.$disconnect();
});

describe('Transport Cost Calculator', () => {
  test('should calculate car gasoline cost correctly', () => {
    const result = calculateModeCost('car_gasoline', 10, {
      parkingNeeded: true,
      tollRoads: false
    });

    expect(result).toHaveProperty('mode', 'car_gasoline');
    expect(result.total).toBeGreaterThan(0);
    expect(result.fuel).toBeGreaterThan(0);
    expect(result.parking).toBeGreaterThan(0);
    expect(result.durationMinutes).toBeGreaterThan(0);
  });

  test('should calculate all applicable modes for 10km trip', () => {
    const result = calculateAllModeCosts(10);

    expect(result.modes).toHaveProperty('car_gasoline');
    expect(result.modes).toHaveProperty('bike');
    expect(result.modes).toHaveProperty('public_transport_metro');
    expect(result.optimal.cheapest).toBeDefined();
    expect(result.optimal.fastest).toBeDefined();
    expect(result.optimal.greenest).toBeDefined();
  });

  test('should exclude walk for long distances', () => {
    const result = calculateAllModeCosts(50);

    expect(result.modes).not.toHaveProperty('walk');
  });

  test('should validate trip input correctly', () => {
    const validTrip = {
      origin: 'Paris',
      destination: 'Lyon',
      distance: 450,
      recurring: false
    };

    const validated = validateTripInput(validTrip);
    expect(validated.origin).toBe('Paris');
    expect(validated.distance).toBe(450);
  });

  test('should reject invalid distance', () => {
    const invalidTrip = {
      origin: 'Paris',
      destination: 'Lyon',
      distance: 1500
    };

    expect(() => validateTripInput(invalidTrip)).toThrow();
  });
});

describe('Transport Optimization API', () => {
  test('POST /api/transport-optimize - should create optimization job', async () => {
    const tripData = {
      origin: 'Paris',
      destination: 'Lyon',
      distance: 450,
      recurring: false,
      parkingNeeded: true,
      tollRoads: true
    };

    const res = await request(app)
      .post('/api/transport-optimize')
      .set('Authorization', `Bearer ${authToken}`)
      .send(tripData);

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('jobId');
    expect(res.body.data.status).toBe('pending');
    expect(res.body.quota).toBeDefined();
  }, 10000);

  test('POST /api/transport-optimize - should reject missing origin', async () => {
    const invalidTrip = {
      destination: 'Lyon',
      distance: 450
    };

    const res = await request(app)
      .post('/api/transport-optimize')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidTrip);

    expect(res.status).toBe(400);
  });

  test('POST /api/transport-optimize - should reject invalid distance', async () => {
    const invalidTrip = {
      origin: 'Paris',
      destination: 'Lyon',
      distance: 1500
    };

    const res = await request(app)
      .post('/api/transport-optimize')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidTrip);

    expect(res.status).toBe(400);
  });

  test('POST /api/transport-optimize - should detect duplicate job', async () => {
    const tripData = {
      origin: 'Marseille',
      destination: 'Nice',
      distance: 200,
      recurring: false
    };

    // First request
    const res1 = await request(app)
      .post('/api/transport-optimize')
      .set('Authorization', `Bearer ${authToken}`)
      .send(tripData);

    expect(res1.status).toBe(202);
    const jobId1 = res1.body.data.jobId;

    // Second request (duplicate)
    const res2 = await request(app)
      .post('/api/transport-optimize')
      .set('Authorization', `Bearer ${authToken}`)
      .send(tripData);

    expect(res2.status).toBe(200);
    expect(res2.body.data.duplicate).toBe(true);
    expect(res2.body.data.jobId).toBe(jobId1);
  }, 10000);

  test('GET /api/transport-optimize/:jobId - should get job status', async () => {
    // Create job first
    const tripData = {
      origin: 'Bordeaux',
      destination: 'Toulouse',
      distance: 250
    };

    const createRes = await request(app)
      .post('/api/transport-optimize')
      .set('Authorization', `Bearer ${authToken}`)
      .send(tripData);

    const jobId = createRes.body.data.jobId;

    // Get status
    const res = await request(app)
      .get(`/api/transport-optimize/${jobId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.jobId).toBe(jobId);
  }, 10000);

  test('GET /api/transport-optimize/history - should get user history', async () => {
    const res = await request(app)
      .get('/api/transport-optimize/history')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ limit: 10, offset: 0 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('jobs');
    expect(Array.isArray(res.body.data.jobs)).toBe(true);
  });

  test('GET /api/transport-optimize/analytics - should get user analytics', async () => {
    const res = await request(app)
      .get('/api/transport-optimize/analytics')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('totalJobs');
    expect(res.body.data).toHaveProperty('totalSavingsPotential');
    expect(res.body.data).toHaveProperty('modesDistribution');
  });

  test('POST /api/transport-optimize - should enforce rate limiting', async () => {
    // Make multiple rapid requests to trigger rate limit
    const tripData = {
      origin: 'Test',
      destination: 'Test2',
      distance: 10
    };

    const promises = [];
    for (let i = 0; i < 50; i++) {
      promises.push(
        request(app)
          .post('/api/transport-optimize')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ...tripData, destination: `Test${i}` })
      );
    }

    const results = await Promise.all(promises);
    const rateLimited = results.some(r => r.status === 429);

    expect(rateLimited).toBe(true);
  }, 30000);
});

describe('Trip Hash Generation', () => {
  test('should generate consistent hash for same trip', () => {
    const trip1 = {
      origin: 'Paris',
      destination: 'Lyon',
      distance: 450,
      recurring: false,
      parkingNeeded: true,
      tollRoads: false
    };

    const trip2 = {
      origin: 'paris', // lowercase
      destination: ' Lyon ', // with spaces
      distance: 450.00, // same value
      recurring: false,
      parkingNeeded: true,
      tollRoads: false
    };

    const hash1 = generateTripHash(trip1);
    const hash2 = generateTripHash(trip2);

    expect(hash1).toBe(hash2);
  });

  test('should generate different hash for different trips', () => {
    const trip1 = {
      origin: 'Paris',
      destination: 'Lyon',
      distance: 450
    };

    const trip2 = {
      origin: 'Paris',
      destination: 'Marseille',
      distance: 450
    };

    const hash1 = generateTripHash(trip1);
    const hash2 = generateTripHash(trip2);

    expect(hash1).not.toBe(hash2);
  });
});

describe('Quota Enforcement', () => {
  test('should consume quota tokens on job creation', async () => {
    const tripData = {
      origin: 'QuotaTest1',
      destination: 'QuotaTest2',
      distance: 10
    };

    const res = await request(app)
      .post('/api/transport-optimize')
      .set('Authorization', `Bearer ${authToken}`)
      .send(tripData);

    expect(res.status).toBe(202);
    expect(res.body.quota).toBeDefined();
    expect(res.body.quota.remaining).toBeGreaterThanOrEqual(0);
  }, 10000);
});
