import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChargeStatus, PaymentMethod } from '../schemas/charge.schema';

export class ListChargesQueryDto {
  @ApiPropertyOptional({ enum: ChargeStatus })
  @IsOptional()
  @IsEnum(ChargeStatus)
  status?: ChargeStatus;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;
}
