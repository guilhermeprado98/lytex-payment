import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type { Charge } from './charge.model';

@Injectable({ providedIn: 'root' })
export class ChargesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/charges`;

  list(): Observable<Charge[]> {
    return this.http.get<Charge[]>(this.base);
  }

  create(body: { amount: number; method: string; description?: string }): Observable<Charge> {
    return this.http.post<Charge>(this.base, body);
  }

  simulatePay(id: string): Observable<Charge> {
    return this.http.patch<Charge>(`${this.base}/${id}/pay`, {});
  }

  payCard(
    id: string,
    body: {
      cpfCnpj: string;
      number: string;
      holder: string;
      expiry: string;
      cvc: string;
      email?: string;
      cellphone?: string;
      parcels?: number;
    },
  ): Observable<Charge> {
    return this.http.post<Charge>(`${this.base}/${id}/pay-card`, body);
  }
}
