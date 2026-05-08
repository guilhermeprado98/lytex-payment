import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LytexApiService } from '../lytex/lytex-api.service';
import { SavedCardsService } from '../saved-cards/saved-cards.service';
import { Charge, ChargeDocument, ChargeStatus, PaymentMethod } from './schemas/charge.schema';
import { CreateChargeDto } from './dto/create-charge.dto';
import { ListChargesQueryDto } from './dto/list-charges-query.dto';
import { PayCardDto } from './dto/pay-card.dto';
import { extractCardTokenId, extractLytexIds } from '../common/utils/lytex-response.util';
import {
  amountReaisFromLytexInvoice,
  lytexInvoiceStatusToChargeStatus,
  paymentMethodFromLytexInvoice,
  paymentUrlFromLytexInvoice,
} from './lytex-invoice.mapper';

@Injectable()
export class ChargesService {
  constructor(
    @InjectModel(Charge.name) private readonly chargeModel: Model<ChargeDocument>,
    private readonly lytex: LytexApiService,
    private readonly savedCards: SavedCardsService,
  ) {}

  async create(userId: string, dto: CreateChargeDto) {
    const amountReais = Math.round(dto.amount * 100) / 100;
    if (amountReais < 0.01) {
      throw new BadRequestException('Valor inválido');
    }
    const description = dto.description?.trim() || 'Cobrança via app';

    const lytexData = await this.lytex.createPaymentLink({
      amountReais,
      description,
      method: dto.method as 'PIX' | 'BOLETO' | 'CREDIT_CARD',
      parcels: dto.parcels ?? 1,
      payer: {
        cpfCnpj: dto.payerCpfCnpj,
        name: dto.payerName,
        email: dto.payerEmail,
        cellphone: dto.payerCellphone,
        zip: dto.payerZip,
        city: dto.payerCity,
        street: dto.payerStreet,
        state: dto.payerState,
        zone: dto.payerZone,
        treatmentPronoun: dto.payerTreatmentPronoun,
      },
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

    if (dto.method === PaymentMethod.CREDIT_CARD && dto.savedCardId?.trim()) {
      return this.applyCardPayment(userId, doc, {
        savedCardId: dto.savedCardId,
        parcels: dto.parcels ?? 1,
        email: dto.payerEmail,
        cellphone: dto.payerCellphone,
      });
    }

    return doc.toJSON();
  }

  async listByUser(userId: string, query?: ListChargesQueryDto) {
    const filter: Record<string, unknown> = { createdBy: new Types.ObjectId(userId) };
    if (query?.status) {
      filter['status'] = query.status;
    }
    if (query?.method) {
      filter['method'] = query.method;
    }
    return this.chargeModel.find(filter).sort({ createdAt: -1 }).lean().exec();
  }

  /**
   * GET /v2/invoices na Lytex (todas as páginas) e upsert em Charge para o usuário atual.
   * Dashboard e lista de transações passam a refletir os mesmos dados persistidos.
   */
  async syncFromLytex(userId: string): Promise<{
    synced: number;
    skipped: number;
    pagesFetched: number;
    totalRemote: number;
  }> {
    const { invoices, pagesFetched } = await this.lytex.listAllInvoices();
    const oid = new Types.ObjectId(userId);
    let synced = 0;
    let skipped = 0;
    for (const inv of invoices) {
      const id = typeof inv['_id'] === 'string' ? inv['_id'] : undefined;
      if (!id) {
        skipped++;
        continue;
      }
      const amount = amountReaisFromLytexInvoice(inv as Record<string, unknown>);
      if (amount <= 0) {
        skipped++;
        continue;
      }
      const row = inv as Record<string, unknown>;
      await this.chargeModel.findOneAndUpdate(
        { createdBy: oid, lytexInvoiceId: id },
        {
          $set: {
            amount,
            method: paymentMethodFromLytexInvoice(row),
            status: lytexInvoiceStatusToChargeStatus(row['status']),
            paymentUrl: paymentUrlFromLytexInvoice(row),
            externalId: id,
            lytex: row,
          },
          $setOnInsert: { createdBy: oid },
        },
        { upsert: true, new: true },
      );
      synced++;
    }
    return {
      synced,
      skipped,
      pagesFetched,
      totalRemote: invoices.length,
    };
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
    return this.applyCardPayment(userId, charge, dto);
  }

  private async applyCardPayment(userId: string, charge: ChargeDocument, dto: PayCardDto) {
    const invoiceId = charge.lytexInvoiceId;
    if (!invoiceId) {
      throw new BadRequestException(
        'ID da fatura Lytex não encontrado na cobrança. Verifique a resposta da API ao criar o link.',
      );
    }

    let cardTokenId: string;
    let holder: string;
    let cpfDigits: string;
    let email = dto.email;
    let cellphone = dto.cellphone;
    let tokenRes: Record<string, unknown> | undefined;

    if (dto.savedCardId) {
      const sc = await this.savedCards.getOwnedForPay(userId, dto.savedCardId);
      cardTokenId = sc.lytexTokenId;
      holder = sc.holderName;
      cpfDigits = sc.cpfCnpj;
      email = dto.email ?? sc.email;
      cellphone = dto.cellphone ?? sc.cellphone;
    } else {
      if (!dto.cpfCnpj || !dto.number || !dto.holder || !dto.expiry || !dto.cvc) {
        throw new BadRequestException('Informe os dados do cartão ou savedCardId');
      }
      tokenRes = (await this.lytex.createCardToken({
        cpfCnpj: dto.cpfCnpj.replace(/\D/g, ''),
        number: dto.number.replace(/\s/g, ''),
        holder: dto.holder,
        expiry: dto.expiry,
        cvc: dto.cvc,
      })) as Record<string, unknown>;
      const extracted = extractCardTokenId(tokenRes);
      if (!extracted) {
        throw new BadRequestException('Não foi possível obter o token do cartão na resposta da Lytex');
      }
      cardTokenId = extracted;
      holder = dto.holder;
      cpfDigits = dto.cpfCnpj.replace(/\D/g, '');
    }

    const payRes = await this.lytex.payInvoice({
      _invoiceId: invoiceId,
      _cardTokenId: cardTokenId,
      parcels: dto.parcels ?? 1,
      creditCardHolder: {
        name: holder,
        type: cpfDigits.length > 11 ? 'pj' : 'pf',
        cellphone: cellphone ?? '31999999999',
        email: email ?? 'pagador@example.com',
        cpfCnpj: cpfDigits,
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

    charge.lytex = {
      ...(charge.lytex ?? {}),
      payResponse: payRes,
      ...(tokenRes ? { cardTokenResponse: tokenRes } : {}),
    };
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
