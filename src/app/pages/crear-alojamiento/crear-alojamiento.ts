import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, finalize } from 'rxjs';

// Servicios
import { AlojamientoService } from '../../services/alojamiento-service';
import { ImagenService } from '../../services/imagen-service';
import { CiudadService } from '../../services/ciudad-service';
import { ServiciosService } from '../../services/servicios-service';
import { TokenService } from '../../services/token-service';
import { MapaService } from '../../services/mapa-service';
import { MensajehandlerService } from '../../services/mensajehandler-service';

//DTOs
import { CreacionAlojamientoDTO, EdicionAlojamientoDTO, Direccion } from '../../models/alojamiento-dto';
import { MarcadorDTO} from '../../models/marcador-dto';

@Component({
  selector: 'app-crear-alojamiento',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './crear-alojamiento.html',
  styleUrl: './crear-alojamiento.css'
})
export class CrearAlojamiento implements OnInit, OnDestroy {
  // ==================== PROPIEDADES ====================
  alojamientoForm!: FormGroup;
  cargando = false;
  pasoActual = 1;
  totalPasos = 4;

  // Modo edición
  modoEdicion = false;
  idAlojamiento?: number;

  // Datos del formulario
  ciudades: string[] = [];
  serviciosDisponibles: string[] = [];
  imagenesSubidas: string[] = [];
  subiendoImagen = false;

  private destroy$ = new Subject<void>();

