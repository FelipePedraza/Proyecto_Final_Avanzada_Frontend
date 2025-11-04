import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil, finalize } from 'rxjs';
import Swal from 'sweetalert2';

// COMPONENTES Y SERVICIOS
import { PanelUsuario } from '../../components/panel-usuario/panel-usuario';
import { AlojamientoService } from '../../services/alojamiento-service';
import { ReservaService } from '../../services/reserva-service';
import { TokenService } from '../../services/token-service';
import { UsuarioService } from '../../services/usuario-service';
import { ItemReservaDTO, ReservaEstado } from '../../models/reserva-dto';

@Component({
  selector: 'app-mis-reservas',
  imports: [CommonModule, PanelUsuario, RouterLink],
  templateUrl: './mis-reservas.html',
  styleUrl: './mis-reservas.css'
})
export class MisReservas implements OnInit, OnDestroy {

  // ==================== PROPIEDADES ====================
  tabActiva: 'activas' | 'pasadas' | 'canceladas' = 'activas';

  reservasActivas: ItemReservaDTO[] = [];
  reservasPasadas: ItemReservaDTO[] = [];
  reservasCanceladas: ItemReservaDTO[] = [];

  cargando: boolean = false;
  private destroy$ = new Subject<void>();

  // ==================== CONSTRUCTOR ====================
  constructor(
    private usuarioService: UsuarioService,
    private reservaService: ReservaService,
    private tokenService: TokenService,
    public alojamientoService: AlojamientoService
  ) {}

  // ==================== CICLO DE VIDA ====================
  ngOnInit(): void {
    this.cargarReservas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== CARGA DE DATOS ====================

  private cargarReservas(): void {
    const usuarioId = this.tokenService.getUserId();
    if (!usuarioId) {
      this.mostrarError('No se pudo identificar al usuario');
      return;
    }

    this.cargando = true;

    this.usuarioService.obtenerReservasUsuario(usuarioId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargando = false)
      )
      .subscribe({
        next: (respuesta) => {
          if (!respuesta.error && respuesta.data) {
            const reservas = respuesta.data as ItemReservaDTO[];
            this.clasificarReservas(reservas);
          }
        },
        error: (error) => {
          this.mostrarError('Error al cargar las reservas');
          console.error(error);
        }
      });
  }

  private clasificarReservas(reservas: ItemReservaDTO[]): void {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Activas: PENDIENTE o CONFIRMADA con fecha futura
    this.reservasActivas = reservas.filter(r =>
      (r.estado === ReservaEstado.PENDIENTE || r.estado === ReservaEstado.CONFIRMADA) &&
      new Date(r.fechaSalida) >= hoy
    ).sort((a, b) => new Date(a.fechaEntrada).getTime() - new Date(b.fechaEntrada).getTime());

    // Pasadas: COMPLETADA o CONFIRMADA con fecha pasada
    this.reservasPasadas = reservas.filter(r =>
      r.estado === ReservaEstado.COMPLETADA ||
      (r.estado === ReservaEstado.CONFIRMADA && new Date(r.fechaSalida) < hoy)
    ).sort((a, b) => new Date(b.fechaEntrada).getTime() - new Date(a.fechaEntrada).getTime());

    // Canceladas
    this.reservasCanceladas = reservas.filter(r =>
      r.estado === ReservaEstado.CANCELADA
    ).sort((a, b) => new Date(b.fechaEntrada).getTime() - new Date(a.fechaEntrada).getTime());
  }

  // ==================== ACCIONES ====================

