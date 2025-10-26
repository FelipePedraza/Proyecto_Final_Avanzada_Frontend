import { Injectable } from '@angular/core';
import { ItemAlojamientoDTO, MetricasDTO } from '../models/alojamiento-dto';

@Injectable({
  providedIn: 'root'
})
export class AlojamientoService {

  // Datos mock para simular alojamientos del usuario
  private misAlojamientos: ItemAlojamientoDTO[] = [
    {
      id: 1,
      titulo: 'Villa con Piscina en la Montaña',
      imagenPrincipal: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=400&auto=format&fit=crop',
      precioPorNoche: 250000,
      direccion: {
        ciudad: 'La Calera',
        direccion: 'Km 5 Vía La Calera',
        localizacion: { latitud: 4.7234, longitud: -73.9764 }
      },
      promedioCalificaciones: 4.95
    },
    {
      id: 2,
      titulo: 'Apartamento Moderno en el Centro',
      imagenPrincipal: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=400&auto=format&fit=crop',
      precioPorNoche: 180000,
      direccion: {
        ciudad: 'Bogotá',
        direccion: 'Calle 82 #10-20',
        localizacion: { latitud: 4.6692, longitud: -74.0555 }
      },
      promedioCalificaciones: 4.7
    },
    {
      id: 3,
      titulo: 'Casa Campestre con Jacuzzi',
      imagenPrincipal: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=400&auto=format&fit=crop',
      precioPorNoche: 320000,
      direccion: {
        ciudad: 'Girardot',
        direccion: 'Vereda El Peñón',
        localizacion: { latitud: 4.3056, longitud: -74.8036 }
      },
      promedioCalificaciones: 4.85
    }
  ];

  constructor() { }

  /**
   * Obtiene todos los alojamientos del usuario
   */
  obtenerMisAlojamientos(): ItemAlojamientoDTO[] {
    return this.misAlojamientos;
  }

  /**
   * Busca alojamientos por título o ciudad
   */
  buscarAlojamientos(termino: string): ItemAlojamientoDTO[] {
    if (!termino || termino.trim() === '') {
      return this.misAlojamientos;
    }

    const terminoLower = termino.toLowerCase().trim();

    return this.misAlojamientos.filter(alojamiento =>
      alojamiento.titulo.toLowerCase().includes(terminoLower) ||
      alojamiento.direccion.ciudad.toLowerCase().includes(terminoLower)
    );
  }

  /**
   * Obtiene un alojamiento por su ID
   */
  obtenerAlojamientoPorId(id: number): ItemAlojamientoDTO | undefined {
    return this.misAlojamientos.find(alojamiento => alojamiento.id === id);
  }

  /**
   * Elimina un alojamiento (simulado)
   */
  eliminarAlojamiento(id: number): boolean {
    const index = this.misAlojamientos.findIndex(alojamiento => alojamiento.id === id);

    if (index !== -1) {
      this.misAlojamientos.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Obtiene métricas de un alojamiento específico
   */
  obtenerMetricas(id: number): MetricasDTO {
    // Datos simulados - en producción vendrían del backend
    return {
      totalResenas: Math.floor(Math.random() * 50) + 10,
      promedioCalificaciones: Number((Math.random() * (5 - 4) + 4).toFixed(2)),
      totalReservas: Math.floor(Math.random() * 30) + 5
    };
  }
}
