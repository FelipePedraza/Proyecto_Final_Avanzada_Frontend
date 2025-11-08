import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RespuestaDTO } from '../models/respuesta-dto';

const TOKEN_KEY = "AuthToken";
const REFRESH_TOKEN_KEY = "RefreshToken";

@Injectable({
  providedIn: 'root'
})
export class TokenService {

  private refreshingInProgress$ = new BehaviorSubject<boolean>(false);
  private readonly API_URL = 'http://localhost:8080/api/auth';

  constructor(private http: HttpClient) { }

  // ==================== TOKEN MANAGEMENT ====================

  private setToken(token: string): void {
    window.sessionStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.setItem(TOKEN_KEY, token);
  }

  private setRefreshToken(refreshToken: string): void {
    window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    window.sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  public getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  public getRefreshToken(): string | null {
    return sessionStorage.getItem(REFRESH_TOKEN_KEY);
  }

  public isLogged(): boolean {
    return !!this.getToken();
  }

  public login(token: string, refreshToken: string): void {
    this.setToken(token);
    this.setRefreshToken(refreshToken);
  }

  public logout(): void {
    window.sessionStorage.clear();
    this.refreshingInProgress$.next(false);
  }

  // ==================== REFRESH TOKEN ====================

  /**
   * Solicita un nuevo token de acceso usando el refresh token
   * @returns Observable con el nuevo token
   */
  public refresh(): Observable<RespuestaDTO> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    // Marcar que estamos refrescando
    this.refreshingInProgress$.next(true);

    return this.http.post<RespuestaDTO>(
      `${this.API_URL}/refresh`,
      { refreshToken }
    ).pipe(
      tap({
        next: (respuesta) => {
          if (!respuesta.error && respuesta.data) {
            // Actualizar tokens
            const { token, refreshToken: newRefreshToken } = respuesta.data;
            this.setToken(token);
            if (newRefreshToken) {
              this.setRefreshToken(newRefreshToken);
            }
          }
          this.refreshingInProgress$.next(false);
        },
        error: () => {
          this.refreshingInProgress$.next(false);
          this.logout();
        }
      })
    );
  }

  /**
   * Verifica si hay un refresh en progreso
   */
  public isRefreshing(): boolean {
    return this.refreshingInProgress$.value;
  }

  /**
   * Observable para suscribirse al estado de refresh
   */
  public get refreshingInProgress(): Observable<boolean> {
    return this.refreshingInProgress$.asObservable();
  }

  // ==================== TOKEN DECODING ====================

  private decodePayload(token: string): any {
    try {
      const payload = token.split(".")[1];
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decodedPayload = atob(base64);
      return JSON.parse(decodedPayload);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  public getUserId(): string {
    const token = this.getToken();
    if (token) {
      const values = this.decodePayload(token);
      return values?.sub || "";
    }
    return "";
  }

  public getRole(): string {
    const token = this.getToken();
    if (token) {
      const values = this.decodePayload(token);
      return values?.rol || "";
    }
    return "";
  }

  public getEmail(): string {
    const token = this.getToken();
    if (token) {
      const values = this.decodePayload(token);
      return values?.email || "";
    }
    return "";
  }

  /**
   * Verifica si el token está próximo a expirar (dentro de 5 minutos)
   */
  public isTokenExpiringSoon(): boolean {
    const token = this.getToken();
    if (!token) return false;

    const payload = this.decodePayload(token);
    if (!payload?.exp) return false;

    const expirationTime = payload.exp * 1000; // Convertir a milisegundos
    const currentTime = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    return (expirationTime - currentTime) < fiveMinutes;
  }

  /**
   * Verifica si el token está expirado
   */
  public isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    const payload = this.decodePayload(token);
    if (!payload?.exp) return true;

    const expirationTime = payload.exp * 1000;
    return Date.now() > expirationTime;
  }
}
