import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AccessLogDocument = HydratedDocument<AccessLog>;

@Schema({ collection: 'access_logs' })
export class AccessLog {
  @Prop({ type: Date, required: true })
  loggedAt!: Date;

  @Prop({ required: true })
  method!: string;

  @Prop({ required: true })
  path!: string;

  @Prop({ default: '' })
  query!: string;

  @Prop({ required: true })
  status!: number;

  @Prop({ required: true })
  durationMs!: number;

  @Prop()
  ip?: string;

  @Prop()
  userAgent?: string;

  @Prop()
  userId?: string;

  @Prop()
  userEmail?: string;
}

export const AccessLogSchema = SchemaFactory.createForClass(AccessLog);
AccessLogSchema.index({ loggedAt: -1 });
AccessLogSchema.index({ userId: 1, loggedAt: -1 });
AccessLogSchema.index({ path: 1, loggedAt: -1 });
