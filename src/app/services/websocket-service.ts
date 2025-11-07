import {Injectable, NgZone} from '@angular/core';
import { Client, Message, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { BehaviorSubject, Subject } from 'rxjs';

// Servicios
import { TokenService } from './token-service';
// Modelos
import { MensajeDTO} from '../models/chat-dto';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {

  // ==================== PROPIEDADES ====================
  private stompClient?: Client;
  private subscription?: StompSubscription;

  // Subjects para exponer datos y estado
  private mensajesSubject = new Subject<MensajeDTO>();
  private estadoConexionSubject = new BehaviorSubject<boolean>(false);

  // Observables públicos para que los componentes se suscriban
  public mensajesRecibidos$ = this.mensajesSubject.asObservable();
  public estadoConexion$ = this.estadoConexionSubject.asObservable();

  // ==================== CONSTRUCTOR ====================
  constructor(
    private tokenService: TokenService,
    private zone: NgZone
  ) { }

  // ==================== GESTIÓN DE CONEXIÓN ====================

  /**
   * Se conecta al WebSocket usando el ID de usuario y un destinatarioId opcional (para el .join)
   */
  conectar(usuarioId: string, destinatarioIdUrl: string | null = null): void {

    // Evitar reconexiones si ya está conectado
    if (this.estadoConexionSubject.value && this.stompClient) {
      console.log('STOMP: Ya conectado');
      return;
    }

    const token = this.tokenService.getToken();

    if (!token) {
      console.error('No hay token disponible para WebSocket');
      return;
    }

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(`http://localhost:8080/ws?token=${token}`),
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: (str) => {
        console.log('STOMP Debug:', str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.stompClient.onConnect = () => {
      this.zone.run(() => {
        console.log('Conectado a WebSocket');
        this.estadoConexionSubject.next(true);
      });
      // Suscribirse a mensajes privados
      // Coincide con /user/{id}/queue/private
      this.subscription = this.stompClient!.subscribe(
        `/user/${usuarioId}/queue/private`,
        (message: Message) => {
          this.zone.run(() => {
            this.onMensajeRecibido(message);
          });
        }
      );

      // Suscribirse a errores
      // Coincide con /user/{id}/queue/errors
      this.stompClient!.subscribe(
        `/user/${usuarioId}/queue/errors`,
        (message: Message) => {
          this.zone.run(() => {
            console.error('Error del servidor (WS):', message.body);
          });
        }
      );

      // Notificar conexión al servidor
      // Coincide con /app/chat.join
      this.stompClient!.publish({
        destination: '/app/chat.join',
        body: JSON.stringify({
          destinatarioId: destinatarioIdUrl || ''
        })
      });
    };

    this.stompClient.onStompError = (frame) => {
      this.zone.run(() => {
        console.error('Error STOMP:', frame);
        this.estadoConexionSubject.next(false);
      });
    };

    this.stompClient.onWebSocketClose = () => {
      this.zone.run(() => {
        console.log('WebSocket cerrado');
        this.estadoConexionSubject.next(false);
      });
    };

    this.stompClient.activate();
  }

  /**s
   * Desconecta el cliente STOMP.
   */
  desconectar(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    if (this.stompClient && this.stompClient.connected) {
      // Coincide con /app/chat.leave
      this.stompClient.publish({
        destination: '/app/chat.leave'
      });
      this.stompClient.deactivate();
    }

    this.estadoConexionSubject.next(false);
    console.log('WebSocket desconectado');
  }

  // ==================== INTERACCIÓN ====================

  /**
   * Procesa un mensaje crudo de STOMP y lo emite a los suscriptores.
   */
  private onMensajeRecibido(message: Message): void {
    try {
      const mensajeDTO: MensajeDTO = JSON.parse(message.body);
      // Emitir el mensaje parseado
      this.mensajesSubject.next(mensajeDTO);
    } catch (error) {
      console.error('Error al procesar mensaje:', error);
    }
  }

  /**
   * Envía un payload de mensaje al destino /app/chat.sendMessage
   */
  enviarMensaje(payload: any): void {
    if (!this.stompClient || !this.stompClient.connected) {
      console.error('No se puede enviar mensaje, no conectado a WebSocket');
      return;
    }

    // Enviar mensaje por WebSocket
    // Coincide con /app/chat.sendMessage
    this.stompClient.publish({
      destination: '/app/chat.sendMessage',
      body: JSON.stringify(payload)
    });
  }
}
