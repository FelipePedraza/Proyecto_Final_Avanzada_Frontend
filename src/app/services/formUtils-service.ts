import { Injectable } from '@angular/core';
import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';
import { FechaService } from './fecha-service';

/**
 * Servicio centralizado para utilidades de formularios
 * Ahora delega lógica de fechas a FechaService
 */
@Injectable({
  providedIn: 'root'
})
export class FormUtilsService {

  constructor(private fechaService: FechaService) {}

  // ==================== VALIDACIÓN DE CAMPOS ====================

  campoInvalido(form: FormGroup, campo: string): boolean {
    const control = form.get(campo);
    return !!(control && control.invalid && control.touched);
  }

  formularioTieneError(form: FormGroup, error: string): boolean {
    return form.hasError(error);
  }

  marcarCamposComoTocados(form: FormGroup): void {
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.marcarCamposComoTocados(control);
      }
    });
  }

  // ==================== MENSAJES DE ERROR ====================

  obtenerErrorCampo(form: FormGroup, campo: string): string {
    const control = form.get(campo);

    if (!control || !control.errors) {
      return '';
    }

    const errors = control.errors;

    if (errors['required']) return 'Este campo es obligatorio';
    if (errors['email']) return 'Por favor ingresa un email válido';

    if (errors['minlength']) {
      const minLength = errors['minlength'].requiredLength;
      return `Debe tener al menos ${minLength} caracteres`;
    }
    if (errors['maxlength']) {
      const maxLength = errors['maxlength'].requiredLength;
      return `No puede exceder ${maxLength} caracteres`;
    }

    if (errors['min']) {
      return `El valor mínimo es ${errors['min'].min}`;
    }
    if (errors['max']) {
      return `El valor máximo es ${errors['max'].max}`;
    }

    if (errors['pattern']) {
      if (campo.includes('telefono')) {
        return 'Por favor ingresa un teléfono válido de 10 dígitos';
      }
      return 'Formato inválido';
    }

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

  edadMinimaValidador(edadMinima: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const edad = this.fechaService.calcularEdad(control.value);

      return edad >= edadMinima ? null : {
        edadMinima: { edadRequerida: edadMinima, edadActual: edad }
      };
    };
  }

  contrasenaFuerteValidador(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      const tieneMayuscula = /[A-Z]/.test(value);
      const tieneNumero = /\d/.test(value);

      const esValida = tieneMayuscula && tieneNumero;

      return esValida ? null : {
        contrasenaDebil: {
          tieneMayuscula,
          tieneNumero
        }
      };
    };
  }

  contrasenasMatchValidador(campoContrasena: string = 'contrasena', campoConfirmar: string = 'confirmarContrasena'): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      const contrasena = formGroup.get(campoContrasena)?.value;
      const confirmar = formGroup.get(campoConfirmar)?.value;

      return contrasena === confirmar ? null : { contrasenasNoCoinciden: true };
    };
  }

  // ==================== SCROLL Y UX ====================

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
