import {
  amountReaisFromLytexInvoice,
  lytexInvoiceStatusToChargeStatus,
  paymentMethodFromLytexInvoice,
  paymentUrlFromLytexInvoice,
} from './lytex-invoice.mapper';
import { ChargeStatus, PaymentMethod } from './schemas/charge.schema';

describe('lytex-invoice.mapper', () => {
  const sample = {
    _id: '6328b84458763800131023ad',
    status: 'canceled',
    totalValue: 20000,
    paymentMethods: {
      boleto: { dueDateDays: 1, enable: true },
      pix: { enable: false },
      creditCard: { enable: false },
      list: ['boleto'],
    },
    linkCheckout: 'https://checkout.example/fatura/x',
  } as Record<string, unknown>;

  it('amount from totalValue cents', () => {
    expect(amountReaisFromLytexInvoice(sample)).toBe(200);
  });

  it('status canceled -> FAILED', () => {
    expect(lytexInvoiceStatusToChargeStatus(sample['status'])).toBe(ChargeStatus.FAILED);
  });

  it('method from list', () => {
    expect(paymentMethodFromLytexInvoice(sample)).toBe(PaymentMethod.BOLETO);
  });

  it('payment url prefers linkCheckout', () => {
    expect(paymentUrlFromLytexInvoice(sample)).toBe('https://checkout.example/fatura/x');
  });
});
