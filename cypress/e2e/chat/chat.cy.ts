describe('Chat - C1255', () => {
  beforeEach(() => {
    cy.loginAsHuesped();
    cy.visit('/chat');
  });

  it('C1256 Enviar/Recibir mensaje - interfaz visible', () => {
    cy.get('app-chat').should('exist');
  });

  it('debe redirigir a home si no autenticado', () => {
    cy.logout();
    cy.visit('/chat');
    cy.url().should('eq', 'http://localhost:4200/');
  });
});
