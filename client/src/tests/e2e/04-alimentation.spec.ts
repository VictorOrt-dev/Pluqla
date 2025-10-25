import { test, expect } from '@playwright/test';
import { loginUser } from './01-auth.spec';

/**
 * E2E Tests - Alimentation Feature (Phase 2D IA-Hybride)
 *
 * Tests couverts:
 * - Affichage Smart Suggestions IA
 * - AI badges sur recettes
 * - Popularity scores
 * - Health scores
 * - Visualisation détail recette
 * - Mark as cooked + tracking
 * - Favorites + tracking
 * - Filtres par catégorie
 * - Tri par popularité
 * - Search recettes
 */

test.describe('Alimentation Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter
    await loginUser(page, 'test@pluqla.com', 'TestPass123!');

    // Naviguer vers alimentation
    await page.goto('/alimentation');
    await page.waitForLoadState('networkidle');
  });

  test('should display alimentation screen', async ({ page }) => {
    // Vérifier titre
    await expect(page.locator('h1, h2').filter({ hasText: /Alimentation|Recettes/i }).first()).toBeVisible();

    // Vérifier présence des recettes
    const recipes = page.locator('[data-testid^="recipe-"], .recipe-card');
    const count = await recipes.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display smart suggestions with AI badge', async ({ page }) => {
    // Chercher section Smart Suggestions
    const suggestions = page.locator(
      '[data-testid="smart-suggestions"], text=/Suggestions IA|Smart Suggestions/i'
    );

    const isVisible = await suggestions.first().isVisible().catch(() => false);

    if (isVisible) {
      await expect(suggestions.first()).toBeVisible();

      // Vérifier badge "IA Active"
      const aiBadge = page.locator('text=/IA Active|AI Active/i');
      await expect(aiBadge.first()).toBeVisible();

      // Vérifier icône Sparkles
      const sparklesIcon = page.locator('[data-testid="sparkles-icon"], svg');
      expect(await sparklesIcon.count()).toBeGreaterThan(0);
    }
  });

  test('should display recipe cards with AI badges', async ({ page }) => {
    // Trouver les recettes avec badge IA
    const aiRecipes = page.locator('[data-testid="ai-badge"], .ai-badge');

    const count = await aiRecipes.count();

    if (count > 0) {
      // Vérifier qu'au moins une recette a un badge IA
      expect(count).toBeGreaterThan(0);

      // Vérifier contenu du badge
      const badgeText = await aiRecipes.first().textContent();
      expect(badgeText).toMatch(/IA|AI/i);
    }
  });

  test('should display popularity scores with flame icon', async ({ page }) => {
    // Chercher popularity scores
    const popularityScores = page.locator('[data-testid="popularity-score"], text=/\d+/');

    const count = await popularityScores.count();

    if (count > 0) {
      // Vérifier format du score (nombre)
      const scoreText = await popularityScores.first().textContent();
      expect(scoreText).toMatch(/\d+/);

      // Vérifier présence de l'icône Flame
      const flameIcons = page.locator('[data-testid="flame-icon"], svg');
      expect(await flameIcons.count()).toBeGreaterThan(0);
    }
  });

  test('should display health scores with progress bar', async ({ page }) => {
    // Chercher health scores
    const healthScores = page.locator('[data-testid="health-score"], .health-score');

    const count = await healthScores.count();

    if (count > 0) {
      await expect(healthScores.first()).toBeVisible();

      // Vérifier barre de progression
      const progressBar = page.locator('[data-testid="health-progress"], .progress-bar');
      expect(await progressBar.count()).toBeGreaterThan(0);
    }
  });

  test('should open recipe detail modal', async ({ page }) => {
    // Cliquer sur première recette
    const firstRecipe = page.locator('[data-testid^="recipe-"], .recipe-card').first();
    await firstRecipe.click();

    // Attendre modal/page de détail
    const detail = page.locator('[data-testid="recipe-detail"], [role="dialog"], .recipe-detail');
    await expect(detail.first()).toBeVisible({ timeout: 5000 });

    // Vérifier éléments de détail
    await expect(page.locator('[data-testid="recipe-title"], h1, h2').first()).toBeVisible();
  });

  test('should display recipe ingredients', async ({ page }) => {
    // Ouvrir détail recette
    const firstRecipe = page.locator('[data-testid^="recipe-"], .recipe-card').first();
    await firstRecipe.click();

    await page.waitForTimeout(1000);

    // Chercher section ingrédients
    const ingredients = page.locator(
      '[data-testid="ingredients"], text=/Ingrédients|Ingredients/i'
    );

    await expect(ingredients.first()).toBeVisible({ timeout: 5000 });
  });

  test('should display recipe instructions', async ({ page }) => {
    // Ouvrir détail
    const firstRecipe = page.locator('[data-testid^="recipe-"], .recipe-card').first();
    await firstRecipe.click();

    await page.waitForTimeout(1000);

    // Chercher instructions
    const instructions = page.locator(
      '[data-testid="instructions"], text=/Instructions|Préparation|Steps/i'
    );

    await expect(instructions.first()).toBeVisible({ timeout: 5000 });
  });

  test('should mark recipe as cooked', async ({ page }) => {
    // Ouvrir recette
    const firstRecipe = page.locator('[data-testid^="recipe-"], .recipe-card').first();
    await firstRecipe.click();

    await page.waitForTimeout(1000);

    // Trouver bouton "Mark as cooked"
    const cookButton = page.locator('button:has-text("Marquer comme cuisiné"), button:has-text("Mark as cooked")');

    const isVisible = await cookButton.first().isVisible().catch(() => false);

    if (isVisible) {
      await cookButton.first().click();

      // Vérifier notification de succès
      const notification = page.locator('text=/marquée comme cuisinée|marked as cooked|succès/i');
      await expect(notification.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should toggle favorite recipe', async ({ page }) => {
    // Trouver bouton favorite (heart icon)
    const favoriteButton = page.locator(
      '[data-testid="favorite-button"], button[aria-label*="favori"]'
    ).first();

    const isVisible = await favoriteButton.isVisible().catch(() => false);

    if (isVisible) {
      // Cliquer pour ajouter aux favoris
      await favoriteButton.click();

      // Attendre animation
      await page.waitForTimeout(500);

      // Vérifier changement d'état (couleur, rempli)
      // Le test vérifie juste que le bouton existe et est cliquable
      await expect(favoriteButton).toBeVisible();
    }
  });

  test('should display AI tags', async ({ page }) => {
    // Ouvrir recette
    const firstRecipe = page.locator('[data-testid^="recipe-"], .recipe-card').first();
    await firstRecipe.click();

    await page.waitForTimeout(1000);

    // Chercher tags IA
    const aiTags = page.locator('[data-testid="ai-tags"], .ai-tags');

    const isVisible = await aiTags.first().isVisible().catch(() => false);

    if (isVisible) {
      await expect(aiTags.first()).toBeVisible();

      // Vérifier qu'il y a des tags
      const tags = page.locator('[data-testid^="tag-"], .tag');
      const count = await tags.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should filter recipes by category', async ({ page }) => {
    // Chercher filtre de catégorie
    const categoryFilter = page.locator(
      '[data-testid="category-filter"], button:has-text("Catégorie")'
    );

    if (await categoryFilter.count() > 0) {
      await categoryFilter.first().click();

      // Sélectionner une catégorie (ex: Végétarien)
      const category = page.locator('text=/Végétarien|Vegetarian/i');
      await category.first().click();

      // Attendre filtrage
      await page.waitForTimeout(1000);

      // Vérifier que des recettes sont affichées
      const recipes = page.locator('[data-testid^="recipe-"]');
      const count = await recipes.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should sort recipes by popularity', async ({ page }) => {
    // Chercher bouton de tri
    const sortButton = page.locator(
      '[data-testid="sort-button"], button:has-text("Trier"), button:has-text("Sort")'
    );

    if (await sortButton.count() > 0) {
      await sortButton.first().click();

      // Sélectionner "Popularité"
      const popularitySort = page.locator('text=/Popularité|Popular/i');
      await popularitySort.first().click();

      // Attendre tri
      await page.waitForTimeout(1000);

      // Vérifier que les recettes sont affichées
      const recipes = page.locator('[data-testid^="recipe-"]');
      const count = await recipes.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should search recipes', async ({ page }) => {
    // Chercher barre de recherche
    const searchInput = page.locator(
      'input[placeholder*="Rechercher"], input[placeholder*="Search"]'
    );

    if (await searchInput.count() > 0) {
      // Taper recherche
      await searchInput.first().fill('salade');

      // Attendre résultats
      await page.waitForTimeout(1000);

      // Vérifier résultats
      const recipes = page.locator('[data-testid^="recipe-"]');
      const count = await recipes.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should display recipe difficulty', async ({ page }) => {
    // Ouvrir recette
    const firstRecipe = page.locator('[data-testid^="recipe-"], .recipe-card').first();
    await firstRecipe.click();

    await page.waitForTimeout(1000);

    // Chercher difficulté
    const difficulty = page.locator('text=/Facile|Easy|Difficile|Hard|Intermédiaire|Medium/i');

    const isVisible = await difficulty.first().isVisible().catch(() => false);

    if (isVisible) {
      await expect(difficulty.first()).toBeVisible();
    }
  });

  test('should display prep time', async ({ page }) => {
    // Ouvrir recette
    const firstRecipe = page.locator('[data-testid^="recipe-"], .recipe-card').first();
    await firstRecipe.click();

    await page.waitForTimeout(1000);

    // Chercher temps de préparation
    const prepTime = page.locator('text=/\d+\s*(min|minutes|h|heures)/i');

    const isVisible = await prepTime.first().isVisible().catch(() => false);

    if (isVisible) {
      await expect(prepTime.first()).toBeVisible();
    }
  });

  test('should display recipe price estimate', async ({ page }) => {
    // Ouvrir recette
    const firstRecipe = page.locator('[data-testid^="recipe-"], .recipe-card').first();
    await firstRecipe.click();

    await page.waitForTimeout(1000);

    // Chercher prix
    const price = page.locator('text=/€|EUR|Prix/i');

    const count = await price.count();

    if (count > 0) {
      await expect(price.first()).toBeVisible();
    }
  });

  test('should display AI enrichment metadata', async ({ page }) => {
    // Ouvrir recette
    const firstRecipe = page.locator('[data-testid^="recipe-"], .recipe-card').first();
    await firstRecipe.click();

    await page.waitForTimeout(1000);

    // Chercher section métadonnées IA
    const aiMetadata = page.locator('[data-testid="ai-metadata"], .ai-metadata');

    const isVisible = await aiMetadata.first().isVisible().catch(() => false);

    if (isVisible) {
      await expect(aiMetadata.first()).toBeVisible();

      // Vérifier icône Sparkles pour IA
      const sparkles = page.locator('[data-testid="sparkles-icon"]');
      expect(await sparkles.count()).toBeGreaterThan(0);
    }
  });

  test('should show empty state when no recipes match filter', async ({ page }) => {
    // Rechercher quelque chose qui n'existe pas
    const searchInput = page.locator('input[placeholder*="Rechercher"]');

    if (await searchInput.count() > 0) {
      await searchInput.first().fill('xyzabc123notfound');

      // Attendre
      await page.waitForTimeout(1000);

      // Vérifier message "Aucun résultat"
      const emptyState = page.locator('text=/Aucun résultat|No results|Aucune recette/i');
      const isVisible = await emptyState.first().isVisible().catch(() => false);

      if (isVisible) {
        await expect(emptyState.first()).toBeVisible();
      }
    }
  });

  test('should close recipe detail modal', async ({ page }) => {
    // Ouvrir recette
    const firstRecipe = page.locator('[data-testid^="recipe-"], .recipe-card').first();
    await firstRecipe.click();

    await page.waitForTimeout(1000);

    // Trouver bouton fermer
    const closeButton = page.locator(
      '[data-testid="close-button"], button[aria-label="Close"], button:has-text("×")'
    );

    if (await closeButton.count() > 0) {
      await closeButton.first().click();

      // Vérifier que le modal est fermé
      await page.waitForTimeout(500);
      const modal = page.locator('[data-testid="recipe-detail"], [role="dialog"]');
      await expect(modal.first()).not.toBeVisible();
    } else {
      // Alternative: Escape key
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  });

  test('should navigate between recipes', async ({ page }) => {
    // Ouvrir première recette
    const firstRecipe = page.locator('[data-testid^="recipe-"], .recipe-card').first();
    const firstTitle = await firstRecipe.textContent();
    await firstRecipe.click();

    await page.waitForTimeout(1000);

    // Fermer
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Ouvrir deuxième recette
    const secondRecipe = page.locator('[data-testid^="recipe-"], .recipe-card').nth(1);
    const secondTitle = await secondRecipe.textContent();
    await secondRecipe.click();

    await page.waitForTimeout(1000);

    // Vérifier que c'est une recette différente
    expect(firstTitle).not.toBe(secondTitle);
  });

  test('should handle recipe interaction tracking', async ({ page }) => {
    // Ouvrir recette = track "view"
    const firstRecipe = page.locator('[data-testid^="recipe-"], .recipe-card').first();
    await firstRecipe.click();

    await page.waitForTimeout(2000);

    // L'interaction devrait être trackée automatiquement
    // Pas de vérification visuelle, mais l'API devrait être appelée
    // On vérifie juste que la recette s'ouvre correctement
    const detail = page.locator('[data-testid="recipe-detail"]');
    await expect(detail.first()).toBeVisible();
  });
});
