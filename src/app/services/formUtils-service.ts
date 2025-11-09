import { Injectable } from '@angular/core';
import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Servicio centralizado para utilidades de formularios
 * Reduce código repetido en componentes
 */
@Injectable({
  providedIn: 'root'
})
export class FormUtilsService {

  // ==================== VALIDACIÓN DE CAMPOS ====================

  /**
   * Verifica si un campo es inválido y ha sido tocado
   */
  campoInvalido(form: FormGroup, campo: string): boolean {
    const control = form.get(campo);
    return !!(control && control.invalid && control.touched);
  }

  /**
   * Verifica si el formulario tiene un error específico
   */
  formularioTieneError(form: FormGroup, error: string): boolean {
    return form.hasError(error);
  }

  /**
   * Marca todos los campos del formulario como tocados
   */
  marcarCamposComoTocados(form: FormGroup): void {
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      control?.markAsTouched();

      // Si es un FormGroup anidado, marcar recursivamente
      if (control instanceof FormGroup) {
        this.marcarCamposComoTocados(control);
      }
    });
  }

  // ==================== MENSAJES DE ERROR ====================

  /**
   * Obtiene el mensaje de error apropiado para un campo
   */
  obtenerErrorCampo(form: FormGroup, campo: string): string {
    const control = form.get(campo);

    if (!control || !control.errors) {
      return '';
    }

    const errors = control.errors;

    // Errores comunes
    if (errors['required']) return 'Este campo es obligatorio';
    if (errors['email']) return 'Por favor ingresa un email válido';

    // Longitud
    if (errors['minlength']) {
      const minLength = errors['minlength'].requiredLength;
      return `Debe tener al menos ${minLength} caracteres`;
    }
    if (errors['maxlength']) {
      const maxLength = errors['maxlength'].requiredLength;
      return `No puede exceder ${maxLength} caracteres`;
    }

    // Valores numéricos
    if (errors['min']) {
      return `El valor mínimo es ${errors['min'].min}`;
    }
    if (errors['max']) {
      return `El valor máximo es ${errors['max'].max}`;
    }

    // Patrones
    if (errors['pattern']) {
      if (campo.includes('telefono')) {
        return 'Por favor ingresa un teléfono válido de 10 dígitos';
      }
      return 'Formato inválido';
    }

    // Errores personalizados
    if (errors['edadMinima']) {
      const edadRequerida = errors['edadMinima'].edadRequerida;
      return `Debes ser mayor de ${edadRequerida} años`;
    }

    if (errors['contrasenaDebil']) {
      return 'La contraseña debe contener al menos una mayúscula y un número';
    }

    if (errors['contrasenasNoCoinciden']) {
      return 'Las contraseñas no coinciden';
    }

    return 'Campo inválido';
  }

  // ==================== VALIDADORES PERSONALIZADOS ====================

  /**
   * Validador de edad mínima
   */
  edadMinimaValidador(edadMinima: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const fechaNacimiento = new Date(control.value);
      const hoy = new Date();
      let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
      const mes = hoy.getMonth() - fechaNacimiento.getMonth();

      // Ajustar por zona horaria
      const offsetMinutos = fechaNacimiento.getTimezoneOffset();
      fechaNacimiento.setMinutes(fechaNacimiento.getMinutes() + offsetMinutos);

      if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
        edad--;
      }

      return edad >= edadMinima ? null : {
        edadMinima: { edadRequerida: edadMinima, edadActual: edad }
      };
    };
  }

  /**
   * Validador de contraseña fuerte
   */
  contrasenaFuerteValidador(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      const tieneMayuscula = /[A-Z]/.test(value);
      const tieneNumero = /\d/.test(value);
      const tieneCaracterEspecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);

      const esValida = tieneMayuscula && tieneNumero;

      return esValida ? null : {
        contrasenaDebil: {
          tieneMayuscula,
          tieneNumero,
          tieneCaracterEspecial
        }
      };
    };
  }

  /**
   * Validador de coincidencia de contraseñas
   */
  contrasenasMatchValidador(campoContrasena: string = 'contrasena', campoConfirmar: string = 'confirmarContrasena'): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      const contrasena = formGroup.get(campoContrasena)?.value;
      const confirmar = formGroup.get(campoConfirmar)?.value;

      return contrasena === confirmar ? null : { contrasenasNoCoinciden: true };
    };
  }

  // ==================== UTILIDADES DE FECHAS ====================

  /**
   * Obtiene la fecha máxima para un selector de fecha (edad mínima)
   */
  obtenerFechaMaxima(edadMinima: number = 18): string {
    const hoy = new Date();
    hoy.setFullYear(hoy.getFullYear() - edadMinima);
    hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset());
    return hoy.toISOString().split('T')[0];
  }

  /**
   * Obtiene la fecha mínima para un selector de fecha
   */
  obtenerFechaMinima(edadMaxima: number = 120): string {
    const hoy = new Date();
    hoy.setFullYear(hoy.getFullYear() - edadMaxima);
    hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset());
    return hoy.toISOString().split('T')[0];
  }

  /**
   * Obtiene la fecha de hoy en formato YYYY-MM-DD
   */
  obtenerFechaHoy(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Obtiene la fecha de mañana en formato YYYY-MM-DD
   */
  obtenerFechaManana(): string {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    return manana.toISOString().split('T')[0];
  }

  // ==================== SCROLL Y UX ====================

  /**
   * Hace scroll al primer campo con error
   */
  scrollAlPrimerError(): void {
    setTimeout(() => {
      const primerError = document.querySelector('.error, input.error, textarea.error, select.error');
      if (primerError) {
        primerError.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }, 100);
  }
}
