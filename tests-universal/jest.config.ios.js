/**
 * iOS Jest config — runs the universal specs via the iOS harness (Appium shim).
 *
 * The harness (loaded because TEST_PLATFORM=ios) emulates @playwright/test's
 * test/describe/expect on top of Jest, driving Safari through Appium.
 *
 * Appium must be running (started by the Device Farm testspec, or locally).
 */
module.exports = {
  testEnvironment: 'node',
  rootDir: './specs',
  testMatch: ['**/*.spec.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  testTimeout: 300000,
};
