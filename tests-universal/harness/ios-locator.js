/**
 * iOS Locator — emulates Playwright's Locator API on top of WebDriverIO/Appium.
 *
 * Translates Playwright's getByRole / getByLabel / getByTestId into CSS/XPath
 * selectors, then implements the actions (fill, click, selectOption) and
 * provides data for the expect matchers (visible, text, value).
 */

class IosLocator {
  /**
   * @param {object} browser - WebDriverIO browser instance
   * @param {string} strategy - 'css' | 'role' | 'label' | 'testid' | 'text'
   * @param {object} params - strategy-specific params
   */
  constructor(browser, strategy, params) {
    this._browser = browser;
    this._strategy = strategy;
    this._params = params;
  }

  // Resolve this locator to a CSS or XPath selector string usable by browser.$
  _resolveSelector() {
    switch (this._strategy) {
      case 'css':
        return { using: 'css', value: this._params.selector };

      case 'testid':
        return { using: 'css', value: `[data-testid="${this._params.testId}"]` };

      case 'role': {
        // Map ARIA roles to HTML elements, optionally filtered by accessible name.
        const { role, name } = this._params;
        const tagsForRole = {
          heading: 'h1,h2,h3,h4,h5,h6',
          button: 'button,[role="button"],input[type="submit"]',
          link: 'a',
          textbox: 'input,textarea',
        };
        return { using: 'roleName', role, name, tags: tagsForRole[role] || '*' };
      }

      case 'label':
        // Resolve <label>text</label> → its associated control via `for`/`id`.
        return { using: 'label', text: this._params.text };

      case 'text':
        return { using: 'text', text: this._params.text };

      default:
        throw new Error(`Unknown locator strategy: ${this._strategy}`);
    }
  }

  // Find the matching DOM element and return a stable CSS selector for it,
  // running resolution logic in the browser for role/label strategies.
  async _findCssSelector() {
    const resolved = this._resolveSelector();

    if (resolved.using === 'css') {
      return resolved.value;
    }

    if (resolved.using === 'roleName') {
      const { role, name, tags } = resolved;
      return await this._browser.execute((tagList, accName, roleAttr) => {
        const candidates = Array.from(document.querySelectorAll(tagList));
        const match = candidates.find((el) => {
          if (!accName) return true;
          const text = (el.textContent || '').trim();
          const aria = el.getAttribute('aria-label') || '';
          const value = el.value || '';
          return text === accName || aria === accName || value === accName;
        });
        if (!match) return null;
        // Build a unique selector: prefer id, else data-testid, else tag+index
        if (match.id) return `#${match.id}`;
        if (match.getAttribute('data-testid')) {
          return `[data-testid="${match.getAttribute('data-testid')}"]`;
        }
        // Fall back to nth-of-type path
        const all = Array.from(document.querySelectorAll(match.tagName.toLowerCase()));
        const idx = all.indexOf(match);
        return `${match.tagName.toLowerCase()}:nth-of-type(${idx + 1})`;
      }, tags, name || '', role);
    }

    if (resolved.using === 'label') {
      return await this._browser.execute((labelText) => {
        const labels = Array.from(document.querySelectorAll('label'));
        const label = labels.find((l) => (l.textContent || '').trim() === labelText);
        if (!label) return null;
        const forId = label.getAttribute('for');
        if (forId) return `#${forId}`;
        const control = label.querySelector('input,textarea,select');
        if (control && control.id) return `#${control.id}`;
        return null;
      }, this._params.text);
    }

    if (resolved.using === 'text') {
      return await this._browser.execute((txt) => {
        const all = Array.from(document.querySelectorAll('*'));
        const match = all.find((el) => (el.textContent || '').trim() === txt);
        if (!match) return null;
        if (match.id) return `#${match.id}`;
        if (match.getAttribute('data-testid')) {
          return `[data-testid="${match.getAttribute('data-testid')}"]`;
        }
        return null;
      }, this._params.text);
    }

    return null;
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  async click() {
    const selector = await this._waitForSelector();
    const el = await this._browser.$(selector);
    await el.waitForDisplayed({ timeout: 30000 });
    await el.click();
    await this._browser.pause(500);
  }

  async fill(value) {
    const selector = await this._waitForSelector();
    await this._browser.execute(
      (sel, val) => {
        const el = document.querySelector(sel);
        if (!el) throw new Error(`Element not found: ${sel}`);
        const proto = el.tagName === 'TEXTAREA'
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      },
      selector,
      value
    );
  }

  async selectOption(value) {
    const selector = await this._waitForSelector();
    await this._browser.execute(
      (sel, val) => {
        const el = document.querySelector(sel);
        if (!el) throw new Error(`Element not found: ${sel}`);
        el.value = val;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      },
      selector,
      value
    );
  }

  // ─── State accessors (used by expect matchers) ──────────────────────────────

  async _waitForSelector(timeout = 15000) {
    const start = Date.now();
    let selector = null;
    while (Date.now() - start < timeout) {
      selector = await this._findCssSelector();
      if (selector) return selector;
      await this._browser.pause(500);
    }
    throw new Error(`Locator did not resolve to an element: ${JSON.stringify(this._params)}`);
  }

  async isVisible() {
    try {
      const selector = await this._findCssSelector();
      if (!selector) return false;
      const el = await this._browser.$(selector);
      return await el.isDisplayed();
    } catch {
      return false;
    }
  }

  async textContent() {
    const selector = await this._waitForSelector();
    const el = await this._browser.$(selector);
    return await el.getText();
  }

  async getValue() {
    const selector = await this._waitForSelector();
    return await this._browser.execute((sel) => {
      const el = document.querySelector(sel);
      return el ? el.value : null;
    }, selector);
  }
}

module.exports = { IosLocator };
