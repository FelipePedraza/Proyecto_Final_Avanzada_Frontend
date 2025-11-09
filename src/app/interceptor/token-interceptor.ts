import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { TokenService } from '../services/token-service';
import { AuthService } from '../services/auth-service';
import { catchError, switchMap, throwError } from 'rxjs';
import { Router } from '@angular/router';

let isRefreshing = false;

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Si no hay token o es la ruta de refresh, continuar
  if (!tokenService.isLogged() || req.url.includes('/api/auth/refresh')) {
    return next(req);
  }

  // Agregar token a la request
  const token = tokenService.getToken();
  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {

      // Si es 401 (Unauthorized), intentar renovar token
      if (error.status === 401 && !isRefreshing) {
        isRefreshing = true;

        const refreshToken = tokenService.getRefreshToken();

        if (!refreshToken) {
          // No hay refresh token, cerrar sesión
          tokenService.logout();
          router.navigate(['/login']);
          return throwError(() => error);
        }

        // Intentar renovar el token
        return authService.refrescarToken({ refreshToken }).pipe(
          switchMap((respuesta) => {
            isRefreshing = false;

            // Guardar nuevos tokens
            tokenService.login(respuesta.data.token, respuesta.data.refreshToken);

            // Reintentar la request original con el nuevo token
            const newAuthReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${respuesta.data.token}`
              }
            });

            return next(newAuthReq);
          }),
          catchError((refreshError) => {
            isRefreshing = false;

            // Refresh falló, cerrar sesión
            tokenService.logout();
            router.navigate(['/login']);

            return throwError(() => refreshError);
          })
        );
      }

      return throwError(() => error);
    })
  );
};
