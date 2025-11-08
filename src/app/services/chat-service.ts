import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { RespuestaDTO } from '../models/respuesta-dto';
import { MensajeDTO } from '../models/chat-dto';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly API_URL = 'http://localhost:8080/api/chat';

  private mensajesEnMemoriaSubject = new BehaviorSubject<MensajeDTO[]>([]);
  public mensajesEnMemoria$ = this.mensajesEnMemoriaSubject.asObservable();

  private chatActualIdSubject = new BehaviorSubject<number | null>(null);
  public chatActualId$ = this.chatActualIdSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * GET /api/chat/{chatId}
   * Obtiene un chat con sus mensajes paginados
   */
  obtenerChat(
    chatId: number,
    pagina: number = 0,
    tamano: number = 20
  ): Observable<RespuestaDTO> {
    const params = new HttpParams()
      .set('pagina', pagina.toString())
      .set('tamano', tamano.toString());

    return this.http.get<RespuestaDTO>(
      `${this.API_URL}/${chatId}`,
      { params }
    );
  }

  /**
   * GET /api/chat/usuario/{id}/conversaciones
   * Lista todas las conversaciones de un usuario
   */
  listarConversaciones(usuarioId: string): Observable<RespuestaDTO> {
    return this.http.get<RespuestaDTO>(
      `${this.API_URL}/usuario/${usuarioId}/conversaciones`
    );
  }

  /**
   * GET /api/chat/usuario/{id}/mensajes-no-leidos
   * Obtiene la cantidad de mensajes no leídos
   */
  obtenerMensajesNoLeidos(usuarioId: string): Observable<RespuestaDTO> {
    return this.http.get<RespuestaDTO>(
      `${this.API_URL}/usuario/${usuarioId}/mensajes-no-leidos`
    );
  }

  /**
   * PUT /api/chat/{chatId}/marcar-leido
   * Marca todos los mensajes de un chat como leídos
   */
  marcarChatComoLeido(
    chatId: number,
    usuarioId: string
  ): Observable<RespuestaDTO> {
    const params = new HttpParams().set('usuarioId', usuarioId);

    return this.http.put<RespuestaDTO>(
      `${this.API_URL}/${chatId}/marcar-leido`,
      null,
      { params }
    );
  }

  // ========== MÉTODOS DE GESTIÓN DE ESTADO ==========

  /**
   * Establece el chat actual
   * Limpia los mensajes previos automáticamente
   */
  setChatActual(chatId: number | null): void {
    this.chatActualIdSubject.next(chatId);
    if (chatId === null) {
      this.limpiarMensajes();
    }
  }

  /**
   * Obtiene el ID del chat actual
   */
  getChatActual(): number | null {
    return this.chatActualIdSubject.value;
  }

  /**
   * Agrega un nuevo mensaje al estado local
   * Previene duplicados verificando el ID
   */
  agregarMensaje(mensaje: MensajeDTO): void {
    const mensajesActuales = this.mensajesEnMemoriaSubject.value;

    // Verificar si el mensaje ya existe
    const existe = mensajesActuales.some(m => m.id === mensaje.id);

    if (!existe) {
      const nuevosMensajes = [...mensajesActuales, mensaje];
      this.mensajesEnMemoriaSubject.next(nuevosMensajes);
    }
  }

  /**
   * Establece todos los mensajes (para carga inicial)
   */
  setMensajes(mensajes: MensajeDTO[]): void {
    this.mensajesEnMemoriaSubject.next(mensajes);
  }

  /**
   * Obtiene los mensajes actuales
   */
  getMensajes(): MensajeDTO[] {
    return this.mensajesEnMemoriaSubject.value;
  }

  /**
   * Limpia los mensajes del estado
   * Útil al cambiar de chat
   */
  limpiarMensajes(): void {
    this.mensajesEnMemoriaSubject.next([]);
  }

  /**
   * Verifica si un mensaje pertenece al chat actual
   */
  perteneceAlChatActual(chatId: number): boolean {
    return this.getChatActual() === chatId;
  }

  /**
   * Resetea el estado del servicio
   * Útil al cerrar sesión o limpiar componente
   */
  resetearEstado(): void {
    this.limpiarMensajes();
    this.setChatActual(null);
  }
}
