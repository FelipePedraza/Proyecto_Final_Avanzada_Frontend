import { defineConfig } from 'cypress';

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
      TESTRAIL_HOST: 'https://vivigo.testrail.io',
      TESTRAIL_PROJECT_ID: 1,
      TESTRAIL_SUITE_ID: 1,
    },
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
  },
  reporter: 'cypress-testrail-reporter',
  reporterOptions: {
    host: 'https://vivigo830.testrail.io',
    user: 'felipedraza830@gmail.com',
    apiKey: 'ObhUeyEaGYGFjYFBFipL-bEVgle.Usj7ritJffNTX',
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
