import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, finalize } from 'rxjs';
import Swal from 'sweetalert2';

// Servicios
import { UsuarioService } from '../../services/usuario-service';
import { TokenService } from '../../services/token-service';
import { ImagenService } from '../../services/imagen-service';
import { PanelUsuario } from '../../components/panel-usuario/panel-usuario';

// DTOs
import { UsuarioDTO, EdicionUsuarioDTO, CambioContrasenaDTO } from '../../models/usuario-dto';

@Component({
  selector: 'app-editar-perfil',
  imports: [CommonModule, ReactiveFormsModule, PanelUsuario],
  templateUrl: './editar-perfil.html',
  styleUrl: './editar-perfil.css'
})
export class EditarPerfil implements OnInit, OnDestroy {

  // ==================== PROPIEDADES ====================

  perfilForm!: FormGroup;
  seguridadForm!: FormGroup;

  usuario: UsuarioDTO | null = null;
  tabActiva: 'personal' | 'seguridad' = 'personal';

  // Estados
  cargando = false;
  cargandoUsuario = false;
  subiendoImagen = false;
  mostrarContrasenaActual = false;
  mostrarNuevaContrasena = false;
  mostrarConfirmarContrasena = false;

  // Foto de perfil
  fotoPreview: string = '';
  fotoSubida: string = '';

  // Validación de contraseña
  validacionContrasena = {
    tieneLongitud: false,
    tieneMayuscula: false,
    tieneNumero: false
  };

  private destroy$ = new Subject<void>();

  // ==================== CONSTRUCTOR ====================

  constructor(
    private formBuilder: FormBuilder,
    private usuarioService: UsuarioService,
    private tokenService: TokenService,
    private imagenService: ImagenService,
    private router: Router
  ) {}

  // ==================== CICLO DE VIDA ====================

  ngOnInit(): void {
    this.crearFormularios();
    this.cargarDatosUsuario();
    this.configurarValidacionContrasena();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== INICIALIZACIÓN ====================

  private crearFormularios(): void {
    // Formulario de perfil
    this.perfilForm = this.formBuilder.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      telefono: ['', [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(10),
        Validators.pattern(/^[0-9]{10}$/)
      ]],
      fechaNacimiento: ['', [Validators.required, this.edadMinimaValidador(18)]],
      foto: ['']
    });

