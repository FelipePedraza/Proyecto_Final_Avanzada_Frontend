describe('Crear Alojamiento - C1245', () => {
  beforeEach(() => {
    cy.loginAsAnfitrion();
    cy.visit('/crear-alojamiento');
  });

  it('C1246 Crear alojamiento como anfitrión - formulario visible', () => {
    cy.get('form').should('be.visible');
    cy.get('input[formControlName="titulo"]').should('be.visible');
    cy.get('textarea[formControlName="descripcion"]').should('be.visible');
  });

  it('debe redirigir a home si no es anfitrión', () => {
    cy.logout();
    cy.visit('/crear-alojamiento');
    cy.location('pathname').should('eq', '/');
  });
});
