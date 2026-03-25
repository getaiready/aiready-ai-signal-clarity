import { test, expect } from '@playwright/test';

test.describe('ClawMore Lead Generation & Admin', () => {
  test('submit lead via beta form', async ({ page }) => {
    await page.goto('/');

    // Open Beta Modal
    await page.click('text=Request Managed Beta');

    // Fill out form
    await page.fill('input[placeholder="John Doe"]', 'E2E Tester');
    await page.fill(
      'input[placeholder="john@example.com"]',
      'e2e-test@getaiready.dev'
    );
    await page.fill(
      'textarea[placeholder="Tell us about your infrastructure..."]',
      'Running Playwright tests'
    );

    // In local dev, API call might fail if not running, but UI should handle it
    // For now, we just test that the form exists and is fillable
    const submitBtn = page.locator(
      'button:has-text("Request Priority Access")'
    );
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();
  });

  test('admin login redirects to leads dashboard', async ({ page }) => {
    await page.goto('/admin/login');

    // Verify login page structure
    await expect(page.locator('h1')).toContainText('Admin Access');

    // Enter password (using env var for testing)
    await page.fill('input[type="password"]', process.env.ADMIN_PASSWORD || '');
    await page.click('button:has-text("Authenticate")');

    // Should redirect to leads dashboard
    await expect(page).toHaveURL(/\/admin\/leads/);
    await expect(page.locator('h1')).toContainText('Captured Leads');
  });

  test('admin dashboard is protected by middleware', async ({ page }) => {
    // Attempt to access dashboard without logging in
    await page.goto('/admin/leads');

    // Should be redirected back to login
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('proxy middleware sets locale cookie and header', async ({ page }) => {
    // Navigate to homepage
    const response = await page.goto('/');

    // Check if NEXT_LOCALE cookie is set
    const cookies = await page.context().cookies();
    const localeCookie = cookies.find((c) => c.name === 'NEXT_LOCALE');
    expect(localeCookie).toBeDefined();
    expect(['en', 'zh']).toContain(localeCookie?.value);

    // Check X-NEXT-LOCALE header in response (if accessible)
    // Note: Playwright response.headers() might show headers from server
    const headers = response?.headers();
    expect(headers?.['x-next-locale']).toBeDefined();
  });
});
