import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChatDTO, MensajeDTO } from '../models/chat-dto';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly API_URL = 'http://localhost:8080/api/chat';

  constructor(private http: HttpClient) {}

  /**
   * GET /api/chat/{chatId}
   * Obtiene un chat con sus mensajes paginados
   */
  obtenerChat(
    chatId: number,
    pagina: number = 0,
    tamano: number = 20
  ): Observable<{ error: boolean; respuesta: ChatDTO }> {
    const params = new HttpParams()
      .set('pagina', pagina.toString())
      .set('tamano', tamano.toString());

    return this.http.get<{ error: boolean; respuesta: ChatDTO }>(
      `${this.API_URL}/${chatId}`,
      { params }
    );
  }

  /**
   * GET /api/chat/usuario/{id}/conversaciones
   * Lista todas las conversaciones de un usuario
   */
  listarConversaciones(usuarioId: string): Observable<{ error: boolean; respuesta: ChatDTO[] }> {
    return this.http.get<{ error: boolean; respuesta: ChatDTO[] }>(
      `${this.API_URL}/usuario/${usuarioId}/conversaciones`
    );
  }

  /**
   * GET /api/chat/usuario/{id}/mensajes-no-leidos
   * Obtiene la cantidad de mensajes no leídos
   */
  obtenerMensajesNoLeidos(usuarioId: string): Observable<{ error: boolean; respuesta: number }> {
    return this.http.get<{ error: boolean; respuesta: number }>(
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
  ): Observable<{ error: boolean; respuesta: string }> {
    const params = new HttpParams().set('usuarioId', usuarioId);

    return this.http.put<{ error: boolean; respuesta: string }>(
      `${this.API_URL}/${chatId}/marcar-leido`,
      null,
      { params }
    );
  }
}
