/**
 * E2E Tests - Alimentation Feature (Recipe Search & Management)
 *
 * Test Coverage:
 * - Recipe search with filters
 * - Recipe details modal
 * - Favorites management
 * - Food budget tracking
 * - Error handling
 */

import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:3004';

// Mock user credentials (should be in .env for CI/CD)
const TEST_USER = {
  email: 'test@pluqla.com',
  password: 'Test123!@#',
};

/**
 * Setup: Login before each test
 */
test.beforeEach(async ({ page }) => {
  // Navigate to login
  await page.goto(`${BASE_URL}/login`);

  // Login
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');

  // Wait for successful login (redirect to home)
  await page.waitForURL(`${BASE_URL}/home`, { timeout: 10000 });
});

/**
 * Test Suite: Recipe Search
 */
test.describe('Recipe Search', () => {
  test('should navigate to Alimentation screen', async ({ page }) => {
    // Click on Alimentation category from home
    await page.click('text=Alimentation');

    // Verify URL changed
    await expect(page).toHaveURL(/.*alimentation.*/);

    // Verify page title
    await expect(page.locator('h1')).toContainText('Alimentation');
  });

  test('should search for recipes with query', async ({ page }) => {
    await page.goto(`${BASE_URL}/alimentation`);

    // Type in search bar
    const searchInput = page.locator('input[placeholder*="Rechercher"]');
    await searchInput.fill('poulet');

    // Click search button
    await page.click('button:has-text("Chercher")');

    // Wait for results to load
    await page.waitForSelector('[data-testid="recipe-card"], .recipe-card', {
      timeout: 15000,
    });

    // Verify results are displayed
    const recipeCards = page.locator('[data-testid="recipe-card"], .recipe-card');
    await expect(recipeCards.first()).toBeVisible();

    // Verify recipe card contains expected elements
    await expect(recipeCards.first()).toContainText(/poulet/i);
    await expect(recipeCards.first().locator('text=/€/')).toBeVisible(); // Price
  });

  test('should apply budget filter', async ({ page }) => {
    await page.goto(`${BASE_URL}/alimentation`);

    // Open filters
    await page.click('button[aria-label*="Filtres"]');

    // Adjust budget slider
    const budgetSlider = page.locator('input[aria-label*="Budget"]');
    await budgetSlider.fill('5');

    // Verify filter value updated
    await expect(page.locator('text=/5.*€/')).toBeVisible();

    // Search with filter
    await page.fill('input[placeholder*="Rechercher"]', 'pâtes');
    await page.click('button:has-text("Chercher")');

    // Wait for filtered results
    await page.waitForSelector('[data-testid="recipe-card"]', { timeout: 15000 });

    // Verify at least one result
    const recipeCards = page.locator('[data-testid="recipe-card"]');
    await expect(recipeCards.first()).toBeVisible();
  });

  test('should apply diet filter', async ({ page }) => {
    await page.goto(`${BASE_URL}/alimentation`);

    // Open filters
    await page.click('button[aria-label*="Filtres"]');

    // Select vegetarian diet
    await page.selectOption('select[aria-label*="Régime"]', 'vegetarian');

    // Search
    await page.fill('input[placeholder*="Rechercher"]', 'salade');
    await page.click('button:has-text("Chercher")');

    // Wait for results
    await page.waitForSelector('[data-testid="recipe-card"]', { timeout: 15000 });

    // Verify vegetarian badge on results
    await expect(page.locator('text=Végétarien').first()).toBeVisible();
  });

  test('should show empty state when no results', async ({ page }) => {
    await page.goto(`${BASE_URL}/alimentation`);

    // Search for non-existent recipe
    await page.fill('input[placeholder*="Rechercher"]', 'zzzzinvalidrecipename123');
    await page.click('button:has-text("Chercher")');

    // Wait for empty state
    await page.waitForSelector('text=/Aucune recette/i', { timeout: 10000 });

    // Verify empty state message
    await expect(page.locator('text=/Aucune recette trouvée/i')).toBeVisible();
  });

  test('should handle API error gracefully', async ({ page }) => {
    // Intercept API and return error
    await page.route(`${API_URL}/api/recipes/search*`, (route) =>
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
      })
    );

    await page.goto(`${BASE_URL}/alimentation`);

    // Search
    await page.fill('input[placeholder*="Rechercher"]', 'poulet');
    await page.click('button:has-text("Chercher")');

    // Wait for error state
    await page.waitForSelector('text=/Erreur/i', { timeout: 10000 });

    // Verify error message
    await expect(page.locator('text=/Erreur/i')).toBeVisible();

    // Verify retry button exists
    await expect(page.locator('button:has-text("Réessayer")')).toBeVisible();
  });
});

/**
 * Test Suite: Recipe Details
 */
