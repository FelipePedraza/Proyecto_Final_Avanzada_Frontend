describe('Recuperación de Contraseña - C1239', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.contains('¿Olvidaste tu contraseña?').click();
  });

  it('C1240 Recuperar contraseña - formulario visible', () => {
    cy.get('form').should('be.visible');
    cy.get('input[type="email"]').should('be.visible');
    cy.contains('Enviar enlace de recuperación').should('be.visible');
  });

  it('debe validar email requerido al marcar campo como tocado', () => {
    cy.get('input[type="email"]').focus().blur();
    cy.get('.error-message').should('be.visible');
  });

  it('debe tener enlace para volver al login', () => {
    cy.contains('Volver al inicio de sesión').should('be.visible');
  });
});
