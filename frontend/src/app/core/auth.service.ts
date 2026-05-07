import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

const TOKEN_KEY = 'lytex_payment_token';
const USER_KEY = 'lytex_payment_user';

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
    if (isPlatformBrowser(this.platformId)) {
      const raw = localStorage.getItem(USER_KEY);
      if (raw) {
        try {
          this.user.set(JSON.parse(raw) as AuthUser);
        } catch {
          localStorage.removeItem(USER_KEY);
        }
      }
    }
  }

  hasToken(): boolean {
    return isPlatformBrowser(this.platformId) && !!localStorage.getItem(TOKEN_KEY);
  }

  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return localStorage.getItem(TOKEN_KEY);
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
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    this.user.set(null);
    void this.router.navigateByUrl('/login');
  }

  private persistSession(res: AuthResponse): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(TOKEN_KEY, res.accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    }
    this.user.set(res.user);
  }
}
