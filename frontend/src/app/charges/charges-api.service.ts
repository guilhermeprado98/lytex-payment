import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type { Charge } from './charge.model';

export type PayCardBody =
  | {
      savedCardId: string;
      parcels?: number;
      email?: string;
      cellphone?: string;
    }
  | {
      cpfCnpj: string;
      number: string;
      holder: string;
      expiry: string;
      cvc: string;
      email?: string;
      cellphone?: string;
      parcels?: number;
    };

@Injectable({ providedIn: 'root' })
export class ChargesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/charges`;

  list(filters?: { status?: string; method?: string }): Observable<Charge[]> {
    let params = new HttpParams();
    if (filters?.status) {
      params = params.set('status', filters.status);
    }
    if (filters?.method) {
      params = params.set('method', filters.method);
    }
    return this.http.get<Charge[]>(this.base, { params });
  }

  create(body: {
    amount: number;
    method: string;
    description?: string;
    savedCardId?: string;
    parcels?: number;
  }): Observable<Charge> {
    return this.http.post<Charge>(this.base, body);
  }

  simulatePay(id: string): Observable<Charge> {
    return this.http.patch<Charge>(`${this.base}/${id}/pay`, {});
  }

  payCard(id: string, body: PayCardBody): Observable<Charge> {
    return this.http.post<Charge>(`${this.base}/${id}/pay-card`, body);
  }
}
