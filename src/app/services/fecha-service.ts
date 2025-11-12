import {Injectable} from '@angular/core';

/**
 * Servicio centralizado para manejo de fechas
 * Elimina código repetido en componentes
 */
@Injectable({
  providedIn: 'root'
})
export class FechaService {

  private readonly LOCALE = 'es-CO';

  // ==================== FORMATEO ====================

  /**
   * Formatea una fecha completa con día de la semana
   * Ej.: "lunes, 25 de diciembre de 2024"
   */
  formatearFechaCompleta(fecha: Date | string): string {
    const f = this.normalizarFecha(fecha);
    return f.toLocaleDateString(this.LOCALE, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Formatea fecha corta
   * Ej: "25 dic 2024"
   */
  formatearFechaCorta(fecha: Date | string): string {
    const f = this.normalizarFecha(fecha);
    return f.toLocaleDateString(this.LOCALE, {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  /**
   * Formatea solo hora
   * Ej.: "14:30"
   */
  formatearHora(fecha: Date | string): string {
    const f = this.normalizarFecha(fecha);
    return f.toLocaleTimeString(this.LOCALE, {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Formatea fecha para inputs tipo date (YYYY-MM-DD)
   */
  formatearParaInput(fecha: Date): string {
    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // ==================== NORMALIZACIÓN ====================

  /**
   * Normaliza fecha ajustando zona horaria
   * Resuelve problemas de UTC
   */
  private normalizarFecha(fecha: Date | string): Date {
    const f = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return new Date(f.getTime() + f.getTimezoneOffset() * 60000);
  }

  /**
   * Convierte string a Date local (sin problemas de zona horaria)
   */
  stringADateLocal(fecha: string): Date {
    return new Date(fecha + 'T00:00:00');
  }

  // ==================== CÁLCULOS ====================

  /**
   * Calcula el número de noches entre dos fechas
   */
  calcularNoches(fechaEntrada: Date | string, fechaSalida: Date | string): number {
    const entrada = this.stringADateLocal(
      typeof fechaEntrada === 'string' ? fechaEntrada : this.formatearParaInput(fechaEntrada)
    );
    const salida = this.stringADateLocal(
      typeof fechaSalida === 'string' ? fechaSalida : this.formatearParaInput(fechaSalida)
    );

    const diferencia = salida.getTime() - entrada.getTime();
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
  }

  /**
   * Calcula edad a partir de fecha de nacimiento
   */
  calcularEdad(fechaNacimiento: Date | string): number {
    const nacimiento = this.normalizarFecha(fechaNacimiento);
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();

    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }

    return edad;
  }

  // ==================== OBTENCIÓN ====================

  /**
   * Obtiene fecha de hoy en formato YYYY-MM-DD
   */
  obtenerFechaHoy(): string {
    return this.formatearParaInput(new Date());
  }

  /**
   * Obtiene fecha de mañana en formato YYYY-MM-DD
   */
  obtenerFechaManana(): string {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    return this.formatearParaInput(manana);
  }

  /**
   * Obtiene fecha máxima para selector (edad mínima)
   */
  obtenerFechaMaxima(edadMinima: number = 18): string {
    const fecha = new Date();
    fecha.setFullYear(fecha.getFullYear() - edadMinima);
    return this.formatearParaInput(fecha);
  }

  /**
   * Obtiene fecha mínima para selector
   */
  obtenerFechaMinima(edadMaxima: number = 120): string {
    const fecha = new Date();
    fecha.setFullYear(fecha.getFullYear() - edadMaxima);
    return this.formatearParaInput(fecha);
  }

  /**
   * Obtiene fecha mínima de salida (día después de entrada)
   */
  obtenerFechaMinimaSalida(fechaEntrada: string): string {
    if (!fechaEntrada) {
      return this.obtenerFechaManana();
    }

    const entrada = new Date(fechaEntrada + 'T00:00:00');
    entrada.setDate(entrada.getDate() + 1);
    return this.formatearParaInput(entrada);
  }

  // ==================== CALENDARIO ====================

  /**
   * Obtiene el año de registro (para mostrar en perfiles)
   */
  obtenerAnioRegistro(fechaRegistro?: Date): number {
    return fechaRegistro?.getFullYear() || new Date().getFullYear();
  }

}
