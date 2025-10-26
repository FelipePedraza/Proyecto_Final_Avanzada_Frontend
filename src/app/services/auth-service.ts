import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CreacionUsuarioDTO,
  LoginDTO,
  TokenDTO,
  OlvidoContrasenaDTO,
  ReinicioContrasenaDTO
} from '../models/usuario-dto';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:8080/api/auth';

  constructor(private http: HttpClient) {}

  /**
   * POST /api/auth/registro
   * Registra un nuevo usuario
   */
  registro(dto: CreacionUsuarioDTO): Observable<{ error: boolean; respuesta: string }> {
    return this.http.post<{ error: boolean; respuesta: string }>(`${this.API_URL}/registro`, dto);
  }

  /**
   * POST /api/auth/login
   * Inicia sesión
   */
  login(dto: LoginDTO): Observable<{ error: boolean; respuesta: TokenDTO }> {
    return this.http.post<{ error: boolean; respuesta: TokenDTO }>(`${this.API_URL}/login`, dto);
  }

  /**
   * POST /api/auth/forgot-password
   * Solicita recuperación de contraseña
   */
  solicitarRecuperacion(dto: OlvidoContrasenaDTO): Observable<{ error: boolean; respuesta: string }> {
    return this.http.post<{ error: boolean; respuesta: string }>(`${this.API_URL}/forgot-password`, dto);
  }

  /**
   * PATCH /api/auth/reset-password
   * Restablece la contraseña
   */
  reiniciarContrasena(dto: ReinicioContrasenaDTO): Observable<{ error: boolean; respuesta: string }> {
    return this.http.patch<{ error: boolean; respuesta: string }>(`${this.API_URL}/reset-password`, dto);
  }

  /**
   * Guarda el token en localStorage
   */
  guardarToken(token: string): void {
    localStorage.setItem('token', token);
  }

  /**
   * Obtiene el token de localStorage
   */
  obtenerToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Elimina el token de localStorage
   */
  eliminarToken(): void {
    localStorage.removeItem('token');
  }

  /**
   * Verifica si el usuario está autenticado
   */
  estaAutenticado(): boolean {
    return !!this.obtenerToken();
  }

  /**
   * Cierra sesión
   */
  cerrarSesion(): void {
    this.eliminarToken();
  }

  obtenerDatosToken(): any {
    const token = this.obtenerToken(); // Usa el método que SÍ existe
    if (!token) {
      return null;
    }

    try {
      const payload = token.split('.')[1]; // 1. Obtener el payload (la parte del medio)
      const payloadDecodificado = atob(payload); // 2. Decodificar de Base64
      const datos = JSON.parse(payloadDecodificado); // 3. Convertir de String JSON a Objeto
      return datos;
    } catch (e) {
      console.error("Error decodificando el token", e);
      return null; // El token es inválido o está mal formado
    }
  }
}
