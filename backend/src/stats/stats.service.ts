import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Charge, ChargeDocument, ChargeStatus } from '../charges/schemas/charge.schema';
import { SavedCard, SavedCardDocument } from '../saved-cards/schemas/saved-card.schema';

export type MethodCount = { method: string; count: number };

@Injectable()
export class StatsService {
  constructor(
    @InjectModel(Charge.name) private readonly chargeModel: Model<ChargeDocument>,
    @InjectModel(SavedCard.name) private readonly savedCardModel: Model<SavedCardDocument>,
  ) {}

  async summaryForUser(userId: string) {
    const oid = new Types.ObjectId(userId);
    const base = { createdBy: oid };

    const [total, pending, paid, failed, volumeAgg, byMethod, savedCards] = await Promise.all([
      this.chargeModel.countDocuments(base),
      this.chargeModel.countDocuments({ ...base, status: ChargeStatus.PENDING }),
      this.chargeModel.countDocuments({ ...base, status: ChargeStatus.PAID }),
      this.chargeModel.countDocuments({ ...base, status: ChargeStatus.FAILED }),
      this.chargeModel.aggregate<{ volume: number }>([
        { $match: base },
        { $group: { _id: null, volume: { $sum: '$amount' } } },
      ]),
      this.chargeModel.aggregate<MethodCount>([
        { $match: base },
        { $group: { _id: '$method', count: { $sum: 1 } } },
        { $project: { _id: 0, method: '$_id', count: 1 } },
      ]),
      this.savedCardModel.countDocuments({ userId: oid }),
    ]);

    const volumeTotal = volumeAgg[0]?.volume ?? 0;

    return {
      charges: {
        total,
        pending,
        paid,
        failed,
        volumeTotal,
        byMethod,
      },
      savedCards,
    };
  }
}
