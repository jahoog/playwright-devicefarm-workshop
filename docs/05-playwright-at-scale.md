# Running Playwright at Scale (On Your Own AWS Infrastructure)

## What We're Doing

Device Farm is ideal for **real devices** and **cloud browsers**. But for high-volume **desktop web** regression — hundreds or thousands of tests on every commit — most teams run Playwright directly on their own compute and **parallelize** it.

This section shows how to take the same Playwright tests and run them at scale on AWS, using native Playwright (CDP) with **sharding** across parallel workers.

> This mirrors the approach in the reference article
> *[Automated Web Testing at Scale: Playwright Meets AWS](https://tutorialsdojo.com/automated-web-testing-at-scale-playwright-meets-aws/)*.
> Content summarized and adapted; see the original for the full walkthrough.
> (Content was rephrased for compliance with licensing restrictions.)

## The Core Idea: Sharding

Playwright has built-in **sharding** — split the test suite into N pieces and run each piece on a separate machine/container in parallel:

```bash
# Machine 1 of 4
npx playwright test --shard=1/4
# Machine 2 of 4
npx playwright test --shard=2/4
# ...and so on
```

Total wall-clock time drops roughly linearly with the number of shards. A 40-minute suite becomes ~10 minutes across 4 shards.

## Architecture Options on AWS

```
                    Source (CodeCommit / GitHub)
                              │
                        CI trigger
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
     Option 1: CodeBuild            Option 2: ECS/Fargate
     (batch build matrix)           (containerized workers)
     shard 1/4 ┐                    task 1/4 ┐
     shard 2/4 ├─ parallel          task 2/4 ├─ parallel
     shard 3/4 │                    task 3/4 │
     shard 4/4 ┘                    task 4/4 ┘
              │                               │
              └───────────────┬───────────────┘
                              ▼
              Merge blob reports → single HTML report
                              │
                       Upload to S3
```

### Option 1: AWS CodeBuild (simplest)

CodeBuild's **batch builds** can run a matrix of parallel jobs. Each job runs one shard.

`buildspec.yml` (conceptual):

```yaml
version: 0.2
batch:
  fast-fail: false
  build-matrix:
    dynamic:
      env:
        variables:
          SHARD: ["1/4", "2/4", "3/4", "4/4"]
phases:
  install:
    commands:
      - npm ci
      - npx playwright install --with-deps
  build:
    commands:
      - npx playwright test --shard=$SHARD --reporter=blob
  post_build:
    commands:
      - aws s3 cp blob-report/ s3://$REPORT_BUCKET/$CODEBUILD_BATCH_BUILD_IDENTIFIER/ --recursive
```

Then a final (non-batch) job merges the blob reports:

```bash
npx playwright merge-reports --reporter=html ./all-blob-reports
aws s3 cp playwright-report/ s3://$REPORT_BUCKET/latest/ --recursive
```

### Option 2: ECS / Fargate (containerized, more control)

Build a container from the official Playwright image and run each shard as a task:

```dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-jammy
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENTRYPOINT ["npx", "playwright", "test"]
```

Launch N Fargate tasks, passing `--shard=i/N` and a shared `TEST_APP_URL` via task environment. Tasks write blob reports to S3; a final step merges them.

Fargate gives you:
- Consistent, isolated environments per shard
- Easy horizontal scale (bump the task count)
- No servers to manage

## Reporting

Use Playwright's **blob reporter** on each shard, then **merge**:

```bash
# on each shard
npx playwright test --shard=$SHARD --reporter=blob

# after all shards finish
npx playwright merge-reports --reporter=html ./all-blob-reports
```

Host the merged HTML report on S3 (static website or presigned link) so the whole team can view results.

## When to Use Which

| Need | Use |
|------|-----|
| Real Android/iOS devices | Device Farm Mobile (sections 2 & 3) |
| Chrome/Firefox/Edge on cloud hosts, managed | Device Farm Desktop Browser (section 4) |
| High-volume desktop-web regression, full Playwright features, lowest cost per test | **Self-hosted sharded Playwright (this section)** |
| Fast local dev loop | `npm run test:e2e` locally |

Native Playwright at scale gives you the **full feature set** (tracing, network mocking, video, `toHaveScreenshot`) and the **lowest cost per test**, because you control the compute. Device Farm's value is the **real hardware** and **managed browser fleet** you can't easily replicate.

## Tie-In to the Universal Tests

The `tests-universal/specs/*.spec.js` files run here unchanged with `TEST_PLATFORM=desktop` (the default) — they're just standard Playwright. So the same suite you validated on real devices also powers your at-scale desktop regression:

```bash
# One shard, desktop, against the deployed app
TEST_APP_URL="https://main.<appId>.amplifyapp.com" \
  npx playwright test --config tests-universal/playwright.config.desktop.js --shard=1/4
```

## Next

**[Extracting to a Standalone Workshop Repo →](./06-extract-to-repo.md)**
