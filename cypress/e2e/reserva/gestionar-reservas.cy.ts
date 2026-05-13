describe('Gestionar Reservas (Anfitrión) - C1253', () => {
  beforeEach(() => {
    cy.loginAsAnfitrion();
    cy.intercept('GET', '**/api/usuarios/*/alojamientos*', {
      statusCode: 200,
      body: {
        data: {
          content: [{ id: 1, titulo: 'Alojamiento Test', direccion: { ciudad: 'Armenia' }, precioPorNoche: 100000 }],
          pagination: { page: 0, size: 100, totalElements: 1, totalPages: 1 },
        },
      },
    }).as('getAlojamientos');
    cy.intercept('GET', '**/api/alojamientos/*/reservas*', {
      statusCode: 200,
      body: { data: { content: [], pagination: { page: 0, size: 5, totalElements: 0, totalPages: 0 } } },
    }).as('getReservas');
    cy.visit('/gestionar-reservas');
    cy.wait('@getAlojamientos', { timeout: 10000 });
  });

  it('C1254 Aceptar/Rechazar reserva (anfitrión) - panel visible', () => {
    cy.get('app-gestionar-reservas').should('exist');
  });
});
