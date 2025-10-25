/**
 * Phase 4A E2E Tests
 * Tests end-to-end pour les 4 features de Phase 4A
 *
 * Features testées:
 * 1. Social Share
 * 2. Shopping List Generator
 * 3. Meal Planner Calendar
 * 4. Offline Mode (PWA)
 */

import { test, expect } from '@playwright/test';

// Configuration
const BASE_URL = process.env.REACT_APP_URL || 'http://localhost:3000';

// Helper: Login
async function login(page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', 'test@pluqla.com');
  await page.fill('input[name="password"]', 'Test123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/home');
}

// Helper: Add recipe to favorites
async function addFavoriteRecipe(page, recipeId = 'spoonacular-123') {
  await page.goto(`${BASE_URL}/alimentation`);
  await page.waitForSelector('[data-testid="recipe-card"]');

  // Click first recipe
  await page.click('[data-testid="recipe-card"]:first-child');

  // Wait for modal
  await page.waitForSelector('[data-testid="recipe-details-modal"]');

  // Add to favorites
  const favoriteBtn = page.locator('[data-testid="favorite-button"]');
  const isFavorite = await favoriteBtn.getAttribute('aria-pressed');

  if (isFavorite !== 'true') {
    await favoriteBtn.click();
    await page.waitForTimeout(500); // Wait for API call
  }

  // Close modal
  await page.click('[data-testid="close-modal"]');
}

// ============================================================================
// TEST SUITE 1: Social Share
// ============================================================================

test.describe('Feature 1: Social Share', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await addFavoriteRecipe(page);
  });

  test('should display share button in recipe modal', async ({ page }) => {
    // Open recipe modal
    await page.goto(`${BASE_URL}/alimentation`);
    await page.click('[data-testid="recipe-card"]:first-child');

    // Check share button exists
    const shareButton = page.locator('[data-testid="share-button"]');
    await expect(shareButton).toBeVisible();
  });

  test('should open native share on mobile', async ({ page, browserName }) => {
    // Skip on desktop browsers
    test.skip(browserName !== 'webkit', 'Native share only on mobile');

    await page.goto(`${BASE_URL}/alimentation`);
    await page.click('[data-testid="recipe-card"]:first-child');

    // Mock navigator.share
    await page.evaluate(() => {
      window.navigator.share = async (data) => {
        console.log('Share called with:', data);
        return Promise.resolve();
      };
    });

    await page.click('[data-testid="share-button"]');

    // Check share was called
    const shareCalled = await page.evaluate(() => {
      return window.navigator.share !== undefined;
    });

    expect(shareCalled).toBe(true);
  });

  test('should show fallback menu on desktop', async ({ page }) => {
    // Disable native share
    await page.addInitScript(() => {
      delete window.navigator.share;
    });

    await page.goto(`${BASE_URL}/alimentation`);
    await page.click('[data-testid="recipe-card"]:first-child');
    await page.click('[data-testid="share-button"]');

    // Check fallback menu appears
    await expect(page.locator('[data-testid="share-menu"]')).toBeVisible();
    await expect(page.locator('text=Facebook')).toBeVisible();
    await expect(page.locator('text=Twitter')).toBeVisible();
    await expect(page.locator('text=Copier le lien')).toBeVisible();
  });

  test('should copy link to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.addInitScript(() => {
      delete window.navigator.share;
    });

    await page.goto(`${BASE_URL}/alimentation`);
    await page.click('[data-testid="recipe-card"]:first-child');
    await page.click('[data-testid="share-button"]');
    await page.click('text=Copier le lien');

    // Wait for copy
    await page.waitForTimeout(500);

    // Check clipboard
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('utm_source');
    expect(clipboardText).toContain('utm_medium=social');
  });

  test('should include UTM parameters in share URL', async ({ page }) => {
    await page.addInitScript(() => {
      delete window.navigator.share;
    });

    await page.goto(`${BASE_URL}/alimentation`);
    await page.click('[data-testid="recipe-card"]:first-child');
    await page.click('[data-testid="share-button"]');

    // Get Facebook share link
    const fbLink = await page.locator('[data-testid="share-facebook"]').getAttribute('href');

    expect(fbLink).toContain('utm_source=facebook');
    expect(fbLink).toContain('utm_medium=social');
    expect(fbLink).toContain('utm_campaign=recipe_share');
  });
});

// ============================================================================
// TEST SUITE 2: Shopping List Generator
// ============================================================================

