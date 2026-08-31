/**
 * Contact Form — Universal test.
 * Runs on desktop, Android (CDP), and iOS (Appium shim) from one codebase.
 */

const { test, expect, submit } = require('../harness');

test.describe('Contact Form [Universal]', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact');
  });

  test('should display contact form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Contact Us' })).toBeVisible();
    await expect(page.getByLabel('Full Name')).toBeVisible();
    await expect(page.getByLabel('Message')).toBeVisible();
  });

  test('should show validation errors on empty submission', async ({ page }) => {
    await submit(page, page.getByRole('button', { name: 'Send Message' }));

    await expect(page.getByTestId('name-error')).toHaveText('Name is required');
    await expect(page.getByTestId('subject-error')).toHaveText('Please select a subject');
  });

  test('should submit form successfully', async ({ page }) => {
    await page.getByLabel('Full Name').fill('Jane Smith');
    await page.getByLabel('Email').fill('jane@example.com');
    await page.getByLabel('Subject').selectOption('billing');
    await page.getByLabel('Message').fill('I have a question about my recent invoice.');
    await submit(page, page.getByRole('button', { name: 'Send Message' }));

    await expect(page.getByTestId('contact-success')).toBeVisible();
    await expect(page.getByTestId('contact-success')).toContainText('Thank you, Jane Smith');
    await expect(page.getByTestId('contact-success')).toContainText('Ticket ID');
  });
});
