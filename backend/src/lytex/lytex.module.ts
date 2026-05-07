import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { LytexApiService } from './lytex-api.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30_000,
      maxRedirects: 3,
    }),
  ],
  providers: [LytexApiService],
  exports: [LytexApiService],
})
export class LytexModule {}
