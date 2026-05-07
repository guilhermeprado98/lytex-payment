import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccessLog, AccessLogSchema } from './schemas/access-log.schema';
import { AccessLogsService } from './access-logs.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: AccessLog.name, schema: AccessLogSchema }])],
  providers: [AccessLogsService],
  exports: [AccessLogsService],
})
export class AccessLogsModule {}
