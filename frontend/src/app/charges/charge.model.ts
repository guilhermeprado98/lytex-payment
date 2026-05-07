export type PaymentMethod = 'PIX' | 'BOLETO' | 'CREDIT_CARD';
export type ChargeStatus = 'PENDING' | 'PAID' | 'FAILED';

export interface Charge {
  _id: string;
  amount: number;
  method: PaymentMethod;
  status: ChargeStatus;
  externalId?: string;
  paymentUrl?: string;
  lytexInvoiceId?: string;
  lytex?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export function pickPixPayload(charge: Charge): { qr?: string; copyPaste?: string } {
  const l = charge.lytex;
  if (!l || typeof l !== 'object') {
    return {};
  }
  const root = l as Record<string, unknown>;
  const pm = root['paymentMethods'] as Record<string, unknown> | undefined;
  const pix = (pm?.['pix'] ?? root['pix']) as Record<string, unknown> | undefined;
  if (!pix) {
    return {};
  }
  const qr = typeof pix['qrcode'] === 'string' ? (pix['qrcode'] as string) : undefined;
  const copyPaste =
    typeof pix['emv'] === 'string'
      ? (pix['emv'] as string)
      : typeof pix['copyPaste'] === 'string'
        ? (pix['copyPaste'] as string)
        : qr;
  return { qr, copyPaste };
}

export function pickBoletoLine(charge: Charge): string | undefined {
  const l = charge.lytex;
  if (!l || typeof l !== 'object') {
    return undefined;
  }
  const root = l as Record<string, unknown>;
  const pm = root['paymentMethods'] as Record<string, unknown> | undefined;
  const boleto = (pm?.['boleto'] ?? root['boleto']) as Record<string, unknown> | undefined;
  if (!boleto) {
    return undefined;
  }
  const line = boleto['digitableLine'] ?? boleto['barcode'];
  return typeof line === 'string' ? line : undefined;
}
