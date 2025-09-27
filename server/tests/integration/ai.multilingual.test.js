const request = require('supertest');
const app = require('../../src/app');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

describe('AI Multilingual Integration Tests', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Créer un utilisateur de test
    testUser = await prisma.user.create({
      data: {
        email: 'test-multilingual@test.com',
        password: '$2a$10$hashedpassword',
        name: 'Test User',
        isPremium: false,
        plansUsedThisMonth: 0
      }
    });

    // Générer un token JWT
    authToken = jwt.sign(
      { id: testUser.id, email: testUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Nettoyer les données de test
    await prisma.user.delete({
      where: { id: testUser.id }
    });
    await prisma.$disconnect();
  });

  describe('GET /api/ai/suggestions with language parameter', () => {
    it('should return suggestions in French when lang=fr', async () => {
      const response = await request(app)
        .get('/api/ai/suggestions?category=alimentation&lang=fr')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.suggestions).toBeInstanceOf(Array);
      expect(response.body.data.suggestions.length).toBeGreaterThan(0);

      // Vérifier que les suggestions sont en français
      const suggestion = response.body.data.suggestions[0];
      expect(suggestion.title).toBeDefined();
      expect(suggestion.description).toBeDefined();
      expect(suggestion.difficulty).toMatch(/facile|moyen|difficile/);
    });

    it('should return suggestions in English when lang=en', async () => {
      const response = await request(app)
        .get('/api/ai/suggestions?category=alimentation&lang=en')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.suggestions).toBeInstanceOf(Array);
      expect(response.body.data.suggestions.length).toBeGreaterThan(0);

      // Vérifier que les suggestions sont en anglais
      const suggestion = response.body.data.suggestions[0];
      expect(suggestion.title).toBeDefined();
      expect(suggestion.description).toBeDefined();
      expect(suggestion.difficulty).toMatch(/easy|medium|hard/);
    });

    it('should return suggestions in Spanish when lang=es', async () => {
      const response = await request(app)
        .get('/api/ai/suggestions?category=alimentation&lang=es')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.suggestions).toBeInstanceOf(Array);
      expect(response.body.data.suggestions.length).toBeGreaterThan(0);

      // Vérifier que les suggestions sont en espagnol
      const suggestion = response.body.data.suggestions[0];
      expect(suggestion.title).toBeDefined();
      expect(suggestion.description).toBeDefined();
      expect(suggestion.difficulty).toMatch(/fácil|medio|difícil/);
    });

    it('should default to French when no language is specified', async () => {
      const response = await request(app)
        .get('/api/ai/suggestions?category=alimentation')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.suggestions).toBeInstanceOf(Array);

      // Devrait être en français par défaut
      const suggestion = response.body.data.suggestions[0];
      expect(suggestion.difficulty).toMatch(/facile|moyen|difficile/);
    });

    it('should return error for unsupported language', async () => {
      const response = await request(app)
        .get('/api/ai/suggestions?category=alimentation&lang=de')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Langue non supportée');
    });

    it('should normalize language codes (en-US to en)', async () => {
      const response = await request(app)
        .get('/api/ai/suggestions?category=alimentation&lang=en-US')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Devrait fonctionner et retourner des suggestions en anglais
      const suggestion = response.body.data.suggestions[0];
      expect(suggestion.difficulty).toMatch(/easy|medium|hard/);
    });
  });

  describe('All categories with different languages', () => {
    const categories = ['alimentation', 'habits', 'activite', 'deplacement'];
    const languages = ['fr', 'en', 'es'];

    categories.forEach(category => {
      languages.forEach(lang => {
        it(`should return ${category} suggestions in ${lang}`, async () => {
          const response = await request(app)
            .get(`/api/ai/suggestions?category=${category}&lang=${lang}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data.suggestions).toBeInstanceOf(Array);
          expect(response.body.data.category).toBe(category);

          if (response.body.data.suggestions.length > 0) {
            const suggestion = response.body.data.suggestions[0];
            expect(suggestion.category).toBe(category);
            expect(suggestion.title).toBeDefined();
            expect(suggestion.description).toBeDefined();
          }
        });
      });
    });
  });

  describe('Cache behavior with different languages', () => {
    it('should cache suggestions separately for each language', async () => {
      // Première requête en français
      const responseFr = await request(app)
        .get('/api/ai/suggestions?category=alimentation&lang=fr')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Première requête en anglais
      const responseEn = await request(app)
        .get('/api/ai/suggestions?category=alimentation&lang=en')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Les suggestions devraient être différentes
      if (responseFr.body.data.suggestions.length > 0 && responseEn.body.data.suggestions.length > 0) {
        const frSuggestion = responseFr.body.data.suggestions[0];
        const enSuggestion = responseEn.body.data.suggestions[0];

        expect(frSuggestion.difficulty).toMatch(/facile|moyen|difficile/);
        expect(enSuggestion.difficulty).toMatch(/easy|medium|hard/);
      }
    });
  });
});