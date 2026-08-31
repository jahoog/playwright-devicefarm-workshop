/**
 * Feedback Form — Universal test.
 * Runs on desktop, Android (CDP), and iOS (Appium shim) from one codebase.
 */

const { test, expect, submit } = require('../harness');

test.describe('Feedback Form [Universal]', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/feedback');
  });

  test('should display feedback form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Feedback' })).toBeVisible();
    await expect(page.getByLabel('Rating')).toBeVisible();
    await expect(page.getByLabel('Comment')).toBeVisible();
  });

  test('should show validation errors on empty submission', async ({ page }) => {
    await submit(page, page.getByRole('button', { name: 'Submit Feedback' }));

    await expect(page.getByTestId('rating-error')).toHaveText('Please select a rating');
    await expect(page.getByTestId('comment-error')).toHaveText('Please provide a comment');
  });

  test('should submit feedback successfully', async ({ page }) => {
    await page.getByLabel('Rating').selectOption('5');
    await page.getByLabel('Comment').fill('Amazing service, very happy with the app!');
    await submit(page, page.getByRole('button', { name: 'Submit Feedback' }));

    await expect(page.getByTestId('feedback-success')).toBeVisible();
    await expect(page.getByTestId('feedback-success')).toContainText('Thank you for your feedback');
    await expect(page.getByTestId('feedback-success')).toContainText('5/5');
  });
});
