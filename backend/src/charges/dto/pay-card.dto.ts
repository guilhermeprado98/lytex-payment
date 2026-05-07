import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PayCardDto {
  @ApiPropertyOptional({
    description: 'ID de cartão salvo (GET /saved-cards). Se preenchido, não envie número/CVC.',
  })
  @IsOptional()
  @IsMongoId()
  savedCardId?: string;

  @ValidateIf((o: PayCardDto) => !o.savedCardId)
  @IsString()
  @MinLength(11)
  cpfCnpj?: string;

  @ValidateIf((o: PayCardDto) => !o.savedCardId)
  @IsString()
  @MinLength(12)
  number?: string;

  @ValidateIf((o: PayCardDto) => !o.savedCardId)
  @IsString()
  @MinLength(2)
  holder?: string;

  @ValidateIf((o: PayCardDto) => !o.savedCardId)
  @IsString()
  @Matches(/^\d{4}$|^\d{6}$/)
  expiry?: string;

  @ValidateIf((o: PayCardDto) => !o.savedCardId)
  @IsString()
  @MinLength(3)
  cvc?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cellphone?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  parcels?: number;
}
