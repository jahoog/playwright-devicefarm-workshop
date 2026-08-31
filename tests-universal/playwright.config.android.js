// @ts-check
const { defineConfig } = require('@playwright/test');

/**
 * Android config — runs the universal specs on a real Android device's Chrome
 * via the _android API (CDP over ADB).
 *
 * Requires TEST_PLATFORM=android so the harness loads the android-fixture,
 * which overrides the `page` fixture with a device-backed Playwright Page.
 *
 * Locally: needs an emulator/device visible to `adb devices`.
 * On Device Farm: ADB targets the allocated real device.
 */
module.exports = defineConfig({
  testDir: './specs',
  testMatch: '**/*.spec.js',
  timeout: 120000,
  fullyParallel: false,
  workers: 1,
  // On Device Farm, write the report under DEVICEFARM_LOG_DIR (writable + collected
  // as an artifact). Locally it falls back to a local folder.
  reporter: [
    ['html', {
      outputFolder: process.env.DEVICEFARM_LOG_DIR
        ? `${process.env.DEVICEFARM_LOG_DIR}/playwright-report`
        : '../playwright-report-universal-android',
      open: 'never',
    }],
    ['list'],
  ],
  // Also write test-results (traces/screenshots) to a writable location on Device Farm.
  outputDir: process.env.DEVICEFARM_LOG_DIR
    ? `${process.env.DEVICEFARM_LOG_DIR}/test-results`
    : undefined,
  use: {
    baseURL: process.env.TEST_APP_URL || 'http://10.0.2.2:3000',
  },
  // No `projects` — the android-fixture supplies the device-backed page.
});
