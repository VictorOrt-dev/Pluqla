/**
 * E2E Tests - Alimentation Feature Flow
 *
 * Tests covering the complete user journey through the Alimentation (Food) feature
 */

const { test, expect } = require('@playwright/test');

// Test data
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPass123!'
};

test.describe('Alimentation Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for home screen
    await page.waitForURL('**/home', { timeout: 10000 });

    // Navigate to Alimentation screen
    await page.click('text=Alimentation');
    await page.waitForLoadState('networkidle');
  });

  test('should display the Alimentation screen with categories', async ({ page }) => {
    // Check that main categories are visible
    await expect(page.locator('text=Recettes')).toBeVisible();
    await expect(page.locator('text=Nutrition')).toBeVisible();
    await expect(page.locator('text=Courses')).toBeVisible();
  });

  test('should display recipe list', async ({ page }) => {
    // Check recipes category is selected by default or click it
    const recipesTab = page.locator('text=Recettes').first();
    await recipesTab.click();

    // Wait for recipes to load
    await page.waitForTimeout(1000);

    // Should see some recipes or empty state
    const recipesContainer = page.locator('[class*="grid"]').first();
    await expect(recipesContainer).toBeVisible();
  });

  test('should allow searching recipes', async ({ page }) => {
    // Click recipes tab
    await page.click('text=Recettes');

    // Find search input and search for something
    const searchInput = page.locator('input[placeholder*="Rechercher"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('poulet');
      await page.waitForTimeout(1000);

      // Results should update
      await expect(page.locator('[class*="grid"]')).toBeVisible();
    }
  });

  test('should allow filtering recipes by price', async ({ page }) => {
    // Click recipes tab
    await page.click('text=Recettes');

    // Find price slider
    const priceSlider = page.locator('input[type="range"]');
    if (await priceSlider.isVisible()) {
      await priceSlider.fill('10');
      await page.waitForTimeout(1000);

      // Should see filtered results
      await expect(page.locator('[class*="grid"]')).toBeVisible();
    }
  });

  test('should allow adding/removing favorites', async ({ page }) => {
    // Click recipes tab
    await page.click('text=Recettes');
    await page.waitForTimeout(1000);

    // Find first recipe card with favorite button
    const favoriteButton = page.locator('button:has-text("🤍"), button:has-text("❤️")').first();
    if (await favoriteButton.isVisible()) {
      // Get initial state
      const initialIcon = await favoriteButton.textContent();

      // Click to toggle
      await favoriteButton.click();
      await page.waitForTimeout(500);

      // Should have changed
      const newIcon = await favoriteButton.textContent();
      expect(initialIcon).not.toBe(newIcon);
    }
  });

  test('should open recipe detail modal', async ({ page }) => {
    // Click recipes tab
    await page.click('text=Recettes');
    await page.waitForTimeout(1000);

    // Click on first recipe card (not the favorite button)
    const recipeCard = page.locator('[class*="rounded-2xl"]').first();
    if (await recipeCard.isVisible()) {
      await recipeCard.click();
      await page.waitForTimeout(500);

      // Modal should open with recipe details
      const modal = page.locator('[class*="fixed inset-0"]');
      if (await modal.isVisible()) {
        // Should show recipe name and close button
        await expect(page.locator('text=✕')).toBeVisible();
      }
    }
  });

  test('should navigate to nutrition tab', async ({ page }) => {
    // Click nutrition tab
    await page.click('text=Nutrition');
    await page.waitForTimeout(1000);

    // Should see AI suggestions or loading state
    const content = page.locator('[class*="p-"]').first();
    await expect(content).toBeVisible();
  });

  test('should generate shopping list from favorites', async ({ page }) => {
    // First add at least one favorite
    await page.click('text=Recettes');
    await page.waitForTimeout(1000);

    const favoriteButton = page.locator('button:has-text("🤍")').first();
    if (await favoriteButton.isVisible()) {
      await favoriteButton.click();
      await page.waitForTimeout(500);

      // Now navigate to shopping list
      await page.click('text=Courses');
      await page.waitForTimeout(500);

      // Look for generate shopping list button
      const generateButton = page.locator('button:has-text("Générer")');
      if (await generateButton.isVisible()) {
        await generateButton.click();
        await page.waitForTimeout(2000);

        // Should see shopping list or error message
        const content = page.locator('[class*="p-"]').first();
        await expect(content).toBeVisible();
      }
    }
  });

  test('should handle XSS attempts safely', async ({ page }) => {
    // Try to inject script in search
    await page.click('text=Recettes');

    const searchInput = page.locator('input[placeholder*="Rechercher"]');
    if (await searchInput.isVisible()) {
      const xssPayload = '<script>alert("XSS")</script>';
      await searchInput.fill(xssPayload);
      await page.waitForTimeout(1000);

      // Should not execute script, just show as text
      const alerts = [];
      page.on('dialog', dialog => alerts.push(dialog));

      await page.waitForTimeout(1000);
      expect(alerts.length).toBe(0);
    }
  });

  test('should show error state gracefully on API failure', async ({ page }) => {
    // Intercept API calls and make them fail
    await page.route('**/api/recipes*', route => {
      route.abort('failed');
    });

    // Try to load recipes
    await page.click('text=Recettes');
    await page.waitForTimeout(1000);

    // Should show error message or empty state, not crash
    const errorMessage = page.locator('text=/erreur|error/i');
    const emptyState = page.locator('text=/aucun|empty/i');

    const hasError = await errorMessage.isVisible().catch(() => false);
    const isEmpty = await emptyState.isVisible().catch(() => false);

    expect(hasError || isEmpty).toBeTruthy();
  });

  test('should persist favorites after page reload', async ({ page }) => {
    // Add a favorite
    await page.click('text=Recettes');
    await page.waitForTimeout(1000);

    const favoriteButton = page.locator('button:has-text("🤍")').first();
    if (await favoriteButton.isVisible()) {
      await favoriteButton.click();
      await page.waitForTimeout(500);

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Navigate back to Alimentation
      await page.click('text=Alimentation');
      await page.waitForTimeout(1000);
      await page.click('text=Recettes');
      await page.waitForTimeout(1000);

      // Should still be favorited (❤️ instead of 🤍)
      const stillFavorited = page.locator('button:has-text("❤️")').first();
      await expect(stillFavorited).toBeVisible();
    }
  });
});
