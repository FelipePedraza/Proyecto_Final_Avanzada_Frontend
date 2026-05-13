describe('Buscar Alojamiento - C1241', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('C1242 Buscar alojamientos por ciudad', () => {
    cy.visit('/busqueda?ciudad=Armenia');
    cy.url().should('include', '/busqueda');
    cy.get('app-busqueda').should('exist');
  });

  it('debe mostrar la página de inicio con opciones de búsqueda', () => {
    cy.get('nav').should('be.visible');
    cy.get('app-inicio').should('exist');
  });

  it('debe cargar página de detalle de alojamiento', () => {
    cy.visit('/alojamiento/1');
    cy.get('app-detalle-alojamiento').should('exist');
  });
});
