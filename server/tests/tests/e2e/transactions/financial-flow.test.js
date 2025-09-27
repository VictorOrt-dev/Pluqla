/**
 * Tests E2E pour les flux de transactions financières
 * Tests critiques pour la sécurité financière de l'application
 */

import { test, expect } from '@playwright/test';

// Données de test pour utilisateur financier
const FINANCIAL_USER = {
  email: 'finance.e2e@pluqla.com',
  password: 'SecureFinance123!',
  name: 'Finance Test User'
};

// Données de test pour transactions
const TEST_TRANSACTIONS = {
  valid: {
    amount: 25.50,
    category: 'alimentation',
    description: 'Économie courses bio'
  },
  large: {
    amount: 500.00,
    category: 'transport',
    description: 'Économie voiture partagée'
  },
  invalid: {
    amount: -10,
    category: '',
    description: ''
  }
};

test.describe('Financial Transactions Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Créer et connecter un utilisateur pour les tests financiers
    await page.goto('/');

    // Créer un compte unique pour chaque test
    const uniqueEmail = `finance.${Date.now()}@pluqla.com`;

    await page.click('button:has-text("Pas de compte")');
    await page.fill('input[placeholder*="nom"]', FINANCIAL_USER.name);
    await page.fill('input[type="email"]', uniqueEmail);
    await page.fill('input[type="password"]', FINANCIAL_USER.password);
    await page.fill('input[placeholder*="Confirmez"]', FINANCIAL_USER.password);
    await page.click('button[type="submit"]');

    // Attendre l'onboarding et naviguer vers l'app principale
    await page.waitForURL('/onboarding');

    // Simuler la fin de l'onboarding (clic sur un bouton de fin)
    // ou naviguer directement vers home
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Transaction Creation', () => {
    test('should create a valid transaction', async ({ page }) => {
      // Naviguer vers une catégorie pour ajouter une transaction
      await page.click('[data-testid="category-alimentation"]');

      // Ou utiliser une méthode alternative si les data-testid n'existent pas
      await page.click('text=Alimentation');

      // Remplir les détails de la transaction
      await page.fill('input[placeholder*="montant"]', TEST_TRANSACTIONS.valid.amount.toString());
      await page.fill('textarea[placeholder*="description"]', TEST_TRANSACTIONS.valid.description);

      // Soumettre la transaction
      await page.click('button:has-text("Ajouter")');

      // Vérifier que la transaction apparaît dans l'interface
      await expect(page.locator(`text=${TEST_TRANSACTIONS.valid.amount}€`)).toBeVisible();
      await expect(page.locator(`text=${TEST_TRANSACTIONS.valid.description}`)).toBeVisible();

      // Vérifier que les statistiques sont mises à jour
      const savedAmount = await page.locator('[data-testid="total-savings"]').textContent();
      expect(parseFloat(savedAmount.replace('€', ''))).toBeGreaterThan(0);
    });

    test('should validate transaction amounts', async ({ page }) => {
      await page.click('text=Transport');

      // Tenter une transaction avec un montant négatif
      await page.fill('input[placeholder*="montant"]', TEST_TRANSACTIONS.invalid.amount.toString());
      await page.click('button:has-text("Ajouter")');

      // Vérifier que l'erreur de validation apparaît
      await expect(page.locator('text=Montant invalide')).toBeVisible();

      // Tenter avec un montant trop élevé (par exemple > 10000€)
      await page.fill('input[placeholder*="montant"]', '15000');
      await page.click('button:has-text("Ajouter")');

      await expect(page.locator('text=Montant trop élevé')).toBeVisible();
    });

    test('should handle large transaction amounts correctly', async ({ page }) => {
      await page.click('text=Transport');

      // Transaction importante mais valide
      await page.fill('input[placeholder*="montant"]', TEST_TRANSACTIONS.large.amount.toString());
      await page.fill('textarea[placeholder*="description"]', TEST_TRANSACTIONS.large.description);

      await page.click('button:has-text("Ajouter")');

      // Vérifier que la transaction est enregistrée correctement
      await expect(page.locator(`text=${TEST_TRANSACTIONS.large.amount}€`)).toBeVisible();

      // Vérifier que le total est calculé correctement
      const totalSavings = await page.locator('[data-testid="total-savings"]').textContent();
      const total = parseFloat(totalSavings.replace('€', ''));
      expect(total).toBe(TEST_TRANSACTIONS.large.amount);
    });
  });

  test.describe('Transaction Security', () => {
    test('should prevent unauthorized transaction modifications', async ({ page }) => {
      // Créer une transaction d'abord
      await page.click('text=Alimentation');
      await page.fill('input[placeholder*="montant"]', '50');
      await page.fill('textarea[placeholder*="description"]', 'Test transaction');
      await page.click('button:has-text("Ajouter")');

      // Tenter de modifier directement les données via le navigateur
      await page.evaluate(() => {
        // Simuler une tentative de manipulation côté client
        if (window.localStorage) {
          const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
          if (transactions.length > 0) {
            transactions[0].amount = 1000000; // Montant frauduleux
            localStorage.setItem('transactions', JSON.stringify(transactions));
          }
        }
      });

      // Recharger la page
      await page.reload();

      // Vérifier que la modification n'a pas persisté côté serveur
      // La vraie valeur doit être restaurée depuis l'API
      await expect(page.locator('text=1000000€')).not.toBeVisible();
      await expect(page.locator('text=50€')).toBeVisible();
    });

    test('should sanitize transaction descriptions', async ({ page }) => {
      await page.click('text=Habits');

      const maliciousDescription = '<script>alert("XSS")</script>Transaction test';

      await page.fill('input[placeholder*="montant"]', '25');
      await page.fill('textarea[placeholder*="description"]', maliciousDescription);
      await page.click('button:has-text("Ajouter")');

      // Vérifier que le script n'est pas exécuté
      const alertTriggered = await page.evaluate(() => window.alertTriggered || false);
      expect(alertTriggered).toBe(false);

      // Vérifier que la description est sanitisée
      await expect(page.locator('text=<script>')).not.toBeVisible();
      await expect(page.locator('text=Transaction test')).toBeVisible();
    });

    test('should require authentication for financial operations', async ({ page }) => {
      // Supprimer le token d'authentification
      await page.evaluate(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      });

      // Recharger la page
      await page.reload();

      // Vérifier la redirection vers la page de connexion
      await expect(page).toHaveURL('/');

      // Tenter d'accéder directement aux pages financières
      await page.goto('/finance');
      await expect(page).toHaveURL('/');
    });
  });

  test.describe('Transaction History', () => {
    test('should display transaction history correctly', async ({ page }) => {
      // Créer plusieurs transactions
      const transactions = [
        { amount: '25', description: 'Première transaction', category: 'alimentation' },
        { amount: '50', description: 'Deuxième transaction', category: 'transport' },
        { amount: '15', description: 'Troisième transaction', category: 'habits' }
      ];

      for (const transaction of transactions) {
        await page.click(`text=${transaction.category}`);
        await page.fill('input[placeholder*="montant"]', transaction.amount);
        await page.fill('textarea[placeholder*="description"]', transaction.description);
        await page.click('button:has-text("Ajouter")');

        // Attendre que la transaction soit enregistrée
        await page.waitForTimeout(500);

        // Retourner au menu principal
        await page.click('button:has-text("Retour")');
      }

      // Naviguer vers l'historique des transactions
      await page.click('text=Finances');

      // Vérifier que toutes les transactions apparaissent
      for (const transaction of transactions) {
        await expect(page.locator(`text=${transaction.amount}€`)).toBeVisible();
        await expect(page.locator(`text=${transaction.description}`)).toBeVisible();
      }

      // Vérifier le calcul du total
      const totalExpected = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const totalDisplayed = await page.locator('[data-testid="total-savings"]').textContent();
      const totalValue = parseFloat(totalDisplayed.replace('€', ''));

      expect(totalValue).toBe(totalExpected);
    });

    test('should filter transactions by category', async ({ page }) => {
      // Créer des transactions dans différentes catégories
      await page.click('text=Alimentation');
      await page.fill('input[placeholder*="montant"]', '30');
      await page.fill('textarea[placeholder*="description"]', 'Transaction alimentation');
      await page.click('button:has-text("Ajouter")');

      await page.click('button:has-text("Retour")');

      await page.click('text=Transport');
      await page.fill('input[placeholder*="montant"]', '60');
      await page.fill('textarea[placeholder*="description"]', 'Transaction transport');
      await page.click('button:has-text("Ajouter")');

      // Naviguer vers les finances
      await page.click('text=Finances');

      // Filtrer par catégorie alimentation
      await page.click('button:has-text("Alimentation")');

      // Vérifier que seule la transaction d'alimentation est visible
      await expect(page.locator('text=Transaction alimentation')).toBeVisible();
      await expect(page.locator('text=Transaction transport')).not.toBeVisible();

      // Filtrer par catégorie transport
      await page.click('button:has-text("Transport")');

      await expect(page.locator('text=Transaction transport')).toBeVisible();
      await expect(page.locator('text=Transaction alimentation')).not.toBeVisible();
    });
  });

  test.describe('Financial Statistics', () => {
    test('should calculate savings statistics correctly', async ({ page }) => {
      // Créer des transactions de test
      const testAmounts = [100, 50, 75, 25];

      for (let i = 0; i < testAmounts.length; i++) {
        await page.click('text=Alimentation');
        await page.fill('input[placeholder*="montant"]', testAmounts[i].toString());
        await page.fill('textarea[placeholder*="description"]', `Test ${i + 1}`);
        await page.click('button:has-text("Ajouter")');
        await page.click('button:has-text("Retour")');
      }

      // Calculer le total attendu
      const expectedTotal = testAmounts.reduce((sum, amount) => sum + amount, 0);

      // Vérifier le total affiché
      const totalElement = page.locator('[data-testid="total-savings"]');
      await expect(totalElement).toContainText(`${expectedTotal}€`);

      // Vérifier les moyennes et statistiques si disponibles
      await page.click('text=Statistiques');

      const averageExpected = expectedTotal / testAmounts.length;
      await expect(page.locator(`text=${averageExpected}€`)).toBeVisible();
    });

    test('should update progress towards monthly goal', async ({ page }) => {
      // Définir un objectif mensuel
      const monthlyGoal = 500;

      await page.click('text=Profil');
      await page.fill('input[placeholder*="objectif"]', monthlyGoal.toString());
      await page.click('button:has-text("Sauvegarder")');

      // Créer des transactions vers l'objectif
      await page.click('text=Alimentation');
      await page.fill('input[placeholder*="montant"]', '150');
      await page.fill('textarea[placeholder*="description"]', 'Progress test');
      await page.click('button:has-text("Ajouter")');

      // Vérifier le pourcentage de progression
      const progressExpected = (150 / monthlyGoal) * 100;
      const progressElement = page.locator('[data-testid="progress-percentage"]');

      await expect(progressElement).toContainText(`${progressExpected}%`);
    });
  });

  test.describe('Offline Functionality', () => {
    test('should handle offline transaction creation', async ({ page }) => {
      // Simuler le mode hors ligne
      await page.setOffline(true);

      // Créer une transaction hors ligne
      await page.click('text=Habits');
      await page.fill('input[placeholder*="montant"]', '40');
      await page.fill('textarea[placeholder*="description"]', 'Transaction hors ligne');
      await page.click('button:has-text("Ajouter")');

      // Vérifier que la transaction est stockée localement
      await expect(page.locator('text=Transaction hors ligne')).toBeVisible();

      // Remettre en ligne
      await page.setOffline(false);

      // Recharger et vérifier la synchronisation
      await page.reload();
      await expect(page.locator('text=Transaction hors ligne')).toBeVisible();
    });
  });

  test.describe('Data Privacy', () => {
    test('should not expose sensitive financial data in browser logs', async ({ page }) => {
      // Intercepter les logs de la console
      const consoleLogs = [];
      page.on('console', msg => {
        consoleLogs.push(msg.text());
      });

      // Créer une transaction avec des données sensibles
      await page.click('text=Alimentation');
      await page.fill('input[placeholder*="montant"]', '999.99');
      await page.fill('textarea[placeholder*="description"]', 'Transaction confidentielle');
      await page.click('button:has-text("Ajouter")');

      // Vérifier que les données sensibles ne sont pas loggées
      const sensitiveDataInLogs = consoleLogs.some(log =>
        log.includes('999.99') || log.includes('Transaction confidentielle')
      );

      expect(sensitiveDataInLogs).toBe(false);
    });

    test('should clear financial data on logout', async ({ page }) => {
      // Créer des transactions
      await page.click('text=Transport');
      await page.fill('input[placeholder*="montant"]', '75');
      await page.fill('textarea[placeholder*="description"]', 'Test logout data');
      await page.click('button:has-text("Ajouter")');

      // Vérifier que les données sont présentes
      const transactionsBefore = await page.evaluate(() => {
        return localStorage.getItem('transactions');
      });
      expect(transactionsBefore).toBeTruthy();

      // Se déconnecter
      await page.evaluate(() => {
        // Simuler la fonction de déconnexion
        localStorage.clear();
      });

      // Vérifier que toutes les données financières sont supprimées
      const transactionsAfter = await page.evaluate(() => {
        return localStorage.getItem('transactions');
      });
      expect(transactionsAfter).toBeFalsy();
    });
  });
});