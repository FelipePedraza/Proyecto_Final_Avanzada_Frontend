import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ImagenService {
  private readonly API_URL = 'http://localhost:8080/api/imagenes';

  constructor(private http: HttpClient) {}

  /**
   * POST /api/imagenes
   * Sube una imagen a Cloudinary
   */
  subirImagen(file: File): Observable<{ error: boolean; respuesta: any }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{ error: boolean; respuesta: any }>(
      this.API_URL,
      formData
    );
  }

  /**
   * DELETE /api/imagenes
   * Elimina una imagen de Cloudinary
   */
  eliminarImagen(publicId: string): Observable<{ error: boolean; respuesta: string }> {
    const params = new HttpParams().set('id', publicId);

    return this.http.delete<{ error: boolean; respuesta: string }>(
      this.API_URL,
      { params }
    );
  }

  /**
   * Sube múltiples imágenes
   */
  subirMultiplesImagenes(files: File[]): Observable<{ error: boolean; respuesta: any }[]> {
    const uploads = files.map(file => this.subirImagen(file));
    return new Observable(observer => {
      Promise.all(
        uploads.map(upload => upload.toPromise())
      ).then(results => {
        observer.next(results as { error: boolean; respuesta: any }[]);
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }
}
