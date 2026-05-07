import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SaveCardDto {
  @ApiProperty({ example: '34778583000106' })
  @IsString()
  @MinLength(11)
  cpfCnpj!: string;

  @ApiProperty()
  @IsString()
  @MinLength(12)
  number!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  holder!: string;

  @ApiProperty({ description: 'MMYY ou MMYYYY' })
  @IsString()
  @Matches(/^\d{4}$|^\d{6}$/)
  expiry!: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  cvc!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cellphone?: string;

  @ApiPropertyOptional({ description: 'Apelido ex.: Cartão trabalho' })
  @IsOptional()
  @IsString()
  label?: string;
}
