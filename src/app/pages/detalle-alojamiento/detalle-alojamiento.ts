import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router} from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil, finalize, forkJoin } from 'rxjs';
import Swal from 'sweetalert2';

import { AlojamientoService } from '../../services/alojamiento-service';
import { AlojamientoDTO, MetricasDTO } from '../../models/alojamiento-dto';
import { ItemResenaDTO, CreacionResenaDTO } from '../../models/resena-dto';

@Component({
  selector: 'app-detalle-alojamiento',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './detalle-alojamiento.html',
  styleUrl: './detalle-alojamiento.css'
})
export class DetalleAlojamiento implements OnInit, OnDestroy {
  // ==================== PROPIEDADES ====================

  alojamiento: AlojamientoDTO | null = null;
  metricas: MetricasDTO | null = null;
  resenas: ItemResenaDTO[] = [];

  cargando: boolean = false;
  cargandoResenas: boolean = false;
  errorCarga: boolean = false;

  reservaForm!: FormGroup;
  resenaForm!: FormGroup;

  // Paginación de reseñas
  paginaResenas: number = 0;
  hayMasResenas: boolean = true;

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
    private formBuilder: FormBuilder,
    private alojamientoService: AlojamientoService
  ) {
    this.crearFormularios();
  }

  // ==================== LIFECYCLE HOOKS ====================

  ngOnInit(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const id = Number(params['id']);
        if (id) {
          this.cargarDatosAlojamiento(id);
        } else {
          this.router.navigate(['/']);
        }
      });

    // Escuchar cambios en fechas para recalcular precio
    this.configurarCalculoPrecio();
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
  }

  private configurarCalculoPrecio(): void {
    this.reservaForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.calcularPrecioTotal();
      });
  }

  // ==================== CARGA DE DATOS ====================

  private cargarDatosAlojamiento(id: number): void {
    this.cargando = true;
    this.errorCarga = false;

    // Cargar alojamiento, métricas y reseñas en paralelo
    forkJoin({
      alojamiento: this.alojamientoService.obtenerPorId(id),
      metricas: this.alojamientoService.obtenerMetricas(id),
      resenas: this.alojamientoService.obtenerResenasAlojamiento(id, 0)
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargando = false)
      )
      .subscribe({
        next: (response) => {
          if (!response.alojamiento.error) {
            this.alojamiento = response.alojamiento.respuesta;
            this.configurarImagenes();
            this.calcularPrecioTotal();
          }

          if (!response.metricas.error) {
            this.metricas = response.metricas.respuesta;
          }

          if (!response.resenas.error) {
            this.resenas = response.resenas.respuesta;
            this.hayMasResenas = response.resenas.respuesta.length > 0;
          }
        },
        error: (error) => {
          console.error('Error al cargar alojamiento:', error);
          this.errorCarga = true;
          this.mostrarError('No se pudo cargar el alojamiento. Por favor, intenta de nuevo.');
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
    if (!this.alojamiento || this.cargandoResenas || !this.hayMasResenas) return;

    this.cargandoResenas = true;
    this.paginaResenas++;

    this.alojamientoService.obtenerResenasAlojamiento(this.alojamiento.id, this.paginaResenas)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargandoResenas = false)
      )
      .subscribe({
        next: (response) => {
          if (!response.error && response.respuesta.length > 0) {
            this.resenas = [...this.resenas, ...response.respuesta];
            this.hayMasResenas = response.respuesta.length > 0;
          } else {
            this.hayMasResenas = false;
          }
        },
        error: (error) => {
          console.error('Error al cargar más reseñas:', error);
          this.paginaResenas--;
        }
      });
  }

  enviarResena(): void {
    if (this.resenaForm.invalid || !this.alojamiento) {
      this.marcarCamposComoTocados(this.resenaForm);
      return;
    }

    const dto: CreacionResenaDTO = {
      calificacion: this.resenaForm.value.calificacion,
      comentario: this.resenaForm.value.comentario
    };

    this.alojamientoService.crearResena(this.alojamiento.id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (!response.error) {
            Swal.fire({
              title: '¡Reseña enviada!',
              text: 'Tu reseña ha sido publicada correctamente.',
              icon: 'success',
              confirmButtonColor: '#2e8b57'
            });

            this.resenaForm.reset({ calificacion: 5, comentario: '' });
            this.recargarResenas();
          }
        },
        error: (error) => {
          console.error('Error al enviar reseña:', error);
          this.mostrarError('No se pudo enviar la reseña. Por favor, intenta de nuevo.');
        }
      });
  }

  private recargarResenas(): void {
    if (!this.alojamiento) return;

    this.paginaResenas = 0;
    this.alojamientoService.obtenerResenasAlojamiento(this.alojamiento.id, 0)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (!response.error) {
            this.resenas = response.respuesta;
          }
        }
      });
  }

  // ==================== RESERVA ====================

  realizarReserva(): void {
    if (this.reservaForm.invalid || !this.alojamiento) {
      this.marcarCamposComoTocados(this.reservaForm);
      return;
    }

    // Validar fechas
    const fechaEntrada = new Date(this.reservaForm.value.fechaEntrada);
    const fechaSalida = new Date(this.reservaForm.value.fechaSalida);

    if (fechaEntrada >= fechaSalida) {
      Swal.fire({
        title: 'Fechas inválidas',
        text: 'La fecha de salida debe ser posterior a la fecha de entrada.',
        icon: 'warning',
        confirmButtonColor: '#2e8b57'
      });
      return;
    }

    // Validar capacidad
    if (this.reservaForm.value.cantidadHuespedes > this.alojamiento.maxHuespedes) {
      Swal.fire({
        title: 'Capacidad excedida',
        text: `Este alojamiento admite máximo ${this.alojamiento.maxHuespedes} huéspedes.`,
        icon: 'warning',
        confirmButtonColor: '#2e8b57'
      });
      return;
    }

    // Mostrar confirmación con resumen
    Swal.fire({
      title: '¿Confirmar reserva?',
      html: `
        <div style="text-align: left;">
          <p><strong>Alojamiento:</strong> ${this.alojamiento.titulo}</p>
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
    // TODO: Implementar con el servicio de reservas cuando esté listo
    Swal.fire({
      title: 'Procesando...',
      text: 'Estamos procesando tu reserva',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Simulación - reemplazar con llamada real al backend
    setTimeout(() => {
      Swal.fire({
        title: '¡Reserva exitosa!',
        text: 'Tu reserva ha sido confirmada. Recibirás un correo con los detalles.',
        icon: 'success',
        confirmButtonColor: '#2e8b57'
      }).then(() => {
        this.router.navigate(['/mis-reservas']);
      });
    }, 2000);
  }

  private calcularPrecioTotal(): void {
    if (!this.alojamiento) return;

    const fechaEntrada = new Date(this.reservaForm.value.fechaEntrada);
    const fechaSalida = new Date(this.reservaForm.value.fechaSalida);

    if (fechaEntrada < fechaSalida) {
      this.numeroNoches = Math.ceil((fechaSalida.getTime() - fechaEntrada.getTime()) / (1000 * 60 * 60 * 24));
      const subtotal = this.alojamiento.precioPorNoche * this.numeroNoches;
      this.tarifaServicio = Math.round(subtotal * 0.1); // 10% de tarifa de servicio
      this.precioTotal = subtotal + this.tarifaServicio;
    }
  }

  // ==================== UTILIDADES ====================

  cambiarImagenPrincipal(imagen: string): void {
    const imagenAnterior = this.imagenPrincipal;
    this.imagenPrincipal = imagen;

    // Actualizar la galería
    const index = this.imagenesGaleria.indexOf(imagen);
    if (index !== -1) {
      this.imagenesGaleria[index] = imagenAnterior;
    }
  }

  generarEstrellas(calificacion: number): number[] {
    return Array(Math.floor(calificacion)).fill(0);
  }

  formatearPrecio(precio: number): string {
    return precio.toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    });
  }

  formatearFecha(fecha: Date): string {
    return fecha.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatearFechaCorta(fecha: string | Date): string {
    const f = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return f.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short'
    });
  }

  obtenerFechaMinima(): string {
    return new Date().toISOString().split('T')[0];
  }

  obtenerFechaMinimaSalida(): string {
    const fechaEntrada = new Date(this.reservaForm.value.fechaEntrada);
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
    if (control.errors['max']) return `El valor máximo es ${control.errors['max'].max}`;
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

  private mostrarError(mensaje: string): void {
    Swal.fire({
      title: 'Error',
      text: mensaje,
      icon: 'error',
      confirmButtonColor: '#2e8b57'
    });
  }

  volver(): void {
    this.router.navigate(['/busqueda']);
  }
}
