import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  UsuarioDTO,
  EdicionUsuarioDTO,
  CambioContrasenaDTO,
  CreacionAnfitrionDTO
} from '../models/usuario-dto';
import { ItemAlojamientoDTO } from '../models/alojamiento-dto';
import { ItemReservaDTO, ReservaEstado } from '../models/reserva-dto';

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
  crearAnfitrion(dto: CreacionAnfitrionDTO): Observable<{ error: boolean; respuesta: string }> {
    return this.http.post<{ error: boolean; respuesta: string }>(
      `${this.API_URL}/anfitrion`,
      dto
    );
  }

  /**
   * PUT /api/usuarios/{id}
   * Edita la información de un usuario
   */
  editar(id: string, dto: EdicionUsuarioDTO, foto?: File): Observable<{ error: boolean; respuesta: string }> {
    const formData = new FormData();
    formData.append('usuario', new Blob([JSON.stringify(dto)], { type: 'application/json' }));

    if (foto) {
      formData.append('foto', foto);
    }

    return this.http.put<{ error: boolean; respuesta: string }>(
      `${this.API_URL}/${id}`,
      formData
    );
  }

  /**
   * GET /api/usuarios/{id}
   * Obtiene la información de un usuario
   */
  obtener(id: string): Observable<{ error: boolean; respuesta: UsuarioDTO }> {
    return this.http.get<{ error: boolean; respuesta: UsuarioDTO }>(
      `${this.API_URL}/${id}`
    );
  }

  /**
   * DELETE /api/usuarios/{id}
   * Elimina un usuario
   */
  eliminar(id: string): Observable<{ error: boolean; respuesta: string }> {
    return this.http.delete<{ error: boolean; respuesta: string }>(
      `${this.API_URL}/${id}`
    );
  }

  /**
   * PATCH /api/usuarios/{id}/contrasena
   * Cambia la contraseña de un usuario
   */
  cambiarContrasena(id: string, dto: CambioContrasenaDTO): Observable<{ error: boolean; respuesta: string }> {
    return this.http.patch<{ error: boolean; respuesta: string }>(
      `${this.API_URL}/${id}/contrasena`,
      dto
    );
  }

  /**
   * GET /api/usuarios/{id}/alojamientos
   * Obtiene los alojamientos de un usuario
   */
  obtenerAlojamientosUsuario(id: string, pagina: number = 0): Observable<{ error: boolean; respuesta: ItemAlojamientoDTO[] }> {
    const params = new HttpParams().set('pagina', pagina.toString());

    return this.http.get<{ error: boolean; respuesta: ItemAlojamientoDTO[] }>(
      `${this.API_URL}/${id}/alojamientos`,
      { params }
    );
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
  ): Observable<{ error: boolean; respuesta: ItemReservaDTO[] }> {
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

    return this.http.get<{ error: boolean; respuesta: ItemReservaDTO[] }>(
      `${this.API_URL}/${id}/reservas`,
      { params }
    );
  }
}
