import { ChargeStatus, PaymentMethod } from './schemas/charge.schema';

export function lytexInvoiceStatusToChargeStatus(status: unknown): ChargeStatus {
  const v = String(status ?? '')
    .toLowerCase()
    .trim();
  if (['paid', 'payed', 'liquidated', 'settled', 'confirmed', 'completed'].includes(v)) {
    return ChargeStatus.PAID;
  }
  if (
    ['canceled', 'cancelled', 'void', 'refunded', 'expired', 'chargeback', 'failed', 'denied'].includes(
      v,
    )
  ) {
    return ChargeStatus.FAILED;
  }
  return ChargeStatus.PENDING;
}

export function paymentMethodFromLytexInvoice(inv: Record<string, unknown>): PaymentMethod {
  const pm = inv['paymentMethods'] as Record<string, unknown> | undefined;
  const list = pm?.['list'];
  if (Array.isArray(list)) {
    const lower = list.map((x) => String(x).toLowerCase());
    if (lower.some((x) => x.includes('credit') || x === 'cartao' || x === 'card')) {
      return PaymentMethod.CREDIT_CARD;
    }
    if (lower.includes('pix')) {
      return PaymentMethod.PIX;
    }
    if (lower.includes('boleto')) {
      return PaymentMethod.BOLETO;
    }
  }
  const pix = pm?.['pix'] as { enable?: boolean } | undefined;
  if (pix?.enable) {
    return PaymentMethod.PIX;
  }
  const cc = pm?.['creditCard'] as { enable?: boolean } | undefined;
  if (cc?.enable) {
    return PaymentMethod.CREDIT_CARD;
  }
  const bol = pm?.['boleto'] as { enable?: boolean } | undefined;
  if (bol?.enable) {
    return PaymentMethod.BOLETO;
  }
  return PaymentMethod.BOLETO;
}

/** totalValue e itens[].value na Lytex v2 costumam estar em centavos. */
export function amountReaisFromLytexInvoice(inv: Record<string, unknown>): number {
  const tv = inv['totalValue'];
  if (typeof tv === 'number' && tv > 0) {
    return Math.round(tv) / 100;
  }
  const items = inv['items'] as Array<{ quantity?: number; value?: number }> | undefined;
  if (Array.isArray(items) && items.length > 0) {
    const cents = items.reduce((acc, it) => acc + (it.quantity ?? 1) * (it.value ?? 0), 0);
    if (cents > 0) {
      return cents / 100;
    }
  }
  return 0;
}

export function paymentUrlFromLytexInvoice(inv: Record<string, unknown>): string | undefined {
  const checkout = inv['linkCheckout'];
  if (typeof checkout === 'string' && checkout.length > 0) {
    return checkout;
  }
  const boleto = inv['linkBoleto'];
  if (typeof boleto === 'string' && boleto.length > 0) {
    return boleto;
  }
  return undefined;
}
