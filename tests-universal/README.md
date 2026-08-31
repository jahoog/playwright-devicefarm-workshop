# Universal Tests (Experimental)

**One codebase. Three platforms. Write tests once in `@playwright/test` style — run them on desktop browsers, real Android (via Playwright CDP), and real iOS Safari (via an Appium shim) on AWS Device Farm.**

> Status: Experimental. The desktop and Android paths use real Playwright. The iOS path emulates a subset of the Playwright API on top of Appium.

## The Big Idea

You write your tests **once** using standard Playwright syntax:

```javascript
const { test, expect } = require('../harness');

test.describe('Login Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should login successfully', async ({ page }) => {
    await page.getByLabel('Email').fill('admin@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByTestId('login-success')).toContainText('Login successful');
  });
});
```

The only difference from vanilla Playwright is the import: `require('../harness')` instead of `@playwright/test`. That harness swaps the engine based on `TEST_PLATFORM`.

## Architecture

```
tests-universal/
├── specs/                          ← Write tests ONCE (login, contact, feedback, navigation)
│   ├── login.spec.js
│   ├── contact.spec.js
│   ├── feedback.spec.js
│   └── navigation.spec.js
│
├── harness/                        ← Platform-aware engine swap
│   ├── index.js                    ← Routes by TEST_PLATFORM
│   ├── playwright-harness.js       ← Desktop + Android (real @playwright/test)
│   ├── android-fixture.js          ← Overrides `page` with device Chrome (CDP/ADB)
│   ├── ios-harness.js              ← Emulates test/describe/expect on Jest + Appium
│   ├── ios-page.js                 ← getByRole/getByLabel/getByTestId → IosLocator
│   ├── ios-locator.js              ← Resolves locators, does click/fill/selectOption
│   ├── ios-expect.js               ← Auto-retrying toBeVisible/toHaveText/etc. (shared)
│   ├── selenium-harness.js         ← Device Farm Desktop Browser via Selenium
│   ├── selenium-page.js            ← getByRole/getByLabel/getByTestId → SeleniumLocator
│   └── selenium-locator.js         ← Resolves locators, does click/fill/selectOption
│
├── playwright.config.desktop.js    ← Desktop browsers (local/CI)
├── playwright.config.android.js    ← Android via CDP
├── jest.config.ios.js              ← iOS via Appium shim
├── jest.config.selenium.js         ← Device Farm Desktop Browser via Selenium
│
└── device-farm/
    ├── testspec-android.yml        ← Device Farm: Playwright CDP on Android
    ├── testspec-ios.yml            ← Device Farm: Appium shim on iOS Safari
    └── schedule.js                 ← Packages + uploads (--android / --ios)
```

## How Each Platform Works

```
                       specs/*.spec.js  (one codebase)
                              │
                              │  require('../harness')
                              ▼
                    ┌──────── harness/index.js ────────┐
                    │        (reads TEST_PLATFORM)      │
          ┌─────────┼───────────────┬──────────────────┘
          │         │               │
     desktop      android          ios
          │         │               │
   real           real            emulated
   @playwright/    @playwright/    @playwright/test
   test            test +          API on Jest
   (Chromium,      android-        + Appium shim
   FF, WebKit)     fixture         │
          │         │               │
   Desktop        CDP over        WebDriver → Appium
   browser        ADB → device    → XCUITest → Safari
                  Chrome          on iPhone
```

- **Desktop**: Vanilla Playwright. `page` is a real Playwright Page. Nothing special.
- **Android**: `android-fixture.js` overrides the `page` fixture to connect to the device's Chrome via `_android` API (CDP over ADB). Still a real Playwright Page — all APIs work natively. Fast.
- **iOS**: `ios-harness.js` emulates Playwright's `test`/`expect` on Jest. The `page` is an `IosPage` that implements `getByRole`/`getByLabel`/`getByTestId` by resolving to CSS selectors in the DOM, then driving Safari through Appium/WebDriver. The `expect` matchers auto-retry like Playwright's.

## Running

### Desktop (local)
```bash
npm run test:universal
npx playwright show-report playwright-report-universal
```

### Android emulator (local)
```powershell
npx vite --host 0.0.0.0                    # Terminal 1
$env:TEST_APP_URL = "http://10.0.2.2:3000" # Terminal 2
npm run test:universal:android
```

