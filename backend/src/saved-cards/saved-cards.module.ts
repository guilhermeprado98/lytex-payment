import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SavedCard, SavedCardSchema } from './schemas/saved-card.schema';
import { SavedCardsService } from './saved-cards.service';
import { SavedCardsController } from './saved-cards.controller';
import { LytexModule } from '../lytex/lytex.module';

@Global()
@Module({
  imports: [MongooseModule.forFeature([{ name: SavedCard.name, schema: SavedCardSchema }]), LytexModule],
  controllers: [SavedCardsController],
  providers: [SavedCardsService],
  exports: [SavedCardsService],
})
export class SavedCardsModule {}
