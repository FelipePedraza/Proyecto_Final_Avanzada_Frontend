describe('Login - C1234', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('C1235 Login exitoso con credenciales válidas', () => {
    cy.loginAsHuesped();
    cy.visit('/');
    cy.url().should('not.include', '/login');
  });

  it('C1236 Login fallido con credenciales inválidas', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('invalido@test.com');
    cy.get('input[type="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();
  });

  it('debe mostrar el formulario de login', () => {
    cy.get('form').should('be.visible');
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible');
  });

  it('debe redirigir a home si ya está autenticado', () => {
    cy.loginAsHuesped();
    cy.visit('/login');
    cy.url().should('eq', 'http://localhost:4200/');
  });

  it('debe mostrar enlace para recuperar contraseña', () => {
    cy.contains('¿Olvidaste tu contraseña?').should('be.visible');
  });
});
