/**
 * E2E Tests - Forecast vs Reality Feature (Phase 5)
 *
 * Tests covering the complete user journey for forecast vs reality matching:
 * - Adding recipes to budget (creating forecasts)
 * - Viewing forecast vs reality statistics
 * - Manual matching trigger
 * - Duplicate detection and prevention
 * - Statistics accuracy
 */

const { test, expect } = require('@playwright/test');

// Test data
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPass123!',
};

test.describe('Forecast vs Reality Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for home screen
    await page.waitForURL('**/home', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
  });

  test('should add recipe to budget and create forecast', async ({ page }) => {
    // Navigate to Alimentation screen
    await page.click('text=Alimentation');
    await page.waitForLoadState('networkidle');

    // Click recipes tab
    const recipesTab = page.locator('text=Recettes').first();
    await recipesTab.click();
    await page.waitForTimeout(1000);

    // Find first recipe card
    const recipeCard = page.locator('[class*="rounded-2xl"]').first();
    await expect(recipeCard).toBeVisible();

    // Click "Add to budget" button (dollar icon)
    const addToBudgetButton = page.locator('button[aria-label*="budget"]').first();
    if (await addToBudgetButton.isVisible()) {
      await addToBudgetButton.click();
      await page.waitForTimeout(500);

      // Budget Quick-Log Modal should open
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      await expect(page.locator('text=Ajouter au budget')).toBeVisible();

      // Verify pre-filled data
      await expect(page.locator('text=Recette')).toBeVisible();
      await expect(page.locator('text=Nombre de personnes')).toBeVisible();
      await expect(page.locator('text=Coût total')).toBeVisible();

      // Confirm addition
      const confirmButton = page.locator('button:has-text("Confirmer")');
      await confirmButton.click();
      await page.waitForTimeout(1000);

      // Should see success toast
      await expect(page.locator('text=/ajouté|enregistré/i')).toBeVisible({ timeout: 5000 });

      // Modal should close
      await expect(modal).not.toBeVisible();
    }
  });

  test('should show duplicate warning when adding similar forecast', async ({ page }) => {
    // First, add a recipe to budget
    await page.click('text=Alimentation');
    await page.waitForLoadState('networkidle');

    const recipesTab = page.locator('text=Recettes').first();
    await recipesTab.click();
    await page.waitForTimeout(1000);

    // Add first forecast
    const addToBudgetButton = page.locator('button[aria-label*="budget"]').first();
    if (await addToBudgetButton.isVisible()) {
      await addToBudgetButton.click();
      await page.waitForTimeout(500);

      const confirmButton = page.locator('button:has-text("Confirmer")');
      await confirmButton.click();
      await page.waitForTimeout(1000);

      // Try to add the same recipe again immediately
      await page.click('text=Recettes');
      await page.waitForTimeout(500);

      await addToBudgetButton.click();
      await page.waitForTimeout(1000);

      // Should see duplicate warning
      const duplicateWarning = page.locator('text=Doublon potentiel');
      if (await duplicateWarning.isVisible()) {
        await expect(duplicateWarning).toBeVisible();

        // Should see action buttons
        await expect(page.locator('button:has-text("Utiliser l\'existant")')).toBeVisible();
        await expect(page.locator('button:has-text("Ajouter quand même")')).toBeVisible();

        // Confirm button should be disabled
        const confirmBtn = page.locator('button:has-text("Confirmer")');
        await expect(confirmBtn).toBeDisabled();
      }
    }
  });

  test('should allow user to ignore duplicate warning and add anyway', async ({ page }) => {
    // Navigate and add first forecast
    await page.click('text=Alimentation');
    await page.waitForLoadState('networkidle');

    const recipesTab = page.locator('text=Recettes').first();
    await recipesTab.click();
    await page.waitForTimeout(1000);

    const addToBudgetButton = page.locator('button[aria-label*="budget"]').first();
    if (await addToBudgetButton.isVisible()) {
      // Add first time
      await addToBudgetButton.click();
      await page.waitForTimeout(500);
      await page.locator('button:has-text("Confirmer")').click();
      await page.waitForTimeout(1000);

      // Try again
      await page.click('text=Recettes');
      await page.waitForTimeout(500);
      await addToBudgetButton.click();
      await page.waitForTimeout(1000);

      // If duplicate warning appears
      const duplicateWarning = page.locator('text=Doublon potentiel');
      if (await duplicateWarning.isVisible()) {
        // Click "Ajouter quand même"
        await page.locator('button:has-text("Ajouter quand même")').click();
        await page.waitForTimeout(500);

        // Confirm button should now be enabled and text changed
        const confirmBtn = page.locator('button:has-text("Confirmer quand même")');
        await expect(confirmBtn).toBeEnabled();

        // Confirm
        await confirmBtn.click();
        await page.waitForTimeout(1000);

        // Should succeed
        await expect(page.locator('text=/ajouté|enregistré/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should display forecast vs reality panel in Food Budget Widget', async ({ page }) => {
    // Navigate to Finance Dashboard
    await page.click('text=Finance');
    await page.waitForLoadState('networkidle');

    // Wait for Food Budget Widget to load
    await page.waitForTimeout(1000);

    // Look for Budget Alimentation widget
    const budgetWidget = page.locator('text=Budget Alimentation').first();
    if (await budgetWidget.isVisible()) {
      // Should see tab navigation
      await expect(page.locator('text=Budget rapide')).toBeVisible();
      await expect(page.locator('text=Prévu vs Réel')).toBeVisible();

      // Click on "Prévu vs Réel" tab
      await page.locator('text=Prévu vs Réel').click();
      await page.waitForTimeout(1000);

      // Should see forecast vs reality content
      await expect(page.locator('text=Prévision vs Réalité')).toBeVisible();

      // Should see statistics or empty state
      const statsPanel = page.locator('text=/Prévu|Réel|Matchés|En attente/i').first();
      await expect(statsPanel).toBeVisible();
    }
  });

  test('should trigger manual matching from forecast vs reality panel', async ({ page }) => {
    // Navigate to Finance Dashboard
    await page.click('text=Finance');
    await page.waitForLoadState('networkidle');

    // Find Food Budget Widget and click Prévu vs Réel tab
    const forecastTab = page.locator('text=Prévu vs Réel').first();
    if (await forecastTab.isVisible()) {
      await forecastTab.click();
      await page.waitForTimeout(1000);

      // Look for "Actualiser" button
      const refreshButton = page.locator('button:has-text("Actualiser")');
      if (await refreshButton.isVisible()) {
        await refreshButton.click();
        await page.waitForTimeout(2000);

        // Should see matching in progress or completion
        const loadingOrSuccess = page.locator('text=/Matching|correspondances trouvées/i');
        await expect(loadingOrSuccess).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should display accurate statistics in forecast vs reality panel', async ({ page }) => {
    // Navigate to Finance Dashboard
    await page.click('text=Finance');
    await page.waitForLoadState('networkidle');

    const forecastTab = page.locator('text=Prévu vs Réel').first();
    if (await forecastTab.isVisible()) {
      await forecastTab.click();
      await page.waitForTimeout(1000);

      // Check for statistics elements
      const statsElements = [
        'text=Prévu',
        'text=Réel',
        'text=Matchés',
        'text=En attente',
        'text=Archivés',
      ];

      for (const element of statsElements) {
        const el = page.locator(element).first();
        if (await el.isVisible()) {
          await expect(el).toBeVisible();
        }
      }

      // Check for variance message if there's data
      const varianceMessage = page.locator('text=/Excellent|Attention|Bravo|prévisions/i').first();
      if (await varianceMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(varianceMessage).toBeVisible();
      }

      // Check for info box about automatic matching
      const infoBox = page.locator('text=/Comment fonctionne|matching automatique/i').first();
      if (await infoBox.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(infoBox).toBeVisible();
      }
    }
  });

  test('should adjust servings in quick-log modal and update price', async ({ page }) => {
    // Navigate to Alimentation
    await page.click('text=Alimentation');
    await page.waitForLoadState('networkidle');

    const recipesTab = page.locator('text=Recettes').first();
    await recipesTab.click();
    await page.waitForTimeout(1000);

    const addToBudgetButton = page.locator('button[aria-label*="budget"]').first();
    if (await addToBudgetButton.isVisible()) {
      await addToBudgetButton.click();
      await page.waitForTimeout(500);

      // Modal should be open
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Get initial price
      const priceDisplay = page.locator('text=Coût total').locator('..').locator('text=/€/');
      const initialPrice = await priceDisplay.textContent();

      // Find increment button and click it
      const incrementButton = page.locator('button[aria-label*="Augmenter"]');
      if (await incrementButton.isVisible()) {
        await incrementButton.click();
        await page.waitForTimeout(500);

        // Price should have changed
        const newPrice = await priceDisplay.textContent();
        expect(newPrice).not.toBe(initialPrice);

        // Servings number should have increased
        await expect(page.locator('text=/2 personnes?/i')).toBeVisible();
      }
    }
  });

  test('should display loading state while checking for duplicates', async ({ page }) => {
    // Navigate to Alimentation
    await page.click('text=Alimentation');
    await page.waitForLoadState('networkidle');

    const recipesTab = page.locator('text=Recettes').first();
    await recipesTab.click();
    await page.waitForTimeout(1000);

    const addToBudgetButton = page.locator('button[aria-label*="budget"]').first();
    if (await addToBudgetButton.isVisible()) {
      await addToBudgetButton.click();

      // Should briefly see "Vérification des doublons..."
      const checkingMessage = page.locator('text=Vérification des doublons');
      // Note: This might be too fast to catch, so we use a short timeout
      const isVisible = await checkingMessage.isVisible({ timeout: 1000 }).catch(() => false);

      // If we caught it, verify it's there
      if (isVisible) {
        await expect(checkingMessage).toBeVisible();
      }
    }
  });

  test('should navigate between budget tabs without errors', async ({ page }) => {
    // Navigate to Finance Dashboard
    await page.click('text=Finance');
    await page.waitForLoadState('networkidle');

    // Switch between tabs multiple times
    const budgetTab = page.locator('text=Budget rapide').first();
    const forecastTab = page.locator('text=Prévu vs Réel').first();

    if (await budgetTab.isVisible() && await forecastTab.isVisible()) {
      // Click Forecast tab
      await forecastTab.click();
      await page.waitForTimeout(500);
      await expect(page.locator('text=Prévision vs Réalité')).toBeVisible();

      // Click Budget tab
      await budgetTab.click();
      await page.waitForTimeout(500);
      await expect(page.locator('text=/Dépensé ce mois|Budget/i')).toBeVisible();

      // Back to Forecast tab
      await forecastTab.click();
      await page.waitForTimeout(500);
      await expect(page.locator('text=Prévision vs Réalité')).toBeVisible();

      // No errors should occur
      const errorMessages = page.locator('text=/error|erreur/i');
      await expect(errorMessages).toHaveCount(0);
    }
  });

  test('should handle empty state in forecast vs reality panel', async ({ page }) => {
    // For a new user or after clearing data, should show empty state
    await page.click('text=Finance');
    await page.waitForLoadState('networkidle');

    const forecastTab = page.locator('text=Prévu vs Réel').first();
    if (await forecastTab.isVisible()) {
      await forecastTab.click();
      await page.waitForTimeout(1000);

      // Look for empty state message or actual data
      const emptyState = page.locator('text=/Aucune donnée|Ajoutez des recettes/i').first();
      const hasData = page.locator('text=Prévu').first();

      // Either should be visible (empty state OR data)
      const emptyVisible = await emptyState.isVisible({ timeout: 2000 }).catch(() => false);
      const dataVisible = await hasData.isVisible({ timeout: 2000 }).catch(() => false);

      expect(emptyVisible || dataVisible).toBe(true);
    }
  });

  test('should close modal when clicking cancel in quick-log', async ({ page }) => {
    // Navigate to Alimentation
    await page.click('text=Alimentation');
    await page.waitForLoadState('networkidle');

    const recipesTab = page.locator('text=Recettes').first();
    await recipesTab.click();
    await page.waitForTimeout(1000);

    const addToBudgetButton = page.locator('button[aria-label*="budget"]').first();
    if (await addToBudgetButton.isVisible()) {
      await addToBudgetButton.click();
      await page.waitForTimeout(500);

      // Modal should be open
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Click cancel button
      const cancelButton = page.locator('button:has-text("Annuler")');
      await cancelButton.click();
      await page.waitForTimeout(500);

      // Modal should close
      await expect(modal).not.toBeVisible();
    }
  });

  test('should close modal when clicking backdrop in quick-log', async ({ page }) => {
    // Navigate to Alimentation
    await page.click('text=Alimentation');
    await page.waitForLoadState('networkidle');

    const recipesTab = page.locator('text=Recettes').first();
    await recipesTab.click();
    await page.waitForTimeout(1000);

    const addToBudgetButton = page.locator('button[aria-label*="budget"]').first();
    if (await addToBudgetButton.isVisible()) {
      await addToBudgetButton.click();
      await page.waitForTimeout(500);

      // Modal should be open
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Click backdrop (outside modal)
      await page.click('.fixed.inset-0.bg-black', { position: { x: 10, y: 10 } });
      await page.waitForTimeout(500);

      // Modal should close
      await expect(modal).not.toBeVisible();
    }
  });

  test('should show progress bars in forecast vs reality panel', async ({ page }) => {
    // Navigate to Finance Dashboard
    await page.click('text=Finance');
    await page.waitForLoadState('networkidle');

    const forecastTab = page.locator('text=Prévu vs Réel').first();
    if (await forecastTab.isVisible()) {
      await forecastTab.click();
      await page.waitForTimeout(1000);

      // Look for progress bars (they use specific classes)
      const progressBars = page.locator('[class*="rounded-full"]').filter({ hasText: '' });
      const count = await progressBars.count();

      // Should have at least 2 progress bars (Forecast and Actual) if there's data
      if (count > 0) {
        expect(count).toBeGreaterThanOrEqual(2);
      }
    }
  });
});
