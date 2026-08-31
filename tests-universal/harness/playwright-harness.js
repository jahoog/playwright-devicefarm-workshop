/**
 * Playwright Harness (Desktop + Android)
 *
 * Desktop: plain @playwright/test — launches desktop browsers.
 * Android: uses the android-fixture which overrides the `page` fixture to
 *          connect to a real device's Chrome via the _android API (CDP/ADB).
 *
 * Either way, the spec files get a REAL Playwright Page, so getByRole(),
 * getByLabel(), getByTestId(), expect().toBeVisible(), etc. all work natively.
 */

const platform = (process.env.TEST_PLATFORM || 'desktop').toLowerCase();

if (platform === 'android') {
  module.exports = require('./android-fixture');
} else {
  const base = require('@playwright/test');
  // Desktop: submit is just a normal click (no mobile keyboard to dismiss).
  const submit = async (page, locator) => {
    await locator.click();
  };
  module.exports = {
    test: base.test,
    expect: base.expect,
    submit,
  };
}
