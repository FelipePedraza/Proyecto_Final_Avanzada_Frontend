import {Component, OnInit, OnDestroy, ViewChild, ElementRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// Servicios
import { ChatService } from '../../services/chat-service';
import { TokenService } from '../../services/token-service';
import { UsuarioService } from '../../services/usuario-service';
import { WebSocketService } from '../../services/websocket-service';

// Modelos
import { ChatDTO, MensajeDTO } from '../../models/chat-dto';
import { UsuarioDTO } from '../../models/usuario-dto';

@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css'
})
export class Chat implements OnInit, OnDestroy {

  // ==================== PROPIEDADES ====================
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  // Usuario actual
  usuarioActual?: UsuarioDTO;
  usuarioActualId: string = '';

  // Conversaciones y mensajes
  conversaciones: ChatDTO[] = [];
  chatActual?: ChatDTO;
  mensajes: MensajeDTO[] = [];
  mensajesNoLeidos: number = 0;

  // UI
  nuevoMensaje: string = '';
  cargando: boolean = false;
  cargandoMensajes: boolean = false;
  conectado: boolean = false; //
  mostrarListaConversaciones: boolean = true;

  // Destinatario específico (cuando se viene desde otra página)
  destinatarioId?: string;

  private destroy$ = new Subject<void>();

