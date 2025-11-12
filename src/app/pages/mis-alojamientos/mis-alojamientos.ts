import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil, finalize } from 'rxjs';
import { PanelUsuario } from '../../components/panel-usuario/panel-usuario';

//DTO
import { ItemAlojamientoDTO, MetricasDTO } from '../../models/alojamiento-dto';

//Servicios
import { UsuarioService } from '../../services/usuario-service';
import { TokenService } from '../../services/token-service';
import { AlojamientoService } from '../../services/alojamiento-service';
import { MensajeHandlerService } from '../../services/mensajeHandler-service';
import { CalificacionService } from '../../services/calificacion-service';
import { PrecioService } from '../../services/precio-service';

@Component({
  selector: 'app-mis-alojamientos',
  imports: [ PanelUsuario, CommonModule, FormsModule, RouterLink],
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
    public alojamientoService: AlojamientoService,
    private usuarioService: UsuarioService,
    private mensajeHandlerService: MensajeHandlerService,
    public calificacionService: CalificacionService,
    public precioService: PrecioService,
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
    this.mensajeHandlerService.confirmDanger(
      `Se eliminará el alojamiento "${titulo}"`,
      'Sí, eliminar',
      '¿Estás seguro?'
    ).then((result) => {
      if (result) {
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
          const mensaje = this.mensajeHandlerService.handleHttpError(error);
          this.mensajeHandlerService.showError(mensaje);
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
          const mensaje = this.mensajeHandlerService.handleHttpError(error);
          this.mensajeHandlerService.showError(mensaje);
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
          this.mensajeHandlerService.showSuccess(respuesta.data, '¡Eliminado!');
          // Remover de las listas
          this.alojamientos = this.alojamientos.filter(a => a.id !== id);
          this.filtrarAlojamientos();
          this.metricasPorAlojamiento.delete(id);
        },
        error: (error) => {
          const mensaje = this.mensajeHandlerService.handleHttpError(error);
          this.mensajeHandlerService.showError(mensaje);
        }
      });
  }
}
