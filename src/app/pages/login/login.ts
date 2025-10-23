import { Component } from '@angular/core';
import {ReactiveFormsModule, FormGroup, FormBuilder, Validators} from '@angular/forms';
import { CommonModule } from '@angular/common';
import {RouterLink} from '@angular/router';

// Enum para manejar las vistas
enum VistaLogin {
  LOGIN = 'login',
  RECUPERAR = 'recuperar',
  EXITO = 'exito'
}

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  //formularios
  loginForm!: FormGroup;
  recuperarForm!: FormGroup;

  // Control de vistas
  vistaActual: VistaLogin = VistaLogin.LOGIN;
  readonly VistaLogin = VistaLogin; // Para usar en el template

  // Estado de la UI
  mostrarContrasena = false;
  cargando = false;
  emailRecuperacion = '';

  constructor(private formBuilder: FormBuilder) {
    this.crearFormularios();
  }

  crearFormularios() {

    // Formulario de login
    this.loginForm = this.formBuilder.group({
        email: ['', [Validators.required, Validators.email]],
        contrasena: ['', [Validators.required, Validators.minLength(8)]]
    });
    // Formulario de recuperación de contraseña
    this.recuperarForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });

  }

  /**
   * Alterna la visibilidad de la contraseña
   */
  toggleContrasena() {
    this.mostrarContrasena = !this.mostrarContrasena;
  }

  /**
   * Cambia entre las diferentes vistas
   */
  cambiarVista(vista: VistaLogin): void {
    this.vistaActual = vista;

    // Resetear formularios al cambiar de vista
    if (vista === VistaLogin.LOGIN) {
      this.loginForm.reset();
      this.cargando = false;
    } else if (vista === VistaLogin.RECUPERAR) {
      this.recuperarForm.reset();
      this.cargando = false;
    }
  }

  public login() {

    if (this.loginForm.invalid) {
      // Marcar todos los campos como tocados para mostrar errores
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });

      // Scroll al primer error
      this.scrollAlPrimerError();
      return;
    }
    this.cargando = true;

    console.log('login de:', this.loginForm.value);
  }

  /**
   * Procesa la recuperación de contraseña
   */
  recuperarContrasena(): void {
    if (this.recuperarForm.invalid) {
      Object.keys(this.recuperarForm.controls).forEach(key => {
        this.recuperarForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.cargando = true;
    this.emailRecuperacion = this.recuperarForm.value.email;
    console.log('Email de recuperación enviado a:', this.emailRecuperacion);
    this.cargando = false;
    this.cambiarVista(VistaLogin.EXITO);
  }

  /**
   * Obtiene el mensaje de error para un campo específico
   */
  obtenerErrorCampo(formulario: FormGroup, campo: string): string {
    const control = formulario.get(campo);

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

    return 'Campo inválido';
  }

  /**
   * Reenvía el email de recuperación
   */
  reenviarEmail(): void {
    this.cargando = true;
    console.log('Email reenviado a:', this.emailRecuperacion);
  }

  /**
   * Valida si un campo específico tiene errores
   */
  campoInvalido(formulario: FormGroup, campo: string): boolean {
    const control = formulario.get(campo);
    return !!(control && control.invalid && control.touched);
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
}
