import {Component, OnDestroy, OnInit} from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil, finalize } from 'rxjs';
import Swal from 'sweetalert2';
import { AuthService } from '../../services/auth-service';
import { LoginDTO, OlvidoContrasenaDTO } from '../../models/usuario-dto';
import {TokenService} from '../../services/token-service';

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
export class Login implements OnDestroy, OnInit  { // <--- Añadido OnInit
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
    private tokenService: TokenService,
    private router: Router
  ) {
  }

  // --- CORRECCIÓN: Añadido ngOnInit ---
  ngOnInit(): void {
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

    const loginDTO = this.loginForm.value as LoginDTO;

    this.authService.login(loginDTO)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargando = false)
      )
      .subscribe({
        next: (respuesta) => {
          this.tokenService.login(respuesta.data.token)
          this.router.navigate(['/']).then(() => window.location.reload());
        },
        error: (error) => {
          this.mostrarError(error);
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

    const olvidoContrasenaDTO = this.recuperarForm.value as OlvidoContrasenaDTO;

    this.authService.solicitarRecuperacion(olvidoContrasenaDTO)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargando = false)
      )
      .subscribe({
        next: (respuesta) => {
          this.cambiarVista(VistaLogin.EXITO);
        },
        error: (error) => {
          this.mostrarError(error);
        }
      });
  }

  reenviarEmail(): void {
    if (!this.emailRecuperacion) return;

    this.cargando = true;

    const olvidoContrasenaDTO = this.recuperarForm.value as OlvidoContrasenaDTO;

    this.authService.solicitarRecuperacion(olvidoContrasenaDTO)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargando = false)
      )
      .subscribe({
        next: (respuesta) => {
          Swal.fire({
            title: 'Correo reenviado',
            text: 'Hemos enviado nuevamente el enlace de recuperación',
            icon: 'success',
            confirmButtonColor: '#2e8b57',
            timer: 3000,
            timerProgressBar: true
          });
        },
        error: (error) => {
          this.mostrarError(error);
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

  private mostrarError(error: any): void {
    Swal.fire({
      title: 'Error',
      text: error.error.data,
      icon: 'error',
      confirmButtonColor: '#2e8b57'
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
