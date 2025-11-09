import {Component, OnDestroy, OnInit} from '@angular/core';
import {ReactiveFormsModule, FormGroup, FormBuilder, Validators, AbstractControlOptions} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil, finalize } from 'rxjs';
import { MensajeHandlerService } from '../../services/mensajeHandler-service';
import { AuthService } from '../../services/auth-service';
import { LoginDTO, OlvidoContrasenaDTO, ReinicioContrasenaDTO } from '../../models/usuario-dto';
import {TokenService} from '../../services/token-service';
import { FormUtilsService } from '../../services/formUtils-service';

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
    public formUtilsService: FormUtilsService,
    private mensajeHandlerService: MensajeHandlerService,
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
      nuevaContrasena: ['', [Validators.required, Validators.minLength(8), this.formUtilsService.contrasenaFuerteValidador()]]
    }, { validators: this.formUtilsService.contrasenasMatchValidador() } as AbstractControlOptions);
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
      this.formUtilsService.scrollAlPrimerError();
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
          this.tokenService.login(respuesta.data.token, respuesta.data.refreshToken);
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


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
