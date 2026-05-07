import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LytexApiService } from '../lytex/lytex-api.service';
import { Charge, ChargeDocument, ChargeStatus, PaymentMethod } from './schemas/charge.schema';
import { CreateChargeDto } from './dto/create-charge.dto';
import { PayCardDto } from './dto/pay-card.dto';
import { ConfigService } from '@nestjs/config';
import { extractCardTokenId, extractLytexIds } from './lytex-response.util';

@Injectable()
export class ChargesService {
  constructor(
    @InjectModel(Charge.name) private readonly chargeModel: Model<ChargeDocument>,
    private readonly lytex: LytexApiService,
    private readonly config: ConfigService,
  ) {}

  async create(userId: string, dto: CreateChargeDto) {
    const totalValueCents = Math.round(dto.amount * 100);
    if (totalValueCents < 1) {
      throw new BadRequestException('Valor inválido');
    }
    const website = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:4200';
    const description = dto.description?.trim() || 'Cobrança via app';

    const lytexData = await this.lytex.createPaymentLink({
      totalValueCents,
      description,
      website,
      method: dto.method as 'PIX' | 'BOLETO' | 'CREDIT_CARD',
    });

    const ids = extractLytexIds(lytexData);

    const doc = await this.chargeModel.create({
      amount: dto.amount,
      method: dto.method,
      status: ChargeStatus.PENDING,
      externalId: ids.externalId,
      paymentUrl: ids.paymentUrl,
      lytexInvoiceId: ids.lytexInvoiceId,
      lytex: lytexData,
      createdBy: new Types.ObjectId(userId),
    });

    return doc.toJSON();
  }

  async listByUser(userId: string) {
    return this.chargeModel
      .find({ createdBy: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async simulatePay(userId: string, id: string) {
    const charge = await this.requireOwned(userId, id);
    if (charge.status !== ChargeStatus.PENDING) {
      throw new BadRequestException('Apenas cobranças pendentes podem ser liquidadas (simulação)');
    }
    if (charge.method === PaymentMethod.CREDIT_CARD) {
      throw new BadRequestException('Para cartão use o fluxo de pagamento com cartão');
    }
    charge.status = ChargeStatus.PAID;
    await charge.save();
    return charge.toJSON();
  }

  async payWithCard(userId: string, id: string, dto: PayCardDto) {
    const charge = await this.requireOwned(userId, id);
    if (charge.method !== PaymentMethod.CREDIT_CARD) {
      throw new BadRequestException('Esta cobrança não é de cartão de crédito');
    }
    if (charge.status !== ChargeStatus.PENDING) {
      throw new BadRequestException('Cobrança já processada');
    }
    const invoiceId = charge.lytexInvoiceId;
    if (!invoiceId) {
      throw new BadRequestException(
        'ID da fatura Lytex não encontrado na cobrança. Verifique a resposta da API ao criar o link.',
      );
    }

    const tokenRes = await this.lytex.createCardToken({
      cpfCnpj: dto.cpfCnpj.replace(/\D/g, ''),
      number: dto.number.replace(/\s/g, ''),
      holder: dto.holder,
      expiry: dto.expiry,
      cvc: dto.cvc,
    });
    const cardTokenId = extractCardTokenId(tokenRes);
    if (!cardTokenId) {
      throw new BadRequestException('Não foi possível obter o token do cartão na resposta da Lytex');
    }

    const payRes = await this.lytex.payInvoice({
      _invoiceId: invoiceId,
      _cardTokenId: cardTokenId,
      parcels: dto.parcels ?? 1,
      creditCardHolder: {
        name: dto.holder,
        type: dto.cpfCnpj.replace(/\D/g, '').length > 11 ? 'pj' : 'pf',
        cellphone: dto.cellphone ?? '31999999999',
        email: dto.email ?? 'pagador@example.com',
        cpfCnpj: dto.cpfCnpj.replace(/\D/g, ''),
        address: {
          street: 'Rua',
          number: 'SN',
          city: 'Belo Horizonte',
          state: 'MG',
          zip: '30130000',
          zone: 'Centro',
          complement: '',
        },
      },
    });

    charge.lytex = { ...(charge.lytex ?? {}), payResponse: payRes, cardTokenResponse: tokenRes };
    charge.status = ChargeStatus.PAID;
    await charge.save();
    return charge.toJSON();
  }

  private async requireOwned(userId: string, id: string): Promise<ChargeDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Cobrança não encontrada');
    }
    const charge = await this.chargeModel.findOne({
      _id: new Types.ObjectId(id),
      createdBy: new Types.ObjectId(userId),
    });
    if (!charge) {
      throw new NotFoundException('Cobrança não encontrada');
    }
    return charge;
  }
}
