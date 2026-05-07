import { IsEnum, IsInt, IsMongoId, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../schemas/charge.schema';

export class CreateChargeDto {
  @ApiProperty({ example: 49.9 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Obrigatório quando method=CREDIT_CARD: ID do cartão salvo (GET /saved-cards).',
  })
  @IsOptional()
  @IsMongoId()
  savedCardId?: string;

  @ApiPropertyOptional({ description: 'Parcelas (1–12), apenas cartão.', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  parcels?: number;
}
