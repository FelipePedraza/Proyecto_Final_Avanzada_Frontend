export interface AlojamientoDTO {
  id: number;
  titulo: string;
  descripcion: string;
  direccion: Direccion;
  precioPorNoche: number;
  maxHuespedes: number;
  servicios: Servicio[];
  imagenes: string[];
  nombreAnfitrion: string;
}

export interface ItemAlojamientoDTO {
  id: number;
  titulo: string;
  imagenPrincipal: string;
  precioPorNoche: number;
  direccion: Direccion;
  promedioCalificaciones: number;
}

export interface CreacionAlojamientoDTO {
  titulo: string;
  descripcion: string;
  maxHuespedes: number;
  direccion: Direccion;
  precioPorNoche: number;
  servicios: Servicio[];
  imagenes: string[];
}

export interface EdicionAlojamientoDTO {
  titulo: string;
  descripcion: string;
  maxHuespedes: number;
  precioPorNoche: number;
  servicios: Servicio[];
  imagenes: string[];
  direccion: Direccion;
}

export interface AlojamientoFiltroDTO {
  ciudad: string;
  fechaEntrada: Date;
  fechaSalida: Date;
  huespedes: number;
  precioMin: number;
  precioMax: number;
  servicios: Servicio[];
}

export interface MetricasDTO {
  totalResenas: number;
  promedioCalificaciones: number;
  totalReservas: number;
}

export interface Direccion {
  ciudad: string;
  direccion: string;
  localizacion: Localizacion;
}

export interface Localizacion {
  latitud: number;
  longitud: number;
}

export enum Servicio {
  PISCINA = 'PISCINA',
  DESAYUNO = 'DESAYUNO',
  AIRE_ACONDICIONADO = 'AIRE_ACONDICIONADO',
  WIFI = 'WIFI',
  ESTACIONAMIENTO = 'ESTACIONAMIENTO'
}

