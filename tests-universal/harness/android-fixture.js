/**
 * Android Fixture for @playwright/test
 *
 * Overrides the default `page` fixture so tests run on a real Android device's
 * Chrome browser via Playwright's _android API (CDP over ADB) instead of a
 * desktop browser.
 *
 * Because this returns a REAL Playwright Page (from the device's Chrome), all
 * standard Playwright APIs work unchanged: getByRole, getByLabel, getByTestId,
 * expect().toBeVisible(), etc.
 *
 * Used by playwright.config.android.js.
 */

const base = require('@playwright/test');
const { _android: android } = require('playwright');

const BASE_URL = process.env.TEST_APP_URL || 'http://10.0.2.2:3000';

/**
 * Mobile-safe click for submit buttons. On a real device the soft keyboard or
 * form labels can overlap the button, so we blur the focused input first and
 * force the click past overlap checks.
 */
async function submit(page, locator) {
  await page.evaluate(() => {
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
  });
  await locator.scrollIntoViewIfNeeded();
  await locator.click({ force: true });
}

// Extend the base test with a device-backed page fixture.
const test = base.test.extend({
  // Worker-scoped: connect to the device once per worker.
  androidDevice: [async ({}, use) => {
    const devices = await android.devices();
    if (devices.length === 0) {
      throw new Error('No Android devices found via ADB. Run `adb devices` to verify.');
    }
    const device = devices[0];
    await use(device);
    await device.close();
  }, { scope: 'worker' }],

  // Override the `page` fixture with one backed by the device's Chrome.
  page: async ({ androidDevice }, use) => {
    const context = await androidDevice.launchBrowser({ baseURL: BASE_URL });
    const page = context.pages().length > 0
      ? context.pages()[0]
      : await context.newPage();
    await use(page);
    await context.close();
  },

  // Also override `context` so tests that reference it still work.
  context: async ({ androidDevice }, use) => {
    const context = await androidDevice.launchBrowser({ baseURL: BASE_URL });
    await use(context);
    await context.close();
  },
});

module.exports = { test, expect: base.expect, submit };
