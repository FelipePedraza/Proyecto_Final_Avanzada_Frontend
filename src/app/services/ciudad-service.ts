import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RespuestaDTO } from '../models/respuesta-dto';




@Injectable({
  providedIn: 'root'
})
export class CiudadService {

  private apiUrl = 'http://localhost:8080/api/ciudades'; // Ajusta la URL según tu configuración

  constructor(private http: HttpClient) { }

  /**
   * Obtiene la lista de todas las ciudades disponibles
   * @returns Observable con la respuesta que contiene el array de ciudades
   */
  obtenerCiudades(): Observable<RespuestaDTO> {
    return this.http.get<RespuestaDTO>(this.apiUrl);
  }

}
