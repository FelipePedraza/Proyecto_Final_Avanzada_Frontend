import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, finalize } from 'rxjs';

// Componentes
import { AlojamientoItem } from '../../components/alojamiento-item/alojamiento-item';
import { BarraBusqueda } from '../../components/barra-busqueda/barra-busqueda';

// Servicios
import { AlojamientoService } from '../../services/alojamiento-service';

// Modelos
import { ItemAlojamientoDTO, AlojamientoFiltroDTO } from '../../models/alojamiento-dto';

@Component({
  selector: 'app-busqueda',
  imports: [CommonModule, FormsModule, AlojamientoItem, BarraBusqueda],
  templateUrl: './busqueda.html',
  styleUrl: './busqueda.css'
})
export class Busqueda implements OnInit, OnDestroy {

  // ==================== PROPIEDADES ====================

  // Resultados
  alojamientos: ItemAlojamientoDTO[] = [];
  totalResultados: number = 0;

  // Filtros desde URL (se actualizan con la barra de búsqueda)
  filtrosBase: Partial<AlojamientoFiltroDTO> = {};

  // Filtros adicionales del sidebar
  precioMin: number = 0;
  precioMax: number = 0;


  // Paginación
  paginaActual: number = 0;
  totalPaginas: number = 0;
  readonly ITEMS_POR_PAGINA = 10;

  // Estados
  cargando: boolean = false;
  errorCarga: boolean = false;
  error: string = '';

  private destroy$ = new Subject<void>();

  // ==================== CONSTRUCTOR ====================

  constructor(
    private route: ActivatedRoute,
    private alojamientoService: AlojamientoService,
  ) {}

  // ==================== CICLO DE VIDA ====================

  ngOnInit(): void {
    this.suscribirAQueryParams();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== INICIALIZACIÓN ====================

  private suscribirAQueryParams(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        // Construir filtros base desde URL
        this.filtrosBase = {};

        if (params['ciudad']) {
          this.filtrosBase.ciudad = params['ciudad'];
        }

        if (params['fechaEntrada']) {
          this.filtrosBase.fechaEntrada = params['fechaEntrada'];
        }

        if (params['fechaSalida']) {
          this.filtrosBase.fechaSalida = params['fechaSalida'];
        }

        if (params['huespedes']) {
          this.filtrosBase.huespedes = +params['huespedes'];
        }

        if (params['servicios']) {
          this.filtrosBase.servicios = params['servicios'].split(',').filter((s: string) => s);
        }

        // Resetear paginación al cambiar filtros
        this.paginaActual = 0;
        this.buscarAlojamientos();
      });
  }

  // ==================== BÚSQUEDA ====================

  private buscarAlojamientos(): void {
    this.cargando = true;
    this.errorCarga = false;

    // Construir el objeto AlojamientoFiltroDTO completo
    const filtros: Partial<AlojamientoFiltroDTO> = {
      ...this.filtrosBase
    };

    // Agregar filtros adicionales del sidebar solo si tienen valor
    if (this.precioMin > 0) {
      filtros.precioMin = this.precioMin;
    }

    if (this.precioMax > 0) {
      filtros.precioMax = this.precioMax;
    }

    // Llamar al servicio con el objeto correcto
    this.alojamientoService.obtenerAlojamientos(filtros, this.paginaActual)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargando = false)
      )
      .subscribe({
        next: (respuesta) => {
          this.alojamientos = respuesta.data || [];
          this.totalResultados = this.alojamientos.length;
          this.calcularPaginas();
        },
        error: (error) => {
          console.error('Error al buscar alojamientos:', error);
          this.error = error.error.data;
          this.errorCarga = true;
        }
      });
  }

  // ==================== FILTROS ====================

  aplicarFiltros(): void {
    this.paginaActual = 0;
    this.buscarAlojamientos();
  }

  limpiarFiltros(): void {
    this.precioMin = 0;
    this.precioMax = 0;
    this.aplicarFiltros();
  }

  // ==================== PAGINACIÓN ====================

  private calcularPaginas(): void {
    this.totalPaginas = Math.ceil(this.totalResultados / this.ITEMS_POR_PAGINA);
  }

  irAPagina(pagina: number): void {
    if (pagina >= 0 && pagina < this.totalPaginas) {
      this.paginaActual = pagina;
      this.buscarAlojamientos();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  generarPaginas(): number[] {
    const paginas: number[] = [];
    const rango = 2;

    for (let i = 0; i < this.totalPaginas; i++) {
      if (
        i === 0 ||
        i === this.totalPaginas - 1 ||
        (i >= this.paginaActual - rango && i <= this.paginaActual + rango)
      ) {
        paginas.push(i);
      }
    }

    return paginas;
  }

  mostrarEllipsis(index: number, paginas: number[]): boolean {
    if (index === 0) return false;
    return paginas[index] - paginas[index - 1] > 1;
  }

}
