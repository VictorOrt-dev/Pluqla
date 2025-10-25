/**
 * Transport Feature E2E Tests
 *
 * Tests the complete transport feature flow:
 * - Create a trip
 * - Track a trip
 * - View history
 * - Optimize a route
 */

import { test, expect } from '@playwright/test';

test.describe('Transport Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Login first (assuming auth is required)
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpassword');
    await page.click('[type="submit"]');
    await page.waitForURL('/');

    // Navigate to transport screen
    await page.click('[data-testid="transport-category"]');
    await expect(page).toHaveURL(/.*deplacement/);
  });

  test('should display transport screen with tabs', async ({ page }) => {
    // Check header
    await expect(page.locator('text=🚗 Déplacement')).toBeVisible();
    await expect(page.locator('text=Optimisez vos trajets avec l\'IA')).toBeVisible();

    // Check category tabs
    await expect(page.locator('text=Suivi Transport')).toBeVisible();
    await expect(page.locator('text=Optimisation')).toBeVisible();

    // Check "Nouveau trajet" button
    await expect(page.locator('button:has-text("Nouveau trajet")')).toBeVisible();
  });

  test('should create a new trip', async ({ page }) => {
    // Click "Nouveau trajet" button
    await page.click('button:has-text("Nouveau trajet")');

    // Modal should open
    await expect(page.locator('text=🚗 Nouveau Trajet')).toBeVisible();

    // Fill form
    await page.fill('[name="name"]', 'Domicile → Bureau');
    await page.fill('[name="origin"]', '15 Rue de la Paix, Paris');
    await page.fill('[name="destination"]', '10 Avenue des Champs, Paris');
    await page.fill('[name="distanceKm"]', '12.5');
    await page.check('[name="recurring"]');

    // Submit
    await page.click('button:has-text("Créer le trajet")');

    // Success notification
    await expect(page.locator('text=Trajet créé avec succès')).toBeVisible({ timeout: 5000 });

    // Trip should appear in list
    await expect(page.locator('text=Domicile → Bureau')).toBeVisible();
    await expect(page.locator('text=15 Rue de la Paix, Paris')).toBeVisible();
    await expect(page.locator('text=10 Avenue des Champs, Paris')).toBeVisible();
    await expect(page.locator('text=📏 12.5 km')).toBeVisible();
    await expect(page.locator('text=Quotidien')).toBeVisible();
  });

  test('should validate trip creation form', async ({ page }) => {
    // Click "Nouveau trajet" button
    await page.click('button:has-text("Nouveau trajet")');

    // Try to submit empty form
    await page.click('button:has-text("Créer le trajet")');

    // Validation errors should appear
    await expect(page.locator('text=Le nom du trajet est requis')).toBeVisible();
    await expect(page.locator('text=L\'origine est requise')).toBeVisible();
    await expect(page.locator('text=La destination est requise')).toBeVisible();
  });

  test('should track a trip', async ({ page }) => {
    // Assuming a trip exists
    // Click "Démarrer" on a trip
    const startButton = page.locator('button:has-text("Démarrer")').first();
    await startButton.click();

    // "Trajet en cours" banner should appear
    await expect(page.locator('text=🚀 Trajet en cours')).toBeVisible();
    await expect(page.locator('button:has-text("Terminer")')).toBeVisible();

    // Other start buttons should be disabled
    await expect(page.locator('button:has-text("En cours...")').first()).toBeDisabled();

    // End trip
    await page.click('button:has-text("Terminer")');

    // Success notification
    await expect(page.locator('text=Trajet')).toBeVisible();
    await expect(page.locator('text=terminé')).toBeVisible();

    // Banner should disappear
    await expect(page.locator('text=🚀 Trajet en cours')).not.toBeVisible();
  });

  test('should display trip history', async ({ page }) => {
    // Switch to "Suivi Transport" tab if not already there
    await page.click('button:has-text("Suivi Transport")');

    // Check history section
    await expect(page.locator('text=📋 Historique des Trajets')).toBeVisible();

    // If trips exist, they should be displayed
    const hasTrips = await page.locator('text=Aucun trajet enregistré').isVisible();

    if (!hasTrips) {
      // Check that trip cards are displayed
      const tripCards = page.locator('[class*="border rounded-xl p-4"]');
      await expect(tripCards.first()).toBeVisible();
    }
  });

  test('should paginate trip history', async ({ page }) => {
    // Assuming more than 20 trips exist
    await page.click('button:has-text("Suivi Transport")');

    // Check for pagination controls
    const nextButton = page.locator('button:has-text("Suivant →")');
    const prevButton = page.locator('button:has-text("← Précédent")');

    if (await nextButton.isVisible()) {
      // Previous should be disabled on first page
      await expect(prevButton).toBeDisabled();

      // Click next
      await nextButton.click();

      // Previous should now be enabled
      await expect(prevButton).not.toBeDisabled();

      // Page 2 button should be active
      await expect(page.locator('button:has-text("2")[class*="from-red-500"]')).toBeVisible();
    }
  });

  test('should optimize a route with AI', async ({ page }) => {
    // Switch to "Optimisation" tab
    await page.click('button:has-text("Optimisation")');

    // Check optimizer header
    await expect(page.locator('text=🎯 Optimiseur de trajets IA')).toBeVisible();

    // Find a trip with distance and click "Optimiser"
    const optimizeButton = page.locator('button:has-text("Optimiser")').first();

    if (await optimizeButton.isVisible()) {
      await optimizeButton.click();

      // Loading state
      await expect(page.locator('text=%').first()).toBeVisible({ timeout: 2000 });

      // Wait for result (timeout 10s)
      await expect(page.locator('text=Meilleure option')).toBeVisible({ timeout: 10000 });

      // Check result details
      await expect(page.locator('text=Coût estimé')).toBeVisible();
      await expect(page.locator('text=CO2')).toBeVisible();
      await expect(page.locator('text=Économies')).toBeVisible();

      // Check "Voir toutes les options" detail
      const detailsButton = page.locator('summary:has-text("Voir toutes les options")');
      if (await detailsButton.isVisible()) {
        await detailsButton.click();
        // Multiple transport modes should be visible
        await expect(page.locator('text=€').count()).toBeGreaterThan(3);
      }
    }
  });

  test('should show warning for trips without distance', async ({ page }) => {
    // Create a trip without distance
    await page.click('button:has-text("Nouveau trajet")');
    await page.fill('[name="name"]', 'Test Trip No Distance');
    await page.fill('[name="origin"]', 'Paris');
    await page.fill('[name="destination"]', 'Lyon');
    // Don't fill distance
    await page.click('button:has-text("Créer le trajet")');

    // Go to optimization tab
    await page.click('button:has-text("Optimisation")');

    // Warning should be visible
    await expect(page.locator('text=Certains trajets n\'ont pas de distance')).toBeVisible();
  });

  test('should display monthly stats', async ({ page }) => {
    // Switch to "Suivi Transport" tab
    await page.click('button:has-text("Suivi Transport")');

    // Check stats section
    await expect(page.locator('text=📊 Stats du mois')).toBeVisible();
    await expect(page.locator('text=Coût total')).toBeVisible();
    await expect(page.locator('text=Trajets')).toBeVisible();
    await expect(page.locator('text=Moy./trajet')).toBeVisible();
    await expect(page.locator('text=CO2')).toBeVisible();

    // Stats should display numbers
    const costElement = page.locator('text=/\\d+\\.\\d+€/').first();
    await expect(costElement).toBeVisible();
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Try to optimize without network (simulate error)
    await page.route('**/api/transport-optimize', route => {
      route.abort();
    });

    await page.click('button:has-text("Optimisation")');
    const optimizeButton = page.locator('button:has-text("Optimiser")').first();

    if (await optimizeButton.isVisible()) {
      await optimizeButton.click();

      // Error notification should appear
      await expect(page.locator('text=/erreur|échec/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should sanitize HTML in trip names (XSS protection)', async ({ page }) => {
    // Try to create a trip with HTML/JS in name
    await page.click('button:has-text("Nouveau trajet")');
    await page.fill('[name="name"]', '<script>alert("XSS")</script>Test');
    await page.fill('[name="origin"]', 'Paris');
    await page.fill('[name="destination"]', 'Lyon');
    await page.fill('[name="distanceKm"]', '10');
    await page.click('button:has-text("Créer le trajet")');

    // Script should not execute (no alert dialog)
    const dialogs: any[] = [];
    page.on('dialog', dialog => dialogs.push(dialog));

    // Wait a bit
    await page.waitForTimeout(1000);

    // No alert should have appeared
    expect(dialogs.length).toBe(0);

    // HTML should be escaped/sanitized in display
    // The raw HTML tags should not be rendered as HTML
    const tripCard = page.locator('[class*="border rounded-xl p-4"]').first();
    const html = await tripCard.innerHTML();
    expect(html).not.toContain('<script>');
  });
});