  // ==================== CONSTRUCTOR ====================
  constructor(
    private chatService: ChatService,
    private tokenService: TokenService,
    private usuarioService: UsuarioService,
    private webSocketService: WebSocketService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  // ==================== CICLO DE VIDA ====================
  ngOnInit(): void {
    this.usuarioActualId = this.tokenService.getUserId();

    if (!this.tokenService.isLogged()) {
      this.router.navigate(['/login']);
      return;
    }

    // Verificar si hay un destinatario en los query params
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['destinatarioId']) {
          this.destinatarioId = params['destinatarioId'];
        }
      });

    // Suscribirse al estado y mensajes del WebSocketService
    this.suscribirseAWebSocket();

    this.cargarUsuarioActual();
    this.cargarConversaciones();

    // Conectar el WebSocket
    // Pasamos el destinatarioId por si es el primer 'join'
    this.webSocketService.conectar(this.usuarioActualId, this.destinatarioId || null);
  }

  ngOnDestroy(): void {
    // Ya NO desconectamos el WebSocket aquí. La conexión persiste.
    // Solo nos desuscribimos de los observables.
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== CARGA DE DATOS ====================

  private cargarUsuarioActual(): void {
    this.usuarioService.obtener(this.usuarioActualId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (respuesta) => {
          if (!respuesta.error) {
            this.usuarioActual = respuesta.data;
          }
        },
        error: (error) => console.error('Error al cargar usuario:', error)
      });
  }

  private cargarConversaciones(): void {
    this.cargando = true;

    this.chatService.listarConversaciones(this.usuarioActualId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (respuesta) => {
          if (!respuesta.error) {
            this.conversaciones = respuesta.data;

            if (this.destinatarioId) {
              this.buscarOIniciarConversacion(this.destinatarioId);
              this.router.navigate([], {
                relativeTo: this.route,
                queryParams: { destinatarioId: null },
                queryParamsHandling: 'merge'
              });
            } else if (this.conversaciones.length > 0) {
              this.seleccionarChat(this.conversaciones[0]);
            }
          }
          this.cargando = false;
        },
        error: (error) => {
          console.error('Error al cargar conversaciones:', error);
          this.cargando = false;
        }
      });

    this.chatService.obtenerMensajesNoLeidos(this.usuarioActualId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (respuesta) => {
          if (!respuesta.error) {
            this.mensajesNoLeidos = respuesta.data;
          }
        },
        error: (error) => console.error('Error al cargar mensajes no leídos:', error)
      });
  }

  private buscarOIniciarConversacion(destinatarioId: string): void {
    const conversacionExistente = this.conversaciones.find(c =>
      c.usuario1.id === destinatarioId || c.usuario2.id === destinatarioId
    );

    if (conversacionExistente) {
      this.seleccionarChat(conversacionExistente);
    } else {
      this.usuarioService.obtener(destinatarioId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (respuesta) => {
            if (!respuesta.error) {
              const destinatario = respuesta.data;
              this.chatActual = {
                id: 0,
                usuario1: this.usuarioActual!,
                usuario2: destinatario,
                mensajes: [],
                creadoEn: new Date(),
                activo: true
              };
              this.mensajes = [];
              this.mostrarListaConversaciones = false;
            }
          },
          error: (error) => console.error('Error al cargar destinatario:', error)
        });
    }
  }

  seleccionarChat(chat: ChatDTO): void {
    this.chatActual = chat;
    this.mostrarListaConversaciones = false;
    this.cargarMensajesChat(chat.id);

    this.chatService.marcarChatComoLeido(chat.id, this.usuarioActualId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.chatService.obtenerMensajesNoLeidos(this.usuarioActualId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (respuesta) => {
                if (!respuesta.error) {
                  this.mensajesNoLeidos = respuesta.data;
                }
              }
            });
        },
        error: (error) => console.error('Error al marcar como leído:', error)
      });
  }

  private cargarMensajesChat(chatId: number): void {
    this.cargandoMensajes = true;

    this.chatService.obtenerChat(chatId, 0, 50)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (respuesta) => {
          if (!respuesta.error) {
            const chat = respuesta.data as ChatDTO;
            this.mensajes = chat.mensajes;
            this.scrollToBottom();
          }
          this.cargandoMensajes = false;
        },
        error: (error) => {
          console.error('Error al cargar mensajes:', error);
          this.cargandoMensajes = false;
        }
      });
  }

  // ==================== WEBSOCKET ====================

  /**
   * Se suscribe a los Observables del WebSocketService
   */
  private suscribirseAWebSocket(): void {
    // Suscribirse al estado de la conexión
    this.webSocketService.estadoConexion$
      .pipe(takeUntil(this.destroy$))
      .subscribe(estado => {
        this.conectado = estado;
      });

    // Suscribirse a los mensajes entrantes
    this.webSocketService.mensajesRecibidos$
      .pipe(takeUntil(this.destroy$))
      .subscribe(mensaje => {
        this.onMensajeRecibido(mensaje);
      });
  }

  /**
   * Ahora recibe un MensajeDTO ya procesado desde el servicio.
   */
  private onMensajeRecibido(mensajeDTO: MensajeDTO): void {
    // La lógica interna es la misma que tenías en el 'try'
    if (this.chatActual && (mensajeDTO.chatId === this.chatActual.id || this.chatActual.id === 0)) {

      if (this.chatActual.id === 0 && mensajeDTO.chatId > 0) {
        this.chatActual.id = mensajeDTO.chatId;
      }

      this.mensajes = [...this.mensajes, mensajeDTO];
      this.scrollToBottom();

      if (mensajeDTO.remitenteId !== this.usuarioActualId) {
        this.chatService.marcarChatComoLeido(this.chatActual.id, this.usuarioActualId)
          .pipe(takeUntil(this.destroy$))
          .subscribe();
      }
    }

    if (!this.chatActual || mensajeDTO.chatId !== this.chatActual.id) {
      this.cargarConversaciones();
    }
  }

  // ==================== ENVÍO DE MENSAJES ====================

  enviarMensaje(): void {
    if (!this.nuevoMensaje.trim() || !this.chatActual) {
      return;
    }

    // Aún validamos si la UI debe mostrar el estado 'conectado'
    if (!this.conectado) {
      console.error('No conectado a WebSocket');
      return;
    }

    const destinatarioId = this.obtenerDestinatarioId();

    const mensajePayload = {
      destinatarioId: destinatarioId,
      contenido: this.nuevoMensaje.trim(),
      chatId: this.chatActual.id || 0
    };

    // Usamos el servicio para enviar el mensaje
    this.webSocketService.enviarMensaje(mensajePayload);

    this.nuevoMensaje = '';
  }

  // ==================== UTILIDADES ====================

  obtenerDestinatarioId(): string {
    if (!this.chatActual) return '';

    return this.chatActual.usuario1.id === this.usuarioActualId
      ? this.chatActual.usuario2.id
      : this.chatActual.usuario1.id;
  }

  obtenerDestinatario(): UsuarioDTO | undefined {
    if (!this.chatActual) return undefined;

    return this.chatActual.usuario1.id === this.usuarioActualId
      ? this.chatActual.usuario2
      : this.chatActual.usuario1;
  }

  esMensajePropio(mensaje: MensajeDTO): boolean {
    return mensaje.remitenteId === this.usuarioActualId;
  }

  formatearHora(fecha: Date | string): string {
    const f = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return f.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  obtenerIniciales(nombre: string): string {
    if (!nombre) return '?';
    return nombre.charAt(0).toUpperCase();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      try {
        if (this.messagesContainer) {
          this.messagesContainer.nativeElement.scrollTop =
            this.messagesContainer.nativeElement.scrollHeight;
        }
      } catch(err) {
        console.error("Error al hacer scroll", err);
      }
    }, 100);
  }

  volverALista(): void {
    this.mostrarListaConversaciones = true;
    this.chatActual = undefined;
    this.mensajes = [];
  }

  obtenerUltimoMensajePreview(chat: ChatDTO): string {
    if (!chat.ultimoMensaje) return 'No hay mensajes';

    const preview = chat.ultimoMensaje.contenido;
    return preview.length > 50 ? preview.substring(0, 50) + '...' : preview;
  }

  obtenerOtroUsuario(chat: ChatDTO): UsuarioDTO {
    return chat.usuario1.id === this.usuarioActualId
      ? chat.usuario2
      : chat.usuario1;
  }
}
