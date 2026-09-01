# Android on Mobile Device Farm (Playwright over CDP)

## What We're Doing

We'll run the **universal Playwright tests** on **real Android devices** in AWS Device Farm. On Android this uses **real Playwright** — no shim, no Appium. Playwright's experimental `_android` API connects to the device's Chrome browser over the **Chrome DevTools Protocol (CDP)**, tunneled through **ADB**, which Device Farm's test host provides.

```
Universal specs (specs/*.spec.js)
        │  TEST_PLATFORM=android
        ▼
android-fixture (real Playwright Page)
        │  _android.devices() → launchBrowser()
        ▼
CDP over ADB  →  Chrome on a real Android phone
```

**Why this is nice:** it's genuinely Playwright driving real mobile Chrome, so you get the full Playwright API, fast execution, and rich error messages.

## Prerequisites

- Completed **[Prerequisites](./01-prerequisites.md)** — repo cloned, dependencies installed, and you have a `TEST_APP_URL`
- A **Device Farm Mobile Device Testing project** and an **Android device pool**

---

## Option A: Command Line

From the VS Code Server terminal, in the project root.

### 1. Set environment variables

```bash
export DEVICE_FARM_PROJECT_ARN="arn:aws:devicefarm:us-west-2:<acct>:project:<id>"
export TEST_APP_URL="https://main.d20a5ulgjk6z5r.amplifyapp.com"
export DEVICE_POOL_ARN="arn:aws:devicefarm:us-west-2:<acct>:devicepool:<id>"
```

Don't have the ARNs yet? Create/list them:

```bash
# Create a Mobile Device Testing project (returns the project ARN)
aws devicefarm create-project --name playwright-android --region us-west-2 \
  --query 'project.arn' --output text

# List device pools for the project
aws devicefarm list-device-pools --arn "$DEVICE_FARM_PROJECT_ARN" --region us-west-2
```

### 2. Run the tests

```bash
npm run test:universal:device-farm:android
```

This script (`tests-universal/device-farm/schedule.js --android`) will:
1. Package the shared specs + harness into a zip
2. Upload it and the Android testspec to Device Farm
3. Schedule a run on your device pool
4. Poll until complete and print pass/fail counts

### 3. View results

The console output shows counts. For full detail (video, logs, per-device results):

```bash
# List the most recent runs
aws devicefarm list-runs --arn "$DEVICE_FARM_PROJECT_ARN" --region us-west-2 \
  --query 'runs[0].{name:name,result:result,arn:arn}'
```

Then open the AWS Console (see Option B, step 5) to watch the video artifact.

---

## Option B: AWS Console

### 1. Create a Mobile Device Testing project

1. Open **Device Farm**: https://console.aws.amazon.com/devicefarm
2. Choose **Mobile Device Testing** → **Projects** → **New project**
3. Name it `playwright-android`, choose **Create project**
4. Copy the **Project ARN** (Project settings → ARN)

### 2. Build the test package locally

Device Farm's automated run needs an uploaded test package. Generate it once with the CLI helper (it stops before scheduling if you only want the zip), or run the full command-line flow from Option A. The package is created at:
```
tests-universal/device-farm/dist/universal-android-package.zip
```
and the testspec is at:
```
tests-universal/device-farm/testspec-android.yml
```

### 3. Create an automated run

1. In your project choose **Create a new run**
2. **Choose application**: select **Web app** (this is a browser test, no APK needed)
3. **Upload your tests**: choose **Appium Node.js** as the test type, and upload `universal-android-package.zip`
4. **Custom test environment**: upload `testspec-android.yml` as the test spec
5. **Environment variables**: add `TEST_APP_URL` = `https://main.d20a5ulgjk6z5r.amplifyapp.com`
6. **Select devices**: pick your Android device pool (or create one with a few phones)
7. Choose **Confirm and start run**

### 4. Watch it run

Device Farm provisions the device(s), runs the testspec (installs Node, connects Playwright via ADB/CDP, runs the specs), and records everything.

### 5. Review results

1. Open the completed run
2. Click a device to see:
   - **Pass/fail** per test
   - **Video** recording of the session
   - **Logs** (Playwright output, device logs)
   - **Screenshots** on failure
   - The HTML report is under **Customer Artifacts** (`playwright-report/`)

---

## What Success Looks Like

All 14 universal tests pass on the real device. The run typically completes in a couple of minutes per device — Playwright over CDP is fast even on real hardware.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `No Android devices found via ADB` | The testspec runs `adb devices`; ensure you used the Android testspec and a mobile project |
| Submit-button clicks time out | The universal specs use a mobile-safe `submit()` helper that dismisses the keyboard; make sure you're on the latest specs |
| App fails to load | Confirm `TEST_APP_URL` is set to the pre-provisioned URL and reachable |
| `EACCES` writing report | The Android config writes the report to `$DEVICEFARM_LOG_DIR`; ensure you're using the provided config |

## Next

**[iOS on Mobile Device Farm →](./03-ios-device-farm.md)**
