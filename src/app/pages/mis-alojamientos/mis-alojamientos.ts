import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil, finalize } from 'rxjs';
import { PanelUsuario } from '../../components/panel-usuario/panel-usuario';
import { AlojamientoService } from '../../services/alojamiento-service';
import { ItemAlojamientoDTO, MetricasDTO } from '../../models/alojamiento-dto';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-mis-alojamientos',
  imports: [PanelUsuario, CommonModule, FormsModule, RouterLink],
  templateUrl: './mis-alojamientos.html',
  styleUrl: './mis-alojamientos.css'
})
export class MisAlojamientos {
  // ==================== PROPIEDADES ====================

  // Lista de todos los alojamientos
  alojamientos: ItemAlojamientoDTO[] = [];

  // Lista filtrada que se muestra en pantalla
  alojamientosFiltrados: ItemAlojamientoDTO[] = [];

  // Término de búsqueda
  terminoBusqueda: string = '';

  // Estado de carga
  cargando: boolean = false;

  // Métricas por alojamiento (id -> métricas)
  metricasPorAlojamiento: Map<number, MetricasDTO> = new Map();

  // Paginación
  paginaActual: number = 0;

  // Subject para cancelar subscripciones
  private destroy$ = new Subject<void>();

  // ==================== CONSTRUCTOR ====================

  constructor(private alojamientoService: AlojamientoService) {
    this.cargarAlojamientos();
  }


  // ==================== MÉTODOS DE CARGA ====================

  /**
   * Carga todos los alojamientos del usuario desde el backend
   */
  cargarAlojamientos(): void {
    this.cargando = true;

    // TODO: En producción, necesitarás un endpoint específico para obtener
    // los alojamientos del usuario autenticado. Por ahora usamos obtenerAlojamientos
    // pero deberías crear un método obtenerMisAlojamientos() que llame a un endpoint
    // como GET /api/usuarios/{id}/alojamientos

    this.alojamientoService.obtenerAlojamientos({}, this.paginaActual)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargando = false)
      )
      .subscribe({
        next: (response) => {
          if (!response.error) {
            this.alojamientos = response.respuesta;
            this.alojamientosFiltrados = [...this.alojamientos];

            // Cargar métricas para cada alojamiento
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
    this.alojamientos.forEach(alojamiento => {
      this.cargarMetricas(alojamiento.id);
    });
  }

  /**
   * Carga las métricas de un alojamiento específico
   */
  private cargarMetricas(id: number): void {
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

  /**
   * Busca alojamientos según el término ingresado
   * Realiza búsqueda local en los alojamientos ya cargados
   */
  buscarAlojamientos(): void {
    this.alojamientosFiltrados = this.alojamientoService.buscarAlojamientosLocal(
      this.alojamientos,
      this.terminoBusqueda
    );
  }

  /**
   * Limpia la búsqueda y muestra todos los alojamientos
   */
  limpiarBusqueda(): void {
    this.terminoBusqueda = '';
    this.alojamientosFiltrados = [...this.alojamientos];
  }

  // ==================== OBTENCIÓN DE DATOS ====================

  /**
   * Obtiene las métricas de un alojamiento específico
   */
  obtenerMetricas(id: number): MetricasDTO | undefined {
    return this.metricasPorAlojamiento.get(id);
  }

  // ==================== FORMATEO Y UTILIDADES ====================

  /**
   * Formatea el precio con separadores de miles
   */
  formatearPrecio(precio: number): string {
    return this.alojamientoService.formatearPrecio(precio);
  }

  /**
   * Genera un array de estrellas para mostrar la calificación
   */
  generarEstrellas(calificacion: number): number[] {
    return this.alojamientoService.generarEstrellas(calificacion);
  }

  // ==================== ELIMINACIÓN ====================

  /**
   * Confirma y elimina un alojamiento
   */
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

  /**
   * Elimina un alojamiento del sistema
   */
  private eliminarAlojamiento(id: number, titulo: string): void {
    // Mostrar indicador de carga
    Swal.fire({
      title: 'Eliminando...',
      text: 'Por favor espera',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.alojamientoService.eliminar(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Eliminar de las listas locales
          this.alojamientos = this.alojamientos.filter(a => a.id !== id);
          this.alojamientosFiltrados = this.alojamientosFiltrados.filter(a => a.id !== id);
          this.metricasPorAlojamiento.delete(id);

          // Mostrar mensaje de éxito
          Swal.fire({
            title: '¡Eliminado!',
            text: `El alojamiento "${titulo}" ha sido eliminado correctamente.`,
            icon: 'success',
            confirmButtonColor: '#2e8b57',
            timer: 3000,
            timerProgressBar: true
          });
        },
        error: (error) => {
          console.error('Error al eliminar alojamiento:', error);

          // Mostrar mensaje de error
          Swal.fire({
            title: 'Error',
            text: 'No se pudo eliminar el alojamiento. Por favor, intenta de nuevo.',
            icon: 'error',
            confirmButtonColor: '#2e8b57'
          });
        }
      });
  }

  // ==================== RECARGAR ====================

  /**
   * Recarga la lista de alojamientos
   */
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

    this.paginaActual++;
    this.cargando = true;

    this.alojamientoService.obtenerAlojamientos({}, this.paginaActual)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargando = false)
      )
      .subscribe({
        next: (response) => {
          if (!response.error && response.respuesta.length > 0) {
            this.alojamientos = [...this.alojamientos, ...response.respuesta];
            this.alojamientosFiltrados = [...this.alojamientos];

            // Cargar métricas de los nuevos alojamientos
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

  // ==================== MANEJO DE ERRORES ====================

  /**
   * Muestra un mensaje de error con SweetAlert2
   */
  private mostrarError(mensaje: string): void {
    Swal.fire({
      title: 'Error',
      text: mensaje,
      icon: 'error',
      confirmButtonColor: '#2e8b57'
    });
  }
}
