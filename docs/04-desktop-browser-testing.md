# Desktop Browser Testing (Playwright specs via Selenium)

## What We're Doing

We'll run the **same universal Playwright tests** on **desktop browsers** (Chrome, Firefox, Edge) using AWS Device Farm's **Desktop Browser Testing** feature.

Like iOS, Device Farm's desktop browser grid is a **Selenium/WebDriver** endpoint — it doesn't speak the Chrome DevTools Protocol. So the universal harness detects `TEST_PLATFORM=selenium` and swaps in a **Selenium-backed shim** that presents the Playwright API and drives the remote browser through the grid.

```
Universal specs (specs/*.spec.js)   ← same files again
        │  TEST_PLATFORM=selenium
        ▼
Selenium harness (emulates test/expect/getByRole on Jest)
        │  WebDriver → CreateTestGridUrl endpoint
        ▼
Chrome / Firefox / Edge on Device Farm's cloud hosts
```

**Important difference from mobile:** Desktop Browser Testing runs **from your machine/CI** connecting to a remote Selenium grid. There's **no test package upload and no testspec** — you just run the tests locally and they drive the cloud browsers over the wire.

## Prerequisites

- Completed **[Prerequisites: Deploy to Amplify](./01-prerequisites-amplify.md)**
- A **Device Farm Desktop Browser Testing project** (this is a *different* project type from Mobile Device Testing)

---

## Option A: Command Line

### 1. Create a Desktop Browser Testing project (if needed)

```bash
aws devicefarm create-test-grid-project \
  --name playwright-desktop \
  --region us-west-2
```

Copy the returned **project ARN**.

### 2. Set environment variables

```bash
export DEVICE_FARM_PROJECT_ARN="arn:aws:devicefarm:us-west-2:<acct>:testgrid-project:<id>"
export TEST_APP_URL="https://main.<appId>.amplifyapp.com"
export SELENIUM_BROWSER="chrome"   # or firefox, edge
```

> Use the **testgrid-project** ARN here — not a mobile project ARN.

### 3. Run the tests

```bash
npm run test:universal:selenium
```

This runs the specs under Jest with `TEST_PLATFORM=selenium`. The Selenium harness calls `CreateTestGridUrl` to get a signed grid endpoint, connects Selenium WebDriver to it, and runs the shared specs against the remote browser.

### 4. Run against multiple browsers

```bash
SELENIUM_BROWSER=chrome  npm run test:universal:selenium
SELENIUM_BROWSER=firefox npm run test:universal:selenium
SELENIUM_BROWSER=edge     npm run test:universal:selenium
```

---

## Option B: AWS Console

Desktop Browser Testing is primarily an API/SDK feature — you drive it from code, not by uploading a package. The Console is used mainly to **create the project** and **watch live/recorded sessions**.

### 1. Create the project

1. Open **Device Farm**: https://console.aws.amazon.com/devicefarm
2. Choose **Desktop Browser Testing** → **Projects** → **Create project**
3. Name it `playwright-desktop`, create it
4. Copy the **Project ARN**

### 2. Run your tests (from the terminal)

Even with the Console path, execution happens from code. Set the env vars and run:

```bash
export DEVICE_FARM_PROJECT_ARN="<testgrid-project-arn>"
export TEST_APP_URL="https://main.<appId>.amplifyapp.com"
npm run test:universal:selenium
```

### 3. Watch sessions in the Console

1. In the Desktop Browser Testing project, open **Sessions**
2. You'll see each browser session as it runs (or its recording afterward)
3. Click a session for the **video**, **console logs**, and metadata

---

## How the Grid Connection Works (Talking Point)

`CreateTestGridUrl` returns a short-lived, signed Selenium hub URL. Your Selenium client connects to it exactly as it would to any Selenium Grid:

```javascript
const { url } = await deviceFarm.send(
  new CreateTestGridUrlCommand({ projectArn, expiresInSeconds: 900 })
);
const driver = await new Builder()
  .usingServer(url)
  .withCapabilities({ browserName: 'chrome' })
  .build();
```

The universal Selenium harness does this for you and wraps the driver so your `page.getByRole(...).click()` calls work against the remote browser.

## Comparison to the Existing Selenium Sample

The base workshop / project also includes a **native Selenium** test folder (`tests-device-farm/`) written directly against the WebDriver API. That's the classic approach. The difference here:

| | Native Selenium (`tests-device-farm/`) | Universal specs (`tests-universal/`) |
|--|----------------------------------------|--------------------------------------|
| Test syntax | Selenium WebDriver API | Playwright API (shared with mobile + desktop) |
| Reuse | Desktop only | Same files run on Android, iOS, desktop |
| Best for | Teams already on Selenium | Teams standardizing on Playwright |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `DEVICE_FARM_PROJECT_ARN is required` | Set it to your **testgrid-project** ARN (not a mobile project) |
| Access denied on `CreateTestGridUrl` | The IAM user/role needs `devicefarm:CreateTestGridUrl` |
| App fails to load | Confirm `TEST_APP_URL` is your public Amplify URL |
| Wrong browser | Set `SELENIUM_BROWSER` to chrome, firefox, or edge |

## Next

**[Running Playwright at Scale →](./05-playwright-at-scale.md)**
