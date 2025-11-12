import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CalificacionService {
  /**
   * Genera array de estrellas para UI
   */
  generarEstrellas(calificacion: number): number[] {
    return Array(Math.floor(calificacion)).fill(0);
  }
}
