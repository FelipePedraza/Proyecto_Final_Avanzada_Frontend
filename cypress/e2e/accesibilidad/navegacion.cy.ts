describe('Navegación y Accesibilidad', () => {
  it('debe navegar a todas las rutas públicas', () => {
    cy.visit('/');
    cy.get('app-encabezado').should('be.visible');
    cy.visit('/busqueda');
    cy.get('app-busqueda').should('exist');
    cy.visit('/alojamiento/1');
    cy.get('app-detalle-alojamiento').should('exist');
  });

  it('debe redirigir a home si no autenticado en rutas protegidas', () => {
    cy.visit('/mis-reservas');
    cy.location('pathname').should('eq', '/');
    cy.visit('/chat');
    cy.location('pathname').should('eq', '/');
  });

  it('debe tener navegación principal visible', () => {
    cy.visit('/');
    cy.get('app-encabezado').should('be.visible');
    cy.get('app-pie-pagina').should('be.visible');
    cy.get('nav').should('be.visible');
  });
});
