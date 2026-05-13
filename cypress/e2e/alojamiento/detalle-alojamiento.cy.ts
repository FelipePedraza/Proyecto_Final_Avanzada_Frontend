describe('Detalle de Alojamiento - C1243', () => {
  it('C1244 Ver detalle de alojamiento', () => {
    cy.visit('/alojamiento/1');
    cy.get('app-detalle-alojamiento').should('exist');
  });
});
