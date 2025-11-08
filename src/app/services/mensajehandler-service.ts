import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { TokenService } from './token-service';

/**
 * Servicio centralizado para manejo de errores HTTP
 * Proporciona mensajes consistentes y manejo de errores específicos
 */
@Injectable({
  providedIn: 'root'
})
export class MensajehandlerService {

  constructor(
    private router: Router,
    private tokenService: TokenService
  ) {}

  /**
   * Procesa errores HTTP y retorna un mensaje apropiado
   * @param error Error de HTTP
   * @returns Mensaje de error formateado
   */
  handleHttpError(error: any): string {
    // Log para desarrollo (remover en producción)
    console.error('HTTP Error:', error);

    // Si no es un HttpErrorResponse, es un error de red o timeout
    if (!(error instanceof HttpErrorResponse)) {
      return 'Error de conexión. Verifica tu conexión a internet.';
    }

    // Manejo específico por código de estado
    switch (error.status) {
      case 0:
        // Error de red o CORS
        return 'No se puede conectar al servidor. Verifica tu conexión.';

      case 400:
        // Bad Request - El backend debe enviar mensaje específico
        return this.extractBackendMessage(error) || 'Solicitud inválida. Verifica los datos enviados.';

      case 403:
        // Forbidden - Sin permisos
        return this.extractBackendMessage(error) || 'No tienes permisos para realizar esta acción.';

      case 404:
        // Not Found
        return this.extractBackendMessage(error) || 'Recurso no encontrado.';

      case 409:
        // Conflict - Por ejemplo, email duplicado
        return this.extractBackendMessage(error) || 'Conflicto con los datos existentes.';

      case 500:
        // Internal Server Error
        return this.extractBackendMessage(error) || 'Error interno del servidor. Intenta más tarde.';

      case 502:
        // Bad Gateway
        return 'Servidor no disponible temporalmente. Intenta en unos momentos.';

      case 503:
        // Service Unavailable
        return 'Servicio temporalmente no disponible. Intenta más tarde.';

      case 504:
        // Gateway Timeout
        return 'La solicitud tardó demasiado. Intenta de nuevo.';

      default:
        return this.extractBackendMessage(error) || `Error inesperado (${error.status}). Intenta nuevamente.`;
    }
  }

  /**
   * Extrae el mensaje de error del backend según estructura RespuestaDTO
   * @param error HttpErrorResponse
   * @returns Mensaje del backend o null
   */
  private extractBackendMessage(error: HttpErrorResponse): string | null {
    try {
      // El error.error es el cuerpo de la respuesta, que es nuestro RespuestaDTO
      const backendResponse = error.error;

      if (backendResponse && typeof backendResponse === 'object') {

        // 1. Manejar Errores de Validación (Array en 'data')
        // Esto es para el caso 400 (MethodArgumentNotValidException)
        if (backendResponse.data && Array.isArray(backendResponse.data)) {

          return backendResponse.data
            .map((err: any) => `${err.field}: ${err.message}`)
            .join('\n');
        }

        // 2. Manejar Errores Simples (String en 'data')
        // Esto es para 401, 403, 404, 409, 500
        if (backendResponse.data && typeof backendResponse.data === 'string') {
          return backendResponse.data;
        }

        // 3. Fallbacks (si la respuesta no sigue el formato RespuestaDTO)
        if (backendResponse.message && typeof backendResponse.message === 'string') {
          return backendResponse.message;
        }

        if (backendResponse.errors && Array.isArray(backendResponse.errors)) {
          return backendResponse.errors.map((e: any) => e.message || e).join(', ');
        }
      }

      // Caso 4: String directo
      if (typeof error.error === 'string') {
        return error.error;
      }

      // Caso 5: Mensaje en statusText
      if (error.statusText && error.statusText !== 'Unknown Error') {
        return error.statusText;
      }

      return null;
    } catch (e) {
      console.error('Error al parsear mensaje del backend:', e);
      return null;
    }
  }

  /**
   * Muestra un mensaje de error con SweetAlert2
   * @param message Mensaje de error
   * @param title Título del modal (opcional)
   */
  showError(message: string, title: string = 'Error'): void {
    Swal.fire({
      title: title,
      text: message,
      icon: 'error',
      confirmButtonColor: '#2e8b57',
      confirmButtonText: 'Entendido'
    });
  }

  /**
   * Muestra un mensaje de error con callback
   * @param message Mensaje de error
   * @param callback Función a ejecutar después de cerrar el modal
   */
  showErrorWithCallback(message: string, callback: () => void): void {
    Swal.fire({
      title: 'Error',
      text: message,
      icon: 'error',
      confirmButtonColor: '#2e8b57',
      confirmButtonText: 'Entendido'
    }).then(() => {
      callback();
    });
  }

  /**
   * Muestra un mensaje de advertencia
   * @param message Mensaje de advertencia
   */
  showWarning(message: string): void {
    Swal.fire({
      title: 'Advertencia',
      text: message,
      icon: 'warning',
      confirmButtonColor: '#2e8b57',
      confirmButtonText: 'Entendido'
    });
  }

  /**
   * Muestra un mensaje de éxito
   * @param message Mensaje de éxito
   * @param title Título del modal (opcional)
   */
  showSuccess(message: string, title: string = '¡Éxito!'): void {
    Swal.fire({
      title: title,
      text: message,
      icon: 'success',
      confirmButtonColor: '#2e8b57',
      confirmButtonText: 'Aceptar',
      timer: 2000,
      timerProgressBar: true
    });
  }

  /**
   * Muestra mensaje de éxito con callback
   * @param message Mensaje de éxito
   * @param title Título del modal (opcional)
   * @param callback Función a ejecutar después
   */
  showSuccessWithCallback(message: string, title: string = '¡Éxito!', callback: () => void): void {
    Swal.fire({
      title: title,
      text: message,
      icon: 'success',
      confirmButtonColor: '#2e8b57',
      timer: 2000,
      timerProgressBar: true
    }).then(() => {
      callback();
    });
  }

  /**
   * Muestra confirmación antes de una acción
   * @param message Mensaje de confirmación
   * @param confirmText Texto del botón de confirmación
   * @returns Promise<boolean> true si confirmó, false si canceló
   */
  async confirm(
    message: string,
    confirmText: string = 'Sí, continuar',
    title: string = '¿Estás seguro?'
  ): Promise<boolean> {
    const result = await Swal.fire({
      title: title,
      text: message,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2e8b57',
      cancelButtonColor: '#95a5a6'
    });

    return result.isConfirmed;
  }

  /**
   * Muestra confirmación peligrosa (para eliminaciones)
   * @param message Mensaje de advertencia
   * @param confirmText Texto del botón de confirmación
   * @returns Promise<boolean>
   */
  async confirmDanger(
    message: string,
    confirmText: string = 'Sí, eliminar',
    title: string = '¿Estás seguro?',
  ): Promise<boolean> {
    const result = await Swal.fire({
      title: title,
      text: message,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2e8b57',
      cancelButtonColor: '#95a5a6'
    });

    return result.isConfirmed;
  }

  /**
   * Muestra loading modal
   * @param message Mensaje de carga
   */
  showLoading(message: string = 'Procesando...'): void {
    Swal.fire({
      title: message,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }

  /**
   * Cierra el modal actual
   */
  closeModal(): void {
    Swal.close();
  }
}
