import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SavedCardDocument = HydratedDocument<SavedCard>;

/** Cartão tokenizado na Lytex, vinculado ao usuário. Nunca armazenar número completo nem CVC. */
@Schema({ timestamps: true, collection: 'saved_cards' })
export class SavedCard {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  /** Token retornado pela Lytex (`card_token`). */
  @Prop({ required: true })
  lytexTokenId!: string;

  @Prop({ required: true })
  lastFourDigits!: string;

  @Prop({ required: true })
  holderName!: string;

  /** Ex.: "02/26" para exibição. */
  @Prop({ required: true })
  expiryDisplay!: string;

  /** Apenas dígitos (CPF/CNPJ do titular usado na tokenização). */
  @Prop({ required: true })
  cpfCnpj!: string;

  @Prop()
  email?: string;

  @Prop()
  cellphone?: string;

  @Prop()
  brand?: string;

  @Prop()
  label?: string;
}

export const SavedCardSchema = SchemaFactory.createForClass(SavedCard);
SavedCardSchema.index({ userId: 1, createdAt: -1 });

SavedCardSchema.set('toJSON', {
  transform(_doc, ret) {
    const o = ret as unknown as Record<string, unknown>;
    delete o['lytexTokenId'];
    delete o['cpfCnpj'];
    return ret;
  },
});
