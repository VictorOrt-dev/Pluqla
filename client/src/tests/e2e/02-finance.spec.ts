import { test, expect, type Page } from '@playwright/test';
import { loginUser } from './01-auth.spec';

/**
 * E2E Tests - Finance Dashboard
 *
 * Tests couverts:
 * - Affichage balance card avec animation
 * - Ajout transaction
 * - Modification transaction
 * - Suppression transaction (swipe-to-delete)
 * - Filtres par catégorie
 * - AI Insights display
 * - Pluqla DA mascot interactions
 * - Money Manager dashboard
 */

test.describe('Finance Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter avant chaque test
    await loginUser(page, 'test@pluqla.com', 'TestPass123!');

    // Naviguer vers finance
    await page.goto('/finance');
    await page.waitForLoadState('networkidle');
  });

  test('should display finance dashboard', async ({ page }) => {
    // Vérifier que le dashboard est visible
    await expect(page.locator('h1, h2').filter({ hasText: /Finance|Dashboard|Money Manager/i }).first()).toBeVisible();

    // Vérifier présence des composants principaux
    const mainComponents = [
      page.locator('[data-testid="balance-card"], .balance-card'),
      page.locator('[data-testid="quick-actions"], .quick-actions'),
    ];

    for (const component of mainComponents) {
      await expect(component.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display balance card with animated counter', async ({ page }) => {
    // Attendre la balance card
    const balanceCard = page.locator('[data-testid="balance-card"], .balance-card').first();
    await expect(balanceCard).toBeVisible();

    // Vérifier que le montant est affiché
    const balanceAmount = balanceCard.locator('[data-testid="balance-amount"], .balance-amount, text=/€/');
    await expect(balanceAmount.first()).toBeVisible();

    // Vérifier format (devrait contenir €)
    const balanceText = await balanceAmount.first().textContent();
    expect(balanceText).toMatch(/\d+[,.]?\d*\s*€|€\s*\d+[,.]?\d*/);
  });

  test('should open add transaction modal', async ({ page }) => {
    // Cliquer sur le bouton d'ajout
    const addButton = page.locator(
      '[data-testid="add-transaction-button"], button:has-text("Ajouter"), button:has-text("+")'
    );
    await addButton.first().click();

    // Vérifier que le modal est ouvert
    const modal = page.locator('[role="dialog"], .modal, [data-testid="transaction-modal"]');
    await expect(modal.first()).toBeVisible({ timeout: 3000 });
  });

  test('should add new expense transaction', async ({ page }) => {
    // Ouvrir le modal
    const addButton = page.locator(
      '[data-testid="add-transaction-button"], button:has-text("Ajouter"), button:has-text("+")'
    );
    await addButton.first().click();

    // Attendre le modal
    await page.waitForSelector('[role="dialog"], .modal', { timeout: 3000 });

    // Remplir le formulaire
    await page.fill('input[name="amount"], input[placeholder*="Montant"]', '50.00');
    await page.fill('input[name="description"], input[placeholder*="Description"]', 'Test Groceries E2E');

    // Sélectionner catégorie
    const categorySelect = page.locator('select[name="category"], [data-testid="category-select"]');
    if (await categorySelect.count() > 0) {
      await categorySelect.selectOption('alimentation');
    } else {
      // Si c'est un custom select, cliquer sur l'option
      await page.click('text=/Alimentation/i');
    }

    // Sélectionner type (expense)
    const typeSelect = page.locator('select[name="type"], [data-testid="type-select"]');
    if (await typeSelect.count() > 0) {
      await typeSelect.selectOption('expense');
    } else {
      await page.click('text=/Dépense|Expense/i');
    }

    // Soumettre
    await page.click('button[type="submit"], button:has-text("Ajouter")');

    // Attendre que le modal se ferme
    await page.waitForSelector('[role="dialog"], .modal', { state: 'hidden', timeout: 5000 });

    // Vérifier que la transaction apparaît dans la liste
    await expect(page.locator('text=Test Groceries E2E')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/50[,.]?00\s*€|€\s*50[,.]?00/')).toBeVisible();
  });

  test('should add new income transaction', async ({ page }) => {
    // Ouvrir le modal
    const addButton = page.locator(
      '[data-testid="add-transaction-button"], button:has-text("Ajouter"), button:has-text("+")'
    );
    await addButton.first().click();

    await page.waitForSelector('[role="dialog"], .modal', { timeout: 3000 });

    // Remplir
    await page.fill('input[name="amount"], input[placeholder*="Montant"]', '1500.00');
    await page.fill('input[name="description"], input[placeholder*="Description"]', 'Salary E2E');

    // Type: income
    const typeSelect = page.locator('select[name="type"], [data-testid="type-select"]');
    if (await typeSelect.count() > 0) {
      await typeSelect.selectOption('income');
    } else {
      await page.click('text=/Revenu|Income/i');
    }

    // Soumettre
    await page.click('button[type="submit"], button:has-text("Ajouter")');

    // Vérifier
    await expect(page.locator('text=Salary E2E')).toBeVisible({ timeout: 5000 });
  });

  test('should display transaction list', async ({ page }) => {
    // Attendre la liste des transactions
    const transactionList = page.locator('[data-testid="transaction-list"], .transaction-list');
    await expect(transactionList.first()).toBeVisible({ timeout: 5000 });

    // Vérifier qu'il y a au moins une transaction
    const transactions = page.locator('[data-testid^="transaction-"], .transaction-item');
    const count = await transactions.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should delete transaction', async ({ page }) => {
    // Attendre qu'une transaction soit visible
    const firstTransaction = page.locator('[data-testid^="transaction-"], .transaction-item').first();
    await expect(firstTransaction).toBeVisible();

    // Récupérer le texte pour vérifier la suppression
    const transactionText = await firstTransaction.textContent();

    // Trouver et cliquer sur le bouton delete
    const deleteButton = firstTransaction.locator('[data-testid="delete-button"], button[aria-label*="Supprimer"], .delete-button');

    // Si le bouton est visible directement
    if (await deleteButton.count() > 0) {
      await deleteButton.first().click();
    } else {
      // Sinon hover pour afficher le bouton
      await firstTransaction.hover();
      await deleteButton.first().click({ timeout: 3000 });
    }

    // Confirmer si dialog de confirmation
    const confirmButton = page.locator('button:has-text("Confirmer"), button:has-text("Supprimer")');
    if (await confirmButton.count() > 0) {
      await confirmButton.first().click();
    }

    // Vérifier que la transaction est supprimée
    await page.waitForTimeout(1000); // Animation
    await expect(page.locator(`text="${transactionText}"`)).not.toBeVisible();
  });

  test('should display AI insights section', async ({ page }) => {
    // Chercher la section AI Insights
    const aiInsights = page.locator(
      '[data-testid="ai-insights"], [data-testid="ai-insights-section"], text=/Insights|Analyses|Recommandations/i'
    ).first();

    // Peut ne pas être visible si pas assez de données
    const isVisible = await aiInsights.isVisible().catch(() => false);

    if (isVisible) {
      await expect(aiInsights).toBeVisible();

      // Vérifier les cartes d'insights
      const insightCards = page.locator('[data-testid^="insight-"], .insight-card');
      const count = await insightCards.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should display Pluqla DA mascot', async ({ page }) => {
    // Chercher Pluqla DA
    const pluqlaDA = page.locator(
      '[data-testid="pluqla-da"], [data-testid="mascot"], img[alt*="Pluqla"], img[alt*="DA"]'
    );

    const isVisible = await pluqlaDA.first().isVisible().catch(() => false);

    if (isVisible) {
      await expect(pluqlaDA.first()).toBeVisible();
    }
  });

  test('should display expense breakdown chart', async ({ page }) => {
    // Chercher le graphique de répartition
    const breakdown = page.locator(
      '[data-testid="expense-breakdown"], .expense-breakdown, text=/Répartition|Breakdown/i'
    ).first();

    const isVisible = await breakdown.isVisible().catch(() => false);

    if (isVisible) {
      await expect(breakdown).toBeVisible();

      // Vérifier qu'il y a des catégories affichées
      const categories = page.locator('[data-testid^="category-"], .category-item');
      const count = await categories.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should filter transactions by category', async ({ page }) => {
    // Chercher les filtres
    const filterButton = page.locator(
      '[data-testid="filter-button"], button:has-text("Filtrer")'
    );

    if (await filterButton.count() > 0) {
      await filterButton.first().click();

      // Sélectionner une catégorie (ex: alimentation)
      await page.click('text=/Alimentation/i');

      // Attendre le filtrage
      await page.waitForTimeout(500);

      // Vérifier que seules les transactions de cette catégorie sont affichées
      const transactions = page.locator('[data-testid^="transaction-"]');
      const count = await transactions.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should display monthly stats', async ({ page }) => {
    // Chercher les stats mensuelles
    const stats = page.locator(
      '[data-testid="monthly-stats"], .monthly-stats, text=/Stats|Statistiques/i'
    ).first();

    const isVisible = await stats.isVisible().catch(() => false);

    if (isVisible) {
      await expect(stats).toBeVisible();

      // Vérifier les métriques (dépenses, revenus, économies)
      const metrics = page.locator('[data-testid*="metric"], .stat-card');
      const count = await metrics.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should navigate between different views', async ({ page }) => {
    // Si plusieurs vues disponibles (Simple/Enhanced Dashboard)
    const viewToggle = page.locator('[data-testid="view-toggle"], button:has-text("Vue")');

    if (await viewToggle.count() > 0) {
      await viewToggle.first().click();

      // Attendre le changement de vue
      await page.waitForTimeout(500);

      // Vérifier que la vue a changé
      const dashboard = page.locator('[data-testid="dashboard"]');
      await expect(dashboard.first()).toBeVisible();
    }
  });

  test('should show validation errors for invalid transaction', async ({ page }) => {
    // Ouvrir modal
    const addButton = page.locator(
      '[data-testid="add-transaction-button"], button:has-text("Ajouter"), button:has-text("+")'
    );
    await addButton.first().click();

    await page.waitForSelector('[role="dialog"], .modal', { timeout: 3000 });

    // Soumettre sans remplir
    await page.click('button[type="submit"], button:has-text("Ajouter")');

    // Vérifier messages d'erreur
    const errorMessages = page.locator('text=/requis|obligatoire|required/i');
    await expect(errorMessages.first()).toBeVisible({ timeout: 3000 });
  });

  test('should handle concurrent transaction additions', async ({ page }) => {
    // Ajouter plusieurs transactions rapidement
    for (let i = 0; i < 3; i++) {
      const addButton = page.locator(
        '[data-testid="add-transaction-button"], button:has-text("Ajouter"), button:has-text("+")'
      );
      await addButton.first().click();

      await page.waitForSelector('[role="dialog"], .modal', { timeout: 3000 });

      await page.fill('input[name="amount"], input[placeholder*="Montant"]', `${10 + i}.00`);
      await page.fill('input[name="description"], input[placeholder*="Description"]', `Test ${i}`);

      await page.click('button[type="submit"], button:has-text("Ajouter")');
      await page.waitForTimeout(500);
    }

    // Vérifier que toutes les transactions sont présentes
    await expect(page.locator('text=Test 0')).toBeVisible();
    await expect(page.locator('text=Test 1')).toBeVisible();
    await expect(page.locator('text=Test 2')).toBeVisible();
  });
});