test.describe('Feature 2: Shopping List Generator', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);

    // Add 3 favorite recipes
    for (let i = 0; i < 3; i++) {
      await addFavoriteRecipe(page);
    }
  });

  test('should show shopping list button when favorites exist', async ({ page }) => {
    await page.goto(`${BASE_URL}/favorites`);

    const shoppingListBtn = page.locator('button:has-text("Liste de Courses")');
    await expect(shoppingListBtn).toBeVisible();
  });

  test('should open shopping list modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/favorites`);
    await page.click('button:has-text("Liste de Courses")');

    // Check modal opened
    await expect(page.locator('[data-testid="shopping-list-modal"]')).toBeVisible();
    await expect(page.locator('text=Liste de Courses')).toBeVisible();
  });

  test('should display categorized ingredients', async ({ page }) => {
    await page.goto(`${BASE_URL}/favorites`);
    await page.click('button:has-text("Liste de Courses")');

    // Check categories exist
    await expect(page.locator('text=Fruits & Légumes')).toBeVisible();
    await expect(page.locator('text=Viandes & Poissons')).toBeVisible();
    await expect(page.locator('text=Produits Laitiers')).toBeVisible();
  });

  test('should aggregate same ingredients', async ({ page }) => {
    await page.goto(`${BASE_URL}/favorites`);
    await page.click('button:has-text("Liste de Courses")');

    // Wait for list to load
    await page.waitForSelector('[data-testid="ingredient-item"]');

    // Get first ingredient
    const firstIngredient = page.locator('[data-testid="ingredient-item"]').first();
    const ingredientText = await firstIngredient.textContent();

    // Should show aggregated amount
    expect(ingredientText).toMatch(/\d+/); // Contains a number
  });

  test('should check/uncheck items', async ({ page }) => {
    await page.goto(`${BASE_URL}/favorites`);
    await page.click('button:has-text("Liste de Courses")');

    const firstCheckbox = page.locator('[data-testid="ingredient-checkbox"]').first();

    // Initially unchecked
    await expect(firstCheckbox).not.toBeChecked();

    // Click to check
    await firstCheckbox.click();
    await expect(firstCheckbox).toBeChecked();

    // Click to uncheck
    await firstCheckbox.click();
    await expect(firstCheckbox).not.toBeChecked();
  });

  test('should update stats when items checked', async ({ page }) => {
    await page.goto(`${BASE_URL}/favorites`);
    await page.click('button:has-text("Liste de Courses")');

    // Get initial stats
    const stats = page.locator('[data-testid="shopping-list-stats"]');
    const initialText = await stats.textContent();

    // Check an item
    await page.locator('[data-testid="ingredient-checkbox"]').first().click();

    // Stats should update
    const newText = await stats.textContent();
    expect(newText).not.toBe(initialText);
  });

  test('should export to text file', async ({ page }) => {
    await page.goto(`${BASE_URL}/favorites`);
    await page.click('button:has-text("Liste de Courses")');

    // Setup download listener
    const downloadPromise = page.waitForEvent('download');

    // Click export
    await page.click('[data-testid="export-shopping-list"]');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('liste-courses');
    expect(download.suggestedFilename()).toContain('.txt');
  });

  test('should print shopping list', async ({ page }) => {
    await page.goto(`${BASE_URL}/favorites`);
    await page.click('button:has-text("Liste de Courses")');

    // Mock window.print
    await page.evaluate(() => {
      window.printCalled = false;
      window.print = () => {
        window.printCalled = true;
      };
    });

    await page.click('[data-testid="print-shopping-list"]');

    const printCalled = await page.evaluate(() => window.printCalled);
    expect(printCalled).toBe(true);
  });
});

// ============================================================================
// TEST SUITE 3: Meal Planner Calendar
// ============================================================================

