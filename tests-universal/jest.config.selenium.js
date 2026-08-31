/**
 * Selenium Jest config — runs the universal specs via the Selenium harness
 * against the AWS Device Farm Desktop Browser grid.
 *
 * TEST_PLATFORM=selenium makes the harness connect Selenium to a Device Farm
 * TestGridUrl. Runs from your machine/CI — the browsers are remote.
 *
 * Required env: DEVICE_FARM_PROJECT_ARN, TEST_APP_URL
 * Optional env: SELENIUM_BROWSER (chrome | firefox | edge, default chrome)
 */
module.exports = {
  testEnvironment: 'node',
  rootDir: './specs',
  testMatch: ['**/*.spec.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  testTimeout: 180000,
};
