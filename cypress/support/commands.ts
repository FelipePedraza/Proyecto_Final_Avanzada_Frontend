function crearTokenFalso(rol: string, email = 'test@test.com'): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: '1',
    rol,
    email,
    exp: Math.floor(Date.now() / 1000) + 86400,
  }));
  return `${header}.${payload}.firma-falsa`;
}

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/auth/login`,
    body: { email, password },
    failOnStatusCode: false,
  }).then((response) => {
    if (response.isOkStatusCode) {
      sessionStorage.setItem('AuthToken', response.body.data.token);
      sessionStorage.setItem('RefreshToken', response.body.data.refreshToken);
    }
  });
});

Cypress.Commands.add('loginAsHuesped', () => {
  const token = crearTokenFalso('ROL_Huesped');
  sessionStorage.setItem('AuthToken', token);
  sessionStorage.setItem('RefreshToken', 'fake-refresh-token');
});

Cypress.Commands.add('loginAsAnfitrion', () => {
  const token = crearTokenFalso('ROL_Anfitrion');
  sessionStorage.setItem('AuthToken', token);
  sessionStorage.setItem('RefreshToken', 'fake-refresh-token');
});
