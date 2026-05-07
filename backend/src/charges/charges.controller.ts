import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChargesService } from './charges.service';
import { CreateChargeDto } from './dto/create-charge.dto';
import { ListChargesQueryDto } from './dto/list-charges-query.dto';
import { PayCardDto } from './dto/pay-card.dto';

@ApiTags('charges')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('charges')
export class ChargesController {
  constructor(private readonly charges: ChargesService) {}

  @Post()
  create(@CurrentUser('userId') userId: string, @Body() dto: CreateChargeDto) {
    return this.charges.create(userId, dto);
  }

  @Get()
  list(@CurrentUser('userId') userId: string, @Query() query: ListChargesQueryDto) {
    return this.charges.listByUser(userId, query);
  }

  @Patch(':id/pay')
  simulatePay(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.charges.simulatePay(userId, id);
  }

  @Post(':id/pay-card')
  payCard(@CurrentUser('userId') userId: string, @Param('id') id: string, @Body() dto: PayCardDto) {
    return this.charges.payWithCard(userId, id, dto);
  }
}
