import { defineConfig } from 'cypress';

const testrailHost = 'https://vivigo830.testrail.io';
const testrailUser = 'felipedraza830@gmail.com';
const testrailPassword = 'ObhUeyEaGYGFjYFBFipL-bEVgle.Usj7ritJffNTX';

export default defineConfig({
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
    password: testrailPassword,
    projectId: 1,
    suiteId: 1,
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
