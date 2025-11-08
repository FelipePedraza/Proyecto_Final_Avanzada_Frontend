import { Injectable, OnDestroy } from '@angular/core';
import { Client, Message, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { BehaviorSubject, Observable } from 'rxjs';
import { TokenService } from './token-service';
import { MensajeDTO } from '../models/chat-dto';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  // ==================== PROPIEDADES ====================
  private stompClient?: Client;
  private subscription?: StompSubscription;
  private errorSubscription?: StompSubscription;

  // Estado de conexión reactivo
  private estadoConexionSubject = new BehaviorSubject<boolean>(false);
  public estadoConexion$ = this.estadoConexionSubject.asObservable();

  // Mensajes entrantes reactivos
  private mensajesSubject = new BehaviorSubject<MensajeDTO | null>(null);
  public mensajesRecibidos$ = this.mensajesSubject.asObservable();

  // ==================== CONSTRUCTOR ====================
  constructor(private tokenService: TokenService) {}

  // ==================== GESTIÓN DE CONEXIÓN ====================

  /**
   * Conecta al WebSocket. Solo conecta si no está ya conectado.
   */
  conectar( destinatarioIdUrl: string | null = null): void {
    // Evitar reconexiones
    if (this.isConnected()) {
      console.log('WebSocket ya conectado');
      return;
    }

    const token = this.tokenService.getToken();
    if (!token) {
      console.error('No hay token disponible para WebSocket');
      return;
    }

    console.log('Iniciando conexión WebSocket...');

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(`http://localhost:8080/ws?token=${token}`),
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: (str) => console.log('STOMP:', str),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    // Configurar callbacks
    this.stompClient.onConnect = () => this.onConectado(destinatarioIdUrl);
    this.stompClient.onStompError = (frame) => this.onError(frame);
    this.stompClient.onWebSocketClose = () => this.onDesconectado();

    // Activar conexión
    this.stompClient.activate();
  }

  /**
   * Callback cuando se establece la conexión
   */
  private onConectado( destinatarioIdUrl: string | null): void {
    console.log('WebSocket conectado');
    this.estadoConexionSubject.next(true);

    // Suscribirse a mensajes privados
    this.subscription = this.stompClient!.subscribe(
      `/user/queue/private`,
      (message: Message) => this.procesarMensaje(message)
    );

    // Suscribirse a errores
    this.errorSubscription = this.stompClient!.subscribe(
      `/user/queue/errors`,
      (message: Message) => {
        console.error('Error del servidor:', message.body);
      }
    );

    // Notificar al servidor que el usuario está conectado
    this.enviarNotificacionConexion(destinatarioIdUrl);
  }

  /**
   * Procesa un mensaje recibido del WebSocket
   */
  private procesarMensaje(message: Message): void {
    try {
      const mensajeDTO: MensajeDTO = JSON.parse(message.body);
      console.log('Mensaje recibido:', mensajeDTO);

      // Emitir el mensaje a todos los suscriptores
      this.mensajesSubject.next(mensajeDTO);
    } catch (error) {
      console.error('Error al procesar mensaje:', error);
    }
  }

  /**
   * Callback cuando hay un error STOMP
   */
  private onError(frame: any): void {
    console.error('Error STOMP:', frame);
    this.estadoConexionSubject.next(false);
  }

  /**
   * Callback cuando se cierra la conexión
   */
  private onDesconectado(): void {
    console.log('WebSocket desconectado');
    this.estadoConexionSubject.next(false);
  }

  /**
   * Notifica al servidor que el usuario se ha conectado
   */
  private enviarNotificacionConexion(destinatarioIdUrl: string | null): void {
    if (!this.stompClient?.connected) return;

    this.stompClient.publish({
      destination: '/app/chat.join',
      body: JSON.stringify({
        destinatarioId: destinatarioIdUrl || ''
      })
    });
  }

  // ==================== ENVÍO DE MENSAJES ====================

  /**
   * Envía un mensaje a través del WebSocket
   */
  enviarMensaje(payload: {
    destinatarioId: string;
    contenido: string;
    chatId: number;
  }): Observable<boolean> {
    return new Observable((observer) => {
      if (!this.stompClient?.connected) {
        console.error('No conectado a WebSocket');
        observer.error('No conectado');
        observer.complete();
        return;
      }

      try {
        this.stompClient.publish({
          destination: '/app/chat.sendMessage',
          body: JSON.stringify(payload)
        });

        console.log('Mensaje enviado:', payload);
        observer.next(true);
        observer.complete();
      } catch (error) {
        console.error('Error al enviar mensaje:', error);
        observer.error(error);
        observer.complete();
      }
    });
  }

  // ==================== UTILIDADES ====================

  /**
   * Verifica si el WebSocket está conectado
   */
  isConnected(): boolean {
    return this.stompClient?.connected || false;
  }

  /**
   * Desconecta el WebSocket
   */
  desconectar(): void {
    if (!this.stompClient) return;

    console.log('Desconectando WebSocket...');

    // Desuscribirse
    this.subscription?.unsubscribe();
    this.errorSubscription?.unsubscribe();

    // Notificar al servidor
    if (this.stompClient.connected) {
      try {
        this.stompClient.publish({
          destination: '/app/chat.leave'
        });
      } catch (error) {
        console.error('Error al notificar desconexión:', error);
      }
    }

    // Desactivar cliente
    this.stompClient.deactivate();
    this.estadoConexionSubject.next(false);
  }

  // ==================== LIFECYCLE ====================

  ngOnDestroy(): void {
    this.desconectar();
  }
}
