/**
 * Login Form — Universal test.
 *
 * Written once in @playwright/test style. Runs on:
 *   - Desktop browsers (native Playwright)         → playwright.config.desktop.js
 *   - Real Android on Device Farm (Playwright CDP) → playwright.config.android.js
 *   - Real iOS on Device Farm (Appium shim)        → playwright.config.ios.js
 *
 * The `test` and `expect` come from a platform-aware harness that provides
 * the right `page` object for the target environment.
 */

const { test, expect, submit } = require('../harness');

test.describe('Login Form [Universal]', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test('should show validation errors when submitting empty form', async ({ page }) => {
    await submit(page, page.getByRole('button', { name: 'Login' }));

    await expect(page.getByTestId('email-error')).toHaveText('Email is required');
    await expect(page.getByTestId('password-error')).toHaveText('Password is required');
  });

  test('should show error for wrong credentials', async ({ page }) => {
    await page.getByLabel('Email').fill('wrong@example.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await submit(page, page.getByRole('button', { name: 'Login' }));

    await expect(page.getByTestId('form-error')).toHaveText('Invalid email or password');
  });

  test('should login successfully with correct credentials', async ({ page }) => {
    await page.getByLabel('Email').fill('admin@example.com');
    await page.getByLabel('Password').fill('password123');
    await submit(page, page.getByRole('button', { name: 'Login' }));

    await expect(page.getByTestId('login-success')).toContainText('Login successful');
  });
});
