import {AlojamientoDTO} from './alojamiento-dto';
import {UsuarioDTO} from './usuario-dto';

export interface ReservaDTO {
  id: number;
  alojamiento: AlojamientoDTO;
  huesped: UsuarioDTO;
  fechaEntrada: Date;
  fechaSalida: Date;
  cantidadHuespedes: number;
  precio: number;
  estado: ReservaEstado;
}

export interface ItemReservaDTO {
  id: number;
  alojamiento: AlojamientoDTO;
  fechaEntrada: Date;
  fechaSalida: Date;
  precio: number;
  estado: ReservaEstado;
}

export interface CreacionReservaDTO {
  alojamientoId: number;
  usuarioId: string;
  fechaEntrada: Date;
  fechaSalida: Date;
  cantidadHuespedes: number;
}

export interface EstadoReservaDTO {
  estado: ReservaEstado;
}

export enum ReservaEstado {
  PENDIENTE = 'PENDIENTE',
  CONFIRMADA = 'CONFIRMADA',
  CANCELADA = 'CANCELADA',
  COMPLETADA = 'COMPLETADA'
}
