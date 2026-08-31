/**
 * Selenium Harness — emulates the @playwright/test API on top of Jest + Selenium
 * against the AWS Device Farm Desktop Browser grid.
 *
 * Mirrors ios-harness.js but uses Selenium WebDriver connected to a Device Farm
 * TestGridUrl instead of Appium.
 *
 *   test(name, fn)          → Jest it() with { page } fixture
 *   test.describe(name, fn) → Jest describe()
 *   test.beforeEach(fn)     → runs before each test with { page }
 *   expect                  → shared auto-retrying web-first matchers
 */

const { Builder } = require('selenium-webdriver');
const {
  DeviceFarmClient,
  CreateTestGridUrlCommand,
} = require('@aws-sdk/client-device-farm');
const { SeleniumPage } = require('./selenium-page');
const { expect } = require('./ios-expect'); // protocol-agnostic matchers (isVisible/textContent/getValue)

let sharedDriver = null;
let sharedPage = null;

async function ensureSession() {
  if (sharedDriver) return;

  const region = process.env.AWS_REGION || 'us-west-2';
  const projectArn = process.env.DEVICE_FARM_PROJECT_ARN;
  const browserName = process.env.SELENIUM_BROWSER || 'chrome';

  if (!projectArn) {
    throw new Error('DEVICE_FARM_PROJECT_ARN is required for the Selenium (Device Farm) harness.');
  }

  const client = new DeviceFarmClient({ region });
  const { url } = await client.send(
    new CreateTestGridUrlCommand({ projectArn, expiresInSeconds: 900 })
  );

  sharedDriver = await new Builder()
    .usingServer(url)
    .withCapabilities({ browserName })
    .build();

  sharedPage = new SeleniumPage(sharedDriver);
}

function fixture() {
  return { page: sharedPage };
}

// Desktop grid — no soft keyboard, so submit is just a click.
async function submit(page, locator) {
  await locator.click();
}

// eslint-disable-next-line no-undef
if (typeof afterAll === 'function') {
  afterAll(async () => {
    if (sharedDriver) {
      await sharedDriver.quit();
      sharedDriver = null;
      sharedPage = null;
    }
  });
}

function test(name, fn) {
  // eslint-disable-next-line no-undef
  it(name, async () => {
    await ensureSession();
    await fn(fixture());
  }, 120000);
}

test.describe = function describe(name, fn) {
  // eslint-disable-next-line no-undef
  global.describe(name, fn);
};

test.beforeEach = function beforeEachHook(fn) {
  // eslint-disable-next-line no-undef
  beforeEach(async () => {
    await ensureSession();
    await fn(fixture());
  }, 120000);
};

test.afterEach = function afterEachHook(fn) {
  // eslint-disable-next-line no-undef
  afterEach(async () => {
    await fn(fixture());
  });
};

test.beforeAll = function beforeAllHook(fn) {
  // eslint-disable-next-line no-undef
  beforeAll(async () => {
    await ensureSession();
    await fn(fixture());
  }, 120000);
};

test.afterAll = function afterAllHook(fn) {
  // eslint-disable-next-line no-undef
  afterAll(async () => {
    await fn(fixture());
  });
};

module.exports = { test, expect, submit };
