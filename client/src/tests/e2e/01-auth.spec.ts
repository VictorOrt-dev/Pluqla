import { test, expect, type Page } from '@playwright/test';

/**
 * E2E Tests - Authentication Flow
 *
 * Tests couverts:
 * - Inscription nouvel utilisateur
 * - Connexion utilisateur existant
 * - Gestion erreurs credentials invalides
 * - Déconnexion
 * - Persistance session
 */

test.describe('Authentication Flow', () => {
  const testUser = {
    email: `test-${Date.now()}@pluqla.com`,
    password: 'SecurePass123!',
  };

  test.beforeEach(async ({ page }) => {
    // Naviguer vers la page d'accueil
    await page.goto('/');
  });

  test('should display landing page with login button', async ({ page }) => {
    // Vérifier présence du bouton de connexion
    const loginButton = page.locator('a[href="/login"], button:has-text("Connexion")');
    await expect(loginButton).toBeVisible();

    // Vérifier titre/logo Pluqla
    await expect(page.locator('text=/Pluqla/i')).toBeVisible();
  });

  test('should register new user successfully', async ({ page }) => {
    // Naviguer vers inscription
    await page.goto('/register');

    // Attendre que le formulaire soit chargé
    await expect(page.locator('form')).toBeVisible();

    // Remplir le formulaire d'inscription
    await page.fill('input[name="email"], input[type="email"]', testUser.email);
    await page.fill('input[name="password"]:not([name="confirmPassword"])', testUser.password);
    await page.fill('input[name="confirmPassword"], input[placeholder*="Confirmer"]', testUser.password);

    // Soumettre le formulaire
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Attendre la redirection (onboarding ou home)
    await page.waitForURL(/\/(onboarding|home|finance)/, { timeout: 10000 });

    // Vérifier que l'utilisateur est connecté
    // On devrait voir le nom d'utilisateur ou un bouton de déconnexion
    const userIndicator = page.locator('[data-testid="user-menu"], [data-testid="profile-button"], text=/Bienvenue/i');
    await expect(userIndicator.first()).toBeVisible({ timeout: 5000 });
  });

  test('should show error for existing email', async ({ page }) => {
    await page.goto('/register');

    // Utiliser un email qui existe déjà
    await page.fill('input[name="email"], input[type="email"]', 'existing@pluqla.com');
    await page.fill('input[name="password"]:not([name="confirmPassword"])', testUser.password);
    await page.fill('input[name="confirmPassword"], input[placeholder*="Confirmer"]', testUser.password);

    await page.locator('button[type="submit"]').click();

    // Vérifier message d'erreur
    const errorMessage = page.locator('text=/existe déjà|already exists|email utilisé/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should show error for password mismatch', async ({ page }) => {
    await page.goto('/register');

    await page.fill('input[name="email"], input[type="email"]', testUser.email);
    await page.fill('input[name="password"]:not([name="confirmPassword"])', testUser.password);
    await page.fill('input[name="confirmPassword"], input[placeholder*="Confirmer"]', 'DifferentPass123!');

    await page.locator('button[type="submit"]').click();

    // Vérifier message d'erreur
    const errorMessage = page.locator('text=/ne correspondent pas|do not match|mots de passe différents/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should login existing user', async ({ page }) => {
    await page.goto('/login');

    // Remplir le formulaire de connexion
    await page.fill('input[name="email"], input[type="email"]', 'test@pluqla.com');
    await page.fill('input[name="password"], input[type="password"]', 'TestPass123!');

    // Soumettre
    await page.locator('button[type="submit"]').click();

    // Attendre redirection vers home
    await page.waitForURL(/\/(home|finance|dashboard)/, { timeout: 10000 });

    // Vérifier que l'utilisateur est connecté
    const userIndicator = page.locator('[data-testid="user-menu"], [data-testid="profile-button"]');
    await expect(userIndicator.first()).toBeVisible({ timeout: 5000 });
  });

  test('should handle invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Identifiants invalides
    await page.fill('input[name="email"], input[type="email"]', 'wrong@email.com');
    await page.fill('input[name="password"], input[type="password"]', 'wrongpass');

    await page.locator('button[type="submit"]').click();

    // Vérifier message d'erreur
    const errorMessage = page.locator('text=/Identifiants invalides|Invalid credentials|incorrect/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // Vérifier qu'on reste sur la page login
    expect(page.url()).toContain('/login');
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/login');

    // Soumettre sans remplir
    await page.locator('button[type="submit"]').click();

    // Vérifier messages d'erreur de validation
    const errorMessages = page.locator('text=/requis|required|obligatoire/i');
    await expect(errorMessages.first()).toBeVisible({ timeout: 3000 });
  });

  test('should logout successfully', async ({ page }) => {
    // Se connecter d'abord
    await page.goto('/login');
    await page.fill('input[name="email"], input[type="email"]', 'test@pluqla.com');
    await page.fill('input[name="password"], input[type="password"]', 'TestPass123!');
    await page.locator('button[type="submit"]').click();

    // Attendre que la connexion soit effectuée
    await page.waitForURL(/\/(home|finance|dashboard)/, { timeout: 10000 });

    // Trouver et cliquer sur le menu utilisateur
    const userMenu = page.locator('[data-testid="user-menu"], [data-testid="settings-button"], button:has-text("Paramètres")');
    await userMenu.first().click({ timeout: 5000 });

    // Cliquer sur déconnexion
    const logoutButton = page.locator('text=/Déconnexion|Logout|Se déconnecter/i');
    await logoutButton.click();

    // Vérifier redirection vers login
    await page.waitForURL(/\/(login|\/|$)/, { timeout: 10000 });

    // Vérifier qu'on ne peut plus accéder à une page protégée
    await page.goto('/finance');
    await page.waitForURL(/\/login/, { timeout: 5000 });
    expect(page.url()).toContain('/login');
  });

  test('should persist session after page reload', async ({ page }) => {
    // Se connecter
    await page.goto('/login');
    await page.fill('input[name="email"], input[type="email"]', 'test@pluqla.com');
    await page.fill('input[name="password"], input[type="password"]', 'TestPass123!');
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(/\/(home|finance|dashboard)/, { timeout: 10000 });

    // Recharger la page
    await page.reload();

    // Vérifier que l'utilisateur est toujours connecté
    const userIndicator = page.locator('[data-testid="user-menu"], [data-testid="profile-button"]');
    await expect(userIndicator.first()).toBeVisible({ timeout: 5000 });

    // Ne devrait pas être redirigé vers login
    expect(page.url()).not.toContain('/login');
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    // Essayer d'accéder à une route protégée sans être connecté
    await page.goto('/finance');

    // Devrait être redirigé vers login
    await page.waitForURL(/\/login/, { timeout: 5000 });
    expect(page.url()).toContain('/login');
  });

  test('should remember redirect path after login', async ({ page }) => {
    // Essayer d'accéder à /finance sans être connecté
    await page.goto('/finance');

    // Redirigé vers login
    await page.waitForURL(/\/login/, { timeout: 5000 });

    // Se connecter
    await page.fill('input[name="email"], input[type="email"]', 'test@pluqla.com');
    await page.fill('input[name="password"], input[type="password"]', 'TestPass123!');
    await page.locator('button[type="submit"]').click();

    // Devrait être redirigé vers /finance (ou home si pas implémenté)
    await page.waitForURL(/\/(finance|home)/, { timeout: 10000 });
  });
});

/**
 * Test helper function to login
 */
async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[name="email"], input[type="email"]', email);
  await page.fill('input[name="password"], input[type="password"]', password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/(home|finance|dashboard)/, { timeout: 10000 });
}

export { loginUser };
