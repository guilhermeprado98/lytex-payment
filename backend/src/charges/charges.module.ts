import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Charge, ChargeSchema } from './schemas/charge.schema';
import { ChargesService } from './charges.service';
import { ChargesController } from './charges.controller';
import { LytexModule } from '../lytex/lytex.module';
import { SavedCardsModule } from '../saved-cards/saved-cards.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Charge.name, schema: ChargeSchema }]),
    LytexModule,
    SavedCardsModule,
  ],
  controllers: [ChargesController],
  providers: [ChargesService],
  exports: [ChargesService],
})
export class ChargesModule {}
