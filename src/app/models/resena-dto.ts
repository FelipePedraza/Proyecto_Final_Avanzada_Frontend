import {UsuarioDTO} from './usuario-dto';

export interface ItemResenaDTO {
  id: number;
  calificacion: number;
  comentario: string;
  creadoEn: Date;
  usuario: UsuarioDTO;
  respuesta: Respuesta;
}

export interface CreacionResenaDTO {
  calificacion: number;
  comentario: string;
}

export interface CreacionRespuestaDTO {
  mensaje: string;
}

export interface Respuesta {
  mensaje: string;
  respondidoEn: Date;
}
