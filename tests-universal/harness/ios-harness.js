/**
 * iOS Harness — emulates the @playwright/test API on top of Jest + Appium.
 *
 * Provides:
 *   test(name, fn)          → Jest it() with { page } fixture injected
 *   test.describe(name, fn) → Jest describe() + shared Appium session
 *   test.beforeEach(fn)     → registers a hook run before each test with { page }
 *   test.afterEach(fn)      → registers a hook run after each test
 *   expect                  → iOS expect shim (auto-retrying matchers)
 *
 * Design: a single Appium session is created lazily and reused across the run
 * (mirrors how these mobile tests share one browser). The IosPage is passed to
 * each test as the `page` fixture, matching @playwright/test's injection.
 */

const { remote } = require('webdriverio');
const { IosPage } = require('./ios-page');
const { expect } = require('./ios-expect');

const APPIUM_HOST = '127.0.0.1';
const APPIUM_PORT = 4723;
const APPIUM_BASE_PATH = process.env.APPIUM_BASE_PATH || '';

let sharedBrowser = null;
let sharedPage = null;

async function ensureSession() {
  if (sharedBrowser) return;
  sharedBrowser = await remote({
    hostname: APPIUM_HOST,
    port: APPIUM_PORT,
    path: APPIUM_BASE_PATH || '/',
    capabilities: {},
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    logLevel: 'warn',
  });
  sharedPage = new IosPage(sharedBrowser);
}

function fixture() {
  return { page: sharedPage };
}

/**
 * Mobile-safe submit: dismiss the soft keyboard by blurring the active element,
 * then click. Safari on iOS overlaps the submit button with the keyboard.
 */
async function submit(page, locator) {
  if (sharedBrowser) {
    await sharedBrowser.execute(() => {
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }
    });
    await sharedBrowser.pause(500);
  }
  await locator.click();
}

// Register a global afterAll once to clean up the shared session.
// eslint-disable-next-line no-undef
if (typeof afterAll === 'function') {
  afterAll(async () => {
    if (sharedBrowser) {
      await sharedBrowser.deleteSession();
      sharedBrowser = null;
      sharedPage = null;
    }
  });
}

// ─── @playwright/test API emulation ──────────────────────────────────────────

function test(name, fn) {
  // eslint-disable-next-line no-undef
  it(name, async () => {
    await ensureSession();
    await fn(fixture());
  }, 300000);
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
  }, 180000);
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
  }, 180000);
};

test.afterAll = function afterAllHook(fn) {
  // eslint-disable-next-line no-undef
  afterAll(async () => {
    await fn(fixture());
  });
};

module.exports = { test, expect, submit };
