Cypress.Commands.add('login', (email: string, password: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/auth/login`,
    body: { email, password },
  }).then((response) => {
    sessionStorage.setItem('AuthToken', response.body.data.token);
    sessionStorage.setItem('RefreshToken', response.body.data.refreshToken);
  });
});

Cypress.Commands.add('loginAsHuesped', () => {
  cy.fixture('usuarios').then((usuarios) => {
    cy.login(usuarios.huesped.email, usuarios.huesped.password);
  });
});

Cypress.Commands.add('loginAsAnfitrion', () => {
  cy.fixture('usuarios').then((usuarios) => {
    cy.login(usuarios.anfitrion.email, usuarios.anfitrion.password);
  });
});
