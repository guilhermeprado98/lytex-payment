import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Charge, ChargeDocument, ChargeStatus } from '../charges/schemas/charge.schema';
import { SavedCard, SavedCardDocument } from '../saved-cards/schemas/saved-card.schema';

export type MethodCount = { method: string; count: number };

/** Agregações Mongo podem devolver Double/Decimal128; garantir número JSON-safe. */
function sumFromAgg(rows: { volume?: unknown }[]): number {
  const raw = rows[0]?.volume;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (raw != null && typeof raw === 'object' && 'toString' in raw) {
    const n = Number((raw as { toString(): string }).toString());
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function amountFieldToNumber(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v.replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }
  if (v != null && typeof v === 'object' && 'toString' in v) {
    const n = Number((v as { toString(): string }).toString());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

@Injectable()
export class StatsService {
  constructor(
    @InjectModel(Charge.name) private readonly chargeModel: Model<ChargeDocument>,
    @InjectModel(SavedCard.name) private readonly savedCardModel: Model<SavedCardDocument>,
  ) {}

  async summaryForUser(userId: string) {
    const oid = new Types.ObjectId(userId);
    const base = { createdBy: oid };

    const [total, pending, paid, failed, volumeAgg, byMethod, savedCards, paidAmountRows] =
      await Promise.all([
      this.chargeModel.countDocuments(base),
      this.chargeModel.countDocuments({ ...base, status: ChargeStatus.PENDING }),
      this.chargeModel.countDocuments({ ...base, status: ChargeStatus.PAID }),
      this.chargeModel.countDocuments({ ...base, status: ChargeStatus.FAILED }),
      this.chargeModel.aggregate<{ volume: number }>([
        { $match: base },
        {
          $group: {
            _id: null,
            volume: {
              $sum: { $convert: { input: '$amount', to: 'double', onError: 0, onNull: 0 } },
            },
          },
        },
      ]),
      this.chargeModel.aggregate<MethodCount>([
        { $match: base },
        { $group: { _id: '$method', count: { $sum: 1 } } },
        { $project: { _id: 0, method: '$_id', count: 1 } },
      ]),
      this.savedCardModel.countDocuments({ userId: oid }),
      this.chargeModel
        .find({ ...base, status: ChargeStatus.PAID })
        .select({ amount: 1 })
        .lean()
        .exec(),
    ]);

    const volumeTotal = sumFromAgg(volumeAgg);
    let volumePaid = 0;
    for (const row of paidAmountRows) {
      volumePaid += amountFieldToNumber(row.amount);
    }

    return {
      charges: {
        total,
        pending,
        paid,
        failed,
        volumeTotal,
        volumePaid,
        byMethod,
      },
      savedCards,
    };
  }
}
