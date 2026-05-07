import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Charge, ChargeSchema } from '../charges/schemas/charge.schema';
import { SavedCard, SavedCardSchema } from '../saved-cards/schemas/saved-card.schema';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Charge.name, schema: ChargeSchema },
      { name: SavedCard.name, schema: SavedCardSchema },
    ]),
  ],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
