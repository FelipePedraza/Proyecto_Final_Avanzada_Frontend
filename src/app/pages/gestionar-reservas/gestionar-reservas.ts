import { Component, OnInit, OnDestroy  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, forkJoin, of, catchError } from 'rxjs';
import Swal from 'sweetalert2';

// IMPORTACIONES DE ANGULAR-CALENDAR
import { CalendarModule, CalendarEvent } from 'angular-calendar';
import { addMonths, subMonths, startOfDay, endOfDay } from 'date-fns';

// COMPONENTES Y SERVICIOS
import { PanelUsuario } from '../../components/panel-usuario/panel-usuario';
import { AlojamientoService } from '../../services/alojamiento-service';
import { ReservaService } from '../../services/reserva-service';
import { TokenService } from '../../services/token-service';
import { UsuarioService } from '../../services/usuario-service';
import { ReservaDTO, ReservaEstado } from '../../models/reserva-dto';
import { AlojamientoDTO } from '../../models/alojamiento-dto';
import { RespuestaDTO } from '../../models/respuesta-dto';

// (No es necesario registrar 'localeEs' aquí si ya está en app.config.ts)

// Define los colores para los eventos del calendario
const CALENDAR_COLORS = {
  confirmada: {
    primary: '#2e8b57', // Verde
    secondary: '#d9f0e3',
  },
  pendiente: {
    primary: '#f39c12', // Naranja
    secondary: '#fdf3e1',
  },
  completada: {
    primary: '#888880', // Gris
    secondary: '#d5c9b3',
  },
};

@Component({
  selector: 'app-gestionar-reservas',
  imports: [
    CommonModule,
    PanelUsuario,
    CalendarModule
  ],
  templateUrl: './gestionar-reservas.html',
  styleUrl: './gestionar-reservas.css'
})
export class GestionarReservas implements OnInit, OnDestroy {

  // ==================== PROPIEDADES ====================
  tabActiva: 'pendientes' | 'confirmadas' | 'historial' = 'pendientes';
  reservasPendientes: ReservaDTO[] = [];
  reservasConfirmadas: ReservaDTO[] = [];
  reservasHistorial: ReservaDTO[] = [];
  viewDate: Date = new Date();
  events: CalendarEvent[] = [];
  locale: string = 'es';

  private todasLasReservas: ReservaDTO[] = [];
  cargando: boolean = false;
  private destroy$ = new Subject<void>();

  // ==================== CONSTRUCTOR ====================
  constructor(
    private alojamientoService: AlojamientoService,
    private reservaService: ReservaService,
    private tokenService: TokenService,
    private usuarioService: UsuarioService
  ) {}

