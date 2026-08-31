/**
 * Universal Test Harness
 *
 * Exports `test` and `expect` that adapt to the target platform:
 *
 *   TEST_PLATFORM=desktop (default) → @playwright/test (native)
 *   TEST_PLATFORM=android           → @playwright/test with Android CDP fixture
 *   TEST_PLATFORM=ios               → Jest + Appium-backed page shim
 *
 * The shared spec files import { test, expect } from here and never change.
 */

const platform = (process.env.TEST_PLATFORM || 'desktop').toLowerCase();

if (platform === 'ios') {
  // iOS: Jest-based harness with the Appium shim (Safari)
  module.exports = require('./ios-harness');
} else if (platform === 'selenium') {
  // Selenium: Jest-based harness against Device Farm Desktop Browser grid
  module.exports = require('./selenium-harness');
} else {
  // Desktop and Android: use real @playwright/test.
  // The fixture override (Android CDP vs desktop launch) is handled in the
  // Playwright config files / android-fixture via a custom `page` fixture.
  module.exports = require('./playwright-harness');
}
