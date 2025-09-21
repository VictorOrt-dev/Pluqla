const request = require('supertest');
const app = require('../src/app');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('Authentication Routes', () => {
  let testUser;

  beforeEach(async () => {
    // Créer un utilisateur de test pour les tests de connexion
    testUser = await global.testUtils.createTestUser();
  });

  afterEach(async () => {
    // Nettoyer après chaque test
    if (testUser) {
      await global.testUtils.cleanupUser(testUser.id);
    }
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'NewPassword123',
        name: 'New User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.name).toBe(userData.name);
      expect(response.body.user).not.toHaveProperty('password');

      // Nettoyer l'utilisateur créé
      const createdUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });
      if (createdUser) {
        await global.testUtils.cleanupUser(createdUser.id);
      }
    });

    it('should not register user with existing email', async () => {
      const userData = {
        email: testUser.email,
        password: 'AnotherPassword123',
        name: 'Another User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Email déjà utilisé');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: '123', // Trop court
          name: ''
        })
        .expect(400);

      expect(response.body).toHaveProperty('details');
      expect(response.body.details).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: global.testData.validUser.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should not login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: global.testData.validUser.password
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should not login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      const token = global.testUtils.generateTestToken(testUser.id);

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Protected routes authentication', () => {
    it('should require authentication for protected routes', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should accept valid token for protected routes', async () => {
      const token = global.testUtils.generateTestToken(testUser.id);

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});