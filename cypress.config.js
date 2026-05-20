const { defineConfig } = require('cypress');

const apiUrl = process.env.CYPRESS_apiUrl;
const baseUrl = process.env.CYPRESS_BASE_URL;
const testrailHost = process.env.CYPRESS_TESTRAIL_HOST;
const testrailUser = process.env.CYPRESS_TESTRAIL_USERNAME;
const testrailPass = process.env.CYPRESS_TESTRAIL_API_KEY;
const testrailProjectId = parseInt(process.env.CYPRESS_TESTRAIL_PROJECT_ID);
const testrailSuiteId = parseInt(process.env.CYPRESS_TESTRAIL_SUITE_ID);

const testrailEnabled =
  !!testrailHost &&
  !!testrailUser &&
  !!testrailPass &&
  !isNaN(testrailProjectId) &&
  !isNaN(testrailSuiteId);

console.log('[Cypress Config] TestRail reporter enabled:', testrailEnabled);

module.exports = defineConfig({
  e2e: {
    baseUrl: baseUrl,
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    retries: {
      runMode: 2,
      openMode: 0,
    },
    env: {
      apiUrl: apiUrl,
    },
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    reporter: testrailEnabled ? 'cypress-testrail-reporter' : 'spec',
    reporterOptions: testrailEnabled
      ? {
          host: testrailHost,
          username: testrailUser,
          password: testrailPass,
          projectId: testrailProjectId,
          suiteId: testrailSuiteId,
          includeAll: false,
        }
      : {},
  },
  component: {
    devServer: {
      framework: 'angular',
      bundler: 'webpack',
    },
    specPattern: 'src/**/*.cy.ts',
  },
});
