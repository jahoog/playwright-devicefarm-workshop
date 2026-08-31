/**
 * Selenium Locator — emulates Playwright's Locator API on top of Selenium
 * WebDriver (for AWS Device Farm Desktop Browser Testing).
 *
 * Resolves getByRole / getByLabel / getByTestId / getByText / locator into
 * CSS selectors (via in-browser DOM resolution), then implements actions and
 * state accessors used by the expect matchers.
 */

const { By, until } = require('selenium-webdriver');

class SeleniumLocator {
  constructor(driver, strategy, params) {
    this._driver = driver;
    this._strategy = strategy;
    this._params = params;
  }

  // Resolve to a unique CSS selector string, running role/label resolution in-browser.
  async _findCssSelector() {
    switch (this._strategy) {
      case 'css':
        return this._params.selector;

      case 'testid':
        return `[data-testid="${this._params.testId}"]`;

      case 'role': {
        const { role, name } = this._params;
        const tagsForRole = {
          heading: 'h1,h2,h3,h4,h5,h6',
          button: 'button,[role="button"],input[type="submit"]',
          link: 'a',
          textbox: 'input,textarea',
        };
        const tags = tagsForRole[role] || '*';
        return await this._driver.executeScript(
          `const tags = arguments[0], accName = arguments[1];
           const candidates = Array.from(document.querySelectorAll(tags));
           const match = candidates.find((el) => {
             if (!accName) return true;
             const text = (el.textContent || '').trim();
             const aria = el.getAttribute('aria-label') || '';
             const value = el.value || '';
             return text === accName || aria === accName || value === accName;
           });
           if (!match) return null;
           if (match.id) return '#' + match.id;
           if (match.getAttribute('data-testid')) return '[data-testid="' + match.getAttribute('data-testid') + '"]';
           const all = Array.from(document.querySelectorAll(match.tagName.toLowerCase()));
           return match.tagName.toLowerCase() + ':nth-of-type(' + (all.indexOf(match) + 1) + ')';`,
          tags,
          name || ''
        );
      }

      case 'label':
        return await this._driver.executeScript(
          `const labelText = arguments[0];
           const label = Array.from(document.querySelectorAll('label')).find((l) => (l.textContent || '').trim() === labelText);
           if (!label) return null;
           const forId = label.getAttribute('for');
           if (forId) return '#' + forId;
           const control = label.querySelector('input,textarea,select');
           if (control && control.id) return '#' + control.id;
           return null;`,
          this._params.text
        );

      case 'text':
        return await this._driver.executeScript(
          `const txt = arguments[0];
           const match = Array.from(document.querySelectorAll('*')).find((el) => (el.textContent || '').trim() === txt);
           if (!match) return null;
           if (match.id) return '#' + match.id;
           if (match.getAttribute('data-testid')) return '[data-testid="' + match.getAttribute('data-testid') + '"]';
           return null;`,
          this._params.text
        );

      default:
        throw new Error(`Unknown locator strategy: ${this._strategy}`);
    }
  }

  async _waitForSelector(timeout = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const selector = await this._findCssSelector();
      if (selector) return selector;
      await this._driver.sleep(500);
    }
    throw new Error(`Locator did not resolve: ${JSON.stringify(this._params)}`);
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  async click() {
    const selector = await this._waitForSelector();
    const el = await this._driver.wait(until.elementLocated(By.css(selector)), 15000);
    await this._driver.wait(until.elementIsVisible(el), 15000);
    await el.click();
  }

  async fill(value) {
    const selector = await this._waitForSelector();
    const el = await this._driver.wait(until.elementLocated(By.css(selector)), 15000);
    await el.clear();
    await el.sendKeys(value);
  }

  async selectOption(value) {
    const selector = await this._waitForSelector();
    const el = await this._driver.wait(until.elementLocated(By.css(selector)), 15000);
    await this._driver.executeScript(
      "arguments[0].value = arguments[1]; arguments[0].dispatchEvent(new Event('change', {bubbles: true}))",
      el,
      value
    );
  }

  // ─── State accessors ─────────────────────────────────────────────────────────

  async isVisible() {
    try {
      const selector = await this._findCssSelector();
      if (!selector) return false;
      const el = await this._driver.findElement(By.css(selector));
      return await el.isDisplayed();
    } catch {
      return false;
    }
  }

  async textContent() {
    const selector = await this._waitForSelector();
    const el = await this._driver.wait(until.elementLocated(By.css(selector)), 15000);
    return await el.getText();
  }

  async getValue() {
    const selector = await this._waitForSelector();
    const el = await this._driver.findElement(By.css(selector));
    return await el.getAttribute('value');
  }
}

module.exports = { SeleniumLocator };