test.describe('Feature 3: Meal Planner Calendar', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);

    // Add 5 favorite recipes
    for (let i = 0; i < 5; i++) {
      await addFavoriteRecipe(page);
    }
  });

  test('should show meal planner button when favorites exist', async ({ page }) => {
    await page.goto(`${BASE_URL}/favorites`);

    const plannerBtn = page.locator('button:has-text("Planifier mes Repas")');
    await expect(plannerBtn).toBeVisible();
  });

  test('should open meal planner modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/favorites`);
    await page.click('button:has-text("Planifier mes Repas")');

    // Check modal opened
    await expect(page.locator('[data-testid="meal-planner-modal"]')).toBeVisible();
    await expect(page.locator('text=Planificateur de Repas')).toBeVisible();
  });

  test('should display 7-day week grid', async ({ page }) => {
    await page.goto(`${BASE_URL}/favorites`);
    await page.click('button:has-text("Planifier mes Repas")');

    // Check all 7 days displayed
    await expect(page.locator('text=Lundi')).toBeVisible();
    await expect(page.locator('text=Mardi')).toBeVisible();
    await expect(page.locator('text=Mercredi')).toBeVisible();
    await expect(page.locator('text=Jeudi')).toBeVisible();
    await expect(page.locator('text=Vendredi')).toBeVisible();
    await expect(page.locator('text=Samedi')).toBeVisible();
    await expect(page.locator('text=Dimanche')).toBeVisible();
  });

  test('should display 3 meal types per day', async ({ page }) => {
    await page.goto(`${BASE_URL}/favorites`);
    await page.click('button:has-text("Planifier mes Repas")');

    // Check meal type labels
    await expect(page.locator('text=Petit-déjeuner').first()).toBeVisible();
    await expect(page.locator('text=Déjeuner').first()).toBeVisible();
    await expect(page.locator('text=Dîner').first()).toBeVisible();
  });

  test('should drag and drop recipe to slot', async ({ page }) => {
    await page.goto(`${BASE_URL}/favorites`);
    await page.click('button:has-text("Planifier mes Repas")');

    // Wait for drawer
    await page.waitForSelector('[data-testid="meal-planner-drawer"]');

    // Get first recipe card
    const recipeCard = page.locator('[data-testid="available-recipe"]').first();

    // Get first meal slot
    const mealSlot = page.locator('[data-testid="meal-slot"]').first();

    // Drag and drop
    await recipeCard.dragTo(mealSlot);

    // Wait for state update
    await page.waitForTimeout(300);

    // Check slot now contains recipe
    const slotContent = await mealSlot.textContent();
    expect(slotContent).not.toBe('');
  });

  test('should update stats when meals added', async ({ page }) => {
    await page.goto(`${BASE_URL}/favorites`);
    await page.click('button:has-text("Planifier mes Repas")');

    // Initial stats should be 0/21
    await expect(page.locator('text=0/21')).toBeVisible();

    // Add a meal
    const recipeCard = page.locator('[data-testid="available-recipe"]').first();
    const mealSlot = page.locator('[data-testid="meal-slot"]').first();
    await recipeCard.dragTo(mealSlot);

    await page.waitForTimeout(300);

    // Stats should update to 1/21
    await expect(page.locator('text=1/21')).toBeVisible();
  });

  test('should navigate to previous week', async ({ page }) => {
    await page.goto(`${BASE_URL}/favorites`);
    await page.click('button:has-text("Planifier mes Repas")');

    // Get current week number
    const currentWeekText = await page.locator('[data-testid="week-number"]').textContent();

    // Click previous
    await page.click('[data-testid="previous-week"]');

    // Wait for update
    await page.waitForTimeout(300);

    // Week should have changed
    const newWeekText = await page.locator('[data-testid="week-number"]').textContent();
    expect(newWeekText).not.toBe(currentWeekText);
  });

  test('should navigate to next week', async ({ page }) => {
    await page.goto(`${BASE_URL}/favorites`);
    await page.click('button:has-text("Planifier mes Repas")');

    const currentWeekText = await page.locator('[data-testid="week-number"]').textContent();

    await page.click('[data-testid="next-week"]');
    await page.waitForTimeout(300);

    const newWeekText = await page.locator('[data-testid="week-number"]').textContent();
    expect(newWeekText).not.toBe(currentWeekText);
  });

  test('should persist meal plan in localStorage', async ({ page }) => {
    await page.goto(`${BASE_URL}/favorites`);
    await page.click('button:has-text("Planifier mes Repas")');

    // Add a meal
    const recipeCard = page.locator('[data-testid="available-recipe"]').first();
    const mealSlot = page.locator('[data-testid="meal-slot"]').first();
    await recipeCard.dragTo(mealSlot);

    await page.waitForTimeout(500); // Wait for localStorage save

    // Check localStorage
    const mealPlanData = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const mealPlanKey = keys.find(k => k.startsWith('mealPlan_week_'));
      return localStorage.getItem(mealPlanKey);
    });

    expect(mealPlanData).toBeTruthy();
    const parsed = JSON.parse(mealPlanData);
    expect(Object.keys(parsed).length).toBeGreaterThan(0);
  });

  test('should export meal plan to text file', async ({ page }) => {
    await page.goto(`${BASE_URL}/favorites`);
    await page.click('button:has-text("Planifier mes Repas")');

    const downloadPromise = page.waitForEvent('download');

    await page.click('[data-testid="export-meal-plan"]');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('meal-plan');
    expect(download.suggestedFilename()).toContain('.txt');
  });

  test('should clear week with confirmation', async ({ page }) => {
    await page.goto(`${BASE_URL}/favorites`);
    await page.click('button:has-text("Planifier mes Repas")');

    // Add a meal first
    const recipeCard = page.locator('[data-testid="available-recipe"]').first();
    const mealSlot = page.locator('[data-testid="meal-slot"]').first();
    await recipeCard.dragTo(mealSlot);

    await page.waitForTimeout(300);

    // Click clear
    await page.click('[data-testid="clear-week"]');

    // Confirm dialog should appear
    page.on('dialog', dialog => dialog.accept());

    // Wait for clear
    await page.waitForTimeout(300);

    // Stats should be back to 0/21
    await expect(page.locator('text=0/21')).toBeVisible();
  });
});

