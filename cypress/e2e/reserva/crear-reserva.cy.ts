describe('Crear Reserva - C1249', () => {
  beforeEach(() => {
    cy.loginAsHuesped();
    cy.intercept('GET', '**/api/usuarios/*/reservas*', {
      statusCode: 200,
      body: { data: { content: [], pagination: { page: 0, size: 5, totalElements: 0, totalPages: 0 } } },
    }).as('getReservas');
    cy.visit('/mis-reservas');
    cy.wait('@getReservas');
  });

  it('C1250 Crear reserva - página mis reservas visible', () => {
    cy.get('app-mis-reservas').should('exist');
  });
});
