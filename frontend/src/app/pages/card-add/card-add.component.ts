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
    cpfCnpj: ['', [Validators.required, Validators.minLength(11)]],
    number: ['', [Validators.required, Validators.minLength(12)]],
    holder: ['', [Validators.required, Validators.minLength(2)]],
    expiry: ['', [Validators.required, Validators.pattern(/^\d{4}$|^\d{6}$/)]],
    cvc: ['', [Validators.required, Validators.minLength(3)]],
    email: [''],
    cellphone: [''],
    label: [''],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.api
      .create({
        cpfCnpj: v.cpfCnpj.replace(/\D/g, ''),
        number: v.number.replace(/\s/g, ''),
        holder: v.holder,
        expiry: v.expiry,
        cvc: v.cvc,
        email: v.email || undefined,
        cellphone: v.cellphone || undefined,
        label: v.label || undefined,
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
