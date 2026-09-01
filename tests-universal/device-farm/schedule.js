/**
 * Schedule universal specs on AWS Device Farm.
 *
 * Packages the SAME spec files + harness for either:
 *   --android : real Android via Playwright CDP (TEST_PLATFORM=android)
 *   --ios     : real iOS Safari via Appium shim (TEST_PLATFORM=ios)
 *
 * Usage:
 *   node tests-universal/device-farm/schedule.js --android
 *   node tests-universal/device-farm/schedule.js --ios
 *
 * Required env:
 *   DEVICE_FARM_PROJECT_ARN, TEST_APP_URL, DEVICE_POOL_ARN
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const {
  DeviceFarmClient,
  CreateUploadCommand,
  GetUploadCommand,
  ScheduleRunCommand,
  GetRunCommand,
} = require('@aws-sdk/client-device-farm');

const isIos = process.argv.includes('--ios');
const platform = isIos ? 'ios' : 'android';

const config = {
  projectArn: process.env.DEVICE_FARM_PROJECT_ARN,
  region: process.env.AWS_REGION || 'us-west-2',
  testAppUrl: process.env.TEST_APP_URL,
  devicePoolArn: process.env.DEVICE_POOL_ARN,
  executionTimeout: parseInt(process.env.TEST_TIMEOUT_MINUTES, 10) || 30,
};

const UNIVERSAL_DIR = path.join(__dirname, '..');

function validate() {
  if (!config.projectArn) { console.error('ERROR: DEVICE_FARM_PROJECT_ARN required.'); process.exit(1); }
  if (!config.testAppUrl) { console.error('ERROR: TEST_APP_URL required.'); process.exit(1); }
  if (!config.devicePoolArn) { console.error(`ERROR: DEVICE_POOL_ARN required (${platform} pool).`); process.exit(1); }
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

// Build a standard ZIP with `archiver`. Device Farm's Java-based unzipper is
// strict about the ZIP container; `tar -a -cf *.zip` on Linux produces a
// nonstandard archive that fails validation (APPIUM_WEB_NODE_TEST_PACKAGE_UNZIP_FAILED).
function zipDir(srcDir, zipPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', resolve);
    archive.on('warning', (err) => { if (err.code !== 'ENOENT') reject(err); });
    archive.on('error', reject);
    archive.pipe(output);
    // Contents at the archive root (not nested under a top-level folder).
    archive.directory(srcDir, false);
    archive.finalize();
  });
}

async function createPackage() {
  const outputDir = path.join(__dirname, 'dist');
  const zipPath = path.join(outputDir, `universal-${platform}-package.zip`);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  console.log(`📦 Packaging universal specs for ${platform}...`);

  const staging = path.join(outputDir, 'staging');
  if (fs.existsSync(staging)) fs.rmSync(staging, { recursive: true });
  fs.mkdirSync(staging, { recursive: true });

  // Copy specs and harness (same for both platforms)
  copyDir(path.join(UNIVERSAL_DIR, 'specs'), path.join(staging, 'specs'));
  copyDir(path.join(UNIVERSAL_DIR, 'harness'), path.join(staging, 'harness'));

  // Copy the relevant config
  if (isIos) {
    fs.copyFileSync(path.join(UNIVERSAL_DIR, 'jest.config.ios.js'), path.join(staging, 'jest.config.ios.js'));
  } else {
    fs.copyFileSync(path.join(UNIVERSAL_DIR, 'playwright.config.android.js'), path.join(staging, 'playwright.config.android.js'));
  }

  // package.json — dependencies differ per platform
  const deps = isIos
    ? { webdriverio: '^7.36.0', jest: '^29.7.0', expect: '^29.7.0' }
    : { playwright: '^1.40.0', '@playwright/test': '^1.40.0' };

  fs.writeFileSync(path.join(staging, 'package.json'), JSON.stringify({
    name: `universal-${platform}-tests`,
    version: '1.0.0',
    private: true,
    dependencies: deps,
  }, null, 2));

  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  await zipDir(staging, zipPath);
  fs.rmSync(staging, { recursive: true });
  console.log(`   Package created: ${zipPath}`);
  return zipPath;
}

async function uploadFile(client, filePath, type, contentType) {
  const fileName = path.basename(filePath);
  console.log(`⬆️  Uploading ${fileName} (type: ${type})...`);
  const { upload } = await client.send(new CreateUploadCommand({ projectArn: config.projectArn, name: fileName, type, contentType }));

  const putRes = await fetch(upload.url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: fs.readFileSync(filePath),
  });
  if (!putRes.ok) {
    throw new Error(`S3 upload PUT failed: ${putRes.status} ${putRes.statusText}`);
  }

  let status = 'PROCESSING';
  let waited = 0;
  while (status === 'PROCESSING' || status === 'INITIALIZED') {
    await new Promise((r) => setTimeout(r, 3000));
    waited += 3;
    const { upload: u } = await client.send(new GetUploadCommand({ arn: upload.arn }));
    status = u.status;
    if (status === 'FAILED') {
      // Surface Device Farm's explanation instead of a generic message.
      const reason = u.message || u.metadata || 'no reason provided by Device Farm';
      throw new Error(
        `Device Farm rejected "${fileName}" (type ${type}). Reason: ${reason}`
      );
    }
    if (waited > 120) {
      throw new Error(`Upload processing timed out after ${waited}s (last status: ${status})`);
    }
  }
  console.log(`   Done: ${upload.arn}`);
  return upload.arn;
}

async function waitForRun(client, runArn) {
  console.log('\n⏳ Waiting for run...\n');
  const terminal = ['COMPLETED', 'ERRORED', 'STOPPING', 'STOPPED'];
  let last = '';
  while (true) {
    const { run } = await client.send(new GetRunCommand({ arn: runArn }));
    if (run.status !== last) { console.log(`   ${run.status}`); last = run.status; }
    if (terminal.includes(run.status)) return run;
    await new Promise(r => setTimeout(r, 15000));
  }
}

async function main() {
  validate();
  const client = new DeviceFarmClient({ region: config.region });

  const zipPath = await createPackage();
  const testSpecFile = isIos ? 'testspec-ios.yml' : 'testspec-android.yml';

  const testPackageArn = await uploadFile(client, zipPath, 'APPIUM_WEB_NODE_TEST_PACKAGE', 'application/octet-stream');
  const testSpecArn = await uploadFile(client, path.join(__dirname, testSpecFile), 'APPIUM_WEB_NODE_TEST_SPEC', 'text/yaml');

  console.log(`🚀 Scheduling universal ${platform} run...`);
  const { run } = await client.send(new ScheduleRunCommand({
    projectArn: config.projectArn,
    name: `universal-${platform}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`,
    devicePoolArn: config.devicePoolArn,
    test: { type: 'APPIUM_WEB_NODE', testPackageArn, testSpecArn },
    configuration: { environmentVariables: [{ name: 'TEST_APP_URL', value: config.testAppUrl }] },
    executionConfiguration: { jobTimeoutMinutes: config.executionTimeout, videoCapture: true },
  }));
  console.log(`   Run ARN: ${run.arn}`);

  const result = await waitForRun(client, run.arn);
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`📊 ${platform.toUpperCase()} RESULT: ${result.result || result.status}`);
  if (result.counters) console.log(`   Passed: ${result.counters.passed}  Failed: ${result.counters.failed}  Total: ${result.counters.total}`);
  console.log('═'.repeat(50));
  if (result.result !== 'PASSED') process.exit(1);
}

main().catch(err => { console.error('💥', err.message); process.exit(1); });
