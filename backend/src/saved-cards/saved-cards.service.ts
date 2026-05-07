import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LytexApiService } from '../lytex/lytex-api.service';
import { extractCardTokenId } from '../common/utils/lytex-response.util';
import { SavedCard, SavedCardDocument } from './schemas/saved-card.schema';
import { SaveCardDto } from './dto/save-card.dto';

export type SavedCardPublic = {
  _id: string;
  lastFourDigits: string;
  holderName: string;
  expiryDisplay: string;
  brand?: string;
  label?: string;
  createdAt?: Date;
};

@Injectable()
export class SavedCardsService {
  constructor(
    @InjectModel(SavedCard.name) private readonly model: Model<SavedCardDocument>,
    private readonly lytex: LytexApiService,
  ) {}

  async create(userId: string, dto: SaveCardDto): Promise<SavedCardPublic> {
    const digits = dto.number.replace(/\D/g, '');
    if (digits.length < 12) {
      throw new BadRequestException('Número do cartão inválido');
    }
    const lastFour = digits.slice(-4);

    const tokenRes = await this.lytex.createCardToken({
      cpfCnpj: dto.cpfCnpj.replace(/\D/g, ''),
      number: digits,
      holder: dto.holder,
      expiry: dto.expiry,
      cvc: dto.cvc,
    });
    const lytexTokenId = extractCardTokenId(tokenRes as Record<string, unknown>);
    if (!lytexTokenId) {
      throw new BadRequestException('Resposta da Lytex sem token de cartão');
    }

    const expiryDisplay = formatExpiryDisplay(dto.expiry);
    const brand = inferBrand(digits);

    const doc = await this.model.create({
      userId: new Types.ObjectId(userId),
      lytexTokenId,
      lastFourDigits: lastFour,
      holderName: dto.holder.trim(),
      expiryDisplay,
      cpfCnpj: dto.cpfCnpj.replace(/\D/g, ''),
      email: dto.email?.trim(),
      cellphone: dto.cellphone?.replace(/\D/g, ''),
      brand,
      label: dto.label?.trim(),
    });

    return this.toPublic(doc);
  }

  async list(userId: string): Promise<SavedCardPublic[]> {
    const rows = await this.model
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return rows.map((r) => this.leanToPublic(r));
  }

  async remove(userId: string, id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Cartão não encontrado');
    }
    const res = await this.model.deleteOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    });
    if (res.deletedCount === 0) {
      throw new NotFoundException('Cartão não encontrado');
    }
  }

  /** Cartão do usuário com token (uso interno no pagamento). */
  async getOwnedForPay(
    userId: string,
    savedCardId: string,
  ): Promise<{ lytexTokenId: string; holderName: string; cpfCnpj: string; email?: string; cellphone?: string }> {
    if (!Types.ObjectId.isValid(savedCardId)) {
      throw new NotFoundException('Cartão não encontrado');
    }
    const card = await this.model
      .findOne({
        _id: new Types.ObjectId(savedCardId),
        userId: new Types.ObjectId(userId),
      })
      .exec();
    if (!card) {
      throw new NotFoundException('Cartão não encontrado');
    }
    return {
      lytexTokenId: card.lytexTokenId,
      holderName: card.holderName,
      cpfCnpj: card.cpfCnpj,
      email: card.email,
      cellphone: card.cellphone,
    };
  }

  private toPublic(doc: SavedCardDocument): SavedCardPublic {
    const createdAt = doc.get('createdAt') as Date | undefined;
    return {
      _id: doc.id,
      lastFourDigits: doc.lastFourDigits,
      holderName: doc.holderName,
      expiryDisplay: doc.expiryDisplay,
      brand: doc.brand,
      label: doc.label,
      createdAt,
    };
  }

  private leanToPublic(r: {
    _id: Types.ObjectId;
    lastFourDigits: string;
    holderName: string;
    expiryDisplay: string;
    brand?: string;
    label?: string;
    createdAt?: Date;
  }): SavedCardPublic {
    return {
      _id: r._id.toHexString(),
      lastFourDigits: r.lastFourDigits,
      holderName: r.holderName,
      expiryDisplay: r.expiryDisplay,
      brand: r.brand,
      label: r.label,
      createdAt: r.createdAt,
    };
  }
}

function formatExpiryDisplay(expiry: string): string {
  const d = expiry.replace(/\D/g, '');
  if (d.length === 4) {
    return `${d.slice(0, 2)}/${d.slice(2, 4)}`;
  }
  if (d.length === 6) {
    return `${d.slice(0, 2)}/${d.slice(4, 6)}`;
  }
  return expiry;
}

function inferBrand(panDigits: string): string | undefined {
  const first = panDigits[0];
  const two = panDigits.slice(0, 2);
  if (first === '4') {
    return 'visa';
  }
  if (['51', '52', '53', '54', '55'].includes(two) || (parseInt(two, 10) >= 22 && parseInt(two, 10) <= 27)) {
    return 'mastercard';
  }
  if (two === '34' || two === '37') {
    return 'amex';
  }
  if (two === '60' || two === '65' || panDigits.startsWith('506699')) {
    return 'elo';
  }
  return undefined;
}
