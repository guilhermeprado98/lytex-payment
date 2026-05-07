import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import { SavedCardsApiService } from '../../saved-cards/saved-cards-api.service';
import {
  cardCvcValidator,
  cardExpiryValidator,
  cardHolderValidator,
  cardNumberValidator,
  cpfCnpjValidator,
  onlyDigits,
  optionalBrCellphoneValidator,
  optionalEmailValidator,
} from '../../shared/validators/card.validators';

@Component({
  selector: 'app-card-add',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './card-add.component.html',
  styleUrl: './card-add.component.scss',
})
export class CardAddComponent {
  private readonly api = inject(SavedCardsApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    cpfCnpj: ['', [Validators.required, cpfCnpjValidator()]],
    number: ['', [Validators.required, cardNumberValidator()]],
    holder: ['', [Validators.required, cardHolderValidator()]],
    expiry: ['', [Validators.required, cardExpiryValidator()]],
    cvc: ['', [Validators.required, cardCvcValidator()]],
    email: ['', [optionalEmailValidator()]],
    cellphone: ['', [optionalBrCellphoneValidator()]],
    label: ['', [Validators.maxLength(80)]],
  });

  constructor() {
    this.form.controls.number.valueChanges.subscribe(() => {
      this.form.controls.cvc.updateValueAndValidity({ emitEvent: false });
    });
  }

  fieldError(controlName: string): string | null {
    const c = this.form.get(controlName);
    if (!c?.touched || !c.errors) {
      return null;
    }
    const e = c.errors;
    switch (controlName) {
      case 'cpfCnpj':
        if (e['required']) {
          return 'Informe CPF ou CNPJ';
        }
        if (e['cpfCnpjShort']) {
          return 'CPF incompleto';
        }
        if (e['cpfInvalid']) {
          return 'CPF inválido';
        }
        if (e['cpfCnpjIncomplete']) {
          return 'CNPJ incompleto';
        }
        if (e['cnpjInvalid']) {
          return 'CNPJ inválido';
        }
        if (e['cpfCnpjLong']) {
          return 'Muitos dígitos';
        }
        return null;
      case 'number':
        if (e['required']) {
          return 'Informe o número';
        }
        if (e['cardLength']) {
          return 'Número deve ter entre 13 e 19 dígitos';
        }
        if (e['luhn']) {
          return 'Número inválido (Luhn)';
        }
        return null;
      case 'holder':
        if (e['required']) {
          return 'Informe o nome';
        }
        if (e['holderShort']) {
          return 'Use ao menos 2 letras no nome';
        }
        if (e['holderChars']) {
          return 'Apenas letras, espaços, ponto, apóstrofo ou hífen';
        }
        return null;
      case 'expiry':
        if (e['required']) {
          return 'Informe a validade';
        }
        if (e['expiryFormat']) {
          return 'Use 4 dígitos (MMYY) ou 6 (MMYYYY)';
        }
        if (e['expiryMonth']) {
          return 'Mês inválido';
        }
        if (e['expired']) {
          return 'Cartão vencido';
        }
        return null;
      case 'cvc':
        if (e['required']) {
          return 'Informe o CVC';
        }
        if (e['cvcLength']) {
          return 'CVC deve ter 3 dígitos';
        }
        if (e['cvcAmex']) {
          return 'Amex: CVC com 4 dígitos';
        }
        return null;
      case 'email':
        if (e['emailInvalid']) {
          return 'E-mail inválido';
        }
        return null;
      case 'cellphone':
        if (e['cellphoneInvalid']) {
          return '10 ou 11 dígitos (DDD + número)';
        }
        return null;
      case 'label':
        if (e['maxlength']) {
          return 'Máximo 80 caracteres';
        }
        return null;
      default:
        return null;
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const expiryDigits = onlyDigits(v.expiry);
    this.saving.set(true);
    this.api
      .create({
        cpfCnpj: onlyDigits(v.cpfCnpj),
        number: onlyDigits(v.number),
        holder: v.holder.trim(),
        expiry: expiryDigits,
        cvc: onlyDigits(v.cvc),
        email: v.email?.trim() || undefined,
        cellphone: v.cellphone?.trim() || undefined,
        label: v.label?.trim() || undefined,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.snack.open('Cartão salvo', 'OK', { duration: 3000 });
          void this.router.navigateByUrl('/cards');
        },
        error: (err: { error?: { message?: string | string[] } }) => {
          const m = err.error?.message;
          const text = Array.isArray(m) ? m.join(', ') : m ?? 'Erro';
          this.snack.open(text, 'Fechar', { duration: 7000 });
        },
      });
  }
}
