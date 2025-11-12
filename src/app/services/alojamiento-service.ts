import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreacionAlojamientoDTO, EdicionAlojamientoDTO, AlojamientoFiltroDTO } from '../models/alojamiento-dto';
import { ReservaEstado } from '../models/reserva-dto';
import { CreacionResenaDTO, CreacionRespuestaDTO } from '../models/resena-dto';
import { RespuestaDTO } from '../models/respuesta-dto';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AlojamientoService {
  private readonly API_URL = `${environment.apiUrl}/alojamientos`;

  constructor(private http: HttpClient) {}

  // ==================== CRUD BÁSICO ====================

  /**
   * POST /api/alojamientos
   * Crea un nuevo alojamiento
   */
  crear(dto: CreacionAlojamientoDTO): Observable<RespuestaDTO> {
    return this.http.post<RespuestaDTO>(this.API_URL, dto);
  }
  /**
   * GET /api/alojamientos/{id}
   * Obtiene un alojamiento por ID
   */
  obtenerPorId(id: number): Observable<RespuestaDTO> {
    return this.http.get<RespuestaDTO>(`${this.API_URL}/${id}`);
  }

  /**
   * PUT /api/alojamientos/{id}
   * Edita un alojamiento existente
   */
  editar(id: number, dto: EdicionAlojamientoDTO): Observable<RespuestaDTO> {
    return this.http.put<RespuestaDTO>(`${this.API_URL}/${id}`, dto);
  }

  /**
   * DELETE /api/alojamientos/{id}
   * Elimina un alojamiento
   */
  eliminar(id: number): Observable<RespuestaDTO> {
    return this.http.delete<RespuestaDTO>(`${this.API_URL}/${id}`);
  }

  // ==================== BÚSQUEDA Y FILTROS ====================

  /**
   * GET /api/alojamientos?filtros...
   * Obtiene lista de alojamientos con filtros
   */
  obtenerAlojamientos(filtros: Partial<AlojamientoFiltroDTO>, pagina: number = 0): Observable<RespuestaDTO> {

    let params = new HttpParams().set('pagina', pagina.toString());

    if (filtros.ciudad) {
      params = params.set('ciudad', filtros.ciudad);
    }
    if (filtros.fechaEntrada) {
      params = params.set('fechaEntrada', filtros.fechaEntrada);
    }
    if (filtros.fechaSalida) {
      params = params.set('fechaSalida', filtros.fechaSalida);
    }
    if (filtros.huespedes) {
      params = params.set('huespedes', filtros.huespedes.toString());
    }
    if (filtros.precioMin) {
      params = params.set('precioMin', filtros.precioMin.toString());
    }
    if (filtros.precioMax) {
      params = params.set('precioMax', filtros.precioMax.toString());
    }
    if (filtros.servicios && filtros.servicios.length > 0) {
      filtros.servicios.forEach(servicio => {
        params = params.append('servicios', servicio);
      });
    }

    return this.http.get<RespuestaDTO>(this.API_URL, { params });
  }

  /**
   * GET /api/alojamientos/sugerencias?ciudad=...
   * Obtiene sugerencias de alojamientos por ciudad
   */
  sugerirAlojamientos(ciudad: string): Observable<RespuestaDTO> {
    return this.http.get<RespuestaDTO>(`${this.API_URL}/sugerencias`, { params: {ciudad} });
  }

  // ==================== MÉTRICAS ====================

  /**
   * GET /api/alojamientos/{id}/metricas
   * Obtiene métricas de un alojamiento
   */
  obtenerMetricas(id: number): Observable<RespuestaDTO> {
    return this.http.get<RespuestaDTO>(`${this.API_URL}/${id}/metricas`);
  }

  // ==================== RESERVAS ====================

  /**
   * GET /api/alojamientos/{id}/reservas
   * Obtiene las reservas de un alojamiento con filtros opcionales
   */
  obtenerReservasAlojamiento(
    id: number,
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

    return this.http.get<RespuestaDTO>(`${this.API_URL}/${id}/reservas`, { params });
  }

  // ==================== RESEÑAS ====================

  /**
   * GET /api/alojamientos/{id}/resenas
   * Obtiene las reseñas de un alojamiento
   */
  obtenerResenasAlojamiento(id: number, pagina: number = 0): Observable<RespuestaDTO> {
    const params = new HttpParams().set('pagina', pagina.toString());
    return this.http.get<RespuestaDTO>(`${this.API_URL}/${id}/resenas`, { params });
  }

  /**
   * POST /api/alojamientos/{id}/resenas
   * Crea una nueva reseña para un alojamiento
   */
  crearResena(id: number, dto: CreacionResenaDTO): Observable<RespuestaDTO> {
    return this.http.post<RespuestaDTO>(`${this.API_URL}/${id}/resenas`, dto);
  }

  /**
   * POST /api/alojamientos/{id}/resenas/{idResena}/respuesta
   * Responde a una reseña
   */
  responderResena(idAlojamiento: number, idResena: number, dto: CreacionRespuestaDTO): Observable<RespuestaDTO> {
    return this.http.post<RespuestaDTO>(
      `${this.API_URL}/${idAlojamiento}/resenas/${idResena}/respuesta`,
      dto
    );
  }

}
