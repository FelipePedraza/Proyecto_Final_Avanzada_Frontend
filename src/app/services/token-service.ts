import { Injectable } from '@angular/core';

const TOKEN_KEY = "AuthToken";
const REFRESH_TOKEN_KEY = "RefreshToken";

@Injectable({
  providedIn: 'root'
})
export class TokenService {

  // ==================== TOKEN ====================

  private setToken(token: string): void {
    window.sessionStorage.setItem(TOKEN_KEY, token);
  }

  public getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  // ==================== REFRESH TOKEN ====================

  private setRefreshToken(refreshToken: string): void {
    window.sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  public getRefreshToken(): string | null {
    return sessionStorage.getItem(REFRESH_TOKEN_KEY);
  }

  // ==================== LOGIN/LOGOUT ====================

  public login(token: string, refreshToken: string): void {
    this.setToken(token);
    this.setRefreshToken(refreshToken);
  }

  public logout(): void {
    window.sessionStorage.clear();
  }

  public isLogged(): boolean {
    return !!this.getToken();
  }

  // ==================== TOKEN INFO ====================

  private decodePayload(token: string): any {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decodedPayload = atob(base64);
    return JSON.parse(decodedPayload);
  }

  public getUserId(): string {
    const token = this.getToken();
    if (token) {
      const values = this.decodePayload(token);
      return values.sub;
    }
    return "";
  }

  public getRole(): string {
    const token = this.getToken();
    if (token) {
      const values = this.decodePayload(token);
      return values.rol;
    }
    return "";
  }

  public getEmail(): string {
    const token = this.getToken();
    if (token) {
      const values = this.decodePayload(token);
      return values.email;
    }
    return "";
  }

  // ==================== TOKEN EXPIRATION ====================

  public isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const payload = this.decodePayload(token);
      const exp = payload.exp * 1000; // Convertir a milisegundos
      return Date.now() >= exp;
    } catch {
      return true;
    }
  }
}
