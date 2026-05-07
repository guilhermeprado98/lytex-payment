import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ChargesService } from './charges.service';
import { LytexApiService } from '../lytex/lytex-api.service';
import { Charge, ChargeStatus, PaymentMethod } from './schemas/charge.schema';
import { ConfigService } from '@nestjs/config';

describe('ChargesService', () => {
  let service: ChargesService;
  const model = {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };
  const lytex = { createPaymentLink: jest.fn() };
  const config = { get: jest.fn().mockReturnValue('http://localhost:4200') };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChargesService,
        { provide: getModelToken(Charge.name), useValue: model },
        { provide: LytexApiService, useValue: lytex },
        { provide: ConfigService, useValue: config },
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
