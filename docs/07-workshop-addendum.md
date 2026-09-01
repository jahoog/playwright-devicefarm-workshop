# Workshop Addendum

This page captures extra steps and corrections that aren't in the base workshop instructions but are needed to complete it successfully. Unlike the [Troubleshooting page](./06-troubleshooting.md) (which is a reference of symptoms and fixes), this addendum documents **required changes to specific steps in the base workshop**.

---

## Module 2, Lab 1 — Setup GitHub Repo (clone + fetch test assets)

**Where this applies:** Module 2, Lab 1, the **"Setup GitHub Repo"** step.

These helper commands clone your GitHub repo and pull in the sample test assets the lab expects. Run them from the lab's `Workshop` directory.

> Use `git clone` directly (not the `gh` CLI). Replace `<your-github-username>` with your GitHub owner, and adjust the repo name if yours differs.

```bash
# From the Workshop directory
cd /Workshop

# Clone your repo (use your own GitHub username/URL — not the gh tool)
git clone https://github.com/<your-github-username>/aws-device-farm-github-action-lab.git
cd aws-device-farm-github-action-lab

# Copy the sample Android test suite from the lab's test_packages
cp ../test_packages/TestSuite/MySampleAndroidTests.zip .

# Download the sample app APK
curl 'https://static.us-east-1.prod.workshops.aws/9023c493-eb13-44cb-9a9f-f123e4f7e89e/assets/resources/aws-devicefarm-sample-app.apk?Key-Pair-Id=K36Q2WVO3JP7QD&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9zdGF0aWMudXMtZWFzdC0xLnByb2Qud29ya3Nob3BzLmF3cy85MDIzYzQ5My1lYjEzLTQ0Y2ItOWE5Zi1mMTIzZTRmN2U4OWUvKiIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc4ODg5MTkzOH19fV19&Signature=UC7CAY0l661Q0fi7aO2elllgLjNXmhe1MNdVWnhALHdpqVpch-zjSCSPG1-zMqUx3ked73WVvFVj5XnhHpgNqQEL3CzPUnaTMA9q3IqOsDOmFalm33qKmZ1ESk~G11hM3Ngov5myNMiEHz7RUfzIRSQsLphWyk1nL-tMLl7GyhlCJyfTHw0jZPosScMpRuQ7-xvfcnFanTTp-snHwTUUCIludt6KvKUEheabag-G4moQNKsD21jrO5ZZn1Z1fkrX7CKmf8ZLYf11xgwe8KgQlfL7l0RoJx3xNVwckCnJjJtRmyyxsnB0SvDYaUIytIXXRS76iJvRDumLvUeZEdKkNA__' -o aws-devicefarm-sample-app.apk

# Download the WebdriverIO test spec
curl 'https://static.us-east-1.prod.workshops.aws/9023c493-eb13-44cb-9a9f-f123e4f7e89e/assets/resources/webdriverio_spec_file.yml?Key-Pair-Id=K36Q2WVO3JP7QD&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9zdGF0aWMudXMtZWFzdC0xLnByb2Qud29ya3Nob3BzLmF3cy85MDIzYzQ5My1lYjEzLTQ0Y2ItOWE5Zi1mMTIzZTRmN2U4OWUvKiIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc4ODg5MTkzOH19fV19&Signature=UC7CAY0l661Q0fi7aO2elllgLjNXmhe1MNdVWnhALHdpqVpch-zjSCSPG1-zMqUx3ked73WVvFVj5XnhHpgNqQEL3CzPUnaTMA9q3IqOsDOmFalm33qKmZ1ESk~G11hM3Ngov5myNMiEHz7RUfzIRSQsLphWyk1nL-tMLl7GyhlCJyfTHw0jZPosScMpRuQ7-xvfcnFanTTp-snHwTUUCIludt6KvKUEheabag-G4moQNKsD21jrO5ZZn1Z1fkrX7CKmf8ZLYf11xgwe8KgQlfL7l0RoJx3xNVwckCnJjJtRmyyxsnB0SvDYaUIytIXXRS76iJvRDumLvUeZEdKkNA__' -o webdriverio_spec_file.yml
```

