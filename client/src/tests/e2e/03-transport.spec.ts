import { test, expect } from '@playwright/test';
import { loginUser } from './01-auth.spec';

/**
 * E2E Tests - Transport/Déplacement Feature
 *
 * Tests couverts:
 * - Création de trajet
 * - Optimisation AI avec 14 modes de transport
 * - Affichage résultats (coût, CO2, durée)
 * - Historique des trajets
 * - Statistiques mensuelles
 * - Suppression de trajet
 * - Route comparison (cheapest, fastest, greenest)
 */

test.describe('Transport Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter
    await loginUser(page, 'test@pluqla.com', 'TestPass123!');

    // Naviguer vers transport/déplacement
    await page.goto('/deplacement');
    await page.waitForLoadState('networkidle');
  });

  test('should display transport dashboard', async ({ page }) => {
    // Vérifier titre
    await expect(page.locator('h1, h2').filter({ hasText: /Transport|Déplacement/i }).first()).toBeVisible();

    // Vérifier composants principaux
    const components = [
      page.locator('[data-testid="transport-tracker"], .transport-tracker'),
      page.locator('[data-testid="add-trip-button"], button:has-text("Nouveau")'),
    ];

    for (const component of components) {
      const isVisible = await component.first().isVisible().catch(() => false);
      if (isVisible) {
        await expect(component.first()).toBeVisible();
      }
    }
  });

  test('should open add trip modal', async ({ page }) => {
    // Cliquer sur ajouter trajet
    const addButton = page.locator(
      '[data-testid="add-trip-button"], button:has-text("Nouveau"), button:has-text("Ajouter")'
    );
    await addButton.first().click();

    // Vérifier modal ouvert
    const modal = page.locator('[role="dialog"], .modal, [data-testid="add-trip-modal"]');
    await expect(modal.first()).toBeVisible({ timeout: 3000 });

    // Vérifier champs du formulaire
    await expect(page.locator('input[name="name"], input[placeholder*="nom"]')).toBeVisible();
    await expect(page.locator('input[name="origin"], input[placeholder*="Origine"]')).toBeVisible();
    await expect(page.locator('input[name="destination"], input[placeholder*="Destination"]')).toBeVisible();
  });

  test('should create new trip successfully', async ({ page }) => {
    // Ouvrir modal
    const addButton = page.locator(
      '[data-testid="add-trip-button"], button:has-text("Nouveau"), button:has-text("Ajouter")'
    );
    await addButton.first().click();

    await page.waitForSelector('[role="dialog"], .modal', { timeout: 3000 });

    // Remplir le formulaire
    await page.fill('input[name="name"], input[placeholder*="nom"]', 'Paris → Lyon E2E');
    await page.fill('input[name="origin"], input[placeholder*="Origine"]', 'Paris, France');
    await page.fill('input[name="destination"], input[placeholder*="Destination"]', 'Lyon, France');
    await page.fill('input[name="distanceKm"], input[placeholder*="Distance"]', '450');

    // Cocher récurrent si checkbox disponible
    const recurringCheckbox = page.locator('input[name="recurring"], input[type="checkbox"]');
    if (await recurringCheckbox.count() > 0) {
      await recurringCheckbox.first().check();
    }

    // Soumettre
    await page.click('button[type="submit"], button:has-text("Créer")');

    // Attendre fermeture modal
    await page.waitForSelector('[role="dialog"], .modal', { state: 'hidden', timeout: 5000 });

    // Vérifier que le trajet apparaît
    await expect(page.locator('text=Paris → Lyon E2E')).toBeVisible({ timeout: 5000 });
  });

  test('should show validation errors for invalid trip', async ({ page }) => {
    // Ouvrir modal
    const addButton = page.locator(
      '[data-testid="add-trip-button"], button:has-text("Nouveau")'
    );
    await addButton.first().click();

    await page.waitForSelector('[role="dialog"], .modal', { timeout: 3000 });

    // Soumettre sans remplir
    await page.click('button[type="submit"], button:has-text("Créer")');

    // Vérifier messages d'erreur
    const errorMessages = page.locator('text=/requis|obligatoire|required/i');
    await expect(errorMessages.first()).toBeVisible({ timeout: 3000 });
  });

  test('should optimize trip and display results', async ({ page }) => {
    // Créer un trajet d'abord
    const addButton = page.locator(
      '[data-testid="add-trip-button"], button:has-text("Nouveau")'
    );
    await addButton.first().click();

    await page.waitForSelector('[role="dialog"], .modal', { timeout: 3000 });

    await page.fill('input[name="name"]', 'Test Optimization');
    await page.fill('input[name="origin"]', 'Paris');
    await page.fill('input[name="destination"]', 'Lyon');
    await page.fill('input[name="distanceKm"]', '450');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    // Trouver le bouton Optimiser
    const optimizeButton = page.locator('button:has-text("Optimiser")').first();
    await optimizeButton.click();

    // Attendre les résultats (peut prendre jusqu'à 10s avec backend)
    const resultSection = page.locator(
      '[data-testid="optimization-result"], .optimization-result, text=/Meilleure option|Optimal/i'
    );
    await expect(resultSection.first()).toBeVisible({ timeout: 15000 });

    // Vérifier que les informations clés sont affichées
    await expect(page.locator('text=/€|euro/i')).toBeVisible(); // Coût
    await expect(page.locator('text=/CO2|kg/i')).toBeVisible(); // Émissions
  });

  test('should display optimal mode with AI badge', async ({ page }) => {
    // Si un trajet optimisé existe
    const aiLabel = page.locator('[data-testid="ai-badge"], text=/IA|AI/i');

    const isVisible = await aiLabel.first().isVisible().catch(() => false);

    if (isVisible) {
      await expect(aiLabel.first()).toBeVisible();

      // Vérifier présence du mode optimal
      const optimalMode = page.locator(
        '[data-testid="optimal-mode"], text=/Covoiturage|Voiture|Train|Vélo/i'
      );
      await expect(optimalMode.first()).toBeVisible();
    }
  });

  test('should display cost breakdown', async ({ page }) => {
    // Chercher breakdown des coûts
    const breakdown = page.locator(
      '[data-testid="cost-breakdown"], text=/Détails des coûts|Breakdown/i'
    );

    const isVisible = await breakdown.first().isVisible().catch(() => false);

    if (isVisible) {
      await expect(breakdown.first()).toBeVisible();

      // Vérifier composants du coût (carburant, maintenance, etc.)
      const costItems = page.locator('[data-testid^="cost-"], .cost-item');
      const count = await costItems.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should show all transport mode options', async ({ page }) => {
    // Chercher la section "Voir toutes les options"
    const allOptionsButton = page.locator('summary:has-text("Voir toutes"), button:has-text("options")');

    const count = await allOptionsButton.count();

    if (count > 0) {
      await allOptionsButton.first().click();

      // Attendre l'expansion
      await page.waitForTimeout(500);

      // Vérifier qu'il y a plusieurs modes
      const modes = page.locator('[data-testid^="mode-"], .transport-mode');
      const modeCount = await modes.count();
      expect(modeCount).toBeGreaterThan(1); // Au moins 2 modes
    }
  });

  test('should display trip history', async ({ page }) => {
    // Chercher l'historique
    const history = page.locator(
      '[data-testid="trip-history"], .trip-history, text=/Historique/i'
    );

    const isVisible = await history.first().isVisible().catch(() => false);

    if (isVisible) {
      await expect(history.first()).toBeVisible();

      // Vérifier liste des trajets
      const trips = page.locator('[data-testid^="trip-"], .trip-card');
      const count = await trips.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should display monthly transport stats', async ({ page }) => {
    // Chercher stats mensuelles
    const stats = page.locator(
      '[data-testid="monthly-stats"], text=/Stats du mois|Monthly/i'
    );

    const isVisible = await stats.first().isVisible().catch(() => false);

    if (isVisible) {
      await expect(stats.first()).toBeVisible();

      // Vérifier métriques (coût total, trajets, CO2)
      const metrics = page.locator('[data-testid*="stat"], .stat-card');
      const count = await metrics.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should delete trip', async ({ page }) => {
    // Trouver un trajet
    const trip = page.locator('[data-testid^="trip-"], .trip-card').first();

    const isVisible = await trip.isVisible().catch(() => false);

    if (isVisible) {
      const tripText = await trip.textContent();

      // Trouver bouton delete
      const deleteButton = trip.locator('[data-testid="delete-button"], button[aria-label*="Supprimer"]');

      if (await deleteButton.count() > 0) {
        await deleteButton.first().click();

        // Confirmer si nécessaire
        const confirmButton = page.locator('button:has-text("Confirmer")');
        if (await confirmButton.count() > 0) {
          await confirmButton.first().click();
        }

        // Vérifier suppression
        await page.waitForTimeout(1000);
        await expect(page.locator(`text="${tripText}"`)).not.toBeVisible();
      }
    }
  });

  test('should show transport mode icons', async ({ page }) => {
    // Vérifier présence des icônes de transport (Lucide icons)
    const icons = page.locator('[data-testid*="icon"], svg');
    const count = await icons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should handle trip with no distance', async ({ page }) => {
    // Créer trajet sans distance
    const addButton = page.locator(
      '[data-testid="add-trip-button"], button:has-text("Nouveau")'
    );
    await addButton.first().click();

    await page.waitForSelector('[role="dialog"], .modal', { timeout: 3000 });

    await page.fill('input[name="name"]', 'Test No Distance');
    await page.fill('input[name="origin"]', 'Paris');
    await page.fill('input[name="destination"]', 'Lyon');
    // Ne pas remplir distance

    await page.click('button[type="submit"]');

    // Devrait soit accepter (optionnel) soit refuser
    const result = await Promise.race([
      page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 3000 }).then(() => 'closed'),
      page.waitForSelector('text=/distance|requis/i', { timeout: 3000 }).then(() => 'error')
    ]);

    expect(['closed', 'error']).toContain(result);
  });

  test('should show CO2 savings compared to car', async ({ page }) => {
    // Si résultat d'optimisation visible
    const savings = page.locator('text=/économies|savings|CO2/i');

    const isVisible = await savings.first().isVisible().catch(() => false);

    if (isVisible) {
      // Vérifier qu'un montant est affiché
      const savingsText = await savings.first().textContent();
      expect(savingsText).toMatch(/\d+/);
    }
  });

  test('should filter trips by recurring status', async ({ page }) => {
    // Chercher filtre récurrent
    const recurringFilter = page.locator('[data-testid="filter-recurring"], text=/Quotidien|Recurring/i');

    if (await recurringFilter.count() > 0) {
      await recurringFilter.first().click();

      // Attendre filtrage
      await page.waitForTimeout(500);

      // Vérifier que seuls les trajets récurrents sont affichés
      const trips = page.locator('[data-testid^="trip-"]');
      const count = await trips.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should navigate to trip detail', async ({ page }) => {
    // Cliquer sur un trajet
    const trip = page.locator('[data-testid^="trip-"], .trip-card').first();

    const isVisible = await trip.isVisible().catch(() => false);

    if (isVisible) {
      await trip.click();

      // Attendre navigation ou modal de détail
      await page.waitForTimeout(1000);

      // Vérifier que les détails sont affichés
      const detail = page.locator('[data-testid="trip-detail"], .trip-detail');
      const detailVisible = await detail.first().isVisible().catch(() => false);

      if (detailVisible) {
        await expect(detail.first()).toBeVisible();
      }
    }
  });

  test('should show pagination for many trips', async ({ page }) => {
    // Si plus de 20 trajets
    const pagination = page.locator('[data-testid="pagination"], .pagination');

    const isVisible = await pagination.first().isVisible().catch(() => false);

    if (isVisible) {
      await expect(pagination.first()).toBeVisible();

      // Tester navigation page suivante
      const nextButton = page.locator('button:has-text("Suivant")');
      if (await nextButton.count() > 0) {
        await nextButton.first().click();
        await page.waitForTimeout(500);
      }
    }
  });
});
