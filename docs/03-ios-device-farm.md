# iOS on Mobile Device Farm (Playwright specs via Appium)

## What We're Doing

We'll run the **same universal Playwright tests** on **real iOS devices** (Safari) in AWS Device Farm. The catch: **iOS Safari does not support the Chrome DevTools Protocol**, and Apple provides no ADB-equivalent, so Playwright cannot drive it directly.

Instead, we use a **compatibility shim**. The universal harness detects `TEST_PLATFORM=ios` and swaps Playwright's engine for a thin layer that speaks the Playwright API on the surface but drives Safari through **Appium + XCUITest** underneath.

```
Universal specs (specs/*.spec.js)   ← same files as Android/desktop
        │  TEST_PLATFORM=ios
        ▼
iOS harness (emulates test/expect/getByRole on Jest)
        │  WebDriver
        ▼
Appium + XCUITest  →  Safari on a real iPhone
```

**The key point for the workshop:** the *test files never change*. Only the engine underneath is different. Developers write Playwright; the shim makes it run on iOS.

> Note: The shim implements the common subset of the Playwright API (goto, getByRole/getByLabel/getByTestId, click, fill, selectOption, and the toBeVisible/toHaveText/toContainText/toHaveValue assertions). Playwright-only features like network mocking and tracing are not available on the iOS path.

## Prerequisites

- Completed **[Prerequisites: The Test App URL](./01-prerequisites.md)**
- A **Device Farm Mobile Device Testing project** and an **iOS device pool**

---

## Option A: Command Line

### 1. Set environment variables

```bash
export DEVICE_FARM_PROJECT_ARN="arn:aws:devicefarm:us-west-2:<acct>:project:<id>"
export TEST_APP_URL="https://main.d20a5ulgjk6z5r.amplifyapp.com"
export DEVICE_POOL_ARN="arn:aws:devicefarm:us-west-2:<acct>:devicepool:<iosPoolId>"
```

Need an iOS device pool? List existing pools or create one filtered to iOS:

```bash
aws devicefarm list-device-pools --arn "$DEVICE_FARM_PROJECT_ARN" --region us-west-2

aws devicefarm create-device-pool \
  --project-arn "$DEVICE_FARM_PROJECT_ARN" \
  --name "iOS Devices" \
  --rules '[{"attribute":"PLATFORM","operator":"EQUALS","value":"\"IOS\""}]' \
  --region us-west-2
```

### 2. Run the tests

```bash
npm run test:universal:device-farm:ios
```

This runs `tests-universal/device-farm/schedule.js --ios`, which packages the specs + harness, uploads the iOS testspec, and schedules the run. The iOS testspec:
- Starts Appium 3 with the XCUITest driver
- Points it at Safari using Device Farm's pre-built WebDriverAgent
- Runs the specs under Jest with `TEST_PLATFORM=ios`

### 3. View results

```bash
aws devicefarm list-runs --arn "$DEVICE_FARM_PROJECT_ARN" --region us-west-2 \
  --query 'runs[0].{name:name,result:result}'
```

Then open the Console to review the video and logs.

---

## Option B: AWS Console

### 1. Create (or reuse) a Mobile Device Testing project

Same as the Android section — a single Mobile Device Testing project can hold both Android and iOS runs. Copy the **Project ARN**.

### 2. Build the iOS test package

Produce the package + testspec (via the CLI helper in Option A, or your own packaging step):
```
tests-universal/device-farm/dist/universal-ios-package.zip
tests-universal/device-farm/testspec-ios.yml
```

### 3. Create an automated run

1. In your project choose **Create a new run**
2. **Choose application**: **Web app**
3. **Upload your tests**: test type **Appium Node.js**, upload `universal-ios-package.zip`
4. **Custom test environment**: upload `testspec-ios.yml`
5. **Environment variables**: `TEST_APP_URL` = `https://main.d20a5ulgjk6z5r.amplifyapp.com`
6. **Select devices**: pick an **iOS** device pool
7. **Confirm and start run**

### 4. Review results

Open the run → click a device → view pass/fail, the session **video** (you'll see Safari being driven), Appium logs, and screenshots.

---

## Why iOS Is Different (Talking Point for the Workshop)

| | Android | iOS |
|--|---------|-----|
| Browser | Chrome | Safari |
| Automation protocol available | CDP (via ADB) | WebDriver only (Appium/XCUITest) |
| Playwright native support | Yes | No |
| How we run Playwright specs | Real Playwright | Compatibility shim |

Apple does not expose Safari's remote debugging protocol for automation the way Chrome exposes CDP. On Device Farm's macOS hosts there's also no way to install the `ios-webkit-debug-proxy` bridge (no admin, dependency-chain issues). So the pragmatic, reliable approach for iOS is Appium/XCUITest — wrapped so your Playwright test code stays identical.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Appium fails to start | Ensure you used `testspec-ios.yml` (it starts Appium with Safari + XCUITest + WebDriverAgent) |
| Elements not found | The shim resolves `getByRole`/`getByLabel` to CSS in the page; confirm the app deployed correctly |
| Submit clicks fail | The universal specs use the mobile-safe `submit()` helper which blurs the keyboard first |
| WDA / session errors | Device Farm provides a prebuilt WebDriverAgent via `DEVICEFARM_APPIUM_WDA_DERIVED_DATA_PATH`; the testspec wires this automatically |

## Next

**[Desktop Browser Testing →](./04-desktop-browser-testing.md)**
