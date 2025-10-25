import {UsuarioDTO} from './usuario-dto';

export interface MensajeDTO {
  id: number;
  remitenteId: string;
  destinatarioId: string;
  chatId: number;
  contenido: string;
  fechaEnvio: Date;
  leido: boolean;
}

export interface ChatDTO {
  id: number;
  usuario1: UsuarioDTO;
  usuario2: UsuarioDTO;
  mensajes: MensajeDTO[];
  ultimoMensaje?: MensajeDTO;
  creadoEn: Date;
  activo: boolean;
}
