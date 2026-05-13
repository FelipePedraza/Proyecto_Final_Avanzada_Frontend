declare namespace Cypress {
  interface Chainable<Subject = any> {
    login(email: string, password: string): Chainable<void>;
    loginAsHuesped(): Chainable<void>;
    loginAsAnfitrion(): Chainable<void>;
    logout(): Chainable<void>;
    getToken(): Chainable<string | null>;
    isAuthenticated(): Chainable<boolean>;
  }
}
