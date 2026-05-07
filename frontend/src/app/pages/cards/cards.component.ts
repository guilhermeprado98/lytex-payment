import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SavedCardsApiService, type SavedCard } from '../../saved-cards/saved-cards-api.service';

@Component({
  selector: 'app-cards',
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  templateUrl: './cards.component.html',
  styleUrl: './cards.component.scss',
})
export class CardsComponent {
  private readonly api = inject(SavedCardsApiService);
  private readonly snack = inject(MatSnackBar);

  readonly savedCards = signal<SavedCard[]>([]);

  constructor() {
    this.reload();
  }

  cardLabel(c: SavedCard): string {
    const b = c.brand ? `${c.brand} ` : '';
    const l = c.label ? ` — ${c.label}` : '';
    return `${b}•••• ${c.lastFourDigits} — ${c.holderName} (${c.expiryDisplay})${l}`;
  }

  reload(): void {
    this.api.list().subscribe({
      next: (r) => this.savedCards.set(r),
      error: () => this.savedCards.set([]),
    });
  }

  remove(id: string): void {
    this.api.remove(id).subscribe({
      next: () => {
        this.snack.open('Removido', 'OK');
        this.reload();
      },
      error: () => this.snack.open('Erro ao remover', 'Fechar'),
    });
  }
}
