import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { ChargesApiService } from '../charges-api.service';
import type { Charge } from '../charge.model';
import { pickBoletoLine, pickPixPayload } from '../charge.model';

@Component({
  selector: 'app-dashboard',
  imports: [
    DatePipe,
    CurrencyPipe,
    ReactiveFormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  readonly auth = inject(AuthService);
  private readonly api = inject(ChargesApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly charges = signal<Charge[]>([]);
  readonly creating = signal(false);
  readonly paying = signal(false);
  readonly openCardId = signal<string | null>(null);

  readonly displayed: string[] = ['when', 'amount', 'method', 'status', 'actions'];

  readonly createForm = this.fb.nonNullable.group({
    amount: [10, [Validators.required, Validators.min(0.01)]],
    method: ['PIX' as 'PIX' | 'BOLETO' | 'CREDIT_CARD', Validators.required],
    description: ['Cobrança sandbox'],
  });

  readonly cardForm = this.fb.nonNullable.group({
    cpfCnpj: ['', [Validators.required, Validators.minLength(11)]],
    number: ['', [Validators.required]],
    holder: ['', [Validators.required]],
    expiry: ['', [Validators.required, Validators.pattern(/^\d{4}$|^\d{6}$/)]],
    cvc: ['', [Validators.required, Validators.minLength(3)]],
    parcels: [1, [Validators.required, Validators.min(1), Validators.max(12)]],
    email: [''],
    cellphone: [''],
  });

  constructor() {
    this.reload();
  }

  pickPix(row: Charge) {
    return pickPixPayload(row);
  }

  pickBoleto(row: Charge): string | undefined {
    return pickBoletoLine(row);
  }

  reload(): void {
    this.api.list().subscribe({
      next: (rows) => this.charges.set(rows),
      error: () => this.snack.open('Não foi possível carregar cobranças', 'Fechar'),
    });
  }

  createCharge(): void {
    if (this.createForm.invalid) {
      return;
    }
    const v = this.createForm.getRawValue();
    this.creating.set(true);
    this.api
      .create({
        amount: Number(v.amount),
        method: v.method,
        description: v.description || undefined,
      })
      .pipe(finalize(() => this.creating.set(false)))
      .subscribe({
        next: () => {
          this.snack.open('Cobrança criada na Lytex', 'OK', { duration: 3000 });
          this.reload();
        },
        error: (err: { error?: { message?: string | string[] } }) => {
          const m = err.error?.message;
          const text = Array.isArray(m) ? m.join(', ') : m ?? 'Erro ao criar';
          this.snack.open(text, 'Fechar', { duration: 7000 });
        },
      });
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

  payCard(chargeId: string): void {
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