Then commit the assets to your repo:

```bash
git add MySampleAndroidTests.zip aws-devicefarm-sample-app.apk webdriverio_spec_file.yml
git commit -m "Add sample app APK, Android test suite, and WebdriverIO spec"
git push
```

> Note: the two `curl` URLs are **time-limited signed CloudFront links** from the base workshop's asset bucket. If a download returns an access-denied or expired error, grab the current signed URLs from the base workshop's Module 2, Lab 1 instructions and substitute them.

---

## Module 2, Lab 1 — GitHub Actions OIDC trust relationship

**Where this applies:** Module 2, Lab 1, immediately **after the "Configure AWS Credentials" step**.

### Symptom

The GitHub Actions workflow fails at the *Configure AWS Credentials* step with:

```
Error: Could not assume role with OIDC:
Not authorized to perform sts:AssumeRoleWithWebIdentity
```

### Cause

The `DeviceFarm-GitHubActionRole` IAM role has a **trust policy** that restricts which GitHub repositories may assume it, matched against the OIDC token's `sub` (subject) claim.

GitHub has introduced a **newer, immutable-ID subject format** for newer repositories. In that format, the `sub` claim includes **numeric organization/user and repository IDs** rather than only the textual `owner/repo` path. If the trust policy only matches the old textual prefix (`repo:owner/repo:*`), the incoming token's subject no longer matches, so `sts:AssumeRoleWithWebIdentity` is denied.

### Fix

Update the trust relationship of **`DeviceFarm-GitHubActionRole`** so its `token.actions.githubusercontent.com:sub` condition matches **both** the textual and the immutable-ID subject formats. Add these two patterns to the `StringLike` condition:

```json
"StringLike": {
    "token.actions.githubusercontent.com:sub": [
        "repo:jahoog/aws-device-farm-github-action-lab-two:*",
        "repo:jahoog@*/aws-device-farm-github-action-lab-two@*:*"
    ]
}
```

- The **first** entry is the standard textual form: `repo:<owner>/<repo>:*`
- The **second** entry uses `@*` wildcards so it also matches the newer immutable-ID form, where the owner and repo carry numeric IDs

Replace `jahoog` and `aws-device-farm-github-action-lab-two` with **your** GitHub owner and repository name.

### How to apply it

**Console**
1. Open the IAM console → **Roles** → search for `DeviceFarm-GitHubActionRole`
2. Open the role → **Trust relationships** tab → **Edit trust policy**
3. Locate the statement for the GitHub OIDC provider (`token.actions.githubusercontent.com`)
4. Replace its `StringLike` condition with the block above (adjusting owner/repo)
5. **Update policy**, then re-run the GitHub Actions workflow

**CLI**

Save the full trust policy to `trust-policy.json` (the surrounding statement matters — this is just the condition; a complete example is below), then:

```bash
aws iam update-assume-role-policy \
  --role-name DeviceFarm-GitHubActionRole \
  --policy-document file://trust-policy.json
```

A complete trust policy document looks like this (replace the account ID, owner, and repo):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": [
            "repo:jahoog/aws-device-farm-github-action-lab-two:*",
            "repo:jahoog@*/aws-device-farm-github-action-lab-two@*:*"
          ]
        }
      }
    }
  ]
}
```

### Verify

Re-run the failing GitHub Actions job. The *Configure AWS Credentials* step should now succeed and the workflow should proceed to schedule the Device Farm run.

> Tip: if it still fails, print the token's subject to confirm the exact format your repo receives. In the workflow, the `actions/github-script` step can log `context`, or you can inspect the failed run's OIDC debug output. Then make sure one of the two `StringLike` patterns matches that subject.
