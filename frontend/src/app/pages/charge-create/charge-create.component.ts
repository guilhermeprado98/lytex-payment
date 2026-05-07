import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import { ChargesApiService } from '../../charges/charges-api.service';
import { SavedCardsApiService, type SavedCard } from '../../saved-cards/saved-cards-api.service';

@Component({
  selector: 'app-charge-create',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './charge-create.component.html',
  styleUrl: './charge-create.component.scss',
})
export class ChargeCreateComponent {
  private readonly api = inject(ChargesApiService);
  private readonly savedCardsApi = inject(SavedCardsApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly creating = signal(false);
  readonly savedCards = signal<SavedCard[]>([]);
  readonly cardsLoading = signal(false);

  readonly form = this.fb.nonNullable.group({
    amount: [10, [Validators.required, Validators.min(0.01)]],
    method: ['PIX' as 'PIX' | 'BOLETO' | 'CREDIT_CARD', Validators.required],
    description: ['Cobrança sandbox'],
    savedCardId: [''],
    parcels: [1, [Validators.required, Validators.min(1), Validators.max(12)]],
  });

  constructor() {
    this.syncCardValidators(this.form.controls.method.value);
    this.form.controls.method.valueChanges.subscribe((m) => this.syncCardValidators(m));
  }

  cardOptionLabel(c: SavedCard): string {
    const tail = `•••• ${c.lastFourDigits}`;
    const apelido = c.label?.trim();
    if (apelido) {
      return `${apelido} — ${tail}`;
    }
    const b = c.brand ? `${c.brand} ` : '';
    return `${b}${tail} — ${c.holderName}`;
  }

  private syncCardValidators(method: 'PIX' | 'BOLETO' | 'CREDIT_CARD'): void {
    const sid = this.form.controls.savedCardId;
    if (method === 'CREDIT_CARD') {
      sid.setValidators([Validators.required]);
      this.loadSavedCards();
    } else {
      sid.clearValidators();
      sid.setValue('');
    }
    sid.updateValueAndValidity({ emitEvent: false });
  }

  private loadSavedCards(): void {
    this.cardsLoading.set(true);
    this.savedCardsApi.list().subscribe({
      next: (rows) => {
        this.savedCards.set(rows);
        this.cardsLoading.set(false);
      },
      error: () => {
        this.savedCards.set([]);
        this.cardsLoading.set(false);
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    if (v.method === 'CREDIT_CARD' && this.savedCards().length === 0) {
      this.snack.open('Cadastre um cartão antes de criar cobrança no cartão.', 'Fechar', { duration: 5000 });
      return;
    }
    this.creating.set(true);
    const body: {
      amount: number;
      method: string;
      description?: string;
      savedCardId?: string;
      parcels?: number;
    } = {
      amount: Number(v.amount),
      method: v.method,
      description: v.description || undefined,
    };
    if (v.method === 'CREDIT_CARD') {
      body.savedCardId = v.savedCardId;
      body.parcels = Number(v.parcels) || 1;
    }
    this.api
      .create(body)
      .pipe(finalize(() => this.creating.set(false)))
      .subscribe({
        next: () => {
          const msg = v.method === 'CREDIT_CARD' ? 'Cobrança paga com cartão salvo' : 'Cobrança criada na Lytex';
          this.snack.open(msg, 'OK', { duration: 3000 });
          void this.router.navigateByUrl('/transactions');
        },
        error: (err: { error?: { message?: string | string[] } }) => {
          const m = err.error?.message;
          const text = Array.isArray(m) ? m.join(', ') : m ?? 'Erro ao criar';
          this.snack.open(text, 'Fechar', { duration: 7000 });
        },
      });
  }
}
