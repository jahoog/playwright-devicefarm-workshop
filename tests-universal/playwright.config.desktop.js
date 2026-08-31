// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Desktop config — runs the universal specs on desktop browsers with native Playwright.
 *
 * TEST_PLATFORM defaults to 'desktop', so the harness uses plain @playwright/test.
 */
module.exports = defineConfig({
  testDir: './specs',
  testMatch: '**/*.spec.js',
  timeout: 60000,
  // Give web-first assertions more retry time so slower engines (WebKit/Firefox)
  // don't flake on the async success messages.
  expect: { timeout: 10000 },
  fullyParallel: true,
  reporter: [['html', { outputFolder: '../playwright-report-universal', open: 'never' }], ['list']],
  use: {
    baseURL: process.env.TEST_APP_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: process.env.TEST_APP_URL ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    cwd: '..',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
