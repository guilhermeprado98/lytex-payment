import { ChargeStatus, PaymentMethod } from './schemas/charge.schema';

function pushStatusScalar(out: string[], v: unknown) {
  if (v == null) return;
  if (typeof v === 'string' && v.trim()) {
    out.push(v.trim());
    return;
  }
  if (typeof v === 'number' && Number.isFinite(v)) {
    out.push(String(v));
  }
}

export function lytexInvoiceStatusToChargeStatus(status: unknown): ChargeStatus {
  let v = '';
  if (typeof status === 'string') {
    v = status.toLowerCase().trim();
  } else if (status && typeof status === 'object') {
    const o = status as Record<string, unknown>;
    const inner = o['status'] ?? o['code'] ?? o['name'] ?? o['state'];
    v = String(inner ?? '').toLowerCase().trim();
  } else {
    v = String(status ?? '')
      .toLowerCase()
      .trim();
  }
  if (
    [
      'paid',
      'payed',
      'pago',
      'paga',
      'pagos',
      'pagas',
      'liquidated',
      'liquidado',
      'liquidada',
      'settled',
      'confirmed',
      'confirmado',
      'confirmada',
      'completed',
      'concluido',
      'concluída',
      'concluida',
      'quitado',
      'quitada',
      'received',
      'recebido',
      'recebida',
    ].includes(v)
  ) {
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

/**
 * A Lytex nem sempre envia o estado da fatura em `status` na raiz.
 * Objetos aninhados (ex.: `payment.status`) costumam refletir o pagamento; preferimos esses
 * e, entre vários valores, um que mapeie para PAID ou FAILED ganha prioridade.
 */
export function resolveLytexInvoiceStatus(inv: Record<string, unknown>): unknown {
  const found: string[] = [];

  for (const key of ['payment', 'payInfo', 'paymentInfo', 'billing', 'lastPayment', 'transaction']) {
    const nested = inv[key];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const n = nested as Record<string, unknown>;
      pushStatusScalar(found, n['status']);
      pushStatusScalar(found, n['state']);
      pushStatusScalar(found, n['paymentStatus']);
      pushStatusScalar(found, n['situation']);
    }
  }

  pushStatusScalar(found, inv['invoiceStatus']);
  pushStatusScalar(found, inv['paymentStatus']);
  pushStatusScalar(found, inv['situation']);
  pushStatusScalar(found, inv['situationInvoice']);
  pushStatusScalar(found, inv['status']);

  for (const s of found) {
    if (lytexInvoiceStatusToChargeStatus(s) === ChargeStatus.PAID) {
      return s;
    }
  }
  for (const s of found) {
    if (lytexInvoiceStatusToChargeStatus(s) === ChargeStatus.FAILED) {
      return s;
    }
  }
  return found[0] ?? inv['status'];
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

/** Aceita number ou string numérica (API às vezes serializa assim). */
function positiveCents(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
    return Math.round(v);
  }
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v.replace(',', '.'));
    if (Number.isFinite(n) && n > 0) {
      return Math.round(n);
    }
  }
  return null;
}

/** totalValue e itens[].value na Lytex v2 costumam estar em centavos. */
export function amountReaisFromLytexInvoice(inv: Record<string, unknown>): number {
  const tv = positiveCents(inv['totalValue']);
  if (tv !== null) {
    return tv / 100;
  }
  const items = inv['items'] as Array<{ quantity?: unknown; value?: unknown }> | undefined;
  if (Array.isArray(items) && items.length > 0) {
    let cents = 0;
    for (const it of items) {
      const q = positiveCents(it.quantity) ?? 1;
      const val = positiveCents(it.value);
      if (val !== null) {
        cents += q * val;
      }
    }
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
