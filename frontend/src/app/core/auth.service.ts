import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * JWT emitido pelo **Nest** em POST /auth/login (Bearer nas APIs do app).
 * Não é o token OAuth da Lytex (esse só existe na memória do servidor).
 * Validade: ver `expiresIn` no backend (`JwtModule`, hoje 7 dias).
 */
const TOKEN_KEY = 'lytex_app_access_token';
/** Nome antigo — migrado automaticamente para TOKEN_KEY. */
const LEGACY_TOKEN_KEY = 'lytex_payment_token';
const USER_KEY = 'lytex_payment_user';

function decodeJwtExpUnix(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(b64);
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  readonly user = signal<AuthUser | null>(null);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    if (this.isAccessTokenExpired()) {
      this.clearStorageOnly();
      this.user.set(null);
      return;
    }
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      try {
        this.user.set(JSON.parse(raw) as AuthUser);
      } catch {
        localStorage.removeItem(USER_KEY);
      }
    }
  }

  hasToken(): boolean {
    return isPlatformBrowser(this.platformId) && !!this.readTokenFromStorage();
  }

  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return this.readTokenFromStorage();
  }

  /**
   * `true` se não há token ou o campo `exp` do JWT já passou (margem para skew de relógio).
   * Se não for possível ler `exp`, assume `false` e deixa o servidor responder 401.
   */
  isAccessTokenExpired(skewSec = 90): boolean {
    const t = this.readTokenFromStorage();
    if (!t) {
      return true;
    }
    const exp = decodeJwtExpUnix(t);
    if (exp == null) {
      return false;
    }
    return exp * 1000 <= Date.now() + skewSec * 1000;
  }

  register(payload: { name: string; email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, payload).pipe(
      tap((res) => this.persistSession(res)),
    );
  }

  login(payload: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, payload).pipe(
      tap((res) => this.persistSession(res)),
    );
  }

  logout(): void {
    this.clearStorageOnly();
    this.user.set(null);
    void this.router.navigateByUrl('/login');
  }

  private clearStorageOnly(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }

  private persistSession(res: AuthResponse): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(LEGACY_TOKEN_KEY);
      localStorage.setItem(TOKEN_KEY, res.accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    }
    this.user.set(res.user);
  }

  private readTokenFromStorage(): string | null {
    const cur = localStorage.getItem(TOKEN_KEY);
    if (cur) {
      return cur;
    }
    const leg = localStorage.getItem(LEGACY_TOKEN_KEY);
    if (leg) {
      localStorage.setItem(TOKEN_KEY, leg);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
      return leg;
    }
    return null;
  }
}
