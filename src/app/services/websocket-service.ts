import { Injectable, OnDestroy } from '@angular/core';
import { Client, Message, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { BehaviorSubject, Observable, ReplaySubject } from 'rxjs';
import { TokenService } from './token-service';
import { MensajeDTO } from '../models/chat-dto';
import {environment} from '../../environments/environment';

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

  // Mantiene los últimos 50 mensajes
  private mensajesSubject = new ReplaySubject<MensajeDTO>(50);
  public mensajesRecibidos$ = this.mensajesSubject.asObservable();

  // Cola de mensajes pendientes
  private mensajesPendientes: any[] = [];

  // Control de reconexión
  private reconectando = false;
  private intentosReconexion = 0;
  private timerReconexion?: any;
  private readonly MAX_INTENTOS_RECONEXION = environment.wsMaxReconnectAttempts;
  private readonly RECONNECT_DELAY = environment.wsReconnectDelay;

  // ==================== CONSTRUCTOR ====================
  constructor(private tokenService: TokenService) {}

  // ==================== GESTIÓN DE CONEXIÓN ====================

  /**
   * Conecta al WebSocket con retry automático
   */
  conectar(destinatarioIdUrl: string | null = null): void {
    // Evitar reconexiones si ya está conectado
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
      webSocketFactory: () => new SockJS(`${environment.wsUrl}?token=${token}`),
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: (str) => {
        // Comentar en producción
        console.log('STOMP:', str);
      },
      reconnectDelay: this.RECONNECT_DELAY,
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
  private onConectado(destinatarioIdUrl: string | null): void {
    console.log('WebSocket conectado exitosamente');
    this.estadoConexionSubject.next(true);

    // Resetear intentos de reconexión
    this.intentosReconexion = 0;
    this.reconectando = false;

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
    this.procesarMensajesPendientes();
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

  private onError(frame: any): void {
    console.error('Error STOMP:', frame);
    this.estadoConexionSubject.next(false);
  }

  private onDesconectado(): void {
    console.log('WebSocket desconectado');
    this.estadoConexionSubject.next(false);

    this.intentarReconexion();
  }


  private intentarReconexion(destinatarioId: string | null = null): void {
    // No reconectar si:
    // - Ya está reconectando
    // - Se alcanzó el máximo de intentos
    // - El token expiró
    if (this.reconectando ||
      this.intentosReconexion >= this.MAX_INTENTOS_RECONEXION ||
      !this.tokenService.isLogged()) {
      if (this.intentosReconexion >= this.MAX_INTENTOS_RECONEXION) {
        console.error('Máximo de intentos de reconexión alcanzado');
      }
      return;
    }

    this.reconectando = true;
    this.intentosReconexion++;

    // Backoff exponencial: 2s, 4s, 8s, 16s, 32s
    const delay = Math.min(2000 * Math.pow(2, this.intentosReconexion - 1), 32000);

    console.log(`Reintentando conexión en ${delay/1000}s (intento ${this.intentosReconexion}/${this.MAX_INTENTOS_RECONEXION})...`);

    this.timerReconexion = setTimeout(() => {
      this.conectar(destinatarioId);
    }, delay);
  }

  /**
   * Notifica al servidor que el usuario se ha conectado
   */
  private enviarNotificacionConexion(destinatarioIdUrl: string | null): void {
    if (!this.stompClient?.connected) return;

    try {
      this.stompClient.publish({
        destination: '/app/chat.join',
        body: JSON.stringify({
          destinatarioId: destinatarioIdUrl || ''
        })
      });
      console.log('Notificación de conexión enviada');
    } catch (error) {
      console.error('Error al enviar notificación de conexión:', error);
    }
  }

  // ==================== ENVÍO DE MENSAJES ====================

  /**
   * Envía un mensaje a través del WebSocket
   * Si no está conectado, lo agrega a la cola de pendientes
   */
  enviarMensaje(payload: {
    destinatarioId: string;
    contenido: string;
    chatId: number;
  }): Observable<boolean> {
    return new Observable((observer) => {
      if (!this.stompClient?.connected) {
        console.warn('No conectado. Agregando mensaje a cola pendiente...');

        this.mensajesPendientes.push(payload);

        // Intentar reconectar
        this.conectar();

        observer.next(true);
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

        this.mensajesPendientes.push(payload);

        observer.error(error);
        observer.complete();
      }
    });
  }

  private procesarMensajesPendientes(): void {
    if (this.mensajesPendientes.length === 0) return;

    console.log(`Enviando ${this.mensajesPendientes.length} mensajes pendientes...`);

    while (this.mensajesPendientes.length > 0) {
      const mensaje = this.mensajesPendientes.shift();
      this.enviarMensaje(mensaje).subscribe({
        next: () => console.log('Mensaje pendiente enviado'),
        error: (err) => {
          console.error('Error enviando mensaje pendiente:', err);
          // Volver a agregar a la cola si falla
          this.mensajesPendientes.unshift(mensaje);
        }
      });
    }
  }

  // ==================== UTILIDADES ====================

  /**
   * Verifica si el WebSocket está conectado
   */
  isConnected(): boolean {
    return this.stompClient?.connected || false;
  }

  /**
   * Obtiene el número de mensajes pendientes
   */
  getMensajesPendientes(): number {
    return this.mensajesPendientes.length;
  }

  /**
   * Limpia la cola de mensajes pendientes
   */
  limpiarMensajesPendientes(): void {
    this.mensajesPendientes = [];
  }

  /**
   * Desconecta el WebSocket
   */
  desconectar(): void {
    if (!this.stompClient) return;

    console.log('Desconectando WebSocket...');

    // Limpiar timer de reconexión
    if (this.timerReconexion) {
      clearTimeout(this.timerReconexion);
      this.timerReconexion = undefined;
    }

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

    // Resetear estado
    this.reconectando = false;
    this.intentosReconexion = 0;
  }

  /**
   * Resetea el servicio completamente
   */
  resetear(): void {
    this.desconectar();
    this.limpiarMensajesPendientes();
    this.mensajesSubject = new ReplaySubject<MensajeDTO>(50);
  }

  // ==================== LIFECYCLE ====================

  ngOnDestroy(): void {
    this.desconectar();
  }
}
