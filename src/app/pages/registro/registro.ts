import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControlOptions, AbstractControl, ValidationErrors
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil, finalize } from 'rxjs';
import Swal from 'sweetalert2';
import { AuthService } from '../../services/auth-service';
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
      fechaNacimiento: ['', [Validators.required, this.edadMinimaValidador(18)]],
      email: ['', [Validators.required, Validators.email]],
      contrasena: ['', [
        Validators.required,
        Validators.minLength(8),
        this.contrasenaFuerteValidador()
      ]],
      confirmarContrasena: ['', [Validators.required]],
      terminos: [false, [Validators.requiredTrue]]
    }, { validators: this.contrasenasMatchValidador } as AbstractControlOptions);
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

  private contrasenasMatchValidador(formGroup: AbstractControl): ValidationErrors | null {
    const contrasena = formGroup.get('contrasena')?.value;
    const confirmarContrasena = formGroup.get('confirmarContrasena')?.value;
    return contrasena === confirmarContrasena ? null : { contrasenasNoCoinciden: true };
  }

  private contrasenaFuerteValidador() {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      const tieneMayuscula = /[A-Z]/.test(value);
      const tieneNumero = /\d/.test(value);

      return tieneMayuscula && tieneNumero ? null : { contrasenaDebil: true };
    };
  }

  crearUsuario(): void {
    if (this.registroForm.invalid) {
      this.marcarCamposComoTocados();
      this.scrollAlPrimerError();
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
          Swal.fire({
            title: '¡Registro exitoso!',
            text: respuesta.data,
            icon: 'success',
            confirmButtonColor: '#2e8b57',
            timer: 2000,
            timerProgressBar: true
          }).then(() => {
            this.router.navigate(['/login']);
          });
        },
        error: (error) => {
          this.mostrarError(error);
        }
      });
  }

  private scrollAlPrimerError(): void {
    setTimeout(() => {
      const primerError = document.querySelector('.error');
      if (primerError) {
        primerError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  private edadMinimaValidador(edadMinima: number) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const fechaNacimiento = new Date(control.value);
      const hoy = new Date();
      let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
      const mes = hoy.getMonth() - fechaNacimiento.getMonth();
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

  campoInvalido(campo: string): boolean {
    const control = this.registroForm.get(campo);
    return !!(control && control.invalid && control.touched);
  }

  formularioTieneError(error: string): boolean {
    return this.registroForm.hasError(error);
  }

  obtenerErrorCampo(campo: string): string {
    const control = this.registroForm.get(campo);
    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'Este campo es obligatorio';
    if (control.errors['email']) return 'Por favor ingresa un email válido';
    if (control.errors['minlength']) {
      const minLength = control.errors['minlength'].requiredLength;
      return `Debe tener al menos ${minLength} caracteres`;
    }
    if (control.errors['maxlength']) {
      const maxLength = control.errors['maxlength'].requiredLength;
      return `No puede tener más de ${maxLength} caracteres`;
    }
    if (control.errors['pattern']) {
      if (campo === 'telefono') return 'Por favor ingresa un teléfono válido de 10 dígitos';
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

  obtenerFechaMaxima(): string {
    const hoy = new Date();
    hoy.setFullYear(hoy.getFullYear() - 18);
    // Ajuste para el offset de la zona horaria al generar el string
    hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset());
    return hoy.toISOString().split('T')[0];
  }

  obtenerFechaMinima(): string {
    const hoy = new Date();
    hoy.setFullYear(hoy.getFullYear() - 120);
    // Ajuste para el offset de la zona horaria al generar el string
    hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset());
    return hoy.toISOString().split('T')[0];
  }

  private marcarCamposComoTocados(): void {
    Object.keys(this.registroForm.controls).forEach(key => {
      this.registroForm.get(key)?.markAsTouched();
    });
  }

  private mostrarError(error: any): void {
    Swal.fire({
      title: 'Error',
      text: error.error.data,
      icon: 'error',
      confirmButtonColor: '#2e8b57'
    });
  }
}
