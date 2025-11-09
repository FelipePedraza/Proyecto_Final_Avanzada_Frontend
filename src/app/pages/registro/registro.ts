import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControlOptions, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil, finalize } from 'rxjs';

//Servicios
import { AuthService } from '../../services/auth-service';
import { MensajeHandlerService } from '../../services/mensajeHandler-service';
import { FormUtilsService } from '../../services/formUtils-service';
//DTO
import { CreacionUsuarioDTO } from '../../models/usuario-dto';

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './registro.html',
  styleUrl: './registro.css'
})
export class Registro implements OnDestroy, OnInit {
  registroForm!: FormGroup;
  cargando = false;
  mostrarContrasena = false;
  mostrarConfirmarContrasena = false;

  // Validación visual de contraseña
  validacionContrasena = {
    tieneLongitud: false,
    tieneMayuscula: false,
    tieneNumero: false
  };

  // Subject para cancelar subscripciones
  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private mensajeHandlerService: MensajeHandlerService,
    public formUtilsService: FormUtilsService,
    private router: Router
  ) {
  }

  ngOnInit() {
    this.crearForm();
    this.configurarValidacionContrasena();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private crearForm(): void {
    this.registroForm = this.formBuilder.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      telefono: ['', [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(10),
        Validators.pattern(/^[0-9]{10}$/)
      ]],
      fechaNacimiento: ['', [Validators.required, this.formUtilsService.edadMinimaValidador(18)]],
      email: ['', [Validators.required, Validators.email]],
      contrasena: ['', [
        Validators.required,
        Validators.minLength(8),
        this.formUtilsService.contrasenaFuerteValidador()
      ]],
      confirmarContrasena: ['', [Validators.required]],
      terminos: [false, [Validators.requiredTrue]]
    }, { validators: this.formUtilsService.contrasenasMatchValidador() } as AbstractControlOptions);
  }

  private configurarValidacionContrasena(): void {
    this.registroForm.get('contrasena')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.validacionContrasena.tieneLongitud = value?.length >= 8;
        this.validacionContrasena.tieneMayuscula = /[A-Z]/.test(value);
        this.validacionContrasena.tieneNumero = /\d/.test(value);
      });
  }

  toggleContrasena(): void {
    this.mostrarContrasena = !this.mostrarContrasena;
  }

  toggleConfirmarContrasena(): void {
    this.mostrarConfirmarContrasena = !this.mostrarConfirmarContrasena;
  }

  crearUsuario(): void {
    if (this.registroForm.invalid) {
      this.formUtilsService.marcarCamposComoTocados(this.registroForm);
      this.formUtilsService.scrollAlPrimerError();
      return;
    }

    this.cargando = true;

    const CreacionUsuarioDTO = this.registroForm.value as CreacionUsuarioDTO;

    this.authService.registro(CreacionUsuarioDTO)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargando = false)
      )
      .subscribe({
        next: (respuesta) => {
          this.mensajeHandlerService.showSuccessWithCallback(
            respuesta.data, "",
            () => {
              this.router.navigate(['/login']);
            }
          );
        },
        error: (error) => {
          const mensaje = this.mensajeHandlerService.handleHttpError(error);
          this.mensajeHandlerService.showError(mensaje);
        }
      });
  }
}
