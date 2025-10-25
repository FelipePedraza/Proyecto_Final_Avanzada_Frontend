import { Component} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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

  constructor(private alojamientoService: AlojamientoService) {
    this.cargarAlojamientos()
  }

  /**
   * Carga todos los alojamientos del usuario
   */
  cargarAlojamientos(): void {
    this.cargando = true;

    // Simular delay de carga (en producción sería una llamada HTTP)
    setTimeout(() => {
      this.alojamientos = this.alojamientoService.obtenerMisAlojamientos();
      this.alojamientosFiltrados = [...this.alojamientos];

      // Cargar métricas para cada alojamiento
      this.alojamientos.forEach(alojamiento => {
        const metricas = this.alojamientoService.obtenerMetricas(alojamiento.id);
        this.metricasPorAlojamiento.set(alojamiento.id, metricas);
      });

      this.cargando = false;
    }, 500);
  }

  /**
   * Busca alojamientos según el término ingresado
   */
  buscarAlojamientos(): void {
    this.alojamientosFiltrados = this.alojamientoService.buscarAlojamientos(this.terminoBusqueda);
  }

  /**
   * Limpia la búsqueda y muestra todos los alojamientos
   */
  limpiarBusqueda(): void {
    this.terminoBusqueda = '';
    this.alojamientosFiltrados = [...this.alojamientos];
  }

  /**
   * Obtiene las métricas de un alojamiento específico
   */
  obtenerMetricas(id: number): MetricasDTO | undefined {
    return this.metricasPorAlojamiento.get(id);
  }

  /**
   * Formatea el precio con separadores de miles
   */
  formatearPrecio(precio: number): string {
    return precio.toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    });
  }

  /**
   * Genera un array de estrellas para mostrar la calificación
   */
  generarEstrellas(calificacion: number): number[] {
    return Array(Math.floor(calificacion)).fill(0);
  }

  /**
   * Confirma y elimina un alojamiento
   */
  confirmarEliminar(id: number, titulo: string): void {
    Swal.fire({
      title: "¿Estás seguro?",
      text: `El alojamiento "${titulo}" cambiará su estado a Eliminado.`,
      icon: "warning", // puedes mantener "error" si prefieres
      showCancelButton: true,
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#28a745", // verde (Bootstrap success)
      cancelButtonColor: "#d33" // rojo para cancelar, opcional
    }).then((result) => {
      if (result.isConfirmed) {
        this.alojamientos = this.alojamientos.filter(a => a.id !== id);
        this.alojamientosFiltrados = this.alojamientosFiltrados.filter(a => a.id !== id);
        this.metricasPorAlojamiento.delete(id);

        Swal.fire({
          title: "Eliminado!",
          text: `El alojamiento "${titulo}" ha sido eliminado correctamente.`,
          icon: "success",
          confirmButtonColor: "#28a745"
        });
      }
    });
  }
}