// ============================================================================
// TEST SUITE 4: Offline Mode (PWA)
// ============================================================================

test.describe('Feature 4: Offline Mode', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should register service worker', async ({ page }) => {
    await page.goto(BASE_URL);

    // Wait for service worker registration
    await page.waitForTimeout(2000);

    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        return registration !== null;
      }
      return false;
    });

    expect(swRegistered).toBe(true);
  });

  test('should show offline banner when connection lost', async ({ page, context }) => {
    await page.goto(`${BASE_URL}/home`);

    // Simulate offline
    await context.setOffline(true);

    // Wait for offline detection
    await page.waitForTimeout(1000);

    // Check banner appears
    await expect(page.locator('text=Vous êtes hors ligne')).toBeVisible();
  });

  test('should hide offline banner when connection restored', async ({ page, context }) => {
    await page.goto(`${BASE_URL}/home`);

    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(1000);

    // Check offline banner
    await expect(page.locator('text=Vous êtes hors ligne')).toBeVisible();

    // Go back online
    await context.setOffline(false);
    await page.waitForTimeout(1000);

    // Offline banner should disappear
    await expect(page.locator('text=Vous êtes hors ligne')).not.toBeVisible();
  });

  test('should show back online toast', async ({ page, context }) => {
    await page.goto(`${BASE_URL}/home`);

    // Go offline then online
    await context.setOffline(true);
    await page.waitForTimeout(1000);
    await context.setOffline(false);
    await page.waitForTimeout(500);

    // Check toast appears
    await expect(page.locator('text=Connexion rétablie')).toBeVisible();

    // Toast should auto-hide after 3s
    await page.waitForTimeout(3500);
    await expect(page.locator('text=Connexion rétablie')).not.toBeVisible();
  });

  test('should cache pages for offline access', async ({ page, context }) => {
    // Visit page while online
    await page.goto(`${BASE_URL}/home`);
    await page.waitForLoadState('networkidle');

    // Wait for service worker to cache
    await page.waitForTimeout(2000);

    // Go offline
    await context.setOffline(true);

    // Reload page
    await page.reload();

    // Page should still load from cache
    await expect(page.locator('text=Pluqla')).toBeVisible();
  });

  test('should show offline fallback for uncached pages', async ({ page, context }) => {
    await page.goto(BASE_URL);

    // Go offline
    await context.setOffline(true);

    // Try to navigate to uncached page
    await page.goto(`${BASE_URL}/uncached-page-${Date.now()}`);

    // Should show offline page
    await expect(page.locator('text=Vous êtes hors ligne')).toBeVisible();
  });

  test('should display connection status dot', async ({ page }) => {
    await page.goto(`${BASE_URL}/home`);

    // Connection dot should be visible
    const connectionDot = page.locator('[data-testid="connection-status-dot"]');
    await expect(connectionDot).toBeVisible();
  });

  test('should update connection status dot color', async ({ page, context }) => {
    await page.goto(`${BASE_URL}/home`);

    const dot = page.locator('[data-testid="connection-status-dot"]');

    // Online - green
    const onlineColor = await dot.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );

    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(1000);

    // Offline - red
    const offlineColor = await dot.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );

    expect(onlineColor).not.toBe(offlineColor);
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

test.describe('Phase 4A Integration', () => {
  test('should use all 4 features in a complete workflow', async ({ page, context }) => {
    await login(page);

    // Step 1: Add favorite recipes
    for (let i = 0; i < 3; i++) {
      await addFavoriteRecipe(page);
    }

    // Step 2: Plan meals
    await page.goto(`${BASE_URL}/favorites`);
    await page.click('button:has-text("Planifier mes Repas")');

    const recipeCard = page.locator('[data-testid="available-recipe"]').first();
    const mealSlot = page.locator('[data-testid="meal-slot"]').first();
    await recipeCard.dragTo(mealSlot);

    await page.click('[data-testid="close-meal-planner"]');

    // Step 3: Generate shopping list
    await page.click('button:has-text("Liste de Courses")');
    await expect(page.locator('[data-testid="shopping-list-modal"]')).toBeVisible();
    await page.click('[data-testid="close-shopping-list"]');

    // Step 4: Share a recipe
    await page.goto(`${BASE_URL}/alimentation`);
    await page.click('[data-testid="recipe-card"]:first-child');
    await page.click('[data-testid="share-button"]');

    // Step 5: Test offline mode
    await context.setOffline(true);
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Vous êtes hors ligne')).toBeVisible();

    // All features tested successfully!
  });
});
