Cypress.Commands.add('logout', () => {
  sessionStorage.clear();
});

Cypress.Commands.add('getToken', () => {
  return cy.wrap(sessionStorage.getItem('AuthToken'));
});

Cypress.Commands.add('isAuthenticated', () => {
  const token = sessionStorage.getItem('AuthToken');
  return cy.wrap(!!token);
});
