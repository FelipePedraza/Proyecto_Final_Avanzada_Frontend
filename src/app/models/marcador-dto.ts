import { Localizacion } from "./alojamiento-dto";

export interface MarcadorDTO {
  id: number,
  localizacion: Localizacion,
  titulo: string,
  fotoUrl: string
}
