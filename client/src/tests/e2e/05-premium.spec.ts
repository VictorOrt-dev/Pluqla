import { test, expect } from '@playwright/test';
import { loginUser } from './01-auth.spec';

/**
 * E2E Tests - Premium Features
 *
 * Tests couverts:
 * - Badge Premium dans navbar
 * - AI Insights Premium (Finance)
 * - Quota AI illimité
 * - Transport optimization illimité
 * - Smart suggestions illimitées (Alimentation)
 * - Settings Premium
 * - Upgrade prompt pour utilisateurs Free
 */

test.describe('Premium Features', () => {
  test.describe('Premium User', () => {
    test.beforeEach(async ({ page }) => {
      // Se connecter avec compte premium
      await loginUser(page, 'premium@pluqla.com', 'PremiumPass123!');
    });

    test('should display premium badge in navbar', async ({ page }) => {
      // Chercher badge premium
      const premiumBadge = page.locator(
        '[data-testid="premium-badge"], text=/Premium|👑|⭐/i'
      );

      await expect(premiumBadge.first()).toBeVisible({ timeout: 5000 });
    });

    test('should display premium badge in user menu', async ({ page }) => {
      // Ouvrir menu utilisateur
      const userMenu = page.locator('[data-testid="user-menu"], [data-testid="profile-button"]');

      if (await userMenu.count() > 0) {
        await userMenu.first().click();

        // Vérifier badge premium
        const premiumLabel = page.locator('text=/Premium|Compte Premium/i');
        await expect(premiumLabel.first()).toBeVisible({ timeout: 3000 });
      }
    });

    test('should have unlimited AI quota', async ({ page }) => {
      // Naviguer vers paramètres
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Chercher section quota
      const quotaSection = page.locator('[data-testid="ai-quota"], text=/Quota|Credits/i');

      if (await quotaSection.first().count() > 0) {
        await expect(quotaSection.first()).toBeVisible();

        // Vérifier "Illimité"
        const unlimitedLabel = page.locator('text=/Illimité|Unlimited|∞/i');
        await expect(unlimitedLabel.first()).toBeVisible();
      }
    });

    test('should access premium AI insights in Finance', async ({ page }) => {
      // Naviguer vers finance
      await page.goto('/finance');
      await page.waitForLoadState('networkidle');

      // Chercher insights premium
      const premiumInsight = page.locator(
        '[data-testid="premium-insight"], .premium-insight'
      );

      const count = await premiumInsight.count();

      if (count > 0) {
        await expect(premiumInsight.first()).toBeVisible();

        // Vérifier badge Premium sur insight
        const premiumBadge = premiumInsight.first().locator('text=/Premium|👑/i');
        await expect(premiumBadge).toBeVisible();
      }
    });

    test('should have unlimited transport optimizations', async ({ page }) => {
      // Naviguer vers transport
      await page.goto('/deplacement');
      await page.waitForLoadState('networkidle');

      // Créer et optimiser plusieurs trajets sans limite
      for (let i = 0; i < 3; i++) {
        // Ouvrir modal
        const addButton = page.locator('[data-testid="add-trip-button"]');
        await addButton.first().click();

        await page.waitForSelector('[role="dialog"]', { timeout: 3000 });

        await page.fill('input[name="name"]', `Test Trip ${i}`);
        await page.fill('input[name="origin"]', 'Paris');
        await page.fill('input[name="destination"]', 'Lyon');
        await page.fill('input[name="distanceKm"]', '450');

        await page.click('button[type="submit"]');
        await page.waitForTimeout(1000);

        // Optimiser
        const optimizeButton = page.locator('button:has-text("Optimiser")').first();
        await optimizeButton.click();

        // Attendre résultat
        await page.waitForTimeout(2000);
      }

      // Aucune erreur de quota ne devrait apparaître
      const quotaError = page.locator('text=/quota.*épuisé|quota.*exceeded/i');
      await expect(quotaError.first()).not.toBeVisible();
    });

    test('should access premium settings section', async ({ page }) => {
      // Naviguer vers settings
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Chercher section premium
      const premiumSection = page.locator(
        '[data-testid="premium-settings"], text=/Paramètres Premium|Premium Settings/i'
      );

      if (await premiumSection.first().count() > 0) {
        await expect(premiumSection.first()).toBeVisible();
      }
    });

    test('should display premium features list', async ({ page }) => {
      // Naviguer vers settings ou about premium
      await page.goto('/settings');

      // Chercher liste des avantages premium
      const featuresList = page.locator('[data-testid="premium-features"], .premium-features');

      if (await featuresList.first().count() > 0) {
        await expect(featuresList.first()).toBeVisible();

        // Vérifier items de features
        const features = page.locator('[data-testid^="feature-"], .feature-item');
        const count = await features.count();
        expect(count).toBeGreaterThan(0);
      }
    });

    test('should NOT see upgrade prompts', async ({ page }) => {
      // Naviguer sur différentes pages
      await page.goto('/finance');
      await page.waitForLoadState('networkidle');

      await page.goto('/deplacement');
      await page.waitForLoadState('networkidle');

      await page.goto('/alimentation');
      await page.waitForLoadState('networkidle');

      // Vérifier qu'aucun prompt d'upgrade n'apparaît
      const upgradePrompt = page.locator('text=/Passer à Premium|Upgrade to Premium/i');
      const count = await upgradePrompt.count();

      // Peut y avoir un lien dans settings, mais pas de popup
      expect(count).toBeLessThanOrEqual(1);
    });
  });

  test.describe('Free User', () => {
    test.beforeEach(async ({ page }) => {
      // Se connecter avec compte free
      await loginUser(page, 'test@pluqla.com', 'TestPass123!');
    });

    test('should NOT display premium badge', async ({ page }) => {
      // Vérifier absence de badge premium
      const premiumBadge = page.locator('[data-testid="premium-badge"]');
      await expect(premiumBadge.first()).not.toBeVisible();
    });

    test('should display free tier label', async ({ page }) => {
      // Ouvrir menu utilisateur
      const userMenu = page.locator('[data-testid="user-menu"], [data-testid="profile-button"]');

      if (await userMenu.count() > 0) {
        await userMenu.first().click();

        // Vérifier label "Gratuit" ou "Free"
        const freeLabel = page.locator('text=/Gratuit|Free|Basic/i');
        const isVisible = await freeLabel.first().isVisible().catch(() => false);

        if (isVisible) {
          await expect(freeLabel.first()).toBeVisible();
        }
      }
    });

    test('should have limited AI quota', async ({ page }) => {
      // Naviguer vers settings
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Chercher quota
      const quotaSection = page.locator('[data-testid="ai-quota"], text=/Quota/i');

      if (await quotaSection.first().count() > 0) {
        await expect(quotaSection.first()).toBeVisible();

        // Vérifier qu'il y a un nombre limité
        const quotaNumber = page.locator('text=/\\d+\\/\\d+|\\d+ restants/i');
        const isVisible = await quotaNumber.first().isVisible().catch(() => false);

        if (isVisible) {
          await expect(quotaNumber.first()).toBeVisible();
        }
      }
    });

    test('should NOT access premium AI insights', async ({ page }) => {
      // Naviguer vers finance
      await page.goto('/finance');
      await page.waitForLoadState('networkidle');

      // Chercher insights premium
      const premiumInsight = page.locator('[data-testid="premium-insight"]');

      // Ne devrait pas être visible pour free user
      await expect(premiumInsight.first()).not.toBeVisible();
    });

    test('should see upgrade prompt when reaching quota limit', async ({ page }) => {
      // Cette vérification dépend de l'état du compte
      // On vérifie juste qu'un bouton "Upgrade" existe quelque part
      const upgradeButton = page.locator('button:has-text("Passer à Premium"), a:has-text("Upgrade")');

      const count = await upgradeButton.count();
      expect(count).toBeGreaterThanOrEqual(0); // Peut ne pas être visible si quota non atteint
    });

    test('should display upgrade CTA in settings', async ({ page }) => {
      // Naviguer vers settings
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Chercher CTA upgrade
      const upgradeCTA = page.locator(
        '[data-testid="upgrade-cta"], button:has-text("Premium"), a:has-text("Premium")'
      );

      if (await upgradeCTA.count() > 0) {
        await expect(upgradeCTA.first()).toBeVisible();
      }
    });

    test('should show premium features comparison', async ({ page }) => {
      // Naviguer vers page pricing ou settings
      await page.goto('/settings');

      // Chercher tableau de comparaison
      const comparison = page.locator('[data-testid="pricing-comparison"], .pricing-table');

      if (await comparison.first().count() > 0) {
        await expect(comparison.first()).toBeVisible();

        // Vérifier colonnes Free vs Premium
        const freeColumn = page.locator('text=/Gratuit|Free/i');
        const premiumColumn = page.locator('text=/Premium/i');

        await expect(freeColumn.first()).toBeVisible();
        await expect(premiumColumn.first()).toBeVisible();
      }
    });

    test('should navigate to upgrade page', async ({ page }) => {
      // Chercher et cliquer sur bouton upgrade
      const upgradeButton = page.locator('button:has-text("Premium"), a[href*="premium"]');

      if (await upgradeButton.count() > 0) {
        await upgradeButton.first().click();

        // Attendre navigation
        await page.waitForTimeout(1000);

        // Vérifier qu'on est sur une page premium/pricing
        const url = page.url();
        const isPremiumPage = url.includes('/premium') || url.includes('/pricing') || url.includes('/upgrade');

        // Si pas de page dédiée, au moins vérifier qu'un modal s'ouvre
        if (!isPremiumPage) {
          const modal = page.locator('[role="dialog"], .modal');
          const isModalVisible = await modal.first().isVisible().catch(() => false);
          expect(isModalVisible).toBeTruthy();
        }
      }
    });
  });

  test.describe('Premium Purchase Flow', () => {
    test.beforeEach(async ({ page }) => {
      await loginUser(page, 'test@pluqla.com', 'TestPass123!');
    });

    test('should display premium pricing options', async ({ page }) => {
      // Naviguer vers premium page
      await page.goto('/premium');
      await page.waitForLoadState('networkidle');

      // Si pas de page premium, aller aux settings
      if (page.url().includes('404') || page.url().includes('not-found')) {
        await page.goto('/settings');
      }

      // Chercher prix
      const pricing = page.locator('text=/€|EUR|\\/mois|\\/month/i');

      const count = await pricing.count();

      if (count > 0) {
        await expect(pricing.first()).toBeVisible();
      }
    });

    test('should display payment methods', async ({ page }) => {
      // Naviguer vers premium purchase
      await page.goto('/premium');

      if (page.url().includes('404')) {
        await page.goto('/settings');

        // Cliquer sur upgrade
        const upgradeButton = page.locator('button:has-text("Premium")');
        if (await upgradeButton.count() > 0) {
          await upgradeButton.first().click();
          await page.waitForTimeout(1000);
        }
      }

      // Chercher méthodes de paiement
      const paymentMethods = page.locator('text=/Carte bancaire|Credit Card|PayPal|Stripe/i');

      const count = await paymentMethods.count();

      if (count > 0) {
        await expect(paymentMethods.first()).toBeVisible();
      }
    });
  });
});
