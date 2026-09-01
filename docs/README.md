# Playwright on AWS Device Farm — Workshop Supplement

This supplement extends the [AWS Device Farm workshop](https://catalog.us-east-1.prod.workshops.aws/workshops/cc368000-bc1b-44d5-b096-f73714de460c/en-US) with **Playwright**. You'll take one set of Playwright tests and run them across:

- **Android** real devices (Mobile Device Farm)
- **iOS** real devices (Mobile Device Farm)
- **Desktop browsers** (Desktop Browser Testing)

Everything is driven by a single, shared test codebase (the "universal" tests) so you write once and run everywhere.

## What You'll Learn

By the end of this supplement you will have:

1. Used a pre-provisioned public sample web app as the test target (so Device Farm devices can reach it)
2. Run Playwright tests on **real Android devices** via the Chrome DevTools Protocol (CDP)
3. Run the same tests on **real iOS devices** via an Appium bridge
4. Run the same tests on **desktop browsers** (Chrome, Firefox, Edge) via the Selenium grid
5. Learned how to run Playwright **on your own infrastructure at scale**

## How the Tests Work

You write tests once using standard Playwright syntax. A small platform-aware "harness" swaps the engine based on where you're running:

```
                      specs/*.spec.js   (write once)
                              │
                     ┌────────┴─────────┐
              TEST_PLATFORM decides the engine
        ┌──────────┬───────────┬──────────────┐
     desktop     android       ios         selenium
        │          │            │              │
   Playwright  Playwright    Appium shim   Selenium shim
   (local)     via CDP/ADB   (Safari)      (DF Desktop grid)
```

- **Desktop & Android** run **real Playwright** — every API works natively.
- **iOS & Desktop-Browser** use lightweight shims that emulate the Playwright API on Appium/Selenium (since neither Safari-on-device nor Device Farm's desktop grid speak the Chrome DevTools Protocol).

## Capabilities Overview

| Capability | Service | Protocol | Real Playwright? | What it validates |
|-----------|---------|----------|------------------|-------------------|
| **Android real devices** | Device Farm — Mobile Device Testing | CDP over ADB | Yes (native) | Chrome on real Android phones/tablets |
| **iOS real devices** | Device Farm — Mobile Device Testing | WebDriver (Appium + XCUITest) | No (shim) | Safari on real iPhones/iPads |
| **Desktop browsers** | Device Farm — Desktop Browser Testing | WebDriver (Selenium grid) | No (shim) | Chrome, Firefox, Edge on cloud hosts |
| **Local / CI** | Your machine or CI runner | CDP | Yes (native) | Chromium, Firefox, WebKit locally |
| **At scale** | Your own AWS infra (CodeBuild/Fargate) | CDP | Yes (native) | Sharded parallel runs across containers |

### Why the protocol differs

Playwright natively speaks the **Chrome DevTools Protocol (CDP)**. That works great for:
- Desktop Chromium/Firefox/WebKit
- Chrome on Android (via ADB, which Device Farm exposes)

But it does **not** work for:
- **iOS Safari** — Apple doesn't expose CDP; automation goes through Appium/XCUITest
- **Device Farm's desktop grid** — it's a Selenium/WebDriver endpoint, not CDP

The shims bridge this gap so the same test files still run.

## Sections

Work through these in order:

1. **[Prerequisites: The Test App URL](./01-prerequisites.md)** — the pre-provisioned public app devices will test against
2. **[Android on Mobile Device Farm](./02-android-device-farm.md)** — Playwright over CDP on real Android
3. **[iOS on Mobile Device Farm](./03-ios-device-farm.md)** — Playwright tests on real Safari via Appium
4. **[Desktop Browser Testing](./04-desktop-browser-testing.md)** — Playwright tests on Chrome/Firefox/Edge
5. **[Running Playwright at Scale](./05-playwright-at-scale.md)** — self-hosted parallel execution on AWS
6. **[Troubleshooting & Common Issues](./06-troubleshooting.md)** — fixes for problems seen during the workshop

## Lab Environment Notes

This supplement assumes you're in the workshop lab environment, which provides:
- **VS Code Server** with a Linux command line
- **AWS credentials** pre-configured for the lab account
- **Node.js** installed

Each section gives you **two paths**:
- **Command line** — run from the VS Code Server terminal
- **AWS Console** — click through the browser UI

Pick whichever you prefer; they accomplish the same thing.
