import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpErrorResponse,
  HttpRequest,
  HttpHandlerFn,
} from '@angular/common/http';
import { TokenService } from '../services/token-service';
import { Router } from '@angular/router';
import { throwError, EMPTY } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  // 1. Inyectamos los servicios necesarios
  const tokenService = inject(TokenService);
  const router = inject(Router);

  // 2. Añadimos el token a la petición (como ya lo tenías)
  let authReq = req;
  if (tokenService.isLogged()) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${tokenService.getToken()}`,
      },
    });
  }

  // 3. Enviamos la petición y añadimos el manejo de errores
  return next(authReq).pipe(
    catchError((error: any) => {
      // 4. Verificamos si es un error 401 (No Autorizado)
      if (error instanceof HttpErrorResponse && error.status === 401) {

        // 5. IMPORTANTE: Si el error 401 vino de la propia API de 'refresh',
        // significa que el refresh token falló. No hay nada más que hacer.
        if (req.url.includes('/api/auth/refresh')) {
          tokenService.logout(); // Hacemos logout
          router.navigate(['/login']); // Redirigimos al login
          return EMPTY; // Detenemos la cadena de observables
        }

        // 6. Verificamos si ya hay un refresh en progreso
        if (tokenService.isRefreshing()) {
          // Si es así, no iniciamos uno nuevo.
          // Esperamos a que el 'refreshingInProgress$' emita 'false'
          return tokenService.refreshingInProgress.pipe(
            filter((isRefreshing) => !isRefreshing),
            take(1),
            switchMap(() => {
              // Cuando termine, reintentamos la petición con el nuevo token
              return next(
                authReq.clone({
                  setHeaders: {
                    Authorization: `Bearer ${tokenService.getToken()}`,
                  },
                })
              );
            })
          );
        } else {
          // 7. No hay un refresh en progreso. Iniciamos uno.
          return tokenService.refresh().pipe(
            switchMap(() => {
              // Refresh exitoso. Reintentamos la petición original
              return next(
                authReq.clone({
                  setHeaders: {
                    Authorization: `Bearer ${tokenService.getToken()}`,
                  },
                })
              );
            }),
            catchError((refreshError) => {
              // 8. El refresh falló. Hacemos logout y detenemos
              tokenService.logout();
              router.navigate(['/login']);
              return EMPTY; // Detenemos la cadena
            })
          );
        }
      }

      // 9. Si no fue un error 401, simplemente lo propagamos
      // para que lo maneje el ErrorHandlerService
      return throwError(() => error);
    })
  );
};
