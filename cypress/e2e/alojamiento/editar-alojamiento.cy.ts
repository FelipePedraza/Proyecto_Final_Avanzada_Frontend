describe('Editar Alojamiento - C1247', () => {
  beforeEach(() => {
    cy.loginAsAnfitrion();
  });

  it('C1248 Editar alojamiento - formulario visible', () => {
    cy.visit('/editar-alojamiento/1');
    cy.get('form').should('be.visible');
    cy.get('input[formControlName="titulo"]').should('be.visible');
  });

  it('debe navegar a mis alojamientos', () => {
    cy.intercept('GET', '**/usuarios/*/alojamientos*', {
      statusCode: 200,
      body: { data: { content: [], pagination: { page: 0, size: 5, totalElements: 0, totalPages: 0 } } },
    }).as('getMisAlojamientos');
    cy.visit('/mis-alojamientos');
    cy.wait('@getMisAlojamientos');
    cy.url().should('include', '/mis-alojamientos');
  });
});
