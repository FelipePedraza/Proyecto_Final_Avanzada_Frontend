import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, filter } from 'rxjs';

// Servicios
import { ChatService } from '../../services/chat-service';
import { TokenService } from '../../services/token-service';
import { UsuarioService } from '../../services/usuario-service';
import { WebSocketService } from '../../services/websocket-service';
import { FechaService } from '../../services/fecha-service';

// Modelos
import { ChatDTO, MensajeDTO } from '../../models/chat-dto';
import { UsuarioDTO } from '../../models/usuario-dto';

@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css'
})
export class Chat implements OnInit, OnDestroy, AfterViewChecked {
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
  conectado: boolean = false;
  mostrarListaConversaciones: boolean = true;

  // Control de scroll
  private shouldScrollToBottom = false;

  // Destinatario específico
  destinatarioId?: string;

  private destroy$ = new Subject<void>();

  // ==================== CONSTRUCTOR ====================
  constructor(
    private chatService: ChatService,
    private tokenService: TokenService,
    private usuarioService: UsuarioService,
    private webSocketService: WebSocketService,
    private route: ActivatedRoute,
    private location: Location,
    public fechaService: FechaService,
    private router: Router
  ) {}

  // ==================== CICLO DE VIDA ====================

  ngOnInit(): void {
    this.usuarioActualId = this.tokenService.getUserId();

    if (!this.tokenService.isLogged()) {
      this.router.navigate(['/login'])
      return;
    }

    // Obtener destinatario de query params
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['destinatarioId']) {
          this.destinatarioId = params['destinatarioId'];
        }
      });

    // Suscribirse primero al WebSocket
    this.suscribirseAWebSocket();

    // Cargar datos
    this.cargarUsuarioActual();
    this.cargarConversaciones();

    // Conectar WebSocket
    this.webSocketService.conectar(this.destinatarioId || null);
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // NO desconectamos el WebSocket aquí para mantener la conexión persistente
  }

  // ==================== SUSCRIPCIONES ====================

  /**
   * Suscribe a los eventos del WebSocket
   */
  private suscribirseAWebSocket(): void {
    // Estado de conexión
    this.webSocketService.estadoConexion$
      .pipe(takeUntil(this.destroy$))
      .subscribe(estado => {
        this.conectado = estado;
        console.log('Estado WebSocket:', estado ? 'Conectado' : 'Desconectado');
      });

    // Mensajes entrantes (filtrar nulls)
    this.webSocketService.mensajesRecibidos$
      .pipe(
        takeUntil(this.destroy$),
        filter(mensaje => mensaje !== null)
      )
      .subscribe(mensaje => {
        this.procesarMensajeEntrante(mensaje!);
      });
  }

  /**
   * Procesa un mensaje entrante del WebSocket
   */
  private procesarMensajeEntrante(mensajeDTO: MensajeDTO): void {
    console.log('Procesando mensaje entrante:', mensajeDTO);

    // Si estamos en el chat correcto o es un chat nuevo
    if (this.chatActual &&
      (mensajeDTO.chatId === this.chatActual.id || this.chatActual.id === 0)) {

      // Actualizar ID del chat si era nuevo
      if (this.chatActual.id === 0 && mensajeDTO.chatId > 0) {
        this.chatActual.id = mensajeDTO.chatId;
      }

      // Verificar si el mensaje ya existe (evitar duplicados)
      const yaExiste = this.mensajes.some(m =>
        m.id === mensajeDTO.id ||
        (m.contenido === mensajeDTO.contenido &&
          Math.abs(new Date(m.fechaEnvio).getTime() - new Date(mensajeDTO.fechaEnvio).getTime()) < 1000)
      );

      if (!yaExiste) {
        this.mensajes = [...this.mensajes, mensajeDTO];
        this.shouldScrollToBottom = true;
      }

      // Marcar como leído si no es nuestro mensaje
      if (mensajeDTO.remitenteId !== this.usuarioActualId && !mensajeDTO.leido) {
        this.marcarChatComoLeido(this.chatActual.id);
      }
    } else {
      // Mensaje de otro chat - recargar lista de conversaciones
      this.cargarConversaciones();
    }
    this.actualizarListaConversaciones();
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

            // Si hay un destinatario en la URL
            if (this.destinatarioId) {
              this.buscarOIniciarConversacion(this.destinatarioId);
              // Limpiar query param
              this.router.navigate([], {
                relativeTo: this.route,
                queryParams: { destinatarioId: null },
                queryParamsHandling: 'merge'
              });
            } else if (this.conversaciones.length > 0 && !this.chatActual) {
              // Seleccionar primer chat si no hay ninguno seleccionado
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

    // Cargar mensajes no leídos
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

  private actualizarListaConversaciones(): void {
    this.chatService.listarConversaciones(this.usuarioActualId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (respuesta) => {
          if (!respuesta.error) {
            this.conversaciones = respuesta.data;
            this.actualizarContadorNoLeidos();
          }
        },
        error: (error) => {
          console.error('Error al actualizar conversaciones:', error);
        }
      });
  }


  /**
   * Actualiza el contador de mensajes no leídos
   */
  private actualizarContadorNoLeidos(): void {
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
      this.iniciarNuevoChat(destinatarioId);
    }
  }

  private iniciarNuevoChat(destinatarioId: string): void {
    this.usuarioService.obtener(destinatarioId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (respuesta) => {
          if (!respuesta.error) {
            const destinatario = respuesta.data;
            this.chatActual = {
              id: 0, // Chat nuevo
              usuario1: this.usuarioActual!,
              usuario2: destinatario,
              mensajes: [],
              creadoEn: new Date(),
              activo: true
            };
            this.mensajes = [];
            this.mostrarListaConversaciones = false;
            this.shouldScrollToBottom = true;
          }
        },
        error: (error) => console.error('Error al cargar destinatario:', error)
      });
  }

  seleccionarChat(chat: ChatDTO): void {
    this.chatActual = chat;
    this.mostrarListaConversaciones = false;
    this.cargarMensajesChat(chat.id);
    this.marcarChatComoLeido(chat.id);
  }

  private cargarMensajesChat(chatId: number): void {
    this.cargandoMensajes = true;

    this.chatService.obtenerChat(chatId, 0, 50)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (respuesta) => {
          if (!respuesta.error) {
            const chat = respuesta.data as ChatDTO;
            this.mensajes = chat.mensajes || [];
            this.shouldScrollToBottom = true;
          }
          this.cargandoMensajes = false;
        },
        error: (error) => {
          console.error('Error al cargar mensajes:', error);
          this.cargandoMensajes = false;
        }
      });
  }

  private marcarChatComoLeido(chatId: number): void {
    this.chatService.marcarChatComoLeido(chatId, this.usuarioActualId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Actualizar contador de no leídos
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

  // ==================== ENVÍO DE MENSAJES ====================

  enviarMensaje(): void {
    if (!this.nuevoMensaje.trim() || !this.chatActual) {
      return;
    }

    if (!this.conectado) {
      console.error('No conectado a WebSocket');
      return;
    }

    const destinatarioId = this.obtenerDestinatarioId();
    const contenido = this.nuevoMensaje.trim();

    const mensajePayload = {
      destinatarioId: destinatarioId,
      contenido: contenido,
      chatId: this.chatActual.id || 0
    };

    // Agregar mensaje optimísticamente (aparecerá inmediatamente)
    const mensajeTemporal: MensajeDTO = {
      id: Date.now(), // ID temporal
      remitenteId: this.usuarioActualId,
      destinatarioId: destinatarioId,
      chatId: this.chatActual.id,
      contenido: contenido,
      fechaEnvio: new Date(),
      leido: false
    };

    this.nuevoMensaje = '';
    this.shouldScrollToBottom = true;

    // Enviar por WebSocket
    this.webSocketService.enviarMensaje(mensajePayload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('Mensaje enviado correctamente');
        },
        error: (error) => {
          console.error('Error al enviar mensaje:', error);
          // Remover el mensaje temporal en caso de error
          this.mensajes = this.mensajes.filter(m => m.id !== mensajeTemporal.id);
        }
      });
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

  obtenerIniciales(nombre: string): string {
    if (!nombre) return '?';
    return nombre.charAt(0).toUpperCase();
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.error('Error al hacer scroll:', err);
    }
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

  volver(): void {
    this.location.back();
  }
}
