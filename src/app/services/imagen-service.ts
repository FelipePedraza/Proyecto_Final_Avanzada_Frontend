import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { RespuestaDTO } from '../models/respuesta-dto';
import { Observable } from 'rxjs';
import {environment} from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ImagenService {
  private readonly API_URL = `${environment.apiUrl}/imagenes`;

  constructor(private http: HttpClient) {}

  /**
   * POST /api/imagenes
   * Sube una imagen a Cloudinary
   */
  subirImagen(file: File): Observable<RespuestaDTO> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<RespuestaDTO>(
      this.API_URL,
      formData
    );
  }

  /**
   * DELETE /api/imagenes
   * Elimina una imagen de Cloudinary
   */
  eliminarImagen(url: string): Observable<RespuestaDTO> {
    const params = new HttpParams().set('url', url);

    return this.http.delete<RespuestaDTO>(
      this.API_URL,
      { params }
    );
  }
}
