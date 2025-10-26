import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreacionReservaDTO } from '../models/reserva-dto';

@Injectable({
  providedIn: 'root'
})
export class ReservaService {
  private readonly API_URL = 'http://localhost:8080/api/reservas';

  constructor(private http: HttpClient) {}

  /**
   * POST /api/reservas
   * Crea una nueva reserva
   */
  crear(dto: CreacionReservaDTO): Observable<{ error: boolean; respuesta: string }> {
    return this.http.post<{ error: boolean; respuesta: string }>(
      this.API_URL,
      dto
    );
  }

  /**
   * PATCH /api/reservas/{id}/cancelar
   * Cancela una reserva
   */
  cancelar(id: number): Observable<{ error: boolean; respuesta: string }> {
    return this.http.patch<{ error: boolean; respuesta: string }>(
      `${this.API_URL}/${id}/cancelar`,
      null
    );
  }

  /**
   * PATCH /api/reservas/{id}/aceptar
   * Acepta una reserva (para anfitriones)
   */
  aceptar(id: number): Observable<{ error: boolean; respuesta: string }> {
    return this.http.patch<{ error: boolean; respuesta: string }>(
      `${this.API_URL}/${id}/aceptar`,
      null
    );
  }

  /**
   * PATCH /api/reservas/{id}/rechazar
   * Rechaza una reserva (para anfitriones)
   */
  rechazar(id: number): Observable<{ error: boolean; respuesta: string }> {
    return this.http.patch<{ error: boolean; respuesta: string }>(
      `${this.API_URL}/${id}/rechazar`,
      null
    );
  }
}
