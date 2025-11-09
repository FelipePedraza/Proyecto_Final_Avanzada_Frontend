import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreacionUsuarioDTO, LoginDTO, OlvidoContrasenaDTO, ReinicioContrasenaDTO } from '../models/usuario-dto';
import { RespuestaDTO } from '../models/respuesta-dto';
import {environment} from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}/auth`;


  constructor(private http: HttpClient) {}

  /**
   * POST /api/auth/registro
   * Registra un nuevo usuario
   */
  registro(dto: CreacionUsuarioDTO): Observable<RespuestaDTO> {
    return this.http.post<RespuestaDTO>(`${this.API_URL}/registro`, dto);
  }

  /**
   * POST /api/auth/login
   * Inicia sesión
   */
  login(dto: LoginDTO): Observable<RespuestaDTO> {
    return this.http.post<RespuestaDTO>(`${this.API_URL}/login`, dto);
  }

  /**
   * POST /api/auth/forgot-password
   * Solicita recuperación de contraseña
   */
  solicitarRecuperacion(dto: OlvidoContrasenaDTO): Observable<RespuestaDTO> {
    return this.http.post<RespuestaDTO>(`${this.API_URL}/forgot-password`, dto);
  }

  /**
   * PATCH /api/auth/reset-password
   * Restablece la contraseña
   */
  reiniciarContrasena(dto: ReinicioContrasenaDTO): Observable<RespuestaDTO> {
    return this.http.patch<RespuestaDTO>(`${this.API_URL}/reset-password`, dto);
  }

  /**
   * POST /api/auth/refresh
   * Refresca el token de acceso
   */
  refrescarToken(dto: { refreshToken: string }): Observable<RespuestaDTO> {
    return this.http.post<RespuestaDTO>(`${this.API_URL}/refresh`, dto);
  }

}
