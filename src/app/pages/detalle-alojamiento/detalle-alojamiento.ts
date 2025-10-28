import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil, finalize, forkJoin } from 'rxjs';
import Swal from 'sweetalert2';

// Servicios
import { AlojamientoService } from '../../services/alojamiento-service';
import { ReservaService } from '../../services/reserva-service';
import { TokenService } from '../../services/token-service';

// DTOs
import { AlojamientoDTO, MetricasDTO } from '../../models/alojamiento-dto';
import { ItemResenaDTO, CreacionResenaDTO } from '../../models/resena-dto';
import { CreacionReservaDTO } from '../../models/reserva-dto';

@Component({
  selector: 'app-detalle-alojamiento',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './detalle-alojamiento.html',
  styleUrl: './detalle-alojamiento.css'
})
export class DetalleAlojamiento implements OnInit, OnDestroy {
  // ==================== PROPIEDADES ====================

  alojamiento: AlojamientoDTO | undefined;
  metricas: MetricasDTO | undefined;
  resenas: ItemResenaDTO[] = [];

  cargando: boolean = false;
  cargandoResenas: boolean = false;
  errorCarga: boolean = false;

  reservaForm!: FormGroup;
  resenaForm!: FormGroup;

  // Paginación de reseñas
  paginaResenas: number = 0;
  hayMasResenas: boolean = true;
  idAlojamiento: number = 0;

  // Gestión de imágenes
  imagenPrincipal: string = '';
  imagenesGaleria: string[] = [];

  // Cálculo de reserva
  precioTotal: number = 0;
  tarifaServicio: number = 0;
  numeroNoches: number = 0;

  // Subject para cancelar subscripciones
  private destroy$ = new Subject<void>();

