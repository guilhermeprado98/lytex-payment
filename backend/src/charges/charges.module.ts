import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Charge, ChargeSchema } from './schemas/charge.schema';
import { ChargesService } from './charges.service';
import { ChargesController } from './charges.controller';
import { LytexModule } from '../lytex/lytex.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Charge.name, schema: ChargeSchema }]), LytexModule],
  controllers: [ChargesController],
  providers: [ChargesService],
  exports: [ChargesService],
})
export class ChargesModule {}
