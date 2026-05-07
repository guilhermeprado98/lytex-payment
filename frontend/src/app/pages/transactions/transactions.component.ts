import { AfterViewInit, Component, ViewChild, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import { ChargesApiService } from '../../charges/charges-api.service';
import type { Charge } from '../../charges/charge.model';
import { pickBoletoLine, pickPixPayload } from '../../charges/charge.model';
import { SavedCardsApiService, type SavedCard } from '../../saved-cards/saved-cards-api.service';

@Component({
  selector: 'app-transactions',
  imports: [
    RouterLink,
    DatePipe,
    CurrencyPipe,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss',
})
export class TransactionsComponent implements AfterViewInit {
  private readonly api = inject(ChargesApiService);
  private readonly savedCardsApi = inject(SavedCardsApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  readonly dataSource = new MatTableDataSource<Charge>([]);
  readonly displayed: string[] = ['createdAt', 'amount', 'method', 'status', 'actions'];

  readonly savedCards = signal<SavedCard[]>([]);
  readonly paying = signal(false);
  readonly openCardId = signal<string | null>(null);

  readonly filterForm = this.fb.nonNullable.group({
    status: [''],
    method: [''],
  });

  readonly cardForm = this.fb.nonNullable.group({
    savedCardId: [''],
    cpfCnpj: ['', [Validators.required, Validators.minLength(11)]],
    number: ['', [Validators.required, Validators.minLength(12)]],
    holder: ['', [Validators.required, Validators.minLength(2)]],
    expiry: ['', [Validators.required, Validators.pattern(/^\d{4}$|^\d{6}$/)]],
    cvc: ['', [Validators.required, Validators.minLength(3)]],
    parcels: [1, [Validators.required, Validators.min(1), Validators.max(12)]],
    email: [''],
    cellphone: [''],
  });

  constructor() {
    this.reload();
    this.reloadSavedCards();

    this.cardForm.get('savedCardId')?.valueChanges.subscribe((id) => {
      const useSaved = !!id?.trim();
      const keys = ['cpfCnpj', 'number', 'holder', 'expiry', 'cvc'] as const;
      if (useSaved) {
        for (const k of keys) {
          const c = this.cardForm.get(k);
          c?.clearValidators();
          c?.updateValueAndValidity({ emitEvent: false });
        }
      } else {
        this.cardForm.controls.cpfCnpj.setValidators([Validators.required, Validators.minLength(11)]);
        this.cardForm.controls.number.setValidators([Validators.required, Validators.minLength(12)]);
        this.cardForm.controls.holder.setValidators([Validators.required, Validators.minLength(2)]);
        this.cardForm.controls.expiry.setValidators([Validators.required, Validators.pattern(/^\d{4}$|^\d{6}$/)]);
        this.cardForm.controls.cvc.setValidators([Validators.required, Validators.minLength(3)]);
        for (const k of keys) {
          this.cardForm.get(k)?.updateValueAndValidity({ emitEvent: false });
        }
      }
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (item: Charge, prop: string) => {
      if (prop === 'createdAt') {
        return item.createdAt ? new Date(item.createdAt).getTime() : 0;
      }
      if (prop === 'amount') {
        return item.amount;
      }
      return (item as unknown as Record<string, string | number>)[prop] as string | number;
    };
  }

  cardLabel(c: SavedCard): string {
    const b = c.brand ? `${c.brand} ` : '';
    const l = c.label ? ` — ${c.label}` : '';
    return `${b}•••• ${c.lastFourDigits} — ${c.holderName} (${c.expiryDisplay})${l}`;
  }

  pickPix(row: Charge) {
    return pickPixPayload(row);
  }

  pickBoleto(row: Charge): string | undefined {
    return pickBoletoLine(row);
  }

  reload(): void {
    const f = this.filterForm.getRawValue();
    const q: { status?: string; method?: string } = {};
    if (f.status) {
      q.status = f.status;
    }
    if (f.method) {
      q.method = f.method;
    }
    this.api.list(Object.keys(q).length ? q : undefined).subscribe({
      next: (rows) => {
        this.dataSource.data = rows;
      },
      error: () => this.snack.open('Não foi possível carregar transações', 'Fechar'),
    });
  }

  reloadSavedCards(): void {
    this.savedCardsApi.list().subscribe({
      next: (rows) => this.savedCards.set(rows),
      error: () => this.savedCards.set([]),
    });
  }

  applyFilters(): void {
    this.reload();
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  clearFilters(): void {
    this.filterForm.reset({ status: '', method: '' });
    this.reload();
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  simulate(row: Charge): void {
    this.api.simulatePay(row._id).subscribe({
      next: () => {
        this.snack.open('Marcada como paga (simulação)', 'OK');
        this.reload();
      },
      error: (err: { error?: { message?: string | string[] } }) => {
        const m = err.error?.message;
        const text = Array.isArray(m) ? m.join(', ') : m ?? 'Erro';
        this.snack.open(text, 'Fechar');
      },
    });
  }

  toggleCard(id: string): void {
    this.openCardId.update((cur) => (cur === id ? null : id));
    this.cardForm.patchValue({ savedCardId: '' });
  }

  copyPix(row: Charge): void {
    const t = this.pickPix(row).copyPaste ?? this.pickPix(row).qr;
    if (!t) {
      this.snack.open('Payload PIX não veio na resposta — use o link se houver', 'Fechar');
      return;
    }
    void navigator.clipboard.writeText(t).then(
      () => this.snack.open('PIX copiado', 'OK', { duration: 2500 }),
      () => this.snack.open('Não foi possível copiar', 'Fechar'),
    );
  }

  copyBoleto(row: Charge): void {
    const line = this.pickBoleto(row);
    if (!line) {
      this.snack.open('Linha digitável não encontrada na resposta', 'Fechar');
      return;
    }
    void navigator.clipboard.writeText(line).then(
      () => this.snack.open('Linha copiada', 'OK', { duration: 2500 }),
      () => this.snack.open('Não foi possível copiar', 'Fechar'),
    );
  }

  payCardBlocked(): boolean {
    const sid = this.cardForm.get('savedCardId')?.value?.trim();
    if (sid) {
      return this.cardForm.controls.parcels.invalid;
    }
    return this.cardForm.invalid;
  }

  payCard(chargeId: string): void {
    const sid = this.cardForm.get('savedCardId')?.value?.trim();
    if (sid) {
      if (this.cardForm.controls.parcels.invalid) {
        return;
      }
      const c = this.cardForm.getRawValue();
      this.paying.set(true);
      this.api
        .payCard(chargeId, {
          savedCardId: sid,
          parcels: Number(c.parcels),
          email: c.email || undefined,
          cellphone: c.cellphone || undefined,
        })
        .pipe(finalize(() => this.paying.set(false)))
        .subscribe({
          next: () => {
            this.snack.open('Pagamento enviado à Lytex', 'OK');
            this.openCardId.set(null);
            this.reload();
          },
          error: (err: { error?: { message?: string | string[] } }) => {
            const m = err.error?.message;
            const text = Array.isArray(m) ? m.join(', ') : m ?? 'Erro no pagamento';
            this.snack.open(text, 'Fechar', { duration: 8000 });
          },
        });
      return;
    }

    if (this.cardForm.invalid) {
      this.cardForm.markAllAsTouched();
      return;
    }

    const c = this.cardForm.getRawValue();
    this.paying.set(true);
    this.api
      .payCard(chargeId, {
        cpfCnpj: c.cpfCnpj.replace(/\D/g, ''),
        number: c.number.replace(/\s/g, ''),
        holder: c.holder,
        expiry: c.expiry,
        cvc: c.cvc,
        parcels: Number(c.parcels),
        email: c.email || undefined,
        cellphone: c.cellphone || undefined,
      })
      .pipe(finalize(() => this.paying.set(false)))
      .subscribe({
        next: () => {
          this.snack.open('Pagamento enviado à Lytex', 'OK');
          this.openCardId.set(null);
          this.reload();
        },
        error: (err: { error?: { message?: string | string[] } }) => {
          const m = err.error?.message;
          const text = Array.isArray(m) ? m.join(', ') : m ?? 'Erro no pagamento';
          this.snack.open(text, 'Fechar', { duration: 8000 });
        },
      });
  }
}
