import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { HttpLogPayload } from '../common/types/http-log.types';
import { AccessLog, AccessLogDocument } from './schemas/access-log.schema';

@Injectable()
export class AccessLogsService {
  private readonly logger = new Logger(AccessLogsService.name);

  constructor(@InjectModel(AccessLog.name) private readonly model: Model<AccessLogDocument>) {}

  /** Não bloqueia a resposta HTTP; falhas só aparecem no log. */
  enqueue(payload: HttpLogPayload): void {
    void this.persist(payload).catch((err: Error) => {
      this.logger.warn(`Falha ao gravar access_logs: ${err.message}`);
    });
  }

  private async persist(payload: HttpLogPayload): Promise<void> {
    await this.model.create({
      loggedAt: new Date(payload.ts),
      method: payload.method,
      path: payload.path,
      query: payload.query,
      status: payload.status,
      durationMs: payload.durationMs,
      ip: payload.ip,
      userAgent: payload.userAgent,
      userId: payload.userId ?? undefined,
      userEmail: payload.userEmail ?? undefined,
    });
  }
}
