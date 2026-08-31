# Prerequisites: Deploy the Sample App to AWS Amplify

## Why This Step Is Required

Device Farm runs your tests on **real devices and cloud browsers** inside AWS. Those devices need to reach the web app under test over the public internet — they cannot see `localhost` on your lab machine.

AWS Amplify Hosting gives us a fast, free way to publish the sample React app to a public HTTPS URL (like `https://main.d1234abcd.amplifyapp.com`). We'll use that URL as `TEST_APP_URL` in every later section.

```
Your tests (lab)  ──▶  Device Farm devices  ──▶  https://...amplifyapp.com  (the app)
```

## What You Need

- The sample app source (the `Playwright-Demo` project — includes `index.html`, `src/`, `package.json`, `vite.config.js`)
- AWS credentials (pre-configured in the lab)
- The app must build with `npm run build` into a `dist/` folder (Vite default)

---

## Option A: Command Line (Amplify Hosting via CLI)

From the VS Code Server terminal, in the project root:

### 1. Install dependencies and build

```bash
npm install
npm run build
```

This produces a static site in `dist/`.

### 2. Create an Amplify app and deploy the build

Amplify Hosting supports a "manual deploy" of a zip. Create the app, then deploy:

```bash
# Create the Amplify app (returns an appId)
APP_ID=$(aws amplify create-app \
  --name playwright-demo \
  --region us-west-2 \
  --query 'app.appId' --output text)
echo "App ID: $APP_ID"

# Create a branch to host the site
aws amplify create-branch \
  --app-id "$APP_ID" \
  --branch-name main \
  --region us-west-2

# Zip the build output
cd dist && zip -r ../site.zip . && cd ..

# Create a deployment, upload the zip to the returned URL, then start it
DEPLOY=$(aws amplify create-deployment \
  --app-id "$APP_ID" \
  --branch-name main \
  --region us-west-2)

UPLOAD_URL=$(echo "$DEPLOY" | python3 -c "import sys,json; print(json.load(sys.stdin)['zipUploadUrl'])")
JOB_ID=$(echo "$DEPLOY" | python3 -c "import sys,json; print(json.load(sys.stdin)['jobId'])")

curl -H "Content-Type: application/zip" --upload-file site.zip "$UPLOAD_URL"

aws amplify start-deployment \
  --app-id "$APP_ID" \
  --branch-name main \
  --job-id "$JOB_ID" \
  --region us-west-2
```

### 3. Get your public URL

```bash
echo "https://main.${APP_ID}.amplifyapp.com"
```

Wait ~1 minute, then open that URL in a browser to confirm the app loads (you should see the "Playwright Demo App" with Login / Contact / Feedback nav).

### 4. Save it for later sections

```bash
export TEST_APP_URL="https://main.${APP_ID}.amplifyapp.com"
echo $TEST_APP_URL
```

> Tip: In every later section you'll set `TEST_APP_URL` to this value.

---

## Option B: AWS Console (Amplify Hosting — Git or Drag-and-Drop)

### Path B1: Deploy from your Git repository (recommended if the app is in GitHub/CodeCommit)

1. Open the **AWS Amplify** console: https://console.aws.amazon.com/amplify
2. Choose **Create new app** (or **Host web app**)
3. Select your Git provider (GitHub, GitLab, Bitbucket, or CodeCommit) and authorize
4. Pick the repository and the branch (e.g. `main`)
5. Amplify auto-detects the build settings. Confirm they look like this (Vite):
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: dist
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```
6. Choose **Save and deploy**
7. Wait for the build to finish (Provision → Build → Deploy → Verify)
8. Copy the URL shown at the top (e.g. `https://main.d1234abcd.amplifyapp.com`)

### Path B2: Drag-and-drop a build (no Git needed)

1. On your lab machine, run `npm install && npm run build` to produce `dist/`
2. Zip the **contents** of `dist/` (not the folder itself)
3. Open the **AWS Amplify** console → **Create new app** → **Deploy without Git**
4. Give it a name (e.g. `playwright-demo`) and an environment name (e.g. `main`)
5. Drag the zip into the upload area
6. Choose **Save and deploy**
7. Copy the resulting URL

---

## Verify the Deployment

Open your Amplify URL and confirm:
- The **Login** page shows with Email and Password fields
- The nav has **Login**, **Contact**, **Feedback** links
- Navigating to `/contact` and `/feedback` works (SPA routing)

If routing to `/contact` shows a 404 on refresh, add a **rewrite rule** in Amplify:
- Console → your app → **Rewrites and redirects** → add:
  - Source: `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>`
  - Target: `/index.html`
  - Type: `200 (Rewrite)`

This makes the single-page app serve `index.html` for client-side routes.

---

## Next

You now have a public `TEST_APP_URL`. Continue to:
**[Android on Mobile Device Farm →](./02-android-device-farm.md)**
