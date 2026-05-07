import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ChargeDocument = HydratedDocument<Charge>;

export enum ChargeStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
}

export enum PaymentMethod {
  PIX = 'PIX',
  BOLETO = 'BOLETO',
  CREDIT_CARD = 'CREDIT_CARD',
}

@Schema({ timestamps: true })
export class Charge {
  @Prop({ required: true })
  amount!: number;

  @Prop({ type: String, enum: PaymentMethod, required: true })
  method!: PaymentMethod;

  @Prop({ type: String, enum: ChargeStatus, default: ChargeStatus.PENDING })
  status!: ChargeStatus;

  @Prop()
  externalId?: string;

  @Prop()
  paymentUrl?: string;

  @Prop()
  lytexInvoiceId?: string;

  @Prop({ type: Object })
  lytex?: Record<string, unknown>;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;
}

export const ChargeSchema = SchemaFactory.createForClass(Charge);