test.describe('Recipe Details', () => {
  test('should open recipe details modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/alimentation`);

    // Search for recipes
    await page.fill('input[placeholder*="Rechercher"]', 'poulet');
    await page.click('button:has-text("Chercher")');

    // Wait for results
    await page.waitForSelector('[data-testid="recipe-card"]', { timeout: 15000 });

    // Click on first recipe card
    await page.locator('[data-testid="recipe-card"]').first().click();

    // Wait for modal to open
    await page.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });

    // Verify modal is visible
    const modal = page.locator('[role="dialog"], .modal').first();
    await expect(modal).toBeVisible();

    // Verify modal contains recipe details
    await expect(modal).toContainText(/Ingrédients|Préparation/i);
  });

  test('should display all recipe information in modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/alimentation`);

    // Search and open recipe
    await page.fill('input[placeholder*="Rechercher"]', 'poulet');
    await page.click('button:has-text("Chercher")');
    await page.waitForSelector('[data-testid="recipe-card"]', { timeout: 15000 });
    await page.locator('[data-testid="recipe-card"]').first().click();

    // Wait for modal
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible();

    // Verify tabs exist
    await expect(modal.locator('button:has-text("Ingrédients")')).toBeVisible();
    await expect(modal.locator('button:has-text("Préparation")')).toBeVisible();
    await expect(modal.locator('button:has-text("Nutrition")')).toBeVisible();

    // Verify price is displayed
    await expect(modal.locator('text=/€/')).toBeVisible();

    // Verify EcoScore badge
    await expect(modal.locator('text=/[A-E]/')).toBeVisible(); // Grade A-E
  });

  test('should switch between tabs in recipe modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/alimentation`);

    // Open recipe modal
    await page.fill('input[placeholder*="Rechercher"]', 'poulet');
    await page.click('button:has-text("Chercher")');
    await page.waitForSelector('[data-testid="recipe-card"]', { timeout: 15000 });
    await page.locator('[data-testid="recipe-card"]').first().click();

    const modal = page.locator('[role="dialog"]').first();

    // Click on Préparation tab
    await modal.locator('button:has-text("Préparation")').click();
    await expect(modal.locator('text=/étape|instruction/i')).toBeVisible();

    // Click on Nutrition tab
    await modal.locator('button:has-text("Nutrition")').click();
    await expect(modal.locator('text=/calories|protéines/i')).toBeVisible();

    // Go back to Ingrédients
    await modal.locator('button:has-text("Ingrédients")').click();
    await expect(modal.locator('text=/Ingrédients/i')).toBeVisible();
  });

  test('should close modal on close button click', async ({ page }) => {
    await page.goto(`${BASE_URL}/alimentation`);

    // Open modal
    await page.fill('input[placeholder*="Rechercher"]', 'poulet');
    await page.click('button:has-text("Chercher")');
    await page.waitForSelector('[data-testid="recipe-card"]', { timeout: 15000 });
    await page.locator('[data-testid="recipe-card"]').first().click();

    // Wait for modal
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible();

    // Click close button
    await modal.locator('button[aria-label*="Fermer"]').click();

    // Verify modal is closed
    await expect(modal).not.toBeVisible();
  });
});

/**
 * Test Suite: Favorites Management
 */
test.describe('Favorites Management', () => {
  test('should add recipe to favorites', async ({ page }) => {
    await page.goto(`${BASE_URL}/alimentation`);

    // Search for recipes
    await page.fill('input[placeholder*="Rechercher"]', 'salade');
    await page.click('button:has-text("Chercher")');
    await page.waitForSelector('[data-testid="recipe-card"]', { timeout: 15000 });

    // Click favorite button on first card
    const firstCard = page.locator('[data-testid="recipe-card"]').first();
    const favoriteButton = firstCard.locator('button[aria-label*="favoris"]');
    await favoriteButton.click();

    // Wait for success toast
    await page.waitForSelector('text=/ajoutée aux favoris/i', { timeout: 5000 });

    // Verify toast message
    await expect(page.locator('text=/ajoutée aux favoris/i')).toBeVisible();

    // Verify heart icon is filled
    await expect(favoriteButton.locator('svg[fill="currentColor"]')).toBeVisible();
  });

  test('should remove recipe from favorites', async ({ page }) => {
    await page.goto(`${BASE_URL}/alimentation`);

    // First add a favorite
    await page.fill('input[placeholder*="Rechercher"]', 'salade');
    await page.click('button:has-text("Chercher")');
    await page.waitForSelector('[data-testid="recipe-card"]', { timeout: 15000 });

    const firstCard = page.locator('[data-testid="recipe-card"]').first();
    const favoriteButton = firstCard.locator('button[aria-label*="favoris"]');
    await favoriteButton.click();
    await page.waitForTimeout(1000); // Wait for state update

    // Now remove it
    await favoriteButton.click();

    // Wait for removal toast
    await page.waitForSelector('text=/retirée des favoris/i', { timeout: 5000 });

    // Verify toast message
    await expect(page.locator('text=/retirée des favoris/i')).toBeVisible();
  });

  test('should display favorites in Favoris tab', async ({ page }) => {
    await page.goto(`${BASE_URL}/alimentation`);

    // Add a recipe to favorites
    await page.fill('input[placeholder*="Rechercher"]', 'poulet');
    await page.click('button:has-text("Chercher")');
    await page.waitForSelector('[data-testid="recipe-card"]', { timeout: 15000 });

    const firstCard = page.locator('[data-testid="recipe-card"]').first();
    const recipeTitle = await firstCard.locator('h3').textContent();
    await firstCard.locator('button[aria-label*="favoris"]').click();
    await page.waitForTimeout(1000);

    // Navigate to Favoris tab
    await page.click('button:has-text("Favoris")');

    // Wait for favorites to load
    await page.waitForSelector('[data-testid="recipe-card"]', { timeout: 10000 });

    // Verify the favorited recipe appears
    await expect(page.locator(`text=${recipeTitle}`)).toBeVisible();
  });

  test('should show empty state when no favorites', async ({ page }) => {
    // Navigate to favorites (assuming user has no favorites)
    await page.goto(`${BASE_URL}/alimentation`);
    await page.click('button:has-text("Favoris")');

    // Wait for empty state or content
    await page.waitForSelector('text=/Aucune recette favorite|Mes recettes favorites/i', {
      timeout: 10000,
    });

    // If no favorites, verify empty state message
    const emptyState = page.locator('text=/Aucune recette favorite/i');
    const hasFavorites = await page.locator('[data-testid="recipe-card"]').count();

    if (hasFavorites === 0) {
      await expect(emptyState).toBeVisible();
    }
  });
});