### iOS (local — needs Appium + simulator/device)
```powershell
appium --relaxed-security                   # Terminal 1
$env:TEST_APP_URL = "http://<your-ip>:3000" # Terminal 2
npm run test:universal:ios
```

### Android on Device Farm
```powershell
$env:DEVICE_FARM_PROJECT_ARN = "arn:aws:devicefarm:us-west-2:..."
$env:TEST_APP_URL = "https://your-app.amplifyapp.com"
$env:DEVICE_POOL_ARN = "your-android-pool-arn"
npm run test:universal:device-farm:android
```

### iOS on Device Farm
```powershell
$env:DEVICE_FARM_PROJECT_ARN = "arn:aws:devicefarm:us-west-2:..."
$env:TEST_APP_URL = "https://your-app.amplifyapp.com"
$env:DEVICE_POOL_ARN = "your-ios-pool-arn"
npm run test:universal:device-farm:ios
```

### Device Farm Desktop Browsers (Selenium)
Runs from your machine/CI against the remote Selenium grid. Use a
**Desktop Browser Testing** project ARN (not a mobile project).
```powershell
$env:DEVICE_FARM_PROJECT_ARN = "arn:aws:devicefarm:us-west-2:...:project:..."
$env:TEST_APP_URL = "https://your-app.amplifyapp.com"
$env:SELENIUM_BROWSER = "chrome"   # or firefox, edge (optional)
npm run test:universal:selenium
```

## Supported API Surface

The iOS shim implements the subset of Playwright's API that the shared specs use:

| Playwright API | Desktop | Android | iOS (shim) | Selenium (shim) |
|----------------|---------|---------|-----------|-----------------|
| `page.goto(path)` | ✓ | ✓ | ✓ | ✓ |
| `page.getByRole(role, {name})` | ✓ | ✓ | ✓ | ✓ |
| `page.getByLabel(text)` | ✓ | ✓ | ✓ | ✓ |
| `page.getByTestId(id)` | ✓ | ✓ | ✓ | ✓ |
| `page.getByText(text)` | ✓ | ✓ | ✓ | ✓ |
| `page.locator(css)` | ✓ | ✓ | ✓ | ✓ |
| `locator.click()` | ✓ | ✓ | ✓ | ✓ |
| `locator.fill(value)` | ✓ | ✓ | ✓ | ✓ |
| `locator.selectOption(value)` | ✓ | ✓ | ✓ | ✓ |
| `expect(locator).toBeVisible()` | ✓ | ✓ | ✓ | ✓ |
| `expect(locator).not.toBeVisible()` | ✓ | ✓ | ✓ | ✓ |
| `expect(locator).toHaveText(str)` | ✓ | ✓ | ✓ | ✓ |
| `expect(locator).toContainText(str)` | ✓ | ✓ | ✓ | ✓ |
| `expect(locator).toHaveValue(str)` | ✓ | ✓ | ✓ | ✓ |
| `expect(page).toHaveURL(...)` | ✓ | ✓ | ✗ | ✗ |
| Network mocking / tracing / screenshots | ✓ | partial | ✗ | ✗ |

- **Desktop / Android** use real Playwright — full API.
- **iOS** uses the Appium shim (Safari on real iPhone).
- **Selenium** uses the Selenium shim against Device Farm's Desktop Browser grid (Chrome/Firefox/Edge). Same emulated subset as the iOS shim.

## Limitations (iOS shim)

- Only the API methods above are implemented. Advanced Playwright features (network interception, tracing, `toHaveScreenshot`, `page.route`) cannot be emulated over Appium/WebDriver.
- `getByRole` uses a simplified role→element mapping (heading, button, link, textbox). It's not the full ARIA accessibility tree that real Playwright computes.
- Slower than the Android CDP path (WebDriver HTTP round-trips vs. CDP WebSocket).

If a test uses only the supported subset, it runs identically on all three platforms from one file. If it needs Playwright-only features, keep those tests desktop/Android-only.

## When to Use This vs. the Other Approaches

| Need | Use |
|------|-----|
| Maximum Playwright features, desktop + Android | This (`tests-universal/`) — desktop and Android are real Playwright |
| iOS coverage with shared test code | This — the iOS shim runs the same specs |
| Simpler adapter (explicit `page.fill(sel, val)` style) | `tests-unified/` |
| Fastest Android-only real-device runs | `tests-playwright-mobile/` |
