import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsOptional, IsString, Matches, Max, Min, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PayCardDto {
  @ApiProperty({ example: '34778583000106' })
  @IsString()
  @MinLength(11)
  cpfCnpj!: string;

  @ApiProperty()
  @IsString()
  number!: string;

  @ApiProperty()
  @IsString()
  holder!: string;

  @ApiProperty({ description: 'MMYY ou MMYYYY' })
  @IsString()
  @Matches(/^\d{4}$|^\d{6}$/)
  expiry!: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  cvc!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cellphone?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  parcels?: number;
}
