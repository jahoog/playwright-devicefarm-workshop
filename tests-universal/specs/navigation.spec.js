/**
 * Navigation — Universal test.
 * Runs on desktop, Android (CDP), and iOS (Appium shim) from one codebase.
 */

const { test, expect } = require('../harness');

test.describe('Navigation [Universal]', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the app title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Playwright Demo App' })).toBeVisible();
  });

  test('should navigate to the Contact page', async ({ page }) => {
    await page.getByRole('link', { name: 'Contact' }).click();
    await expect(page.getByRole('heading', { name: 'Contact Us' })).toBeVisible();
  });

  test('should navigate to the Feedback page', async ({ page }) => {
    await page.getByRole('link', { name: 'Feedback' }).click();
    await expect(page.getByRole('heading', { name: 'Feedback' })).toBeVisible();
  });

  test('should navigate back to the Login page', async ({ page }) => {
    await page.getByRole('link', { name: 'Contact' }).click();
    await expect(page.getByRole('heading', { name: 'Contact Us' })).toBeVisible();
    await page.getByRole('link', { name: 'Login' }).click();
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
  });
});
