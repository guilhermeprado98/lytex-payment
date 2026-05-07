import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SavedCardsService } from './saved-cards.service';
import { SaveCardDto } from './dto/save-card.dto';

@ApiTags('saved-cards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('saved-cards')
export class SavedCardsController {
  constructor(private readonly savedCards: SavedCardsService) {}

  @Post()
  create(@CurrentUser('userId') userId: string, @Body() dto: SaveCardDto) {
    return this.savedCards.create(userId, dto);
  }

  @Get()
  list(@CurrentUser('userId') userId: string) {
    return this.savedCards.list(userId);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.savedCards.remove(userId, id);
  }
}
