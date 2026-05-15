export interface TestRailConfig {
  host: string;
  user: string;
  apiKey: string;
  projectId: number;
  suiteId: number;
}

export const testRailConfig: TestRailConfig = {
  host: Cypress.env('TESTRAIL_HOST'),
  user: Cypress.env('TESTRAIL_USERNAME'),
  apiKey: Cypress.env('TESTRAIL_API_KEY'),
  projectId: Number(Cypress.env('TESTRAIL_PROJECT_ID')),
  suiteId: Number(Cypress.env('TESTRAIL_SUITE_ID')),
};
