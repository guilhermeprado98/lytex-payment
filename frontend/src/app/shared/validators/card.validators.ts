import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Dígitos apenas. */
export function onlyDigits(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '');
}

function luhnValid(digits: string): boolean {
  if (!/^\d+$/.test(digits)) {
    return false;
  }
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits.charAt(i), 10);
    if (Number.isNaN(n)) {
      return false;
    }
    if (alt) {
      n *= 2;
      if (n > 9) {
        n -= 9;
      }
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/** Número com dígitos de 13 a 19 e Luhn. */
export function cardNumberValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = onlyDigits(control.value);
    if (!raw) {
      return null;
    }
    if (raw.length < 13 || raw.length > 19) {
      return { cardLength: true };
    }
    if (!luhnValid(raw)) {
      return { luhn: true };
    }
    return null;
  };
}

function cpfInvalid(d: string): boolean {
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) {
    return true;
  }
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(d.charAt(i), 10) * (10 - i);
  }
  let mod = (sum * 10) % 11;
  if (mod === 10 || mod === 11) {
    mod = 0;
  }
  if (mod !== parseInt(d.charAt(9), 10)) {
    return true;
  }
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(d.charAt(i), 10) * (11 - i);
  }
  mod = (sum * 10) % 11;
  if (mod === 10 || mod === 11) {
    mod = 0;
  }
  if (mod !== parseInt(d.charAt(10), 10)) {
    return true;
  }
  return false;
}

function cnpjInvalid(d: string): boolean {
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) {
    return true;
  }
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(d.charAt(i), 10) * w1[i]!;
  }
  let mod = sum % 11;
  const d1 = mod < 2 ? 0 : 11 - mod;
  if (d1 !== parseInt(d.charAt(12), 10)) {
    return true;
  }
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(d.charAt(i), 10) * w2[i]!;
  }
  mod = sum % 11;
  const d2 = mod < 2 ? 0 : 11 - mod;
  if (d2 !== parseInt(d.charAt(13), 10)) {
    return true;
  }
  return false;
}

/** CPF (11) ou CNPJ (14) com dígitos verificadores. */
export function cpfCnpjValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const d = onlyDigits(control.value);
    if (!d) {
      return null;
    }
    if (d.length < 11) {
      return { cpfCnpjShort: true };
    }
    if (d.length === 11) {
      return cpfInvalid(d) ? { cpfInvalid: true } : null;
    }
    if (d.length < 14) {
      return { cpfCnpjIncomplete: true };
    }
    if (d.length === 14) {
      return cnpjInvalid(d) ? { cnpjInvalid: true } : null;
    }
    return { cpfCnpjLong: true };
  };
}

/** MMYY ou MMYYYY; mês 1–12; não vencido (mês atual inclusive). */
export function cardExpiryValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = onlyDigits(control.value);
    if (!v) {
      return null;
    }
    let month: number;
    let year: number;
    if (v.length === 4) {
      month = parseInt(v.slice(0, 2), 10);
      year = 2000 + parseInt(v.slice(2, 4), 10);
    } else if (v.length === 6) {
      month = parseInt(v.slice(0, 2), 10);
      year = parseInt(v.slice(2, 6), 10);
    } else {
      return { expiryFormat: true };
    }
    if (month < 1 || month > 12) {
      return { expiryMonth: true };
    }
    const now = new Date();
    const cy = now.getFullYear();
    const cm = now.getMonth() + 1;
    if (year < cy || (year === cy && month < cm)) {
      return { expired: true };
    }
    return null;
  };
}

function isAmex(digits: string): boolean {
  return /^3[47]\d{13}$/.test(digits);
}

/** 3 dígitos (Visa/Master etc.) ou 4 (Amex). */
export function cardCvcValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const cvc = onlyDigits(control.value);
    if (!cvc) {
      return null;
    }
    const parent = control.parent;
    const num = parent ? onlyDigits(parent.get('number')?.value) : '';
    const amexComplete = isAmex(num);
    const amexLikely = /^3[47]/.test(num);

    if (amexComplete) {
      if (cvc.length !== 4) {
        return { cvcAmex: true };
      }
      return null;
    }
    if (amexLikely && num.length < 15) {
      if (cvc.length < 3 || cvc.length > 4) {
        return { cvcLength: true };
      }
      return null;
    }
    if (num.length >= 13) {
      if (cvc.length !== 3) {
        return { cvcLength: true };
      }
      return null;
    }
    if (cvc.length < 3 || cvc.length > 4) {
      return { cvcLength: true };
    }
    return null;
  };
}

/** Nome impresso: letras (incl. acentos), espaços e hífen/apóstrofo; mínimo 2 letras. */
export function cardHolderValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = String(control.value ?? '').trim();
    if (!v) {
      return null;
    }
    const letters = v.replace(/[^\p{L}]/gu, '');
    if (letters.length < 2) {
      return { holderShort: true };
    }
    if (!/^[\p{L}\s'.-]+$/u.test(v)) {
      return { holderChars: true };
    }
    return null;
  };
}

export function optionalEmailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = String(control.value ?? '').trim();
    if (!v) {
      return null;
    }
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    return ok ? null : { emailInvalid: true };
  };
}

/** Se preenchido: 10 ou 11 dígitos (BR). */
export function optionalBrCellphoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const d = onlyDigits(control.value);
    if (!d) {
      return null;
    }
    if (d.length < 10 || d.length > 11) {
      return { cellphoneInvalid: true };
    }
    return null;
  };
}
