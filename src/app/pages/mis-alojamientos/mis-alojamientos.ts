import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil, finalize } from 'rxjs';
import { PanelUsuario } from '../../components/panel-usuario/panel-usuario';
import { AlojamientoService } from '../../services/alojamiento-service';
import { ItemAlojamientoDTO, MetricasDTO } from '../../models/alojamiento-dto';
import Swal from 'sweetalert2';
import { UsuarioService } from '../../services/usuario-service';
import { AuthService } from '../../services/auth-service';

@Component({
  selector: 'app-mis-alojamientos',
  imports: [PanelUsuario, CommonModule, FormsModule, RouterLink],
  templateUrl: './mis-alojamientos.html',
  styleUrl: './mis-alojamientos.css'
})
export class MisAlojamientos implements OnDestroy {

  // ==================== PROPIEDADES ====================
  alojamientos: ItemAlojamientoDTO[] = [];
  alojamientosFiltrados: ItemAlojamientoDTO[] = [];
  terminoBusqueda: string = '';
  cargando: boolean = false;
  metricasPorAlojamiento: Map<number, MetricasDTO> = new Map();
  paginaActual: number = 0;
  private destroy$ = new Subject<void>();

  // ==================== CONSTRUCTOR ====================

  constructor(
    private alojamientoService: AlojamientoService,
    private usuarioService: UsuarioService,
    private authService: AuthService
  ) {
    this.cargarAlojamientos();
  }


  // ==================== MÉTODOS DE CARGA ====================

  /**
   * Carga los alojamientos del usuario autenticado
   */
  cargarAlojamientos(): void {
    this.cargando = true;

    // --- LÓGICA CORREGIDA ---
    // 1. Obtenemos los datos del token
    const datosToken = this.authService.obtenerDatosToken();

    // 2. Validamos que existan y que tengan el campo 'sub' (ID del usuario)
    if (!datosToken || !datosToken.sub) {
      this.mostrarError('No se pudo identificar al usuario. Por favor, inicia sesión de nuevo.');
      this.cargando = false;
      return;
    }

    // 3. Extraemos el ID del usuario
    const idUsuario = datosToken.sub;

    // 4. Usamos el servicio de USUARIO para obtener SUS alojamientos
    this.usuarioService.obtenerAlojamientosUsuario(idUsuario, this.paginaActual)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargando = false)
      )
      .subscribe({
        next: (response) => {
          if (!response.error) {
            this.alojamientos = response.respuesta;
            this.alojamientosFiltrados = [...this.alojamientos];
            this.cargarMetricasDeAlojamientos();
          } else {
            this.mostrarError('Error al cargar alojamientos');
          }
        },
        error: (error) => {
          console.error('Error al cargar alojamientos:', error);
          this.mostrarError('No se pudieron cargar los alojamientos. Por favor, intenta de nuevo.');
        }
      });
  }

  /**
   * Carga las métricas de todos los alojamientos
   */
  private cargarMetricasDeAlojamientos(): void {
    // (Este método no cambia)
    this.alojamientos.forEach(alojamiento => {
      this.cargarMetricas(alojamiento.id);
    });
  }

  /**
   * Carga las métricas de un alojamiento específico
   */
  private cargarMetricas(id: number): void {
    // (Este método no cambia)
    this.alojamientoService.obtenerMetricas(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (!response.error) {
            this.metricasPorAlojamiento.set(id, response.respuesta);
          }
        },
        error: (error) => {
          console.error(`Error al cargar métricas del alojamiento ${id}:`, error);
        }
      });
  }

  // ==================== BÚSQUEDA Y FILTROS ====================

  buscarAlojamientos(): void {
    this.alojamientosFiltrados = this.alojamientoService.buscarAlojamientosLocal(
      this.alojamientos,
      this.terminoBusqueda
    );
  }

  limpiarBusqueda(): void {
    this.terminoBusqueda = '';
    this.alojamientosFiltrados = [...this.alojamientos];
  }

  // ==================== OBTENCIÓN DE DATOS ====================

  obtenerMetricas(id: number): MetricasDTO | undefined {
    return this.metricasPorAlojamiento.get(id);
  }

  // ==================== FORMATEO Y UTILIDADES ====================

  formatearPrecio(precio: number): string {
    return this.alojamientoService.formatearPrecio(precio);
  }

  generarEstrellas(calificacion: number): number[] {
    return this.alojamientoService.generarEstrellas(calificacion);
  }

  // ==================== ELIMINACIÓN ====================

  confirmarEliminar(id: number, titulo: string): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `El alojamiento "${titulo}" será eliminado permanentemente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e74c3c',
      cancelButtonColor: '#95a5a6',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.eliminarAlojamiento(id, titulo);
      }
    });
  }

  private eliminarAlojamiento(id: number, titulo: string): void {
    Swal.fire({
      title: 'Eliminando...',
      text: `Eliminando ${titulo}...`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.alojamientoService.eliminar(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.alojamientos = this.alojamientos.filter(a => a.id !== id);
          this.alojamientosFiltrados = this.alojamientosFiltrados.filter(a => a.id !== id);
          this.metricasPorAlojamiento.delete(id);
          Swal.fire({
            title: '¡Eliminado!',
            text: `El alojamiento "${titulo}" ha sido eliminado.`,
            icon: 'success',
            confirmButtonColor: '#2e8b57'
          });
        },
        error: (error) => {
          console.error('Error al eliminar alojamiento:', error);
          Swal.fire({
            title: 'Error',
            text: 'No se pudo eliminar el alojamiento. Por favor, intenta de nuevo.',
            icon: 'error',
            confirmButtonColor: '#2e8b57'
          });
        }
      });
  }

  recargar(): void {
    this.paginaActual = 0;
    this.terminoBusqueda = '';
    this.alojamientos = [];
    this.alojamientosFiltrados = [];
    this.metricasPorAlojamiento.clear();
    this.cargarAlojamientos();
  }

  // ==================== PAGINACIÓN ====================

  /**
   * Carga la siguiente página de alojamientos
   */
  cargarMasAlojamientos(): void {
    if (this.cargando) return;

    // --- LÓGICA CORREGIDA ---
    // 1. Obtenemos los datos del token
    const datosToken = this.authService.obtenerDatosToken();

    // 2. Validamos que existan y que tengan el campo 'sub' (ID del usuario)
    if (!datosToken || !datosToken.sub) {
      this.mostrarError('No se pudo identificar al usuario.');
      return;
    }

    // 3. Extraemos el ID del usuario
    const idUsuario = datosToken.sub;

    this.paginaActual++;
    this.cargando = true;

    // 4. Usamos el servicio de USUARIO para obtener la siguiente página
    this.usuarioService.obtenerAlojamientosUsuario(idUsuario, this.paginaActual)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargando = false)
      )
      .subscribe({
        next: (response) => {
          if (!response.error && response.respuesta.length > 0) {
            this.alojamientos = [...this.alojamientos, ...response.respuesta];
            this.alojamientosFiltrados = [...this.alojamientos];

            response.respuesta.forEach(alojamiento => {
              this.cargarMetricas(alojamiento.id);
            });
          }
        },
        error: (error) => {
          console.error('Error al cargar más alojamientos:', error);
          this.paginaActual--; // Revertir incremento de página
        }
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
