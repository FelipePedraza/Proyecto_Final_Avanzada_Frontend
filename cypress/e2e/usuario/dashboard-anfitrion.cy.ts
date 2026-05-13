describe('Dashboard Anfitrión - C1259', () => {
  beforeEach(() => {
    cy.loginAsAnfitrion();
    cy.visit('/dashboard-anfitrion');
  });

  it('C1260 Dashboard anfitrión - visible', () => {
    cy.get('app-dashboard-anfitrion').should('exist');
  });

  it('debe redirigir a home si no es anfitrión', () => {
    cy.logout();
    cy.visit('/dashboard-anfitrion');
    cy.url().should('eq', 'http://localhost:4200/');
  });
});
