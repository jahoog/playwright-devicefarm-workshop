# Prerequisites: The Test App URL

## Why This Matters

Device Farm runs your tests on **real devices and cloud browsers** inside AWS. Those devices reach the web app under test over the public internet — they cannot see `localhost` on your lab machine.

For this workshop, a sample web app has already been deployed for you to a public HTTPS URL:

```
https://main.d20a5ulgjk6z5r.amplifyapp.com/
```

You'll use this URL as `TEST_APP_URL` in every later section.

```
Your tests (lab)  ──▶  Device Farm devices  ──▶  https://main.d20a5ulgjk6z5r.amplifyapp.com/  (the app)
```

## Verify the App Is Reachable

Open the URL in a browser and confirm:

- The **Login** page shows with Email and Password fields
- The nav has **Login**, **Contact**, and **Feedback** links
- Clicking **Contact** and **Feedback** navigates correctly

Or check from the terminal:

```bash
curl -I https://main.d20a5ulgjk6z5r.amplifyapp.com/
```

You should get `HTTP/2 200`.

## Set the Environment Variable

Every later section uses `TEST_APP_URL`. Set it once in your terminal session:

**Linux / macOS (workshop lab VS Code Server):**
```bash
export TEST_APP_URL="https://main.d20a5ulgjk6z5r.amplifyapp.com"
echo $TEST_APP_URL
```

**Windows PowerShell (if running locally):**
```powershell
$env:TEST_APP_URL = "https://main.d20a5ulgjk6z5r.amplifyapp.com"
echo $env:TEST_APP_URL
```

> Note: no trailing slash — the tests append paths like `/contact` and `/feedback` themselves.

## (Optional) Deploy Your Own Copy Later

If you want to host your own instance instead of the shared one, you can deploy the app to AWS Amplify. That's outside the scope of this workshop, but the short version is:

```bash
npm install && npm run build   # produces dist/
# then upload dist/ via the Amplify console (Deploy without Git) or the Amplify CLI
```

For now, just use the pre-provisioned URL above.

## Next

You have your `TEST_APP_URL`. Continue to:
**[Android on Mobile Device Farm →](./02-android-device-farm.md)**
