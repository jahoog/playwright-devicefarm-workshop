/**
 * iOS Expect — emulates Playwright's web-first assertions on top of the
 * IosLocator. Auto-retries like Playwright's expect until the timeout.
 *
 * Supported matchers:
 *   expect(locator).toBeVisible()
 *   expect(locator).not.toBeVisible()
 *   expect(locator).toHaveText(str)
 *   expect(locator).toContainText(str)
 *   expect(locator).toHaveValue(str)
 *
 * For non-locator values, falls back to Jest's expect (toBe, etc.).
 */

const jestExpect = require('expect').default || require('expect');

const DEFAULT_TIMEOUT = 15000;
const POLL_INTERVAL = 500;

async function retry(assertionFn, timeout = DEFAULT_TIMEOUT) {
  const start = Date.now();
  let lastError;
  while (Date.now() - start < timeout) {
    try {
      const ok = await assertionFn();
      if (ok) return;
    } catch (e) {
      lastError = e;
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }
  throw lastError || new Error('Assertion timed out');
}

function isLocator(value) {
  return value && typeof value.isVisible === 'function' && typeof value.textContent === 'function';
}

function createLocatorMatchers(locator, negated) {
  return {
    async toBeVisible() {
      await retry(async () => {
        const visible = await locator.isVisible();
        return negated ? !visible : visible;
      });
    },

    async toHaveText(expected) {
      await retry(async () => {
        const text = (await locator.textContent() || '').trim();
        const match = text === expected;
        return negated ? !match : match;
      });
    },

    async toContainText(expected) {
      await retry(async () => {
        const text = (await locator.textContent()) || '';
        const match = text.includes(expected);
        return negated ? !match : match;
      });
    },

    async toHaveValue(expected) {
      await retry(async () => {
        const value = await locator.getValue();
        const match = value === expected;
        return negated ? !match : match;
      });
    },
  };
}

function universalExpect(value) {
  if (isLocator(value)) {
    const matchers = createLocatorMatchers(value, false);
    matchers.not = createLocatorMatchers(value, true);
    return matchers;
  }
  // Fall back to Jest expect for plain values
  return jestExpect(value);
}

module.exports = { expect: universalExpect };