  cancelarReserva(idReserva: number, tituloAlojamiento: string): void {
    Swal.fire({
      title: '¿Cancelar reserva?',
      text: `¿Estás seguro de cancelar tu reserva en "${tituloAlojamiento}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No, mantener',
      confirmButtonColor: '#e74c3c',
      cancelButtonColor: '#95a5a6'
    }).then((result) => {
      if (result.isConfirmed) {
        this.procesarCancelacion(idReserva);
      }
    });
  }

  private procesarCancelacion(idReserva: number): void {
    Swal.fire({
      title: 'Procesando...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.reservaService.cancelar(idReserva)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          Swal.fire({
            title: 'Reserva cancelada',
            text: 'Tu reserva ha sido cancelada exitosamente',
            icon: 'success',
            confirmButtonColor: '#2e8b57'
          });
          this.cargarReservas(); // Recargar las reservas
        },
        error: (error) => {
          Swal.close();
          this.mostrarError(error?.error?.data || 'Error al cancelar la reserva');
        }
      });
  }

  dejarResena(idAlojamiento: number, tituloAlojamiento: string): void {
    Swal.fire({
      title: 'Deja tu reseña',
      html: `
        <div style="text-align: left;">
          <p style="color: var(--text-color); margin-bottom: 1rem;">
            <strong>${tituloAlojamiento}</strong>
          </p>

          <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--dark-green);">
            Calificación *
          </label>
          <div id="rating-stars" style="display: flex; gap: 8px; margin-bottom: 1rem; justify-content: center;">
            <i class="fa-solid fa-star" data-rating="1" style="font-size: 2rem; color: #ddd; cursor: pointer;"></i>
            <i class="fa-solid fa-star" data-rating="2" style="font-size: 2rem; color: #ddd; cursor: pointer;"></i>
            <i class="fa-solid fa-star" data-rating="3" style="font-size: 2rem; color: #ddd; cursor: pointer;"></i>
            <i class="fa-solid fa-star" data-rating="4" style="font-size: 2rem; color: #ddd; cursor: pointer;"></i>
            <i class="fa-solid fa-star" data-rating="5" style="font-size: 2rem; color: #ddd; cursor: pointer;"></i>
          </div>

          <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--dark-green);">
            Comentario *
          </label>
          <textarea
            id="review-comment"
            placeholder="Cuéntanos sobre tu experiencia..."
            style="width: 100%; min-height: 120px; padding: 12px; border: 2px solid var(--border-color); border-radius: 12px; font-family: var(--font-family); resize: vertical;"
            maxlength="500"></textarea>
          <p style="text-align: right; font-size: 0.85rem; color: #7F8C8D; margin-top: 0.5rem;">
            <span id="char-count">0</span>/500
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Publicar Reseña',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2e8b57',
      cancelButtonColor: '#95a5a6',
      width: '600px',
      didOpen: () => {
        let selectedRating = 0;

        // Manejar selección de estrellas
        const stars = document.querySelectorAll('#rating-stars i');
        stars.forEach(star => {
          star.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            selectedRating = parseInt(target.getAttribute('data-rating') || '0');

            // Actualizar estrellas visualmente
            stars.forEach((s, index) => {
              if (index < selectedRating) {
                (s as HTMLElement).style.color = '#F39C12';
              } else {
                (s as HTMLElement).style.color = '#ddd';
              }
            });
          });

          // Hover effect
          star.addEventListener('mouseenter', (e) => {
            const target = e.target as HTMLElement;
            const rating = parseInt(target.getAttribute('data-rating') || '0');
            stars.forEach((s, index) => {
              if (index < rating) {
                (s as HTMLElement).style.color = '#F39C12';
              } else {
                (s as HTMLElement).style.color = '#ddd';
              }
            });
          });
        });

        // Restaurar selección al salir del hover
        document.getElementById('rating-stars')?.addEventListener('mouseleave', () => {
          stars.forEach((s, index) => {
            if (index < selectedRating) {
              (s as HTMLElement).style.color = '#F39C12';
            } else {
              (s as HTMLElement).style.color = '#ddd';
            }
          });
        });

        // Contador de caracteres
        const textarea = document.getElementById('review-comment') as HTMLTextAreaElement;
        const charCount = document.getElementById('char-count');

        textarea?.addEventListener('input', () => {
          if (charCount) {
            charCount.textContent = textarea.value.length.toString();
          }
        });

        // Guardar rating en el input oculto
        (Swal.getPopup() as any).selectedRating = () => selectedRating;
      },
      preConfirm: () => {
        const comment = (document.getElementById('review-comment') as HTMLTextAreaElement).value;
        const rating = (Swal.getPopup() as any).selectedRating();

        if (!rating || rating === 0) {
          Swal.showValidationMessage('Por favor selecciona una calificación');
          return false;
        }

        if (!comment || comment.trim().length < 10) {
          Swal.showValidationMessage('El comentario debe tener al menos 10 caracteres');
          return false;
        }

        if (comment.length > 500) {
          Swal.showValidationMessage('El comentario no puede exceder 500 caracteres');
          return false;
        }

        return { rating, comment: comment.trim() };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.procesarResena(idAlojamiento, result.value.rating, result.value.comment);
      }
    });
  }

  private procesarResena(idAlojamiento: number, calificacion: number, comentario: string): void {
    Swal.fire({
      title: 'Publicando reseña...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const resenaDTO = {
      calificacion,
      comentario
    };

    this.alojamientoService.crearResena(idAlojamiento, resenaDTO)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          Swal.fire({
            title: '¡Reseña publicada!',
            text: 'Tu reseña ha sido publicada exitosamente',
            icon: 'success',
            confirmButtonColor: '#2e8b57',
            timer: 2000,
            timerProgressBar: true
          });
        },
        error: (error) => {
          Swal.close();
          this.mostrarError(error?.error?.data || 'Error al publicar la reseña');
        }
      });
  }

  // ==================== NAVEGACIÓN ====================

  cambiarTab(tab: 'activas' | 'pasadas' | 'canceladas'): void {
    this.tabActiva = tab;
  }

  // ==================== UTILIDADES ====================

  formatearFecha(fecha: Date | string): string {
    const f = typeof fecha === 'string' ? new Date(fecha) : fecha;
    const fechaAjustada = new Date(f.getTime() + f.getTimezoneOffset() * 60000);
    return fechaAjustada.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  calcularNoches(fechaEntrada: Date | string, fechaSalida: Date | string): number {
    const entrada = typeof fechaEntrada === 'string' ? new Date(fechaEntrada) : fechaEntrada;
    const salida = typeof fechaSalida === 'string' ? new Date(fechaSalida) : fechaSalida;
    const diferencia = salida.getTime() - entrada.getTime();
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
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
