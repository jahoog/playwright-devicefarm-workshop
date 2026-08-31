/**
 * iOS Page — emulates Playwright's Page API on top of WebDriverIO/Appium.
 *
 * Provides getByRole / getByLabel / getByTestId / getByText that return
 * IosLocator instances, plus goto() for navigation.
 */

const { IosLocator } = require('./ios-locator');

const BASE_URL = process.env.TEST_APP_URL || 'https://your-deployed-app.example.com';

class IosPage {
  constructor(browser) {
    this._browser = browser;
  }

  async goto(pathOrUrl) {
    // Resolve relative paths against BASE_URL (mirrors Playwright's baseURL)
    let url = pathOrUrl;
    if (pathOrUrl.startsWith('/')) {
      url = BASE_URL.replace(/\/$/, '') + pathOrUrl;
    }
    await this._browser.url(url);
    await this._browser.pause(2000);
  }

  getByRole(role, options = {}) {
    return new IosLocator(this._browser, 'role', { role, name: options.name });
  }

  getByLabel(text) {
    return new IosLocator(this._browser, 'label', { text });
  }

  getByTestId(testId) {
    return new IosLocator(this._browser, 'testid', { testId });
  }

  getByText(text) {
    return new IosLocator(this._browser, 'text', { text });
  }

  locator(selector) {
    return new IosLocator(this._browser, 'css', { selector });
  }

  async title() {
    return await this._browser.getTitle();
  }

  async url() {
    return await this._browser.getUrl();
  }
}

module.exports = { IosPage };