  // ==================== CONSTRUCTOR ====================
  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private alojamientoService: AlojamientoService,
    private imagenService: ImagenService,
    private ciudadService: CiudadService,
    private serviciosService: ServiciosService,
    private tokenService: TokenService,
    private mensajeHandlerService: MensajehandlerService,
    private mapaService: MapaService
  ) {}

  // ==================== CICLO DE VIDA ====================
  ngOnInit(): void {
    this.verificarModoEdicion();
    this.crearFormulario();
    this.cargarDatosIniciales();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.mapaService) {
      this.mapaService.ngOnDestroy();
    }
  }

  // ==================== INICIALIZACIÓN ====================
  private verificarModoEdicion(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['id']) {
          this.modoEdicion = true;
          this.idAlojamiento = +params['id'];
          this.cargarAlojamiento();
        }
      });
  }

  private crearFormulario(): void {
    this.alojamientoForm = this.formBuilder.group({
      // Paso 1: Información básica
      titulo: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(100)]],
      descripcion: ['', [Validators.required, Validators.minLength(50), Validators.maxLength(1000)]],
      maxHuespedes: [1, [Validators.required, Validators.min(1), Validators.max(20)]],
      precioPorNoche: [0, [Validators.required, Validators.min(10000)]],

      // Paso 2: Ubicación
      ciudad: ['', Validators.required],
      direccion: ['', [Validators.required, Validators.minLength(5)]],
      localizacion: [{ latitud: 0, longitud: 0 }, Validators.required],

      // Paso 3: Servicios
      servicios: this.formBuilder.array([]),

      // Paso 4: Imágenes (se maneja por separado)
    });
  }

  private cargarDatosIniciales(): void {
    // Cargar ciudades
    this.ciudadService.obtenerCiudades()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (respuesta) => { if (!respuesta.error) this.ciudades = respuesta.data; },
        error: (error) => console.error('Error al cargar ciudades:', error)
      });

    // Cargar servicios
    this.serviciosService.obtenerServicios()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (respuesta) => {
          if (!respuesta.error) {
            this.serviciosDisponibles = respuesta.data;
            this.inicializarServiciosCheckboxes();
          }
        },
        error: (error) => console.error('Error al cargar servicios:', error)
      });
  }

  private cargarAlojamiento(): void {
    if (!this.idAlojamiento) return;

    this.cargando = true;
    this.alojamientoService.obtenerPorId(this.idAlojamiento)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargando = false)
      )
      .subscribe({
        next: (respuesta) => {
          if (!respuesta.error) {
            const alojamiento = respuesta.data;

            this.alojamientoForm.patchValue({
              titulo: alojamiento.titulo,
              descripcion: alojamiento.descripcion,
              maxHuespedes: alojamiento.maxHuespedes,
              precioPorNoche: alojamiento.precioPorNoche,
              ciudad: alojamiento.direccion.ciudad,
              direccion: alojamiento.direccion.direccion,
              localizacion: {
                latitud: alojamiento.direccion.localizacion.latitud,
                longitud: alojamiento.direccion.localizacion.longitud
              }
            });

            this.imagenesSubidas = alojamiento.imagenes;
            this.marcarServiciosSeleccionados(alojamiento.servicios);
          }
        },
        error: (error) => {
          const mensaje = this.mensajeHandlerService.handleHttpError(error);
          this.mensajeHandlerService.showError(mensaje);
          this.volver();
        }
      });
  }

  // ==================== SERVICIOS (CHECKBOXES) ====================
  get serviciosArray(): FormArray {
    return this.alojamientoForm.get('servicios') as FormArray;
  }

  private inicializarServiciosCheckboxes(): void {
    this.serviciosDisponibles.forEach(() => {
      this.serviciosArray.push(this.formBuilder.control(false));
    });
  }

  private marcarServiciosSeleccionados(serviciosSeleccionados: string[]): void {
    this.serviciosDisponibles.forEach((servicio, index) => {
      if (serviciosSeleccionados.includes(servicio)) {
        this.serviciosArray.at(index).setValue(true);
      }
    });
  }

  protected obtenerServiciosSeleccionados(): string[] {
    return this.serviciosDisponibles.filter((_, i) => this.serviciosArray.at(i).value);
  }

  // ==================== MAPA (Delegado al Servicio) ====================

  /**
   * [NUEVO] Crea la instancia del mapa y dibuja el marcador inicial
   * (ya sea el default o el cargado en modo edición)
   */
  private inicializarLogicaMapa(): void {
    // Espera a que el div del paso 2 sea visible
    setTimeout(() => {
      this.mapaService.create('map').pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          if (this.modoEdicion && this.idAlojamiento) {
            const marcadorDTO: MarcadorDTO = {
              id: this.idAlojamiento,
              titulo: this.alojamientoForm.value.titulo,
              fotoUrl: this.imagenesSubidas[0],
              localizacion: {
                latitud: this.alojamientoForm.value.localizacion.latitud,
                longitud: this.alojamientoForm.value.localizacion.longitud
              }
            };
            this.mapaService.drawMarkers([marcadorDTO]);
            this.mapaService.mapInstance?.setCenter([this.alojamientoForm.value.localizacion.longitud, this.alojamientoForm.value.localizacion.latitud]);
          }
          this.mapaService.addMarker()
            .pipe(takeUntil(this.destroy$))
            .subscribe((markerCoords) => {
              this.alojamientoForm.get('localizacion')?.setValue({
                latitud: markerCoords.lat,
                longitud: markerCoords.lng,
              });
            });
          // 2. Obtiene la ubicación actual del formulario
          const loc = this.alojamientoForm.value.localizacion;
          if (!loc) return;
        },
        error: (error) => {
          console.error('No se pudo cargar el mapa', error);
        }
      }); // 1. Crea el mapa en el div 'map'
    }, 100);
  }

  // [CORREGIDO] Eliminados los métodos antiguos 'inicializarMapa' y 'agregarMarcador'

  // ==================== IMÁGENES ====================
  seleccionarImagenes(event: any): void {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    if (this.imagenesSubidas.length + files.length > 10) {
      this.mensajeHandlerService.showError('Puedes subir máximo 10 imágenes');
      return;
    }

    this.subiendoImagen = true;
    Array.from(files).forEach((file, index) => {
      this.imagenService.subirImagen(file)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => {
            if (index === files.length - 1) this.subiendoImagen = false;
          })
        )
        .subscribe({
          next: (respuesta) => {
            this.imagenesSubidas.push(respuesta.data.url);
          },
          error: (error) => {
            const mensaje = this.mensajeHandlerService.handleHttpError(error);
            this.mensajeHandlerService.showError(mensaje);
          }
        });
    });
  }

  eliminarImagen(index: number): void {
    this.mensajeHandlerService.confirmDanger('Esta acción no se puede deshacer','Sí, eliminar', '¿Eliminar imagen?').then((result) => {
      if (result) {
        const imagenAEliminar = this.imagenesSubidas[index];
        if (!imagenAEliminar) return;

        const url = imagenAEliminar;

        if (!url) {
          this.imagenesSubidas.splice(index, 1);
          return;
        }

        this.cargando = true; // Mostrar spinner
        this.imagenService.eliminarImagen(url)
          .pipe(
            takeUntil(this.destroy$),
            finalize(() => this.cargando = false)
          )
          .subscribe({
            next: () => {
              // Si se borra de la nube, se borra del array local
              this.imagenesSubidas.splice(index, 1);
            },
            error: (error) => {
              const mensaje = this.mensajeHandlerService.handleHttpError(error);
              this.mensajeHandlerService.showError(mensaje);
            }
          });
      }
    });
  }

  // ==================== NAVEGACIÓN ENTRE PASOS ====================
  siguientePaso(): void {
    if (!this.validarPasoActual()) {
      this.marcarCamposComoTocados();
      this.mensajeHandlerService.showError('Por favor completa todos los campos requeridos');
      return;
    }

    if (this.pasoActual < this.totalPasos) {
      this.pasoActual++;

      // [CORREGIDO] Inicializar mapa aquí
      if (this.pasoActual === 2) {
        this.inicializarLogicaMapa();
      }
    }
  }

  pasoAnterior(): void {
    if (this.pasoActual > 1) {
      this.pasoActual--;
      if (this.pasoActual === 2) {
        this.inicializarLogicaMapa();
      }
    }
  }

  irAPaso(paso: number): void {
    if (paso <= this.pasoActual || this.validarPasosAnteriores(paso)) {
      this.pasoActual = paso;

      if (paso === 2) {
        this.inicializarLogicaMapa();
      }
    }
  }

  private validarPasoActual(): boolean {
    switch (this.pasoActual) {
      case 1:
        return this.alojamientoForm.get('titulo')!.valid &&
          this.alojamientoForm.get('descripcion')!.valid &&
          this.alojamientoForm.get('maxHuespedes')!.valid &&
          this.alojamientoForm.get('precioPorNoche')!.valid;
      case 2:
        return this.alojamientoForm.get('ciudad')!.valid &&
          this.alojamientoForm.get('direccion')!.valid &&
          this.alojamientoForm.get('localizacion')!.valid;
      case 3:
        return this.obtenerServiciosSeleccionados().length > 0;
      case 4:
        return this.imagenesSubidas.length >= 3;
      default:
        return true;
    }
  }

  private validarPasosAnteriores(paso: number): boolean {
    for (let i = 1; i < paso; i++) {
      const pasoActualTemp = this.pasoActual;
      this.pasoActual = i;
      if (!this.validarPasoActual()) {
        this.pasoActual = pasoActualTemp;
        return false;
      }
      this.pasoActual = pasoActualTemp;
    }
    return true;
  }

  // ==================== ENVÍO DEL FORMULARIO ====================
  guardarAlojamiento(): void {
    if (!this.validarFormularioCompleto()) {
      this.mensajeHandlerService.showError('Por favor completa todos los pasos correctamente');
      return;
    }

    if (this.modoEdicion && this.idAlojamiento) {
      this.editarAlojamiento();
    } else {
      this.crearAlojamiento();
    }
  }

  private crearAlojamiento(): void {
    this.cargando = true;

    const idAnfitrion = this.tokenService.getUserId();
    if (!idAnfitrion) {
      this.mensajeHandlerService.showError('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
      this.cargando = false;
      this.router.navigate(['/login']);
      return;
    }

    const direccion: Direccion = {
      ciudad: this.alojamientoForm.value.ciudad,
      direccion: this.alojamientoForm.value.direccion,
      localizacion: this.alojamientoForm.value.localizacion
    };

    const dto: CreacionAlojamientoDTO = {
      titulo: this.alojamientoForm.value.titulo,
      descripcion: this.alojamientoForm.value.descripcion,
      maxHuespedes: this.alojamientoForm.value.maxHuespedes,
      direccion: direccion,
      precioPorNoche: this.alojamientoForm.value.precioPorNoche,
      servicios: this.obtenerServiciosSeleccionados(),
      imagenes: this.imagenesSubidas
    };

    this.alojamientoService.crear(dto)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargando = false)
      )
      .subscribe({
        next: (respuesta) => {
          this.mensajeHandlerService.showSuccessWithCallback(respuesta.data, '¡Alojamiento creado!', () => {
            this.router.navigate(['/mis-alojamientos']);
          });

        },
        error: (error) => {
          const mensaje = this.mensajeHandlerService.handleHttpError(error);
          this.mensajeHandlerService.showError(mensaje);
        }
      });
  }

  private editarAlojamiento(): void {
    this.cargando = true;
    const direccion: Direccion = {
      ciudad: this.alojamientoForm.value.ciudad,
      direccion: this.alojamientoForm.value.direccion,
      localizacion: this.alojamientoForm.value.localizacion
    };

    const dto: EdicionAlojamientoDTO = {
      titulo: this.alojamientoForm.value.titulo,
      descripcion: this.alojamientoForm.value.descripcion,
      maxHuespedes: this.alojamientoForm.value.maxHuespedes,
      precioPorNoche: this.alojamientoForm.value.precioPorNoche,
      servicios: this.obtenerServiciosSeleccionados(),
      imagenes: this.imagenesSubidas,
      direccion: direccion
    };

    this.alojamientoService.editar(this.idAlojamiento!, dto)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.cargando = false)
      )
      .subscribe({
        next: (respuesta) => {
          this.mensajeHandlerService.showSuccessWithCallback('Los cambios han sido guardados exitosamente', '¡Alojamiento actualizado!', () => {
            this.router.navigate(['/mis-alojamientos']);
          });
        },
        error: (error) => {
          const mensaje = this.mensajeHandlerService.handleHttpError(error);
          this.mensajeHandlerService.showError(mensaje);
        }
      });
  }

  // ==================== VALIDACIONES ====================
  validarFormularioCompleto(): boolean {
    return this.alojamientoForm.valid &&
      this.obtenerServiciosSeleccionados().length > 0 &&
      this.imagenesSubidas.length >= 3;
  }

  campoInvalido(campo: string): boolean {
    const control = this.alojamientoForm.get(campo);
    return !!(control && control.invalid && control.touched);
  }

  obtenerErrorCampo(campo: string): string {
    const control = this.alojamientoForm.get(campo);
    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'Este campo es obligatorio';
    if (control.errors['minlength']) {
      return `Debe tener al menos ${control.errors['minlength'].requiredLength} caracteres`;
    }
    if (control.errors['maxlength']) {
      return `No puede exceder ${control.errors['maxlength'].requiredLength} caracteres`;
    }
    if (control.errors['min']) {
      return `El valor mínimo es ${control.errors['min'].min}`;
    }
    if (control.errors['max']) {
      return `El valor máximo es ${control.errors['max'].max}`;
    }

    return 'Campo inválido';
  }

  marcarCamposComoTocados(): void {
    Object.keys(this.alojamientoForm.controls).forEach(key => {
      this.alojamientoForm.get(key)?.markAsTouched();
    });
  }

  // ==================== UTILIDADES ====================
  formatearServicio(servicio: string): string {
    const serviciosMap: { [key: string]: string } = {
      'WIFI': 'Wi-Fi', 'PISCINA': 'Piscina', 'DESAYUNO': 'Desayuno',
      'AIRE_ACONDICIONADO': 'Aire Acondicionado', 'ESTACIONAMIENTO': 'Estacionamiento',
      'COCINA': 'Cocina', 'LAVADORA': 'Lavadora', 'TV': 'Televisión',
      'GYM': 'Gimnasio', 'MASCOTAS': 'Mascotas permitidas'
    };
    return serviciosMap[servicio] || servicio;
  }

  obtenerIconoServicio(servicio: string): string {
    const iconosMap: { [key: string]: string } = {
      'WIFI': 'fa-wifi', 'PISCINA': 'fa-person-swimming', 'DESAYUNO': 'fa-mug-hot',
      'AIRE_ACONDICIONADO': 'fa-snowflake', 'ESTACIONAMIENTO': 'fa-car',
      'COCINA': 'fa-kitchen-set', 'LAVADORA': 'fa-shirt', 'TV': 'fa-tv',
      'GYM': 'fa-dumbbell', 'MASCOTAS': 'fa-paw'
    };
    return iconosMap[servicio] || 'fa-check';
  }

  volver(): void {
    this.location.back();
  }
}
