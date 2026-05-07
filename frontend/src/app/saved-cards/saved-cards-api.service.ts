import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SavedCard {
  _id: string;
  lastFourDigits: string;
  holderName: string;
  expiryDisplay: string;
  brand?: string;
  label?: string;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class SavedCardsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/saved-cards`;

  list(): Observable<SavedCard[]> {
    return this.http.get<SavedCard[]>(this.base);
  }

  create(body: {
    cpfCnpj: string;
    number: string;
    holder: string;
    expiry: string;
    cvc: string;
    email?: string;
    cellphone?: string;
    label?: string;
  }): Observable<SavedCard> {
    return this.http.post<SavedCard>(this.base, body);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
