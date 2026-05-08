import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface StatsSummary {
  charges: {
    total: number;
    pending: number;
    paid: number;
    failed: number;
    volumeTotal: number;
    volumePaid: number;
    byMethod: { method: string; count: number }[];
  };
  savedCards: number;
}

@Injectable({ providedIn: 'root' })
export class StatsApiService {
  private readonly http = inject(HttpClient);

  summary(): Observable<StatsSummary> {
    return this.http.get<StatsSummary>(`${environment.apiUrl}/stats/summary`);
  }
}
