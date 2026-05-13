describe('Registro - C1237', () => {
  beforeEach(() => {
    cy.visit('/registro');
  });

  it('C1238 Registro de nuevo usuario - formulario visible', () => {
    cy.get('form').should('be.visible');
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible');
  });

  it('debe mostrar errores de validación al marcar campos como tocados', () => {
    cy.get('input[formControlName="nombre"]').focus().blur();
    cy.get('.error-message').should('be.visible');
  });

  it('debe tener enlace para ir a login', () => {
    cy.contains('Inicia Sesión').should('be.visible');
  });
});
