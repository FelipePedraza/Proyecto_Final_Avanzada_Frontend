describe('Cancelar Reserva - C1251', () => {
  beforeEach(() => {
    cy.loginAsHuesped();
    cy.intercept('GET', '**/api/usuarios/*/reservas*', {
      statusCode: 200,
      body: { data: { content: [], pagination: { page: 0, size: 5, totalElements: 0, totalPages: 0 } } },
    }).as('getReservas');
    cy.visit('/mis-reservas');
    cy.wait('@getReservas');
  });

  it('C1252 Cancelar reserva - lista de reservas visible', () => {
    cy.get('app-mis-reservas').should('exist');
  });
});
