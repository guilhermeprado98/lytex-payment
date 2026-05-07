import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-main-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  readonly auth = inject(AuthService);
  readonly menuOpen = signal(true);

  readonly nav: { path: string; icon: string; label: string; exact?: boolean }[] = [
    { path: '/dashboard', icon: 'space_dashboard', label: 'Resumo', exact: true },
    { path: '/transactions', icon: 'receipt_long', label: 'Transações', exact: false },
    { path: '/cards', icon: 'credit_card', label: 'Cartões', exact: false },
  ];

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }
}
