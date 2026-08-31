/**
 * Selenium Page — emulates Playwright's Page API on top of Selenium WebDriver.
 * Provides getByRole / getByLabel / getByTestId / getByText / locator + goto.
 */

const { SeleniumLocator } = require('./selenium-locator');

const BASE_URL = process.env.TEST_APP_URL || 'http://localhost:3000';

class SeleniumPage {
  constructor(driver) {
    this._driver = driver;
  }

  _resolveUrl(pathOrUrl) {
    if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
    return BASE_URL.replace(/\/$/, '') + (pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`);
  }

  async goto(pathOrUrl) {
    await this._driver.get(this._resolveUrl(pathOrUrl));
  }

  getByRole(role, options = {}) {
    return new SeleniumLocator(this._driver, 'role', { role, name: options.name });
  }

  getByLabel(text) {
    return new SeleniumLocator(this._driver, 'label', { text });
  }

  getByTestId(testId) {
    return new SeleniumLocator(this._driver, 'testid', { testId });
  }

  getByText(text) {
    return new SeleniumLocator(this._driver, 'text', { text });
  }

  locator(selector) {
    return new SeleniumLocator(this._driver, 'css', { selector });
  }

  async title() {
    return await this._driver.getTitle();
  }

  async url() {
    return await this._driver.getCurrentUrl();
  }
}

module.exports = { SeleniumPage };
