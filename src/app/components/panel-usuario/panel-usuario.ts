import { Component} from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { UsuarioService } from '../../services/usuario-service';
import { AuthService } from '../../services/auth-service';
import { UsuarioDTO } from '../../models/usuario-dto';

@Component({
  selector: 'app-panel-usuario',
  imports: [RouterLink, CommonModule],
  templateUrl: './panel-usuario.html',
  styleUrl: './panel-usuario.css'
})
export class PanelUsuario {
  usuario: UsuarioDTO | null = null;
  cargando = false;

  private destroy$ = new Subject<void>();

  constructor(
    private usuarioService: UsuarioService,
    private authService: AuthService,
    private router: Router
  ) {
    this.cargarUsuario()
  }


  private cargarUsuario(): void {
    // TODO: Obtener el ID del usuario autenticado desde el token
    // Por ahora usamos un ID de ejemplo
    const usuarioId = this.obtenerIdUsuarioAutenticado();

    if (!usuarioId) {
      this.router.navigate(['/login']);
      return;
    }

    this.cargando = true;

    this.usuarioService.obtener(usuarioId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (!response.error) {
            this.usuario = response.respuesta;
          }
          this.cargando = false;
        },
        error: (error) => {
          console.error('Error al cargar usuario:', error);
          this.cargando = false;
        }
      });
  }

  cerrarSesion(): void {
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
        this.authService.cerrarSesion();
        this.router.navigate(['/login']);
      }
    });
  }

  private obtenerIdUsuarioAutenticado(): string | null {
    // TODO: Implementar obtención del ID del usuario desde el token JWT
    // Por ahora retornamos null para forzar el login
    return null;
  }

  obtenerIniciales(): string {
    if (!this.usuario) return 'U';
    return this.usuario.nombre.charAt(0).toUpperCase();
  }

  obtenerAnioRegistro(): number {
    if (!this.usuario) return new Date().getFullYear();
    return new Date().getFullYear();
  }
}
