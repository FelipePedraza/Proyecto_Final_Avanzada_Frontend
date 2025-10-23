import { Component } from '@angular/core';
import {
  FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControlOptions, AbstractControl, ValidationErrors} from '@angular/forms';
import { CommonModule } from '@angular/common';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './registro.html',
  styleUrl: './registro.css'
})
export class Registro {
  registroForm!: FormGroup;
  cargando = false;
  mostrarContrasena = false;
  mostrarConfirmarContrasena = false;

  // Para validación visual de la contraseña
  validacionContrasena = {
    tieneLongitud: false,
    tieneMayuscula: false,
    tieneNumero: false
  };

  constructor(private formBuilder: FormBuilder) {
    this.crearForm();
    this.configurarValidacionContrasena();
  }

  crearForm() {
    this.registroForm = this.formBuilder.group({
      nombre: ['', [Validators.required]],
      apellido: ['', [Validators.required]],
      telefono: ['', [Validators.required, Validators.maxLength(10), Validators.pattern(/^[\+]?[0-9\s\-\(\)]{10,}$/)]],
      fechaNacimiento: ['', [Validators.required, this.edadMinimaValidador(18)]],
      email: ['', [Validators.required, Validators.email]],
      contrasena: ['', [Validators.required, Validators.minLength(8), this.ContrasenaFuerteValidador()]],
      confirmarContrasena: ['', [Validators.required]],
      terminos: [false, [Validators.requiredTrue]]
    },
    { validators: this.contrasenasMatchValidador } as AbstractControlOptions
    );
  }

  /**
   * Configura la validación en tiempo real de la contraseña
   */
  private configurarValidacionContrasena(): void {
    this.registroForm.get('contrasena')?.valueChanges.subscribe(value => {
      this.validacionContrasena.tieneLongitud = value?.length >= 8;
      this.validacionContrasena.tieneMayuscula = /[A-Z]/.test(value);
      this.validacionContrasena.tieneNumero = /\d/.test(value);
    });
  }

  /**
   * Alterna la visibilidad de la contraseña
   */
  toggleContrasena(): void {
    this.mostrarContrasena = !this.mostrarContrasena;
  }

  /**
   * Alterna la visibilidad de confirmar contraseña
   */
  toggleConfirmarContrasena(): void {
    this.mostrarConfirmarContrasena = !this.mostrarConfirmarContrasena;
  }

  /**
   * Valida que las contraseñas coincidan
   */
  public contrasenasMatchValidador(formGroup: FormGroup) {
    const contrasena = formGroup.get('contrasena')?.value;
    const confirmarContrasena = formGroup.get('confirmarContrasena')?.value;

    // Si las contraseñas no coinciden, devuelve un error, de lo contrario, null
    return contrasena == confirmarContrasena ? null : { contrasenasNoCoinciden: true };
  }

  /**
   * Valida que la contraseña sea segura
   */
  public ContrasenaFuerteValidador() {
    return (control: AbstractControl) => {
      const value = control.value;
      if (!value) return null;

      const tieneMayuscula = /[A-Z]/.test(value);
      const tieneNumero = /\d/.test(value);

      const valid = tieneMayuscula && tieneNumero;

      return valid ? null : { contrasenaSegura: true };
    };
  }

  /**
   * Procesa el registro del usuario
   */
  public crearUsuario() {
    // Marcar todos los campos como tocados para mostrar errores
    if (this.registroForm.invalid) {
      Object.keys(this.registroForm.controls).forEach(key => {
        this.registroForm.get(key)?.markAsTouched();
      });

      // Scroll al primer error
      this.scrollAlPrimerError();
      return;
    }

    this.cargando = true;

    // Preparar datos del usuario
    const formValues = this.registroForm.value;
    const usuario = {
      nombre: `${formValues.nombre} ${formValues.apellido}`,
      telefono: formValues.telefono,
      fechaNacimiento: formValues.fechaNacimiento,
      email: formValues.email,
      contrasena: formValues.contrasena
    };

    console.log('Usuario a registrar:', usuario);
  }

  /**
   * Scroll al primer campo con error
   */
  private scrollAlPrimerError(): void {
    const primerError = document.querySelector('.error');
    if (primerError) {
      primerError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /**
   * Valida la edad mínima
   */
  private edadMinimaValidador(edadMinima: number) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const fechaNacimiento = new Date(control.value);
      const hoy = new Date();
      let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
      const mes = hoy.getMonth() - fechaNacimiento.getMonth();

      if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
        edad--;
      }

      return edad >= edadMinima ? null : { edadMinima: { edadRequerida: edadMinima, edadActual: edad } };
    };
  }

  /**
   * Valida si un campo específico tiene errores
   */
  campoInvalido(campo: string): boolean {
    const control = this.registroForm.get(campo);
    return !!(control && control.invalid && control.touched);
  }
  /**
   * Valida si el formulario tiene un error específico
   */
  formularioTieneError(error: string): boolean {
    return this.registroForm.hasError(error);
  }

  /**
   * Obtiene el mensaje de error para un campo específico
   */
  obtenerErrorCampo(campo: string): string {
    const control = this.registroForm.get(campo);

    if (!control || !control.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Este campo es obligatorio';
    }

    if (control.errors['email']) {
      return 'Por favor ingresa un email válido';
    }

    if (control.errors['minlength']) {
      const minLength = control.errors['minlength'].requiredLength;
      return `Debe tener al menos ${minLength} caracteres`;
    }

    if (control.errors['maxlength']) {
      const maxLength = control.errors['maxlength'].requiredLength;
      return `No puede tener más de ${maxLength} caracteres`;
    }

    if (control.errors['pattern']) {
      if (campo === 'telefono') {
        return 'Por favor ingresa un teléfono válido';
      }
      return 'Formato inválido';
    }

    if (control.errors['edadMinima']) {
      const edadRequerida = control.errors['edadMinima'].edadRequerida;
      return `Debes ser mayor de ${edadRequerida} años`;
    }

    if (control.errors['contrasenaDebil']) {
      return 'La contraseña debe contener al menos una mayúscula y un número';
    }

    return 'Campo inválido';
  }

  /**
   * Obtiene la fecha máxima permitida (hace 18 años)
   */
  obtenerFechaMaxima(): string {
    const hoy = new Date();
    hoy.setFullYear(hoy.getFullYear() - 18);
    return hoy.toISOString().split('T')[0];
  }

  /**
   * Obtiene la fecha mínima permitida (hace 120 años)
   */
  obtenerFechaMinima(): string {
    const hoy = new Date();
    hoy.setFullYear(hoy.getFullYear() - 120);
    return hoy.toISOString().split('T')[0];
  }
}
