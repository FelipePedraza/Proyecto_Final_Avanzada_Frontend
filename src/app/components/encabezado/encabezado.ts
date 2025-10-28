import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { UsuarioService } from '../../services/usuario-service';
import { UsuarioDTO } from '../../models/usuario-dto';
import { TokenService} from '../../services/token-service';

@Component({
  selector: 'app-encabezado',
  imports: [RouterLink, CommonModule],
  templateUrl: './encabezado.html',
  styleUrl: './encabezado.css'
})
export class Encabezado implements OnInit, OnDestroy {
  // ==================== PROPIEDADES ====================

  estaAutenticado = false;
  usuario: UsuarioDTO | null = null;
  cargandoUsuario = false;
  mostrarMenuUsuario = false;
  email: string = "";

  private destroy$ = new Subject<void>();

  // ==================== CONSTRUCTOR ====================

  constructor(
    private tokenService: TokenService,
    private usuarioService: UsuarioService,
    private router: Router
  ) {
    this.estaAutenticado = this.tokenService.isLogged();
    if (this.estaAutenticado) {
      this.email = this.tokenService.getEmail();
    }
  }

  // ==================== CICLO DE VIDA ====================

  ngOnInit(): void {
    this.verificarAutenticacion();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== LISTENER PARA CERRAR MENÚ AL HACER CLICK FUERA ====================

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const clickedInside = target.closest('.user-menu-container');

    if (!clickedInside && this.mostrarMenuUsuario) {
      this.mostrarMenuUsuario = false;
    }
  }

  // ==================== AUTENTICACIÓN ====================

  private verificarAutenticacion(): void {
    this.estaAutenticado = this.tokenService.isLogged();

    if (this.estaAutenticado) {
      this.cargarDatosUsuario();
    }
  }

  private cargarDatosUsuario(): void {

    this.cargandoUsuario = true;

    this.usuarioService.obtener(this.tokenService.getUserId())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (respuesta) => {
          if (!respuesta.error) {
            this.usuario = respuesta.data;
          } else {
            console.error('Error al obtener usuario');
          }
          this.cargandoUsuario = false;
        },
        error: (error) => {
          console.error('Error al cargar datos del usuario:', error);
          this.cargandoUsuario = false;
        }
      });
  }

  // ==================== ACCIONES DE MENÚ ====================

  toggleMenuUsuario(): void {
    this.mostrarMenuUsuario = !this.mostrarMenuUsuario;
  }

  cerrarMenuUsuario(): void {
    this.mostrarMenuUsuario = false;
  }

  // ==================== ACCIONES ====================

  cerrarSesion(): void {
    this.cerrarMenuUsuario();

    Swal.fire({
      title: '¿Cerrar sesión?',
      text: '¿Estás seguro de que deseas cerrar sesión?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, cerrar sesión',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2e8b57',
      cancelButtonColor: '#95a5a6'
    }).then((result) => {
      if (result.isConfirmed) {
        this.tokenService.logout();
        this.estaAutenticado = false;
        this.usuario = null;
        this.router.navigate(['/']);

        Swal.fire({
          title: 'Sesión cerrada',
          text: 'Has cerrado sesión correctamente',
          icon: 'success',
          confirmButtonColor: '#2e8b57',
          timer: 2000,
          timerProgressBar: true
        });
      }
    });
  }

  irAPerfil(): void {
    this.cerrarMenuUsuario();
    this.router.navigate(['/editar-perfil']);
  }

  // ==================== UTILIDADES ====================

  obtenerIniciales(): string {
    if (!this.usuario) return 'U';
    return this.usuario.nombre.charAt(0).toUpperCase();
  }
}