    // Formulario de seguridad
    this.seguridadForm = this.formBuilder.group({
      contrasenaActual: ['', [Validators.required, Validators.minLength(8)]],
      contrasenaNueva: ['', [
        Validators.required,
        Validators.minLength(8),
        this.contrasenaFuerteValidador()
      ]],
      confirmarContrasena: ['', [Validators.required]]
    }, { validators: this.contrasenasMatchValidador });
  }

  private cargarDatosUsuario(): void {
    const usuarioId = this.tokenService.getUserId();

    if (!usuarioId) {
      this.router.navigate(['/login']);
      return;
    }

    this.cargandoUsuario = true;

    this.usuarioService.obtener(usuarioId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargandoUsuario = false)
      )
      .subscribe({
        next: (respuesta) => {
          if (!respuesta.error) {
            this.usuario = respuesta.data;
            this.fotoPreview = this.usuario!.foto || '';
            this.fotoSubida = this.usuario!.foto || '';

            // Llenar el formulario con los datos del usuario
            this.perfilForm.patchValue({
              nombre: this.usuario!.nombre,
              telefono: this.usuario!.telefono,
              foto: this.usuario!.foto,
              fechaNacimiento: this.usuario!.fechaNacimiento
            });
          }
        },
        error: (error) => {
          this.mostrarError('Error al cargar los datos del usuario');
          console.error(error);
        }
      });
  }

  private configurarValidacionContrasena(): void {
    this.seguridadForm.get('contrasenaNueva')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.validacionContrasena.tieneLongitud = value?.length >= 8;
        this.validacionContrasena.tieneMayuscula = /[A-Z]/.test(value);
        this.validacionContrasena.tieneNumero = /\d/.test(value);
      });
  }

  // ==================== NAVEGACIÓN DE TABS ====================

  cambiarTab(tab: 'personal' | 'seguridad'): void {
    this.tabActiva = tab;

    // Resetear formulario de seguridad al cambiar de tab
    if (tab === 'personal') {
      this.seguridadForm.reset();
    }
  }

  // ==================== FOTO DE PERFIL ====================

  seleccionarImagen(event: any): void {
    const file: File = event.target.files[0];

    if (!file) return;

    // Validar tamaño (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.mostrarError('La imagen no puede pesar más de 5MB');
      return;
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      this.mostrarError('Solo se permiten archivos de imagen');
      return;
    }

    // Preview local
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.fotoPreview = e.target.result;
    };
    reader.readAsDataURL(file);

    // Subir a Cloudinary
    this.subirImagen(file);
  }

  private subirImagen(file: File): void {
    this.subiendoImagen = true;

    this.imagenService.subirImagen(file)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.subiendoImagen = false)
      )
      .subscribe({
        next: (respuesta) => {
          if (!respuesta.error) {
            this.fotoSubida = respuesta.data.url;
            this.perfilForm.patchValue({ foto: respuesta.data.url });
          }
        },
        error: (error) => {
          this.mostrarError('Error al subir la imagen');
          this.fotoPreview = this.fotoSubida; // Restaurar preview anterior
        }
      });
  }

  // ==================== GUARDAR INFORMACIÓN PERSONAL ====================

  guardarPerfil(): void {
    if (this.perfilForm.invalid) {
      this.marcarCamposComoTocados(this.perfilForm);
      return;
    }

    const usuarioId = this.tokenService.getUserId();

    if (!usuarioId) {
      this.mostrarError('Sesión expirada. Por favor, inicia sesión de nuevo.');
      this.router.navigate(['/login']);
      return;
    }

    this.cargando = true;

    const edicionUsuarioDTO = this.perfilForm.value as EdicionUsuarioDTO;

    this.usuarioService.editar(usuarioId, edicionUsuarioDTO)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargando = false)
      )
      .subscribe({
        next: (respuesta) => {
          Swal.fire({
            title: '¡Perfil actualizado!',
            text: 'Tus datos han sido guardados correctamente',
            icon: 'success',
            confirmButtonColor: '#2e8b57',
            timer: 2000,
            timerProgressBar: true
          }).then(() => {
            this.cargarDatosUsuario();
          });
        },
        error: (error) => {
          this.mostrarError(error?.error?.data || 'Error al actualizar el perfil');
        }
      });
  }

  // ==================== CAMBIAR CONTRASEÑA ====================

  cambiarContrasena(): void {
    if (this.seguridadForm.invalid) {
      this.marcarCamposComoTocados(this.seguridadForm);
      return;
    }

    const usuarioId = this.tokenService.getUserId();

    if (!usuarioId) {
      this.mostrarError('Sesión expirada. Por favor, inicia sesión de nuevo.');
      this.router.navigate(['/login']);
      return;
    }

    this.cargando = true;

    const dto: CambioContrasenaDTO = {
      contrasenaActual: this.seguridadForm.value.contrasenaActual,
      contrasenaNueva: this.seguridadForm.value.contrasenaNueva
    };

    this.usuarioService.cambiarContrasena(usuarioId, dto)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargando = false)
      )
      .subscribe({
        next: (respuesta) => {
          Swal.fire({
            title: '¡Contraseña actualizada!',
            text: 'Tu contraseña ha sido cambiada correctamente',
            icon: 'success',
            confirmButtonColor: '#2e8b57',
            timer: 2000,
            timerProgressBar: true
          });
          this.tokenService.logout();
          this.usuario = null;
          this.seguridadForm.reset();
          this.router.navigate(['/login']).then(r => window.location.reload());
        },
        error: (error) => {
          this.mostrarError(error?.error?.data || 'Error al cambiar la contraseña');
        }
      });
  }

  // ==================== ELIMINAR CUENTA ====================

  confirmarEliminarCuenta(): void {
    Swal.fire({
      title: '¿Eliminar cuenta?',
      html: `
        <div style="text-align: left;">
          <p style="color: var(--danger-color); font-weight: 600; margin-bottom: 1rem;">
            ⚠️ Esta acción es irreversible
          </p>
          <p style="color: var(--text-color); margin-bottom: 0.5rem;">
            Al eliminar tu cuenta:
          </p>
          <ul style="text-align: left; color: var(--text-color); padding-left: 1.5rem;">
            <li>Perderás acceso a todos tus datos</li>
            <li>Se cancelarán todas tus reservas activas</li>
            <li>Se eliminarán tus alojamientos (si eres anfitrión)</li>
            <li>No podrás recuperar tu cuenta</li>
          </ul>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar mi cuenta',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e74c3c',
      cancelButtonColor: '#95a5a6',
      input: 'text',
      inputPlaceholder: 'Escribe "ELIMINAR" para confirmar',
      inputValidator: (value) => {
        if (value !== 'ELIMINAR') {
          return 'Debes escribir "ELIMINAR" para confirmar';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.eliminarCuenta();
      }
    });
  }

  private eliminarCuenta(): void {
    const usuarioId = this.tokenService.getUserId();

    if (!usuarioId) return;

    Swal.fire({
      title: 'Eliminando cuenta...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.usuarioService.eliminar(usuarioId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          Swal.fire({
            title: 'Cuenta eliminada',
            text: 'Tu cuenta ha sido eliminada correctamente',
            icon: 'success',
            confirmButtonColor: '#2e8b57',
            allowOutsideClick: false
          }).then(() => {
            this.tokenService.logout();
            this.router.navigate(['/']);
          });
        },
        error: (error) => {
          Swal.close();
          this.mostrarError(error?.error?.data || 'Error al eliminar la cuenta');
        }
      });
  }

  // ==================== VALIDADORES ====================

  private contrasenasMatchValidador(formGroup: AbstractControl): ValidationErrors | null {
    const nueva = formGroup.get('contrasenaNueva')?.value;
    const confirmar = formGroup.get('confirmarContrasena')?.value;
    return nueva === confirmar ? null : { contrasenasNoCoinciden: true };
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

  // ==================== UTILIDADES ====================

  toggleContrasena(campo: 'actual' | 'nueva' | 'confirmar'): void {
    switch(campo) {
      case 'actual':
        this.mostrarContrasenaActual = !this.mostrarContrasenaActual;
        break;
      case 'nueva':
        this.mostrarNuevaContrasena = !this.mostrarNuevaContrasena;
        break;
      case 'confirmar':
        this.mostrarConfirmarContrasena = !this.mostrarConfirmarContrasena;
        break;
    }
  }

  campoInvalido(formulario: FormGroup, campo: string): boolean {
    const control = formulario.get(campo);
    return !!(control && control.invalid && control.touched);
  }

  formularioTieneError(formulario: FormGroup, error: string): boolean {
    return formulario.hasError(error);
  }

  obtenerErrorCampo(formulario: FormGroup, campo: string): string {
    const control = formulario.get(campo);
    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'Este campo es obligatorio';
    if (control.errors['minlength']) {
      const minLength = control.errors['minlength'].requiredLength;
      return `Debe tener al menos ${minLength} caracteres`;
    }
    if (control.errors['pattern']) {
      if (campo === 'telefono') return 'Por favor ingresa un teléfono válido de 10 dígitos';
      return 'Formato inválido';
    }
    if (control.errors['contrasenaDebil']) {
      return 'La contraseña debe contener al menos una mayúscula y un número';
    }
    if (control.errors['edadMinima']) {
      const edadRequerida = control.errors['edadMinima'].edadRequerida;
      return `Debes ser mayor de ${edadRequerida} años`;
    }

    return 'Campo inválido';
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

  obtenerIniciales(): string {
    if (!this.usuario) return 'U';
    return this.usuario.nombre.charAt(0).toUpperCase();
  }

  formatearFecha(fecha: Date): string {
    const f = new Date(fecha);
    return f.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  private marcarCamposComoTocados(formulario: FormGroup): void {
    Object.keys(formulario.controls).forEach(key => {
      formulario.get(key)?.markAsTouched();
    });
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
