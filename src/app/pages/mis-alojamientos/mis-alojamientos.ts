import { Component, OnDestroy, OnInit } from '@angular/core';
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
import { TokenService } from '../../services/token-service';

@Component({
  selector: 'app-mis-alojamientos',
  imports: [PanelUsuario, CommonModule, FormsModule, RouterLink],
  templateUrl: './mis-alojamientos.html',
  styleUrl: './mis-alojamientos.css'
})
export class MisAlojamientos implements OnDestroy, OnInit {

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
    public alojamientoService: AlojamientoService, // Cambiado a public para acceder desde el template
    private usuarioService: UsuarioService,
    private authService: AuthService,
    private tokenService: TokenService
  ) { }

  // ==================== CICLO DE VIDA ====================
  ngOnInit(): void {
    this.cargarAlojamientosIniciales();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== MÉTODOS PÚBLICOS ====================

  /**
   * Filtra alojamientos localmente según el término de búsqueda
   */
  filtrarAlojamientos(): void {
    if (!this.terminoBusqueda.trim()) {
      this.alojamientosFiltrados = [...this.alojamientos];
      return;
    }

    const terminoLower = this.terminoBusqueda.toLowerCase().trim();
    this.alojamientosFiltrados = this.alojamientos.filter(a =>
      a.titulo.toLowerCase().includes(terminoLower) ||
      a.direccion.ciudad.toLowerCase().includes(terminoLower)
    );
  }

  /**
   * Limpia la búsqueda y restaura todos los alojamientos
   */
  limpiarBusqueda(): void {
    this.terminoBusqueda = '';
    this.alojamientosFiltrados = [...this.alojamientos];
  }

  /**
   * Confirma y elimina un alojamiento
   */
  confirmarEliminar(id: number, titulo: string): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `Se eliminará el alojamiento "${titulo}"`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2e8b57',
      cancelButtonColor: '#e74c3c',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.eliminarAlojamiento(id);
      }
    });
  }

  /**
   * Carga más alojamientos (paginación)
   */
  cargarMasAlojamientos(): void {
    const idUsuario = this.tokenService.getUserId();
    this.paginaActual++;
    this.cargando = true;

    this.usuarioService.obtenerAlojamientosUsuario(idUsuario, this.paginaActual)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargando = false)
      )
      .subscribe({
        next: (respuesta) => {
          const nuevosAlojamientos = respuesta.data as ItemAlojamientoDTO[];
          this.alojamientos = [...this.alojamientos, ...nuevosAlojamientos];
          this.filtrarAlojamientos();

          nuevosAlojamientos.forEach(alojamiento => {
            this.cargarMetricas(alojamiento.id);
          });
        },
        error: (error) => {
          this.mostrarError("Error al cargar más alojamientos");
        }
      });
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Carga los alojamientos iniciales del usuario
   */
  private cargarAlojamientosIniciales(): void {
    const idUsuario = this.tokenService.getUserId();
    this.paginaActual = 0;
    this.cargando = true;

    this.usuarioService.obtenerAlojamientosUsuario(idUsuario, this.paginaActual)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargando = false)
      )
      .subscribe({
        next: (respuesta) => {
          this.alojamientos = respuesta.data as ItemAlojamientoDTO[];
          this.alojamientosFiltrados = [...this.alojamientos];

          this.alojamientos.forEach(alojamiento => {
            this.cargarMetricas(alojamiento.id);
          });
        },
        error: (error) => {
          this.mostrarError("Error al obtener los alojamientos");
        }
      });
  }

  /**
   * Carga las métricas de un alojamiento específico
   */
  private cargarMetricas(idAlojamiento: number): void {
    this.alojamientoService.obtenerMetricas(idAlojamiento)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (respuesta) => {
          this.metricasPorAlojamiento.set(idAlojamiento, respuesta.data);
        },
        error: (error) => {
          console.error(`Error al cargar métricas para alojamiento ${idAlojamiento}:`, error);
        }
      });
  }

  /**
   * Elimina un alojamiento del sistema
   */
  private eliminarAlojamiento(id: number): void {
    this.alojamientoService.eliminar(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (respuesta) => {
          Swal.fire({
            title: '¡Eliminado!',
            text: 'El alojamiento ha sido eliminado correctamente',
            icon: 'success',
            confirmButtonColor: '#2e8b57'
          });

          // Remover de las listas
          this.alojamientos = this.alojamientos.filter(a => a.id !== id);
          this.filtrarAlojamientos();
          this.metricasPorAlojamiento.delete(id);
        },
        error: (error) => {
          this.mostrarError("Error al eliminar el alojamiento");
        }
      });
  }

  /**
   * Muestra mensaje de error con SweetAlert2
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