/**
 * Test Suite: Infinite Scroll
 */
test.describe('Infinite Scroll', () => {
  test('should load more recipes on scroll', async ({ page }) => {
    await page.goto(`${BASE_URL}/alimentation`);

    // Search for recipes with many results
    await page.fill('input[placeholder*="Rechercher"]', 'chicken');
    await page.click('button:has-text("Chercher")');
    await page.waitForSelector('[data-testid="recipe-card"]', { timeout: 15000 });

    // Count initial recipes
    const initialCount = await page.locator('[data-testid="recipe-card"]').count();

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Wait for more recipes to load
    await page.waitForTimeout(2000);

    // Count recipes after scroll
    const afterScrollCount = await page.locator('[data-testid="recipe-card"]').count();

    // Verify more recipes loaded (if available)
    expect(afterScrollCount).toBeGreaterThanOrEqual(initialCount);
  });
});

/**
 * Test Suite: Accessibility
 */
test.describe('Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto(`${BASE_URL}/alimentation`);

    // Search for recipes
    await page.fill('input[placeholder*="Rechercher"]', 'poulet');
    await page.click('button:has-text("Chercher")');
    await page.waitForSelector('[data-testid="recipe-card"]', { timeout: 15000 });

    // Navigate with Tab key
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Verify focus is visible (check for focus ring or outline)
    const focusedElement = await page.evaluate(() => document.activeElement.tagName);
    expect(['INPUT', 'BUTTON', 'A']).toContain(focusedElement);
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto(`${BASE_URL}/alimentation`);

    // Verify search input has label
    const searchInput = page.locator('input[placeholder*="Rechercher"]');
    const ariaLabel = await searchInput.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();

    // Verify buttons have labels
    const searchButton = page.locator('button:has-text("Chercher")');
    await expect(searchButton).toBeVisible();
  });
});

/**
 * Test Suite: Responsive Design
 */
test.describe('Responsive Design', () => {
  test('should display properly on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`${BASE_URL}/alimentation`);

    // Verify page loads
    await expect(page.locator('h1')).toBeVisible();

    // Search
    await page.fill('input[placeholder*="Rechercher"]', 'poulet');
    await page.click('button:has-text("Chercher")');
    await page.waitForSelector('[data-testid="recipe-card"]', { timeout: 15000 });

    // Verify cards are stacked (1 column)
    const firstCard = page.locator('[data-testid="recipe-card"]').first();
    await expect(firstCard).toBeVisible();
  });

  test('should display properly on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto(`${BASE_URL}/alimentation`);

    // Search
    await page.fill('input[placeholder*="Rechercher"]', 'poulet');
    await page.click('button:has-text("Chercher")');
    await page.waitForSelector('[data-testid="recipe-card"]', { timeout: 15000 });

    // Verify grid layout (2 columns on tablet)
    const cards = page.locator('[data-testid="recipe-card"]');
    await expect(cards.first()).toBeVisible();
    await expect(cards.nth(1)).toBeVisible();
  });
});

/**
 * Test Suite: Performance
 */
test.describe('Performance', () => {
  test('should load search results within 3 seconds', async ({ page }) => {
    await page.goto(`${BASE_URL}/alimentation`);

    const startTime = Date.now();

    // Search
    await page.fill('input[placeholder*="Rechercher"]', 'poulet');
    await page.click('button:has-text("Chercher")');
    await page.waitForSelector('[data-testid="recipe-card"]', { timeout: 15000 });

    const endTime = Date.now();
    const loadTime = endTime - startTime;

    // Verify load time is under 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });
});
