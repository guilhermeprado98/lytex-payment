import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { StatsApiService, type StatsSummary } from '../../core/stats-api.service';

@Component({
  selector: 'app-dashboard-home',
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule, CurrencyPipe],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.scss',
})
export class DashboardHomeComponent {
  private readonly statsApi = inject(StatsApiService);

  readonly summary = signal<StatsSummary | null>(null);
  readonly loading = signal(true);

  constructor() {
    this.statsApi.summary().subscribe({
      next: (s) => {
        this.summary.set(s);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
