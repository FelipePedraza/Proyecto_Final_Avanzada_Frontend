const { defineConfig } = require('cypress');

const testrailHost = process.env.CYPRESS_TESTRAIL_HOST || 'https://vivigo830.testrail.io';
const testrailUser = process.env.CYPRESS_TESTRAIL_USERNAME || 'felipedraza830@gmail.com';
const testrailPass = process.env.CYPRESS_TESTRAIL_PASSWORD || 'ObhUeyEaGYGFjYFBFipL-bEVgle.Usj7ritJffNTX';
const testrailProjectId = parseInt(process.env.CYPRESS_TESTRAIL_PROJECT_ID || '1');
const testrailSuiteId = parseInt(process.env.CYPRESS_TESTRAIL_SUITE_ID || '1');

module.exports = defineConfig({
  e2e: {
    allowCypressEnv: true,
    baseUrl: 'http://localhost:4200',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    env: {
      apiUrl: 'http://localhost/api',
    },
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
  },
  reporter: 'cypress-testrail-reporter',
  reporterOptions: {
    host: testrailHost,
    username: testrailUser,
    password: testrailPass,
    projectId: testrailProjectId,
    suiteId: testrailSuiteId,
    includeAll: false,
  },
  component: {
    devServer: {
      framework: 'angular',
      bundler: 'webpack',
    },
    specPattern: 'src/**/*.cy.ts',
  },
});