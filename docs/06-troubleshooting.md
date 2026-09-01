# Troubleshooting & Common Issues

This section collects problems that came up while running the workshop in the lab environment, along with the fixes. Skim the [common issues table](#common-issues) first; the sections below give the full detail for the trickier ones.

The lab environment is **Amazon Linux (ARM64)** running **VS Code Server** with **Node.js 20**. Several issues below are specific to that environment (ARM64, no `apt-get`, running behind a CloudFront proxy).

---

## IAM execution role trust policy

If a Device Farm run fails to assume your IAM execution role — or the console rejects the role when you attach it to a project or run — the cause is almost always the **trust policy**. Device Farm assumes an execution role during test execution so your tests can reach AWS resources (S3, DynamoDB, CloudWatch, etc.), and the role must trust the Device Farm **service principal**.

The current, correct format uses `devicefarm.amazonaws.com` as the trusted service with the `sts:AssumeRole` action:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "devicefarm.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Points that tripped us up:

- **Attach this trust policy only to the role you use with Device Farm**, not to other roles in your account.
- **Session duration** must be at least as long as your project's job timeout. Device Farm's default job timeout is 150 minutes, so set the role's maximum session duration to **at least 150 minutes**.
- **Same account** — the role must live in the same AWS account that calls Device Farm; cross-account assumption is not supported.
- **PassRole** — whoever configures the role on the project or run needs `iam:PassRole` on that role.

Source: [Access AWS resources using an IAM Execution Role](https://docs.aws.amazon.com/devicefarm/latest/developerguide/custom-test-environments-iam-roles.html). Content was rephrased for compliance with licensing restrictions.

---

## Test package fails with `APPIUM_WEB_NODE_TEST_PACKAGE_UNZIP_FAILED`

When scheduling an Android or iOS run, the upload was rejected:

```
Device Farm rejected "universal-android-package.zip" (type APPIUM_WEB_NODE_TEST_PACKAGE).
Reason: {"errorCode":"APPIUM_WEB_NODE_TEST_PACKAGE_UNZIP_FAILED", ...}
```

**Cause:** the packaging step originally built the `.zip` with `tar -a -cf file.zip` on Linux. `tar`'s zip output is nonstandard, and Device Farm's Java-based unzipper rejects it.

**Fix:** build a standard ZIP with the `archiver` npm library instead of shelling out to `tar`. The scheduler (`tests-universal/device-farm/schedule.js`) now streams the staging directory through `archiver`, which produces a ZIP that starts with the standard `PK` header and unpacks cleanly. `archiver` is declared in `devDependencies`, so make sure you've run `npm install` after pulling the fix.

If you package the tests some other way, verify the archive is a real ZIP (not a tar renamed to `.zip`) — a quick check is that the first two bytes are `PK`.

---

## Lab preview page is blank or won't load behind the proxy

The lab serves the sample app through a CloudFront proxy at a path like `https://<id>.cloudfront.net/proxy/3000/`. A few distinct failures showed up here.

**Blocked request / host not allowed**

```
Blocked request. This host ("<id>.cloudfront.net") is not allowed.
```

Vite blocks unknown hosts by default. The `vite.config.js` in this repo sets `server.host`, `server.allowedHosts`, and `base: './'` to work behind the proxy.

**`NS_ERROR_CORRUPTED_CONTENT` on `/@vite/client`, `/src/main.jsx`, `/@react-refresh`**

This happens with `npm run dev`. The Vite **dev server** injects root-absolute module paths (`/@vite/client`, etc.) that don't survive the `/proxy/3000/` path prefix, so the browser can't load them and the page stays blank.

**Fix:** don't use the dev server for the proxied preview. Build first, then preview:

```bash
npm run build
npm run preview -- --host --port 3000
```

`base: './'` makes the built assets load with relative paths, which work behind the proxy. (`base: './'` only affects `build`/`preview`, which is why `npm run dev` still misbehaves.)

> Note: the workshop tests target the pre-provisioned public app URL, not the lab preview. The preview is only for eyeballing the app locally.

---

## `npm run dev` fails: cannot find `@rollup/rollup-linux-arm64-gnu`

```
Error: Cannot find module @rollup/rollup-linux-arm64-gnu.
npm has a bug related to optional dependencies (https://github.com/npm/cli/issues/4828).
```

**Cause:** a known npm bug where the platform-specific optional dependency for Rollup (needed on ARM64 Linux) doesn't get installed. This is common on the ARM64 lab.

**Fix:** remove the lockfile and `node_modules`, then reinstall so npm resolves the correct native binary:

```bash
rm -rf node_modules package-lock.json
npm install
```

---

## `npm install` fails: `ENOSPC: no space left on device`

The lab volume can fill up (Playwright browser downloads and `node_modules` are large).

**Fix:** grow the EBS volume and expand the filesystem. From the lab shell:

```bash
# Find the volume/instance
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 300")
INSTANCE_ID=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)
REGION=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/region)
VOLUME_ID=$(aws ec2 describe-volumes --region "$REGION" \
  --filters "Name=attachment.instance-id,Values=$INSTANCE_ID" \
  --query 'Volumes[0].VolumeId' --output text)

# Grow the volume by 8 GB
CURRENT=$(aws ec2 describe-volumes --region "$REGION" --volume-ids "$VOLUME_ID" \
  --query 'Volumes[0].Size' --output text)
aws ec2 modify-volume --region "$REGION" --volume-id "$VOLUME_ID" --size $(($CURRENT + 8))

# Wait for the modification to finish, then expand the filesystem
aws ec2 wait volume-in-use --region "$REGION" --volume-ids "$VOLUME_ID"
sleep 10
ROOT_DEV=$(findmnt -no SOURCE /)
DISK=$(lsblk -no PKNAME "$ROOT_DEV")
sudo growpart "/dev/$DISK" "$(cat /sys/class/block/$(basename $ROOT_DEV)/partition)"

# Resize the filesystem (xfs vs ext4)
if [ "$(findmnt -no FSTYPE /)" = "xfs" ]; then
  sudo xfs_growfs -d /
else
  sudo resize2fs "$ROOT_DEV"
fi

df -h /
```

Confirm the new size with `df -h /` at the end.

---

## Running browsers locally in the lab

Installing Playwright browsers in the lab prints a host-validation warning and `sudo npx playwright install-deps` fails with `apt-get: command not found`.

**Cause:** Playwright's browser dependency installer targets Ubuntu/Debian (`apt-get`). The lab is **Amazon Linux**, which uses a different package manager, so the OS is unsupported for local browser runs.

**What to do:** don't try to run browsers locally in the lab. The workshop is designed to run tests **on Device Farm** (real devices and the desktop grid) against the pre-provisioned public app, so local browsers aren't needed. If you want to run the desktop specs locally, do it on your own machine where `npx playwright install` is supported.

---

## AWS SDK Node version warning

```
NodeVersionSupportWarning: The AWS SDK for JavaScript (v3) versions published
after the first week of January 2027 will require node >=22. You are running node v20.
```

This is **informational only** and does not affect the workshop — the lab's Node 20 works fine with the current SDK. You can ignore it.

---

## Project ARN vs testgrid-project ARN

Device Farm has two kinds of project ARNs, and using the wrong one causes runs to silently not schedule:

- **Mobile** (Android/iOS Appium runs): `arn:aws:devicefarm:us-west-2:<acct>:project:<guid>`
- **Desktop Browser / TestGrid**: `arn:aws:devicefarm:us-west-2:<acct>:testgrid-project:<guid>`

Make sure `DEVICE_FARM_PROJECT_ARN` for the Android and iOS sections is a **mobile** `project:` ARN, not a `testgrid-project:` ARN.

---

## Common issues

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `APPIUM_WEB_NODE_TEST_PACKAGE_UNZIP_FAILED` on upload | Package zipped with `tar` (nonstandard zip) | Use the `archiver`-based packaging; run `npm install`; confirm the zip starts with `PK` |
| Device Farm can't assume the execution role | Trust policy missing/incorrect service principal | Trust `devicefarm.amazonaws.com` with `sts:AssumeRole`; session duration ≥ job timeout (default 150 min) |
| `Blocked request. This host is not allowed` | Vite host allow-list | `server.allowedHosts` + `server.host` are set in `vite.config.js` |
| Blank preview, `NS_ERROR_CORRUPTED_CONTENT` on `/@vite/client` | Using `npm run dev` behind the `/proxy/3000/` prefix | Use `npm run build` + `npm run preview -- --host --port 3000` (relies on `base: './'`) |
| `Cannot find module @rollup/rollup-linux-arm64-gnu` | npm optional-deps bug on ARM64 | `rm -rf node_modules package-lock.json && npm install` |
| `ENOSPC: no space left on device` | Lab volume full | Grow the EBS volume + expand the filesystem (see above) |
| `apt-get: command not found` during `playwright install-deps` | Amazon Linux, not Ubuntu | Don't run browsers locally in the lab; use Device Farm |
| Run schedules but nothing happens | Wrong project ARN type | Use a mobile `project:` ARN for Android/iOS, `testgrid-project:` for Desktop Browser |
| `NodeVersionSupportWarning` from AWS SDK | Node 20 vs future SDK requirement | Informational only — safe to ignore |
| `Not authorized to perform sts:AssumeRoleWithWebIdentity` (GitHub Actions) | OIDC role trust policy doesn't match GitHub's newer immutable-ID subject format | Update the role trust policy — see the [Workshop Addendum](./07-workshop-addendum.md) |

---

## Still stuck?

- Check the run's **video, logs, and screenshots** in the Device Farm console — they usually pinpoint device-side failures.
- Re-read the section for the platform you're on ([Android](./02-android-device-farm.md), [iOS](./03-ios-device-farm.md), [Desktop Browser](./04-desktop-browser-testing.md)).
- Confirm your environment variables (`DEVICE_FARM_PROJECT_ARN`, `TEST_APP_URL`, `DEVICE_POOL_ARN`) are set for the right platform.
