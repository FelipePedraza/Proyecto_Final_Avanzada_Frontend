import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RespuestaDTO } from '../models/respuesta-dto';


@Injectable({
  providedIn: 'root'
})
export class ServiciosService {

  private apiUrl = 'http://localhost:8080/api/servicios'; // Ajusta la URL según tu configuración

  constructor(private http: HttpClient) { }

  /**
   * Obtiene la lista de todas las ciudades disponibles
   */
  obtenerServicios(): Observable<RespuestaDTO> {
    return this.http.get<RespuestaDTO>(this.apiUrl);
  }

}
