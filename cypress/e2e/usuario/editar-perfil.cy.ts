describe('Editar Perfil - C1257', () => {
  beforeEach(() => {
    cy.loginAsHuesped();
    cy.intercept('GET', '**/usuarios/*', {
      statusCode: 200,
      body: {
        data: {
          nombre: 'Test', apellido: 'User', email: 'test@test.com',
          telefono: '3001234567', fechaNacimiento: '2000-01-01',
        },
      },
    }).as('getUsuario');
    cy.visit('/editar-perfil');
    cy.wait('@getUsuario');
  });

  it('C1258 Editar perfil - formulario visible', () => {
    cy.get('form').should('be.visible');
    cy.get('input[formControlName="nombre"]').should('be.visible');
    cy.get('input[formControlName="telefono"]').should('be.visible');
  });
});
