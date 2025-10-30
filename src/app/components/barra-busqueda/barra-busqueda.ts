import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CiudadService } from '../../services/ciudad-service';
import { ServiciosService } from '../../services/servicios-service';
import { AlojamientoFiltroDTO } from '../../models/alojamiento-dto';

@Component({
  selector: 'app-barra-busqueda',
  imports: [CommonModule, FormsModule],
  templateUrl: './barra-busqueda.html',
  styleUrl: './barra-busqueda.css'
})
export class BarraBusqueda implements OnInit, OnDestroy {

  // Filtros del formulario
  ciudad: string = '';
  fechaEntrada: string = '';
  fechaSalida: string = '';
  huespedes: number = 1;
  serviciosSeleccionados: string[] = [];

  // Datos para select/checkboxes
  ciudades: string[] = [];
  serviciosDisponibles: string[] = [];

  // UI
  mostrarServicios: boolean = false;
  cargando: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private ciudadService: CiudadService,
    private serviciosService: ServiciosService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarDatosIniciales();
    this.establecerFechasMinimas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarDatosIniciales(): void {
    // Cargar ciudades
    this.ciudadService.obtenerCiudades()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (respuesta) => {
          if (!respuesta.error) {
            this.ciudades = respuesta.data;
          }
        },
        error: (error) => console.error('Error al cargar ciudades:', error)
      });

    // Cargar servicios
    this.serviciosService.obtenerServicios()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (respuesta) => {
          if (!respuesta.error) {
            this.serviciosDisponibles = respuesta.data;
          }
        },
        error: (error) => console.error('Error al cargar servicios:', error)
      });
  }

  private establecerFechasMinimas(): void {
    const hoy = new Date();
    this.fechaEntrada = hoy.toISOString().split('T')[0];

    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);
    this.fechaSalida = manana.toISOString().split('T')[0];
  }

  toggleServicio(servicio: string): void {
    const index = this.serviciosSeleccionados.indexOf(servicio);
    if (index > -1) {
      this.serviciosSeleccionados.splice(index, 1);
    } else {
      this.serviciosSeleccionados.push(servicio);
    }
  }

  estaSeleccionado(servicio: string): boolean {
    return this.serviciosSeleccionados.includes(servicio);
  }

  buscar(): void {
    // Validación básica
    if (!this.ciudad) {
      return;
    }

    // Construir filtros
    const filtros: Partial<AlojamientoFiltroDTO> = {
      ciudad: this.ciudad,
      huespedes: this.huespedes,
      servicios: this.serviciosSeleccionados
    };

    if (this.fechaEntrada) {
      filtros.fechaEntrada = new Date(this.fechaEntrada);
    }

    if (this.fechaSalida) {
      filtros.fechaSalida = new Date(this.fechaSalida);
    }

    // Navegar a la página de búsqueda con query params
    this.router.navigate(['/busqueda'], {
      queryParams: {
        ciudad: this.ciudad,
        fechaEntrada: this.fechaEntrada,
        fechaSalida: this.fechaSalida,
        huespedes: this.huespedes,
        servicios: this.serviciosSeleccionados.join(',')
      }
    });
  }

  formatearServicio(servicio: string): string {
    const serviciosMap: { [key: string]: string } = {
      'WIFI': 'Wi-Fi',
      'PISCINA': 'Piscina',
      'DESAYUNO': 'Desayuno',
      'AIRE_ACONDICIONADO': 'Aire Acondicionado',
      'ESTACIONAMIENTO': 'Estacionamiento',
      'COCINA': 'Cocina',
      'LAVADORA': 'Lavadora',
      'TV': 'Televisión',
      'GYM': 'Gimnasio',
      'MASCOTAS': 'Pet Friendly'
    };
    return serviciosMap[servicio] || servicio;
  }

  obtenerFechaMinima(): string {
    return new Date().toISOString().split('T')[0];
  }

  obtenerFechaMinimaSalida(): string {
    if (!this.fechaEntrada) {
      const manana = new Date();
      manana.setDate(manana.getDate() + 1);
      return manana.toISOString().split('T')[0];
    }

    const entrada = new Date(this.fechaEntrada);
    entrada.setDate(entrada.getDate() + 1);
    return entrada.toISOString().split('T')[0];
  }
}
