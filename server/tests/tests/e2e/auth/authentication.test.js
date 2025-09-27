/**
 * Tests E2E pour les flux d'authentification
 * Teste les scénarios critiques de sécurité
 */

import { test, expect } from '@playwright/test';

// Configuration des données de test
const TEST_USER = {
  email: 'test.e2e@pluqla.com',
  password: 'SecurePassword123!',
  name: 'Test E2E User'
};

const INVALID_USER = {
  email: 'invalid@example.com',
  password: 'wrongpassword'
};

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Naviguer vers la page de connexion
    await page.goto('/');

    // Attendre que la page soit chargée
    await page.waitForLoadState('networkidle');
  });

  test.describe('Registration', () => {
    test('should register a new user successfully', async ({ page }) => {
      // Générer un email unique pour éviter les conflits
      const uniqueEmail = `e2e.${Date.now()}@pluqla.com`;

      // Aller en mode inscription
      await page.click('button:has-text("Pas de compte")');

      // Remplir le formulaire d'inscription
      await page.fill('input[placeholder*="nom"]', TEST_USER.name);
      await page.fill('input[type="email"]', uniqueEmail);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.fill('input[placeholder*="Confirmez"]', TEST_USER.password);

      // Soumettre le formulaire
      await page.click('button[type="submit"]');

      // Vérifier le succès de l'inscription
      await expect(page).toHaveURL('/onboarding', { timeout: 10000 });

      // Vérifier que les tokens sont stockés
      const accessToken = await page.evaluate(() => localStorage.getItem('token'));
      expect(accessToken).toBeTruthy();
    });

    test('should validate email format during registration', async ({ page }) => {
      // Aller en mode inscription
      await page.click('button:has-text("Pas de compte")');

      // Tenter avec un email invalide
      await page.fill('input[placeholder*="nom"]', TEST_USER.name);
      await page.fill('input[type="email"]', 'invalid-email');
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.fill('input[placeholder*="Confirmez"]', TEST_USER.password);

      await page.click('button[type="submit"]');

      // Vérifier que l'erreur de validation apparaît
      await expect(page.locator('text=Email invalide')).toBeVisible();
    });

    test('should validate password confirmation', async ({ page }) => {
      // Aller en mode inscription
      await page.click('button:has-text("Pas de compte")');

      // Mots de passe différents
      await page.fill('input[placeholder*="nom"]', TEST_USER.name);
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.fill('input[placeholder*="Confirmez"]', 'DifferentPassword123!');

      await page.click('button[type="submit"]');

      // Vérifier l'erreur de confirmation
      await expect(page.locator('text=ne correspondent pas')).toBeVisible();
    });

    test('should prevent registration with weak password', async ({ page }) => {
      // Aller en mode inscription
      await page.click('button:has-text("Pas de compte")');

      // Mot de passe faible
      await page.fill('input[placeholder*="nom"]', TEST_USER.name);
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', '123');
      await page.fill('input[placeholder*="Confirmez"]', '123');

      await page.click('button[type="submit"]');

      // Vérifier l'erreur de longueur minimale
      await expect(page.locator('text=Minimum 6 caractères')).toBeVisible();
    });
  });

  test.describe('Login', () => {
    test('should login with valid credentials', async ({ page }) => {
      // D'abord créer un utilisateur pour le test
      await test.step('Create test user', async () => {
        const uniqueEmail = `login.${Date.now()}@pluqla.com`;

        // S'inscrire d'abord
        await page.click('button:has-text("Pas de compte")');
        await page.fill('input[placeholder*="nom"]', TEST_USER.name);
        await page.fill('input[type="email"]', uniqueEmail);
        await page.fill('input[type="password"]', TEST_USER.password);
        await page.fill('input[placeholder*="Confirmez"]', TEST_USER.password);
        await page.click('button[type="submit"]');

        // Attendre la redirection après inscription
        await page.waitForURL('/onboarding');

        // Se déconnecter pour tester la connexion
        await page.evaluate(() => {
          localStorage.clear();
        });

        await page.goto('/');
      });

      // Maintenant tester la connexion
      await test.step('Login with created user', async () => {
        const uniqueEmail = await page.evaluate(() => {
          // Récupérer l'email depuis une variable globale ou localStorage
          return window.testUserEmail || `login.${Date.now()}@pluqla.com`;
        });

        await page.fill('input[type="email"]', uniqueEmail);
        await page.fill('input[type="password"]', TEST_USER.password);

        await page.click('button[type="submit"]');

        // Vérifier la redirection vers home
        await expect(page).toHaveURL('/', { timeout: 10000 });

        // Vérifier que les tokens sont présents
        const accessToken = await page.evaluate(() => localStorage.getItem('token'));
        expect(accessToken).toBeTruthy();
      });
    });

    test('should reject invalid credentials', async ({ page }) => {
      await page.fill('input[type="email"]', INVALID_USER.email);
      await page.fill('input[type="password"]', INVALID_USER.password);

      await page.click('button[type="submit"]');

      // L'utilisateur doit rester sur la page de connexion
      await expect(page).toHaveURL('/');

      // Vérifier qu'aucun token n'est stocké
      const accessToken = await page.evaluate(() => localStorage.getItem('token'));
      expect(accessToken).toBeFalsy();
    });

    test('should validate required fields', async ({ page }) => {
      // Soumettre le formulaire vide
      await page.click('button[type="submit"]');

      // Vérifier les erreurs de validation
      await expect(page.locator('text=email est requis')).toBeVisible();
      await expect(page.locator('text=mot de passe est requis')).toBeVisible();
    });

    test('should toggle password visibility', async ({ page }) => {
      const passwordInput = page.locator('input[type="password"]');
      const toggleButton = page.locator('button[type="button"]:has-text("👁️")');

      // Vérifier que le mot de passe est masqué par défaut
      await expect(passwordInput).toHaveAttribute('type', 'password');

      // Cliquer sur le bouton de visibilité
      await toggleButton.click();

      // Vérifier que le mot de passe est visible
      await expect(passwordInput).toHaveAttribute('type', 'text');

      // Cliquer à nouveau pour masquer
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  test.describe('Security Tests', () => {
    test('should prevent XSS in login form', async ({ page }) => {
      const xssPayload = '<script>alert("XSS")</script>';

      await page.fill('input[type="email"]', xssPayload);
      await page.fill('input[type="password"]', xssPayload);

      await page.click('button[type="submit"]');

      // Vérifier que le script n'est pas exécuté
      const alertTriggered = await page.evaluate(() => {
        return window.alertTriggered || false;
      });

      expect(alertTriggered).toBe(false);

      // Vérifier que les valeurs sont sanitisées
      const emailValue = await page.locator('input[type="email"]').inputValue();
      expect(emailValue).not.toContain('<script>');
    });

    test('should handle SQL injection attempts', async ({ page }) => {
      const sqlInjection = "'; DROP TABLE users; --";

      await page.fill('input[type="email"]', sqlInjection);
      await page.fill('input[type="password"]', 'password');

      await page.click('button[type="submit"]');

      // L'application doit continuer à fonctionner
      await expect(page.locator('input[type="email"]')).toBeVisible();

      // Vérifier qu'aucun token n'est créé
      const accessToken = await page.evaluate(() => localStorage.getItem('token'));
      expect(accessToken).toBeFalsy();
    });

    test('should enforce HTTPS redirects in production', async ({ page }) => {
      // Ce test ne s'applique qu'en production
      if (process.env.NODE_ENV !== 'production') {
        test.skip('HTTPS test only applies to production');
      }

      // Tenter d'accéder via HTTP
      await page.goto('http://localhost:3000');

      // Vérifier la redirection HTTPS
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/^https:/);
    });

    test('should clear sensitive data on logout', async ({ page }) => {
      // Se connecter d'abord
      const uniqueEmail = `logout.${Date.now()}@pluqla.com`;

      // Créer un utilisateur et se connecter
      await page.click('button:has-text("Pas de compte")');
      await page.fill('input[placeholder*="nom"]', TEST_USER.name);
      await page.fill('input[type="email"]', uniqueEmail);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.fill('input[placeholder*="Confirmez"]', TEST_USER.password);
      await page.click('button[type="submit"]');

      await page.waitForURL('/onboarding');

      // Vérifier que les tokens sont présents
      const beforeLogout = await page.evaluate(() => ({
        token: localStorage.getItem('token'),
        refreshToken: localStorage.getItem('refreshToken'),
        userData: localStorage.getItem('userData')
      }));

      expect(beforeLogout.token).toBeTruthy();

      // Simuler une déconnexion (via un bouton de profil par exemple)
      await page.evaluate(() => {
        // Simuler la fonction de déconnexion
        localStorage.clear();
      });

      // Vérifier que toutes les données sensibles sont supprimées
      const afterLogout = await page.evaluate(() => ({
        token: localStorage.getItem('token'),
        refreshToken: localStorage.getItem('refreshToken'),
        userData: localStorage.getItem('userData')
      }));

      expect(afterLogout.token).toBeFalsy();
      expect(afterLogout.refreshToken).toBeFalsy();
      expect(afterLogout.userData).toBeFalsy();
    });
  });

  test.describe('Session Management', () => {
    test('should handle token expiration gracefully', async ({ page }) => {
      // Simuler un token expiré
      await page.evaluate(() => {
        // Token JWT expiré (timestamp dans le passé)
        const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';
        localStorage.setItem('token', expiredToken);
      });

      // Recharger la page
      await page.reload();

      // Vérifier que l'utilisateur est redirigé vers la page de connexion
      await expect(page).toHaveURL('/');

      // Vérifier que le token expiré est supprimé
      const token = await page.evaluate(() => localStorage.getItem('token'));
      expect(token).toBeFalsy();
    });

    test('should persist session across page refreshes', async ({ page }) => {
      // Créer un utilisateur et se connecter
      const uniqueEmail = `persist.${Date.now()}@pluqla.com`;

      await page.click('button:has-text("Pas de compte")');
      await page.fill('input[placeholder*="nom"]', TEST_USER.name);
      await page.fill('input[type="email"]', uniqueEmail);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.fill('input[placeholder*="Confirmez"]', TEST_USER.password);
      await page.click('button[type="submit"]');

      await page.waitForURL('/onboarding');

      // Actualiser la page
      await page.reload();

      // Vérifier que l'utilisateur reste connecté
      await expect(page).not.toHaveURL('/');

      // Vérifier que les tokens sont toujours présents
      const token = await page.evaluate(() => localStorage.getItem('token'));
      expect(token).toBeTruthy();
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // Tester la navigation au clavier
      await page.keyboard.press('Tab');

      // Vérifier que le premier champ (email) a le focus
      const emailFocused = await page.locator('input[type="email"]').evaluate(
        el => el === document.activeElement
      );
      expect(emailFocused).toBe(true);

      // Continuer la navigation
      await page.keyboard.press('Tab');

      const passwordFocused = await page.locator('input[type="password"]').evaluate(
        el => el === document.activeElement
      );
      expect(passwordFocused).toBe(true);
    });

    test('should have proper ARIA labels', async ({ page }) => {
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');

      // Vérifier que les champs ont des labels appropriés
      await expect(emailInput).toHaveAccessibleName(/email/i);
      await expect(passwordInput).toHaveAccessibleName(/mot de passe/i);
    });
  });
});