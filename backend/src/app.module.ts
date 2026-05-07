import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AccessLogsModule } from './access-logs/access-logs.module';
import { SavedCardsModule } from './saved-cards/saved-cards.module';
import { StatsModule } from './stats/stats.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ChargesModule } from './charges/charges.module';
import { HttpRequestLoggerMiddleware } from './common/middleware/http-request-logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URL') ?? 'mongodb://localhost:27017/lytex',
      }),
    }),
    AccessLogsModule,
    SavedCardsModule,
    StatsModule,
    UsersModule,
    AuthModule,
    ChargesModule,
  ],
  providers: [HttpRequestLoggerMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(HttpRequestLoggerMiddleware).forRoutes('*');
  }
}