  // ==================== CICLO DE VIDA ====================
  ngOnInit(): void {
    this.cargarDatos(); // Llamamos a la función de carga simple
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== LÓGICA DE CARGA (SIMPLE Y CORRECTA) ====================

  private cargarDatos(): void {
    const usuarioId = this.tokenService.getUserId();
    if (!usuarioId) {
      this.mostrarError('No se pudo identificar al usuario');
      return;
    }

    this.cargando = true; // <-- Inicia la carga

    // 1. Obtener alojamientos del usuario
    this.usuarioService.obtenerAlojamientosUsuario(usuarioId, 0)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (respuestaAlojamientos: RespuestaDTO) => {
          if (respuestaAlojamientos.error || !respuestaAlojamientos.data || respuestaAlojamientos.data.length === 0) {
            // No hay alojamientos
            this.cargando = false; // <-- Termina la carga
            return;
          }

          const alojamientos: AlojamientoDTO[] = respuestaAlojamientos.data;

          // 2. Preparar todas las llamadas para las reservas
          const observablesDeReservas = alojamientos.map(alojamiento =>
            this.alojamientoService.obtenerReservasAlojamiento(alojamiento.id)
              .pipe(
                catchError(err => {
                  console.error(`Error cargando reservas para ${alojamiento.id}:`, err);
                  return of({ error: true, data: null }); // Si una falla, no daña todo
                })
              )
          );

          // 3. Ejecutar todas las llamadas en paralelo
          forkJoin(observablesDeReservas)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (respuestasReservas) => {

                // 4. Juntar todas las reservas en una sola lista
                const todasLasReservas: ReservaDTO[] = [];
                respuestasReservas.forEach(respuesta => {
                  if (respuesta && !respuesta.error && respuesta.data) {
                    todasLasReservas.push(...(respuesta.data as ReservaDTO[]));
                  }
                });

                // 5. Actualizar el componente
                this.todasLasReservas = todasLasReservas;
                this.clasificarReservas(this.todasLasReservas);
                this.actualizarEventosCalendario();

                this.cargando = false; // <-- FIN DE LA CARGA
              },
              error: (err) => {
                this.mostrarError('Error al cargar las reservas.');
                this.cargando = false; // <-- FIN DE LA CARGA (con error)
              }
            });
        },
        error: (err) => {
          this.mostrarError('Error al cargar los alojamientos del usuario');
          this.cargando = false; // <-- FIN DE LA CARGA (con error)
        }
      });
  }

  // ==================== TRANSFORMACIÓN Y CLASIFICACIÓN ====================

  private actualizarEventosCalendario(): void {
    const reservas = this.todasLasReservas.filter(r =>
      r.estado === ReservaEstado.PENDIENTE || r.estado === ReservaEstado.CONFIRMADA || r.estado === ReservaEstado.COMPLETADA
    );

    this.events = reservas.map((reserva: ReservaDTO): CalendarEvent => {
      let color = CALENDAR_COLORS.confirmada;
      let cssClass = 'cal-event-confirmed';

      if (reserva.estado === ReservaEstado.PENDIENTE) {
        color = CALENDAR_COLORS.pendiente;
        cssClass = 'cal-event-pending';
      }
      else if (reserva.estado === ReservaEstado.COMPLETADA) {
        color = CALENDAR_COLORS.completada;
        cssClass = 'cal-event-completed';
      }

      return {
        title: reserva.alojamiento.titulo,
        start: startOfDay(this.toLocalDate(reserva.fechaEntrada)),
        end: endOfDay(this.toLocalDate(reserva.fechaSalida)),
        color: { ...color },
        cssClass: cssClass,
        meta: { id: reserva.id }
      };
    });
  }

  private toLocalDate(fecha: string | Date): Date {
    const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
    // Ajusta la hora eliminando el desplazamiento del huso horario
    const local = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    return local;
  }


  private clasificarReservas(reservas: ReservaDTO[]): void {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    this.reservasPendientes = reservas.filter(r =>
      r.estado === ReservaEstado.PENDIENTE
    ).sort((a, b) => new Date(a.fechaEntrada).getTime() - new Date(b.fechaEntrada).getTime());

    this.reservasConfirmadas = reservas.filter(r =>
      r.estado === ReservaEstado.CONFIRMADA &&
      new Date(r.fechaSalida) >= hoy
    ).sort((a, b) => new Date(a.fechaEntrada).getTime() - new Date(b.fechaEntrada).getTime());

    this.reservasHistorial = reservas.filter(r =>
      r.estado === ReservaEstado.COMPLETADA ||
      r.estado === ReservaEstado.CANCELADA ||
      (r.estado === ReservaEstado.CONFIRMADA && new Date(r.fechaSalida) < hoy)
    ).sort((a, b) => new Date(b.fechaEntrada).getTime() - new Date(a.fechaEntrada).getTime());
  }

  // ==================== ACCIONES DE RESERVA ====================
  // (Sin cambios, solo nos aseguramos de llamar a this.cargarDatos())

  aprobarReserva(idReserva: number, tituloAlojamiento: string): void {
    Swal.fire({
      title: '¿Aprobar reserva?',
      text: `Confirmarás la reserva para "${tituloAlojamiento}"`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2e8b57',
      cancelButtonColor: '#95a5a6'
    }).then((result) => {
      if (result.isConfirmed) {
        this.procesarAprobacion(idReserva);
      }
    });
  }

  private procesarAprobacion(idReserva: number): void {
    Swal.fire({ title: 'Procesando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    this.reservaService.aceptar(idReserva)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          Swal.fire({
            title:'¡Reserva aprobada!',
            text:'',
            icon:'success',
            confirmButtonColor: '#2e8b57'});
          this.cargarDatos(); // <-- Recargamos todo
        },
        error: (error) => {
          Swal.close();
          this.mostrarError(error?.error?.data || 'Error al aprobar la reserva');
        }
      });
  }

  rechazarReserva(idReserva: number, tituloAlojamiento: string): void {
    Swal.fire({
      title: '¿Rechazar reserva?',
      text: `Esta acción no se puede deshacer para "${tituloAlojamiento}"`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e74c3c',
      cancelButtonColor: '#95a5a6'
    }).then((result) => {
      if (result.isConfirmed) {
        this.procesarRechazo(idReserva);
      }
    });
  }

  private procesarRechazo(idReserva: number): void {
    Swal.fire({ title: 'Procesando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    this.reservaService.rechazar(idReserva)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          Swal.fire({
            title:'Reserva rechazada',
            text:'',
            icon:'info',
            confirmButtonColor: '#2e8b57'});
          this.cargarDatos(); // <-- Recargamos todo
        },
        error: (error) => {
          Swal.close();
          this.mostrarError(error?.error?.data || 'Error al rechazar la reserva');
        }
      });
  }

  // ==================== CONTROLES CALENDARIO ====================

  mesAnterior(): void {
    this.viewDate = subMonths(this.viewDate, 1);
  }

  mesSiguiente(): void {
    this.viewDate = addMonths(this.viewDate, 1);
  }

  hoy(): void {
    this.viewDate = new Date();
  }

  // ==================== NAVEGACIÓN DE PESTAÑAS ====================

  cambiarTab(tab: 'pendientes' | 'confirmadas' | 'historial'): void {
    this.tabActiva = tab;
  }

  // ==================== UTILIDADES ====================

  formatearFechaCorta(fecha: Date | string): string {
    const f = typeof fecha === 'string' ? new Date(fecha) : fecha;
    const fechaAjustada = new Date(f.getTime() + f.getTimezoneOffset() * 60000);
    return fechaAjustada.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  }

  private mostrarError(mensaje: string): void {
    Swal.fire({ title: 'Error', text: mensaje, icon: 'error', confirmButtonColor: '#2e8b57' });
  }
}
