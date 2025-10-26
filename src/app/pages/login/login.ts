import { Component } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil, finalize } from 'rxjs';
import Swal from 'sweetalert2';
import { AuthService } from '../../services/auth-service';
import { LoginDTO, OlvidoContrasenaDTO } from '../../models/usuario-dto';

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
  // Formularios
  loginForm!: FormGroup;
  recuperarForm!: FormGroup;

  // Control de vistas
  vistaActual: VistaLogin = VistaLogin.LOGIN;
  readonly VistaLogin = VistaLogin;

  // Estado de la UI
  mostrarContrasena = false;
  cargando = false;
  emailRecuperacion = '';

  // Subject para cancelar subscripciones
  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.crearFormularios();
  }

  crearFormularios(): void {
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

  toggleContrasena(): void {
    this.mostrarContrasena = !this.mostrarContrasena;
  }

  cambiarVista(vista: VistaLogin): void {
    this.vistaActual = vista;

    if (vista === VistaLogin.LOGIN) {
      this.loginForm.reset();
      this.cargando = false;
    } else if (vista === VistaLogin.RECUPERAR) {
      this.recuperarForm.reset();
      this.cargando = false;
    }
  }

  login(): void {
    if (this.loginForm.invalid) {
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
      this.scrollAlPrimerError();
      return;
    }

    this.cargando = true;

    const dto: LoginDTO = {
      email: this.loginForm.value.email,
      contrasena: this.loginForm.value.contrasena
    };

    this.authService.login(dto)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargando = false)
      )
      .subscribe({
        next: (response) => {
          if (!response.error) {
            // Guardar token
            this.authService.guardarToken(response.respuesta.token);

            // Mostrar mensaje de éxito
            Swal.fire({
              title: '¡Bienvenido!',
              text: 'Has iniciado sesión correctamente',
              icon: 'success',
              confirmButtonColor: '#2e8b57',
              timer: 2000,
              timerProgressBar: true
            }).then(() => {
              // Redirigir al dashboard o página principal
              this.router.navigate(['/']);
            });
          } else {
            this.mostrarError('Credenciales incorrectas');
          }
        },
        error: (error) => {
          console.error('Error en login:', error);
          this.mostrarError('Email o contraseña incorrectos. Por favor, intenta de nuevo.');
        }
      });
  }

  recuperarContrasena(): void {
    if (this.recuperarForm.invalid) {
      Object.keys(this.recuperarForm.controls).forEach(key => {
        this.recuperarForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.cargando = true;
    this.emailRecuperacion = this.recuperarForm.value.email;

    const dto: OlvidoContrasenaDTO = {
      email: this.emailRecuperacion
    };

    this.authService.solicitarRecuperacion(dto)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargando = false)
      )
      .subscribe({
        next: (response) => {
          if (!response.error) {
            this.cambiarVista(VistaLogin.EXITO);
          } else {
            this.mostrarError('No se pudo enviar el correo de recuperación');
          }
        },
        error: (error) => {
          console.error('Error al recuperar contraseña:', error);
          this.mostrarError('No se pudo procesar tu solicitud. Por favor, intenta de nuevo.');
        }
      });
  }

  reenviarEmail(): void {
    if (!this.emailRecuperacion) return;

    this.cargando = true;

    const dto: OlvidoContrasenaDTO = {
      email: this.emailRecuperacion
    };

    this.authService.solicitarRecuperacion(dto)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargando = false)
      )
      .subscribe({
        next: (response) => {
          if (!response.error) {
            Swal.fire({
              title: 'Correo reenviado',
              text: 'Hemos enviado nuevamente el enlace de recuperación',
              icon: 'success',
              confirmButtonColor: '#2e8b57',
              timer: 3000,
              timerProgressBar: true
            });
          }
        },
        error: (error) => {
          console.error('Error al reenviar email:', error);
          this.mostrarError('No se pudo reenviar el correo. Por favor, intenta más tarde.');
        }
      });
  }

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

  campoInvalido(formulario: FormGroup, campo: string): boolean {
    const control = formulario.get(campo);
    return !!(control && control.invalid && control.touched);
  }

  private scrollAlPrimerError(): void {
    const primerError = document.querySelector('.error');
    if (primerError) {
      primerError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  private mostrarError(mensaje: string): void {
    Swal.fire({
      title: 'Error',
      text: mensaje,
      icon: 'error',
      confirmButtonColor: '#2e8b57'
    });
  }
}
