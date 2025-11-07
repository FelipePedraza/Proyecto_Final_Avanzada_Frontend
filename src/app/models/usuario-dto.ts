export interface UsuarioDTO {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  rol: Rol;
  fechaNacimiento: Date;
  foto: string;
  esAnfitrion: boolean;
}

export interface CreacionUsuarioDTO {
  nombre: string;
  email: string;
  contrasena: string;
  telefono: string;
  fechaNacimiento: Date;
}

export interface EdicionUsuarioDTO {
  nombre: string;
  telefono: string;
  foto: string;
  fechaNacimiento: Date;
}

export interface LoginDTO {
  email: string;
  contrasena: string;
}

export interface TokenDTO {
  token: string;
}

export interface OlvidoContrasenaDTO {
  email: string;
}

export interface ReinicioContrasenaDTO {
  email: string;
  codigoVerificacion: string;
  nuevaContrasena: string;
}

export interface CambioContrasenaDTO {
  contrasenaActual: string;
  contrasenaNueva: string;
}

export interface CreacionAnfitrionDTO {
  usuarioId: string;
  sobreMi: string;
  documentoLegal: string;
}

export interface AnfitrionPerfilDTO {
  sobreMi: string;
  documentoLegal: string;
}

export enum Rol {
  HUESPED = 'Huesped',
  ANFITRION = 'Anfitrion'
}
