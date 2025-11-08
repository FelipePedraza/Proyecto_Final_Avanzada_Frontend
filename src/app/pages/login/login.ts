import {Component, OnDestroy, OnInit} from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil, finalize } from 'rxjs';
import { MensajehandlerService } from '../../services/mensajehandler-service';
import { AuthService } from '../../services/auth-service';
import { LoginDTO, OlvidoContrasenaDTO, ReinicioContrasenaDTO } from '../../models/usuario-dto';
import {TokenService} from '../../services/token-service';

enum VistaLogin {
  LOGIN = 'login',
  RECUPERAR = 'recuperar',
  EXITO = 'exito',
  RESTABLECER = 'restablecer'
}

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnDestroy, OnInit {
  // Formularios
  loginForm!: FormGroup;
  recuperarForm!: FormGroup;
  restablecerForm!: FormGroup;

  // Control de vistas
  vistaActual: VistaLogin = VistaLogin.LOGIN;
  readonly VistaLogin = VistaLogin;

  // Estado de la UI
  mostrarContrasena = false;
  mostrarNuevaContrasena = false;
  cargando = false;
  emailRecuperacion = '';

  // Subject para cancelar subscripciones
  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private tokenService: TokenService,
    private mensajeHandlerService: MensajehandlerService,
    private router: Router
  ) {
  }

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

    // Formulario de restablecimiento de contraseña
    this.restablecerForm = this.formBuilder.group({
      codigoVerificacion: ['', [Validators.required, Validators.minLength(6)]],
      nuevaContrasena: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  toggleContrasena(): void {
    this.mostrarContrasena = !this.mostrarContrasena;
  }

  toggleNuevaContrasena(): void {
    this.mostrarNuevaContrasena = !this.mostrarNuevaContrasena;
  }

  cambiarVista(vista: VistaLogin): void {
    this.vistaActual = vista;

    if (vista === VistaLogin.LOGIN) {
      this.loginForm.reset();
      this.cargando = false;
    } else if (vista === VistaLogin.RECUPERAR) {
      this.recuperarForm.reset();
      this.cargando = false;
    } else if (vista === VistaLogin.RESTABLECER) {
      this.restablecerForm.reset();
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
          const mensaje = this.mensajeHandlerService.handleHttpError(error);
          this.mensajeHandlerService.showError(mensaje);
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
    this.emailRecuperacion = olvidoContrasenaDTO.email;

    this.authService.solicitarRecuperacion(olvidoContrasenaDTO)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargando = false)
      )
      .subscribe({
        next: (respuesta) => {
          this.mensajeHandlerService.showSuccessWithCallback(
            respuesta.data, "",
            () => {
              this.cambiarVista(VistaLogin.EXITO);
            }
          );
        },
        error: (error) => {
          const mensaje = this.mensajeHandlerService.handleHttpError(error);
          this.mensajeHandlerService.showError(mensaje);
        }
      });
  }

  reenviarEmail(): void {
    if (!this.emailRecuperacion) return;

    this.cargando = true;

    const olvidoContrasenaDTO: OlvidoContrasenaDTO = {
      email: this.emailRecuperacion
    };

    this.authService.solicitarRecuperacion(olvidoContrasenaDTO)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargando = false)
      )
      .subscribe({
        next: (respuesta) => {
          this.mensajeHandlerService.showSuccess(respuesta.data);
        },
        error: (error) => {
          const mensaje = this.mensajeHandlerService.handleHttpError(error);
          this.mensajeHandlerService.showError(mensaje);
        }
      });
  }

  restablecerContrasena(): void {
    if (this.restablecerForm.invalid) {
      Object.keys(this.restablecerForm.controls).forEach(key => {
        this.restablecerForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.cargando = true;

    const ReinicioContrasenaDTO: ReinicioContrasenaDTO = {
      email: this.emailRecuperacion,
      codigoVerificacion: this.restablecerForm.value.codigoVerificacion,
      nuevaContrasena: this.restablecerForm.value.nuevaContrasena
    };

    this.authService.reiniciarContrasena(ReinicioContrasenaDTO)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargando = false)
      )
      .subscribe({
        next: (respuesta) => {
          this.mensajeHandlerService.showSuccessWithCallback(
            respuesta.data, "",
            () => {
              this.cambiarVista(VistaLogin.LOGIN);
            }
          );
        },
        error: (error) => {
          const mensaje = this.mensajeHandlerService.handleHttpError(error);
          this.mensajeHandlerService.showError(mensaje);
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
