import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ChargesService } from './charges.service';
import { LytexApiService } from '../lytex/lytex-api.service';
import { SavedCardsService } from '../saved-cards/saved-cards.service';
import { Charge, ChargeStatus, PaymentMethod } from './schemas/charge.schema';
import { ConfigService } from '@nestjs/config';

describe('ChargesService', () => {
  let service: ChargesService;
  const model = {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };
  const lytex = { createPaymentLink: jest.fn(), createCardToken: jest.fn(), payInvoice: jest.fn() };
  const config = { get: jest.fn().mockReturnValue('http://localhost:4200') };
  const savedCards = { getOwnedForPay: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChargesService,
        { provide: getModelToken(Charge.name), useValue: model },
        { provide: LytexApiService, useValue: lytex },
        { provide: ConfigService, useValue: config },
        { provide: SavedCardsService, useValue: savedCards },
      ],
    }).compile();
    service = module.get(ChargesService);
  });

  it('create persiste cobrança após resposta Lytex', async () => {
    lytex.createPaymentLink.mockResolvedValue({ _id: 'ext-1', url: 'https://pay' });
    model.create.mockResolvedValue({ toJSON: () => ({ id: 'c1' }) });
    const uid = new Types.ObjectId().toString();
    const res = await service.create(uid, {
      amount: 10,
      method: PaymentMethod.PIX,
      description: 'Teste',
    });
    expect(lytex.createPaymentLink).toHaveBeenCalled();
    expect(model.create).toHaveBeenCalled();
    expect(res).toEqual({ id: 'c1' });
  });

  it('create com CREDIT_CARD e savedCardId paga na sequência', async () => {
    const cardId = new Types.ObjectId().toString();
    const uid = new Types.ObjectId().toString();
    lytex.createPaymentLink.mockResolvedValue({ _id: 'ext-1', url: 'https://pay' });
    savedCards.getOwnedForPay.mockResolvedValue({
      lytexTokenId: 'tok-1',
      holderName: 'Fulano',
      cpfCnpj: '12345678901',
      email: 'a@b.com',
      cellphone: '31999999999',
    });
    lytex.payInvoice.mockResolvedValue({ ok: true });
    const doc = {
      amount: 50,
      method: PaymentMethod.CREDIT_CARD,
      status: ChargeStatus.PENDING,
      lytexInvoiceId: 'inv-1',
      lytex: {},
      save: jest.fn().mockResolvedValue(undefined),
      toJSON: jest.fn().mockReturnValue({ id: 'c-card', status: ChargeStatus.PAID }),
    };
    model.create.mockResolvedValue(doc);
    const res = await service.create(uid, {
      amount: 50,
      method: PaymentMethod.CREDIT_CARD,
      description: 'Teste',
      savedCardId: cardId,
      parcels: 2,
    });
    expect(lytex.createPaymentLink).toHaveBeenCalled();
    expect(model.create).toHaveBeenCalled();
    expect(savedCards.getOwnedForPay).toHaveBeenCalledWith(uid, cardId);
    expect(lytex.payInvoice).toHaveBeenCalled();
    expect(doc.save).toHaveBeenCalled();
    expect(res).toEqual({ id: 'c-card', status: ChargeStatus.PAID });
  });

  it('simulatePay marca como PAID', async () => {
    const charge = {
      status: ChargeStatus.PENDING,
      method: PaymentMethod.PIX,
      save: jest.fn().mockResolvedValue(undefined),
      toJSON: jest.fn().mockReturnValue({ status: ChargeStatus.PAID }),
    };
    model.findOne.mockResolvedValue(charge);
    const id = new Types.ObjectId().toString();
    const uid = new Types.ObjectId().toString();
    const res = await service.simulatePay(uid, id);
    expect(charge.status).toBe(ChargeStatus.PAID);
    expect(res.status).toBe(ChargeStatus.PAID);
  });
});
