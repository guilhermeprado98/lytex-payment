import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Sessão inválida ou expirada (401): limpa token e volta ao login.
 * Evita ficar “logado” no UI com JWT que o servidor rejeita (ex.: JWT_SECRET mudou após rebuild do Docker).
 */
export const unauthorizedInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const url = req.url;
  const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register');

  return next(req).pipe(
    catchError((err: unknown) => {
      if (isAuthEndpoint || !(err instanceof HttpErrorResponse) || err.status !== 401) {
        return throwError(() => err);
      }
      if (auth.getToken()) {
        auth.logout();
      }
      return throwError(() => err);
    }),
  );
};
