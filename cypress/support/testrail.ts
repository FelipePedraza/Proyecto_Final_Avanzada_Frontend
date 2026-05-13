export interface TestRailConfig {
  host: string;
  user: string;
  apiKey: string;
  projectId: number;
  suiteId: number;
}

export const testRailConfig: TestRailConfig = {
  host: Cypress.env('TESTRAIL_HOST') || 'https://vivigo.testrail.io',
  user: Cypress.env('TESTRAIL_USER') || '',
  apiKey: Cypress.env('TESTRAIL_API_KEY') || '',
  projectId: Number(Cypress.env('TESTRAIL_PROJECT_ID')) || 1,
  suiteId: Number(Cypress.env('TESTRAIL_SUITE_ID')) || 1,
};
