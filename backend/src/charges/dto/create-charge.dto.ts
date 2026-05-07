import {
  IsEmail,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../schemas/charge.schema';

function trimOrUndef(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s.length ? s : undefined;
}

function digitsOrUndef(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const d = String(value).replace(/\D/g, '');
  return d.length ? d : undefined;
}

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

  @ApiPropertyOptional({
    description:
      'CPF/CNPJ do pagador na Lytex (apenas dígitos após normalização). Se omitido, o servidor usa LYTEX_INVOICE_CLIENT_CPF_CNPJ.',
  })
  @IsOptional()
  @Transform(({ value }) => digitsOrUndef(value))
  @ValidateIf((o) => !!o.payerCpfCnpj)
  @Matches(/^\d{11}$|^\d{14}$/, { message: 'payerCpfCnpj: informe 11 (CPF) ou 14 (CNPJ) dígitos' })
  payerCpfCnpj?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => trimOrUndef(value))
  payerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => trimOrUndef(value))
  payerEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => digitsOrUndef(value))
  @ValidateIf((o) => !!o.payerCellphone)
  @Matches(/^\d{10,11}$/, { message: 'payerCellphone: DDD + número (10 ou 11 dígitos)' })
  payerCellphone?: string;

  @ApiPropertyOptional({ description: 'CEP (apenas dígitos após normalização)' })
  @IsOptional()
  @Transform(({ value }) => digitsOrUndef(value))
  @ValidateIf((o) => !!o.payerZip)
  @Matches(/^\d{8}$/, { message: 'payerZip: 8 dígitos' })
  payerZip?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => trimOrUndef(value))
  payerCity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => trimOrUndef(value))
  payerStreet?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2)
  @Transform(({ value }) => trimOrUndef(value))
  payerState?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(({ value }) => trimOrUndef(value))
  payerZone?: string;

  @ApiPropertyOptional({ example: 'you' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }) => trimOrUndef(value))
  payerTreatmentPronoun?: string;
}
