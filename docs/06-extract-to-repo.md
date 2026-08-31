# Extracting to a Standalone Workshop Repo

This supplement lives inside the larger `Playwright-Demo` project. To distribute it as its own workshop, you'll copy **only the files the workshop needs** into a fresh repo. This page tells you exactly which files to take and how to wire them up.

## What the Workshop Actually Needs

The workshop uses the **universal tests** path plus the sample app. You do **not** need the other experimental folders (`tests-unified/`, `tests-playwright-mobile/`, `tests-playwright-shim/`, `tests-device-farm*/`) unless you want to keep them as extra examples.

### Required files

```
playwright-devicefarm-workshop/          ← new repo root
├── package.json                         ← trimmed (see below)
├── vite.config.js                       ← from the original project
├── index.html                           ← from the original project
├── playwright.config.js                 ← base config (optional, for local e2e)
├── src/                                 ← the sample app (App.jsx, components/, main.jsx, styles.css)
│   ├── App.jsx
│   ├── main.jsx
│   ├── styles.css
│   └── components/
│       ├── LoginForm.jsx
│       ├── ContactForm.jsx
│       └── FeedbackForm.jsx
├── tests-universal/                     ← the shared tests + harness + configs
│   ├── specs/
│   │   ├── login.spec.js
│   │   ├── contact.spec.js
│   │   ├── feedback.spec.js
│   │   └── navigation.spec.js
│   ├── harness/                         ← all harness files
│   ├── playwright.config.desktop.js
│   ├── playwright.config.android.js
│   ├── jest.config.ios.js
│   ├── jest.config.selenium.js
│   └── device-farm/
│       ├── testspec-android.yml
│       ├── testspec-ios.yml
│       └── schedule.js
└── docs/                                ← this supplement
    ├── README.md
    ├── 01-prerequisites-amplify.md
    ├── 02-android-device-farm.md
    ├── 03-ios-device-farm.md
    ├── 04-desktop-browser-testing.md
    ├── 05-playwright-at-scale.md
    └── 06-extract-to-repo.md
```

## Option A: Extract with a Script (Command Line)

From the current `Playwright-Demo` root, run this to assemble a clean workshop folder:

```bash
# 1. Create the target directory
DEST=../playwright-devicefarm-workshop
mkdir -p "$DEST"

# 2. Copy the sample app
cp -r src index.html vite.config.js "$DEST"/

# 3. Copy the universal tests
cp -r tests-universal "$DEST"/

# 4. Copy the supplement docs into a docs/ folder
mkdir -p "$DEST/docs"
cp workshop-supplement/*.md "$DEST/docs"/

# 5. Copy base configs (optional)
cp playwright.config.js "$DEST"/ 2>/dev/null || true
```

Then create a trimmed `package.json` in the new repo (see the template below), `cd` in, and:

```bash
cd "$DEST"
npm install
git init
git add .
git commit -m "Initial workshop repo"
```

## Option B: Manual Copy (VS Code)

1. Create a new folder `playwright-devicefarm-workshop`
2. Drag these from the original project into it:
   - `src/`, `index.html`, `vite.config.js`
   - `tests-universal/` (the whole folder)
3. Create a `docs/` folder and copy the six `workshop-supplement/*.md` files into it
4. Create a trimmed `package.json` (template below)
5. Open a terminal and run `npm install`

## Trimmed `package.json` Template

Only the dependencies and scripts the workshop uses:

```json
{
  "name": "playwright-devicefarm-workshop",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test:universal": "npx playwright test --config tests-universal/playwright.config.desktop.js",
    "test:universal:android": "set TEST_PLATFORM=android&& npx playwright test --config tests-universal/playwright.config.android.js",
    "test:universal:ios": "set TEST_PLATFORM=ios&& jest --config tests-universal/jest.config.ios.js --runInBand",
    "test:universal:selenium": "set TEST_PLATFORM=selenium&& jest --config tests-universal/jest.config.selenium.js --runInBand",
    "test:universal:device-farm:android": "node tests-universal/device-farm/schedule.js --android",
    "test:universal:device-farm:ios": "node tests-universal/device-farm/schedule.js --ios"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0"
  },
  "devDependencies": {
    "@aws-sdk/client-device-farm": "^3.450.0",
    "@playwright/test": "^1.40.0",
    "playwright": "^1.40.0",
    "@vitejs/plugin-react": "^4.2.0",
    "jest": "^29.7.0",
    "expect": "^29.7.0",
    "selenium-webdriver": "^4.15.0",
    "webdriverio": "^7.36.0",
    "vite": "^5.0.0"
  }
}
```

> Cross-platform note: the `set VAR=x&&` syntax works on Windows. For a Linux/macOS lab, either use `cross-env` (add it to devDependencies and prefix the scripts with `cross-env`) or have participants `export` the variable before running. Since the workshop lab is Linux, consider switching the scripts to `cross-env`:
>
> ```json
> "test:universal:android": "cross-env TEST_PLATFORM=android npx playwright test --config tests-universal/playwright.config.android.js",
> ```

## Recommended Repo Extras

Add these to make the standalone repo workshop-ready:

- **`README.md`** at the root — point to `docs/README.md` as the entry point
- **`.gitignore`** — include `node_modules`, `dist`, `test-results`, `playwright-report*`, `tests-universal/device-farm/dist`, `.env`
- **`amplify.yml`** — if you want one-click Amplify Git deploys (see section 01, Path B1)
- **LICENSE** — pick an appropriate license for distribution

## Publishing to a Workshop Studio Repo

If you're contributing to **AWS Workshop Studio**:

1. Push the standalone repo to your Git host (GitHub/CodeCommit)
2. Workshop content markdown typically lives under a `content/` directory with a `contentspec.yaml` — adapt the `docs/*.md` into that structure
3. Reference the sample app + tests as the repo's code assets participants clone in the lab
4. In the lab bootstrap, pre-install Node and clone this repo into the VS Code Server workspace

## Sanity Check Before Publishing

From the extracted repo:

```bash
npm install
npm run dev &            # start the app
npm run test:universal   # desktop path should pass 14/14
```

If desktop passes, the shared specs and harness are wired correctly and the Device Farm paths will work once participants supply their project ARNs and `TEST_APP_URL`.

## Back to Start

**[Supplement Home →](./README.md)**
