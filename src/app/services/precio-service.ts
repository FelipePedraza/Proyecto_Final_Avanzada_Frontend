import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PrecioService {

  /**
   * Formatea precio con formato de moneda colombiana
   */
  formatearPrecio(precio: number): string {
    return precio.toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    });
  }
}
