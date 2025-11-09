import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RespuestaDTO } from '../models/respuesta-dto';
import {environment} from '../../environments/environment';




@Injectable({
  providedIn: 'root'
})
export class CiudadService {

  private apiUrl = `${environment.apiUrl}/ciudades`; // Ajusta la URL según tu configuración

  constructor(private http: HttpClient) { }

  /**
   * Obtiene la lista de todas las ciudades disponibles
   */
  obtenerCiudades(): Observable<RespuestaDTO> {
    return this.http.get<RespuestaDTO>(this.apiUrl);
  }

}