  // ==================== CONSTRUCTOR ====================

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private formBuilder: FormBuilder,
    public alojamientoService: AlojamientoService,
    private reservaService: ReservaService,
    private tokenService: TokenService
  ) {
    this.route.params.subscribe(params => {
      this.idAlojamiento = params['id'];
    })
  }

  // ==================== CICLO DE VIDA ====================

  ngOnInit(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.idAlojamiento = +params['id'];
        if (this.idAlojamiento && !isNaN(this.idAlojamiento)) {
          this.crearFormularios();
          this.cargarDatosAlojamiento();
        } else {
          this.mostrarError('ID de alojamiento no válido', () => {
            this.router.navigate(['/']);
          });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== FORMULARIOS ====================

  private crearFormularios(): void {
    const hoy = new Date();
    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);

    this.reservaForm = this.formBuilder.group({
      fechaEntrada: [hoy.toISOString().split('T')[0], [Validators.required]],
      fechaSalida: [manana.toISOString().split('T')[0], [Validators.required]],
      cantidadHuespedes: [1, [Validators.required, Validators.min(1)]]
    });

    this.resenaForm = this.formBuilder.group({
      calificacion: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
      comentario: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]]
    });

    // Configurar cálculo de precio
    this.reservaForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.calcularPrecioTotal();
      });
  }

  // ==================== CARGA DE DATOS ====================

  private cargarDatosAlojamiento(): void {
    this.cargando = true;
    this.errorCarga = false;

    forkJoin({
      alojamiento: this.alojamientoService.obtenerPorId(this.idAlojamiento),
      metricas: this.alojamientoService.obtenerMetricas(this.idAlojamiento),
      resenas: this.alojamientoService.obtenerResenasAlojamiento(this.idAlojamiento, 0)
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargando = false)
      )
      .subscribe({
        next: (respuesta) => {
          this.alojamiento = respuesta.alojamiento.data;
          this.metricas = respuesta.metricas.data;
          this.resenas = respuesta.resenas.data;
          this.hayMasResenas = respuesta.resenas.data.length > 0;

          // Validar capacidad máxima en el formulario
          this.reservaForm.get('cantidadHuespedes')?.setValidators([
            Validators.required,
            Validators.min(1),
            Validators.max(this.alojamiento!.maxHuespedes)
          ]);
          this.reservaForm.get('cantidadHuespedes')?.updateValueAndValidity();

          this.configurarImagenes();
          this.calcularPrecioTotal();
        },
        error: (error) => {
          this.errorCarga = true;
          const mensajeError = error?.error?.respuesta || 'No se pudo cargar el alojamiento. Intenta de nuevo.';
          this.mostrarError(mensajeError, () => {
            this.router.navigate(['/']);
          });
        }
      });
  }

  private configurarImagenes(): void {
    if (this.alojamiento && this.alojamiento.imagenes.length > 0) {
      this.imagenPrincipal = this.alojamiento.imagenes[0];
      this.imagenesGaleria = this.alojamiento.imagenes.slice(1, 5);
    }
  }

  // ==================== RESEÑAS ====================

  cargarMasResenas(): void {
    if (this.cargandoResenas || !this.hayMasResenas) return;

    this.cargandoResenas = true;
    this.paginaResenas++;

    this.alojamientoService.obtenerResenasAlojamiento(this.idAlojamiento, this.paginaResenas)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargandoResenas = false)
      )
      .subscribe({
        next: (respuesta) => {
          const nuevasResenas = respuesta.data as ItemResenaDTO[];
          if (nuevasResenas.length > 0) {
            this.resenas = [...this.resenas, ...nuevasResenas];
          } else {
            this.hayMasResenas = false;
          }
        },
        error: (error) => {
          this.hayMasResenas = false;
          this.mostrarError('Error al cargar más reseñas');
          this.paginaResenas--;
        }
      });
  }

  enviarResena(): void {
    if (this.resenaForm.invalid) {
      this.marcarCamposComoTocados(this.resenaForm);
      return;
    }

    if (!this.tokenService.isLogged()) {
      this.mostrarError('Debes iniciar sesión para dejar una reseña.', () => {
        this.router.navigate(['/login']);
      });
      return;
    }

    const dto: CreacionResenaDTO = {
      calificacion: this.resenaForm.value.calificacion,
      comentario: this.resenaForm.value.comentario
    };

    this.alojamientoService.crearResena(this.idAlojamiento, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (respuesta) => {
          Swal.fire({
            title: '¡Reseña enviada!',
            text: 'Tu reseña ha sido publicada.',
            icon: 'success',
            confirmButtonColor: '#2e8b57'
          });

          this.resenaForm.reset({ calificacion: 5, comentario: '' });
          this.recargarResenas();
        },
        error: (error) => {
          this.mostrarError('No se pudo enviar la reseña. Por favor, intenta de nuevo.');
        }
      });
  }

  private recargarResenas(): void {
    this.paginaResenas = 0;
    this.cargandoResenas = true;
    this.alojamientoService.obtenerResenasAlojamiento(this.idAlojamiento, 0)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargandoResenas = false)
      )
      .subscribe({
        next: (respuesta) => {
          this.resenas = respuesta.data;
          this.hayMasResenas = respuesta.data.length > 0;
        }
      });
  }

  // ==================== RESERVA ====================

  realizarReserva(): void {
    if (this.reservaForm.invalid) {
      this.marcarCamposComoTocados(this.reservaForm);
      return;
    }

    if (!this.tokenService.isLogged()) {
      this.mostrarError('Debes iniciar sesión para poder reservar.', () => {
        this.router.navigate(['/login']);
      });
      return;
    }

    const fechaEntrada = new Date(this.reservaForm.value.fechaEntrada);
    const fechaSalida = new Date(this.reservaForm.value.fechaSalida);

    if (fechaEntrada >= fechaSalida) {
      this.mostrarError('La fecha de salida debe ser posterior a la fecha de entrada.');
      return;
    }

    Swal.fire({
      title: '¿Confirmar reserva?',
      html: `
        <div style="text-align: left;">
          <p><strong>Alojamiento:</strong> ${this.alojamiento!.titulo}</p>
          <p><strong>Check-in:</strong> ${this.formatearFecha(fechaEntrada)}</p>
          <p><strong>Check-out:</strong> ${this.formatearFecha(fechaSalida)}</p>
          <p><strong>Huéspedes:</strong> ${this.reservaForm.value.cantidadHuespedes}</p>
          <hr>
          <p><strong>Total:</strong> ${this.formatearPrecio(this.precioTotal)}</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Confirmar y pagar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2e8b57',
      cancelButtonColor: '#95a5a6'
    }).then((result) => {
      if (result.isConfirmed) {
        this.procesarReserva();
      }
    });
  }

  private procesarReserva(): void {
    if (!this.alojamiento) return;

    const idUsuario = this.tokenService.getUserId();
    if (!idUsuario) {
      this.mostrarError('No se pudo identificar al usuario. Inicia sesión de nuevo.');
      return;
    }

    Swal.fire({
      title: 'Procesando...',
      text: 'Estamos procesando tu reserva',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const creacionReservaDTO: CreacionReservaDTO = {
      alojamientoId: this.idAlojamiento,
      usuarioId: this.tokenService.getUserId(),
      fechaEntrada: this.reservaForm.value.fechaEntrada,
      fechaSalida: this.reservaForm.value.fechaSalida,
      cantidadHuespedes: this.reservaForm.value.cantidadHuespedes
    };

    this.reservaService.crear(creacionReservaDTO)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (respuesta) => {
          Swal.close();
          Swal.fire({
            title: '¡Reserva exitosa!',
            text: 'Tu reserva ha sido confirmada.',
            icon: 'success',
            confirmButtonColor: '#2e8b57'
          }).then(() => {
              this.router.navigate(['/mis-reservas']);
          });
        },
        error: (error) => {
          Swal.close();
          const mensajeError = error?.data || 'No se pudo procesar tu reserva. Intenta de nuevo.';
          this.mostrarError(mensajeError);
        }
      });
  }

  private calcularPrecioTotal(): void {
    if (!this.alojamiento) return;

    const fechaEntrada = new Date(this.reservaForm.value.fechaEntrada);
    const fechaSalida = new Date(this.reservaForm.value.fechaSalida);

    if (fechaEntrada < fechaSalida) {
      this.numeroNoches = Math.ceil((fechaSalida.getTime() - fechaEntrada.getTime()) / (1000 * 60 * 60 * 24));
      const subtotal = this.alojamiento.precioPorNoche * this.numeroNoches;
      this.tarifaServicio = Math.round(subtotal * 0.1);
      this.precioTotal = subtotal + this.tarifaServicio;
    } else {
      this.numeroNoches = 0;
      this.tarifaServicio = 0;
      this.precioTotal = 0;
    }
  }

  // ==================== NAVEGACIÓN ====================

  volver(): void {
    this.location.back();
  }

  // ==================== UTILIDADES ====================

  cambiarImagenPrincipal(imagen: string): void {
    const imagenAnterior = this.imagenPrincipal;
    this.imagenPrincipal = imagen;

    const index = this.imagenesGaleria.indexOf(imagen);
    if (index !== -1) {
      this.imagenesGaleria[index] = imagenAnterior;
    }
  }

  formatearPrecio(precio: number): string {
    return this.alojamientoService.formatearPrecio(precio);
  }

  formatearFecha(fecha: Date): string {
    const fechaAjustada = new Date(fecha.getTime() + fecha.getTimezoneOffset() * 60000);
    return fechaAjustada.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatearFechaCorta(fecha: string | Date): string {
    const f = typeof fecha === 'string' ? new Date(fecha) : fecha;
    const fechaAjustada = new Date(f.getTime() + f.getTimezoneOffset() * 60000);
    return fechaAjustada.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short'
    });
  }

  obtenerFechaMinima(): string {
    return new Date().toISOString().split('T')[0];
  }

  obtenerFechaMinimaSalida(): string {
    const fechaEntrada = new Date(this.reservaForm.value.fechaEntrada);
    fechaEntrada.setMinutes(fechaEntrada.getMinutes() + fechaEntrada.getTimezoneOffset());
    fechaEntrada.setDate(fechaEntrada.getDate() + 1);
    return fechaEntrada.toISOString().split('T')[0];
  }

  campoInvalido(formulario: FormGroup, campo: string): boolean {
    const control = formulario.get(campo);
    return !!(control && control.invalid && control.touched);
  }

  obtenerErrorCampo(formulario: FormGroup, campo: string): string {
    const control = formulario.get(campo);
    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'Este campo es obligatorio';
    if (control.errors['min']) return `El valor mínimo es ${control.errors['min'].min}`;
    if (control.errors['max']) {
      if (campo === 'cantidadHuespedes') {
        return `Máximo ${control.errors['max'].max} huéspedes`;
      }
      return `El valor máximo es ${control.errors['max'].max}`;
    }
    if (control.errors['minlength']) {
      return `Debe tener al menos ${control.errors['minlength'].requiredLength} caracteres`;
    }
    if (control.errors['maxlength']) {
      return `No puede exceder ${control.errors['maxlength'].requiredLength} caracteres`;
    }

    return 'Campo inválido';
  }

  private marcarCamposComoTocados(formulario: FormGroup): void {
    Object.keys(formulario.controls).forEach(key => {
      formulario.get(key)?.markAsTouched();
    });
  }

  private mostrarError(mensaje: string, callback?: () => void): void {
    Swal.fire({
      title: 'Error',
      text: mensaje,
      icon: 'error',
      confirmButtonColor: '#2e8b57'
    }).then(() => {
      if (callback) {
        callback();
      }
    });
  }
}
