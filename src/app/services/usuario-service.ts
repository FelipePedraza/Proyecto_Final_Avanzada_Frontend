import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EdicionUsuarioDTO, CambioContrasenaDTO, CreacionAnfitrionDTO } from '../models/usuario-dto';
import { ReservaEstado } from '../models/reserva-dto';
import { RespuestaDTO } from '../models/respuesta-dto';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private readonly API_URL = 'http://localhost:8080/api/usuarios';

  constructor(private http: HttpClient) {}

  /**
   * POST /api/usuarios/anfitrion
   * Convierte un usuario en anfitrión
   */
  crearAnfitrion(dto: CreacionAnfitrionDTO): Observable<RespuestaDTO> {
    return this.http.post<RespuestaDTO>(
      `${this.API_URL}/anfitrion`,
      dto
    );
  }

  /**
   * PUT /api/usuarios/{id}
   * Edita la información de un usuario
   */
  editar(id: string, dto: EdicionUsuarioDTO): Observable<RespuestaDTO> {
    return this.http.put<RespuestaDTO>(
      `${this.API_URL}/${id}`,
      dto
    );
  }

  /**
   * GET /api/usuarios/{id}
   * Obtiene la información de un usuario
   */
  obtener(id: string): Observable<RespuestaDTO> {
    return this.http.get<RespuestaDTO>(
      `${this.API_URL}/${id}`
    );
  }

  /**
   * DELETE /api/usuarios/{id}
   * Elimina un usuario
   */
  eliminar(id: string): Observable<RespuestaDTO> {
    return this.http.delete<RespuestaDTO>(
      `${this.API_URL}/${id}`
    );
  }

  /**
   * PATCH /api/usuarios/{id}/contrasena
   * Cambia la contraseña de un usuario
   */
  cambiarContrasena(id: string, dto: CambioContrasenaDTO): Observable<RespuestaDTO> {
    return this.http.patch<RespuestaDTO>(
      `${this.API_URL}/${id}/contrasena`,
      dto
    );
  }

  /**
   * GET /api/usuarios/{id}/alojamientos
   * Obtiene los alojamientos de un usuario
   */
  obtenerAlojamientosUsuario(id: string, pagina: number = 0): Observable<RespuestaDTO> {

    return this.http.get<RespuestaDTO>(`${this.API_URL}/${id}/alojamientos`, { params: { pagina }});
  }

  /**
   * GET /api/usuarios/{id}/reservas
   * Obtiene las reservas de un usuario con filtros opcionales
   */
  obtenerReservasUsuario(
    id: string,
    estado?: ReservaEstado,
    fechaEntrada?: Date,
    fechaSalida?: Date,
    pagina: number = 0
  ): Observable<RespuestaDTO> {
    let params = new HttpParams().set('pagina', pagina.toString());

    if (estado) {
      params = params.set('estado', estado);
    }
    if (fechaEntrada) {
      params = params.set('fechaEntrada', fechaEntrada.toISOString());
    }
    if (fechaSalida) {
      params = params.set('fechaSalida', fechaSalida.toISOString());
    }

    return this.http.get<RespuestaDTO>(
      `${this.API_URL}/${id}/reservas`,
      { params }
    );
  }
}
